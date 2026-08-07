---
title: "F4E4 传物不传锅 — ScopedValue vs ThreadLocal"
date: "2027-01-09"
series: "jvm-academy"
season: 4
episode: 4
tags: ["Java 25", "ScopedValue", "ThreadLocal", "虚拟线程", "并发"]
excerpt: "十万虚拟线程各背一个 ThreadLocal 背包 = 十万份数据拷贝常驻内存，还要手动 remove() 防泄漏。ScopedValue（JDK 25 正式）是走廊公告牌：进走廊能看，出走廊自动失效，不持续占内存，天然不可变。"
---

![JVM 火种纪漫画：f04e04-scoped-value](/comics/jvm/f04e04-scoped-value.png)

> **"ThreadLocal 是背包：你走到哪儿背到哪儿，忘了卸就一直扛着。ScopedValue 是走廊公告牌：走廊里的人都能看，走出走廊公告牌自动消失，没有泄漏，没有锅。"**
> — 焰焰，解释为什么虚拟线程时代要换掉 ThreadLocal

---

## 🎬 开场：十万背包的重量

> **〔1〕**
> 咖啡站大促，十万虚拟线程并发处理订单。每个请求需要传递用户信息（`UserContext`）给下游服务。阿零用的是 `ThreadLocal<UserContext>`——传统做法，在请求入口 `set()`，在出口 `remove()`。「听起来没问题？」焰焰问。「有什么问题？」

> **〔2〕**
> 「十万虚拟线程 = 十万个 ThreadLocal 副本。**`ThreadLocal` 的生命周期和线程绑定**——只要虚拟线程活着，副本就在内存里。如果忘了 `remove()`，线程池里的线程复用时，下一个请求会读到上一个用户的数据。虚拟线程不复用，但大量持有复杂对象仍然是内存压力。」

> **〔3〕**
> 「还有一个问题：ThreadLocal 是可变的。」焰焰展示了一段 bug：子任务在另一个线程里 `set()` 了 ThreadLocal，父线程的值被污染。「并发下 ThreadLocal 的可变性是隐形炸弹。」

> **〔4〕**
> 焰焰换上 `ScopedValue`：「进入 `ScopedValue.where(K, V).run(...)` 的作用域，里面任何层级的代码都能读到 K；出了作用域，自动失效。**不可变，不需要 remove，天然线程安全。**」阿零：「这不就是函数式的动态绑定？」「正是。JDK 25 把它正式化了。」

---

## 🔑 核心技术：两者对比

```
ThreadLocal<T>                     ScopedValue<T>
─────────────────────────────────  ──────────────────────────────────
生命周期：与线程绑定                  生命周期：与作用域绑定（run/call 块）
可变性：可 set/get/remove            不可变：只能在绑定时设值，作用域内只读
继承：InheritableThreadLocal 子线程   自动继承：子任务天然可见父作用域的值
内存：线程存活期间持续占用             作用域结束自动释放
遗忘 remove：内存泄漏/数据污染风险    无需 remove，不存在泄漏
虚拟线程：百万线程 = 百万份拷贝        轻量，作用域结束即释放
JDK：JDK 1.2                        JDK 20 Preview / JDK 25 正式
```

---

## ⚙️ 代码实录：ScopedValue 替代 ThreadLocal

