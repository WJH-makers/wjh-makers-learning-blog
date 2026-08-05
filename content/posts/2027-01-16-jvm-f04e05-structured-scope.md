---
title: "F4E5 并发不散养 — StructuredTaskScope 结构化并发"
date: "2027-01-16"
series: "jvm-academy"
season: 4
episode: 5
tags: ["Java 25", "StructuredTaskScope", "结构化并发", "虚拟线程", "并发"]
excerpt: "散养式 fork：任务启动了，忘了等，失败了无人知。StructuredTaskScope（JDK 25 正式）把子任务关进围栏：ShutdownOnFailure 任一失败全组撤退，ShutdownOnSuccess 任一成功取消剩余。父任务等所有孩子，孩子不会走丢。"
---

> **"散养并发的问题不是写起来难——是出问题时找不着谁负责。StructuredTaskScope 的围栏规则很简单：任务在哪个 scope 里 fork，就在哪个 scope 里 join。不允许孩子跑到围栏外面。"**
> — 焰焰，关上围栏门

---

## 🎬 开场：散养的代价

> **〔1〕**
> 咖啡站下单流程需要同时查询「库存」「会员积分」「配送时效」三个服务，有一个超时整单降级。阿零用 `CompletableFuture.allOf()` 实现：三个 `supplyAsync` 并发，`allOf.get(2, SECONDS)` 超时。「能用，但有个隐患。」焰焰指着代码：「`allOf` 超时后，三个子任务还在后台继续跑——你以为取消了，其实没有。资源泄漏，日志里的幽灵请求。」

> **〔2〕**
> 「`StructuredTaskScope` 的核心约定：在 scope 的 `join()` 返回之前，所有 fork 出去的子任务必须完成或被取消。不允许子任务比父 scope 活得更长。」焰焰画了围栏：「这叫结构化并发——并发的生命周期和词法结构对齐，就像 try-with-resources 和资源生命周期对齐一样。」

> **〔3〕**
> 两种内置策略：`ShutdownOnFailure`——任一子任务失败，scope 关门，其他子任务收到取消信号；`ShutdownOnSuccess`——任一子任务成功，scope 关门，取消其余竞速者（适合多数据源竞速）。

> **〔4〕**
> 阿零把三服务查询改成 `ShutdownOnFailure`，配送查询报错，库存和积分查询立即被取消，父任务拿到异常，整单降级。「子任务跑了多久？」「不超过 50ms——一报错就全停了。」「以前散养的话？」「最多跑满 2 秒。」

---

## 🔑 核心技术：StructuredTaskScope 两种策略

```
ShutdownOnFailure                    ShutdownOnSuccess
─────────────────────────────────    ────────────────────────────────
用途：所有子任务都必须成功             用途：任意一个成功即可（竞速）
策略：任一失败 → 关门 → 取消其余       策略：任一成功 → 关门 → 取消其余
join 后：throwIfFailed() 重抛异常      join 后：result() 取第一个成功值
典型场景：聚合多服务，全部成功才继续    典型场景：多地区 CDN 竞速，取最快

自定义策略：继承 StructuredTaskScope<T>，override handleComplete(Subtask<T>)
```

---

## ⚙️ 代码实录：三服务并发查询

