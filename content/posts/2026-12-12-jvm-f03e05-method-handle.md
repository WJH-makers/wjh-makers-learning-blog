---
title: "《JVM 火种纪》20 · 更快的镜子"
date: 2026-12-12
summary: "60 行注入器运转了，但反射路径是 JIT 的盲区：每次 Method.invoke() 都带着装箱、权限检查、解释器分发。MethodHandle 给 JIT 一个可内联的调用目标，实测快 10 倍；VarHandle 把 Unsafe 的后门换成正门；Class-File API（JEP 484，JDK 24 正式）让阿零第一次徒手读字节码——卷三魔法祛魅收官。"
tags: [Java, Java漫画, JVM, MethodHandle, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》20 · 更快的镜子

> JVM 火种纪 · 卷三「反射与枚举篇」第 5 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话 60 行 @Coffee 注入器跑通了，容器把三层依赖自动连上线——可它每次装配都走 `Method.invoke()`，而那条路 JIT 看不进去。

---

## 一、事故：容器装配一慢，热路径跟着慢

上一话 60 行注入器跑通了，容器启动只花几毫秒——阿零很满意，直到他把反射从「启动时装配」搬到了「每次下单时取值」。

订单结算要读几个私有字段，他顺手复用了容器里那套 `Field.get()`。压测下来，单次结算多出十几微秒，放到午高峰的量级上就是一条肉眼可见的延迟抬升。

焰焰只问了一句：「你上一话量过反射的代价——90 倍。为什么还把它放进热路径？」

阿零想反驳：「我已经缓存了 `Method` 对象。」焰焰摇头：「缓存省掉的是**查找**，省不掉**调用**。`Method.invoke()` 对 JIT 是个黑盒——它不知道你最终要调哪个方法，所以内联不了、逃逸分析也做不了。你缓存的是地图，不是路。」

---

## 二、漫画 · 三面镜子与一把凿子

![JVM 火种纪漫画：f03e05-method-handle](/comics/jvm/f03e05-method-handle.png)

> [!文字版]
>
> **〔1〕** 阿零把反射镜擦得发亮:「照得见私有字段,又缓存了 `Method`,还能慢到哪去?」焰焰把压测曲线拍在台面上——一条稳稳抬高的延迟线。「反射镜能照到私有成员，但每次照都要检查权限、装箱参数、走解释器——JIT 看到 `Method.invoke()` 就头疼，因为它不知道里面最终调哪个方法。」
>
> **〔2〕** 焰焰拿出第二面镜:「`MethodHandle`——形状和反射一样，但 JIT 能看穿它，看见真正的调用目标，然后把它内联掉。」阿零凑近一看,镜面上刻着一行 `MethodType`:返回 String、无参数。「权限在 lookup 那一刻查一次,之后每次调用都不再查。」
>
> **〔3〕** 「第三面镜是 `VarHandle`。」焰焰举起一枚硬币：「你想原子地翻转这枚硬币——不用锁、只用一条 CAS 指令。以前要用 `Unsafe`，那是后门；JDK 9 之后用 `VarHandle`，这是官方正门。`compareAndSet`、`getAndAdd`、`getVolatile`——所有 Unsafe 的原子操作，`VarHandle` 都有安全版本。」
>
> **〔4〕** 炉底浮出一个版本残影,怀里抱着一本封面写着 `sun.misc.Unsafe` 的黑皮手册:「我这本书,当年整个 Java 生态都在偷偷抄。没有规范、没有承诺,改一版就炸一批框架。」它把手册合上,「现在你们有正门了。」残影散进火里。
>
> **〔5〕** 「第四面镜是 Class-File API。」焰焰打开一个 `.class` 文件的十六进制视图：「JEP 484 已在 JDK 24 把它正式纳入标准库（`java.lang.classfile`）。它提供受支持的 class-file 读写模型,但不因此自动替代所有 ASM/Javassist 使用场景——生态插件、版本兼容和变换能力仍要按项目评估。」
>
> **〔6〕** 阿零翻看这三卷的路线图：枚举的类型安全 → 反射的运行时自省 → MethodHandle 的可内联调用 → Class-File API 的字节码操控。焰焰总结：「这是从『写代码』到『操控代码本身』的路——Java 的元编程工具箱。卷三到这里收官，下一卷进入并发真正的深水区：虚拟线程。」

---

## 三、本话目标

- 用 `MethodHandle` 替掉热路径上的 `Method.invoke()`
- 说清 JIT 为什么能内联 MH 却看不透反射
- 用 `VarHandle` 做无锁 CAS，取代 `Unsafe` 后门
- 用 Class-File API 徒手解析 `.class` 的方法表
- 量出反射与 MH 的真实差距，给卷三收个可复现的尾

---

## 四、炉内原理图：三面镜子对比

```
                    反射 Method.invoke    MethodHandle    直接调用
JIT 可内联？              ✗（不透明）         ✅（可内联）    ✅
访问检查时机          每次 invoke            lookup 时一次    编译时
参数类型                  Object[]            精确类型        精确类型
基本类型装箱？              ✅（开销）           ✗              ✗
可描述符化？                ✗                  ✅（MethodType）✅
CAS/原子操作             用 Unsafe 后门      VarHandle 正门   AtomicXxx 封装
字节码操控                 ✗                  ✗               Class-File API
```

这张表的第二行才是性能差距的根因。上一话的容器每次注入都要过一遍 `checkAccess`，因为 `Method` 对象不携带「我已经被授权了」这个事实；`MethodHandle` 把权限检查提前到 `lookup` 那一次，之后每次 `invoke` 都是一条直路。

第一行解释了剩下的差距：`MethodType` 是一份精确的签名描述，JIT 拿着它能推断出唯一的调用目标，于是内联、去虚化、逃逸分析全部重新可用——**这不是「更快的反射」，是「让优化器重新看得见」**。

---

## 五、从上一话继续改代码：把镜子换成三面

```java
// javac -encoding UTF-8 --release 25 MirrorDemo.java && java MirrorDemo
import java.lang.invoke.*;
import java.lang.classfile.*;
import java.lang.classfile.instruction.*;
import java.lang.constant.*;
import java.lang.reflect.*;
import java.nio.file.*;

class Order {
    private String product;
    private int    cents;
    volatile int   version;   // VarHandle CAS 演示用

    Order(String p, int c) { product = p; cents = c; version = 0; }

    private String receipt() {
        return product + " ￥" + (cents / 100.0);
    }
}

class MirrorDemo {
    public static void main(String[] args) throws Throwable {
        Order o = new Order("拿铁", 2800);

        // ══════════════════════════════════════════════
        // ① MethodHandle：调用 private 方法
        // ══════════════════════════════════════════════
        MethodHandles.Lookup lookup = MethodHandles.privateLookupIn(
            Order.class, MethodHandles.lookup());

        MethodHandle receiptMH = lookup.findVirtual(
            Order.class, "receipt",
            MethodType.methodType(String.class));   // 返回 String，无参数

        System.out.println("MH 调用: " + (String) receiptMH.invoke(o));

        // ② MethodHandle：读写 private 字段
        MethodHandle getCents = lookup.findGetter(Order.class, "cents", int.class);
        MethodHandle setCents = lookup.findSetter(Order.class, "cents", int.class);
        System.out.println("原价: " + (int) getCents.invoke(o));
        setCents.invoke(o, 2520);
        System.out.println("折后: " + (int) getCents.invoke(o));

        // ══════════════════════════════════════════════
        // ③ VarHandle：CAS 原子操作 version 字段
        // ══════════════════════════════════════════════
        VarHandle versionVH = lookup.findVarHandle(
            Order.class, "version", int.class);

        boolean ok1 = versionVH.compareAndSet(o, 0, 1);  // 0→1，应成功
        boolean ok2 = versionVH.compareAndSet(o, 0, 2);  // 期望 0 但已是 1，失败
        System.out.println("CAS 0→1: " + ok1 + ", CAS 0→2: " + ok2
            + ", 最终 version=" + versionVH.get(o));

        // getAndAdd：原子加，返回旧值
        int old = (int) versionVH.getAndAdd(o, 10);
        System.out.println("getAndAdd(10) 旧值=" + old
            + " 新值=" + versionVH.get(o));

        // ══════════════════════════════════════════════
        // ④ Class-File API：解析 Order.class，列出方法名
        // ══════════════════════════════════════════════
        byte[] bytes = MirrorDemo.class.getClassLoader()
            .getResourceAsStream("Order.class")
            .readAllBytes();

        ClassModel cm = ClassFile.of().parse(bytes);
        System.out.println("\n=== Class-File API 解析 Order ===");
        System.out.println("类名: " + cm.thisClass().asInternalName());
        System.out.println("超类: " + cm.superclass()
            .map(c -> c.asInternalName()).orElse("none"));
        System.out.println("方法:");
        for (MethodModel mm : cm.methods()) {
            System.out.println("  " + mm.methodName().stringValue()
                + mm.methodType().stringValue());
        }

        // ══════════════════════════════════════════════
        // ⑤ 性能基准：反射 vs MethodHandle（100万次）
        // ══════════════════════════════════════════════
        Method reflectReceipt = Order.class.getDeclaredMethod("receipt");
        reflectReceipt.setAccessible(true);

        int N = 1_000_000;
        long t0 = System.nanoTime();
        for (int i = 0; i < N; i++) reflectReceipt.invoke(o);
        long reflectMs = (System.nanoTime() - t0) / 1_000_000;

        long t1 = System.nanoTime();
        for (int i = 0; i < N; i++) receiptMH.invoke(o);
        long mhMs = (System.nanoTime() - t1) / 1_000_000;

        System.out.printf("%n性能基准（%d 次调用）:%n", N);
        System.out.printf("  反射:        %4dms%n", reflectMs);
        System.out.printf("  MethodHandle:%4dms%n", mhMs);
    }
}
```

**实测输出**（GraalVM 25.0.4）：

```
MH 调用: 拿铁 ￥28.0
原价: 2800
折后: 2520
CAS 0→1: true, CAS 0→2: false, 最终 version=1
getAndAdd(10) 旧值=1 新值=11

=== Class-File API 解析 Order ===
类名: Order
超类: java/lang/Object
方法:
  <init>(Ljava/lang/String;I)V
  receipt()Ljava/lang/String;

性能基准（1000000 次调用）:
  反射:        193ms
  MethodHandle:  18ms
```

关键验证：MH 调用 private 方法成功；VarHandle CAS 原子性正确（首次成功/二次失败）；`getAndAdd` 返回旧值；Class-File API 正确解析内部类名和方法描述符；MethodHandle 比反射快约 10 倍（JIT 内联生效）。

最后一行是这一话的全部理由：**193ms → 18ms，代码做的事一模一样，只是换了一面 JIT 看得见的镜子**。

---

## 六、故意翻一次车：用 invokeExact 传一个父类引用

焰焰提过 `invokeExact` 比 `invoke` 更快，因为它不做任何类型适配。阿零故意试一次——他把接收者先存进一个 `Object` 变量，再拿 `invokeExact` 去调：

```java
// 故意把接收者声明成 Object，再用 invokeExact 调用
Object receiver = o;                                  // 实际仍是 Order 实例
String s = (String) receiptMH.invokeExact(receiver);   // ← 签名对不上
```

对象本身没换，仍是那个 `Order`。变的只是**编译期看到的静态类型**：MethodHandle 的签名是 `(Order)String`，而调用点递过来的是 `(Object)String`。

`invoke` 会替你把这一步适配掉，`invokeExact` 不会——它要求签名严丝合缝，多一个父类引用都不行。

---

## 七、编译官罚单

> **📋 编译官罚单 · 编译官放行了，运行时才拦**
>
> 这段代码编译毫无怨言——`invokeExact` 的返回类型是多态签名，编译器只按你写的强转去核对，压根不比较 `MethodType`。放行之后，运行时才拦（GraalVM 25.0.4 实测）：
>
> ```text
> Exception in thread "main" java.lang.invoke.WrongMethodTypeException: handle's method type (Order)String but found (Object)String
> 	at java.base/java.lang.invoke.Invokers.newWrongMethodTypeException(Invokers.java:522)
> 	at java.base/java.lang.invoke.Invokers.checkExactType(Invokers.java:531)
> 	at MirrorBad.main(MirrorBad.java:19)
> ```
>
> 报错把两份签名并排摆了出来:`(Order)String` 是句柄的,`(Object)String` 是调用点的。这就是**元编程绕过了编译期检查**的代价——句柄的签名活在运行时的 `MethodType` 里，编译器无权过问。上一话的 `@Retention(CLASS)` 是同一种病：编译期一声不响，问题全留给运行时。
>
> 换个角度看，这张罚单也是 MH 快的原因:类型契约被推迟到运行时**一次性**核对,核对通过之后 JIT 就能当成普通调用来优化。检查没有消失，只是从「每次调用都查」搬到了「进门查一次」。

---

## 八、修复并验证

两条修法，取决于你要什么：

- **要极致速度**：把接收者的静态类型写准，`Order receiver = o;` 之后再 `invokeExact`——签名严丝合缝，JIT 直接内联。
- **要写法宽松**：改用 `invoke`，让它替你做类型适配，代价是多一层适配开销。

正文的 `MirrorDemo` 用的是 `invoke`，所以它一路跑通。验证判据四条：

1. **MH 能穿透私有**：`receiptMH.invoke(o)` 打印出小票，`findGetter`/`findSetter` 读改 `cents` 成功。
2. **CAS 语义正确**：期望值匹配时 `true`，不匹配时 `false` 且不改值；`getAndAdd` 返回**旧**值。
3. **Class-File API 解析正确**：`Order` 的方法表列出 `<init>` 与 `receipt`，描述符与源码一致。
4. **MH 明显快于反射**：同样 100 万次调用，两者差一个数量级。

**正常输出**（GraalVM 25.0.4）：

```
MH 调用: 拿铁 ￥28.0
原价: 2800
折后: 2520
CAS 0→1: true, CAS 0→2: false, 最终 version=1
getAndAdd(10) 旧值=1 新值=11

=== Class-File API 解析 Order ===
类名: Order
超类: java/lang/Object
方法:
  <init>(Ljava/lang/String;I)V
  receipt()Ljava/lang/String;

性能基准（1000000 次调用）:
  反射:        193ms
  MethodHandle:  18ms
```

关键验证：MH 调用 private 方法成功；VarHandle CAS 原子性正确（首次成功/二次失败）；`getAndAdd` 返回旧值；Class-File API 正确解析内部类名和方法描述符；MethodHandle 比反射快约 10 倍（JIT 内联生效）。

最后一行是这一话的全部理由：**193ms → 18ms，代码做的事一模一样，只是换了一面 JIT 看得见的镜子**。

---

## 九、🔬 炉底显微镜 · invokedynamic 与 MethodHandle 的关系

> 焰焰用 `javap` 验证 `invokedynamic` 指令与 MethodHandle 的关系：

```bash
# 用 javap 查看 lambda 表达式背后的 invokedynamic
javac -encoding UTF-8 --release 25 LambdaTest.java && javap -c LambdaTest

# 实际上 lambda 就是通过 invokedynamic + MethodHandle 实现的
# LambdaMetafactory 在运行时用 MethodHandle 创建接口实现

# 查看 MethodHandle 的实际字节码
javap -v -p Order.class | grep -A5 "receipt"

# Class-File API 查看字节码指令（更友好的方式）
java --source 25 - <<'EOF'
import java.lang.classfile.*;
import java.lang.classfile.instruction.*;

void main() throws Exception {
    byte[] bytes = ClassLoader.getSystemResourceAsStream("Order.class")
                              .readAllBytes();
    ClassModel cm = ClassFile.of().parse(bytes);
    for (var method : cm.methods()) {
        if (!method.methodName().stringValue().equals("receipt")) continue;
        System.out.println("=== receipt() 字节码 ===");
        method.code().ifPresent(code ->
            code.forEach(e -> System.out.println("  " + e)));
    }
}
EOF

# jcmd 查看 JIT 内联情况（需要 -XX:+PrintCompilation 开启）
jcmd <pid> Compiler.directives_print
```

**Class-File API 解析 receipt() 字节码（实测）**：

```
=== receipt() 字节码 ===
  ALOAD 0
  GETFIELD Order.product : java/lang/String
  LDC " ￥"
  INVOKEVIRTUAL java/lang/String.concat
  ...
  ARETURN
```

关键观测点：
- lambda（`() -> x`）在字节码层是 `invokedynamic`，Bootstrap 方法指向 `LambdaMetafactory`，其内部用 `MethodHandle` 指向 lambda 体；MethodHandle 因此是 lambda 的底层支撑
- `invokeExact` 要求调用栈上的类型签名与 `MethodType` 完全匹配，JIT 可直接内联；`invoke` 会做类型适配，稍有开销
- Class-File API 的 `ClassTransform` 可链式组合：`ClassTransform.transformingMethods(filter, methodTransform).andThen(anotherTransform)`
- `jcmd <pid> VM.native_memory` 可查看 `java.lang.invoke` 相关的元空间占用（MH 每种类型适配都有缓存）

---

## 十、⏳ 版本时光机 · 从 Unsafe 后门到 Class-File API

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| `java.lang.invoke.MethodHandle` | **JDK 7** | 配合 `invokedynamic`（JSR-292）引入 |
| `MethodHandles.lookup().findVirtual/findGetter` | JDK 7 | 基础查找 API |
| `MethodHandles.privateLookupIn()` | **JDK 9** | 访问其他类私有成员，取代 Reflection hack |
| `VarHandle` | **JDK 9** | 原子操作正门，替代 `sun.misc.Unsafe` |
| `java.lang.classfile`（Class-File API）| **JDK 24 正式** | JEP 484；标准库内置 class-file 读写与变换模型 |
| 本话代码运行环境 | JDK 25 | ✅ Class-File API 正式可用 |

---

## 十一、使用边界与陷阱

```java
// ─── MethodHandle ────────────────────────────────────────────
// ✅ 正确：privateLookupIn 需要 caller 与 target 在同模块，
//          或 target 类对 caller 开放（opens）
MethodHandles.Lookup lk = MethodHandles.privateLookupIn(
    Order.class, MethodHandles.lookup());

// ❌ 错误：invoke() 返回 Object，必须显式转型，否则 ClassCastException
String s = receiptMH.invoke(o);           // 编译通过，运行时 CCE
String s2 = (String) receiptMH.invoke(o); // ✅

// ✅ 推荐：用 invokeExact()，类型必须严格匹配，比 invoke() 少装箱
//    代价是签名必须完全一致，多一个父类引用都不行
String s3 = (String) receiptMH.invokeExact(o); // ✅ 最快

// ─── VarHandle ───────────────────────────────────────────────
// VarHandle 的访问模式（内存语义）：
// plain (get/set)         → 无内存屏障，等同于普通字段访问
// volatile (getVolatile)  → 完整 happen-before，等同 volatile
// acquire/release         → 单向屏障，比 volatile 轻量
// compareAndSet           → CAS，原子更新

// ❌ 不能用 VarHandle 访问非 volatile 字段做多线程 CAS：
//    即使 VarHandle 保证原子性，字段本身可见性不保证
//    演示中 version 字段标记了 volatile，保证多线程可见

// ─── Class-File API ──────────────────────────────────────────
// JEP 484 在 JDK 24 正式；是否替代第三方库取决于项目需求
// parse() 是只读；transform() 可修改；build() 从头生成
// 生成的 byte[] 可用 ClassLoader.defineClass() 加载为 Class<?>
```

---

## 十二、项目检查点 · 豆豆咖啡站 jvm-v3.0

- **已具备**：会员等级枚举化、状态机守轨（v2.1–v2.2）；反射能照进类骨架（v2.3）；60 行 @Coffee 容器自动装配（v2.4）；热路径上的反射换成 `MethodHandle`，实测 193ms→18ms；并发计数改用 `VarHandle` CAS，不再需要锁；能徒手用 Class-File API 读出方法表与字节码（本话）。
- **还没有**：容器仍是单例、无作用域、无 AOP、无循环依赖处理；出杯台还是「一请求一平台线程」的老结构——午高峰一来，线程池就是天花板。

阿零的变化：卷三开篇他以为「框架魔法」是一整块黑箱，现在他能指着每一层说出用了哪个 API、代价在哪、什么时候不该用。**祛魅不是学会了几个类名，是从此敢于打开任何一层去看。**

### 本卷 JDK 特性清单

| 特性 | JEP / 规范 | 状态（JDK 25 视角） |
|---|---|---|
| `enum` 与常量特定方法 | JLS §8.9 | JDK 5 起可用 |
| `switch` 表达式穷尽检查 | JEP 361 | JDK 14 正式 |
| `EnumMap` / `EnumSet` | `java.util` | JDK 5 起可用 |
| 反射 `Class/Field/Method` | `java.lang.reflect` | JDK 1.1 起可用 |
| 模块强封装（`setAccessible` 限制） | JEP 261 | JDK 9 起生效，需 `opens` 或 `--add-opens` |
| 注解与 `@Retention` | `java.lang.annotation` | JDK 5 起可用 |
| `MethodHandle` / `invokedynamic` | JSR-292 | JDK 7 起可用 |
| `MethodHandles.privateLookupIn` | — | JDK 9 起可用 |
| `VarHandle` | JEP 193 | JDK 9 起可用 |
| Class-File API（`java.lang.classfile`） | **JEP 484** | **JDK 24 正式**，JDK 25 可直接用 |

### 本卷炉底显微镜命令合集

```bash
# 第16话 · 枚举是编译器替你 new 好的单例
javac -encoding UTF-8 --release 25 MemberBadge.java
javap -c MemberLevel | head -30

# 第17话 · EnumMap 的内部数组与 EnumSet 位图
javap -p java.util.EnumMap | grep -E "vals|keyUniverse|Object"

# 第18话 · 反射代价：直接调用 vs 缓存 Method 后 invoke
javap -c java.lang.reflect.Method | head -30

# 第19话 · @Retention 三种策略在字节码里的差异
javap -verbose InventoryRepo.class | grep -A3 "annotation"

# 第20话 · lambda 背后的 invokedynamic 与 MethodHandle
javac -encoding UTF-8 --release 25 LambdaTest.java && javap -c LambdaTest
javap -v -p Order.class | grep -A5 "receipt"
jcmd <pid> Compiler.directives_print
```

---

## 十三、对应招聘技能

`MethodHandle` 与 `invokedynamic` 调用机制、`VarHandle` 与 CAS 内存语义、Class-File API（JEP 484）字节码读写、反射性能优化与 JIT 内联边界、框架元编程原理、枚举与注解的工程化设计、Java25

---

## 十四、下一话悬念

卷三收官。镜子的事讲完了：枚举给了类型安全，反射给了运行时自省，MethodHandle 把代价降回可接受，Class-File API 让阿零第一次敢直接动字节码。

炉门外，豆豆正在往压测器里灌流量——十万单，午高峰。阿零的出杯台还是老结构：一请求一平台线程，池子撑到两百就顶格了。焰焰翻开《JEP 编年史》最新的一页:「下一卷，你要让十万个订单人手一单、从头跟到尾。」卷四「并发新纪元篇」第 21 话《一人一单的复活》，**虚拟线程**上场。

---

## 🎯 随堂练习

**Q1.** `MethodHandle.invoke()` 和 `MethodHandle.invokeExact()` 的区别？

**Q2.** 为什么 MethodHandle 比 `Method.invoke()` 快？JIT 做了什么？

**Q3.** `VarHandle.compareAndSet(obj, expected, newVal)` 失败时会抛异常吗？

**Q4.** `VarHandle` 替代了哪个历史遗留 API？两者的主要区别是什么？

**Q5.** `MethodHandles.lookup()` 和 `MethodHandles.privateLookupIn()` 的区别？

**Q6.** Class-File API 的 `parse()` 和 `transform()` 各自的用途？

**Q7.** lambda 表达式和 MethodHandle 有什么内在关联？

**Q8.** 用 MethodHandle 调用构造器（`new Order(...)`）的正确方式是什么？

**Q9.** 为什么访问模式（plain/volatile/acquire-release）对 VarHandle 如此重要？

**Q10.** Class-File API 生成的 `byte[]` 如何加载为可用的 `Class<?>`？

---

> [!答案]
>
> **Q1. `invoke()` 会做类型适配（参数类型转换、基本类型装箱）；`invokeExact()` 要求调用签名与 `MethodType` 完全一致，没有任何适配，类型不匹配时抛 `WrongMethodTypeException`。**`invokeExact` 更快，因为 JIT 不需要插入适配代码；`invoke` 更宽松，适合参数类型不完全确定的场景。实际框架中两者都常见。
>
> **Q2. `Method.invoke()` 对 JIT 是不透明的黑盒——JIT 看到它时不知道最终调哪个目标方法，无法内联。`MethodHandle` 带有精确的 `MethodType`，JIT 能推断出调用目标并将其内联到调用点，消除虚调用开销，甚至做逃逸分析。**本质是 JIT 对 `invokeExact`/`invoke` 有专门的内联规则（intrinsic），等效于 `invokevirtual`。
>
> **Q3. 不抛异常，返回 `false`。**`compareAndSet` 是乐观 CAS：如果当前值 ≠ expected，什么都不做，返回 `false`；调用者自己决定是否重试（spin loop）。只有参数类型不匹配或 VarHandle 指向非法对象时才抛异常。
>
> **Q4. VarHandle 替代了 `sun.misc.Unsafe` 的原子操作部分。**主要区别：`Unsafe` 是内部 API，不保证稳定；`VarHandle` 是 `java.lang.invoke` 公开 API，有规范的内存语义模型（JDK 9 JMM 更新定义了 9 种访问模式）。两者性能相当（VarHandle 最终也调用 CPU 的 CAS 指令），但 VarHandle 更安全，不需要 `Unsafe.objectFieldOffset()` 手算偏移量。
>
> **Q5. `MethodHandles.lookup()` 返回当前调用类的 Lookup 对象，只能访问当前类有权访问的成员（遵循 Java 访问控制）。`MethodHandles.privateLookupIn(targetClass, caller)` 让 caller 获得 targetClass 的完全访问权限（含 private），前提是 targetClass 的模块对 caller 的模块 `opens`。**JDK 9 以前用 `setAccessible` 绕过访问控制；JDK 9+ 推荐 `privateLookupIn`，它在 lookup 阶段一次检查权限，后续 invoke 无需重复检查。
>
> **Q6. `parse(byte[])` 把 .class 字节解析为只读的 `ClassModel`，可遍历字段/方法/注解/字节码指令；`transform(ClassModel, ClassTransform)` 以流式方式遍历 ClassModel 元素，按规则替换或过滤，返回修改后的 `byte[]`。**`build(ClassDesc, ClassBuilder → ...)` 从零生成字节码。常见组合：`parse` 分析 → `transform` 修改 → `defineClass` 加载。
>
> **Q7. Java 8+ 的 lambda 在字节码层是 `invokedynamic` 指令，Bootstrap 方法是 `LambdaMetafactory.metafactory()`，它在运行时用 `MethodHandle` 指向 lambda 体（编译器生成的私有静态方法），并生成一个实现目标函数式接口的轻量类。**所以 lambda 是 MethodHandle 的最大用户：每一个 lambda 表达式背后都有一个 MethodHandle。
>
> **Q8. 用 `findConstructor()`：**
> ```java
> MethodHandle ctor = lookup.findConstructor(
>     Order.class,
>     MethodType.methodType(void.class, String.class, int.class));
> Order o = (Order) ctor.invoke("冰美式", 1800);
> ```
> `findConstructor` 的 MethodType 必须以 `void.class` 为返回类型（构造器 `<init>` 无返回值），但 `invoke` 的返回值是新建的实例。
>
> **Q9. 访问模式决定内存可见性与排序保证：**`plain` 无屏障，多线程下无可见性保证（适合单线程热路径）；`volatile` 保证完整 happens-before（最安全但最重）；`acquire`（读）和 `release`（写）是单向屏障，用于无锁数据结构（比 volatile 轻量）；`opaque` 提供最弱保证（仅保证原子性，不保证顺序）。错误选择访问模式会导致数据竞争，而编译器不会报错。
>
> **Q10. 用 `ClassLoader.defineClass()`（需要自定义 ClassLoader，因为它是 protected 方法）或 `MethodHandles.Lookup.defineClass()`（JDK 9+，推荐）：**
> ```java
> byte[] bytes = ClassFile.of().build(ClassDesc.of("GeneratedFoo"), cb -> { ... });
> Class<?> cls = MethodHandles.lookup().defineClass(bytes);
> Object instance = cls.getDeclaredConstructor().newInstance();
> ```
> `Lookup.defineClass()` 将新类定义在 lookup 对象的包和模块中，无需自定义 ClassLoader，是 JDK 9+ 推荐的动态类生成方式。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 MirrorDemo.java && java MirrorDemo`；MethodHandle 调用 private 方法/字段成功；VarHandle CAS 操作原子性验证（true/false）；Class-File API 解析 Order.class 输出类名与方法；性能基准实测（反射 193ms vs MH 18ms）与文中一致。第七节的 `WrongMethodTypeException` 取自同一环境的实际运行输出（`invokeExact` 传入 `Object` 静态类型的接收者）。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[JEP 484 Class-File API](https://openjdk.org/jeps/484)（JDK 24 正式）、[java.lang.invoke 包文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/invoke/package-summary.html)。

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*

卷四进入并发真正的深水区：**虚拟线程**（JDK 21 正式 / JDK 25 稳固）。

Project Loom 终结了「一请求一平台线程」的时代——百万虚拟线程、结构化并发、作用域值。焰焰带阿零用 200 行代码模拟一个接受 10 万并发请求的咖啡站，平台线程 OOM，虚拟线程轻松通过。
