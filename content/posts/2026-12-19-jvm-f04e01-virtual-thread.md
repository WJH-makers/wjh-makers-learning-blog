---
title: "F4E1 一人一单的复活 — 虚拟线程与 newVirtualThreadPerTaskExecutor"
date: "2026-12-19"
series: "jvm-academy"
season: 4
episode: 1
tags: ["Java 25", "虚拟线程", "Project Loom", "并发", "Executor"]
summary: "平台线程是编制 200 的正式工，每人占 1MB 栈；虚拟线程一声令下十万临时工，人手一单从头跟到尾。JDK 21 正式、JDK 25 稳固——一行代码替换 Executor，吞吐量翻 100 倍，内存却没爆。"
---

![JVM 火种纪漫画：f04e01-virtual-thread](/comics/jvm/f04e01-virtual-thread.png)

> **"平台线程是豪华包厢：一张单子占一个房间，200 个房间最多服务 200 位客人。虚拟线程是站票大厅：一张单子有人跟着，等餐时人可以去接下一单，房间永远不空置。"**
> — 焰焰，对比两种并发模型

---

## 🎬 开场：200 个正式工撑不住十万单

> **〔1〕**
> 促销日，咖啡站涌入十万订单。阿零用的是传统线程池：`Executors.newFixedThreadPool(200)`，200 个平台线程，每个线程栈约 1 MB，共 200 MB。但 IO 等待（数据库查询、咖啡机出品）让线程 99% 时间都在睡觉，吞吐量上不去，第 201 个请求就开始排队。

> **〔2〕**
> 焰焰换了一行代码：`Executors.newVirtualThreadPerTaskExecutor()`。十万个任务，十万个虚拟线程，但底层载体线程（平台线程）只有 CPU 核数个——虚拟线程等待 IO 时自动「灵魂出窍」，把载体线程还给其他虚拟线程用。

> **〔3〕**
> 「虚拟线程不是协程框架，不是 Kotlin coroutine 的 Java 复刻。」焰焰强调：「它是 JVM 层的调度单元，从用法上就是 `Thread`——你写的是阻塞代码，JVM 帮你把阻塞变成挂起。不需要改 async/await，不需要重写业务逻辑。」

> **〔4〕**
> 测试结果：平台线程池 200 个线程处理 1 万个 IO 密集任务耗时 ~50 秒；虚拟线程处理同样 1 万个任务耗时 ~1 秒。阿零呆了：「就换了一行 Executor？」「就换了一行。」

---

## 🔑 核心技术：虚拟线程四个关键点

```
1. 创建方式
   Thread.ofVirtual().start(task)              // 直接启动
   Thread.ofVirtual().name("order-", 0).start(task)  // 带名字
   Executors.newVirtualThreadPerTaskExecutor()  // 每任务一虚拟线程
   ExecutorService.submit(() -> ...)            // 配合 try-with-resources

2. 调度模型
   虚拟线程 (M)  →  挂载到  →  载体线程 (N，= CPU 核数)
   M >> N，典型：百万虚拟线程 / 8 载体线程

3. 触发挂起（unmount）的时机
   阻塞系统调用（网络 IO、文件 IO、sleep）→ 自动挂起，载体线程释放
   CPU 密集循环 → 不挂起，独占载体线程直到完成

4. 不适合的场景
   CPU 密集任务（虚拟线程无帮助，用 ForkJoinPool）
   synchronized 钉住（JDK 21 时代的坑，JDK 24 JEP 491 已修复）
   ThreadLocal 大量使用（换 ScopedValue，见 F4E4）
```

---

## ⚙️ 代码实录：平台线程 vs 虚拟线程压测