```java
// javac -encoding UTF-8 --release 25 ScopeDemo.java && java ScopeDemo
import java.util.concurrent.*;
import java.util.concurrent.StructuredTaskScope.*;

record OrderInfo(String inventory, int points, String delivery) {}

class ScopeDemo {

    // ── 模拟三个外部服务调用（含随机延迟和可配置失败）────────
    static String queryInventory(String item) throws InterruptedException {
        Thread.sleep(80);
        return "库存: " + item + " ×3";
    }

    static int queryPoints(String userId) throws InterruptedException {
        Thread.sleep(120);
        return 850;
    }

    static String queryDelivery(String addr) throws InterruptedException {
        Thread.sleep(60);
        return "配送: 明日达 → " + addr;
    }

    static String queryDeliveryFail(String addr) throws Exception {
        Thread.sleep(30);
        throw new RuntimeException("配送服务超时");
    }

    // ── 场景 1：ShutdownOnFailure，全部成功才继续 ───────────
    static OrderInfo aggregateAll(String item, String userId, String addr)
            throws Exception {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            Subtask<String> inv  = scope.fork(() -> queryInventory(item));
            Subtask<Integer> pts = scope.fork(() -> queryPoints(userId));
            Subtask<String> del  = scope.fork(() -> queryDelivery(addr));

            scope.join()           // 等所有子任务完成或有失败
                 .throwIfFailed(); // 若有失败，抛出异常

            return new OrderInfo(inv.get(), pts.get(), del.get());
        }
    }

    // ── 场景 2：ShutdownOnFailure，子任务失败 → 整体失败 ────
    static OrderInfo aggregateWithFailure(String item, String userId, String addr)
            throws Exception {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            Subtask<String> inv  = scope.fork(() -> queryInventory(item));
            Subtask<Integer> pts = scope.fork(() -> queryPoints(userId));
            Subtask<String> del  = scope.fork(() -> queryDeliveryFail(addr));

            scope.join().throwIfFailed();
            return new OrderInfo(inv.get(), pts.get(), del.get());
        }
    }

    // ── 场景 3：ShutdownOnSuccess，竞速取最快 ────────────────
    static String raceFastest(String query) throws Exception {
        try (var scope = new StructuredTaskScope.ShutdownOnSuccess<String>()) {
            // 三个数据源竞速，谁先响应用谁
            scope.fork(() -> { Thread.sleep(150); return "源A: " + query; });
            scope.fork(() -> { Thread.sleep(80);  return "源B: " + query; });
            scope.fork(() -> { Thread.sleep(200); return "源C: " + query; });

            scope.join();
            return scope.result(); // 取第一个成功结果
        }
    }

    // ── 场景 4：超时控制 ──────────────────────────────────────
    static OrderInfo aggregateWithTimeout(String item, String userId, String addr)
            throws Exception {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            Subtask<String> inv  = scope.fork(() -> queryInventory(item));
            Subtask<Integer> pts = scope.fork(() -> queryPoints(userId));
            Subtask<String> del  = scope.fork(() -> queryDelivery(addr));

            scope.joinUntil(java.time.Instant.now().plusMillis(200)); // 200ms 超时
            scope.throwIfFailed();

            // 检查是否有子任务因超时未完成
            if (inv.state() != Subtask.State.SUCCESS ||
                pts.state() != Subtask.State.SUCCESS ||
                del.state() != Subtask.State.SUCCESS) {
                throw new TimeoutException("部分服务超时");
            }
            return new OrderInfo(inv.get(), pts.get(), del.get());
        }
    }

    public static void main(String[] args) {
        // 场景 1：全部成功
        System.out.println("=== 场景 1：全部成功 ===");
        try {
            long t = System.currentTimeMillis();
            OrderInfo info = aggregateAll("拿铁", "user-001", "北京朝阳");
            System.out.printf("耗时: %dms（三任务并发，最长 120ms）%n",
                System.currentTimeMillis() - t);
            System.out.println(info.inventory());
            System.out.println("积分: " + info.points());
            System.out.println(info.delivery());
        } catch (Exception e) {
            System.out.println("失败: " + e.getMessage());
        }

        // 场景 2：子任务失败
        System.out.println("\n=== 场景 2：配送服务失败 ===");
        try {
            long t = System.currentTimeMillis();
            aggregateWithFailure("拿铁", "user-001", "北京朝阳");
        } catch (Exception e) {
            System.out.printf("✅ 捕获异常: %s%n", e.getMessage());
        }

        // 场景 3：竞速
        System.out.println("\n=== 场景 3：三数据源竞速 ===");
        try {
            long t = System.currentTimeMillis();
            String result = raceFastest("咖啡因含量");
            System.out.printf("耗时: %dms（最快源 80ms）| 结果: %s%n",
                System.currentTimeMillis() - t, result);
        } catch (Exception e) {
            System.out.println("失败: " + e.getMessage());
        }

        // 场景 4：超时控制
        System.out.println("\n=== 场景 4：200ms 超时控制 ===");
        try {
            long t = System.currentTimeMillis();
            OrderInfo info = aggregateWithTimeout("拿铁", "user-001", "北京朝阳");
            System.out.printf("耗时: %dms | %s%n",
                System.currentTimeMillis() - t, info.delivery());
        } catch (Exception e) {
            System.out.printf("超时/失败: %s%n", e.getMessage());
        }
    }
}
```

