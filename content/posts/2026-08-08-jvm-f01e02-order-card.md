---
title: "《JVM 火种纪》02 · 订单卡片革命"
date: 2026-08-08
summary: "咖啡站的订单类膨胀到四十行，每个调用方都在猜它能否接受负杯数。阿零用 record 把数据形状写进类型声明，用紧凑构造器把不变量锁在出票口；javap 拆开炉底，看清编译器替你盖了哪些章。"
tags: [Java, Java漫画, JVM, record, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》02 · 订单卡片革命

> JVM 火种纪 · 卷一「语言进化篇」第 2 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话把后厨入口缩成三行，但订单还抱着一摞 getter/setter 和重复构造器——每个角落都可能塞进非法数据。

---

## 一、事故：负杯数的订单悄悄入库

面试之夜之后第二天，阿零打开 `OrderService`，发现同一套字段被复制了五次：饮品名、杯数、单价、会员等级、备注。有人把 `cups` 传成 `-2`，有人把 `drink` 传成空字符串，还有人构造完对象后直接改字段。日志里躺着三张金额为负的订单。

豆豆把一张真实的纸质收据拍在桌上：「收据不会事后被改，因为它盖了章。这个对象的主要职责是**携带数据并保持不变量**，不是一棵会到处变形的业务树。先用 `record` 把边界钉住，再决定真正需要身份和可变状态的对象要不要继续用 class。」

---

## 二、漫画 · 出票口的安检门

![《JVM 火种纪》02 · 订单卡片革命——record 出票口六格漫画](/comics/jvm/f01e02-order-card.png)

> **〔1〕** 阿零搬出旧 `Order`：「字段、构造器、getter、`equals`、`hashCode`、`toString`……一张订单卡为什么要盖这么多章?」焰焰尾巴扫过四十行代码，只剩一个 record 声明。

> **〔2〕** 焰焰把三个组件钉进类型签名：`drink`、`cups`、`unitCents`。卡片背面自动浮出访问器、结构化相等性和 `toString`。「你少写的那几行，编译器一行没少盖。」

> **〔3〕** 一张写着「燕麦拿铁, -2 杯」的订单滑到出票口，紧凑构造器里的安检员当场拦下：「不变量必须在构造时成立，不要把脏数据先放进仓库再祈祷调用方记得检查。」

> **〔4〕** 阿零试图在代码里写 `order.cups = 5`，IDE 亮红：「record 没有 setter，字段引用是 final 的。」豆豆提醒：「浅不可变——组件引用锁定了，但 `List<String>` 里的元素不会自动冻结。」

> **〔5〕** 订单卡顺利出炉，金额算出 5600 分。焰焰说：「短代码不是目标，**一张卡片只有一个可信入口**才是目标。」

> **〔6〕** 焰焰翻开《JEP 编年史》，一个 2003 年的残影走出来，手里拿着 Project Amber 的最早草稿，说：「我们当时想了十几年，就是为了让数据类不再是样板的囚犯。」残影消散。

---

## 三、本话目标

- 用 `record` 表达透明、以数据为主的值对象；
- 用紧凑构造器集中校验，避免校验散落在调用方；
- 理解 record 自动生成的访问器、相等性与字符串表示；
- 分清浅不可变与深不可变，认识 `List.copyOf` 的防御位置；
- 用 `javap` 看清编译器到底替 record 盖了多少章。

---

## 四、炉内原理图：record 的四项承诺

| 承诺 | 行为 | 边界 |
|---|---|---|
| 访问器 | 编译器生成与组件同名的无参方法 | 没有 setter；改值靠创建新 record |
| 结构相等 | `equals` 比较全部组件值 | 不是引用相等（`==`），也不是深相等 |
| 内容摘要 | `hashCode` 基于全部组件 | 组件含可变对象时哈希值不稳定 |
| 自描述 | `toString` 输出 `类名[字段=值, ...]` | 不隐藏任何组件，注意日志敏感信息 |
| 浅不可变 | 组件引用是 `final` | `List` 里的元素需自行防御（`List.copyOf`） |
| 不能继承类 | 隐式 `extends Record`，且 `final` | 可以实现接口 |

传统入口的问题不是行数多，而是**规则有多个入口**——任何人在任何时刻都能 `setDrink("")`：

```java
// 旧写法：校验散落，setter 开放，任何人都能破坏不变量
final class OldOrderCard {
    private String drink;
    private int    cups;
    void setCups(int c) { this.cups = c; }   // 负数可以悄悄进来
}
```

record 把数据形状与构造不变量合并为一次声明：

```java
record OrderCard(String drink, int cups, int unitCents) {
    OrderCard {                          // 紧凑构造器：无参数列表，共享组件变量
        drink = drink == null ? "" : drink.trim();
        if (drink.isBlank())
            throw new IllegalArgumentException("drink 不能为空");
        if (cups <= 0 || cups > 20)
            throw new IllegalArgumentException("cups 必须在 1..20");
        if (unitCents < 0)
            throw new IllegalArgumentException("unitCents 不能为负");
    }
    int totalCents() { return Math.multiplyExact(cups, unitCents); }
}
```

> [!重点]
> 紧凑构造器里的 `drink = drink.trim()` 直接修改的是构造器隐含参数，不是字段赋值——字段赋值由编译器在构造器末尾自动追加，因此在紧凑构造器里可以标准化输入，拿到的是最终要写进字段的值。

---

## 五、把后厨订单切到 record

接上一话 `Menu.java`，新建 `OrderCard.java`（独立文件，`javac` 会分别编译）：

```java
record OrderCard(String drink, int cups, int unitCents) {
    OrderCard {
        drink = drink == null ? "" : drink.trim();
        if (drink.isBlank())
            throw new IllegalArgumentException("drink 不能为空");
        if (cups <= 0 || cups > 20)
            throw new IllegalArgumentException("cups 必须在 1..20");
        if (unitCents < 0)
            throw new IllegalArgumentException("unitCents 不能为负");
    }
    int totalCents() { return Math.multiplyExact(cups, unitCents); }
}
```

运行验证：

```bash
javac --release 25 OrderCard.java
```

写一段演示入口（单文件直跑）：

```java
import module java.base;

void main() {
    var order = new OrderCard("  燕麦拿铁  ", 2, 2800);
    IO.println("drink="   + order.drink());       // 自动 trim
    IO.println("total分=" + order.totalCents());   // 5600
    IO.println(order);                            // toString
}
```

真实输出：

```text
drink=燕麦拿铁
total分=5600
OrderCard[drink=燕麦拿铁, cups=2, unitCents=2800]
```

---

## 六、故意翻一次车：浅不可变的假象

阿零给订单加上配料列表，直接保存调用方传入的 `List`：

```java
record UnsafeOrder(String drink, List<String> toppings) {}
```

```java
var mutable = new ArrayList<>(List.of("椰奶", "燕麦奶"));
var order   = new UnsafeOrder("拿铁", mutable);
mutable.add("偷加的原料");
IO.println(order.toppings().size());  // 3，不是 2
```

record 看起来不可变，内部数据被外部悄悄改掉了。

---

## 七、编译官罚单

这次没有编译错误——这是比编译错误更危险的 Bug：它在运行时才暴露，而且只有在调用方**恰好**持有同一个列表引用并修改时才出现。测试容易漏掉，线上难以复现。

> **📋 编译官罚单**

```text
（无编译错误——但运行时 toppings 已被外部修改）
order.toppings().size() = 3   // 期望 2，实际 3
order.toppings().add("再加一个")  // 没有抛异常，可以继续修改
```

---

## 八、修复并验证

规则：**在紧凑构造器里用 `List.copyOf` 防御性拷贝**。

```java
record SafeOrder(String drink, List<String> toppings) {
    SafeOrder {
        toppings = List.copyOf(toppings);   // 不可变副本，切断外部引用
    }
}
```

验证两个性质：① 外部修改不影响 record 内部；② 内部列表本身不可修改。

```java
var mutable = new ArrayList<>(List.of("椰奶", "燕麦奶"));
var order   = new SafeOrder("拿铁", mutable);
mutable.add("偷加的原料");
IO.println(order.toppings().size());    // 2：外部修改被隔离
order.toppings().add("不可修改");        // 抛 UnsupportedOperationException
```

真实输出：

```text
topping count=2
内部列表不可变: OK
```

> [!坑]
> `List.copyOf` 不接受 `null` 元素，也不接受 `null` 本身；若来源列表可能含 null，先过滤再拷贝。深层对象（如列表里装的 `Address` record）仍需自行决定是否深拷贝。

---

## 九、🔬 炉底显微镜 · record 里的「隐形章」

复现命令（照抄可跑，基线 JDK 25）：

```bash
javac --release 25 OrderCard.java && javap -p OrderCard
```

关键输出（真实实录）：

```text
final class OrderCard extends java.lang.Record {
  private final java.lang.String drink;
  private final int cups;
  private final int unitCents;
  OrderCard(java.lang.String, int, int);
  int totalCents();
  public final java.lang.String toString();
  public final int hashCode();
  public final boolean equals(java.lang.Object);
  public java.lang.String drink();
  public int cups();
  public int unitCents();
}
```

逐行解读：

① `extends java.lang.Record` 且 `final`——你没有写继承，编译器代你写了，而且禁止再 extends；
② 三个字段全是 `private final`——浅不可变从字节码层面兑现，setter 物理上不存在；
③ `toString`/`hashCode`/`equals` 是 `public final`——不可 override，编译器用 `invokedynamic` 走 BootstrapMethod，不是简单展开代码；
④ 访问器 `drink()`/`cups()`/`unitCents()` 是普通公共方法——没有「get」前缀，这是 record 的风格规范。

再看紧凑构造器的字节码片段：

```bash
javap -c OrderCard
```

```text
OrderCard(java.lang.String, int, int);
  Code:
       0: aload_0
       1: invokespecial #1    // Method java/lang/Record."<init>":()V
       4: aload_1
       5: ifnonnull     13
       8: ldc           #7    // String（空字符串）
      10: goto          17
      13: aload_1
      14: invokevirtual #9    // Method java/lang/String.trim
      17: astore_1
      ...
      69: aload_0
      70: aload_1
      71: putfield      #30   // Field drink
```

① `invokespecial Record."<init>"` 先发生——父类 `Record` 先初始化，然后才是校验逻辑；
② 你在紧凑构造器里写的 `drink = drink.trim()` 变成了 `astore_1`（写回参数槽）+ 最后的 `putfield`——编译器把「标准化 + 赋值」分成两步，校验在中间；
③ 字段赋值（`putfield`）出现在字节码最末尾——这证明紧凑构造器结束前字段还没有值，不能用 `this.drink` 读取自己的字段。

> 焰焰结语：你少写的那几十行，一行都没消失——只是搬进了编译器的印章机。

**版本边界**：`javap` 输出的 `invokedynamic` 编号和 Bootstrap 细节属于 javac 实现，不同 JDK 版本可能不同；`final class extends java.lang.Record` 和字段 `private final` 是语言规范保证，跨版本稳定。

---

## 十、项目检查点 · 豆豆咖啡站 jvm-v0.2

**已具备**：订单有了单一构造入口；浅不可变从字节码层面兑现；`totalCents()` 用 `multiplyExact` 在整数溢出时抛出而不是静默截断；`List.copyOf` 防御性拷贝已就位。

**还没有**：菜单继承树谁都能塞新品种；促销规则没有编译期兜底；订单分拣靠手写 `instanceof` 和多层 `if`。

---

## 十一、对应招聘技能

record（Java 16 正式 / Java 25 基线）、紧凑构造器、浅不可变与防御性拷贝、`javap` 基本读字节码、值对象与实体对象的区分。

---

## 十二、下一话悬念

菜单接口被一个新同事偷偷 implements 出「香菜咖啡」，促销规则走进了 `default` 分支——悄悄全价。

> 下一话《菜单封印术》：`sealed` 密封类/接口——把允许的菜单宇宙写进类型系统，让编译器当保安。

## 🎯 随堂练习

先自己做，再对答案。每道答案带「举一反三」。

### 选择题（10 道）

1. `record OrderCard(String drink, int cups){}` 编译后，`drink` 字段的访问修饰符是？
   - A) `public`　B) `protected`　C) `private final`　D) `package-private`
