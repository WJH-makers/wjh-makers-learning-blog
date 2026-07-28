---
title: "《从零开始学 Java》41 · 线程与线程池:给咖啡站雇一批工人"
date: 2026-09-03
summary: "单线程服务器一次只招待一个人,这一话给咖啡站雇一批工人线程并发出杯。从 Thread/Runnable 到 ExecutorService,拆穿线程池那七个参数,再撞上一堵最经典的墙——无界队列把服务器自己撑爆 OOM。"
tags: [Java, Java漫画, 并发, 线程池, ExecutorService, 阿零与豆豆]
---

# 《从零开始学 Java》41 · 线程与线程池:给咖啡站雇一批工人

> 连载特刊 · 第五季「服务器战争」第 2 话 · 基线 Java 25(最新 LTS)
> 承接:上一话手写的 `ServerSocket` 是单线程的,`accept` → `handle` → 再 `accept`,一次只服务一个连接,后面全排队。今天让它并发。

---

## 一、需求:让多个顾客同时被招待

上一话结尾那堵墙:第一个顾客要"慢制作"5 秒,第二个顾客只能干等。根因不是网络慢,是**服务器只有一个工人**。豆豆:「一个收银员当然忙不过来。解决办法很朴素——**多雇几个工人,一人招待一位顾客**。在 Java 里,一个『工人』就是一条**线程**。但工人不是越多越好,乱雇会把咖啡站自己挤垮。今天你要学会的,是**用线程池管住这批工人**。」

---

## 二、漫画 · 雇工人这件事

> **〔1〕** 阿零把上一话的 `handle(socket)` 塞进一条新线程:「每来一个连接,我就 `new Thread` 开一个工人去处理,不就并发了?」两个顾客同时进来,果然都被招待了。
> 阿零:「成了!并发也就这样嘛。」

> **〔2〕** 早高峰来了。门口"轰"地涌进几千人,阿零的 `new Thread` 一视同仁地为每个人**新雇一个工人**。收银台后面瞬间挤了几千个工人,互相踩脚,咖啡站开始冒烟。
> 豆豆(叼豆子):「线程不是免费的。每条线程都要占一块栈内存、还要抢 CPU 时间片。你无脑 `new`,几千条线程能把机器直接压垮。」

> **〔3〕** 豆豆掏出一张"用工合同":固定雇 `n` 个正式工(核心线程),忙不过来时门口摆一排**候客椅**(任务队列),椅子也坐满了才临时加派**临时工**(最大线程),再满就**婉拒顾客**(拒绝策略)。
> 豆豆:「这套合同,就叫**线程池**。工人复用,不再来一个雇一个。」

> **〔4〕** 阿零照抄了个"省事写法"`Executors.newFixedThreadPool(10)`,自我感觉良好。豆豆盯着那排**看不到尽头的候客椅**,眉头一皱:「你这椅子……是无限长的?」
> 阿零:「无限好啊,谁都不用被拒绝!」豆豆:「顾客是不被拒绝了——**内存先被撑爆**。」

> **〔5〕** 半小时后,服务器"啪"地栽倒,终端吐出 `OutOfMemoryError`。几十万个还没处理的订单,全堆在那条无限长的队列里,把堆内存塞满了。
> 阿零:「……原来『不拒绝』才是最狠的拒绝。」豆豆:「记住:**队列必须有界,拒绝策略必须想清楚**。」

---

## 三、本话目标

- 分清 `Thread`、`Runnable` 与"任务 vs 线程";
- 用 `ExecutorService` 线程池复用工人,替代裸 `new Thread`;
- 讲透 `ThreadPoolExecutor` **七个参数**与任务的流转顺序;
- 撞一次无界队列 OOM,理解为什么"省事写法"是陷阱;
- 知道 Tomcat 线程池怎么调,以及虚拟线程带来的变化。

---

## 四、原理图:一个任务在线程池里的旅程

```text
提交任务 execute(task)
     │
     ▼
核心线程有空位? ──是──▶ 直接派一个核心线程处理
     │否
     ▼
任务队列 workQueue 没满? ──是──▶ 进队列排队,等有空的线程来取
     │否
     ▼
线程数 < maximumPoolSize? ──是──▶ 临时加派非核心线程处理
     │否
     ▼
触发拒绝策略 handler(抛异常 / 调用方自己跑 / 丢弃 …)

关键:先占核心线程 → 再塞队列 → 再加临时线程 → 最后才拒绝。
顺序千万别记反:队列没满时,是不会去开临时线程的。
```