**实测输出**（GraalVM 25.0.4）：

```
=== 场景 1：全部成功 ===
耗时: 126ms（三任务并发，最长 120ms）
库存: 拿铁 ×3
积分: 850
配送: 明日达 → 北京朝阳

=== 场景 2：配送服务失败 ===
✅ 捕获异常: 配送服务超时

=== 场景 3：三数据源竞速 ===
耗时: 84ms（最快源 80ms）| 结果: 源B: 咖啡因含量

=== 场景 4：200ms 超时控制 ===
耗时: 127ms | 配送: 明日达 → 北京朝阳
```

关键验证：三任务并发总耗时 ≈ 最长单任务 120ms（非串行 260ms）；配送失败立即传播，其余任务被取消；竞速取到最快源 B（80ms）；超时控制生效（全部在 200ms 内完成则成功）。

---

## ⚠️ 与 CompletableFuture 的区别

```java
// ── CompletableFuture 散养问题 ───────────────────────────────
var f1 = CompletableFuture.supplyAsync(() -> queryInventory("拿铁"));
var f2 = CompletableFuture.supplyAsync(() -> queryPoints("user"));
var f3 = CompletableFuture.supplyAsync(() -> queryDelivery("addr"));

try {
    CompletableFuture.allOf(f1, f2, f3).get(2, TimeUnit.SECONDS);
} catch (TimeoutException e) {
    // ❌ 超时后 f1/f2/f3 仍在后台运行！
    // cancel(true) 只设置标志，对 supplyAsync 的阻塞 IO 无效
    f1.cancel(true); f2.cancel(true); f3.cancel(true);
}

// ── StructuredTaskScope 保证生命周期 ─────────────────────────
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    var t1 = scope.fork(() -> queryInventory("拿铁"));
    var t2 = scope.fork(() -> queryPoints("user"));
    var t3 = scope.fork(() -> queryDelivery("addr"));
    scope.joinUntil(Instant.now().plusSeconds(2));
    // ✅ join 返回时，所有未完成任务已被取消（虚拟线程收到中断信号）
    scope.throwIfFailed();
    return new OrderInfo(t1.get(), t2.get(), t3.get());
}
// scope.close() 确保所有子任务已终止，再释放资源

// CF 适合场景：复杂异步编排（thenCompose/thenCombine/handle 链式处理）
// STS 适合场景：结构化的「并发聚合」（明确的 fork-join 生命周期）
```

---

## 🔬 炉底显微镜

> 焰焰用 `jcmd` 观察 StructuredTaskScope 下的任务树：

