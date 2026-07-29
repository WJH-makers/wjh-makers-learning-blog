---
title: "《从零开始学 Java》78 · 百万顾客:虚拟线程"
date: 2026-11-04
summary: "豆豆按下「百万顾客」压测钮,200 条平台线程全趴在 IO 上打盹,加线程直接 OOM。虚拟线程阻塞即卸载,一台机器轻松接下万单;可阿零顺手把它塞回线程池——吞吐纹丝不动。池化,恰恰是虚拟线程的头号反模式。"
tags: [Java, Java漫画, 虚拟线程, Scoped Values, 并发, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》78 · 百万顾客:虚拟线程

> 连载特刊 · 番外卷二「并发深水区」第 9 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——编排是丝滑了,可大促目标十万在线顾客,金贵的平台线程一人陪一位根本坐不下;豆豆眯起眼:「要不,一人发一个分身?」

---

## 一、事故:两百个人,没一个在干活

冬歇特训第九夜。上一话的流水线「查库存 → 查会员 → 合并计价」已经编排得漂漂亮亮(回看第 77 话),底座是固定 200 条的平台线程池。豆豆把监控台一转,按下红钮:**压测 · 百万顾客**。

每单要调一次远程库存接口,阻塞约 200 ms——纯等待。大屏上,200 条线程全在「睡觉等 IO」,队列越排越长。阿零的第一反应是加人:线程池开到两万。JVM 直接掀了桌:

```text
Exception in thread "main" java.lang.OutOfMemoryError: unable to create native thread:
possibly out of memory or process/resource limits reached
```

豆豆:「你雇的是正式工,工资却全花在『等』上。今晚,换一种工人。」

---

## 二、漫画 · 线程调度中心的临时工革命

> **〔1〕** 监控大屏血红,咖啡站门口的队伍排出画外;线程调度中心里,200 名正式工齐刷刷趴在咖啡机前打盹——都在等远程库存接口回话。
> 豆豆:「看清楚:200 条平台线程,没一个在干活。全在**等**。」

> **〔2〕** JVM 城主抱着账本苦笑,身后一排巨大的更衣柜。
> JVM 城主:「雇一个正式工(平台线程),我得向操作系统递申请、1:1 绑一条 OS 线程,还得预留约 1 MB 的栈当更衣柜;换班(上下文切换)得惊动内核。几千人,就是极限。」

> **〔3〕** 阿零把招工启事贴满墙:「那雇两万个!」下一秒更衣室爆开,城主被埋进柜子堆,屏幕弹出 `OutOfMemoryError: unable to create native thread`。
> 豆豆:「刚才那声巨响,就是你干的。」

> **〔4〕** 豆豆掏出一叠薄如纸片的工牌撒向空中——虚拟线程。
> 豆豆:「JEP 444,JDK 21 转正。工牌由 JVM 自己发,不惊动操作系统;真正的工位只有几个,叫 **carrier(载体)线程**。」

> **〔5〕** 【特写格】一名临时工刚把订单递给远程接口,立刻自己「下工位」——栈帧卷成小包袱搬回堆里;工位空出,下一名临时工无缝坐上去。
> JVM 城主:「**阻塞即卸载**。等待不占工位,这才是百万顾客的接法。」

> **〔6〕** 阿零两眼放光,顺手把一叠工牌塞进写着「200 人」的旧池子:「好东西,得省着用!」
> 豆豆(叼着豆子扶额):「完了。他把免费的东西,锁进了保险柜。」

---

## 三、本话目标

- 算清平台线程贵在哪:OS 线程 1:1、栈内存、内核上下文切换;
- 用 `Executors.newVirtualThreadPerTaskExecutor()` 一任务一虚拟线程,吃透「阻塞即卸载」;
- 划清边界:IO 密集吃满收益,CPU 密集别指望;
- 背下三条纪律:不池化、分清 JDK 21–23 与 24+ 的钉住边界、为不可变上下文优先考虑 Scoped Values;
- 踩一次「把虚拟线程塞进线程池」的反模式,用压测数据修好。

---

## 四、原理图:两种线程的账本

```text
平台线程(1:1)      Java 线程 ══绑死══ OS 线程
  贵在哪:创建要系统调用;栈默认预留约 1 MB;上下文切换由内核完成
  上限  :几千条就到头 —— 数得过来的「正式工」

虚拟线程(JEP 444,JDK 21 转正)
  百万虚拟线程 ──由 JVM 调度── 少量 carrier(平台)线程
  阻塞即卸载:一碰阻塞 IO,栈帧搬回堆,carrier 立刻接待下一个虚拟线程
  多便宜  :创建微秒级,内存几 KB 起步,百万条不是梦
  边界    :IO 密集(等远程接口/数据库)收益拉满;
            CPU 密集无收益 —— 算力还是那几个核,carrier 就那几条
```

> **⏳ 版本时光机 · 线程模型怎么变的**

| JDK 版本 | 线程这件事 | 关键变化 |
|---|---|---|
| ≤ JDK 20 | 平台线程 1:1 绑 OS 线程 | 线程是稀缺资源,靠池化省着用 |
| JDK 21 | 虚拟线程转正(JEP 444) | JVM 调度、阻塞即卸载,一任务一线程 |
| JDK 24 | 钉住问题解决(JEP 491) | synchronized 不再钉死 carrier |
| JDK 25 | Scoped Values 转正(JEP 506) | 不可变、单向上下文传递的轻量选择 |

一句演进小结:线程从「省着用的资源」变成「随手发的工牌」——省线程的老习惯,恰恰成了新时代的坑。

---

## 五、代码:流水线不动,只换底座

上一话的 CompletableFuture 编排原封不动,改的只有那行底座:

```java
import java.time.Duration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MillionCustomers {

    /** 模拟一单:调远程库存接口,阻塞约 200 ms(IO 密集) */
    static void handleOrder() {
        try {
            Thread.sleep(Duration.ofMillis(200));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    static long benchmark(ExecutorService executor, int orders) {
        long start = System.nanoTime();
        try (executor) {                       // 较新版本起 ExecutorService 可自动关闭:
            for (int i = 0; i < orders; i++) { // close() 会等提交的任务全部跑完
                executor.submit(MillionCustomers::handleOrder);
            }
        }
        return (System.nanoTime() - start) / 1_000_000;
    }

    public static void main(String[] args) {
        long cost = benchmark(Executors.newVirtualThreadPerTaskExecutor(), 10_000);
        IO.println("一任务一虚拟线程:10000 单耗时 " + cost + " ms");
    }
}
```

**三条纪律**,豆豆用红笔写在白板上:

1. **不要池化。** 池的意义是复用「贵」的东西;虚拟线程便宜到不值得复用,**一任务一线程**。真要限流,限的是「同时打到下游的请求数」——用信号量(回看第 76 话),不是用池限线程。
2. **留意超老版本的钉住(pinning)。** JDK 21–23 上,虚拟线程在 synchronized 块里阻塞,会把 carrier 一起「钉」在工位上卸不下来;JEP 491(JDK 24)已根治。基线 Java 25 无此忧,接手老系统要多看一眼。
3. **为合适的上下文优先考虑 Scoped Values。** 虚拟线程仍完整支持 ThreadLocal;短生命周期虚拟线程结束后,其 ThreadLocal 副本也可回收。不过大量或长生命周期任务持有大对象仍会带来内存压力。对「不可变、从调用方单向传给下游」的上下文,Scoped Values(JEP 506,JDK 25 转正)更合适,且绑定随作用域结束:

```java
static final ScopedValue<String> MEMBER_ID = ScopedValue.newInstance();

ScopedValue.where(MEMBER_ID, "M1024")
           .run(() -> handleOrder());   // 作用域内随取随用,结束即失效
```

> **豆豆旁白**:还有个远亲叫**结构化并发**——把一组子任务当一个单元统一取消、统一收尾。截至 JDK 25 它仍在预览(JEP 505,第五轮),转正那天再专门开一话,今天只远远看一眼。

---

## 六、故意制造一个 Bug:把工牌锁进保险柜

阿零的「节俭」基因发作:「虚拟线程是好,但资源总得管起来——进池!」

```java
// 反模式:把虚拟线程塞进固定 200 的线程池
ExecutorService pooled =
        Executors.newFixedThreadPool(200, Thread.ofVirtual().factory());
IO.println("池化虚拟线程:10000 单耗时 " + benchmark(pooled, 10_000) + " ms");
```

---

## 七、观察真实现象:没有异常的性能事故

```text
平台线程池(固定 200) :10000 单耗时 10247 ms
池化虚拟线程(固定 200):10000 单耗时 10262 ms   ← 换了个寂寞,还多一层排队
一任务一虚拟线程       :10000 单耗时   331 ms
```

这回没有红色堆栈——**性能事故不报错,只沉默地慢**。账很好算:10000 单 × 200 ms 阻塞 ÷ 同时 200 单 = 50 波 × 0.2 s ≈ 10 秒。池化后,任务在池的**队列**里干等,压根没机会上 carrier,「阻塞即卸载」毫无用武之地;并发被池大小死死封顶,还平白多了一层池调度——吞吐不升反降。

> **🎯 面试直击**:虚拟线程适合什么场景?为什么不能池化?
> 适合 IO 密集:阻塞即卸载,carrier 不陪等,少量 OS 线程扛住海量并发;CPU 密集无收益——算力还是那几个核。不能池化:池是为复用昂贵资源而生,虚拟线程创建微秒级、几 KB 内存,池化不省反亏,并发被池大小封顶。追问点:那下游扛不住怎么限流?——用 Semaphore 限并发数,而不是用池限线程数。

---

## 八、修复,并用测试证明

修复只有一行:把 `pooled` 换回 `Executors.newVirtualThreadPerTaskExecutor()`。压测三方对比:

| 底座 | 同时在飞的单 | 10000 单耗时 | 结论 |
|---|---|---|---|
| 平台线程池(200) | ≤ 200 | ≈ 10.2 s | 线程全在陪 IO 睡觉 |
| 池化虚拟线程(200) | ≤ 200 | ≈ 10.3 s | 反模式:并发被池封顶 |
| 一任务一虚拟线程 | 10000 | ≈ 0.33 s | 阻塞即卸载,等待不占工位 |

JUnit 质检员(「证据呢?」)收下两份证据:

```java
import org.junit.jupiter.api.Test;
import java.time.Duration;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

class MillionCustomersTest {

    @Test
    void executor_really_uses_virtual_threads() throws Exception {
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            assertTrue(executor.submit(() -> Thread.currentThread().isVirtual()).get());
        }
    }

    @Test
    void one_task_one_virtual_thread_beats_serial_by_far() {
        var served = new AtomicInteger();
        long start = System.nanoTime();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 1_000; i++) {
                executor.submit(() -> {
                    Thread.sleep(Duration.ofMillis(100));   // 串行合计要 100 秒
                    return served.incrementAndGet();
                });
            }
        }
        long ms = (System.nanoTime() - start) / 1_000_000;
        assertEquals(1_000, served.get());                  // 一单不丢
        assertTrue(ms < 3_000, "虚拟线程应在 3 秒内跑完,实际 " + ms + " ms");
    }
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v9.9

```text
咖啡站形态:百万顾客压测过关,IO 等待不再烧线程
已具备  :平台线程成本账(OS 线程 1:1/约 1 MB 栈/内核切换);虚拟线程阻塞即卸载;
          一任务一虚拟线程 + 信号量限下游;按数据流选择 Scoped Values 传不可变上下文
还没有  :武器库配齐,却还没真刀真枪打过硬仗 —— 明晚,那道旧疤要重新揭开
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 虚拟线程(JEP 444)与 carrier 模型 | 新版并发八股 C 位,「适合什么场景」几乎必问 |
| 一任务一线程、不池化、信号量限流 | 高并发岗的工程判断题,答「池化管理」直接扣分 |
| 钉住问题的版本线(JDK 24 已解) | 区分「背过」与「跟进过」的分水岭 |
| Scoped Values 的适用边界 | 答得出不可变单向上下文,说明真在读版本说明 |

---

## 十一、下一话悬念

特训第九夜收工,豆豆没有布置新题。它把监控大屏切回一段旧曲线——第 69 话那晚,库存冲破零线的超卖尖刺,像一道没愈合的疤。

豆豆:「volatile、CAS、锁、并发容器、ThreadLocal、门闩信号量、CompletableFuture、虚拟线程——武器库配齐了。明天,你**独立**复盘这起事故,我只旁观。」

> 下一话《并发终考:超卖事故复盘》(番外卷二终):没有新知识点,只有一场真实事故、一个一言不发的旁观者,和阿零自己的五步排障法。

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. 平台线程(Platform Thread)和 OS 线程的关系是?
- A) 多个平台线程映射到一个 OS 线程(N:1)　　B) 一个平台线程映射到一个 OS 线程(1:1)——Java 的平台线程就是对 OS 线程的包装,每个 `Thread` 对象底面对应一个内核线程　　C) 平台线程完全在用户态,与 OS 线程无关　　D) 平台线程和 OS 线程的关系取决于 JVM 版本

