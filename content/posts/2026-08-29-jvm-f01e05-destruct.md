---
title: "F1E5 套娃拆包机 — record 解构模式与未命名变量 _"
date: "2026-08-29"
series: "jvm-academy"
season: 1
episode: 5
tags: ["Java 25", "record解构", "未命名变量", "模式匹配", "现代Java"]
summary: "嵌套订单像俄罗斯套娃——外层 Order 包着内层 Drink，一次 case 就全拆开；不想要的字段扔进 _ 回收槽，编译器自动接管。"
---

> **"以前拆套娃要先撬外壳、再掰内盖、最后取芯子——三把起子。现在一句 case，全拆。"**
> — 阿零，盯着新式分拣台感叹

---

## 🎬 开场：套娃订单

![《JVM 火种纪》05 · 套娃拆包机——record 解构六格漫画](/comics/jvm/f01e05-destruct.png)

> **〔1〕**
> 午后。阿零对着一批嵌套订单犯难。
>
> 每张订单是 `Order(Drink item, int qty)`，里面包着 `Drink(String name, int price)`——想取出品名和数量，旧代码要三行：
>
> ```java
> if (obj instanceof Order o) {
>     String name = o.item().name();
>     int qty = o.qty();
>     // ...
> }
> ```
>
> 「外层拆一次、内层再拆一次，两把钥匙。」阿零叹气。

> **〔2〕**
> 焰焰挂着《JEP 编年史》溜进来，翻到"解构模式"那页。
>
> 「Java 21 起，record 能**直接在 case 里解构**——外层和内层一起写，编译器一次拆完。」

> **〔3〕**
> 「还有那些你根本不关心的字段呢？」阿零问，「比如价格我只想过滤，不想用。」
>
> 「`_`，未命名变量。**Java 22 转正（JEP 456）**。」焰焰在白板上写下：
>
> ```java
> case Order(Drink(String name, _), int q)
> //                           ↑ 这里的 price 直接丢弃
> ```
>
> 「`_` 是个回收槽——变量名不声明，不占位，编译器知道你不需要它。」

> **〔4〕**
> 「那如果想根据价格高低走不同分支呢？」
>
> 「先窄后宽——带 `when` 守卫的高价分支放前面，不带守卫的兜底放后面。」焰焰拍了拍白板，「**支配性规则在解构里同样适用。**」

---

## 🔑 核心技术：record 解构模式

### 语法

```java
case OuterRecord(Type1 var1, Type2 var2) -> ...          // 单层解构
case OuterRecord(InnerRecord(Type1 var1, _), _) -> ...   // 嵌套解构 + _ 忽略字段
```

- **解构模式**：在 `case` 里直接提取 record 的分量，绕过 accessor 方法调用
- **嵌套解构**：内层 record 也可以继续解构，递归展开
- **`_` 未命名变量**：占位但不绑定名字，`Java 22 GA（JEP 456）`；可在同一 case 多次使用
- **与 when 配合**：解构绑定的变量可在 `when` 守卫中使用

---

## ⚙️ 代码实录：套娃拆包机

```java
// javac -encoding UTF-8 --release 25 UnnamedVarDemo.java
record Drink(String name, int price) {}
record Order(Drink item, int qty) {}

class UnnamedVarDemo {
    static String label(Object obj) {
        return switch (obj) {
            // 窄：嵌套解构 + when 守卫（高价优先）
            case Order(Drink(String name, int price), int q) when price > 3000 ->
                "豪华: " + name + "×" + q;
            // 宽：_ 丢弃不需要的 price
            case Order(Drink(String name, _), int q) ->
                "普通: " + name + "×" + q;
            // 散件：只是 Drink，不在 Order 里
            case Drink(String name, _) ->
                "散件: " + name;
            default -> "未知";
        };
    }

    public static void main(String[] args) {
        System.out.println(label(new Order(new Drink("精品豆", 4500), 2)));   // 豪华: 精品豆×2
        System.out.println(label(new Order(new Drink("日常豆", 2000), 5)));   // 普通: 日常豆×5
        System.out.println(label(new Drink("特供豆", 8000)));                  // 散件: 特供豆
        System.out.println(label("hello"));                                    // 未知
    }
}
```