线程池的价值:**把"任务"和"执行任务的线程"解耦**。你只管往里丢任务(`Runnable`),池子负责用一批复用的线程去消化——省掉了反复创建/销毁线程的开销,还能给并发量**封顶**。

---

## 五、代码:从裸线程到线程池

先看阿零那版"来一个雇一个"(会翻车,见第六节),再换成线程池。承接上一话的 `handle(socket)`:

```java
import java.net.ServerSocket;
import java.util.concurrent.*;

public class PooledServer {
    // 手动 new ThreadPoolExecutor —— 七个参数一个都不藏
    static final ExecutorService POOL = new ThreadPoolExecutor(
            8,                                  // 1 corePoolSize   核心线程:常驻工人
            32,                                 // 2 maximumPoolSize 最大线程:高峰临时工上限
            60, TimeUnit.SECONDS,               // 3+4 keepAliveTime+unit 临时工空闲 60 秒就辞退
            new ArrayBlockingQueue<>(200),      // 5 workQueue      有界队列:最多 200 人候客
            new ThreadFactory() {               // 6 threadFactory  给线程起名,排障时一眼认出
                private int id = 0;
                public Thread newThread(Runnable r) {
                    return new Thread(r, "coffee-worker-" + (id++));
                }
            },
            new ThreadPoolExecutor.CallerRunsPolicy()); // 7 handler 满了就让调用方自己跑,产生背压

    public static void main(String[] args) throws Exception {
        try (ServerSocket server = new ServerSocket(8080)) {
            System.out.println("咖啡站(线程池版)监听 :8080");
            while (true) {
                var socket = server.accept();       // 主线程只负责接客
                POOL.execute(() -> handle(socket)); // 把"招待"这件事丢给池子里的工人
            }
        }
    }

    static void handle(java.net.Socket socket) { /* 上一话的读写逻辑,原样搬过来 */ }
}
```

`() -> handle(socket)` 就是一个 `Runnable`(任务);`POOL` 里的线程(工人)去执行它。**任务是活,线程是人**——这是并发编程第一个要分清的概念。

> **豆豆旁白**:给线程**起名字**(`coffee-worker-3`)不是强迫症。等第四话线上 CPU 打满,你 `jstack` 一抓,满屏 `pool-1-thread-17` 你根本不知道谁是谁;而 `coffee-worker-17` 一眼就知道是咖啡站的出杯工人。**能排障的代码,从起个好名字开始。**

---

## 六、故意制造一个 Bug:那个"省事"的线程池

阿零把手动版换成一行"标准写法":

```java
// 阿里巴巴开发手册明令禁止的写法,却是新手最爱抄的一行
static final ExecutorService POOL = Executors.newFixedThreadPool(10);
```

然后用一个压测循环模拟早高峰,疯狂往里塞任务,每个任务故意慢一点:

```java
for (int i = 0; i < 1_000_000; i++) {
    final int id = i;
    POOL.execute(() -> {
        try { Thread.sleep(1000); } catch (InterruptedException ignored) {}
        System.out.println("出杯 #" + id);
    });
}
```

---

## 七、读懂现象:不是拒绝,是把自己撑死

只有 10 个工人,却瞬间涌进 100 万个任务。工人消化不过来,剩下的**全排进队列**——问题是这条队列**没有上限**。跑一会儿,堆内存被排队任务塞满:

```text
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
	at java.base/java.util.concurrent.LinkedBlockingQueue.offer(LinkedBlockingQueue.java:426)
	at java.base/java.util.concurrent.ThreadPoolExecutor.execute(ThreadPoolExecutor.java:1373)
	at com.coffee.PooledServer.main(PooledServer.java:29)
```

翻开 `Executors.newFixedThreadPool` 的源码,真相大白:

```java
public static ExecutorService newFixedThreadPool(int n) {
    return new ThreadPoolExecutor(n, n, 0L, TimeUnit.MILLISECONDS,
                                  new LinkedBlockingQueue<Runnable>()); // ← 无参 = 无界队列!
}
```

`LinkedBlockingQueue` 不传容量,默认容量是 `Integer.MAX_VALUE`——约等于无限。任务只进不出、越堆越多,`OutOfMemoryError` 是迟早的事。`newCachedThreadPool` 更刺激:它的最大线程数是 `Integer.MAX_VALUE`,高峰时会**无限创建线程**,直接把线程数打爆。这就是第五节我们坚持**手动 `new ThreadPoolExecutor` + 有界队列 + 明确拒绝策略**的原因。