2. 虚拟线程(Virtual Thread)的栈内存大小是多少?
- A) 默认 1MB,和平台线程一样　　B) 没有一个面向开发者承诺的固定默认值；其栈按需保存在堆中的 continuation 栈块里，可随调用深度增长或回收，不需为每个任务预留平台线程那样的固定原生栈　　C) 不使用栈,使用堆上的 ArrayList 模拟　　D) 固定 256KB

3. 虚拟线程最受益的场景是?
- A) 纯 CPU 计算密集型(如加密解密、图像处理)　　B) IO 密集型(如数据库查询、HTTP 调用、文件读写)——阻塞时虚拟线程从 carrier 卸载,让平台线程服务其他虚拟线程,从而提高并发等待时的吞吐　　C) 所有场景都受益　　D) 只是语法糖,没有性能提升

4. JDK 21–23 的虚拟线程「pin(钉住)」问题指的是什么?
- A) 虚拟线程被固定在某个 CPU 核上　　B) 在 `synchronized` 块内阻塞或执行 native 调用时可能不能 unmount(不能从平台线程上卸下),导致阻塞期间独占 carrier　　C) 虚拟线程被 GC 标记为不可移动的对象　　D) 虚拟线程和平台线程的绑定关系不可改变

5. 以下关于虚拟线程的创建方式,正确的是?
- A) `new Thread(() -> {}).start()`——和创建平台线程一样　　B) `Thread.ofVirtual().start(() -> {})`——JDK 19、20 为预览 API，JDK 21 起正式可用；创建的 Thread 以虚拟线程身份运行　　C) `Executors.newVirtualThreadPerTaskExecutor()`——提交的任务在每个虚拟线程中执行,不需池化管理　　D) B 和 C 都正确

