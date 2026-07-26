---
title: "《从零开始学 Java》78 · 百万顾客:虚拟线程"
date: 2026-11-04
summary: "豆豆按下「百万顾客」压测钮,200 条平台线程全趴在 IO 上打盹,加线程直接 OOM。虚拟线程阻塞即卸载,一台机器轻松接下万单;可阿零顺手把它塞回线程池——吞吐纹丝不动。池化,恰恰是虚拟线程的头号反模式。"
tags: [Java, Java漫画, 虚拟线程, Scoped Values, 并发, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》78 · 百万顾客:虚拟线程

> 连载特刊 · 番外卷二「并发深水区」第 9 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——CompletableFuture 把异步流水线编排得行云流水,可底座还是那 200 条昂贵的平台线程;百万顾客一到,先跪的不是代码,是线程模型。

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

## 九、项目检查点 · 并发特训 9/10

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

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