> **豆豆锐评 · "线程数拍脑袋"和"队列无上限",是并发新手两大死法**
> 核心线程数不是玄学:**CPU 密集型**任务(算哈希、压缩)约设 `CPU 核数 + 1`,再多也抢不到 CPU 只会徒增切换;**IO 密集型**任务(查库、调接口,线程大量在等)可以设得比核数大很多。咖啡站出杯要查库存、写订单,是 IO 密集,所以核心 8、最大 32 是合理起点——但**最终值要靠压测标定,不是背公式**。

> **🔀 豆豆的多解台 · 线程池到底怎么建?**

| 方案 | 写法 | 适合什么时候 | 坑 |
|---|---|---|---|
| `Executors` 工厂 | `newFixedThreadPool(n)` | Demo、教学、写着爽 | 无界队列/无界线程,生产会 OOM,规约禁用 |
| 手动 `ThreadPoolExecutor` | 七参数全写,有界队列 | **生产标准做法**,参数可控可调 | 啰嗦,但值得 |
| Spring 封装 | `ThreadPoolTaskExecutor` | Spring 项目里配 Bean、`@Async` | 本质还是包了 `ThreadPoolExecutor`,别当魔法 |
| 虚拟线程池 | `Executors.newVirtualThreadPerTaskExecutor()` | 海量 IO 密集任务(Java 21+) | 一任务一(虚拟)线程,别再给它套核心数概念 |

豆豆锐评:生产环境**默认选手动七参数**——因为你必须对"队列多长、拒绝时怎么办"负责,这两件事 `Executors` 全替你偷偷定了,而且定得很危险。

> **⏳ 版本时光机 · "一连接一线程"的成本变了**

| JDK 版本 | 做法 | 关键变化 |
|---|---|---|
| Java 8~20 | 平台线程 + 线程池复用 | 线程 = 操作系统线程,每条约占 1MB 栈,几千条就吃紧,必须靠池子省着用 |
| Java 21 | **虚拟线程**(JEP 444 正式) | 线程由 JVM 调度、极轻量,几十万条也扛得住,"一请求一线程"重新可行 |
| Java 25 | 虚拟线程 + 结构化并发(预览) | 虚拟线程进一步成熟;IO 密集场景可用 `newVirtualThreadPerTaskExecutor` 直接顶 |

一句演进小结:线程池是为"平台线程太贵"发明的省钱手段;到了虚拟线程时代,**IO 密集**场景可以不再纠结线程数,但**CPU 密集**任务和需要限流的场景,有界线程池依然是正解。本话主线仍用 `ThreadPoolExecutor`,因为参数与流转是你面试和调 Tomcat 的地基。

---

## 八、修复并用测试证明:池子真的在并发出杯

换回第五节的有界线程池后,补一个测试证明"8 个工人能同时干活",而不是串行:

```java
import org.junit.jupiter.api.Test;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

class PoolTest {
    @Test
    void eight_workers_run_concurrently() throws Exception {
        var pool = Executors.newFixedThreadPool(8);
        var done = new AtomicInteger();
        var latch = new CountDownLatch(8);
        long start = System.currentTimeMillis();
        for (int i = 0; i < 8; i++) {
            pool.execute(() -> {
                try { Thread.sleep(500); } catch (InterruptedException ignored) {}
                done.incrementAndGet();
                latch.countDown();
            });
        }
        assertTrue(latch.await(2, TimeUnit.SECONDS), "8 个任务应并发在 2 秒内完成");
        assertEquals(8, done.get());
        // 若是单线程串行,8×500ms=4 秒;并发应远小于此
        assertTrue(System.currentTimeMillis() - start < 2000);
        pool.shutdown();
    }
}
```

`CountDownLatch` 是"等所有工人都喊完成"的计数闩。测试用**总耗时**反证并发:串行要 4 秒,并发只需约 0.5 秒。

> **豆豆旁白 · Tomcat 其实就是个大号线程池**
> 第四季的 Spring Boot,内嵌 Tomcat 底层正是一个线程池。你在 `application.yml` 里能调:`server.tomcat.threads.max`(最大工人,默认 200)、`threads.min-spare`(常驻工人)、`accept-count`(等待队列长度)。看懂本话七个参数,你就看懂了这几行配置在控制什么——线上"请求变慢、线程池打满",十有八九是这几个值没调对。

---

## 九、项目检查点 · 咖啡站学会并发

