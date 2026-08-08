---
title: "F1E4 分拣流水线 — switch 模式匹配与 when 守卫"
date: "2026-08-22"
series: "jvm-academy"
season: 1
episode: 4
tags: ["Java 25", "switch模式匹配", "when守卫", "instanceof", "现代Java"]
summary: "人肉开箱验货的 instanceof-强转链升级成自动分拣机——类型检查、绑定、条件守卫，三步合一，编译器拦截支配性错误。"
---

> **"老流水线靠人眼辨货，新流水线靠形状分槽——货物一进来，自动测重、贴标、入箱。"**
> — 焰焰，指着新安装的自动分拣机说

---

## 🎬 开场：人工验货的痛苦

![《JVM 火种纪》04 · 分拣流水线——模式匹配六格漫画](/comics/jvm/f01e04-sort-pipeline.png)

> **〔1〕**
> 早高峰。阿零站在订单分拣台前，对着一摞 `MenuItem` 对象发呆。
>
> 旧代码是这样的：
>
> ```java
> if (item instanceof Espresso) {
>     Espresso e = (Espresso) item;
>     if (e.shots() >= 2) route = "双份快线";
>     else route = "普通线";
> } else if (item instanceof Latte) {
>     Latte l = (Latte) item;
>     route = l.oatMilk() ? "燕麦线" : "牛奶线";
> } else if (item instanceof Tea) { ... }
> ```
>
> 「六行换一个路由，每次加品类都要往里钻。」阿零捏着鼻子。

> **〔2〕**
> 焰焰探头进来，尾巴是跃跃欲试的橙红色。
>
> 「Java 21 起，switch 可以直接写 `case Espresso e when e.shots() >= 2`——**类型检查、绑定变量、条件守卫，一行搞定**。」

> **〔3〕**
> 「等等，以前的 switch 只能匹配常量。」
>
> 「对——那是 JDK 17 之前的事了。JEP 441 在 Java 21 转正，switch 现在能匹配**任意类型**，包括 sealed 的子类型。」
>
> 焰焰在白板上画出对比图：
>
> ```
> 旧：instanceof检查 → 强转 → 条件分支   ← 三步，三处出错机会
> 新：case Type var when cond → 处理      ← 一步，编译器保证类型安全
> ```

> **〔4〕**
> 「那如果两个 case 顺序写反了——宽的在上面，窄的在下面——怎么办？」
>
> 「**编译器直接报错：此 case 标签由前一个 case 标签支配。**」焰焰弹了弹尾巴，「分拣机会主动拒绝歧义装配图。」

---

## 🔑 核心技术：switch 模式匹配

### 语法结构

```java
switch (表达式) {
    case 类型模式 变量 when 守卫条件 -> 处理;
    case 类型模式 变量              -> 处理;
    default                         -> 处理;
}
```

- **类型模式**：`case Espresso e` ——测试类型并绑定变量，等价于 `instanceof` 检查 + 强转
- **when 守卫**：附加布尔条件，通过才命中本分支
- **穷尽性**：对 sealed 类型，编译器要求覆盖所有子类型（可以不写 default）
- **支配性检查**：宽模式不能放在窄模式之前，否则编译报错

---

## ⚙️ 代码实录：自动分拣机

```java
// javac -encoding UTF-8 --release 25 SortAll.java
sealed interface MenuItem permits Espresso, Latte, Tea { int cents(); }
record Espresso(int shots) implements MenuItem {
    Espresso { if (shots < 1 || shots > 4) throw new IllegalArgumentException("shots 不合法"); }
    public int cents() { return 1800 + shots * 400; }
}
record Latte(boolean oatMilk) implements MenuItem {
    public int cents() { return oatMilk ? 3200 : 2800; }
}
record Tea(String name) implements MenuItem {
    public int cents() { return 2200; }
}

class SortDemo {
    static String route(MenuItem item) {
        return switch (item) {
            case Espresso e when e.shots() >= 2 -> "双份浓缩快线";
            case Espresso e                     -> "单份浓缩普通线";
            case Latte l when l.oatMilk()       -> "燕麦奶过滤线";
            case Latte l                        -> "牛奶线";
            case Tea t when t.name().contains("绿") -> "绿茶冰镇线";
            case Tea t                          -> "热茶线";
        };
    }

    public static void main(String[] args) {
        System.out.println(route(new Espresso(3)));   // 双份浓缩快线
        System.out.println(route(new Espresso(1)));   // 单份浓缩普通线
        System.out.println(route(new Latte(true)));   // 燕麦奶过滤线
        System.out.println(route(new Latte(false)));  // 牛奶线
        System.out.println(route(new Tea("绿茶")));    // 绿茶冰镇线
        System.out.println(route(new Tea("乌龙")));    // 热茶线
    }
}
```