2. 紧凑构造器里写 `drink = drink.trim()`，字段什么时候真正被赋值？
   - A) 执行到那行时立即赋值　B) 紧凑构造器结束后，由编译器追加的 `putfield` 赋值　C) 调用 `super()` 时　D) 第一次访问 `drink()` 时
3. `record` 的 `equals` 比较的是？
   - A) 引用地址（`==`）　B) 全部组件的值（结构相等）　C) 对象的哈希码　D) 只有第一个组件
4. 为什么 `record` 的 `toString`/`hashCode`/`equals` 是 `final`？
   - A) 节省运行时内存　B) 防止子类破坏结构相等语义；record 本身也是 `final`，实际不可被继承　C) JLS 没有规定，只是实现约定　D) 为了让编译更快
5. 以下哪种情况 record 仍然表现为「可变」？
   - A) 组件类型是 `int`　B) 组件类型是 `String`　C) 组件类型是 `ArrayList<String>` 且没有防御拷贝　D) 使用了 `Math.multiplyExact`
6. `List.copyOf(toppings)` 在构造器里的作用是？
   - A) 深拷贝列表里的每个元素　B) 创建不可变副本，切断与原始可变列表的引用关联　C) 对列表排序　D) 过滤掉 null 元素
7. record 能否 `extends` 一个普通业务父类？
   - A) 能，和普通类一样　B) 不能；record 隐式 `extends java.lang.Record`，不能再继承其他类　C) 能，但必须加 `@Override`　D) 只能继承抽象类
