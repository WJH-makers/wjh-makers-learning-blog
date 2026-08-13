---
title: "《JVM 火种纪》05 · 套娃拆包机"
date: 2026-08-29
summary: "分拣线跑通了，嵌套订单却还要先认出外层、再一层层点出内层字段，取两个值写三行。阿零用 record 解构模式一行拆穿套娃，不关心的分量交给未命名变量 _；javap 拆开炉底，看解构到底调用了哪些 accessor。"
tags: [Java, Java漫画, JVM, record解构, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》05 · 套娃拆包机

> JVM 火种纪 · 卷一「语言进化篇」第 5 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话分拣机已经能按类型自动派单，但订单结构开始套娃——外层认出来了，里层还得自己一层层点出来。

---

## 一、事故：认出了外层，里层还是手工拆

上一话换上自动分拣机之后，分拣线本身没再出过问题。这周订单结构变了：一张订单是 `Order(Drink item, int qty)`，里面还包着 `Drink(String name, int price)`。

阿零想拿品名和数量做一张热销榜，写出来是这样：

```java
if (obj instanceof Order o) {
    String name = o.item().name();
    int qty = o.qty();
    // ...
}
```

认出外层用了一次 `instanceof`，取内层字段又点了两次——**外层拆一次、内层再拆一次，两把钥匙**。热销榜还要按价格分档，条件判断只能再往里嵌一层 `if`。

豆豆凑过来看了一眼那串点号：「你上一话让编译器认出了『这是什么类型』，可『里面装了什么』还是你自己一层层掏出来的。」

---

## 二、漫画 · 一句 case 拆到底

![《JVM 火种纪》05 · 套娃拆包机——record 解构六格漫画](/comics/jvm/f01e05-destruct.png)

> [!文字版]
>
> **〔1〕** 午后。阿零对着一批嵌套订单犯难：外层 `Order(Drink item, int qty)`，里面还包着 `Drink(String name, int price)`。他手上那段代码先 `instanceof Order o`，再 `o.item().name()`、`o.qty()`——一路点号往里钻。「外层拆一次、内层再拆一次，两把钥匙。」
>
> **〔2〕** 焰焰挂着《JEP 编年史》溜进来，尾巴是懒洋洋的暗红色，翻到「解构模式」那页。「Java 21 起，record 能**直接在 case 里解构**——外层和内层一起写，编译器一次拆完。」
>
> **〔3〕** 阿零嘴硬:「那不就是把点号搬进 case 里换个写法?」焰焰把书页拍到他面前:「不一样。点号是你保证不会取错字段，解构是**编译器按分量顺序和类型对齐**——写错分量个数它当场拦你。」
>
> **〔4〕** 「那些我根本不关心的字段呢？」阿零问，「价格我只想过滤，不想用。」「`_`，未命名变量，**Java 22 转正（JEP 456）**。」焰焰在白板上写下：
>
> ```java
> case Order(Drink(String name, _), int q)
> //                           ↑ 这里的 price 直接丢弃
> ```
>
> 「`_` 是个回收槽——不声明变量名，不占位，编译器知道你不需要它。」
>
> **〔5〕** 「那要按价格高低走不同分支呢?」阿零还是不服。「先窄后宽——带 `when` 守卫的高价分支放前面，不带守卫的兜底放后面。」焰焰弹了弹尾巴，「**上一话的支配性规则，在解构里一个字都没变。**」
>
> **〔6〕** 炉底浮出一个 2019 年的版本残影，抱着一叠还在改的模式匹配草案:「我们那会儿先放出 `instanceof` 模式,解构模式又磨了两轮预览。」它瞥了眼白板上那行一次拆到底的 case,「你们现在一句就有了。」残影散进火里。

---

## 三、本话目标

- 用 record 解构模式在 `case` 里一次拆穿嵌套结构；
- 用 `_` 未命名变量丢弃不关心的分量；
- 确认支配性规则在解构模式里同样生效；
- 用 `javap` 看清解构底层调用了哪些 accessor；
- 说清解构模式与 `_` 各自的版本边界。

---

## 四、炉内原理图：解构就是编译器替你点那串点号

```java
case OuterRecord(Type1 var1, Type2 var2) -> ...          // 单层解构
case OuterRecord(InnerRecord(Type1 var1, _), _) -> ...   // 嵌套解构 + _ 忽略字段
```

| 组成 | 职责 | 对应旧写法 |
|---|---|---|
| 解构模式 | 在 `case` 里直接提取 record 的分量 | `instanceof` + 一串 accessor 点号 |
| 嵌套解构 | 内层 record 继续解构，递归展开 | 逐层 `o.item().name()` |
| `_` 未命名变量 | 占位但不绑定名字（JDK 22 GA，JEP 456） | 声明一个用不上的变量 |
| 与 `when` 配合 | 解构绑定的变量可直接用在守卫里 | 内层嵌套 `if` |

这张图接上一话：**上一话的类型模式只认出「这是什么」，解构模式往前一步，同时认出「里面装了什么」**。分量的个数和类型由编译器按 record 声明对齐，写错一个当场编译失败——而手写点号链写错字段，编译器只会当成一次正常的方法调用放过去。

为什么这么设计：record 的分量在类型声明里就是公开、有序、不可变的，编译器完全知道该按什么顺序取。既然它知道，就不必让你再抄一遍。

---

## 五、从上一话继续改代码：套娃拆包机

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

三行点号链换成一行 case，热销榜的价格分档也顺手落进 `when` 里了。

---

## 六、故意翻一次车：把宽分支挪到前面

上一话的支配性规则阿零已经吃过一次罚单了。他想知道换成解构模式之后，编译器还认不认这条规矩——于是故意把宽的那行挪到窄的前面：

```java
// 错误示例：宽在前，窄在后
case Order(Drink(String name, _), int q)                  -> "普通";  // 宽
case Order(Drink(String name, int price), int q)
    when price > 3000                                      -> "豪华";  // ← 永不可达
```

第一行的 `_` 对 price 不设任何条件，任何 `Order` 都会被它接走；第二行那个高价分支一辈子进不去。**买 45 元精品豆的顾客会被打上「普通」标签**——热销榜的豪华档从此永远是空的。

---

## 七、编译官罚单

> **📋 编译官罚单 · 解构照样查支配性**
>
> **编译器报错**（Java 25，实测）：
>
> ```
> error: 此 case 标签由前一个 case 标签支配
> ```
>
> 和上一话那张罚单是同一条规则：`_` 让分支变宽，宽的挡在前面，窄的就不可达。解构模式没有给这条规矩开后门。

---

## 八、修复并验证

**修复**：带 `when` 的窄分支放前面，宽的兜底放后面。

验证判据三条：

1. **顺序正确时编译通过**，四种输入各走各的分支。
2. **顺序写反时编译失败**，报错文本含「由前一个 case 标签支配」。
3. **`_` 不影响匹配结果**：宽分支用 `_` 丢掉 price，仍能正确接走 2000 分的日常豆。

正常路径实测输出（GraalVM 25.0.4）：

```
豪华: 精品豆×2
普通: 日常豆×5
散件: 特供豆
未知
```

四行全部命中预期分支：高价走豪华档，低价走普通档，散件 `Drink` 单独一档，非订单对象落进 `default`。

---

## 九、🔬 炉底显微镜 · 解构到底调了哪些 accessor

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

焰焰结语：你省下的那两把钥匙，一把都没消失——只是搬进了编译器手里。

---

## 十、⏳ 版本时光机 · 解构与 `_` 不是同一年到的

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

JDK 22 起 `_` 无需预览，JDK 25 两者均完全可用。这两个特性差了一个版本，网上不少写法把它们当成同一批到货——照抄旧攻略在 JDK 21 上就会撞到上面这行报错。

---

## 十一、`_` 未命名变量的三种用法

| 场景 | 示例 | 说明 |
|---|---|---|
| 解构忽略字段 | `case Order(Drink(String n, _), _)` | 不需要的分量不绑定 |
| try-catch 忽略异常 | `catch (Exception _)` | Java 22 起合法 |
| lambda 忽略参数 | `BiFunction<String,Integer,String> f = (s, _) -> s` | Java 22 起合法 |

同一作用域可以多次写 `_`，不会冲突（它不是变量名，不需要唯一）。

> [!坑] `_` 只能写，不能读。它不声明变量，所以后面没有任何办法再引用那个被忽略的值——如果发现自己想读它，说明当初就该给它起个名字。

---

## 十二、项目检查点 · 豆豆咖啡站 jvm-v0.5

- **已具备**：订单值不可偷改（v0.2）；菜单类型不可偷加（v0.3）；分拣分支漏写、顺序写反会被编译期拦住（v0.4）；嵌套订单一键全拆，不关心的分量交给 `_`，分量写错编译器当场点名（本话）。
- **还没有**：促销规则仍是硬编码，没有配置化；构造器里的参数校验还挤在 `super()` 之后，报错信息指不到真正传错参数的那个调用方。

阿零的变化：他上一话学会了「让编译器替我数分支」，这一话第一次意识到——**数据的形状也能交给编译器对齐**，手抄一遍点号链本来就是多余的一步。

---

## 十三、对应招聘技能

record 解构模式、嵌套模式与未命名变量、支配性推理、accessor 调用链与字节码阅读、数据导向编程入门、Java 版本演进边界表达。

---

## 十四、下一话悬念

拆包机跑顺了，阿零转头去调一个连接池初始化的 bug：传进来的 `port=0` 一路进到父类构造器才抛异常，异常栈指向父类代码，根本看不出是谁传了非法参数。他想在 `super()` 之前先把参数拦下来，编译器不让。

焰焰召唤出一道发黄的残影:「1995 年那条规矩是为了防止你在父对象还没建好之前就碰它——但它顺手把安检口也锁在了门里面。」下一话，**JEP 513 灵活构造器体**上场：先安检，再进门。

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

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*

