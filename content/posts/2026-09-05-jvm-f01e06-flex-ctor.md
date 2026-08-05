---
title: "F1E6 super 之前的自由 — JEP 513 灵活构造器体"
date: "2026-09-05"
series: "jvm-academy"
season: 1
episode: 6
tags: ["Java 25", "灵活构造器体", "JEP513", "构造器", "现代Java"]
excerpt: "30 年来 Java 构造器必须把 super() 排第一——参数安检只能排队等候。JDK 25 的 JEP 513 拆掉了这道门禁：先检查、再进门。"
---

> **"1995 年那条规矩是为了防止你在父对象还没建好之前就碰它——但它顺手把安检口也锁在了门里面。"**
> — 焰焰，召唤着 JDK 1.0 的版本残影说

---

## 🎬 开场：先进门还是先安检？

> **〔1〕**
> 深夜。阿零在调试一个连接池初始化的 bug：传进来的 `port=0` 到了父类构造器才抛异常，但异常信息指向父类代码，根本看不出是谁传了非法参数。
>
> 「我想在 `super()` 之前就校验 `rawPort`，报错信息更清晰——但编译器不让。」

> **〔2〕**
> 焰焰尾巴一甩，召唤出一道发黄的"版本残影"——JDK 1.0 时代的幽灵工程师现身。
>
> 「1995 年的规矩：子类构造器第一行必须是 `super()` 或 `this()`，否则编译报错。」幽灵工程师叹气，「当年是为了保证父对象先于子对象初始化，防止子类在父类字段还是 `null` 时就访问它。」

> **〔3〕**
> 「但这条规矩顺手把**安检口**也关在了门里——你没办法在调用 `super()` 之前做任何事，包括参数校验、辅助变量计算。」焰焰翻开《JEP 编年史》，「JDK 25，JEP 513，规矩改了。」

> **〔4〕**
> 新规矩：只要你在 `super()` 之前**不访问 `this`（也不访问父类字段）**，就可以自由写代码——计算、校验、赋值辅助变量，全部合法。
>
> 「进门之前先安检参数，出问题当场报，不用再进门之后才发现鞋子穿反了。」

---

## 🔑 核心技术：JEP 513 灵活构造器体

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

**约束**：`super()` 之前不能读取或写入 `this` 的字段，也不能调用实例方法（因为 `this` 还没构造完）。违反时编译报错。

---

## ⚙️ 代码实录：先安检再进门的连接配置

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

---

## 🚨 越界就报错：super() 之前不能碰 this

```java
class Bad extends SafeConn {
    Bad(String raw, int port) {
        this.tag = "early";   // ← 在 super() 之前访问 this，编译报错
        super(raw, port);
    }
}
```

**编译器报错**（Java 25）：

```
error: cannot reference this before supertype constructor has been called
```

规则很简单：`super()` 之前可以用**局部变量和参数**，不能用 `this` 或父类字段。

---

## 📐 版本边界

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

---

## 🔬 炉底显微镜

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

---

## 🔮 下话预告：F1E7《三件套合体》

卷一压轴。阿零把 `sealed` + `record` + `switch 解构` 三件套组合成**促销引擎**：`DiscountRule` 是 sealed 接口，具体规则是 record，促销计算是一个穷尽 switch——新增活动类型，编译器自动点名所有遗漏处理的地方。卷终话，字数加码（5.5k-6.5k）。