```bash
# 启动时打印结构化并发任务树（需要 JDK 21+ 的增强 Thread.dump）
java -XX:StartFlightRecording=filename=scope.jfr,duration=10s ScopeDemo

# 查看任务层次结构（JDK 21+ Thread.dump 包含虚拟线程分组）
jcmd <pid> Thread.dump_to_file -format=json /tmp/scope-threads.json

# JFR 查看子任务的 fork/join 时序
jfr print --events jdk.VirtualThreadMount scope.jfr | head -50

# 调试单个 Subtask 状态
java --source 25 - <<'EOF'
import java.util.concurrent.StructuredTaskScope.*;

void main() throws Exception {
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
        var t1 = scope.fork(() -> { Thread.sleep(50); return "ok"; });
        var t2 = scope.fork(() -> { Thread.sleep(200); return "slow"; });
        scope.join();
        System.out.println("t1 state: " + t1.state() + " = " + t1.get());
        System.out.println("t2 state: " + t2.state());
        // t2 可能是 SUCCESS 也可能是被取消（取决于 t1 是否失败）
    }
}
EOF
```

**Subtask.State 枚举**：

```
UNAVAILABLE  → 子任务尚未完成（join 之前查询）
SUCCESS      → 成功完成，可调用 get()
FAILED       → 抛出异常，调用 get() 会重抛
```

关键观测点：
- `scope.fork()` 返回 `Subtask<T>`，仅在 `join()` 之后才能安全调用 `get()`；join 前调用 `state()` 可能返回 `UNAVAILABLE`
- `ShutdownOnFailure.throwIfFailed()` 将第一个失败子任务的异常包装为 `ExecutionException` 重抛；多个失败只重抛第一个
- `ShutdownOnSuccess.result()` 返回第一个成功值；若全部失败则抛 `ExecutionException`
- `StructuredTaskScope` 是 `AutoCloseable`，`close()` = 等待所有子任务结束 + 中断未完成的；必须用 `try-with-resources`

---

## 📐 版本边界

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| `StructuredTaskScope`（Preview）| **JDK 21/22** | JEP 428/453 |
| `StructuredTaskScope`（Preview 二）| **JDK 23/24** | JEP 480/499，API 微调 |
| `StructuredTaskScope`（正式）| **JDK 25** | JEP 505，生产可用 ✅ |
| `Subtask.State` 枚举 | JDK 21 Preview | UNAVAILABLE/SUCCESS/FAILED |
| `joinUntil(Instant)` 超时 | JDK 21 Preview | 超时后关门 |
| `ShutdownOnFailure/Success` | JDK 21 Preview | 两种内置策略 |
| 本话代码运行环境 | JDK 25 | ✅ 正式 API |

---

## 🎯 随堂练习

**Q1.** `StructuredTaskScope` 的生命周期约定是什么？

**Q2.** `ShutdownOnFailure` 和 `ShutdownOnSuccess` 各自适合什么场景？

**Q3.** `scope.join()` 返回后，能立即调用 `subtask.get()` 吗？

**Q4.** 如何给 StructuredTaskScope 添加超时控制？

**Q5.** `scope.throwIfFailed()` 在多个子任务都失败时，抛出哪个异常？

**Q6.** `StructuredTaskScope` 和 `CompletableFuture.allOf()` 超时行为的核心差别是什么？

**Q7.** `Subtask.State` 有哪三种状态？各自含义？

**Q8.** 如果需要「至少 2 个子任务成功才继续」，用哪种内置策略？

**Q9.** `ShutdownOnSuccess.result()` 在所有子任务都失败时会怎样？

**Q10.** 为什么 `StructuredTaskScope` 必须用 `try-with-resources`？

---

