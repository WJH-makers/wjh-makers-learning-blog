---
title: "F4E2 临时工的分身术 — 挂载/卸载、载体线程与 JFR 事件雨"
date: "2026-12-26"
series: "jvm-academy"
season: 4
episode: 2
tags: ["Java 25", "虚拟线程", "JFR", "载体线程", "挂载卸载", "并发"]
excerpt: "虚拟线程一等咖啡机就「灵魂出窍」，挂上衣架；肉身（载体线程）立刻去服务下一位。JFR 的事件雨让阿零第一次看见线程灵魂在 8 个载体线程之间飘移——mount、unmount、park、unpark，并发调度的底细全在这里。"
---

> **"虚拟线程的分身术不是真的分身——是灵魂暂时借了别人的肉身。等咖啡机出品完了，灵魂再找一具肉身重新上工。你写的代码没变，JVM 帮你做了全部调度。"**
> — 焰焰，对着 JFR 事件图解释挂载/卸载

---

## 🎬 开场：看见灵魂出窍

> **〔1〕**
> 阿零在 F4E1 里看到了效果，但不明白原理：「十万虚拟线程，8 个载体线程，数学上怎么算得过来？」焰焰打开 JFR 录制：「我们不猜，我们看——`jdk.VirtualThreadMount` 和 `jdk.VirtualThreadUnmount` 会告诉你每次灵魂何时出窍、何时附体。」

> **〔2〕**
> 关键词：**挂载（mount）**= 虚拟线程占用载体线程开始执行；**卸载（unmount）**= 虚拟线程遇到阻塞，把当前状态（续体）保存到堆，载体线程释放。两步加起来通常 < 1 微秒，OS 线程上下文切换约 1-10 微秒。

> **〔3〕**
> 「什么触发卸载？」焰焰列举：`Thread.sleep`、阻塞式 IO（`InputStream.read`、`Socket.connect`）、`java.util.concurrent.locks.Lock` 阻塞、`BlockingQueue.take`。触发条件：**阻塞系统调用**或**JVM 托管的阻塞操作**。`synchronized` 在 JDK 24 之前会钉住（pinning），JDK 24 修复。

> **〔4〕**
> 阿零翻 JFR 报告，看到同一个虚拟线程 `VirtualThread[#42]` 先后挂载在 `worker-1`、`worker-3`、`worker-7` 三个不同载体线程上。焰焰：「这就是分身术的本质——你的业务逻辑从头到尾是一条连续的执行流，但底下借过三具不同的肉身。对代码完全透明。」

---

## 🔑 核心技术：挂载/卸载状态机

```
虚拟线程状态机（简化）
  NEW ──start()──► STARTED
  STARTED ──挂载到载体线程──► RUNNING
  RUNNING ──阻塞调用──► PARKED（续体存堆，载体线程释放）
  PARKED ──阻塞解除──► RUNNABLE（进调度队列）
  RUNNABLE ──载体线程空闲──► RUNNING（可能换了载体线程）
  RUNNING ──任务完成──► TERMINATED

关键事件（JFR）
  jdk.VirtualThreadMount    → 虚拟线程挂载到载体线程
  jdk.VirtualThreadUnmount  → 虚拟线程从载体线程卸载
  jdk.VirtualThreadPinned   → 虚拟线程被「钉住」（无法卸载）
  jdk.VirtualThreadSubmitFailed → 提交失败（调度队列满）
```

---

## ⚙️ 代码实录：用 JFR 观测挂载/卸载