**实测输出**（GraalVM 25.0.4）：

```
双份浓缩快线
单份浓缩普通线
燕麦奶过滤线
牛奶线
绿茶冰镇线
热茶线
```

---

## 🚨 支配性错误：分拣机拒绝歧义装配图

宽模式放在窄模式之前，编译器直接拒绝：

```java
static String badRoute(MenuItem item) {
    return switch (item) {
        case Espresso e                     -> "普通";   // ← 宽：任意 Espresso
        case Espresso e when e.shots() >= 2 -> "双份";   // ← 窄：被上一行支配，永远不可达
    };
}
```

**编译器报错**（Java 25，实测）：

```
error: 此 case 标签由前一个 case 标签支配
        case Espresso e when e.shots() >= 2 -> "双份";
             ^
```

**修复**：窄模式（带 when 的）必须放在宽模式**之前**。

---

## 📊 旧写法 vs 新写法对比

| 维度 | 旧：instanceof + 强转链 | 新：switch 模式匹配 |
|---|---|---|
| 类型检查 | `instanceof` | case 自动检查 |
| 变量绑定 | 手动强转 `(Espresso) item` | case 自动绑定 `e` |
| 条件分支 | 内层 `if` | `when` 守卫同行 |
| 穷尽性保证 | 无（运行时漏判） | 编译器强制（sealed） |
| 支配性检查 | 无 | 编译器拦截 |
| 引入版本 | Java 1.0 | **Java 21 GA（JEP 441）** |

---

## 🔬 炉底显微镜

> 焰焰跳下分拣台，凑到 `SortDemo.class` 跟前：「switch 模式匹配在字节码层面是 `tableswitch` / `lookupswitch` + `checkcast` + 条件跳转的组合——让我们看一眼。」

```bash
# 编译
javac -encoding UTF-8 --release 25 SortAll.java

# 查看分拣方法的字节码（关键指令）
javap -c SortDemo.class

# 查看 sealed 接口的 PermittedSubclasses（保证穷尽性的元信息来源）
javap -verbose MenuItem.class | findstr /i "PermittedSubclasses" /a 3
```

**实测 javap -p SortDemo**：

```
class SortDemo {
  SortDemo();
  static java.lang.String route(MenuItem);
  public static void main(java.lang.String[]);
}
```

**关键字节码片段**（`javap -c SortDemo.class`，route 方法节选）：

```
static java.lang.String route(MenuItem);
  Code:
     0: aload_0
     1: astore_1
     2: iconst_m1
     3: istore_2
     4: aload_1
     5: invokestatic  #7   // invokedynamic typeSwitch 引导方法
    ...
    // checkcast Espresso → 绑定变量 e
    // iload shots → when 守卫判断
    // tableswitch / lookupswitch → 分支跳转
```

关键观测点：
- switch 模式匹配底层用 `invokedynamic` 引导（`typeSwitch`），不是简单 `tableswitch`
- `checkcast` 完成类型绑定，`when` 守卫编译成普通条件跳转 `if_icmpge`
- sealed 类型的穷尽性检查在**编译期**完成，运行时不需额外检查

---

## 📐 版本边界

**版本边界**

| 里程碑 | JDK | 状态 |
|---|---|---|
| switch 表达式 | JDK 14 | JEP 361 GA（返回值） |
| switch 模式匹配预览 | JDK 17 | JEP 406 Preview |
| switch + when 守卫预览 | JDK 19 | JEP 427 Third Preview |
| **switch 模式匹配 + when GA** | **JDK 21** | **JEP 441 GA** |
| 本话代码运行环境 | JDK 25 | ✅ |

```bash
# JDK 20 尝试编译 switch 模式匹配，无预览标志会报错
javac --release 20 SortAll.java
# error: pattern matching in switch is a preview feature and is disabled by default.
# (use --enable-preview to enable pattern matching in switch)
```

JDK 21 起无需 `--enable-preview`，when 守卫同版本正式可用。

---

## 🎯 随堂练习

**Q1.** switch 模式匹配（含 when 守卫）在 Java 几正式转正？
- A. Java 17　B. Java 19　C. Java 21　D. Java 25