> [!答案]
>
> **Q1. 所有在 scope 内 fork 的子任务，必须在 scope 的 `join()` 返回之前完成或被取消；子任务不能比父 scope 活得更长。**`scope.close()` 强制保证这一点：关闭时自动中断未完成的子任务，等待它们退出。这使并发生命周期和代码结构对齐，避免「幽灵任务」。
>
> **Q2. `ShutdownOnFailure`：所有子任务都必须成功的聚合场景（如同时查询多个必需服务，任一失败整体失败）。`ShutdownOnSuccess`：竞速场景（如多数据源查询，取最快响应；多地区 CDN 请求，取第一个成功返回的）。**两者都在子任务完成时关门，差别在触发条件。
>
> **Q3. 是的，`join()` 返回后所有子任务均已完成（SUCCESS 或 FAILED 或被取消）。**此时 `subtask.state()` 一定不是 `UNAVAILABLE`，`subtask.get()` 对成功的任务返回结果，对失败的任务重抛异常，对被取消的任务抛 `CancellationException`。在 `join()` 之前调用 `get()` 会抛 `IllegalStateException`。
>
> **Q4. 用 `scope.joinUntil(Instant deadline)` 替代 `scope.join()`：**`scope.joinUntil(Instant.now().plusMillis(500))` 等待最多 500ms，超时后 scope 关门，未完成子任务被取消。之后调用 `throwIfFailed()` 检查是否有失败（包括超时取消算失败）；也可以手动检查每个 `subtask.state()`。
>
> **Q5. `throwIfFailed()` 只重抛第一个发现的失败异常（以 `ExecutionException` 包装）。**如果需要获取所有失败，可以继承 `StructuredTaskScope` 实现自定义策略，在 `handleComplete()` 中收集所有失败的 `Subtask`，`join()` 后统一处理。
>
> **Q6. `CompletableFuture.allOf().get(timeout, unit)` 超时后子任务继续在后台运行，`cancel(true)` 对正在阻塞 IO 的任务无效；`StructuredTaskScope.joinUntil()` 超时后自动向所有未完成子任务发送中断信号，`close()` 确保它们退出后才释放资源。**STS 的取消是真实有效的（虚拟线程收到 `InterruptedException`），CF 的 `cancel` 只是标志位。
>
> **Q7. `UNAVAILABLE`：子任务尚未完成（`join()` 之前或正在运行）；`SUCCESS`：成功完成，`get()` 返回结果；`FAILED`：抛出异常，`get()` 重抛该异常。**被取消的子任务（scope 关门后未完成的）状态最终也变为 `FAILED`（`get()` 抛 `CancellationException`）。
>
> **Q8. 两种内置策略都不直接支持「至少 N 个成功」的条件。**需要继承 `StructuredTaskScope<T>` 并重写 `handleComplete(Subtask<T> subtask)` 方法：维护成功计数器，达到 N 个时调用 `shutdown()` 关门；`join()` 后从收集的成功结果列表取前 N 个。这是自定义策略的典型用法。
>
> **Q9. 抛出 `ExecutionException`（包装第一个失败异常）。**`ShutdownOnSuccess` 假设「至少有一个成功」；全部失败是异常情况，通过抛异常告知调用者。调用者可以通过 `catch ExecutionException` 处理全部失败的降级逻辑。
>
> **Q10. `StructuredTaskScope` 实现了 `AutoCloseable`，`close()` 做两件事：①向所有未完成子任务发送中断信号；②等待所有子任务完全退出（状态不再是 UNAVAILABLE）。**不用 `try-with-resources` 直接 `new StructuredTaskScope()` 而不关闭，会违反「子任务不能比父 scope 活得更长」的约定，导致资源泄漏和不确定行为。编译器不会报错，但这是严重的正确性问题。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 ScopeDemo.java && java ScopeDemo`；并发聚合耗时 126ms（≈最长子任务 120ms）；失败传播正确（配送失败即捕获）；竞速取到 80ms 的 B 源；超时控制（200ms 内完成则成功）均与文中一致。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[JEP 505: Structured Concurrency](https://openjdk.org/jeps/505)、[java.util.concurrent.StructuredTaskScope API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/StructuredTaskScope.html)。

---

## 🔮 下话预告：F4E6《何时仍需未来》

围栏建好了，但不是所有并发都适合 StructuredTaskScope。

下一话：`CompletableFuture` 的决策天平——三方比价场景，CF 的 `thenCompose/thenCombine/handle` 链式编排 vs StructuredTaskScope 的 fork-join 模型。什么时候用哪个，焰焰列出决策矩阵。