6. 虚拟线程和线程池的关系,以下哪个说法正确?
- A) 应该创建一个固定大小的虚拟线程池来复用虚拟线程　　**B) 通常不池化虚拟线程；采用「一任务一线程」，并在数据库、HTTP 等下游资源处用连接池、Semaphore 或背压限流**　　C) 虚拟线程也必须池化,否则会内存溢出　　D) 虚拟线程不需要管理,也不能显式创建

7. 虚拟线程的 `ThreadLocal` 使用需要注意什么?
- A) 完全不能用　　**B) 能用;短生命周期线程结束后其副本可回收，但长任务或大量大值仍要控制生命周期。不可变、单向上下文可在 JDK 25 用 `ScopedValue` 表达**　　C) 虚拟线程创建 ThreadLocal 时会自动设置过期时间　　D) `ThreadLocal` 会自动跨任意异步任务传播

8. 在 **JDK 21–23** 上,以下哪种代码模式会导致虚拟线程被「pin」?
- A) `Thread.sleep(1000)`　　**B) `synchronized(obj) { blockingIO(); }`——在 `synchronized` 块内执行阻塞操作,虚拟线程无法 unmount,期间绑定的平台线程被独占**　　C) `lock.lockInterruptibly()`　　D) `CompletableFuture.supplyAsync(() -> work())`