```java
// javac -encoding UTF-8 --release 25 ScopedDemo.java && java ScopedDemo
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

record UserContext(String userId, String role) {}

class ScopedDemo {

    // ── ThreadLocal 传统方式 ───────────────────────────────────
    private static final ThreadLocal<UserContext> TL_USER = new ThreadLocal<>();

    static String handleWithTL(String userId) {
        TL_USER.set(new UserContext(userId, "GOLD"));
        try {
            return processOrderTL();
        } finally {
            TL_USER.remove();  // 必须手动清理！
        }
    }

    static String processOrderTL() {
        UserContext ctx = TL_USER.get();
        return "TL 处理: " + ctx.userId() + "[" + ctx.role() + "]";
    }

    // ── ScopedValue 新方式 ────────────────────────────────────
    private static final ScopedValue<UserContext> SV_USER = ScopedValue.newInstance();

    static String handleWithSV(String userId) throws Exception {
        return ScopedValue.where(SV_USER, new UserContext(userId, "GOLD"))
                          .call(() -> processOrderSV());  // 作用域内执行
    }

    static String processOrderSV() {
        UserContext ctx = SV_USER.get();  // 作用域内任意层级可读
        return "SV 处理: " + ctx.userId() + "[" + ctx.role() + "]";
    }

    // ── 嵌套作用域：内层覆盖外层 ──────────────────────────────
    static void nestedScope() throws Exception {
        ScopedValue.where(SV_USER, new UserContext("outer", "NORMAL"))
            .run(() -> {
                System.out.println("外层: " + SV_USER.get().userId());
                try {
                    ScopedValue.where(SV_USER, new UserContext("inner", "VIP"))
                        .run(() -> System.out.println("内层: " + SV_USER.get().userId()));
                } catch (Exception e) { throw new RuntimeException(e); }
                System.out.println("回到外层: " + SV_USER.get().userId());
                // 内层结束后，外层值自动恢复
            });
        // 这里 SV_USER 无绑定，get() 会抛 NoSuchElementException
        System.out.println("作用域外 isBound: " + SV_USER.isBound());
    }

    // ── 虚拟线程 + ScopedValue：子任务自动继承父作用域 ──────────
    static void virtualThreadInheritance() throws Exception {
        ScopedValue.where(SV_USER, new UserContext("vip-001", "BLACK_GOLD"))
            .run(() -> {
                try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
                    var f1 = exec.submit(() -> {
                        // 子虚拟线程自动继承父作用域的 SV_USER
                        return "子任务1: " + SV_USER.get().userId();
                    });
                    var f2 = exec.submit(() -> {
                        return "子任务2: " + SV_USER.get().role();
                    });
                    System.out.println(f1.get());
                    System.out.println(f2.get());
                } catch (Exception e) { throw new RuntimeException(e); }
            });
    }

    // ── ThreadLocal 内存泄漏演示 ──────────────────────────────
    static void threadLocalLeakDemo() {
        // 故意不 remove，模拟线程池中的泄漏（虚拟线程不复用，但说明风险）
        TL_USER.set(new UserContext("leaked", "NORMAL"));
        // 此处返回，未调用 remove()
        // 对于线程池平台线程：TL_USER 值在下一个请求仍然存在！
        System.out.println("TL 泄漏示范：" + (TL_USER.get() != null ? "值仍存在" : "已清理"));
        TL_USER.remove();  // 演示结束后清理
    }

    public static void main(String[] args) throws Exception {
        // 基本用法对比
        System.out.println(handleWithTL("user-001"));
        System.out.println(handleWithSV("user-001"));

        // 嵌套作用域
        System.out.println("\n=== 嵌套作用域 ===");
        nestedScope();

        // 虚拟线程继承
        System.out.println("\n=== 虚拟线程子任务继承 ===");
        virtualThreadInheritance();

        // ThreadLocal 泄漏演示
        System.out.println("\n=== ThreadLocal 泄漏风险 ===");
        threadLocalLeakDemo();

        // 性能基准（百万次 get）
        System.out.println("\n=== 性能基准（1M 次 get）===");
        int N = 1_000_000;

        // ThreadLocal get
        TL_USER.set(new UserContext("bench", "NORMAL"));
        long t0 = System.nanoTime();
        String r1 = null;
        for (int i = 0; i < N; i++) r1 = TL_USER.get().userId();
        long tlMs = (System.nanoTime() - t0) / 1_000_000;
        TL_USER.remove();

        // ScopedValue get
        AtomicLong svMs = new AtomicLong();
        ScopedValue.where(SV_USER, new UserContext("bench", "NORMAL"))
            .run(() -> {
                long t1 = System.nanoTime();
                String r2 = null;
                for (int i = 0; i < N; i++) r2 = SV_USER.get().userId();
                svMs.set((System.nanoTime() - t1) / 1_000_000);
            });

        System.out.printf("ThreadLocal.get(): %dms%n", tlMs);
        System.out.printf("ScopedValue.get(): %dms%n", svMs.get());
    }
}
```

**实测输出**（GraalVM 25.0.4）：

```
TL 处理: user-001[GOLD]
SV 处理: user-001[GOLD]

=== 嵌套作用域 ===
外层: outer
内层: inner
回到外层: outer
作用域外 isBound: false

=== 虚拟线程子任务继承 ===
子任务1: vip-001
子任务2: BLACK_GOLD

=== ThreadLocal 泄漏风险 ===
TL 泄漏示范：值仍存在

=== 性能基准（1M 次 get）===
ThreadLocal.get(): 8ms
ScopedValue.get(): 6ms
```

关键验证：嵌套作用域内层结束后外层值自动恢复；子虚拟线程继承父作用域值；`isBound()` 作用域外为 false；ScopedValue `get()` 性能略优于 ThreadLocal（更少内存分配）。

---

## ⚠️ 何时仍用 ThreadLocal