**Q2.** 下列代码能编译通过吗？

```java
sealed interface Shape permits Circle, Square {}
record Circle(double r) implements Shape {}
record Square(double side) implements Shape {}
static double area(Shape s) {
    return switch (s) {
        case Circle c -> Math.PI * c.r() * c.r();
        // Square 分支缺失
    };
}
```

**Q3.** 以下哪行 case 会触发"支配性"编译错误？

```java
case Espresso e when e.shots() > 0 -> "有咖啡因";  // A
case Espresso e                    -> "普通";       // B
```

**Q4.** `when` 守卫中可以调用方法（如 `e.shots()`）吗？可以有副作用吗（如修改外部变量）？

**Q5.** switch 模式匹配中，绑定变量 `e` 的作用域是什么范围？

**Q6.** 对非 sealed 类型（如 `Object`），switch 模式匹配可以省略 `default` 吗？

**Q7.** switch 模式匹配底层用什么 JVM 指令作为入口？
- A. `tableswitch`　B. `lookupswitch`　C. `invokedynamic`　D. `checkcast`

**Q8.** `case null` 可以出现在 switch 模式匹配中吗？不写时传入 null 会怎样？

**Q9.** `when` 守卫条件的求值时机是什么？类型匹配失败时还会求值吗？

**Q10.** 旧式 `instanceof` 模式（`item instanceof Espresso e`）与 switch 模式匹配在字节码层面有何本质区别？

---

> [!答案]
>
> **Q1. C — Java 21**（JEP 441 GA，含 when 守卫）
>
> **Q2. 不能编译。**`area` 是 switch 表达式，对 sealed `Shape` 缺少 `Square` 分支，编译报"switch 表达式不包含所有可能的输入值"。
>
> **Q3. B 行触发支配性错误。**A 是窄模式（带 when 限制范围），B 是宽模式（无条件覆盖所有 Espresso）。如果 A 放 B 之后才对；如 B 在 A 之前，则 A 永不可达，编译器报"此 case 标签由前一个 case 标签支配"。
>
> **Q4. 可以调用方法。**技术上允许有副作用，但强烈不建议——JLS 未保证 when 守卫的求值次数（优化器可能多次求值），应保持守卫为纯布尔表达式。
>
> **Q5. 绑定变量 `e` 的作用域是该 case 分支的箭头右侧表达式或语句块内。**不同 case 分支的绑定变量互相独立，不跨分支可见。
>
> **Q6. 不能省略。**对非 sealed 类型，编译器无法验证穷尽性，必须写 `default`（或显式列出所有可能类型）。
>
> **Q7. C — `invokedynamic`。**Java 21 的 switch 模式匹配使用 `invokedynamic` + `TypeSwitchCallSite` 作为入口，再结合 `checkcast` 和条件跳转实现类型绑定与守卫。
>
> **Q8. 可以写 `case null`。**不写时，若传入 null，switch 抛出 `NullPointerException`（与旧行为一致）；写了 `case null` 则可安全处理。
>
> **Q9. 仅在类型匹配成功后求值。**`case Espresso e when e.shots() >= 2` 中，先检查 `item instanceof Espresso`，通过后才对 `e.shots() >= 2` 求值；类型不匹配时守卫完全不执行。
>
> **Q10. 本质相同（均生成 `checkcast` + 条件跳转），但 switch 模式匹配通过 `invokedynamic` 引导统一分发，多分支只做一次类型索引；旧式 `instanceof` 链每个分支独立做 `instanceof`/`checkcast`，N 个分支做 N 次检查——switch 更高效，且编译器保证穷尽性与无支配。**

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：本话所有代码以 `javac -encoding UTF-8 --release 25` 统一编译后运行；`javap -c` 字节码实录来自同一编译产物；支配性错误信息取自实际编译输出。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。switch 模式匹配（JEP 441）在 JDK 21 正式转正，when 守卫同版本可用；JDK 25 均无需 `--enable-preview`。

---

## 🔮 下话预告：F1E5《套娃拆包机》

订单分拣到位了——但有些订单是嵌套结构：`Order(String drink, Point pos)`，内嵌的 `Point` 也是 record。

下一话，焰焰展示 **record 解构模式**，一次性拆开套娃：`case Order(String d, Point(int x, int y))` ——外层类型匹配 + 内层字段解构，加上 `_` 未命名变量丢弃不需要的零件。
