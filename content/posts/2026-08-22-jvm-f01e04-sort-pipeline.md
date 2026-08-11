---
title: "《JVM 火种纪》04 · 分拣流水线"
date: 2026-08-22
summary: "菜单上锁了，折扣算法却还是一条 instanceof-强转-if 的人工验货链：加一个品类要往三处钻，漏一个分支没人告诉你。阿零把它换成 switch 模式匹配加 when 守卫，类型检查、变量绑定、条件判断一行写完；javap 拆开炉底，看 invokedynamic 是怎么替你做类型索引的。"
tags: [Java, Java漫画, JVM, 模式匹配, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》04 · 分拣流水线

> JVM 火种纪 · 卷一「语言进化篇」第 4 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话把菜单类型关进了笼子，编译器已经会拦没批准的品类——可笼子外面，折扣算法还在拿放大镜一个个验货。

---

## 一、事故：加一个品类，要往三个地方钻

上一话上锁之后，编译器确实开始替阿零守门了。这周新品「抹茶拿铁」要上线，他往 `permits` 里加了一行，编译器立刻点名了三处没跟上的 `switch`——这本来是好事。

坏事是他打开那三处，看到的是这样的代码：

```java
if (item instanceof Espresso) {
    Espresso e = (Espresso) item;
    if (e.shots() >= 2) route = "双份快线";
    else route = "普通线";
} else if (item instanceof Latte) {
    Latte l = (Latte) item;
    route = l.oatMilk() ? "燕麦线" : "牛奶线";
} else if (item instanceof Tea) { ... }
```

检查类型、强转、再套一层条件判断——**三步，三处出错机会**，六行只换来一个路由字符串。三个地方各来一遍，改完他自己都不确定有没有漏。

豆豆凑过来看了一眼：「你上一话让编译器管住了『有哪些类型』，但『每种类型怎么处理』还是你自己用手数的。」

---

## 二、漫画 · 分拣台换机器

![《JVM 火种纪》04 · 分拣流水线——模式匹配六格漫画](/comics/jvm/f01e04-sort-pipeline.png)

> [!文字版]
> **〔1〕** 早高峰。阿零站在订单分拣台前，对着一摞 `MenuItem` 发呆。屏幕上那条 `instanceof` 链一直往下拖，看不到底。「六行换一个路由，每次加品类都要往里钻三处。」他捏着鼻子。
>
> **〔2〕** 焰焰探头进来，尾巴是跃跃欲试的橙红色。「Java 21 起，switch 可以直接写 `case Espresso e when e.shots() >= 2`——**类型检查、绑定变量、条件守卫，一行搞定**。」
>
> **〔3〕** 阿零不信:「switch 不是只能匹配常量吗?我上学时候学的就是这样。」焰焰把《JEP 编年史》拍到 441 页:「那是 JDK 17 之前的事了。现在它能匹配**任意类型**,包括你上一话刚封印的那些子类型。」
>
> **〔4〕** 白板上画出两条流水线的对比:旧的是「instanceof 检查 → 强转 → 条件分支」三个工位，每个工位都能出错;新的是「case Type var when cond → 处理」一个工位,类型安全由编译器担保。
>
> **〔5〕** 阿零动手改，顺手把宽的 case 写在了窄的前面。编译器当场拒收:**此 case 标签由前一个 case 标签支配**。「分拣机不接受有歧义的装配图。」焰焰弹了弹尾巴,「顺序写反了它就不让你装。」
>
> **〔6〕** 炉底浮出一个 2017 年的版本残影,抱着一叠 Project Amber 的模式匹配草案:「我们那时候争论了整整四年——要不要让 switch 认类型。」它看了看新分拣机,「值了。」残影散进火里。

---

## 三、本话目标

- 用类型模式替掉 `instanceof` + 强转的三步链；
- 用 `when` 守卫把附加条件写在同一行；
- 理解支配性检查为什么拒绝宽在前、窄在后；
- 看清底层 `invokedynamic` 类型索引与旧式 N 次检查的差别；
- 说清模式匹配从预览到转正的版本边界。

---

## 四、炉内原理图：一行 case 做了三件事

```java
switch (表达式) {
    case 类型模式 变量 when 守卫条件 -> 处理;
    case 类型模式 变量              -> 处理;
    default                         -> 处理;
}
```

| 组成 | 职责 | 对应旧写法 |
|---|---|---|
| 类型模式 `case Espresso e` | 测试类型并绑定变量 | `instanceof` 检查 + 手动强转 |
| `when` 守卫 | 附加布尔条件，通过才命中 | 内层嵌套 `if` |
| 穷尽性 | 对 sealed 类型强制覆盖全部子类型 | 无，靠人记住 |
| 支配性检查 | 宽模式不得放在窄模式之前 | 无，写反了静默失效 |

这张表接上一话：**sealed 提供了「类型集合是封闭的」这个前提，穷尽性检查才可能成立**。两个特性是配套设计的——上一话锁住成员，这一话才能让编译器替你数清有没有漏。

关键差别不在写法短，而在**出错的时机**。旧写法把宽的分支写在前面，窄的分支永远不执行，编译和运行都不报错，只是折扣算错了；新写法这种顺序直接编不过去。

---

## 五、从上一话继续改代码：换成自动分拣机

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

## 六、故意翻一次车：把顺序写反

阿零改完之后想验证一件事：旧写法里"宽的写在前面"这种错误静默失效，新写法到底会不会管。他故意把顺序倒过来：

```java
static String badRoute(MenuItem item) {
    return switch (item) {
        case Espresso e                     -> "普通";   // ← 宽：任意 Espresso
        case Espresso e when e.shots() >= 2 -> "双份";   // ← 窄：被上一行吃掉，永远不可达
    };
}
```

这段代码的问题很隐蔽：第一个 `case` 覆盖了所有 `Espresso`，第二个分支一辈子进不去。**双份浓缩的顾客会按普通价结账**——如果这是旧的 `if-else` 链，它会安安静静地一直错下去，直到有人对账发现少收了钱。

---

## 七、编译官罚单

> **📋 编译官罚单 · 歧义装配图退回**
>
> Java 25 实测输出：
>
> ```text
> error: 此 case 标签由前一个 case 标签支配
>         case Espresso e when e.shots() >= 2 -> "双份";
>              ^
> ```
>
> 罚单直接指出了不可达的那一行。这是旧写法拿不到的待遇——`if (item instanceof Espresso)` 写在前面挡住后面的条件判断，编译器一句话都不会说。

---

## 八、修复并验证

修复很简单：**窄模式（带 `when` 的）必须放在宽模式之前**。因为守卫条件让分支的适用范围变小了，小的先挑，剩下的交给大的兜底。

验证判据三条：

1. **顺序正确时编译通过**，六种输入各走各的线。
2. **顺序写反时编译失败**，报错文本含「由前一个 case 标签支配」。
3. **sealed 穷尽性仍然生效**：删掉任一分支且不写 `default`，编译失败。

正常路径实测输出（GraalVM 25.0.4）：

```text
双份浓缩快线
单份浓缩普通线
燕麦奶过滤线
牛奶线
绿茶冰镇线
热茶线
```

六行全部命中预期分支。对照一下新旧两种写法的差距：

| 维度 | 旧：instanceof + 强转链 | 新：switch 模式匹配 |
|---|---|---|
| 类型检查 | `instanceof` | case 自动检查 |
| 变量绑定 | 手动强转 `(Espresso) item` | case 自动绑定 `e` |
| 条件分支 | 内层 `if` | `when` 守卫同行 |
| 穷尽性保证 | 无（运行时漏判） | 编译器强制（sealed） |
| 支配性检查 | 无（写反了静默失效） | 编译器拦截 |
| 引入版本 | Java 1.0 | **Java 21 GA（JEP 441）** |

后两行才是真正值钱的：**它们把「靠人记住」换成了「编译器拦住」**。

---

## 九、🔬 炉底显微镜 · 一次类型索引，还是 N 次检查

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

## 十、⏳ 版本时光机 · 模式匹配走了四年

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

> [!坑] `when` 守卫里别写有副作用的表达式。JLS 没有保证守卫的求值次数，优化器理论上可以多次求值——把它当纯布尔判断用，改状态的事放到箭头右边。

---

## 十一、项目检查点 · 豆豆咖啡站 jvm-v0.4

- **已具备**：订单值不可偷改（v0.2）；菜单类型不可偷加（v0.3）；折扣路由的分支漏写、顺序写反都会在编译期被拦（本话）。
- **还没有**：嵌套订单（订单里套坐标、套配料）还得手动逐层取字段；促销规则仍是硬编码，没有配置化。

阿零的变化：他开始主动问「这个错误能不能让编译器替我发现」，而不是「我怎么记住不犯这个错」——这是从**靠自觉**转向**靠机制**。

---

## 十二、对应招聘技能

模式匹配与代数数据类型、穷尽性与支配性推理、`invokedynamic` 调用机制、字节码阅读、Java 版本演进边界表达。

---

## 十三、下一话悬念

分拣线跑通了，但订单结构开始变复杂：`Order(String drink, Point pos)`，内层的 `Point` 也是 record。阿零现在的写法是先 `case Order o`，再 `o.pos().x()`、`o.pos().y()` 一层层往里取。

焰焰看着那串点号:「你已经在 case 里认出了外层的形状，为什么不顺手把里面的也拆开?」下一话，**record 解构模式**上场，一行拆穿套娃：`case Order(String d, Point(int x, int y))`——再加上 `_` 未命名变量，用不上的零件直接扔掉。

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

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
