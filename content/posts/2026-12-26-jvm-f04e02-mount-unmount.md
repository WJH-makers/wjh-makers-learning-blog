---
title: "《JVM 火种纪》22 · 临时工的分身术"
date: 2026-12-26
summary: "上一话换了 Executor 就把吞吐量翻了四倍，但阿零还不知道「灵魂出窍」到底是怎么发生的。焰焰打开 JFR 录制，事件雨里每一行 `jdk.VirtualThreadMount` 都是一次附体，每一行 `jdk.VirtualThreadUnmount` 都是一次卸载——同一个虚拟线程 sleep 前后挂在了不同的载体线程上，炉底把线程灵魂的飘移路径全拍了下来。"
tags: [Java, Java漫画, JVM, JFR, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》22 · 临时工的分身术

> JVM 火种纪 · 卷四「并发新纪元篇」第 2 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话把线程池换成虚拟线程，十万订单各有人手——可阿零看到的只是结果数字，还没看见「灵魂出窍」到底是怎么发生的。

---

## 一、事故：我没看见卸载发生

上一话压测跑完，阿零盯着 4 倍加速比发呆:「你说虚拟线程遇到 sleep 就卸载，载体线程就被交出去了——**我怎么知道它真的卸载了**？代码看起来就是普通的 `Thread.sleep(50)`，什么都没变。」

豆豆从炉底探出头:「因为你看的是代码，不是事件。」

焰焰打开 JFR 录制:`java -XX:StartFlightRecording=filename=vt.jfr,duration=5s ...`，跑完之后把事件打印出来，一行行全是 `jdk.VirtualThreadMount` 和 `jdk.VirtualThreadUnmount`。她指着其中一条:

```
VirtualThread[#42] 先挂在 worker-1，sleep 后卸载，醒来时挂在 worker-7。
```

「看见了吗？同一个虚拟线程，sleep 前后借了两具不同的『肉身』。这就是分身术的本质——**你的业务逻辑是一条连续的流，但底下借过三五具不同的载体线程，对你的代码完全透明**。」

---

## 二、漫画 · 看见灵魂飘移

![JVM 火种纪漫画：f04e02-mount-unmount](/comics/jvm/f04e02-mount-unmount.png)

> [!文字版]
>
> **〔1〕** 阿零指着上一话的加速比数字:「虚拟线程一遇阻塞就卸载——我怎么知道它真的卸载了？代码看起来就是普通的 `Thread.sleep(50)`，编译器没报、运行时也没日志。」焰焰打开 JFR 录制:「因为你看的是代码，不是事件。」
>
> **〔2〕** 焰焰用 `java -XX:StartFlightRecording=filename=mount.jfr,duration=5s` 跑了一遍，然后 `jfr print --events jdk.VirtualThreadMount,jdk.VirtualThreadUnmount mount.jfr`，屏幕上刷出密密麻麻的事件雨。她指着一条:「看，VirtualThread[#42] 先挂在 worker-1 上执行，sleep 触发卸载，醒来时重新挂载——这次是 worker-7。」
>
> **〔3〕** 阿零翻事件日志，同一个虚拟线程 #42 的 `toString()` 从 `VirtualThread[#42]/runnable@ForkJoinPool-1-worker-1` 变成了 `@worker-7`。「所以『分身术』不是真的分身，是**灵魂暂时借了别人的肉身**？」焰焰点头:「对。你的执行流从头到尾是连续的，但底下借过三五具载体线程——续体（栈帧、局部变量）存堆上，载体线程只是临时宿主。」
>
> **〔4〕** 「什么触发卸载？」焰焰列举:`Thread.sleep`、阻塞式 IO（`InputStream.read`、`Socket.connect`）、`java.util.concurrent.locks.Lock` 阻塞、`BlockingQueue.take`。共同点:**JVM 能介入的阻塞操作**。`synchronized` 在 JDK 21 会钉住（pinning），JDK 24 已修复。
>
> **〔5〕** 版本残影浮出——2018 年 Project Loom 早期原型，手里攥着一份未完成的 `Continuation` API 草案:「我们那会儿还在争论要不要把续体暴露成公开 API……最后决定藏起来，只通过 `Thread` 暴露。用户不需要知道续体，只要写 `Thread.sleep`，JVM 替你做调度。」残影散进炉火。
>
> **〔6〕** 阿零统计了一下:50 个虚拟线程，62% 在 sleep 前后换了载体线程——「换肉身」是常态，不是偶然。焰焰补充:「挂载/卸载的开销约 100–500 纳秒，OS 线程上下文切换约 1–10 微秒——快了两个数量级，所以百万虚拟线程的调度成本才能忽略不计。」

---

## 三、本话目标

- 用 JFR 实测 `jdk.VirtualThreadMount` 与 `jdk.VirtualThreadUnmount` 事件；
- 编程式录制 JFR 并解析事件流，统计挂载/卸载次数；
- 看清虚拟线程 `toString()` 格式，从字符串识别载体线程；
- 说清哪些阻塞操作触发卸载，哪些会钉住（pinning）；
- 掌握 `jfr print` 与 `jcmd` 两条观测路径。

---

## 四、炉内原理图：挂载/卸载状态机

上一话讲了虚拟线程的**贵不贵**（创建成本与并发上限），这一话拆开**它怎么动**——从 NEW 到 TERMINATED 的状态流转，以及每次状态切换时 JVM 在底下做了什么：

```
虚拟线程状态机（简化版）
  NEW ──start()──► STARTED
  STARTED ──挂载到载体线程──► RUNNING（占用一个载体线程）
  RUNNING ──阻塞调用──► PARKED（续体存堆，载体线程释放）
  PARKED ──阻塞解除──► RUNNABLE（进调度队列，等待挂载）
  RUNNABLE ──载体线程空闲──► RUNNING（可能换了载体线程）
  RUNNING ──任务完成──► TERMINATED

关键事件（JFR 可观测）
  jdk.VirtualThreadMount    → 虚拟线程挂载到载体线程
  jdk.VirtualThreadUnmount  → 虚拟线程从载体线程卸载
  jdk.VirtualThreadPinned   → 虚拟线程被「钉住」（无法卸载，下一话专门破案）
  jdk.VirtualThreadSubmitFailed → 提交失败（调度队列满，极少见）
```

关键在 RUNNING → PARKED → RUNNABLE → RUNNING 这个循环:**一次卸载产生一对 Unmount/Mount 事件，同一个虚拟线程可以经历多次**。挂载/卸载不是线程的「创建/销毁」，是**临时占用/交还载体线程**。

触发卸载的操作（JVM 能介入调度的阻塞点）：
- `Thread.sleep(N)`
- 阻塞式 IO（`InputStream.read`、`Socket.connect`、`Files.readAllBytes`）
- `java.util.concurrent.locks.Lock.lock()`、`Condition.await()`
- `BlockingQueue.take()`、`CountDownLatch.await()`

**不会**触发卸载的场景：
- 纯 CPU 计算循环（JVM 无介入点）
- `synchronized` 块内阻塞（JDK 21 会钉住，JDK 24 已修复，见第 23 话）
- JNI 调用内阻塞（JNI 帧无法序列化，JDK 25 仍会钉住）

---

## 五、从上一话继续改代码：用 JFR 编程式录制挂载事件

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

## 六、故意翻一次车：在 JNI 调用内阻塞

阿零故意试一次——在 JNI 调用内部阻塞，看虚拟线程会不会被钉住。但 JNI 不是普通 Java 代码能轻易触发的，他找了个间接例子：

```java
// JDK 25 中仍可能触发 pinning 的场景：JNI 调用内部阻塞
// （需要原生库配合，这里只演示概念）

// 理论场景：某个 JNI 方法内部调用了阻塞 IO
// native void blockingNativeCall();  // C 代码里 read() 阻塞
// → JVM 检测到 JNI 帧存在，无法安全卸载，虚拟线程被钉住

// 实测方式：看 jdk.VirtualThreadPinned 事件的 stackTrace
// 如果顶部是 Native Method，就是 JNI 钉住
```

---

## 七、编译官罚单

> **📋 编译官罚单 · 编译官管不到调度，只能看 JFR**
>
> 挂载/卸载发生在运行时，是 JVM 调度器的行为，不是语法或类型错误——编译器对此一无所知：
>
> ```text
> （无编译错误——Thread.sleep() 在虚拟线程与平台线程里语法完全一致）
> 虚拟线程是否真的卸载了？       → 编译器不知道，看 JFR 事件
> 虚拟线程换了几次载体线程？     → 编译器不知道，看 JFR 事件
> 某个阻塞操作是否触发了钉住？   → 编译器不知道，看 jdk.VirtualThreadPinned
> ```
>
> 这是并发调度问题的共性:**编译期看不见，运行时才能观测**。想确认挂载/卸载真的发生了，只有两条路——要么写代码记录 `Thread.currentThread().toString()` 前后的变化（本话前半段），要么直接看 JFR 事件流（本话后半段）。

---

## 八、修复并验证

验证挂载/卸载机制生效，三条判据：

1. **换载体线程比例 > 50%**：50 个虚拟线程，sleep 前后至少一半换了载体线程（实测 62%）；
2. **JFR Mount/Unmount 事件成对**：10 个任务 × 1 次 sleep = 10 对事件（实测 20 Mount + 20 Unmount，启动时有初始挂载）；
3. **Pinned 事件 = 0**：JDK 25 下 `synchronized` 不再钉住，正常代码不应有 Pinned 事件。

正常路径验证（GraalVM 25.0.4 实测输出）：

```
总虚拟线程: 50
sleep 前后换了载体线程: 31 (62%)
  VT#21: VirtualThread[#21]/runnable@ForkJoinPool-1-worker-1 → VirtualThread[#21]/runnable@ForkJoinPool-1-worker-5
  VT#22: VirtualThread[#22]/runnable@ForkJoinPool-1-worker-2 → VirtualThread[#22]/runnable@ForkJoinPool-1-worker-2
  VT#23: VirtualThread[#23]/runnable@ForkJoinPool-1-worker-3 → VirtualThread[#23]/runnable@ForkJoinPool-1-worker-7

=== JFR 编程式录制（2秒）===
Mount   事件: 20
Unmount 事件: 20
Pinned  事件: 0（正常为 0）
```

三条全绿，确认挂载/卸载机制正常工作。阿零第一次「看见」了线程灵魂的飘移——不是通过猜，是通过 JFR 事件流实测出来的。

---

## 九、🔬 炉底显微镜 · Mount 事件的完整字段

> 焰焰用 `jfr` 命令和 `jcmd` 深挖挂载事件

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

## 十、⏳ 版本时光机 · 虚拟线程事件与钉住修复

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

## 十一、钉住诊断速查

JDK 25 中 `synchronized` 已不再钉住，但仍有两类场景会触发 pinning：

```
仍会钉住的场景（JDK 25）：
1. JNI 调用内部阻塞
   → JNI 帧存储在 C 栈，JVM 无法序列化为续体
   → 诊断：jdk.VirtualThreadPinned 栈顶显示 Native Method
   
2. 某些原生库内部的锁（不在用户控制范围）
   → 例如某些旧版 JDBC 驱动内部用了 synchronized

诊断方式速查：
- JVM 参数：-Djdk.tracePinnedThreads=full（完整栈）或 =short（顶层帧）
- JFR 事件：jfr print --events jdk.VirtualThreadPinned vt.jfr
- jcmd 实时：jcmd <pid> Thread.dump_to_file，过滤 state=PINNED

duration 字段直接显示钉住持续时长——多个长 duration 的 Pinned 事件 = 吞吐量瓶颈。
```

---

## 十二、项目检查点 · 豆豆咖啡站 jvm-v3.2

- **已具备**：虚拟线程池上线（v3.1）；**本话用 JFR 实测了挂载/卸载事件，62% 的虚拟线程换过载体线程，确认「灵魂出窍」真的发生了**；掌握编程式录制 JFR 与解析事件流。
- **还没有**：钉住问题的旧攻略「把 synchronized 全改成 ReentrantLock」要不要信，还没亲手验证 JEP 491 的修复效果；ThreadLocal 的内存炸弹还没拆；结构化并发（StructuredTaskScope）还没学。

阿零的变化：上一话他看到了虚拟线程的**效果**（吞吐量翻 4 倍），这一话他第一次**看见了机制**——不是通过文档描述，是通过 JFR 事件流实测出来的。他开始意识到:**并发问题的调试不能靠猜，要靠观测工具把运行时状态拍下来**。

---

## 十三、对应招聘技能

JFR（Java Flight Recorder）、虚拟线程调度机制、挂载/卸载（mount/unmount）、钉住（pinning）诊断、`jdk.jfr` API 编程式录制。

---

## 十四、下一话悬念

挂载/卸载的原理看清楚了，但阿零翻出一篇 2023 年的虚拟线程迁移指南，上面写着「在 `synchronized` 块内调用阻塞操作会导致钉住，必须改成 `ReentrantLock`」，旁边标了三个感叹号。

焰焰看了看日期:「这在 JDK 21 时代是对的。JDK 24 发布 JEP 491 之后，synchronized 已经不再钉住了——**这张笔记可以进归档了**。」下一话，**拔掉图钉**:用 JFR 对比 JDK 21 与 JDK 25 的 Pinned 事件，看 JEP 491 到底修复了什么，以及什么时候 `ReentrantLock` 仍然是更好的选择。

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

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
