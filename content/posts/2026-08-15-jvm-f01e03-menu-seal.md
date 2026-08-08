---
title: "F1E3 菜单封印术 — sealed 把继承树关进笼子"
date: "2026-08-15"
series: "jvm-academy"
season: 1
episode: 3
tags: ["Java 25", "sealed", "permits", "穷尽switch", "现代Java"]
summary: "菜单只许三种咖啡，想偷偷 extends 出「香菜咖啡」的直接被编译器保安架走——sealed 把继承树关进笼子，穷尽 switch 把出口也堵死。"
---

> **"想把所有可能性都写在合同里，就得先把合同封印。"**
> — 焰焰，边翻《JEP 409》边在炉底刻密文

---

## 🎬 开场：香菜咖啡事件

![《JVM 火种纪》03 · 菜单封印术——sealed 门禁六格漫画](/comics/jvm/f01e03-menu-seal.png)

> **〔1〕**
> 深夜。烘豆炉三楼，阿零盯着监控屏幕皱眉。
>
> 屏幕上弹出一行警报：**订单里出现了「香菜冷萃」——菜单上根本没这个品类。**
>
> 某个实习生继承了 `MenuItem` 接口，自己加了一个 `CorianderCold` 子类，塞进了促销引擎——结果折扣算法压根没处理这种类型，直接崩了。

> **〔2〕**
> 焰焰从炉口探出头，尾巴火焰是冷静的蓝色。
>
> 「你的菜单 `interface` 没有门禁。任何人都能 `implements` 进来，编译器不拦、运行时不拦，出问题了才发现。」
>
> 「但——」它翻开《JEP 编年史》，停在第 409 页——「**Java 17 起有一把锁，叫 `sealed`。**」

> **〔3〕**
> 阿零接过书，看到最关键的一句话：
>
> > *sealed interface/class 列出允许的子类型（permits），编译器在继承侧拦截，在 switch 侧强制穷尽——任何人想偷偷继承，直接报错。*

> **〔4〕**
> 「那……一旦有新品上线怎么加？」
>
> 「打开 permits 合同，加一行，编译器立刻告诉你哪些 switch 漏处理了。」焰焰弹了弹尾巴，「这叫**开放点单一处，关闭忘记一处**。」

---

## 🔑 核心技术：sealed interface 三板斧

sealed 体系由三个语言元素组成：

| 元素 | 作用 | 放在哪 |
|---|---|---|
| `sealed` 修饰符 | 声明"此类型只开放给指定子类型" | 父接口/类 |
| `permits` 子句 | 白名单，列出允许的子类型 | 与 `sealed` 同行 |
| `final` / `sealed` / `non-sealed` | 子类型自身的开放度 | 每个许可子类 |

record 天然 final，所以实现 sealed 接口的 record 不需要额外标注。

---

## ⚙️ 代码实录：封印后的菜单

```java
// 一次编译所有源文件：javac -encoding UTF-8 --release 25 MenuSealAll.java
sealed interface MenuItem permits Espresso, Latte, Tea {
    int cents();
}

record Espresso(int shots) implements MenuItem {
    Espresso {
        if (shots < 1 || shots > 4)
            throw new IllegalArgumentException("shots 不合法: " + shots);
    }
    public int cents() { return 1800 + shots * 400; }
}

record Latte(boolean oatMilk) implements MenuItem {
    public int cents() { return oatMilk ? 3200 : 2800; }
}

record Tea(String name) implements MenuItem {
    public int cents() { return 2200; }
}

class MenuSealDemo {
    static int memberDiscount(MenuItem item) {
        return switch (item) {
            case Espresso e -> e.cents() - 200;
            case Latte l   -> l.cents() - 300;
            case Tea t     -> t.cents() - 100;
        };
    }
    public static void main(String[] args) {
        System.out.println("Espresso折后=" + memberDiscount(new Espresso(2)));  // 2400
        System.out.println("Latte折后="    + memberDiscount(new Latte(true)));  // 2900
        System.out.println("Tea折后="      + memberDiscount(new Tea("乌龙")));  // 2100
    }
}
```