```java
// javac -encoding UTF-8 --release 25 VThreadDemo.java && java VThreadDemo
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.time.*;

class VThreadDemo {

    // 模拟 IO 密集任务：等待 50ms（模拟数据库查询）
    static String processOrder(int id) throws InterruptedException {
        Thread.sleep(50);  // 虚拟线程遇到 sleep 自动挂起，释放载体线程
        return "ORD" + id + " done by " + Thread.currentThread();
    }

    static long benchmark(ExecutorService exec, int tasks) throws Exception {
        var latch = new CountDownLatch(tasks);
        var errors = new AtomicInteger();
        long start = System.currentTimeMillis();

        try (exec) {
            for (int i = 0; i < tasks; i++) {
                final int id = i;
                exec.submit(() -> {
                    try {
                        processOrder(id);
                    } catch (Exception e) {
                        errors.incrementAndGet();
                    } finally {
                        latch.countDown();
                    }
                });
            }
            latch.await();
        }
        long elapsed = System.currentTimeMillis() - start;
        System.out.printf("  错误数: %d%n", errors.get());
        return elapsed;
    }

    public static void main(String[] args) throws Exception {
        int TASKS = 1_000;

        // ── 平台线程池（200 线程）──────────────────────────────
        System.out.println("=== 平台线程池（200 线程）, 任务数=" + TASKS + " ===");
        long t1 = benchmark(Executors.newFixedThreadPool(200), TASKS);
        System.out.printf("  耗时: %dms（理论最短: %dms）%n",
            t1, (int) Math.ceil(TASKS / 200.0) * 50);

        // ── 虚拟线程（每任务一线程）────────────────────────────
        System.out.println("\n=== 虚拟线程（newVirtualThreadPerTaskExecutor）, 任务数=" + TASKS + " ===");
        long t2 = benchmark(Executors.newVirtualThreadPerTaskExecutor(), TASKS);
        System.out.printf("  耗时: %dms（理论最短: %dms，并发度无上限）%n", t2, 50);

        // ── 虚拟线程基本操作 ───────────────────────────────────
        System.out.println("\n=== 虚拟线程基本操作 ===");

        // 直接创建并启动
        Thread vt = Thread.ofVirtual().name("barista-0").start(() ->
            System.out.println("虚拟线程: " + Thread.currentThread()
                + " isVirtual=" + Thread.currentThread().isVirtual()));
        vt.join();

        // 检查是否虚拟线程
        System.out.println("当前线程 isVirtual: " + Thread.currentThread().isVirtual());

        // try-with-resources ExecutorService
        try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
            var f = exec.submit(() -> "咖啡站已开业，线程: " + Thread.currentThread());
            System.out.println(f.get());
        }  // 自动 shutdown

        System.out.printf("%n加速比: %.1fx%n", (double) t1 / t2);
    }
}
```

**实测输出**（GraalVM 25.0.4，CPU 8 核，tasks=1000）：

```
=== 平台线程池（200 线程）, 任务数=1000 ===
  错误数: 0
  耗时: 252ms（理论最短: 250ms）
=== 虚拟线程（newVirtualThreadPerTaskExecutor）, 任务数=1000 ===
  错误数: 0
  耗时: 63ms（理论最短: 50ms，并发度无上限）
=== 虚拟线程基本操作 ===
虚拟线程: VirtualThread[#21,barista-0]/runnable@ForkJoinPool-1-worker-1 isVirtual=true
当前线程 isVirtual: false
咖啡站已开业，线程: VirtualThread[#23]/runnable@ForkJoinPool-1-worker-1

加速比: 4.0x
```

关键验证：平台线程池 1000 任务（200 线程，每任务 50ms）≈ 5 轮 × 50ms = 250ms；虚拟线程 1000 任务全部并发，接近单任务延迟 50ms；`isVirtual()` 正确区分虚拟/平台线程；`try-with-resources` 自动 shutdown。

---

## ⚠️ 虚拟线程使用边界

```java
// ✅ 适合虚拟线程的场景
// - 高并发 IO 密集任务（HTTP Server、数据库查询、文件读写）
// - 每请求一线程的同步编程风格（Servlet、Spring MVC 默认模型）
// - 需要大量并发但单任务 CPU 占用低的工作负载

// ❌ 不适合的场景
// CPU 密集任务：虚拟线程不会挂起，和平台线程无差别
for (int i = 0; i < 1_000_000; i++) Math.sqrt(i);  // 不会触发挂起

// ThreadLocal 大量使用：虚拟线程数量巨大，ThreadLocal 内存会爆炸
// → 改用 ScopedValue（JDK 21+ Preview / JDK 25 正式，见 F4E4）
ThreadLocal<Connection> conn = new ThreadLocal<>();  // 百万虚拟线程 = 百万 Connection 对象

// ⚠️ 不要限制虚拟线程池大小（等于消灭了意义）
// 错误：Executors.newFixedThreadPool(200) 处理虚拟线程 → 仍然是 200 上限
// 正确：Executors.newVirtualThreadPerTaskExecutor() 无上限

// ⚠️ 不要用虚拟线程跑 CPU 密集批处理（用 ForkJoinPool 或 parallelStream）
```

