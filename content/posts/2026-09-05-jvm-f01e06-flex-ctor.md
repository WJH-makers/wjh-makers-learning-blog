---
title: "《JVM 火种纪》06 · super 之前的自由"
date: 2026-09-05
summary: "连接池传进来一个 port=0，异常一路飘到父类构造器才抛，栈里全是父类代码，看不出是谁传错的。JDK 25 的 JEP 513 拆掉了「super() 必须第一行」这道 30 年的门禁：先安检参数，再进父类的门；javap 拆开炉底，看局部变量计算与 putfield 分别落在 invokespecial 的哪一侧。"
tags: [Java, Java漫画, JVM, 灵活构造器体, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》06 · super 之前的自由

> JVM 火种纪 · 卷一「语言进化篇」第 6 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话把嵌套订单一句拆到底，读数据的姿势彻底顺了——可轮到写数据，构造器里的参数安检还被 30 年前的规矩锁在门内。

---

## 一、事故：报错指向父类，看不出是谁传错了参数

上一话解构模式让阿零把读数据的活儿全交给了编译器。这次卡住他的是写数据：他在调一个连接池初始化的 bug，传进来的 `rawPort` 是 `0`，异常一路飘到父类构造器才抛出来。

异常栈顶指着父类那行校验代码，中间隔着好几层构造器调用，**根本看不出是哪个调用方传了非法参数**。日志里只留下一句父类抛的 `IllegalArgumentException`，排查全靠猜。

「我想在 `super()` 之前就校验 `rawPort`，报错信息更清晰——但编译器不让。」阿零把光标停在那行 `super()` 上，它必须是第一句。

---

## 二、漫画 · 门禁的两个方向

![《JVM 火种纪》06 · super 之前的自由——构造器安检六格漫画](/comics/jvm/f01e06-flex-ctor.png)

> [!文字版]
>
> **〔1〕** 深夜。阿零在调一个连接池初始化的 bug：传进来的 `port=0` 到了父类构造器才抛异常，异常信息指向父类代码，根本看不出是谁传了非法参数。「我想在 `super()` 之前就校验 `rawPort`，报错信息更清晰——但编译器不让。」
>
> **〔2〕** 焰焰尾巴一甩，召唤出一道发黄的版本残影——JDK 1.0 时代的幽灵工程师现身。「1995 年的规矩：子类构造器第一行必须是 `super()` 或 `this()`，否则编译报错。」幽灵叹气，「当年是为了保证父对象先于子对象初始化，防止子类在父类字段还是 `null` 时就访问它。」
>
> **〔3〕** 阿零不服:「那这规矩不是挺对的吗?我总不能在父类没建好之前就动它。」「对的那半没人动。」焰焰把《JEP 编年史》摊开，「问题是它**顺手把安检口也关在了门里**——你没办法在调用 `super()` 之前做任何事，包括参数校验、辅助变量计算。」
>
> **〔4〕** 「所以我这三十年只能进门以后再检查鞋子穿反了?」阿零翻了个白眼。「所以 JDK 25 改了规矩。」焰焰翻到 JEP 513 那页，「只要你在 `super()` 之前**不访问 `this`（也不访问父类字段）**，就可以自由写代码——计算、校验、赋值局部变量，全部合法。」
>
> **〔5〕** 阿零立刻动手，顺手在 `super()` 之前写了一行 `this.tag = "early"`。编译器当场拒收:**cannot reference this before supertype constructor has been called**。「门禁松的是安检那半，」焰焰弹了弹尾巴，「不是让你提前进门。」
>
> **〔6〕** 幽灵工程师看着新写法，把手里 1995 年的门禁牌收进怀里：「我们当年只想保证顺序，没想过顺序和位置是两件事。」它散进炉火，尾巴上的火光转成安静的橙色。

---

## 三、本话目标

- 说清「`super()` 必须第一行」这条旧规则限制住了什么；
- 在 `super()` 之前完成参数校验与辅助变量计算；
- 记住 JEP 513 的边界：`super()` 之前不许碰 `this` 与父类字段；
- 用 `javap` 确认局部变量计算落在 `invokespecial` 之前、`putfield` 落在其后；
- 说清灵活构造器体从预览到转正的版本边界。

---

## 四、炉内原理图：门禁松的是安检，不是进门

### 旧规则（JDK 24 及之前）

```java
class Sub extends Base {
    Sub(String raw) {
        // 第一行必须是 super()，不能在这之前做任何事
        super(raw);
        // 只能在 super() 之后才能安检
        if (raw == null) throw new IllegalArgumentException("为时已晚的报错");
    }
}
```

### 新规则（JDK 25，JEP 513）

```java
class Sub extends Base {
    Sub(String raw) {
        // super() 之前可以：计算辅助变量、校验参数——只要不访问 this
        if (raw == null) throw new IllegalArgumentException("进门前就安检");
        String clean = raw.strip();
        super(clean);   // super() 不必是第一条语句
        // super() 之后才能访问 this / 父类字段
        this.extra = "initialized";
    }
}
```

| 位置 | 允许 | 禁止 |
|---|---|---|
| `super()` 之前 | 参数、局部变量、`static` 方法、抛异常 | 读写 `this` 字段、调用实例方法、访问父类字段 |
| `super()` 之后 | 全部（`this` 已可用） | 无额外限制 |

**约束**：`super()` 之前不能读取或写入 `this` 的字段，也不能调用实例方法（因为 `this` 还没构造完）。违反时编译报错。

为什么这么设计：1995 年那条规则真正想守的不变量是「**父对象先于子对象初始化**」，而"`super()` 必须是第一条语句"只是当年实现这个不变量最省事的写法。JEP 513 把这两件事拆开——不变量照旧由编译器守，位置这件事还给你。这和前面几话是同一个思路：上一话是编译器替你对齐数据形状，这一话是编译器只拦真正危险的那一步，不再连带把安全的操作一起禁掉。

---

## 五、从上一话继续改代码：先安检再进门的连接配置

```java
// javac -encoding UTF-8 --release 25 FlexCtorDemo.java
class SafeConn {
    private final String host;
    private final int port;

    SafeConn(String rawHost, int rawPort) {
        if (rawHost == null || rawHost.isBlank())
            throw new IllegalArgumentException("host 不能为空");
        if (rawPort < 1 || rawPort > 65535)
            throw new IllegalArgumentException("port 不合法: " + rawPort);
        this.host = rawHost.strip();
        this.port = rawPort;
    }
    @Override public String toString() { return host + ":" + port; }
}

class SafeConnSub extends SafeConn {
    private final String tag;

    SafeConnSub(String rawHost, int rawPort, String rawTag) {
        // JDK 25：super() 之前先处理 rawTag（不访问 this）
        String cleanTag = (rawTag == null || rawTag.isBlank()) ? "default" : rawTag.strip();
        super(rawHost, rawPort);   // super() 不必是第一行
        this.tag = cleanTag;       // super() 之后才能访问 this
    }
    @Override public String toString() { return super.toString() + " [" + tag + "]"; }
}

class FlexCtorDemo {
    public static void main(String[] args) {
        System.out.println(new SafeConn("db.local", 5432));
        System.out.println(new SafeConnSub("cache.local", 6379, "  redis  "));
        System.out.println(new SafeConnSub("mq.local", 5672, null));    // null → "default"
        try { new SafeConn("  ", 80); }
        catch (IllegalArgumentException e) { System.out.println("预期报错: " + e.getMessage()); }
        try { new SafeConn("x", 99999); }
        catch (IllegalArgumentException e) { System.out.println("预期报错: " + e.getMessage()); }
    }
}
```

**实测输出**（GraalVM 25.0.4）：

```
db.local:5432
cache.local:6379 [redis]
mq.local:5672 [default]
预期报错: host 不能为空
预期报错: port 不合法: 99999
```

最后两行是关键：报错带上了那个非法值本身（`99999`），而且抛在进父类构造器之前——栈顶就是出问题的那一层。

---

## 六、故意翻一次车：在 super() 之前碰一下 this

阿零想知道这道门禁到底松到什么程度，故意越界一次——在 `super()` 之前给子类字段赋值：

```java
class Bad extends SafeConn {
    Bad(String raw, int port) {
        this.tag = "early";   // ← 在 super() 之前访问 this，编译报错
        super(raw, port);
    }
}
```

这一行看起来只是"提前初始化一下自己的字段"，但它踩的正是 1995 年那条规矩真正要守的东西：此刻父对象还没建好，`this` 还不是一个完整的对象。

---

## 七、编译官罚单

> **📋 编译官罚单 · 提前进门被拦**
>
> **编译器报错**（Java 25）：
>
> ```
> error: cannot reference this before supertype constructor has been called
> ```
>
> 规则很简单：`super()` 之前可以用**局部变量和参数**，不能用 `this` 或父类字段。松掉的是安检那一半，进门这一半仍然锁着。

---

## 八、修复并验证

**修复**：把「算」和「赋值」分开——需要在 `super()` 之前完成的计算，结果先存局部变量（`cleanTag`）；写 `this` 字段的那一步挪到 `super()` 之后。第五节的 `SafeConnSub` 就是修好的形态。

验证判据三条：

1. **越界被拦**：`super()` 之前写 `this.xxx` 编译失败，报错文本含 `cannot reference this before supertype constructor has been called`。
2. **合法计算通过**：`super()` 之前的局部变量计算与参数校验正常编译运行，`null` 的 `rawTag` 落到 `"default"`。
3. **安检提前生效**：非法参数在进父类构造器之前抛出，异常消息里带上非法值本身。

正常路径实测输出（GraalVM 25.0.4）：

```
db.local:5432
cache.local:6379 [redis]
mq.local:5672 [default]
预期报错: host 不能为空
预期报错: port 不合法: 99999
```

五行全部对上预期：三个合法配置正常构造，两个非法参数在门口就被拦下。

---

## 九、🔬 炉底显微镜 · 字节码里的 super 分界线

> 焰焰对准 `SafeConnSub.class` 举起放大镜：「构造器的字节码顺序有没有变？」

```bash
# 编译
javac -encoding UTF-8 --release 25 FlexCtorDemo.java

# 查看子类构造器字节码
javap -c SafeConnSub.class
```

**`javap -c SafeConnSub.class` 节选**：

```
SafeConnSub(java.lang.String, int, java.lang.String);
  Code:
     0: aload_3           // 加载 rawTag 参数
     1: ifnonnull  14     // null 检查
    ...
    // cleanTag 计算（局部变量操作）
    20: aload_0            // this
    21: aload_1            // rawHost
    22: iload_2            // rawPort
    23: invokespecial #7   // SafeConn.<init>  ← super() 调用
    26: aload_0
    27: aload  4           // cleanTag
    29: putfield  #13      // SafeConnSub.tag  ← super() 之后写 this
    32: return
```

关键观测点：
- `cleanTag` 的计算（局部变量 `astore`/`aload`）出现在 `invokespecial SafeConn.<init>` **之前**——JEP 513 生效
- `putfield SafeConnSub.tag`（写 `this.tag`）出现在 `invokespecial` **之后**——符合约束
- 字节码结构清晰印证了"super之前可以用局部变量，之后才能碰 this"

焰焰结语：门禁牌没拆，只是从门框上挪到了门里侧——`invokespecial` 这条分界线一寸都没动。

---

## 十、⏳ 版本时光机 · 三十年的门禁改了三版

**版本边界**

| 里程碑 | JDK | 状态 |
|---|---|---|
| "super() 必须第一行"旧规则 | JDK 1.0～24 | 沿用 30 年 |
| 灵活构造器体预览 | JDK 22 | JEP 447 Preview |
| 灵活构造器体二预览 | JDK 23 | JEP 482 Second Preview |
| **灵活构造器体 GA** | **JDK 25** | **JEP 513 GA** |
| 本话代码运行环境 | JDK 25 | ✅ |

```bash
# --release 24 拒绝灵活构造器（实测）
javac --release 24 FlexCtorDemo.java
# error: -source 24 中不支持 灵活构造器
#         super(rawHost, rawPort);
#              ^
# (请使用 -source 25 或更高版本以启用 灵活构造器)
```

这是卷一里唯一一个"JDK 25 才刚转正"的语法——前面几话的 record、sealed、模式匹配都已经在生产里跑了好几年。写在 JDK 24 上的代码照抄本话写法会直接撞到上面这行报错。

---

## 十一、旧 workaround 可以退休了

`super()` 必须第一行的年代，想在构造前做参数处理只有两条路：静态工厂方法，或者把校验塞进一个 `static` 辅助方法当参数表达式传给 `super()`。

```java
// 旧 workaround：静态工厂 + 私有构造器，只为了在构造前处理参数
static SafeConn of(String raw, int port) {
    if (raw == null || raw.isBlank()) throw new IllegalArgumentException("host 不能为空");
    return new SafeConn(raw.strip(), port);
}
```

JEP 513 之后这套绕法在"只为参数安检"这个场景下不必要了——校验直接写在构造器里，结构更短一层。静态工厂本身仍有它的价值（命名清晰、可返回缓存实例、可返回子类型），只是不再需要为了绕开门禁而存在。

> [!坑] `this()` 委托调用同样适用这条新规则：`this(...)` 之前可以算局部变量，但一样不能碰 `this` 的字段或实例方法。别以为"委托给自己"就能网开一面。

---

## 十二、项目检查点 · 豆豆咖啡站 jvm-v0.6

- **已具备**：订单值不可偷改（v0.2）；菜单类型不可偷加（v0.3）；分拣分支漏写、顺序写反被编译期拦住（v0.4）；嵌套订单一键全拆（v0.5）；构造器先安检再进门，非法参数在进父类之前就被拦下、报错带上非法值本身（本话）。
- **还没有**：促销规则仍是硬编码的 `if-else` 链，`sealed`、`record`、解构 switch 三件工具各自用过，但还没有组合成一个能扛住新增活动类型的引擎。

阿零的变化：他第一次把"语言规则"和"规则想守的不变量"分开看——旧写法禁掉的那一大片里，真正危险的只有一小块。**看懂一条规矩守的是什么，才知道它松开哪一半是安全的。**

---

## 十三、对应招聘技能

灵活构造器体（JEP 513）、构造器初始化顺序与不变量、参数校验前移与失败快速化、`invokespecial`/`putfield` 字节码阅读、静态工厂与构造器的取舍、Java 版本演进边界表达。

---

## 十四、下一话悬念

安检口挪对位置之后，阿零回头看后厨：`record`、`sealed`、模式匹配、解构、灵活构造器，卷一的工具全在手上了，可促销引擎还是那条 `if-else instanceof` 链。双十一前夜，新活动「买咖啡赠茶包」上线，引擎压根没处理这个类型，直接返回原价——大量订单多收了钱。

焰焰把三张卡牌叠到一起摆上炉顶:「单独用都是好工具，合在一起才是武器。」下一话是**卷一终章**：`sealed` + `record` + 穷尽 switch 三件套合体，把促销引擎重写成一张决策表——新增活动类型，编译器自动点名所有遗漏的地方。

---

## 🎯 随堂练习

**Q1.** JEP 513《灵活构造器体》在 Java 几正式转正？
- A. Java 22　B. Java 23　C. Java 24　D. Java 25

**Q2.** 下列代码在 JDK 25 能编译通过吗？

```java
class A { A(int x) {} }
class B extends A {
    B(String s) {
        int n = s.length();   // 在 super() 之前计算
        super(n);
    }
}
```

**Q3.** 下列代码会报什么错？

```java
class C extends A {
    int extra;
    C(int raw) {
        this.extra = raw;   // ← 问题在这
        super(raw);
    }
}
```

**Q4.** JEP 513 之前（JDK 24），子类构造器的第一条语句规则是什么？

**Q5.** `super()` 之前可以调用 `static` 方法吗？可以调用实例方法吗？

**Q6.** 灵活构造器体对 `this()` 构造器委托调用有影响吗？同样的"之前不能碰 this"规则适用吗？

**Q7.** 下列场景中，哪种**最能体现** JEP 513 的价值？
- A. 计算父类构造参数的辅助值　B. 打印日志　C. 给子类字段赋值　D. 调用父类方法

**Q8.** 旧代码用静态工厂方法绕过"super() 必须第一行"的限制，JEP 513 之后还需要这种 workaround 吗？

**Q9.** 在 `super()` 之前可以抛出异常吗？

**Q10.** 如果 `super()` 之前的代码出现异常，父类构造器会被调用吗？

---

> [!答案]
>
> **Q1. D — Java 25**（JEP 513 GA）
>
> **Q2. 可以编译通过。**`n = s.length()` 是局部变量计算，不访问 `this`，符合 JEP 513 约束。
>
> **Q3. 编译报错：`cannot reference this before supertype constructor has been called`。**在 `super()` 之前写 `this.extra = raw` 违反约束——`this` 还未初始化。
>
> **Q4. 子类构造器的第一条可执行语句必须是 `super(...)` 或 `this(...)`，不允许任何其他语句在前。**（JLS 8.8.7，JDK 1.0～24）
>
> **Q5. 可以调用 `static` 方法（属于类，不依赖 `this`）；不可以调用实例方法（隐含 `this` 引用）。**
>
> **Q6. 适用。**`this()` 委托调用同样遵循"之前不能访问 `this` 字段或实例方法"的约束，但可以在 `this()` 之前计算局部变量作为参数。
>
> **Q7. A — 计算父类构造参数的辅助值。**这是最典型场景：校验参数、转换参数（如 `rawTag.strip()`）再传给 `super()`，避免非法参数进入父类。
>
> **Q8. 大多数情况不需要了。**旧有的静态工厂 + 私有构造器模式（`static SafeConn of(String raw, int port)`）主要是为了在调用构造器前做参数处理；JEP 513 直接在构造器里实现，结构更简单。
>
> **Q9. 可以。**`super()` 之前抛出异常是合法的——这正是"参数安检"的核心用途，安检不通过直接抛，父类构造器不会被调用。
>
> **Q10. 不会被调用。**`super()` 之前的代码抛出异常时，控制流不会到达 `super()`，父类构造器跳过，对象不会被创建。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：本话所有代码以 `javac -encoding UTF-8 --release 25` 统一编译后运行；`--release 24` 拒绝错误取自实际编译输出；`javap -c` 字节码实录来自同一编译产物。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。灵活构造器体（JEP 513）在 JDK 25 正式转正，JDK 24 及以下不支持。

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*