9. 虚拟线程的数量级通常在什么范围?
- A) 几百到几千,和平台线程一样　　**B) 没有语言规定的数量上限；在容量测试证明可行时可创建远多于平台线程的任务，实际仍受堆、连接/文件描述符、下游容量与业务状态约束**　　C) 受限于 CPU 核数 × 2　　D) 虚拟线程有硬上限 65535

10. JDK 25 的预览 API `StructuredTaskScope` 与虚拟线程的关系是?
- A) 两者没有关系,是完全独立的两个 API　　**B) `StructuredTaskScope` 可组织并统一等待/取消子任务,通常与虚拟线程配合使用；截至 JDK 25 仍需 `--enable-preview`**　　C) `StructuredTaskScope` 只支持平台线程　　D) `StructuredTaskScope` 是虚拟线程的另一种写法

### 解答题(5 道)

1. 用三个关键数字对比平台线程和虚拟线程:① 创建成本 ② 栈内存 ③ 最大数量,并解释为什么这些差异让虚拟线程适合「高并发 + 频繁阻塞」的场景。

2. 画出虚拟线程在可由 JDK 运行时协作的阻塞 IO 时的 mount/unmount 流程图——从虚拟线程调用 `socket.read()` 到接收到数据(恢复)的全过程。说明它如何避免让一个 carrier 在等待期间闲置，并指出仍存在 OS/运行时开销。