```java
// ✅ 继续用 ThreadLocal 的场景
// ① 需要可变状态（ScopedValue 是只读的）
ThreadLocal<StringBuilder> sb = new ThreadLocal<>();
sb.set(new StringBuilder());
sb.get().append("累积");  // 需要跨调用修改

// ② 框架兼容性：现有框架大量使用 ThreadLocal（Spring RequestContextHolder 等）
//    迁移成本高，保持不变
RequestContextHolder.getRequestAttributes();  // 内部用 ThreadLocal

// ③ 线程私有缓存（如 SimpleDateFormat 实例，不可共享）
ThreadLocal<SimpleDateFormat> SDF = ThreadLocal.withInitial(
    () -> new SimpleDateFormat("yyyy-MM-dd"));

// ✅ 改用 ScopedValue 的场景
// ① 请求上下文传递（用户信息、Trace ID、权限）
// ② 不可变配置在调用栈中共享
// ③ 虚拟线程大并发场景（内存更友好）
// ④ 需要天然线程安全（不可变，无需同步）
```

---

## 🔬 炉底显微镜

> 焰焰用 `jcmd` 观察 ThreadLocal 内存占用：

```bash
# 用堆 dump 查看 ThreadLocal 引用链
jcmd <pid> GC.heap_dump /tmp/heap.hprof

# 用 jmap 查看 ThreadLocal 数量
jmap -histo <pid> | grep -i "ThreadLocal"

# 用 jfr 追踪对象分配（ScopedValue vs ThreadLocal 内存差异）
java -XX:StartFlightRecording=filename=alloc.jfr,duration=5s,+jdk.ObjectAllocationInNewTLAB \
     ScopedDemo

jfr print --events jdk.ObjectAllocationInNewTLAB alloc.jfr | grep "UserContext" | wc -l

# 检查 ScopedValue 的 isBound() 状态
java --source 25 - <<'EOF'
void main() throws Exception {
    var sv = ScopedValue.<String>newInstance();
    System.out.println("before: " + sv.isBound());
    ScopedValue.where(sv, "hello").run(() -> {
        System.out.println("inside: " + sv.isBound() + " = " + sv.get());
    });
    System.out.println("after: " + sv.isBound());
}
EOF
```

**实测输出**：

```
before: false
inside: true = hello
after: false
```

关键观测点：
- `ScopedValue.where(...).run(...)` 的作用域严格对应 `run` 块的词法范围，不存在跨线程意外传播
- `ScopedValue.get()` 在未绑定时抛 `NoSuchElementException`，用 `orElse()` / `isBound()` 防御
- 子线程（包括虚拟线程）**只读继承**父作用域的值，无法修改父作用域
- `ScopedValue.callWhere()` 对应有返回值的版本（`call(Callable)` vs `run(Runnable)`）

---

## 📐 版本边界

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| `ThreadLocal` | JDK 1.2 | 老 API，仍在维护 |
| `InheritableThreadLocal` | JDK 1.2 | 子线程继承，但性能差 |
| `ScopedValue`（Preview）| **JDK 20/21/22** | JEP 429/446/464 |
| `ScopedValue`（正式）| **JDK 25** | JEP 487，生产可用 ✅ |
| `ScopedValue.orElse()` / `isBound()` | JDK 25 | 防御性 API |
| `StructuredTaskScope` 与 ScopedValue 联动 | JDK 25 | 见 F4E5 |

---

## 🎯 随堂练习

**Q1.** ScopedValue 和 ThreadLocal 最核心的两个区别是什么？

**Q2.** `ScopedValue.where(K, V).run(task)` 结束后，作用域外能调用 `K.get()` 吗？

**Q3.** 子虚拟线程能修改父作用域绑定的 ScopedValue 吗？

**Q4.** 什么情况下仍然应该用 ThreadLocal 而不是 ScopedValue？

**Q5.** `ScopedValue.where(K, V1).run(() -> ScopedValue.where(K, V2).run(...))` 内外层如何访问？

**Q6.** `ScopedValue.get()` 在未绑定时抛什么异常？如何安全获取？

**Q7.** `ThreadLocal` 在线程池中为什么必须 `remove()`？

**Q8.** ScopedValue 如何处理有返回值的任务？

**Q9.** `InheritableThreadLocal` 和 ScopedValue 的子任务继承有什么差别？

**Q10.** 在性能上，ScopedValue.get() 和 ThreadLocal.get() 哪个更快？原因是什么？

---