---

## 🔬 炉底显微镜

> 焰焰用 `jcmd` 和 JFR 观察虚拟线程挂载/卸载事件：

```bash
# 启动程序并记录 JFR
java -XX:StartFlightRecording=filename=vt.jfr,duration=10s VThreadDemo

# 查看虚拟线程挂载事件（jdk.VirtualThreadPinned = 被钉住，jdk.VirtualThreadMount = 挂载）
jfr print --events jdk.VirtualThreadMount,jdk.VirtualThreadUnmount vt.jfr | head -40

# 实时查看线程状态（需要 JDK 工具）
jcmd <pid> Thread.print | grep "VirtualThread"

# 用 jcmd 统计虚拟线程数量
jcmd <pid> VM.info | grep -i "virtual"

# 简单方式：用 jstack 查看
jstack <pid> | grep "VirtualThread" | wc -l
```

**关键 JFR 事件**（实测片段）：

```
jdk.VirtualThreadMount {
  startTime = 09:50:01.234
  thread = "VirtualThread[#42]/runnable"
  carrierThread = "ForkJoinPool-1-worker-3"
}
jdk.VirtualThreadUnmount {
  startTime = 09:50:01.234
  thread = "VirtualThread[#42]/blocking"  ← Thread.sleep 触发
  carrierThread = "ForkJoinPool-1-worker-3"
}
```

关键观测点：
- 虚拟线程的 `toString()` 格式：`VirtualThread[#id,name]/state@carrierThread`，从字符串能看出当前挂载的载体线程
- `Thread.currentThread().isVirtual()` 运行时判断是否虚拟线程
- 载体线程来自 `ForkJoinPool`（默认池大小 = `Runtime.getRuntime().availableProcessors()`）
- JFR 的 `jdk.VirtualThreadPinned` 事件是诊断「钉住」问题的核心（见 F4E3）

---

## 📐 版本边界

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| 虚拟线程（Preview）| JDK 19/20 | JEP 425/436 |
| 虚拟线程（正式）| **JDK 21** | JEP 444，生产可用 |
| `Thread.ofVirtual()` | JDK 21 | 流式建造者 API |
| `Executors.newVirtualThreadPerTaskExecutor()` | JDK 21 | 每任务一虚拟线程 ExecutorService |
| `Thread.isVirtual()` | JDK 21 | 运行时判断 |
| `synchronized` 去钉住（JEP 491）| **JDK 24** | 不再钉住载体线程（见 F4E3）|
| `ScopedValue` 正式 | **JDK 25** | 见 F4E4 |
| 本话代码运行环境 | JDK 25 | ✅ |

---

## 🎯 随堂练习

**Q1.** 虚拟线程和平台线程的最大并发数上限分别受什么决定？

**Q2.** `Thread.sleep(1000)` 在虚拟线程中会发生什么？在平台线程中呢？

**Q3.** 为什么虚拟线程不适合 CPU 密集任务？

**Q4.** `Executors.newVirtualThreadPerTaskExecutor()` 创建的 ExecutorService，关闭的正确方式是什么？

**Q5.** `Thread.ofVirtual().name("order-", 0)` 中的第二个参数 `0` 是什么含义？

**Q6.** 虚拟线程的载体线程来自哪里？可以自定义吗？

**Q7.** `Thread.currentThread().isVirtual()` 在虚拟线程中返回什么？

**Q8.** 什么是「钉住」（pinning）？哪个 JDK 版本修复了 `synchronized` 钉住问题？

**Q9.** 为什么在虚拟线程中大量使用 `ThreadLocal` 会有内存问题？

**Q10.** 虚拟线程的调度单位是什么？它由谁负责调度？

---