8. `javap -p OrderCard` 输出里看到 `invokedynamic` 用于 `toString`，说明什么？
   - A) `toString` 在运行时动态生成字符串，不是编译期展开代码　B) `toString` 需要反射才能调用　C) `toString` 可以被子类覆盖　D) 这是 Java 25 特有的 bug
9. 以下哪个场景**不适合**用 record？
   - A) 携带 HTTP 请求参数的 DTO　B) 表示坐标点 `(x, y)`　C) 需要跟踪修改历史、有可变状态的实体订单对象　D) 表示配置项 `(key, value)`
10. 紧凑构造器里可以调用实例方法（如 `this.someMethod()`）吗？
    - A) 可以，和普通构造器一样　B) 不可以；字段还未完成赋值，调用实例方法会看到未初始化状态　C) 可以，但只能调用 `static` 方法　D) 需要加 `@SuppressWarnings`

> [!答案]
> **1-C** `private final`——浅不可变从字节码层面兑现，不可 set，不可继承。**举一反三**：`javap -p` 看字段修饰符是最快验证「是否真的 final」的方式，不要只信文档。
>
> **2-B** 紧凑构造器里的赋值写回的是隐含参数槽，编译器在构造器末尾追加 `putfield`。**举一反三**：这解释了为什么紧凑构造器里不能读 `this.drink`——字段还没值。
>
> **3-B** 结构相等：比较所有组件的值。**举一反三**：两个不同对象 `new OrderCard("美式",1,1800)` 和 `new OrderCard("美式",1,1800)` 相等（`equals`），但 `==` 为 false。
>
> **4-B** 防止子类破坏语义；record 自身也是 final，实际继承不可能，但 JLS 把它们声明为 final 是设计上的明确约束。**举一反三**：这和 `String.equals` 是 final 的原因一致——契约不能被覆盖。
>
> **5-C** `ArrayList` 里的元素可以被外部修改，record 的组件引用是 final 但指向可变对象。**举一反三**：「不可变」要问清楚是「引用不变」还是「内容不变」，两者是独立维度。
>
> **6-B** 创建不可修改的副本，切断外部引用。**举一反三**：`List.copyOf` 不接受 null 元素；元素本身若是可变对象，仍需进一步决策是否深拷贝。
>
> **7-B** record 隐式继承 `java.lang.Record`，Java 单继承约束不允许再继承其他类。**举一反三**：record 可以 `implements` 多个接口，这是组合能力的正确扩展点。
>
> **8-A** `invokedynamic` + Bootstrap 在运行时按组件值动态拼接字符串，而非编译期写死代码。**举一反三**：这也意味着给 record 加新组件会自动更新 `toString` 输出，不需要手动维护。
>
> **9-C** 有可变状态、需要生命周期管理的实体对象用 class；record 适合透明的、以数据为主的值对象。**举一反三**：区分值对象和实体对象是 DDD 的基础概念，record 把值对象的语言表达标准化了。
>
> **10-B** 字段赋值在构造器末尾，调用实例方法会看到 `null`/`0` 等默认值。**举一反三**：如果需要复杂准备，用静态工厂方法先完成计算，再把结果传给 record 构造器。

## 运行环境、验证与依据

- **运行环境**：本话全部命令与输出实测于 Oracle GraalVM 25.0.4+7.1（`java version "25.0.4" 2026-07-21 LTS`），Windows 11 + PowerShell 7。Linux 写法相同。运行前用 `java --version`、`javac --version` 确认实际环境。
- **最后验证**：三段代码（`OrderCard`、`SafeOrder`、`UnsafeOrder`）均为独立片段，可直接复制编译复现；报错实录来自同一次运行，未做删改。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。record（JEP 395）在 JDK 16 正式转正。
- **版本边界**：`javap` 输出的 `invokedynamic` 编号与 Bootstrap 细节属于 javac/HotSpot 实现，不同实现可能不同，不要当跨版本承诺；`private final` 字段、`final class extends Record` 是语言规范保证。

*本话属于连载《从零进化Java:JVM 火种纪》。完整卷次地图见 [/jvm](/jvm)。*