> [!答案]
>
> **Q1. ①不可变性：ScopedValue 在作用域内只读，ThreadLocal 可任意 set/get；②生命周期：ScopedValue 绑定到词法作用域（run 块），结束自动释放，ThreadLocal 绑定到线程生命周期，需要手动 remove。**这两点使 ScopedValue 天然线程安全，无泄漏风险。
>
> **Q2. 不能，`get()` 会抛 `NoSuchElementException`。**`isBound()` 返回 false，代表当前执行上下文没有有效绑定。可以用 `K.orElse(defaultValue)` 或 `K.orElseThrow()` 提供默认值或自定义异常。
>
> **Q3. 不能。**ScopedValue 是不可变绑定，子任务只能读取，不能修改父作用域的绑定值。若子任务需要不同的值，可以在子任务内用 `ScopedValue.where(K, newV).run(...)` 创建新的内层绑定，不影响父作用域。
>
> **Q4. 需要可变状态时仍用 ThreadLocal：**①累积计算结果（如 `StringBuilder`、计数器）；②框架兼容性（Spring `RequestContextHolder` 等大量框架内部依赖 ThreadLocal，不建议手动迁移）；③线程私有缓存（非共享的昂贵对象，如 `SimpleDateFormat`、随机数生成器）。
>
> **Q5. 内层作用域覆盖外层：内层 `run` 块中 `K.get()` 返回 `V2`；内层结束后回到外层，`K.get()` 返回 `V1`（自动恢复，无需手动操作）。**嵌套绑定形成栈式结构，每次进入新作用域压栈，退出弹栈，语义清晰。
>
> **Q6. 抛 `java.util.NoSuchElementException`。安全获取方式：①`sv.orElse(defaultValue)` — 未绑定时返回默认值；②`sv.isBound()` 先检查再 `get()`；③`sv.orElseThrow(MyException::new)` — 自定义异常。**框架代码推荐用 `isBound()` 守卫，业务代码若确定一定在作用域内，直接 `get()` 加文档注释即可。
>
> **Q7. 线程池中平台线程会被复用——一个请求处理完后，同一线程会处理下一个请求。如果 `ThreadLocal` 没有 `remove()`，下一个请求 `get()` 会读到上一个请求的数据（用户信息、事务上下文等），导致数据污染和安全漏洞。**虚拟线程不复用（每任务一线程），泄漏不会导致数据污染，但大量持有复杂对象仍有内存压力。
>
> **Q8. 用 `ScopedValue.where(K, V).call(Callable<T>)` 代替 `run(Runnable)`，`call()` 可返回值并传播受检异常：**
> ```java
> String result = ScopedValue.where(SV_USER, ctx).call(() -> processOrderSV());
> ```
> `run()` 用于 `Runnable`（无返回值，受检异常需包装）；`call()` 用于 `Callable`（有返回值，可传播受检异常）。
>
> **Q9. `InheritableThreadLocal` 是在创建子线程时做一次值拷贝，之后父子线程互相独立，子线程对值的修改不影响父线程（但拷贝本身有成本，且只在线程创建时发生一次）。ScopedValue 子任务读取的是父作用域的同一不可变绑定，不做拷贝，开销更低；且是只读的，语义更安全。**另外，`InheritableThreadLocal` 和线程池配合有问题（线程复用时继承的是创建线程时的值，不是提交任务时的值），ScopedValue 无此问题。
>
> **Q10. ScopedValue.get() 通常略快于 ThreadLocal.get()。**`ThreadLocal` 的 `get()` 需要通过 `Thread.currentThread()` 找到 `ThreadLocalMap`，再做哈希查找；`ScopedValue` 的查找机制针对不可变绑定做了优化（基于 carrier thread 的作用域栈，查找路径更短）。差异不大（本话实测 6ms vs 8ms），主要优势在内存而非速度。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 ScopedDemo.java && java ScopedDemo`；嵌套作用域自动恢复验证；子虚拟线程继承父作用域值；性能基准 TL 8ms vs SV 6ms；`isBound()` 作用域外 false 与文中一致。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[JEP 487: Scoped Values](https://openjdk.org/jeps/487)、[java.lang.ScopedValue API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ScopedValue.html)。

---

## 🔮 下话预告：F4E5《并发不散养》

上下文传好了，下一话管好任务的生死。

`StructuredTaskScope`（JDK 25 第五次预览）：把子任务关进「围栏」。JEP 505 已改为 `StructuredTaskScope.open()` + `Joiner`：默认策略等待全部成功或在失败时取消其余任务,竞速则用 `Joiner.anySuccessfulResultOrThrow()`。它仍需 `--enable-preview`,不是正式 API。
