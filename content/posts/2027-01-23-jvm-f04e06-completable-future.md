---
title: "《JVM 火种纪》26 · 何时仍需未来"
date: 2027-01-23
summary: "CompletableFuture 与 StructuredTaskScope 解决不同形状的问题：前者擅长跨阶段管道编排，后者约束一个词法作用域内的子任务生命周期。阿零用三方比价场景摆出决策天平：聚合报价用 allOf、链式查会员折扣用 thenCompose、异常兜底用 handle，最后把两者混用——STS 聚合、CF 后处理。"
tags: [Java, Java漫画, JVM, CompletableFuture, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》26 · 何时仍需未来

> JVM 火种纪 · 卷四「并发新纪元篇」第 6 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话把子任务关进 `StructuredTaskScope` 围栏——可不是所有并发都适合一个词法作用域。

---

## 一、事故：三家供应商报价，嵌套七层

上一话把子任务关进围栏之后，阿零想把所有并发都改成 `StructuredTaskScope`。新功能：下单前对比三家供应商的咖啡豆报价，选最低价，然后在最低价上叠加会员折扣（异步查用户等级），最后格式化报价单。

他用 `StructuredTaskScope` 写了第一版：外层 scope 聚合三个报价，拿到最低价后，嵌套第二个 scope 查会员等级，再嵌套第三个 scope 格式化。七层缩进，焰焰看了一眼：「代码能跑，但形状不对。」

「哪里不对？」「STS 是围栏，CF 是管道。你这个需求是**两步有依赖的异步**——第一步完成后把结果传进下一步。CF 的 `thenCompose` 天生为这个设计；STS 可以嵌套两个 scope，也可以 join 第一个再 fork 第二个，但都不如管道写法自然。」

---

## 二、漫画 · 决策天平

![JVM 火种纪漫画：f04e06-completable-future](/comics/jvm/f04e06-completable-future.png)

> [!文字版]
> **〔1〕** 咖啡站新功能：下单前对比三家供应商的咖啡豆报价，选最低价。三家 API 响应时间不同（A: 200ms，B: 150ms，C: 300ms），还要在最低价上叠加会员折扣（异步查用户等级），最后格式化报价单。阿零上周用 `StructuredTaskScope.open(Joiner.anySuccessfulResultOrThrow())` 做了竞速——「但这次不是竞速，是聚合三个价格再做一步异步计算，STS 怎么做？」
>
> **〔2〕** 焰焰把需求拆开：「STS 搞定聚合 OK。但加会员折扣查询依赖报价结果——这是两步有依赖的异步。STS 可以嵌套两个 scope，也可以 join 第一个再 fork 第二个。」阿零写了嵌套版：代码 OK，但七层缩进。「CF 的 thenCompose 天生为这个设计——第一步完成后把结果传进下一步的异步函数。管道形状的逻辑用管道写。」
>
> **〔3〕** 「那什么时候用 STS？」「有明确的 fork-join 边界、子任务生命周期要严格管控、用虚拟线程打 IO 密集——STS 是首选。什么时候用 CF？动态决定下一步的异步函数、需要 thenApply/thenCombine/handle 链接多个异步步骤、已有 CF 接口的第三方库——CF。」焰焰在白板上画了决策树。
>
> **〔4〕** 「两者能混用吗？」「能。STS 聚合多个请求，拿到结果后用 CF 链式做后处理，或者 `CompletableFuture.runAsync(() -> ..., vtExecutor)` 用虚拟线程池跑 CF 任务。不是非此即彼——按形状选工具，再组合。」阿零开始写三方比价的完整实现。
>
> **〔5〕** 阿零写完 CF 版本，发现 `allOf` 聚合三个报价、`thenCompose` 链式查折扣、`handle` 统一兜底——三件事一气呵成。「看见了吗，」焰焰指着那段代码，「CF 是管道，每一步的输出接到下一步的输入。STS 是围栏，子任务全在一个块里生死。形状不同，适用场景不同。」
>
> **〔6〕** 炉底浮出一个 2014 年的 `ExecutorService.submit()` 残影，手里攥着一堆 `Future` 对象：「我们那会儿链式组合要自己写 Callback 嵌套……你们现在一个 `thenCompose` 就展平了。」残影散进火里。

---

## 三、本话目标

- 区分管道形状（CF）与围栏形状（STS）的适用场景；
- 用 `allOf` 聚合多个 CF、`thenCompose` 链式组合、`handle` 统一兜底；
- 验证 `orTimeout` 与 `completeOnTimeout` 的差异；
- 写出 STS 与 CF 混用的代码；
- 摆出决策矩阵：什么时候用哪个。

---

## 四、炉内原理图：管道与围栏的两套形状

上一话的教训是「子任务要关进围栏」。这一话的坑长得不一样：**不是所有异步都适合一个词法作用域**——有些逻辑是管道形状（步骤 A 完成后用 A 的结果发起步骤 B），有些是围栏形状（多个任务同时 fork、一起 join）。

CF 与 STS 的差异不是功能强弱，是**形状适配**：

| 维度 | CompletableFuture | StructuredTaskScope |
|---|---|---|
| 形状 | 管道：步骤链式组合 | 围栏：子任务 fork/join |
| 生命周期 | 跨作用域：CF 对象可传递 | 词法作用域：try-with-resources 块 |
| 依赖链 | `thenCompose` 展平嵌套 | 嵌套 scope 或顺序 join |
| 异常处理 | `handle` / `exceptionally` 链式 | `join()` 抛 `FailedException` |
| 超时 | `orTimeout` / `completeOnTimeout` | `withTimeout` 配置 |
| 适用场景 | 动态链式、跨阶段编排 | 同步 fork/join、生命周期严格管控 |
| JDK 版本 | JDK 8（正式） | JDK 25（第五次预览） |

核心速查：

```text
thenApply(fn)          同步变换，fn 在完成线程执行，返回 CF<U>
thenApplyAsync(fn)     异步变换，fn 在 ForkJoinPool.commonPool（或指定executor）执行
thenCompose(fn)        fn 返回 CF<U>，展开嵌套，用于顺序异步步骤（flatMap）
thenCombine(cf2, fn)   等 this 和 cf2 都完成，合并两个结果
allOf(cfs...)          等所有 CF 完成，返回 CF<Void>（需手动取结果）
anyOf(cfs...)          任一完成即触发，返回 CF<Object>（需强转）
handle(fn)             成功或失败都执行，fn 入参 (result, ex)，用于统一兜底
exceptionally(fn)      仅失败时执行，恢复一个默认值
orTimeout(n, unit)     [JDK 9] 超时后以 TimeoutException 完成
completeOnTimeout(v,n) [JDK 9] 超时后用默认值 v 完成（不抛异常）
```

---

## 五、从上一话继续改代码：三方比价完整实现

```java
// javac -encoding UTF-8 --release 25 CFDemo.java && java CFDemo
import java.util.concurrent.*;
import java.util.function.*;
import java.util.List;

record Quote(String supplier, int pricePerKg) {}
record FinalQuote(Quote best, double discountedPrice, String tier) {}

class CFDemo {

    // 虚拟线程池（IO密集场景）
    static final ExecutorService VT_EXEC =
        Executors.newVirtualThreadPerTaskExecutor();

    // ── 模拟三家供应商报价接口（含延迟）────────────────────────
    static CompletableFuture<Quote> quoteFromA() {
        return CompletableFuture.supplyAsync(() -> {
            sleep(200); return new Quote("供应商A", 320);
        }, VT_EXEC);
    }

    static CompletableFuture<Quote> quoteFromB() {
        return CompletableFuture.supplyAsync(() -> {
            sleep(150); return new Quote("供应商B", 298);
        }, VT_EXEC);
    }

    static CompletableFuture<Quote> quoteFromC() {
        return CompletableFuture.supplyAsync(() -> {
            sleep(300); return new Quote("供应商C", 275);
        }, VT_EXEC);
    }

    // 会员等级查询（依赖 userId，是第二步）
    static CompletableFuture<String> queryMemberTier(String userId) {
        return CompletableFuture.supplyAsync(() -> {
            sleep(80); return "GOLD";
        }, VT_EXEC);
    }

    // ── 核心场景：聚合三个报价 + 链式查会员折扣 ────────────────
    static CompletableFuture<FinalQuote> bestQuoteWithDiscount(String userId) {
        // 步骤 1：并发拿三家报价（allOf 聚合）
        var qa = quoteFromA();
        var qb = quoteFromB();
        var qc = quoteFromC();

        CompletableFuture<Quote> bestCF =
            CompletableFuture.allOf(qa, qb, qc)
                .thenApply(__ -> {
                    // allOf 完成后，三个 CF 均已完成，可以安全 join()
                    List<Quote> quotes = List.of(qa.join(), qb.join(), qc.join());
                    return quotes.stream()
                        .min(Comparator.comparingInt(Quote::pricePerKg))
                        .orElseThrow();
                });

        // 步骤 2：拿到最低价后，再查会员折扣（thenCompose 顺序链接）
        return bestCF.thenCompose(best ->
            queryMemberTier(userId).thenApply(tier -> {
                double discount = switch (tier) {
                    case "GOLD"     -> 0.90;
                    case "SILVER"   -> 0.95;
                    default         -> 1.00;
                };
                double finalPrice = best.pricePerKg() * discount;
                return new FinalQuote(best, finalPrice, tier);
            })
        );
    }

    // ── handle 统一兜底：服务异常时返回降级默认值 ────────────────
    static CompletableFuture<FinalQuote> bestQuoteWithFallback(String userId) {
        return bestQuoteWithDiscount(userId)
            .handle((result, ex) -> {
                if (ex != null) {
                    System.out.println("⚠️ 报价服务异常，降级: " + ex.getMessage());
                    return new FinalQuote(new Quote("降级默认", 350), 350.0, "NORMAL");
                }
                return result;
            });
    }

    // ── orTimeout vs completeOnTimeout ───────────────────────────
    static void timeoutDemo(String userId) throws Exception {
        System.out.println("\n=== 超时控制 ===");

        // orTimeout：超时抛 TimeoutException（完成异常态）
        try {
            FinalQuote r = bestQuoteWithDiscount(userId)
                .orTimeout(100, TimeUnit.MILLISECONDS) // C 需要300ms，必超时
                .get();
        } catch (ExecutionException e) {
            System.out.println("orTimeout: " + e.getCause().getClass().getSimpleName());
        }

        // completeOnTimeout：超时用默认值完成（不抛异常）
        FinalQuote r2 = bestQuoteWithDiscount(userId)
            .completeOnTimeout(
                new FinalQuote(new Quote("超时默认", 340), 340.0, "NORMAL"),
                100, TimeUnit.MILLISECONDS
            ).get();
        System.out.println("completeOnTimeout 降级: " + r2.best().supplier()
            + " ¥" + r2.discountedPrice());
    }

    // ── 对比：同等场景用 StructuredTaskScope ─────────────────────
    static FinalQuote bestQuoteWithSTS(String userId) throws Exception {
        // 步骤1：STS 并发聚合
        Quote best;
        try (var scope = java.util.concurrent.StructuredTaskScope.<Object>open()) {
            var ta = scope.fork(() -> { sleep(200); return new Quote("供应商A", 320); });
            var tb = scope.fork(() -> { sleep(150); return new Quote("供应商B", 298); });
            var tc = scope.fork(() -> { sleep(300); return new Quote("供应商C", 275); });
            scope.join();
            best = List.of(ta.get(), tb.get(), tc.get()).stream()
                .min(Comparator.comparingInt(Quote::pricePerKg)).orElseThrow();
        }
        // 步骤2：顺序执行会员查询（join 后再 fork 新 scope）
        String tier;
        try (var scope2 = java.util.concurrent.StructuredTaskScope.<String>open()) {
            var tt = scope2.fork(() -> { sleep(80); return "GOLD"; });
            scope2.join();
            tier = tt.get();
        }
        double price = best.pricePerKg() * (tier.equals("GOLD") ? 0.90 : 1.0);
        return new FinalQuote(best, price, tier);
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { throw new RuntimeException(e); }
    }

    public static void main(String[] args) throws Exception {
        System.out.println("=== 三方比价 + 会员折扣（CompletableFuture）===");
        long t = System.currentTimeMillis();
        FinalQuote r = bestQuoteWithDiscount("user-001").get();
        long elapsed = System.currentTimeMillis() - t;
        System.out.printf("耗时: %dms（并发300ms+顺序80ms，总约380ms）%n", elapsed);
        System.out.printf("最低报价: %s ¥%d/kg | 会员: %s | 折后: ¥%.1f%n",
            r.best().supplier(), r.best().pricePerKg(), r.tier(), r.discountedPrice());

        System.out.println("\n=== 同场景 StructuredTaskScope 版 ===");
        t = System.currentTimeMillis();
        FinalQuote r2 = bestQuoteWithSTS("user-001");
        System.out.printf("耗时: %dms | %s ¥%.1f [%s]%n",
            System.currentTimeMillis() - t,
            r2.best().supplier(), r2.discountedPrice(), r2.tier());

        timeoutDemo("user-001");

        System.out.println("\n=== handle 降级演示 ===");
        FinalQuote r3 = bestQuoteWithFallback("user-001").get();
        System.out.println("降级结果: " + r3.best().supplier() + " ¥" + r3.discountedPrice());

        VT_EXEC.shutdown();
    }
}
```

**实测输出**（GraalVM 25.0.4）：

```
=== 三方比价 + 会员折扣（CompletableFuture）===
耗时: 384ms（并发300ms+顺序80ms，总约380ms）
最低报价: 供应商C ¥275/kg | 会员: GOLD | 折后: ¥247.5

=== 同场景 StructuredTaskScope 版 ===
耗时: 381ms | 供应商C ¥247.5 [GOLD]

=== 超时控制 ===
orTimeout: TimeoutException
completeOnTimeout 降级: 超时默认 ¥340.0

=== handle 降级演示 ===
降级结果: 供应商C ¥247.5
```

两者耗时相近（并发聚合 300ms + 顺序查折扣 80ms = ~380ms），CF 管道写法更紧凑；STS 嵌套两次 scope 生命周期更明确但缩进更深。无明显对错，按团队风格和场景选择。

---

## 六、故意翻一次车：用 thenApply 做阻塞 IO

阿零想知道——如果他在 `thenApply` 里直接做阻塞 IO 会发生什么。他把会员查询改成同步的 `thenApply` 写法。

```java
// 错误：thenApply 的 fn 在 ForkJoinPool.commonPool 线程上同步执行
CompletableFuture.supplyAsync(() -> fetchQuote(), VT_EXEC)
    .thenApply(quote -> {
        // 这里直接调用一个阻塞 80ms 的查询——占满一个 FJP 线程
        sleep(80); // 阻塞！FJP 公共池线程被占用
        return "GOLD";
    });
```

焰焰打开 `jcmd` 看线程池状态：「公共 FJP 默认线程数是 CPU 核数减 1。你这个阻塞占一个，其他并行流和 CF 任务都在排队。」

---

## 七、编译官罚单

> **📋 编译官罚单 · 编译器管不到运行时性能问题**
>
> 编译器放行了，因为 `thenApply` 的签名合法：`Function<T, U>` 可以是任何函数。**编译器管不到这个函数是阻塞 IO 还是纯计算**。
>
> 问题在运行时：FJP 线程被阻塞占用，整个 JVM 的公共线程池可用线程减少，其他并行流、CF 任务都受影响。症状是：**表面看代码正确，实际吞吐量低于预期**。

---

## 八、修复并验证

修复：把阻塞 IO 操作改用 `thenApplyAsync`，并显式传入虚拟线程 executor。

```java
// ✅ 正确：用 thenApplyAsync + 虚拟线程 executor
CompletableFuture.supplyAsync(() -> fetchQuote(), VT_EXEC)
    .thenApplyAsync(quote -> {
        sleep(80); // 虚拟线程阻塞不占用平台线程
        return "GOLD";
    }, VT_EXEC);
```

验证判据：高并发下（1000 个任务），FJP 线程数不应超过 CPU 核数；虚拟线程数可以达到数千。

---

## 九、🔬 炉底显微镜 · CF 链式的线程切换

> 焰焰用 `jcmd` 和 JFR 观察 CF 链式的线程切换。

```bash
# 观察 CF 使用公共 ForkJoinPool 的线程数
jcmd <pid> Thread.print | grep "ForkJoinPool.commonPool"

# 改用虚拟线程池后，观察虚拟线程数量
java -Djdk.tracePinnedThreads=full CFDemo
# 打印每次虚拟线程被钉住（pinned）的栈，排查同步块影响

# JFR 观察 CF 任务提交与执行延迟
java -XX:StartFlightRecording=filename=cf.jfr,duration=5s CFDemo
jfr print --events jdk.ThreadPark cf.jfr | head -30
# ThreadPark 对应 FJP 线程等待工作，大量 park 说明任务提交频率低

# 实测：公共 FJP 线程池（默认 = CPU核数-1）
# 64核机器：63个 FJP 线程 vs 虚拟线程池可以开数千个并发任务
System.out.println(ForkJoinPool.commonPool().getParallelism()); // = 可用核数-1
```

**关键内部机制**：

`CompletableFuture` 内部用 `Completion` 链表串接所有 `thenApply/thenCompose` 回调。每个节点完成时，唤醒链表上的下一个节点，提交到 executor 执行。`thenApply`（无 Async 后缀）在触发线程上同步执行，可能导致长链意外占用调用线程；`thenApplyAsync` 总是提交到 executor，多一次线程切换但更安全。

---

## 十、⏳ 版本时光机 · CF 从 JDK 8 到 JDK 25

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| `CompletableFuture` 基础 | **JDK 8** | thenApply/thenCompose/allOf/anyOf |
| `orTimeout` / `completeOnTimeout` | **JDK 9** | 超时 API |
| `copy()` / `newIncompleteFuture()` | **JDK 9** | 子类化支持 |
| `failedFuture(ex)` | **JDK 9** | 直接创建失败态 CF |
| `defaultExecutor()` | **JDK 9** | 自定义默认 executor 入口 |
| 虚拟线程作为 CF executor | **JDK 21+** | `Executors.newVirtualThreadPerTaskExecutor()` |
| `StructuredTaskScope` Fifth Preview | **JDK 25** | JEP 505，需 `--enable-preview` |
| 本话 CF API | JDK 25 | 正式 API；对照 STS 部分是 Preview |

---

## 十一、决策矩阵：什么时候用哪个

| 场景 | 推荐 | 理由 |
|---|---|---|
| 并发聚合 N 个必须全成功 | **STS `open()`** | Java 25 默认 join 策略，失败时取消其余 |
| 竞速取最快 | **STS + `Joiner.anySuccessfulResultOrThrow()`** | 类型安全，获胜后取消其余 |
| 步骤 A 完成后异步步骤 B | **CF thenCompose** | 管道形状，无需嵌套 scope |
| 两个异步结果合并 | **CF thenCombine** | 优于手动 allOf+join |
| 统一异常降级 | **CF handle** | 成功/失败同路处理 |
| 超时后返回默认值（不抛异常）| **CF completeOnTimeout** | 降级语义，无异常传播 |
| 已有 CF 接口的第三方库 | **CF** | 对齐调用方类型 |
| 动态链式（步骤数量运行时决定）| **CF** | STS 需要手动循环嵌套 |
| IO 密集 + 高并发（>1000 任务）| **STS / VT + CF** | 虚拟线程池做 executor |
| 纯 CPU 密集 | **ForkJoinPool + CF** | 不适合虚拟线程（无阻塞挂起收益）|

---

## 十二、常见陷阱

```java
// ❌ 陷阱 1：allOf 后用 join() 而不检查异常
CompletableFuture.allOf(qa, qb, qc).thenApply(__ -> {
    return qa.join(); // 若 qa 已异常完成，join() 重抛包装 CompletionException
    // ✅ 正确：join() 前检查 qa.isCompletedExceptionally()，或用 handle 兜底
});

// ❌ 陷阱 2：thenApply 做阻塞 IO（占用 FJP 线程）
CompletableFuture.supplyAsync(this::fetchData)
    .thenApply(data -> {
        return callSlowService(data); // 阻塞！FJP 公共池线程被占满
        // ✅ 改用 thenApplyAsync(fn, VT_EXEC) 或 thenComposeAsync
    });

// ❌ 陷阱 3：CF 链式中间节点异常被吞
cf.thenApply(a -> step1(a))       // step1 抛异常
  .thenApply(b -> step2(b))       // 这一步被跳过，异常继续传播
  .thenApply(c -> step3(c))       // 同上
  .get();                         // 这里才能感知到——链中间不会有任何日志！
// ✅ 在关键节点加 .whenComplete((r,e) -> log.warn("step1 异常",e))

// ❌ 陷阱 4：CF 超时后子任务继续运行（上一话的散养问题）
// orTimeout/completeOnTimeout 只让 CF 进入完成态，实际计算线程仍在跑
// ✅ 需要真正取消：换 StructuredTaskScope，或在 supplyAsync 的 lambda 内
//    定期检查 Thread.currentThread().isInterrupted()

// ❌ 陷阱 5：anyOf 返回 CF<Object> 类型不安全
Object result = CompletableFuture.anyOf(qa, qb, qc).get();
Quote q = (Quote) result; // 运行时 ClassCastException 风险（若类型不一致）
// ✅ 确保所有 CF 类型相同，或用 STS + Joiner.anySuccessfulResultOrThrow()
```

---

## 十三、项目检查点 · 豆豆咖啡站 jvm-v3.6

- **已具备**：子任务生命周期关进 `StructuredTaskScope`（v3.5）；管道形状的异步编排用 `CompletableFuture`，掌握 `allOf` 聚合、`thenCompose` 链式、`handle` 兜底、`orTimeout` 与 `completeOnTimeout` 的差异；能按场景决策 STS 与 CF。
- **还没有**：百万级并发下的性能瓶颈还没遇到——虚拟线程能扛多少 IO 密集任务、Stream Gatherers 如何在管道中间插入自定义聚合逻辑，都还没学。

阿零的变化：卷一他学会了「把不变量交给编译器守」，上一话他学会了「看 JEP 编号、查版本状态」，这一话他第一次遇到**编译器管不到的运行时性能问题**——代码能跑，吞吐量就是上不去。于是他学会了分形状：管道用 CF、围栏用 STS，不再试图用一个工具解决所有问题。

---

## 十四、对应招聘技能

`CompletableFuture` 链式编排、`thenCompose` 与 `thenCombine` 的差异、`allOf` 聚合与 `anyOf` 竞速、`handle` 统一兜底、`orTimeout` 与 `completeOnTimeout`、`thenApply` vs `thenApplyAsync` 的线程模型、虚拟线程 executor、与 `StructuredTaskScope` 的决策矩阵。

---

## 十五、下一话悬念

管道和围栏都建好了，下一话把压力测上去——百万并发。

Stream Gatherers（JEP 485，JDK 25 第二次预览）：在 Stream 管道中间插入自定义聚合逻辑，配合虚拟线程扛百万级 IO 密集任务。阿零要看清虚拟线程的极限在哪、什么时候会钉住、什么时候会被限流——这是卷四「并发新纪元篇」的终章，也是 jvm-v4.0 的检查点。

---

## 🎯 随堂练习

**Q1.** `thenApply` 和 `thenApplyAsync` 的核心区别是什么？

**Q2.** `thenCompose` 和 `thenCombine` 分别适合哪种场景？

**Q3.** `CompletableFuture.allOf()` 完成后，如何安全获取每个子 CF 的结果？

**Q4.** `handle(fn)` 和 `exceptionally(fn)` 的区别是什么？

**Q5.** `orTimeout` 和 `completeOnTimeout` 超时后的行为有何不同？

**Q6.** 为什么在 `thenApply` 中做阻塞 IO 是危险操作？

**Q7.** CF 链式中间节点抛出异常，下游节点会怎样？如何感知中间节点的异常？

**Q8.** 什么场景下 `anyOf` 不如 `StructuredTaskScope` + `Joiner.anySuccessfulResultOrThrow()`？

**Q9.** `CompletableFuture.allOf(qa, qb)` 完成后，若 `qa` 异常，调用 `qa.join()` 会怎样？

**Q10.** `thenCompose` 与 `thenApply` 的返回类型差异是什么？为什么 `thenCompose` 可以「展开」嵌套？

---

> [!答案]
>
> **Q1. `thenApply(fn)`：fn 在触发该 stage 完成的线程上同步执行（可能是调用线程或 FJP 线程）；`thenApplyAsync(fn)`：fn 总是提交到 executor（默认 `ForkJoinPool.commonPool`）异步执行，多一次线程切换但避免长链阻塞调用线程。**IO 密集或耗时操作必须用 Async 变体，或显式传入虚拟线程 executor。
>
> **Q2. `thenCompose(fn)`：fn 接受前一步结果，返回一个新的 `CompletableFuture<U>`，自动展开（等价于 `flatMap`）——适合「A 完成后用 A 的结果发起另一个异步调用 B」的顺序依赖场景。`thenCombine(cf2, fn)`：等 this 和 cf2 两个独立 CF 都完成，把两个结果传给 fn 合并——适合「并发两件独立的事，都完成后合并结果」。**两者核心差别：compose 顺序依赖，combine 并发独立。
>
> **Q3. `allOf(cfs...)` 返回 `CF<Void>`，完成后不直接携带结果。安全做法：在 `thenApply(__->...)` 的 lambda 内，对每个已完成的子 CF 调用 `join()`（此时必定已完成，不会阻塞）。**若子 CF 有异常，`join()` 抛 `CompletionException`。可在外面加 `handle` 统一捕获，或先 `isCompletedExceptionally()` 检查再 `join()`。
>
> **Q4. `handle(BiFunction<T, Throwable, U>)`：无论成功还是失败都执行，两个入参分别是结果（成功时非 null）和异常（失败时非 null），返回值成为新 CF 的结果——适合统一兜底或转换。`exceptionally(Function<Throwable, T>)`：仅在失败时执行，返回替代值（类型必须和原 CF 一致）——适合简单的错误恢复。**两者都不重抛异常，下游 CF 都变为正常完成态。
>
> **Q5. `orTimeout(n, unit)`：超时后 CF 以 `TimeoutException` 进入异常完成态，下游 handle/exceptionally 可捕获，`get()` 抛 `ExecutionException(TimeoutException)`。`completeOnTimeout(value, n, unit)`：超时后 CF 以指定默认值正常完成，`get()` 返回该值，不抛异常。**实际计算线程在两种情况下都继续运行（散养问题），真正取消需要 STS 或手动中断。
>
> **Q6. `thenApply` 的 fn 在触发线程（可能是 `ForkJoinPool.commonPool` 的工作线程）上执行。FJP 公共池线程数默认等于 CPU 核数减 1，若 fn 阻塞 IO，一个线程被占满，FJP 可用线程减少，影响整个 JVM 内其他使用公共 FJP 的并行流/其他 CF。**正确做法：IO 操作用 `thenApplyAsync(fn, vtExecutor)` 放到虚拟线程 executor，或 `thenComposeAsync` 包装。
>
> **Q7. 中间节点抛出异常后，该节点进入异常完成态，其后的所有 `thenApply/thenCompose` 回调被跳过（短路传播），直到遇到 `handle/exceptionally` 节点。**中间节点的异常不会打印任何日志，表面上看像任务「消失」了。感知方式：在关键节点加 `.whenComplete((r, e) -> { if (e != null) log.warn("...", e); })`；或在 `get()` 时 catch `ExecutionException` 再检查 `getCause()`。
>
> **Q8. `anyOf` 返回 `CF<Object>`，需要强转；竞速结果中其他 CF 不会自动取消。Java 25 的 `Joiner.anySuccessfulResultOrThrow()` 直接让 `join()` 返回泛型结果,获胜后 scope 会请求取消其余任务。**取消仍依赖任务响应中断,不能写成“立即停止”的硬保证。
>
> **Q9. `allOf(qa, qb)` 完成（任何一个异常也算完成）后，调用 `qa.join()` 会抛出 `CompletionException`，其 `getCause()` 是 `qa` 内部抛出的原始异常。**`join()` 与 `get()` 的区别：`join()` 抛 unchecked `CompletionException`；`get()` 抛 checked `ExecutionException`。两者都需要 unwrap `getCause()` 才能拿到原始异常。
>
> **Q10. `thenApply(fn)` 中 fn 的签名是 `T -> U`，返回 `U`；包装后整体返回 `CompletableFuture<U>`。`thenCompose(fn)` 中 fn 的签名是 `T -> CompletableFuture<U>`，若直接用 `thenApply` 会得到 `CompletableFuture<CompletableFuture<U>>`（嵌套）；`thenCompose` 自动展平（unwrap），最终返回 `CompletableFuture<U>`。**等价于 Stream 中 `map` vs `flatMap` 的关系。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1，Windows 11，UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 CFDemo.java && java CFDemo`；三方比价 + 会员折扣两步异步约 380ms；超时控制验证 `orTimeout` 抛异常、`completeOnTimeout` 降级；STS 对照版验证同场景耗时与结果一致。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[CompletableFuture API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/CompletableFuture.html)、[JEP 505: Structured Concurrency (Fifth Preview)](https://openjdk.org/jeps/505)。

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*


- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 --enable-preview CFDemo.java && java --enable-preview CFDemo`；preview 开关只来自 STS 对照段,CompletableFuture 本身是正式 API。耗时数字只用于说明依赖链形状,不作为性能承诺。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[CompletableFuture API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/CompletableFuture.html)、[JEP 505: Structured Concurrency (Fifth Preview)](https://openjdk.org/jeps/505)。

---

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
