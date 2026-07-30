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
- 背下三条纪律:不池化、留意超老版本的钉住、ThreadLocal 换 Scoped Values;
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
| JDK 25 | Scoped Values 转正(JEP 506) | 轻量上下文传递,接棒 ThreadLocal |

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
3. **ThreadLocal 换 Scoped Values。** 百万虚拟线程 = 百万份 ThreadLocalMap(回看第 75 话的托盘),内存压力陡增还容易忘 remove。Scoped Values(JEP 506,JDK 25 转正)不可变、随作用域自动失效:

> **版本与实现边界**:JEP 444 的收益来自 JVM 支持的阻塞操作可在等待时卸载 carrier,并不是「任何阻塞都会卸载」的承诺。JDK 21–23 在 `synchronized` 内阻塞会 pin;JEP 491 在 JDK 24 修复这一种 monitor 场景,但 native / foreign-function 调用等仍可能 pin,Java 25 也不能据此承诺「绝不会 pin」。「不池化」是默认的资源复用建议;有界执行器或信号量可以作为**明确的准入控制**,阈值须按下游连接数、文件描述符、内存与 P95/P99 压测决定。文中耗时是教学推演,不是可迁移的性能基准。

```java
static final ScopedValue<String> MEMBER_ID = ScopedValue.newInstance();

ScopedValue.where(MEMBER_ID, "M1024")
           .run(() -> handleOrder());   // 作用域内随取随用,结束即失效,永不泄漏
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
          一任务一虚拟线程 + 信号量限下游;Scoped Values 传上下文不泄漏
还没有  :武器库配齐,却还没真刀真枪打过硬仗 —— 明晚,那道旧疤要重新揭开
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 虚拟线程(JEP 444)与 carrier 模型 | 新版并发八股 C 位,「适合什么场景」几乎必问 |
| 一任务一线程、不池化、信号量限流 | 高并发岗的工程判断题,答「池化管理」直接扣分 |
| 钉住问题的版本线(JDK 24 已解) | 区分「背过」与「跟进过」的分水岭 |
| Scoped Values 接棒 ThreadLocal | 答得出 JDK 25 新特性,说明真在读版本说明 |

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
   - A) 默认 1MB,和平台线程一样　　B) 默认几十到几百 KB,且由 JVM 动态管理——栈以「堆栈块(continuation frames)」形式存储在堆上,按需分配和缩小,不需要预留 1MB　　C) 不使用栈,使用堆上的 ArrayList 模拟　　D) 固定 256KB

3. 虚拟线程最受益的场景是?
   - A) 纯 CPU 计算密集型(如加密解密、图像处理)　　B) IO 密集型(如数据库查询、HTTP 调用、文件读写)——阻塞时虚拟线程在 JVM 内 mount/unmount 到平台线程,不阻塞 OS 线程,使平台线程能服务其他虚拟线程,大幅提升并发吞吐　　C) 所有场景都受益　　D) 只是语法糖,没有性能提升

4. 虚拟线程的「pin(钉住)」问题指的是什么?
   - A) 虚拟线程被固定在某个 CPU 核上　　B) 当虚拟线程执行 `synchronized` 块或 native 方法时,不能被 unmount(不能从平台线程上卸下)——导致阻塞期间独占该平台线程,其他虚拟线程无法使用它,削弱了虚拟线程的并发优势　　C) 虚拟线程被 GC 标记为不可移动的对象　　D) 虚拟线程和平台线程的绑定关系不可改变

5. 以下关于虚拟线程的创建方式,正确的是?
   - A) `new Thread(() -> {}).start()`——和创建平台线程一样　　B) `Thread.ofVirtual().start(() -> {})`——JDK 19+ 的虚拟线程工厂方法,创建的 Thread 默认以虚拟线程身份运行　　C) `Executors.newVirtualThreadPerTaskExecutor()`——提交的任务在每个虚拟线程中执行,不需池化管理　　D) B 和 C 都正确

6. 虚拟线程和线程池的关系,以下哪个说法正确?
   - A) 应该创建一个固定大小的虚拟线程池来复用虚拟线程　　**B) 虚拟线程不应池化——它们是廉价的(几乎不消耗系统资源),应该「一任务一线程」直接创建;池化反而违背了虚拟线程的设计初衷(每个任务隔离,无状态污染)**　　C) 虚拟线程也必须池化,否则会内存溢出　　D) 虚拟线程不需要管理,也不能显式创建

7. 虚拟线程的 `ThreadLocal` 使用需要注意什么?
   - A) 完全不能用　　**B) 能用,但要严守 `remove` 纪律——虚拟线程虽然库存百万条,但每条仍携带 `ThreadLocal` 的 value 强引用,不 remove 仍会泄漏;且 JDK 21+ 推荐将不可变上下文迁移到 `ScopedValue`,既无泄漏风险又自动在 mount/unmount 时传播**　　C) 虚拟线程的 ThreadLocal 值会被 GC 自动回收　　D) 虚拟线程创建 ThreadLocal 时会自动设置过期时间

8. 以下哪种代码模式会导致虚拟线程被「pin」?
   - A) `Thread.sleep(1000)`　　**B) `synchronized(obj) { blockingIO(); }`——在 `synchronized` 块内执行阻塞操作,虚拟线程无法 unmount,期间绑定的平台线程被独占**　　C) `lock.lockInterruptibly()`　　D) `CompletableFuture.supplyAsync(() -> work())`

9. 虚拟线程的数量级通常在什么范围?
   - A) 几百到几千,和平台线程一样　　**B) 可达数十万甚至百万——虚拟线程只占堆内存(每个几百字节到几 KB 栈),不消耗 OS 线程资源,理论上受限于 JVM 堆内存大小而非 OS 线程限制**　　C) 受限于 CPU 核数 × 2　　D) 虚拟线程有硬上限 65535

10. JDK 21 的结构化并发 `StructuredTaskScope` 与虚拟线程的关系是?
   - A) 两者没有关系,是完全独立的两个 API　　**B) `StructuredTaskScope` 是虚拟线程的「组织者」——它在一段代码中 fork 出多个子虚拟线程,并在所有子线程结束时自动 join,提供清晰的父子关系和作用域管理;两者配合解决「虚拟线程泄漏」(fork 出去的线程不知何时结束)的问题**　　C) `StructuredTaskScope` 只支持平台线程　　D) `StructuredTaskScope` 是虚拟线程的另一种写法

### 解答题(5 道)

1. 用三个关键数字对比平台线程和虚拟线程:① 创建成本 ② 栈内存 ③ 最大数量,并解释为什么这些差异让虚拟线程适合「高并发 + 频繁阻塞」的场景。

2. 画出虚拟线程在阻塞 IO 时的 mount/unmount 流程图——从虚拟线程调用 `socket.read()`(阻塞)到接收到数据(恢复)的全过程。解释为什么这个过程不消耗 OS 调度器的时间片。

3. 你的咖啡站现有代码使用 `Executors.newFixedThreadPool(200)` 处理 HTTP 请求,每个请求中多次调用数据库和缓存。大促期间 200 个线程全部卡在数据库查询上,新请求排队超时。请给出用虚拟线程的改造方案(只改三行代码),并分析为什么线程数从 200 飙升到几万也不会让系统崩溃。

4. 虚拟线程三大纪律:①不池化 ②防钉住(pin) ③ThreadLocal→Scoped Values。请针对每条纪律给出一个违反它的代码示例和后果,以及遵守它的正确写法。

5. 你的项目将从 JDK 17 + 平台线程迁移到 JDK 21 + 虚拟线程。设计迁移策略:① 哪些代码最容易直接受益(改一行 Executor 即可)?② 哪些代码需要重构(存在 `synchronized` + IO 或 `ThreadLocal` 滥用)?③ 虚拟线程是否应该全部替代平台线程?找出至少一个场景,虚拟线程不适合而平台线程仍然是最佳选择。

> [!答案]
> **1-1** B(1:1 映射——Java Thread(平台线程)创建时,底层调用 OS API 创建内核线程。每个平台线程是一个独立的调度实体,被 OS 调度器管理)  
> **举一反三**:1:1 模型的优劣:优势——真实并行,多核 CPU 同时运行多个平台线程;劣势——OS 线程是稀缺资源,创建/切换成本高(用户态↔内核态切换),栈内存大(默认 1MB)。
>
> **1-2** B(堆栈存于堆,动态管理——虚拟线程的栈由 JVM 以 stack chunk 对象形式分配在堆上,调用链深时自动扩展堆栈块,返回时自动收缩。初始只有几百字节,峰值可能几百 KB)  
> **举一反三**:传统线程栈的固定 1MB 是最大的内存瓶颈——1000 个线程 = 1GB 栈内存。虚拟线程的栈按需分配,100 万虚拟线程的内存消耗可能不到 1GB(假设每个平均栈深度浅),这就是百万并发的物质基础。
>
> **1-3** B(IO 密集是虚拟线程的最高价值场景——阻塞 IO 时虚拟线程卸载平台线程,让 OS 线程去服务别的虚拟线程。传统线程在阻塞时 OS 线程被浪费,虚拟线程把这段「浪费」转化为吞吐。CPU 密集任务没有这个收益——因为不会阻塞,不需要卸载)  
> **举一反三**:虚拟线程的提升公式:收益 ≈ 阻塞时间 / 总任务时间。纯 CPU 计算(阻塞时间 ≈ 0)≈ 0% 提升;微服务调用(阻塞时间 90%+)≈ 10x 提升。
>
> **1-4** B(pin 的本质——虚拟线程在 `synchronized` 块或 JNI native 方法中不能卸载。如果此时发生阻塞 IO,虚拟线程被 pin 在平台线程上,该平台线程被独占,无法服务其他虚拟线程)
> **举一反三**:pin 是虚拟线程设计上的一个已知限制——monitor 锁（`synchronized`）与虚拟线程的挂载/卸载机制之间存在冲突,因为 monitor 持有者必须是 OS 线程。解决方法:把 `synchronized` 替换成 `ReentrantLock`（显式锁不 pin）,或者把阻塞操作移出 synchronized 块。
>
> **1-5** D(B 和 C 都对——`Thread.ofVirtual().start(r)` 创建单个虚拟线程;`Executors.newVirtualThreadPerTaskExecutor()` 返回一个每任务创建新虚拟线程的执行器,不用池化)  
> **举一反三**:`Thread.ofPlatform()` 创建平台线程,`Thread.ofVirtual()` 创建虚拟线程。两者 API 对称,意图却相反——平台线程需要池化复用,虚拟线程用后即弃。
>
> **1-6** B(不池化——虚拟线程的创建成本极低(非系统调用,只是堆上分配对象),栈内存极小,生命周期短。池化会引入三个问题:①限制了最大并发数(违背虚拟线程的初衷) ②带来 ThreadLocal 污染(线程复用=旧值残留) ③管理复杂度(池大小、队列、拒绝策略),而这些在虚拟线程下都是多余的)  
> **举一反三**:"不要池化"是虚拟线程最反直觉的纪律——因为我们被平台线程的昂贵成本训练了二十年,潜意识里认为"池化 = 高性能"。虚拟线程颠覆了这个前提:廉价资源不需要池化。
>
> **1-7** B(能用但要 remove,且推荐迁移到 ScopedValue——虚拟线程的 Thread 对象仍然有 ThreadLocalMap,不 remove 仍然泄漏。区别在于泄漏速度:平台线程 200 个,每个泄漏 1MB,总计 200MB;虚拟线程可能 10 万个,每个泄漏 1KB,总计 100MB——仍然不可接受。ScopedValue 是官方推荐的替代)  
> **举一反三**:虚拟线程让 ThreadLocal 的泄漏从"慢性病"变成"急性病"——虽然单个虚拟线程的 ThreadLocal 泄漏量小,但虚拟线程数量大,泄漏总量可能比平台线程更大且更难定位。所以迁移到 ScopedValue 不是可选项,而是必选项。
>
> **1-8** B(synchronized 块内阻塞 IO → pin 住。虚拟线程在 `synchronized` 持有 monitor 时不能被 unmount,阻塞期间独占平台线程)
> **举一反三**:pin 的检测:用 `-Djdk.tracePinnedThreads=full` JVM 参数,当虚拟线程被 pin 时 JVM 打印栈信息。常见的 pin 陷阱:`synchronized(this) { socket.read(); }`——把 I/O 放在 synchronized 块里,十个虚拟线程就能 pin 住十个平台线程,所有并发优势全毁。
>
> **1-9** B(数量由堆内存决定,不受 OS 线程限制——一个虚拟线程的对象本体加初始栈约占几百字节到 1KB,1GB 堆内存理论上可承载百万级别虚拟线程。实际瓶颈是:① 每个虚拟线程的局部变量总量 ② 异步操作数(连接数、FD 数) ③ 业务逻辑复杂度)  
> **举一反三**:"百万并发"的硬件要求不像想象中那么高——瓶颈不再在线程,而在网络连接数(需要 OS 参数优化)、数据库连接池(不能用 1 请求 1 DB 连接)、以及下游服务的承载能力。虚拟线程解决了"并发等待"的瓶颈,但下游系统成为新的瓶颈。
>
> **1-10** B(StructuredTaskScope 解决虚拟线程的生命周期管理——它在 try-with-resources 块内 fork 出子虚拟线程,在 scope.close() 时自动 join 所有子线程,保证 fork 出的线程不会逃逸到作用域外,防止"僵尸虚拟线程"。如果 fork 出去忘记 join,虚拟线程就变成孤儿线程;StructuredTaskScope 通过作用域自动约束)  
> **举一反三**:如果把虚拟线程比作"Task",StructuredTaskScope 就是 "Task 的生命周期管理器"。没有它,虚拟线程的 fork-join 模式容易泄漏;有它,子线程结束时间被限定在 scope 的 try 块内,语义清晰。
>
> **2-1** 三个关键对比:① 创建成本——平台线程 ≈ 1ms(OS 系统调用),虚拟线程 ≈ 1µs(JVM 堆分配,无系统调用)。② 栈内存——平台线程默认 1MB(预留),虚拟线程几百字节~几百 KB(按需分配)。③ 最大数量——平台线程 ≈ 数千(OS 内核线程上限,如 Linux pid_max 限制),虚拟线程 ≈ 数十万到百万(仅受堆内存限制)。适用性解释:高并发=大量任务同时在线,频繁阻塞=大部分时间在等 IO 不干活。平台线程:每个等待都要占一条线程(每线程 1MB × 几千条 = 几 GB 内存,数千个已到 OS 上限)。虚拟线程:等待时不占线程——因为阻塞时自动卸下,平台线程去服务其他虚拟线程;数十万虚拟线程同时等待,但内存消耗仅取决于「同时在干活」的个数×栈深,而非「总共存在」的个数。效果:10000 并发数,平台线程需要 10000×1MB ≈ 10GB 栈+线程调度开销→崩溃;虚拟线程需要约 50MB 堆+极少量平台线程→轻松运行。  
> **举一反三**:虚拟线程解决的不是"加速计算",而是"降低等待的资源成本"。类比:传统线程是给每个顾客配一个服务员(服务员=平台线程),服务员陪等菜;虚拟线程是给每个顾客发一个"等待牌"(轻量对象),只有上菜的瞬间才需要一个服务员。
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
> 不消耗 OS 时间片:步骤①-③和④-⑦全在 JVM 用户态完成——没有系统调用、没有 OS 线程切换、没有用户态↔内核态切换。平台线程 A 在 VT-1 阻塞后被「回收」去处理 VT-2,这个过程是 JVM 的调度,开销远小于 OS 线程切换。真正发生的是:一次 `park/unpark`(用户态)而非一次 `context_switch`(内核态)。  
> **举一反三**:为什么虚拟线程切换比平台线程快 2-3 个数量级?因为 OS 线程切换需要保存/恢复寄存器、切换页表、TLB flush、更新调度器数据结构——全是内核态操作。虚拟线程挂载/卸载只需保存/恢复 Java 栈帧到堆,全程在用户态,不需要陷入内核,也不需要更新 MMU。
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
> 为什么 200→几万不崩溃:① 线程数飙升是因为"创建成本极低"——每请求一个虚拟线程,不是池化复用,而是用完就释放(GC)。只要堆够,能承载的虚拟线程数就受限于内存。② 崩溃的边界从「线程等待占用 OS 线程」变成了「数据库连接池上限」——即使 30 万个虚拟线程同时在线,其中只有约 50 个同时在干活(对应 50 个数据库连接),其余 29 万 950 个都在等待网络 IO(挂起状态,不占 CPU,只占几百字节堆)。瓶颈从线程池转移到数据库连接池——后者才是真正的限流点,需配合连接池大小控制。  
> **举一反三**:虚改后的新瓶颈:数据库连接数。如果 3 万个虚拟线程同时 query,数据库最多接受 200 连接,剩下 29800 个虚拟线程排着等——但它们只占内存不消耗 CPU,等待本身不会让系统崩溃。真正需要控制的是上游流量(limit 信号量)或数据库连接池大小。
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
> ② 防钉住——错误:
> ```java
> synchronized(dataLock) {
>     String result = httpClient.send(request); // 阻塞 IO 在 synchronized 内,pin!
> }
> ```
> 正确:
> ```java
> String result = httpClient.send(request); // IO 移到锁外
> synchronized(dataLock) {
>     updateData(result); // 只有快速操作在锁内
> }
> // 或改用 ReentrantLock(不 pin 虚拟线程)
> ```
> ③ ThreadLocal→ScopedValue——错误:
> ```java
> ThreadLocal<User> currentUser = new ThreadLocal<>();
> // 虚拟线程用完不 remove → 内存持续增长,百万个虚拟线程可能泄漏大量数据
> ```
> 正确:
> ```java
> private static final ScopedValue<User> CURRENT_USER = ScopedValue.newInstance();
> ScopedValue.where(CURRENT_USER, user).run(() -> {
>     handleRequest(); // 作用域内可见,出了自动释放,无需 remove
> });
> ```
> **举一反三**:三条纪律的统一原则——虚拟线程的设计哲学是"轻量、临时、无状态"。池化(有状态+复用)、pin(与 OS 层的状态耦合)、ThreadLocal(有状态+手动清理)全部违背了这个哲学。遵守三条纪律,就是在把代码从"有状态"转向"无状态",这正是现代并发编程的核心趋势。
>
> **2-5** ① 最容易直接受益的代码:所有使用 `ExecutorService` 处理大量 IO 任务的代码——把 `Executors.newFixedThreadPool(n)` 或 `Executors.newCachedThreadPool()` 换成 `Executors.newVirtualThreadPerTaskExecutor()`。典型场景:Web 容器(如 Tomcat 已支持虚拟线程)、HTTP 网关、消息消费者、批量数据同步器。只需改 Executor 的创建,其他代码不变。② 需要重构的代码:标识在 synchronized 内有阻塞 IO (`synchronized(lock) { db.query() }`)→ 移除同步块/替换为 ReentrantLock;ThreadLocal 未 remove → 改为 ScopedValue 或加 finally remove;依赖池大小做限流(如 `pool.getQueue().size()`)→ 改为 Semaphore 限流。③ 不是所有场景都用虚拟线程:纯 CPU 密集型(如实时音视频编解码、科学计算、图形渲染)——虚拟线程不加速计算,用平台线程+ForkJoinPool 最合适。需精确控制线程优先级或 CPU 亲和性——虚拟线程不支持这些。需 JNI 频繁调用 → JNI 会 pin 虚拟线程。结论:虚拟线程替代了「为等 IO 而生的线程池」,但不替代「为并行计算而生的线程池」。迁移策略:IO 密集→虚拟线程,CPU 密集→ForkJoinPool,两者共存。  
> **举一反三**:迁移的三个层次——L1:换 Executor 不换业务逻辑(80% 的场景);L2:修 synchronized+IO 和 ThreadLocal(15% 的场景);L3:重构架构利用 StructuredTaskScope(5% 的场景,如复杂的 fork-join 流)。不要试图一次迁移到 L3,从 L1 开始就能获取最大收益。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*