**实测输出**（GraalVM 25.0.4）：

```
Espresso折后=2400
Latte折后=2900
Tea折后=2100
```

---

## 🚨 封印守卫的两道门

### 门1：非许可类被拦在门口

```java
// 这段代码无法编译
record CorianderCold(String note) implements MenuItem {  // ← 没有在 permits 里
    public int cents() { return 1500; }
}
```

**编译器报错**（Java 25，实测）：

```
error: 类不得扩展密封类：MenuItem（因为它未列在其 'permits' 子句中）
record CorianderCold(String note) implements MenuItem {
^
```

### 门2：穷尽性 switch 忘写分支

```java
// 假如 permits 新加了 Matcha，但 switch 没跟上
static int badDiscount(MenuItem item) {
    return switch (item) {
        case Espresso e -> e.cents() - 200;
        case Latte l   -> l.cents() - 300;
        // 漏掉 Tea 或新加的 Matcha
    };
}
```

**编译器报错**（实测）：

```
error: switch 表达式不包含所有可能的输入值
        return switch (item) {
               ^
```

这就是为什么 sealed + switch 是「**开放点单一处，关闭忘记一处**」：permits 里加一行，所有没跟上的 switch 立刻被编译器点名。

---

## 🔬 炉底显微镜

> 焰焰搬来放大镜，对准 `MenuItem.class`：「光看源码不够，要看编译器写进去了什么。」

```bash
# 编译（统一编译所有文件，解决 ClassLoader 问题）
javac -encoding UTF-8 --release 25 MenuSealAll.java

# 看 sealed 接口的 PermittedSubclasses 属性
javap -verbose MenuItem.class | findstr -A5 "PermittedSubclasses"

# 看 Espresso 的类修饰符（final class ... implements MenuItem）
javap -p Espresso.class
```

**实测输出**：

```
PermittedSubclasses:
  Espresso
  Latte
  Tea
```

```
final class Espresso extends java.lang.Record implements MenuItem {
  private final int shots;
  Espresso(int);
  public int cents();
  public final java.lang.String toString();
  public final int hashCode();
  public final boolean equals(java.lang.Object);
  public int shots();
}
```

关键观测点：
- `MenuItem.class` 带 `PermittedSubclasses` 属性（`JVMS §4.7.31`），运行时 `Class.permittedSubclasses()` 可读取
- `Espresso` 是 `final class`——record 天然 final，不需要手写
- `Latte`、`Tea` 同样是 `final class`——白名单在字节码层面硬编码，反射也绕不过

---

## 📐 版本边界

**版本边界**

| 里程碑 | JDK | 状态 |
|---|---|---|
| sealed 预览一 | JDK 15 | JEP 360 Preview |
| sealed 预览二 | JDK 16 | JEP 397 Second Preview |
| **sealed 正式** | **JDK 17** | **JEP 409 GA** |
| switch 模式匹配（配套） | JDK 21 | JEP 441 GA |
| 本话代码运行环境 | JDK 25 | ✅ |

用 `--release 16` 尝试编译 sealed 代码：

```bash
javac --release 16 MenuSealAll.java
# error: sealed classes are a preview feature and are disabled by default.
# (use --enable-preview to enable sealed classes)
```

Java 17 前必须带 `--enable-preview`，17 起正式可用、无需预览标志。

---

## 🗺️ 继承开放度三档

sealed 子类自身的开放度可以有三种声明：

```java
sealed interface Shape permits Circle, Polygon, OpenShape {}

record Circle(double r) implements Shape {}          // record → 天然 final，完全封闭

final class Polygon implements Shape { ... }         // 显式 final，完全封闭

non-sealed class OpenShape implements Shape { ... }  // 重新开放，任何人可再继承
```

咖啡站场景：菜单的三种 record 全是 final——没有"扩展款咖啡"需要继续继承。如果将来需要半开放（比如「特调系列」允许外部扩展），用 `non-sealed` 重新打开即可。

