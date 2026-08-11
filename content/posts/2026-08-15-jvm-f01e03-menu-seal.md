---
title: "《JVM 火种纪》03 · 菜单封印术"
date: 2026-08-15
summary: "促销引擎被一个没人批准过的「香菜冷萃」打崩：菜单接口谁都能 implements，折扣 switch 却漏了这一型。阿零用 sealed + permits 把继承树关进笼子，让编译器在继承侧和 switch 侧同时守门；javap 拆开炉底，看白名单是怎么硬编码进类文件的。"
tags: [Java, Java漫画, JVM, sealed, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》03 · 菜单封印术

> JVM 火种纪 · 卷一「语言进化篇」第 3 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话用 record 把订单卡片的入口钉死了，但菜单本身还是一个谁都能实现的开放接口——脏数据不再从字段进来，改从类型进来。

---

## 一、事故：菜单上没有的品类，卖出去了

上一话把订单卡片的入口收紧之后，阿零以为数据层已经安全了。这周促销引擎崩了。

监控弹出一行警报：**订单里出现了「香菜冷萃」——菜单上根本没这个品类。**

排查下来是一个实习生的改动：他实现了 `MenuItem` 接口，自己加了个 `CorianderCold` 类型，接进了促销引擎。折扣算法的 `switch` 压根没处理这一型，直接抛异常。

编译期一声没响，代码评审也过了。豆豆看完只说了一句：「你的订单卡片有安检门，但菜单没有。上一话你锁的是**值**，这一话漏的是**类型**。」

---

## 二、漫画 · 炉门第一次上锁

![《JVM 火种纪》03 · 菜单封印术——sealed 门禁六格漫画](/comics/jvm/f01e03-menu-seal.png)

> [!文字版]
> **〔1〕** 深夜，烘豆炉三楼。阿零盯着监控屏幕皱眉——一行警报挂在中间：订单里出现了「香菜冷萃」。他翻提交记录，找到那个继承了 `MenuItem` 的新类型，塞进促销引擎，折扣算法当场崩。
>
> **〔2〕** 焰焰从炉口探出头，尾巴火焰是冷静的蓝色。「你的菜单 `interface` 没有门禁。任何人都能 `implements` 进来，编译器不拦、运行时不拦，出问题了才发现。」
>
> **〔3〕** 阿零嘴硬:「那我在评审里盯紧点不就行了?」焰焰把《JEP 编年史》翻到第 409 页,一句话压过来:「靠人记住的规则,迟早有人忘。**Java 17 起有一把锁，叫 `sealed`**——它让编译器替你盯。」
>
> **〔4〕** 书页上的关键句被炉火映亮:sealed 列出允许的子类型（permits），编译器在**继承侧**拦截，在 **switch 侧**强制穷尽。阿零愣住:「所以漏一个分支它也会骂我?」
>
> **〔5〕** 「那新品上线怎么办?」阿零还是不服。「打开 permits 合同,加一行。」焰焰弹了弹尾巴,「编译器立刻告诉你哪些 switch 漏处理了。这叫**开放点单一处，关闭忘记一处**。」
>
> **〔6〕** 炉底浮出一个 2011 年的版本残影,手里攥着一份被否决的草案:「我们那会儿想给 Java 加密封类型,提了又撤。等了十四年,你们现在一行 `sealed` 就有了。」残影散进火里。

---

## 三、本话目标

- 用 `sealed` + `permits` 把类型的实现者收进白名单；
- 理解编译器在继承侧与 switch 侧的两道拦截；
- 分清子类型的三档开放度：`final` / `sealed` / `non-sealed`；
- 用 `javap` 看清白名单如何硬编码进类文件；
- 说清 sealed 从预览到转正的版本边界。

---

## 四、炉内原理图：sealed 的三个语言元素

sealed 体系由三个元素组成，缺一个门就关不严：

| 元素 | 作用 | 放在哪 |
|---|---|---|
| `sealed` 修饰符 | 声明「此类型只开放给指定子类型」 | 父接口/类 |
| `permits` 子句 | 白名单，列出允许的子类型 | 与 `sealed` 同行 |
| `final` / `sealed` / `non-sealed` | 子类型自身的开放度 | 每个许可子类 |

record 天然 final，所以实现 sealed 接口的 record 不需要额外标注——这一点接上一话：上一话钉住的是数据形状，这一话钉住的是类型集合，两者叠起来才是「**形状与成员都不可偷改**」。

关键在于这不是运行时检查。白名单在编译期就写进类文件，`switch` 的穷尽性也在编译期算出来——**错误在你提交之前就被拦住，不是等线上崩了才知道**。

---

## 五、从上一话继续改代码：给菜单接口上锁

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

## 六、故意翻一次车：把那杯香菜冷萃再加一次

事故已经修完了，但阿零想知道——如果他现在再犯一次同样的错，编译器到底会不会拦。他把实习生那段代码原样加回来：

```java
// 复刻线上那次事故：没在 permits 里的类型，直接实现菜单接口
record CorianderCold(String note) implements MenuItem {
    public int cents() { return 1500; }
}
```

顺手又制造第二种翻法：假装新品「抹茶」已经进了 permits，但折扣 switch 忘了跟上。

```java
// permits 加了 Matcha，switch 没跟上
static int badDiscount(MenuItem item) {
    return switch (item) {
        case Espresso e -> e.cents() - 200;
        case Latte l   -> l.cents() - 300;
        // 漏掉 Tea 与新加的 Matcha
    };
}
```

上锁之前，这两段都能编译通过，然后在线上崩。上锁之后——

---

## 七、编译官罚单

> **📋 编译官罚单 · 两道门各开一张**
>
> 门一，非许可类型被拦在继承侧（Java 25 实测）：
>
> ```text
> error: 类不得扩展密封类：MenuItem（因为它未列在其 'permits' 子句中）
> record CorianderCold(String note) implements MenuItem {
> ^
> ```
>
> 门二，穷尽性检查在 switch 侧开罚（实测）：
>
> ```text
> error: switch 表达式不包含所有可能的输入值
>         return switch (item) {
>                ^
> ```
>
> 两张罚单都开在**编译期**。那次线上事故里，同样的错误一张罚单都没有——因为当时接口没上锁，编译器无权过问。

---

## 八、修复并验证

修复不是改 switch，是**先上锁**：给 `MenuItem` 加 `sealed` + `permits`。锁上之后，上面两段代码都编不过去——错误从「线上崩」提前到了「提交前」。

验证判据分两条，都要真跑出来：

1. **上锁生效**：非许可类型编译失败，报错文本含「不得扩展密封类」。
2. **穷尽性生效**：漏分支的 `switch` 编译失败，报错文本含「不包含所有可能的输入值」。

正常路径的验证（GraalVM 25.0.4 实测输出）：

```text
Espresso折后=2400
Latte折后=2900
Tea折后=2100
```

三行都对上预期，说明锁没有把正常流程一起锁死——**门禁只拦没批准的，不拦拿了通行证的**。

这就是「**开放点单一处，关闭忘记一处**」：permits 里加一行，所有没跟上的 switch 立刻被编译器点名，一个都跑不掉。

---

## 九、🔬 炉底显微镜 · 白名单藏在类文件哪一层

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

## 十、⏳ 版本时光机 · sealed 走了多久

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

## 十一、继承开放度三档

sealed 子类自身的开放度可以有三种声明：

```java
sealed interface Shape permits Circle, Polygon, OpenShape {}

record Circle(double r) implements Shape {}          // record → 天然 final，完全封闭

final class Polygon implements Shape { ... }         // 显式 final，完全封闭

non-sealed class OpenShape implements Shape { ... }  // 重新开放，任何人可再继承
```

咖啡站场景：菜单的三种 record 全是 final——没有"扩展款咖啡"需要继续继承。如果将来需要半开放（比如「特调系列」允许外部扩展），用 `non-sealed` 重新打开即可。

> [!坑] `non-sealed` 是**主动放弃**门禁，不是「稍微松一点」。一旦某个子类型标了 `non-sealed`，它下面的继承链就完全不受 sealed 合同约束了，穷尽性检查也到此为止。要开这个口子，先想清楚谁会从这里进来。

---

## 十二、项目检查点 · 豆豆咖啡站 jvm-v0.3

- **已具备**：订单卡片的值不可偷改（v0.2）；菜单的类型集合不可偷加（本话）；促销引擎漏分支会在编译期被点名。
- **还没有**：折扣逻辑仍是 `instanceof` + 强转的人工流水线，没用上模式匹配；促销规则还没有按会员等级分层。

阿零的变化：他上一话学会了「把不变量钉在构造时」，这一话第一次意识到——**类型集合本身也是一种不变量**，而且它能交给编译器守。

---

## 十三、对应招聘技能

密封类型与领域建模、代数数据类型（ADT）思维、穷尽性检查、类文件属性（`PermittedSubclasses`）、Java 版本演进边界表达。

---

## 十四、下一话悬念

菜单封印之后，阿零拿到了形如 `MenuItem` 的订单流——但折扣算法依然是一堆 `instanceof`、强转和 `if-else` 拼起来的人工流水线，看着就像在拿放大镜一个个验货。

焰焰瞥了一眼那段代码：「你已经把类型关进笼子了，为什么还在笼子外面用手数？」下一话，**switch 模式匹配与 `when` 守卫**上场，把人肉开箱验货升级成自动分拣机——类型检查、变量绑定、附加条件，三件事一行写完。

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

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