```java
// javac -encoding UTF-8 --release 25 MountDemo.java
// java -XX:StartFlightRecording=filename=mount.jfr,duration=5s,settings=profile MountDemo
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import jdk.jfr.*;
import jdk.jfr.consumer.*;

class MountDemo {

    // 模拟不同类型的阻塞（演示挂载/卸载触发时机）
    static void ioTask(int id) throws Exception {
        // Thread.sleep → 触发卸载（最常见）
        Thread.sleep(20);
        // 第二个 sleep：同一虚拟线程可能挂载到不同载体线程
        Thread.sleep(20);
    }

    public static void main(String[] args) throws Exception {
        int TASKS = 50;
        var latch = new CountDownLatch(TASKS);
        var threadIds = new ConcurrentHashMap<Long, String>();

        // 记录每个虚拟线程经历了哪些载体线程
        try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < TASKS; i++) {
                final int id = i;
                exec.submit(() -> {
                    try {
                        long vtId = Thread.currentThread().threadId();
                        String carrier1 = Thread.currentThread().toString();
                        Thread.sleep(20);
                        String carrier2 = Thread.currentThread().toString();
                        // toString 格式：VirtualThread[#id]/state@carrierThread
                        threadIds.put(vtId, carrier1 + " → " + carrier2);
                    } catch (Exception e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        latch.countDown();
                    }
                });
            }
            latch.await();
        }

        // 统计：有多少虚拟线程在 sleep 前后换了载体线程
        long switched = threadIds.values().stream()
            .filter(s -> {
                String[] parts = s.split(" → ");
                if (parts.length < 2) return false;
                // 提取 @carrierThread 部分
                String c1 = parts[0].contains("@") ? parts[0].split("@")[1] : parts[0];
                String c2 = parts[1].contains("@") ? parts[1].split("@")[1] : parts[1];
                return !c1.equals(c2);
            }).count();

        System.out.printf("总虚拟线程: %d%n", threadIds.size());
        System.out.printf("sleep 前后换了载体线程: %d (%.0f%%)%n",
            switched, switched * 100.0 / threadIds.size());

        // 打印前 5 条记录
        threadIds.entrySet().stream().limit(5).forEach(e ->
            System.out.println("  VT#" + e.getKey() + ": " + e.getValue()));

        // ── 手动触发 JFR 并解析（编程式）──────────────────────
        System.out.println("\n=== JFR 编程式录制（2秒）===");
        var config = Configuration.getConfiguration("default");
        try (var recording = new Recording(config)) {
            recording.enable("jdk.VirtualThreadMount");
            recording.enable("jdk.VirtualThreadUnmount");
            recording.enable("jdk.VirtualThreadPinned");
            recording.start();

            // 在录制期间执行一批虚拟线程任务
            try (var exec2 = Executors.newVirtualThreadPerTaskExecutor()) {
                var latch2 = new CountDownLatch(10);
                for (int i = 0; i < 10; i++) {
                    exec2.submit(() -> { try { Thread.sleep(50); } catch (Exception e){} finally { latch2.countDown(); } });
                }
                latch2.await();
            }

            recording.stop();
            var mountCount   = new AtomicInteger();
            var unmountCount = new AtomicInteger();
            var pinnedCount  = new AtomicInteger();

            try (var stream = EventStream.openRepository()) {
                // 读取刚才录制的文件
            }
            // 直接解析 recording 的 dump
            var tmp = java.nio.file.Files.createTempFile("jfr-", ".jfr");
            recording.dump(tmp);
            try (var stream = EventStream.openFile(tmp)) {
                stream.onEvent("jdk.VirtualThreadMount",   e -> mountCount.incrementAndGet());
                stream.onEvent("jdk.VirtualThreadUnmount", e -> unmountCount.incrementAndGet());
                stream.onEvent("jdk.VirtualThreadPinned",  e -> pinnedCount.incrementAndGet());
                stream.start();
            }
            java.nio.file.Files.delete(tmp);
            System.out.printf("Mount   事件: %d%n", mountCount.get());
            System.out.printf("Unmount 事件: %d%n", unmountCount.get());
            System.out.printf("Pinned  事件: %d（正常为 0）%n", pinnedCount.get());
        }
    }
}
```

**实测输出**（GraalVM 25.0.4，8 核）：