---

## 🎯 随堂练习

**Q1.** sealed 关键字在 Java 几正式转正？
- A. Java 14　B. Java 15　C. Java 17　D. Java 21

**Q2.** 下列代码能编译通过吗？

```java
sealed interface Drink permits Coffee {}
record Coffee() implements Drink {}
record Juice() implements Drink {}    // ← 这行
```

**Q3.** sealed interface 的子类型必须是 `final` 吗？列出三种合法的开放度修饰词。

**Q4.** `javap -verbose MenuItem.class` 输出中，哪个属性记录了 permits 白名单？

**Q5.** 穷尽性 switch 对 sealed 类型的检查发生在什么阶段：编译时还是运行时？

**Q6.** 有一个 `sealed interface Tier permits Gold, Silver`，新增 `Bronze` 后，没有更新任何 switch。程序会：
- A. 编译失败　B. 运行时 NullPointerException　C. 运行时 MatchException　D. 正常运行

**Q7.** `record` 实现 sealed interface 时，需要手写 `final` 修饰符吗？为什么？

**Q8.** `non-sealed` 子类的下级继承者会被 sealed 合同约束吗？

**Q9.** `Class.permittedSubclasses()` 方法返回什么类型？（填 Java 类型全名）

**Q10.** 在 JDK 16 中使用 sealed，需要额外加什么编译/运行标志？

---

> [!答案]
>
> **Q1. C — Java 17**（JEP 409，GA 转正）
>
> **Q2. 不能。**`Juice` 没有出现在 permits 白名单里，报错：`类不得扩展密封类：Drink（因为它未列在其 'permits' 子句中）`
>
> **Q3. 不必须是 final。**三种合法修饰词：`final`（完全封闭）、`sealed`（继续密封，向下传递约束）、`non-sealed`（重新开放，不再约束下级）。record 天然等同于 final，无需手写。
>
> **Q4. `PermittedSubclasses`**（JVMS §4.7.31 定义的类文件属性）
>
> **Q5. 编译时。**编译器知晓完整许可子类型集合，在编译阶段对 switch 表达式做穷尽性检查；运行时若确有未覆盖的分支才抛 `MatchException`（理论上不会触发——因为编译已拦截）。
>
> **Q6. A — 编译失败。**switch 表达式对 sealed 类型做穷尽性检查，缺少 `Bronze` 分支，编译报错。
>
> **Q7. 不需要。**record 被编译为 `final class`，JLS 规定 record 不可继承，天然满足 sealed 对子类型的封闭要求，编译器自动认可。
>
> **Q8. 不会。**`non-sealed` 相当于「退出合同」，其下级继承者可以随意继续继承，sealed 合同的约束在 non-sealed 这一层终止。
>
> **Q9. `java.lang.Class<?>[]`**（即 `Class[]` 数组，每个元素代表一个 permitted 子类型）
>
> **Q10. 需要 `--enable-preview`**（编译和运行都要加），JDK 17 起不再需要。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`，`java.runtime.version=25.0.4+7.1-JVMCI-25.1-b01`），Windows 11，编码 UTF-8。
- **验证方式**：本话所有代码以 `javac -encoding UTF-8 --release 25` 统一编译后运行；错误信息取自实际编译输出（含中文）；`javap -p`/`-verbose` 字节码实录来自同一编译产物。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。sealed（JEP 409）在 JDK 17 正式转正；switch 模式匹配（JEP 441）在 JDK 21 正式转正；两者在 JDK 25 均无需 `--enable-preview`。

---

## 🔮 下话预告：F1E4《分拣流水线》

菜单封印之后，阿零拿到了形如 `MenuItem` 的订单流——但折扣算法依然是一堆 `instanceof-强转-if-else` 的人工流水线。

下一话，焰焰展示 **switch 模式匹配与 when 守卫**，把人肉开箱验货升级成自动分拣机：`case Espresso e when e.shots() >= 2 -> "双份浓缩快线"`——类型检查、绑定、条件，三合一。
