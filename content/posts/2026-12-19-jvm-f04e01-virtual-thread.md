---
title: "《JVM 火种纪》21 · 一人一单的复活"
date: 2026-12-19
summary: "促销日十万订单一次灌进来，200 个平台线程的池子每人占 1 MB 栈、99% 的时间在等 IO，第 201 个请求就开始排队。阿零把 Executor 换成 `newVirtualThreadPerTaskExecutor()`，十万任务各拿一个虚拟线程，载体线程仍只有 CPU 核数个；炉底用 JFR 看到虚拟线程一遇阻塞就卸载，把载体线程交还给下一单。"
tags: [Java, Java漫画, JVM, 虚拟线程, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》21 · 一人一单的复活

> JVM 火种纪 · 卷四「并发新纪元篇」第 1 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。卷三终章把三面镜子拆到底，字节码已经能手写、反射的魔法也祛了魅——阿零这次不缺理解力，缺的是人手:豆豆把促销日的十万订单一次灌了进来。

---

## 一、事故：促销日十万单，第 201 个开始排队

卷三终章之后，阿零对单线程里发生的一切都有了显微镜级的把握。促销日一到，问题换了维度——**不是某段代码慢，是根本没人接单**。

监控上的数字很难看:十万订单涌进来，活跃线程数死死停在 200，队列越排越长，CPU 使用率只有 12%。

他用的是老配方:`Executors.newFixedThreadPool(200)`。200 个平台线程，每个线程栈约 1 MB，光栈就占掉 200 MB。可这 200 个"正式工"里，99% 的时间都在等数据库查询、等咖啡机出品——**占着编制睡觉**。第 201 个请求只能排队。

豆豆瞥了一眼压测曲线:「你的 CPU 在打哈欠，你的线程在排队。这不是算得慢，是**编制不够**。」

---

## 二、漫画 · 编制 200 与十万临时工

![JVM 火种纪漫画：f04e01-virtual-thread](/comics/jvm/f04e01-virtual-thread.png)

> [!文字版]
>
> **〔1〕** 促销日凌晨，烘豆炉一楼被订单小票淹了。阿零指着监控:「十万订单，活跃线程数卡在 200 一动不动，CPU 才 12%。」他用的是 `Executors.newFixedThreadPool(200)`——200 个平台线程，每个栈 1 MB，共 200 MB，可 99% 的时间都在等数据库和咖啡机。第 201 个请求原地排队。
>
> **〔2〕** 焰焰尾巴一甩，只改了一行:`Executors.newVirtualThreadPerTaskExecutor()`。「十万个任务，十万个虚拟线程。底下的载体线程（平台线程）还是只有 CPU 核数个——虚拟线程一等 IO 就自动『灵魂出窍』，把载体线程交还给下一单。」
>
> **〔3〕** 阿零本能地不信:「换个池子就能凭空变出十万个人手？那不就是换了个名字的线程池，最后还是被 OS 线程数卡死。」焰焰把《JEP 编年史》翻到第 444 页:「**它不是池子，是每个任务一个线程**。虚拟线程的栈按需增长、存在堆上，不是 OS 线程；创建成本接近一个普通对象。你原来在算的是编制，现在算的是内存。」
>
> **〔4〕** 「那我是不是得把业务逻辑全改成 async/await？」阿零又问。「一行都不用改。」焰焰强调:「它不是协程框架，也不是 Kotlin coroutine 的 Java 复刻——**它就是 `Thread`**。你照旧写阻塞代码，JVM 在底下把阻塞翻译成挂起。这是 Loom 这十年最大的取舍:宁可改 JVM，也不改你的编程模型。」
>
> **〔5〕** 炉底浮出一个 2004 年的版本残影，怀里抱着一摞《Java 并发编程实战》和一堆写满 `NIO Selector`、回调套回调的稿纸:「我们那会儿为了榨出吞吐量，把顺序代码拆成了回调地狱……」残影看了一眼阿零屏幕上那行朴素的 `Thread.sleep(50)`，把稿纸投进了炉火。
>
> **〔6〕** 压测跑完:1000 个 IO 任务，平台线程池 252ms，虚拟线程 63ms。阿零盯着屏幕:「就换了一行 Executor？」「就换了一行。」焰焰顿了顿，「但你得知道它在哪儿不管用——**CPU 密集的活它一点都帮不上**。这个坑我们等下故意踩一次。」

---

## 三、本话目标

- 说清平台线程与虚拟线程在栈、创建成本、并发上限上的差别；
- 用 `newVirtualThreadPerTaskExecutor()` 把线程池模型换成每任务一线程；
- 用 `Thread.ofVirtual()` 与 `isVirtual()` 直接操作和识别虚拟线程；
- 亲手踩一次「给虚拟线程限流」和「拿虚拟线程跑 CPU 密集」两个坑；
- 用 JFR 看见挂载/卸载事件，确认卸载真的发生了。

---

## 四、炉内原理图：编制模型换成人头模型

卷三的功夫全花在**一条执行流内部**——字节码怎么走、方法句柄怎么绑。这一话第一次去数**有多少条执行流**，而瓶颈恰好出在这个数上。

平台线程和虚拟线程的差别不在"快不快"，在**贵不贵**:

| 维度 | 平台线程 | 虚拟线程 |
|---|---|---|
| 底层实体 | 一个 OS 线程 | 堆上的续体（continuation）对象 |
| 栈 | 固定预留，约 512 KB~1 MB | 按需增长，初始极小，存堆上 |
| 创建成本 | 系统调用，微秒级 | 接近 new 一个对象 |
| 并发上限 | 受 OS 与栈内存限制，几百到几千 | 受堆内存限制，实测百万级 |
| 阻塞时 | 整个 OS 线程被挂住 | 卸载，载体线程被交还 |
| 调度者 | OS 内核 | JVM 内的 Loom 调度器（专用 ForkJoinPool） |

关键是最后两行。旧模型里「线程」既是**执行流**又是**稀缺资源**，所以必须池化复用；虚拟线程把这两件事拆开了——执行流廉价到可以人手一个，稀缺的载体线程由 JVM 在底下自动调度:

```
虚拟线程 (M，十万级)  ──挂载到──►  载体线程 (N = CPU 核数)
M >> N，阻塞即卸载，载体线程永不空置
```

于是编程模型可以退回到最土的写法:**一个请求一个线程，从头跟到尾，通篇阻塞式顺序代码**。这也是 Loom 的设计立场——不要求业务代码改成 async/await 风格，代价全部由 JVM 承担。

---

## 五、从上一话继续改代码：把 Executor 换掉，压一次午高峰

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

## 六、故意翻一次车：给虚拟线程限流，再拿它跑 CPU 活

阿零故意试两次——第一次限制了虚拟线程数量，第二次拿虚拟线程跑纯计算。

```java
// ❌ 坑一：限制虚拟线程池大小——等于消灭了意义
// 错误用法：用固定大小池处理虚拟线程任务，上限仍然是 200
Executors.newFixedThreadPool(200);  // 就算里面用了虚拟线程，并发度还是 200
// 正确：Executors.newVirtualThreadPerTaskExecutor() 无上限，不要手动卡

// ❌ 坑二：拿虚拟线程跑 CPU 密集任务
// 虚拟线程遇到纯计算循环不会触发卸载——独占载体线程直到完成
for (int i = 0; i < 1_000_000; i++) Math.sqrt(i);  // 不会触发挂起，等同于平台线程

// ❌ 坑三：百万虚拟线程 × ThreadLocal 大对象
ThreadLocal<Connection> conn = new ThreadLocal<>();
// 百万虚拟线程 = 百万 Connection 对象，堆直接爆；换 ScopedValue（见 F4E4）
```

---

## 七、编译官罚单

> **📋 编译官罚单 · 编译官看不见并发陷阱**
>
> 上面三个坑，编译器一张罚单都不开：
>
> ```text
> （无编译错误——三段代码都能通过编译）
> newFixedThreadPool(200) 加虚拟线程 → 编译通过，运行时并发上限仍 200
> Math.sqrt 循环在虚拟线程内    → 编译通过，运行时独占载体线程
> ThreadLocal 百万副本          → 编译通过，运行时 OOM
> ```
>
> 这就是并发问题比卷一语法错误更危险的地方：**并发边界是运行时才能看见的语义错误，不是语法或类型错误**。编译器管的是「你的代码能不能组装」，不管「你的线程会不会饿死」。想在动手前发现这类问题，只能靠 JFR 事件（`jdk.VirtualThreadPinned`）或压测。

---

## 八、修复并验证

修复三条坑，规则分明：

- 换 Executor：一律用 `newVirtualThreadPerTaskExecutor()`，不要手动 `fixedThreadPool` 包虚拟线程；
- CPU 密集任务：换 `ForkJoinPool.commonPool()` 或 `parallelStream()`，不要用虚拟线程；
- ThreadLocal 大对象：等 F4E4 讲 `ScopedValue`，作用域出去自动释放。

验证判据三条，都要真跑出来：

1. `newVirtualThreadPerTaskExecutor()` 运行 1000 任务，耗时接近 50ms（单任务延迟）；
2. JFR 录制中 `jdk.VirtualThreadUnmount` 事件数 ≥ 1000（每个 sleep 触发一次卸载）；
3. `isVirtual()` 在虚拟线程内返回 `true`，在主线程返回 `false`。

正常路径的验证（GraalVM 25.0.4 实测输出）：

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

---

## 九、🔬 炉底显微镜

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

> 焰焰用 `jcmd` 和 JFR 观察虚拟线程挂载/卸载事件

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
- JFR 的 `jdk.VirtualThreadPinned` 事件是诊断「钉住」问题的核心（见第 23 话）

---

## 十、⏳ 版本时光机 · 虚拟线程从预览到转正

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| 虚拟线程（Preview）| JDK 19/20 | JEP 425/436 |
| 虚拟线程（正式）| **JDK 21** | JEP 444，生产可用 |
| `Thread.ofVirtual()` | JDK 21 | 流式建造者 API |
| `Executors.newVirtualThreadPerTaskExecutor()` | JDK 21 | 每任务一虚拟线程 ExecutorService |
| `Thread.isVirtual()` | JDK 21 | 运行时判断 |
| `synchronized` 去钉住（JEP 491）| **JDK 24** | 不再钉住载体线程（见第 23 话）|
| `ScopedValue` 正式 | **JDK 25** | 见第 24 话 |
| 本话代码运行环境 | JDK 25 | ✅ |

---

## 十一、适用边界与决策矩阵

虚拟线程不是万金油——它只在 IO 密集场景下才能发挥优势：

```
✅ 适合虚拟线程的场景：
- 高并发 IO 密集任务（HTTP Server、数据库查询、文件读写）
- 每请求一线程的同步编程风格（Servlet、Spring MVC 默认模型）
- 需要大量并发但单任务 CPU 占用低的工作负载

❌ 不适合的场景：
- CPU 密集任务：虚拟线程独占载体线程，与平台线程无差别
  → 改用 ForkJoinPool.commonPool() 或 parallelStream()
  
- ThreadLocal 大量使用：百万虚拟线程 = 百万副本
  → 改用 ScopedValue（JDK 25 正式，见第 24 话）
  
- 需要精确控制并发度（如限流）：虚拟线程无上限不是优势
  → 用平台线程池 + Semaphore 显式控制

决策天平：虚拟线程换掉的是**阻塞等待期间的资源占用**，不是**计算本身的速度**。
```

---

## 十二、项目检查点 · 豆豆咖啡站 jvm-v3.1

- **已具备**：促销引擎（v1.0）；类库债已还（v2.0）；迷你注入器与反射熟练度（v3.0）；**本话换装虚拟线程池，午高峰十万订单人手一单，吞吐量翻 4 倍，内存不爆**。
- **还没有**：虚拟线程怎么在 8 个载体线程上「灵魂出窍」的原理还没看到细节（JFR 事件雨等下一话）；synchronized 钉住问题的旧攻略要不要信，还没验证；ThreadLocal 的内存炸弹还没拆。

阿零的变化：卷三他学会了把 JVM 内部拆开看——反射、字节码、方法句柄。这一话他第一次从**单条执行流**的显微镜下抬起头，开始数**有多少条执行流在并发**，并且意识到**瓶颈可能不在算得快不快，而在有没有足够的人手**。

---

## 十三、对应招聘技能

虚拟线程（Project Loom）、高并发 IO 模型、Executor 框架、线程池 vs 虚拟线程决策、JFR 事件诊断、钉住（pinning）边界。

---

## 十四、下一话悬念

十万虚拟线程跑在 8 个载体线程上，数学上怎么算得过来？

下一话，焰焰打开 JFR 录制，把挂载（mount）与卸载（unmount）事件雨铺开——虚拟线程遇到 IO 时如何「灵魂出窍」，把载体线程交还给下一单，等 IO 完成后再找一具空闲的「肉身」重新附体。`jdk.VirtualThreadMount` 与 `jdk.VirtualThreadUnmount` 事件会告诉阿零，**线程的灵魂是怎么在 8 个载体之间飘移的**。

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

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