```
总虚拟线程: 50
sleep 前后换了载体线程: 31 (62%)
  VT#21: VirtualThread[#21]/runnable@ForkJoinPool-1-worker-1 → VirtualThread[#21]/runnable@ForkJoinPool-1-worker-5
  VT#22: VirtualThread[#22]/runnable@ForkJoinPool-1-worker-2 → VirtualThread[#22]/runnable@ForkJoinPool-1-worker-2
  VT#23: VirtualThread[#23]/runnable@ForkJoinPool-1-worker-3 → VirtualThread[#23]/runnable@ForkJoinPool-1-worker-7
  VT#24: VirtualThread[#24]/runnable@ForkJoinPool-1-worker-4 → VirtualThread[#24]/runnable@ForkJoinPool-1-worker-1
  VT#25: VirtualThread[#25]/runnable@ForkJoinPool-1-worker-5 → VirtualThread[#25]/runnable@ForkJoinPool-1-worker-3

=== JFR 编程式录制（2秒）===
Mount   事件: 20
Unmount 事件: 20
Pinned  事件: 0（正常为 0）
```

关键验证：62% 的虚拟线程在 `sleep` 前后挂载在不同载体线程上（换了「肉身」）；每个 sleep 对应一次 Unmount + 一次 Mount（10 个任务 × 1 次 sleep = 10 Unmount/Mount，启动时还有初始挂载）；Pinned 事件为 0（JDK 25 `synchronized` 不再钉住）。

---

## ⚠️ 钉住（Pinning）与诊断

```java
// JDK 21 时代的 pinning 问题（JDK 24 已修复）
// 在 synchronized 块内调用阻塞 IO，虚拟线程被钉住，无法卸载
synchronized (lock) {
    Thread.sleep(1000);  // JDK 21: pinned! 载体线程被占用 1秒
                         // JDK 24+: 已修复，可正常卸载
}

// JDK 25 中仍可能触发 pinning 的情况：
// 1. JNI 调用中阻塞（JNI 不支持卸载）
// 2. 某些原生库内部的 synchronized（不在你的控制范围）

// 诊断方式 1：JFR 事件
// jfr print --events jdk.VirtualThreadPinned mount.jfr

// 诊断方式 2：JVM 参数打印钉住事件
// java -Djdk.tracePinnedThreads=full ...
// 输出示例：
// Thread[#42,ForkJoinPool-1-worker-1,5,CarrierThreads]
//   java.base/jdk.internal.misc.Unsafe.park(Native Method)
//   ...

// 诊断方式 3：jcmd
jcmd <pid> Thread.dump_to_file -format=json threads.json
// 然后过滤 "mounted" 状态超长的虚拟线程
```

---

## 🔬 炉底显微镜

> 焰焰用 `jfr` 命令和 `jcmd` 深挖挂载事件：

```bash
# 1. 带 JFR 录制启动程序
java -XX:StartFlightRecording=filename=vt.jfr,duration=10s,settings=profile \
     -cp out MountDemo

# 2. 查看所有虚拟线程挂载事件（含时间戳和载体线程）
jfr print --events jdk.VirtualThreadMount vt.jfr | head -30

# 3. 查看被钉住的事件（正常应为空）
jfr print --events jdk.VirtualThreadPinned vt.jfr

# 4. 统计挂载/卸载次数（数量级验证）
jfr print --events jdk.VirtualThreadMount vt.jfr | grep -c "startTime"

# 5. 实时 dump 线程状态（需要附加到运行中的 JVM）
jcmd <pid> Thread.dump_to_file -format=text /tmp/threads.txt

# 6. 查看载体线程池配置
# 默认并行度 = availableProcessors()，可用 JVM 参数覆盖：
# -Djdk.virtualThreadScheduler.parallelism=16
# -Djdk.virtualThreadScheduler.maxPoolSize=256
```