**实测输出**（GraalVM 25.0.4）：

```
豪华: 精品豆×2
普通: 日常豆×5
散件: 特供豆
未知
```

---

## 🚨 支配性规则在解构中同样适用

把宽分支放到窄分支前面，同样报支配性错误：

```java
// 错误示例：宽在前，窄在后
case Order(Drink(String name, _), int q)                  -> "普通";  // 宽
case Order(Drink(String name, int price), int q)
    when price > 3000                                      -> "豪华";  // ← 永不可达
```

**编译器报错**（Java 25，实测）：

```
error: 此 case 标签由前一个 case 标签支配
```

**修复**：带 `when` 的窄分支放前面，宽的兜底放后面。

---

## 📐 `_` 未命名变量的三种用法

| 场景 | 示例 | 说明 |
|---|---|---|
| 解构忽略字段 | `case Order(Drink(String n, _), _)` | 不需要的分量不绑定 |
| try-catch 忽略异常 | `catch (Exception _)` | Java 22 起合法 |
| lambda 忽略参数 | `BiFunction<String,Integer,String> f = (s, _) -> s` | Java 22 起合法 |

同一作用域可以多次写 `_`，不会冲突（它不是变量名，不需要唯一）。

---

## 🔬 炉底显微镜

> 焰焰拿出字节码放大镜：「解构模式底层也是 `invokedynamic` 引导——编译器把嵌套解构展开成一系列 accessor 调用链，再包进 `typeSwitch`。」

```bash
# 编译
javac -encoding UTF-8 --release 25 UnnamedVarDemo.java

# 查看 record 的组件方法（accessor = 解构的底层实现）
javap -p Order.class
javap -p Drink.class

# 查看 label 方法字节码
javap -c UnnamedVarDemo.class
```

**实测 `javap -p Order.class`**：

```
final class Order extends java.lang.Record {
  private final Drink item;
  private final int qty;
  Order(Drink, int);
  public final java.lang.String toString();
  public final int hashCode();
  public final boolean equals(java.lang.Object);
  public Drink item();    ← 解构时调用此方法取外层 Drink
  public int qty();       ← 解构时调用此方法取 qty
}
```

**实测 `javap -p Drink.class`**：

```
final class Drink extends java.lang.Record {
  private final java.lang.String name;
  private final int price;
  Drink(java.lang.String, int);
  ...
  public java.lang.String name();   ← 嵌套解构取 name
  public int price();               ← _ 忽略时此方法不调用
}
```

关键观测点：
- record 解构实质是编译器自动调用 accessor 方法链（`order.item().name()`）
- `_` 忽略的字段对应的 accessor **不被调用**，无性能代价
- 嵌套层数理论无限制，但超过 3 层可读性急剧下降

---

## 📐 版本边界

**版本边界**

| 里程碑 | JDK | 状态 |
|---|---|---|
| record 解构预览 | JDK 19 | JEP 405 Preview |
| record 解构二预览 | JDK 20 | JEP 432 Second Preview |
| **record 解构 GA** | **JDK 21** | **JEP 440 GA** |
| **`_` 未命名变量 GA** | **JDK 22** | **JEP 456 GA** |
| 本话代码运行环境 | JDK 25 | ✅ |

```bash
# JDK 21 可用 record 解构，但 _ 未命名变量需 JDK 22+
javac --release 21 UnnamedVarDemo.java
# error: '_' used as an identifier
# (use --enable-preview to enable unnamed variables (preview feature))
```

JDK 22 起 `_` 无需预览，JDK 25 两者均完全可用。

---

## 🎯 随堂练习

**Q1.** record 解构模式在 Java 几正式转正（GA）？
- A. Java 19　B. Java 20　C. Java 21　D. Java 22