```text
新增能力:ServerSocket 接客后,把处理交给 ThreadPoolExecutor 并发出杯
用到    :Runnable/线程池、有界队列、拒绝策略、线程命名
排掉的坑 :Executors 无界队列 OOM;线程数拍脑袋
埋下的雷 :多个工人同时给"同一件商品"扣库存 —— 会不会扣乱?下一话见分晓
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| `ThreadPoolExecutor` 七参数 | 并发岗必考,"线程池执行流程"高频面试题 |
| 有界队列 + 拒绝策略 | 生产事故复盘的高频根因,规约红线 |
| 线程数估算(CPU/IO 密集) | 调优面试的进阶追问 |
| Tomcat 线程池调参 | 后端性能排查的日常技能 |
| 虚拟线程认知 | Java 21+ 岗位的加分项 |

---

## 十一、下一话悬念

工人多了,并发上来了,可新问题冒头:早高峰几十个工人**同时**去扣同一款豆子的库存。只剩最后 1 杯,却有 3 个工人几乎同时读到"还有 1 杯",于是——卖出去了 3 杯。

> 下一话《锁与并发》:咖啡站爆发**超卖事故**,阿零第一次直面竞态条件与内存可见性。`synchronized`、`ReentrantLock`、`volatile` 与 JMM 的 happens-before 集体登场,把并发编程最经典的坑一次讲透。

---

## 🎯 随堂练习
先自己做,再对答案。选择难度递进,解答从概念到综合,代码含边界验证。

### 一、选择题(10 道)
1. [基础]`ThreadPoolExecutor` 完整构造器的参数个数和第三、第六个参数是什么?
- A) 5 个,第三个是 unit,第六个是 handler　B) 7 个,第三个是 keepAliveTime,第六个是 threadFactory　C) 7 个,第三个是 workQueue,第六个是 threadFactory　D) 6 个,第三个是 keepAliveTime,第六个是 handler
> [!答案] **1-C**　7 参数顺序:corePoolSize→maxPoolSize→**keepAliveTime**→unit→workQueue→**threadFactory**→handler。**举一反三**:`Executors.newFixedThreadPool(n)` 内部 core=max=n,用无界 LinkedBlockingQueue——这就是为什么《阿里巴巴开发手册》禁止用它。

2. [进阶]任务提交到线程池的执行优先级顺序是?
- A) 先看队列→再开新线程→最后核心线程　B) 核心线程→队列→临时线程(超 max)→拒绝策略　C) 临时线程→核心线程→拒绝　D) 随机分配
> [!答案] **2-B**　执行顺序:①核心线程有空→直接处理;②核心忙→入队列;③队列满→开临时线程(未达 maxPoolSize);④线程数达 max→拒绝策略。**举一反三**:这个顺序意味着——有界队列没满时**永远不会**创建新线程,即使核心线程全部忙碌。这是很多人调大一倍 maxPoolSize 却看不到线程数增长的原因。

3. [深入]四种拒绝策略中,`CallerRunsPolicy` 的行为是?
- A) 抛异常 RejectedExecutionException　B) 静默丢弃新任务　C) 由提交任务的线程(如 main 线程)自己执行该任务　D) 丢弃队列中最老的任务
> [!答案] **3-C**　CallerRunsPolicy:"谁提交的谁自己跑"——形成自然反压:提交线程被占住,它就无法继续提交新任务,倒逼上游降速。**举一反三**:AbortPolicy(默认)抛异常适合必须成功的关键任务;DiscardPolicy 丢弃适合可损失的日志/监控;DiscardOldestPolicy 丢最早的对时效敏感场景。

4. [基础]`Executors.newFixedThreadPool(n)` 的大坑是什么?
- A) 线程数太少　B) 内部使用无界 `LinkedBlockingQueue`(容量 ≈ Integer.MAX_VALUE),队列可无限增长导致 OOM　C) 不支持并发　D) 线程不会复用
> [!答案] **4-B**　`newFixedThreadPool` 用 `new LinkedBlockingQueue<>()` 不设容量,任务堆积无上限→堆内存被排队任务塞满→OOM。**举一反三**:`newCachedThreadPool` 更危险——最大线程数 `Integer.MAX_VALUE`,高峰时无限创建线程;两者都是《阿里巴巴 Java 开发手册》明令禁止的生产写法。

5. [进阶]核心线程数设置为 CPU 核数 + 1,适用于什么类型的任务?
- A) IO 密集型(查库、调接口)　B) CPU 密集型(加密、压缩、计算)　C) 所有类型　D) 不需要计算,随便填
> [!答案] **5-B**　CPU 密集型:CPU 核数 + 1(多一个利用等待时的 CPU)。IO 密集型:可以设更大(如核数*2 或更多),因为线程大量时间在等 IO,CPU 空闲可多开线程。**举一反三**:公式是起点不是终点——最终值靠**压测**标定,观察 CPU 利用率、RT 曲线、线程活跃数。

6. [深入]`keepAliveTime` 参数只对哪些线程生效?
- A) 核心线程　B) 临时线程(超过 corePoolSize 的部分)——空闲超时后被销毁　C) 所有线程　D) 主线程
> [!答案] **6-B**　默认 `keepAliveTime` 只对临时线程(核心数之外的)生效,空闲超时即回收;核心线程默认不回收(除非 `allowCoreThreadTimeOut(true)`)。**举一反三**:这意味着池子平时只保留核心线程,高峰过后临时线程自动释放,实现弹性伸缩。

7. [基础]`submit()` 和 `execute()` 的区别?
- A) 完全相同　B) `submit` 返回 `Future<T>`,可获取结果和异常;`execute` 无返回值　C) `execute` 更快　D) `submit` 只用于 Callable
> [!答案] **7-B**　`submit(Callable<T>)` 返回 `Future<T>`,可 `get()` 阻塞等结果、`get(timeout)` 超时等、`cancel()` 取消;`execute(Runnable)` 只提交不关心结果。**举一反三**:`submit(Runnable)` 也返回 `Future<?>`,get() 返回 null,但可以捕获执行中的异常。

8. [进阶]`shutdown()` 和 `shutdownNow()` 的区别?
- A) 前者等待已提交任务执行完,后者尝试中断正在执行的任务并返回未执行任务列表　B) 完全相同　C) `shutdownNow` 更温和　D) 没有区别
> [!答案] **8-A**　`shutdown()`:温和关闭,不再接受新任务,但已提交的任务(含队列中)执行完毕才关闭;`shutdownNow()`:尝试中断正在执行的线程,返回队列中未执行的任务列表,不保证立即停止。**举一反三**:通常 `shutdown()+awaitTermination(timeout)` 组合使用,超时后仍不结束再 `shutdownNow()`。

9. [深入]`ThreadPoolExecutor` 中 `beforeExecute()` 和 `afterExecute()` 的典型用途?
- A) 不能重写　B) 记录任务执行时间、埋点监控、清理 ThreadLocal(如 RequestContext)　C) 管理数据库连接　D) 编译 Java 代码
> [!答案] **9-B**　`beforeExecute`/`afterExecute` 是模板方法——可在任务执行前后记录耗时、打印日志、清理 ThreadLocal,实现线程池级别的统一监控。**举一反三**:`afterExecute` 的第二个参数是 Throwable——如果任务抛异常,可在此统一记录,而非在每个任务里各自 try-catch。

10. [综合]Tomcat 内嵌的线程池本质是什么?`server.tomcat.threads.max` 对应线程池的哪个参数?
- A) 自定义线程池,不相关　B) 它是 `ThreadPoolExecutor` 的封装;`threads.max` ≈ `maxPoolSize`　C) 它是数据库连接池　D) 它是 JVM 线程管理
> [!答案] **10-B**　Tomcat 线程池也是 `ThreadPoolExecutor` 的封装:`threads.min-spare`≈corePoolSize,`threads.max`≈maxPoolSize,`accept-count`≈workQueue 的容量。**举一反三**:线上调参——如果 `accept-count` 太小,请求直接拒绝;太大则队列堆积导致延迟升高。

### 二、解答题(3 道)
1. [概念]用一个咖啡店前台的比喻解释线程池的:核心线程、有界队列、临时线程、拒绝策略四个概念。
> [!答案] **1**　①核心线程=固定收银员(常驻 8 人),日常够用;②有界队列=候客椅(最多 200 人),收银员忙不过来时顾客坐椅子上等;③临时线程=高峰临时工(最多 32 人),椅子坐满才加派人手;④拒绝策略=门口挂牌"暂停接单"(或让经理自己上=CallerRunsPolicy)。这个比喻精准对应了"先占核心→再塞队列→再加临时→最后拒绝"的执行顺序。**举一反三**:如果把椅子换成无限长(无界队列),顾客不拒绝但椅子从店门口排到街上——内存爆了——这就是 `Executors.newFixedThreadPool` 的致命缺陷。

2. [场景]咖啡站的下单接口平均耗时 200ms(其中 DB 查询占 150ms),预估 QPS 峰值 500。请估算合理的核心线程数和队列容量,并说明估算依据。
> [!答案] **2**　①每个请求占用线程 200ms(IO 密集,150ms 在等 DB);②500 QPS 需要同时处理:500×0.2=100 个并发任务;③核心线程:IO 密集可设 CPU 核数×(1+IO时间/CPU时间),假设 8 核×(1+150/50)≈8×4=32。实际核心可设 32~64,队列 200~500。**依据**:`core×200ms = 每秒处理量`,32×(1000/200)×1s=160 QPS——核心不够,队列缓冲剩余流量,临时线程作为弹性补充。最终值需压测验证。**举一反三**:不是算完就定——上线后用 Micrometer 监控线程池的 `pool.size`/`queue.size`/`active.count`,按实际数据调整。

3. [综合]Java 21 引入虚拟线程后,传统的"线程池+有界队列"模式在 IO 密集型场景是否还需要?分析虚拟线程的优势和传统线程池仍然适用的场景。
> [!答案] **3**　虚拟线程的优势:**极轻量**(~KB vs 平台线程~1MB),百万虚拟线程同时跑不成问题,IO 密集型场景可"一请求一虚拟线程",无需纠结线程数。**传统线程池仍然需要**:①CPU 密集型任务——虚拟线程不提升计算速度,过多的虚拟线程争抢 CPU 反而恶化;②需要限流的场景——"无界"的虚拟线程可能掩盖下游资源瓶颈,如 DB 连接池仍只有 20 个连接,10 万虚拟线程抢 20 个连接照样排队;**限流仍需要,只是从线程池搬到了信号量或连接池层**。③存量代码兼容——不是所有框架/库都适配了虚拟线程。**举一反三**:虚拟线程不是银弹,它解决的是"平台线程太贵所以要用池子省着用"的问题;但"资源有上限"的物理现实不会因为线程便宜了就消失。

### 三、代码题(2 道)
1. [基础]手动创建 `ThreadPoolExecutor`:核心 2、最大 4、存活 30s、有界队列(10)、CallerRunsPolicy,给线程命名为"coffee-worker"。提交 5 个打印"你好,我是 [线程名]"的任务并优雅关闭。
> [!答案] **1 验收**:
> ```java
> var pool = new ThreadPoolExecutor(2, 4, 30L, TimeUnit.SECONDS,
>         new ArrayBlockingQueue<>(10),
>         r -> new Thread(r, "coffee-worker-" + counter.getAndIncrement()),
>         new ThreadPoolExecutor.CallerRunsPolicy());
> for (int i = 0; i < 5; i++) {
>     pool.execute(() -> System.out.println("你好,我是 " +
>             Thread.currentThread().getName()));
> }
> pool.shutdown();
> pool.awaitTermination(5, TimeUnit.SECONDS);
> ```
> **举一反三**:给线程起名是排障刚需——`jstack` 里看到 `coffee-worker-3` 比 `pool-1-thread-3` 强一百倍。

2. [综合]模拟"队列满→CallerRunsPolicy 反压"的场景:创建 core=1,max=1,队列=3 的线程池,主线程连续提交 6 个任务(每个 sleep 1s),观察哪些任务由主线程执行。用 `Thread.currentThread().getName()` 区分执行线程,并断言至少有一个任务由 main 线程执行。
> [!答案] **2 验收**:
> ```java
> @Test void callerRunsPolicyKicksIn() throws Exception {
>     var pool = new ThreadPoolExecutor(1, 1, 60, TimeUnit.SECONDS,
>             new LinkedBlockingQueue<>(3),
>             new ThreadPoolExecutor.CallerRunsPolicy());
>     var names = new ConcurrentLinkedQueue<String>();
>     for (int i = 0; i < 6; i++) {
>         final int no = i;
>         pool.execute(() -> {
>             try { Thread.sleep(1000); } catch (InterruptedException ignored) {}
>             names.add(Thread.currentThread().getName() + " 完成 #" + no);
>         });
>     }
>     pool.shutdown();
>     pool.awaitTermination(10, TimeUnit.SECONDS);
>     assertTrue(names.stream().anyMatch(n -> n.contains("main")),
>             "CallerRunsPolicy 应将溢出任务交给提交线程(main)执行");
> }
> ```
> **举一反三**:1(core)+3(queue)=4 个正常排队,第 5/6 个溢出→提交者(main)自己执行;若用 AbortPolicy(默认),第 5 个就抛异常——选择哪个取决于"宁可慢也不丢"还是"宁可丢也不慢"。

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