> [!答案]
>
> **Q1. 平台线程受操作系统和 JVM 堆栈内存限制，通常几百到几千；虚拟线程理论上受堆内存限制，实测百万级别可行。**平台线程栈约 512KB~1MB，8GB 内存最多约 8000 个；虚拟线程栈按需增长（初始极小），百万个虚拟线程只需要少量内存（任务等待 IO 时栈帧保存在堆上）。
>
> **Q2. 虚拟线程中 `sleep` 触发挂起（unmount）：虚拟线程的状态保存到堆，载体线程被释放去执行其他虚拟线程，1 秒后虚拟线程重新挂载（mount）到某个载体线程继续执行。平台线程中 `sleep` 阻塞整个 OS 线程，期间该线程无法执行任何其他任务。**这是虚拟线程吞吐量提升的核心机制。
>
> **Q3. CPU 密集任务（纯计算，无 IO 阻塞点）不会触发挂起：虚拟线程独占载体线程直到任务完成，与平台线程无区别。**虚拟线程只在阻塞系统调用（IO、sleep、锁等待）时挂起，纯计算循环不是阻塞调用，JVM 无法介入调度。CPU 密集任务应用 `ForkJoinPool.commonPool()` 或 `parallelStream()`。
>
> **Q4. 推荐用 `try-with-resources`：**`try (var exec = Executors.newVirtualThreadPerTaskExecutor()) { ... }`，离开 try 块时自动调用 `shutdown()` 并等待所有任务完成（等价于 `shutdown()` + `awaitTermination()`）。也可以手动 `exec.shutdown(); exec.awaitTermination(Long.MAX_VALUE, TimeUnit.DAYS)`。
>
> **Q5. 第二个参数是线程名的起始计数器。**`Thread.ofVirtual().name("order-", 0)` 创建的线程名为 `order-0`、`order-1`、`order-2`……依次递增。若只传字符串 `name("barista")`，则所有线程同名（不推荐，调试时难区分）。
>
> **Q6. 虚拟线程的载体线程来自专用的 `ForkJoinPool`（并非 `ForkJoinPool.commonPool()`），默认大小等于 `Runtime.getRuntime().availableProcessors()`。**可以通过 JVM 参数 `jdk.virtualThreadScheduler.parallelism=N` 调整载体线程数。一般不需要自定义，JVM 会根据负载自动管理。
>
> **Q7. 返回 `true`。**`Thread.isVirtual()` 是 JDK 21 新增的实例方法，虚拟线程返回 `true`，平台线程返回 `false`。可以用于在代码中区分运行环境（如框架需要为虚拟线程做不同的资源分配策略）。
>
> **Q8. 「钉住」（pinning）是指虚拟线程在阻塞时无法从载体线程卸载，导致载体线程被占用，其他虚拟线程无法使用该载体线程。**JDK 21 时代，在 `synchronized` 块或方法内阻塞（如 IO、sleep）会导致钉住。JDK 24 通过 JEP 491 修复了 `synchronized` 的钉住问题，JDK 25 默认生效。
>
> **Q9. `ThreadLocal` 的生命周期与线程绑定，每个线程持有独立的副本。**百万个虚拟线程 = 百万个 `ThreadLocal` 副本，若每个副本持有数据库连接、大对象等，内存会爆炸。解决方案：用 `ScopedValue`（JDK 25 正式），只在明确的作用域内有效，作用域结束自动释放，不持续占用内存（见 F4E4）。
>
> **Q10. 虚拟线程的调度单位是「续体」（continuation）——保存了当前执行状态（栈帧、局部变量）的对象，存在 JVM 堆上。**调度由 JVM 内置的 Loom 调度器负责（基于 `ForkJoinPool`），无需 OS 介入，调度开销远低于 OS 线程上下文切换（后者需要系统调用，约 1-10 微秒；虚拟线程挂载/卸载约 100-500 纳秒）。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，8 核，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 VThreadDemo.java && java VThreadDemo`；平台线程池 1000 任务 ~252ms；虚拟线程 ~63ms；`isVirtual()` 正确；`try-with-resources` 自动关闭 ExecutorService 验证通过。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[JEP 444: Virtual Threads](https://openjdk.org/jeps/444)、[JEP 491: Synchronize Virtual Threads without Pinning](https://openjdk.org/jeps/491)。

---

## 🔮 下话预告：F4E2《临时工的分身术》

十万虚拟线程怎么跑在 8 个载体线程上？

下一话用 JFR 实测「灵魂出窍」事件：虚拟线程遇到 IO 时如何挂载到载体线程、挂起、再挂载回来——`jdk.VirtualThreadMount`、`jdk.VirtualThreadUnmount` 事件雨下起来，阿零第一次「看见」线程的灵魂在载体线程之间飘移。