**Q2.** `_` 未命名变量在 Java 几正式转正？
- A. Java 21　B. Java 22　C. Java 23　D. Java 25

**Q3.** 下列代码中，`_` 出现了几次，合法吗？

```java
case Order(Drink(String n, _), _) -> "品名: " + n;
```

**Q4.** record 解构底层通过什么机制提取字段值？

**Q5.** `_` 忽略的字段，其对应的 accessor 方法会被调用吗？

**Q6.** 下列哪种情况会触发支配性编译错误？

```java
// A
case Order(Drink(String n, int p), int q) when p > 3000 -> "A";
case Order(Drink(String n, _), int q) -> "B";

// B
case Order(Drink(String n, _), int q) -> "B";
case Order(Drink(String n, int p), int q) when p > 3000 -> "A";
```

**Q7.** record 解构可以配合 `instanceof` 用于 if 语句吗？写出语法。

**Q8.** 嵌套 record 解构的层数有上限吗？有没有推荐的层数？

**Q9.** `case Drink(String name, _)` 里的 `_` 和旧版 Java 用 `_` 作变量名有什么区别？

**Q10.** 在 `catch (Exception _)` 中，`_` 的用法是否与解构中的 `_` 语义一致？

---

> [!答案]
>
> **Q1. C — Java 21**（JEP 440 GA）
>
> **Q2. B — Java 22**（JEP 456 GA）
>
> **Q3. 两次，合法。**`_` 不是普通变量名，同一作用域可以多次使用，不会产生"重复声明"错误。
>
> **Q4. 通过 record 的 accessor 方法（组件访问方法）。**编译器把 `case Order(Drink(String n, int p), int q)` 展开为 `obj instanceof Order o && o.item() instanceof Drink d && ...` 的等价字节码链。
>
> **Q5. 不会被调用。**编译器识别到 `_` 后，跳过对应 accessor 的调用，不产生方法调用字节码，无性能代价。
>
> **Q6. B 触发支配性错误。**在 B 中，无守卫的宽分支 `Order(Drink(String n, _), int q)` 放在前面，覆盖所有 Order，导致后面带 `when` 的窄分支永不可达，编译器报"此 case 标签由前一个 case 标签支配"。
>
> **Q7. 可以。**语法：`if (obj instanceof Order(Drink(String name, _), int qty)) { ... }`——称为"解构 instanceof 模式"（JEP 440 一并支持）。
>
> **Q8. 无硬性上限，但推荐不超过 2~3 层。**嵌套层数过多时可读性急剧下降，建议超过 3 层时用局部变量拆解。
>
> **Q9. 语义不同。**旧版 Java 中 `_` 是合法变量名（JDK 9 起废弃，JDK 21 报错）；Java 22 起 `_` 是语言保留符号，表示"有意忽略，不绑定名字"，不能读取也不能赋值。
>
> **Q10. 语义一致。**JEP 456 统一了 `_` 在所有位置（解构模式、catch 子句、lambda 参数）的语义：占位但不声明变量，不可引用。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：本话所有代码以 `javac -encoding UTF-8 --release 25` 统一编译后运行；`javap -p` 字节码实录来自同一编译产物；支配性错误信息取自实际编译输出。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。record 解构（JEP 440）在 JDK 21 正式转正；未命名变量 `_`（JEP 456）在 JDK 22 正式转正；两者在 JDK 25 均无需 `--enable-preview`。

---

## 🔮 下话预告：F1E6《super 之前的自由》

record 解构让你优雅地读数据——下一话反过来，讲**写数据时的构造器规则**。

Java 25 之前，构造器里必须「先喊 `super()`，再干活」——参数合法性检查只能在 super 之后做，逻辑被迫颠倒。JDK 25 的 JEP 513《灵活构造器体》拆掉了这道门禁：在 `super()` 之前就可以安检参数、初始化辅助变量——焰焰的版本残影会重演 1995 年那场争论。