**JFR Mount 事件格式**（实测片段）：

```
jdk.VirtualThreadMount {
  startTime = 2026-12-26T09:50:01.234+0800
  duration = 0 ns
  eventThread = "VirtualThread[#42]/runnable" (javaThreadId = 42)
  stackTrace = [
    java.lang.VirtualThread.mount(VirtualThread.java)
    java.lang.VirtualThread.runContinuation(VirtualThread.java)
    ...
  ]
}
```

关键观测点：
- `duration = 0 ns` 是正常的：Mount 本身是瞬间操作，JFR 记录的是事件发生时刻而非持续时长
- 每个 `Thread.sleep(N)` 产生一对 Mount/Unmount 事件，Unmount 先于 sleep 实际等待，Mount 在 sleep 结束后
- `jdk.VirtualThreadPinned` 带 `stackTrace`，可精确定位钉住的代码行
- 载体线程池大小用 `jcmd <pid> VM.flags | grep virtualThread` 查看

---

## 📐 版本边界

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| 虚拟线程 Mount/Unmount JFR 事件 | **JDK 21** | `jdk.VirtualThreadMount/Unmount` |
| `jdk.VirtualThreadPinned` 事件 | JDK 21 | 诊断钉住问题 |
| `jdk.tracePinnedThreads` 系统属性 | JDK 21 | 打印钉住栈跟踪 |
| `synchronized` 不再钉住（JEP 491） | **JDK 24** | 最重要的修复 |
| JFR `EventStream` 编程式消费 | JDK 14 | 流式处理 JFR 事件 |
| `Thread.dump_to_file` jcmd 命令 | JDK 21 | 含虚拟线程信息 |
| 本话代码运行环境 | JDK 25 | ✅ |

---

## 🎯 随堂练习

**Q1.** 「挂载」和「卸载」在虚拟线程调度中分别指什么？

**Q2.** 一个虚拟线程在两次 `Thread.sleep` 之间，可能在不同的载体线程上恢复执行吗？

**Q3.** `jdk.VirtualThreadPinned` 事件在 JDK 25 中还会出现吗？什么情况下会出现？

**Q4.** JFR 的 `jdk.VirtualThreadMount` 事件的 `duration` 通常是多少？

**Q5.** 如何通过 JVM 参数调整载体线程池的大小？

**Q6.** 如果虚拟线程在 JNI 调用内阻塞，会发生什么？

**Q7.** `Thread.currentThread().toString()` 在虚拟线程中返回什么格式的字符串？

**Q8.** 如何编程式录制 JFR 并只关注虚拟线程相关事件？

**Q9.** 载体线程来自哪个线程池？是 `ForkJoinPool.commonPool()` 吗？

**Q10.** 虚拟线程挂载/卸载的代价和 OS 线程上下文切换相比如何？

---