3. 你的咖啡站现有代码使用 `Executors.newFixedThreadPool(200)` 处理 HTTP 请求,每个请求中多次调用数据库和缓存。大促期间 200 个线程全部卡在数据库查询上,新请求排队超时。请给出用虚拟线程的改造方案(只改三行代码),并分析为什么线程数从 200 飙升到几万也不会让系统崩溃。

4. 虚拟线程三条迁移纪律:①不池化 ②对 JDK 21–23 识别 pin,对 24+ 留意 native/foreign 调用 ③按上下文语义选择 ThreadLocal 或 Scoped Values。请针对每条给出一个例子和后果。

5. 你的项目将从 JDK 17 + 平台线程迁移到 JDK 21 + 虚拟线程。设计迁移策略:① 哪些代码最容易直接受益(改一行 Executor 即可)?② 哪些代码需要重构(存在 `synchronized` + IO 或 `ThreadLocal` 滥用)?③ 虚拟线程是否应该全部替代平台线程?找出至少一个场景,虚拟线程不适合而平台线程仍然是最佳选择。

> [!答案]
> **1-1** B(1:1 映射——Java Thread(平台线程)创建时,底层调用 OS API 创建内核线程。每个平台线程是一个独立的调度实体,被 OS 调度器管理)  
> **举一反三**:1:1 模型的优劣:优势——真实并行,多核 CPU 同时运行多个平台线程;劣势——OS 线程是稀缺资源,创建/切换成本高(用户态↔内核态切换),栈内存大(默认 1MB)。
>
> **1-2** B(虚拟线程的 Java 栈以堆上的 continuation stack chunk 形式按需保存；调用深度、局部变量和 JVM 实现都会影响占用，不能把某个字节数当成规格。)  
> **举一反三**:平台线程的原生栈与虚拟线程的按需堆栈有不同的资源模型；容量估算应以实际负载、堆大小和栈深度压测为准，不能从「百万线程」口号反推内存。
>
> **1-3** B(IO 密集是虚拟线程的最高价值场景——阻塞 IO 时虚拟线程卸载平台线程,让 OS 线程去服务别的虚拟线程。传统线程在阻塞时 OS 线程被浪费,虚拟线程把这段「浪费」转化为吞吐。CPU 密集任务没有这个收益——因为不会阻塞,不需要卸载)  
> **举一反三**:虚拟线程的提升公式:收益 ≈ 阻塞时间 / 总任务时间。纯 CPU 计算(阻塞时间 ≈ 0)≈ 0% 提升;微服务调用(阻塞时间 90%+)≈ 10x 提升。
>
> **1-4** B(这是 **JDK 21–23** 的 pin:在 `synchronized` 块内阻塞或执行 native 调用时,虚拟线程可能不能卸载,carrier 被独占。JDK 24 的 JEP 491 已消除 `synchronized` 导致的 pin;native/foreign 调用仍需审视。)
> **举一反三**:不能把旧版建议搬到 Java 25——无需为了避开 monitor pin 把所有 `synchronized` 替成 `ReentrantLock`;锁该怎么选仍看语义、竞争和可中断需求。迁移旧版时才把阻塞操作移出 `synchronized` 作为重点检查项。
>
> **1-5** D(B 和 C 都对——`Thread.ofVirtual().start(r)` 创建单个虚拟线程；该 API 在 JDK 19、20 为预览，JDK 21 起正式可用。`Executors.newVirtualThreadPerTaskExecutor()` 返回一个每任务创建新虚拟线程的执行器，不对虚拟线程做复用池化。)  
> **举一反三**:`Thread.ofPlatform()` 创建平台线程,`Thread.ofVirtual()` 创建虚拟线程。两者 API 对称,意图却相反——平台线程需要池化复用,虚拟线程用后即弃。
>
> **1-6** B(通常不池化虚拟线程：让每个任务拥有自己的短生命周期虚拟线程。需要限制并发时，应限制数据库连接、外部请求等稀缺资源，或使用 Semaphore/背压，而不是把虚拟线程池当作通用限流器。)  
> **举一反三**:「不池化」并非「无限并发」：虚拟线程降低的是等待占用 carrier 的成本，堆、排队任务和下游服务仍需容量边界与监控。
>
> **1-7** B(ThreadLocal 仍受完整支持。线程结束后其副本通常可回收;但长生命周期任务、大对象或频繁创建的值仍要控制生命周期。JDK 25 的 ScopedValue 适合不可变、单向上下文，不是 ThreadLocal 的全量替换。)
> **举一反三**:选择依据是数据流：需要可变的线程私有状态时用 ThreadLocal 并管理好生命周期；调用方把不可变上下文传给下游时，用 ScopedValue 的作用域绑定更清晰。
>
> **1-8** B(仅针对 JDK 21–23：synchronized 块内阻塞 IO 会 pin。JDK 24+ 不再因 monitor pin;仍应避免在持锁区执行慢 I/O，因为它会拉长临界区。)
> **举一反三**:`-Djdk.tracePinnedThreads=full` 是 JDK 21–23 的诊断手段；JDK 24+ 对 monitor pin 已不再需要且该属性无效。Java 25 排查时应围绕 native/foreign 调用、持锁时间与真实阻塞证据做判断。
>
> **1-9** B(没有固定数量级。虚拟线程可把大量等待任务挂起而不各占一个 OS 线程，但能承载多少取决于每个任务的堆状态和栈深、连接与文件描述符、队列、GC 和下游容量。)  
> **举一反三**:不要把「百万并发」当成容量承诺；先为数据库、网络连接和外部 API 设置明确上限，再用真实请求分布压测 JVM 与系统参数。
>
> **1-10** B(StructuredTaskScope 用作用域组织子任务的生命周期、等待和取消，通常与虚拟线程配合；截至 JDK 25 它仍是预览 API，使用时需启用预览。)
> **举一反三**:如果把虚拟线程比作"Task",StructuredTaskScope 就是 "Task 的生命周期管理器"。没有它,虚拟线程的 fork-join 模式容易泄漏;有它,子线程结束时间被限定在 scope 的 try 块内,语义清晰。
>
> **2-1** 三个关键对比：① 创建与调度的成本：平台线程直接映射到 OS 线程，虚拟线程由 JVM 调度，二者的具体耗时必须以目标 JDK/OS 压测为准；② 栈：平台线程有原生栈，虚拟线程的 Java 栈按需保存在堆中；③ 数量：二者都没有可脱离工作负载的安全数字。虚拟线程适合大量独立、经常等待受支持 I/O 的任务，因为等待时 carrier 可以执行其他工作；它不会让 CPU 计算更快，也不会增加数据库或远程服务的容量。  
> **举一反三**:虚拟线程解决的是「等待占用 OS 线程」的成本，不是绕过资源限制。容量结论应来自压测、队列指标和下游限流，而不是固定的微秒、MB 或线程数公式。
>
> **2-2** 流程:
> ```
> 虚拟线程 VT-1 执行中（mount 在平台线程 PT-A 上）
>     │
>     ▼
> VT-1 调用 socket.read() → 内核无数据 → 进入阻塞
>     │
>     ▼ JVM 运行时
> ① 保存 VT-1 的执行状态到堆上的 continuation 对象
> ② 卸载 VT-1 从 PT-A（unmount）→ PT-A 恢复可用状态
> ③ 将 VT-1 标记为"等待 IO"
>     │
>     ▼
> PT-A 从调度队列取下一个虚拟线程 VT-2 并 mount 它
> PT-A 开始执行 VT-2 的代码（继续干活,无阻塞）
>     │
>     │  ... 同时,内核在网络数据到达后 ...
>     ▼
> ④ 内核通知 JVM:数据就绪,VT-1 的 socket 可读
> ⑤ JVM 将 VT-1 放回「就绪队列」
> ⑥ 某个空闲的 PT（PT-B）从就绪队列取 VT-1,mount 并恢复执行
> ⑦ VT-1 从 socket.read() 返回,拿到数据,继续执行
> ```
> 这里的关键不是「没有 OS 开销」：socket I/O 仍要经过内核，JVM 也仍要调度 carrier。收益在于等待期间 VT-1 可以卸载，PT-A 能去运行 VT-2，而不是和 VT-1 一起闲置。mount/unmount、park/unpark、事件通知与 GC 都有成本，不能从模型直接推出固定数量级的切换性能。  
> **举一反三**:用 JFR、吞吐/延迟和 carrier 利用率验证是否受益；当任务主要消耗 CPU，或阻塞点不适合卸载时，虚拟线程不保证更快。
>
> **2-3** 改三行:
> ```java
> // 改前
> ExecutorService pool = Executors.newFixedThreadPool(200);
> // 改后
> ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor();
> ```
> 原理:每个 HTTP 请求提交到 executor:
> ```java
> pool.submit(() -> {
>     String user = db.query("SELECT ...");  // 阻塞,虚拟线程自动 unmount
>     String order = db.query("SELECT ..."); // 阻塞,再 unmount
>     cache.set(key, compute(user, order));  // 缓存可能远程
>     return response;
> });
> ```
> 为什么可把 200 个平台线程的排队瓶颈移开：每个请求可使用一个虚拟线程，在支持卸载的 I/O 等待中不独占 carrier。但「几万」绝非安全保证——任务对象、请求体、排队、GC、连接数和下游延迟都会形成新的上限。迁移时保留数据库连接池，并在进入稀缺下游前使用 Semaphore、限流或背压。  
> **举一反三**:例如数据库最多 200 个并发连接时，3 万个请求不能同时把 3 万个查询压给数据库；其余请求应受控等待或被拒绝。虚拟线程使这种等待更便宜，不会自动替你完成容量治理。
>
> **2-4** ① 不池化——错误:
> ```java
> ExecutorService pool = Executors.newFixedThreadPool(100, Thread.ofVirtual().factory());
> // 提交 1000 个任务,只有 100 个虚拟线程在跑,其余排队——人为限流,违了虚拟线程的初衷
> ```
> 正确:
> ```java
> ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor();
> // 1000 个任务,每个一个虚拟线程,全部并行——限流的任务交给 Semaphore 或连接池
> ```
> ② JDK 21–23 的防钉住——错误:
> ```java
> synchronized(dataLock) {
>     String result = httpClient.send(request); // JDK 21–23:阻塞 IO 在 synchronized 内会 pin
> }
> ```
> 正确:
> ```java
> String result = httpClient.send(request); // IO 移到锁外
> synchronized(dataLock) {
>     updateData(result); // 只有快速操作在锁内
> }
> // Java 25 不会因 synchronized pin;这里保留短临界区是为了降低锁竞争时间
> ```
> ③ 不加区分地使用 ThreadLocal——需要评估:
> ```java
> ThreadLocal<User> currentUser = new ThreadLocal<>();
> // 短任务结束后副本可回收;长任务或大对象仍要管理生命周期
> ```
> 正确:
> ```java
> private static final ScopedValue<User> CURRENT_USER = ScopedValue.newInstance();
> ScopedValue.where(CURRENT_USER, user).run(() -> {
>     handleRequest(); // 作用域内可见,出了自动释放,无需 remove
> });
> ```
> **举一反三**:三条纪律的统一原则是「别拿平台线程时代的资源模型套虚拟线程」：任务一线程、下游另行限流；JDK 21–23 留意 pin，JDK 24+ 关注 native/foreign 调用和临界区时长；上下文则按可变性与传播方向选择 ThreadLocal 或 ScopedValue。
>
> **2-5** ① 最容易直接受益的代码:大量独立、会阻塞等待 I/O 的任务，可评估从平台线程 Executor 迁到 `Executors.newVirtualThreadPerTaskExecutor()`；仍须用连接池、Semaphore 或背压保护下游。② 迁移检查项：JDK 21–23 排查 `synchronized` 内阻塞；JDK 24+ 不再为 monitor pin 改锁，但仍检查 native/foreign 调用与长临界区；ThreadLocal 按任务寿命和数据流决定是否换 ScopedValue；依赖池大小限流的代码改为显式 Semaphore/限流器。③ 纯 CPU 密集型不因虚拟线程变快，使用按核数和工作负载配置的 Executor/ForkJoinPool。结构化并发截至 JDK 25 仍需预览开关。
> **举一反三**:迁移先做容量测试和下游保护，再换 Executor；不要把「IO 密集」简化成不经测试的全局替换。
---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