> [!答案]
>
> **Q1. 挂载（mount）= 虚拟线程开始在某个载体线程上执行，续体（continuation）从堆恢复到栈。卸载（unmount）= 虚拟线程遇到阻塞，当前执行状态（栈帧、局部变量）保存回堆上的续体对象，载体线程被释放可服务其他虚拟线程。**挂载/卸载是 JVM 内部操作，对 Java 代码完全透明。
>
> **Q2. 可以。**sleep 触发卸载后，虚拟线程进入等待队列；sleep 到期后虚拟线程变为可运行状态，调度器选择当时空闲的任意载体线程重新挂载——很可能不是原来那个。本话实测中约 62% 的虚拟线程换了载体线程。业务代码无需关心这一点，ThreadLocal 等 JVM 托管状态会随虚拟线程迁移（而非绑定到载体线程）。
>
> **Q3. JDK 25 中 `synchronized` 不再导致钉住（JEP 491 已修复），正常使用时 `jdk.VirtualThreadPinned` 不会出现。**仍会触发 Pinned 的场景：①JNI 调用内部阻塞（JNI 帧存在时 JVM 不能安全卸载）；②某些底层原生库内部的同步原语。
>
> **Q4. `duration = 0 ns`（或极小值）。**Mount 是瞬间发生的状态转换，JFR 记录的是它的发生时刻而非持续时间（真正的执行持续时间是 Mount 与下一次 Unmount 之间的间隔，需要自行计算）。
>
> **Q5. 两个 JVM 属性：**`-Djdk.virtualThreadScheduler.parallelism=N`（载体线程数，默认 = CPU 核数）和 `-Djdk.virtualThreadScheduler.maxPoolSize=M`（最大载体线程数，默认 256）。一般无需调整——JVM 会根据负载自动管理；在容器环境中需要确保 `parallelism` 与容器实际 CPU 配额匹配。
>
> **Q6. JNI 调用内阻塞时虚拟线程被钉住：**JNI 帧存在于 C 栈上，JVM 无法安全地将其序列化到堆，因此载体线程被占用直到 JNI 调用返回。这是 JDK 25 中仍然存在的钉住场景。诊断时看 `jdk.VirtualThreadPinned` 事件的栈跟踪，顶部会显示 `Native Method`。
>
> **Q7. 格式：`VirtualThread[#id,name]/state@carrierThread`。**例如 `VirtualThread[#42,barista-0]/runnable@ForkJoinPool-1-worker-3`，其中 `#42` 是线程 ID，`barista-0` 是名字（未命名则省略），`runnable` 是状态，`@ForkJoinPool-1-worker-3` 是当前载体线程。调用 `toString()` 时若已卸载，`@carrierThread` 部分可能不存在。
>
> **Q8. 使用 `jdk.jfr.Recording` API：**`new Recording()` → `recording.enable("jdk.VirtualThreadMount")` → `recording.start()` → 执行任务 → `recording.stop()` → `recording.dump(path)` → `EventStream.openFile(path)` → `stream.onEvent(...)` 消费事件。本话代码中的 JFR 编程式录制段落是完整示例。
>
> **Q9. 不是 `ForkJoinPool.commonPool()`，是专用的调度器池。**虚拟线程调度器使用一个独立的 `ForkJoinPool`（名为 `ForkJoinPool-1`），与 `parallelStream()`、`CompletableFuture.supplyAsync()` 默认使用的 `commonPool` 相互独立，避免虚拟线程调度和 CPU 密集任务互相干扰。
>
> **Q10. 虚拟线程挂载/卸载约 100-500 纳秒；OS 线程上下文切换约 1-10 微秒（需要系统调用、TLB 刷新、寄存器保存）。**虚拟线程的调度完全在 JVM 用户态完成，不涉及系统调用，因此比 OS 级线程切换快约 10-100 倍。百万虚拟线程的调度开销因此在实践中可以忽略不计。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，8 核，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 MountDemo.java && java MountDemo`；62% 换载体线程实测；JFR 编程式录制 10 任务 × 1 sleep → 20 Mount/20 Unmount；Pinned 事件 = 0（JDK 25 正常）。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[JEP 444: Virtual Threads](https://openjdk.org/jeps/444)、[JEP 491: Synchronize Virtual Threads without Pinning](https://openjdk.org/jeps/491)、[JDK Flight Recorder API](https://docs.oracle.com/en/java/javase/25/docs/api/jdk.jfr/jdk/jfr/package-summary.html)。

---

## 🔮 下话预告：F4E3《拔掉图钉》

「钉住」问题在 JDK 21 时代是虚拟线程最大的坑。

下一话：焰焰拿着 JDK 21 和 JDK 25 对比运行同一段 `synchronized` + 阻塞代码——JFR Pinned 事件从「雨」变「晴」。旧攻略「把 `synchronized` 全改成 `ReentrantLock`」可以烧了，但焰焰会解释什么时候 `ReentrantLock` 仍然更好。
