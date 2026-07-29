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

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. 任务提交到线程池后的流转顺序是?
   - A) 先塞队列 → 再开核心线程 → 再开临时线程　B) **核心线程有空位就用 → 队列没满就排队 → 线程数没到 max 就加临时线程 → 都不行才触发拒绝策略**　C) 直接开新线程 → 满了才排队　D) 随机分配
2. 队列还没满时,线程池会不会开临时(非核心)线程?
   - A) 会,只要有任务就开　B) **不会** —— 队列没满时任务只会进队列　C) 随机决定　D) 取决于拒绝策略
3. `Executors.newFixedThreadPool(10)` 被规约禁用的原因是?
   - A) 线程数太少　B) 它内部用了**无界队列**(`LinkedBlockingQueue` 默认容量 `Integer.MAX_VALUE`),任务只进不出会 OOM　C) 不支持拒绝策略　D) 线程不会复用
4. `Executors.newCachedThreadPool()` 的风险是?
   - A) 队列无界　B) **最大线程数是 `Integer.MAX_VALUE`**,高峰时无限创建线程　C) 线程不回收　D) 不支持任务队列
5. CPU 密集型任务的线程数经验值是?
   - A) 越大越好　B) 约 `CPU 核数 + 1` —— 再多也抢不到 CPU,只会徒增上下文切换　C) 固定 200　D) 核数的 10 倍
6. `CallerRunsPolicy` 拒绝策略的效果是?
   - A) 直接丢弃任务　B) 抛异常　C) 让**调用方线程自己跑**这个任务,从而产生背压、拖慢提交速度　D) 存入磁盘
7. 给线程起名(如 `coffee-worker-7`)的实际价值是?
   - A) 代码好看　B) 线上 `jstack` 抓栈时能一眼认出是谁,而不是满屏 `pool-1-thread-17`　C) 提高性能　D) 框架要求
8. 「任务」和「线程」的关系是?
   - A) 一一对应　B) 任务是活(`Runnable`),线程是人;线程池把两者**解耦**,一批线程复用着消化很多任务　C) 任务就是线程　D) 线程数必须等于任务数
9. Spring Boot 里控制内嵌 Tomcat 最大工作线程的配置是?
   - A) `server.port`　B) `server.tomcat.threads.max`　C) `spring.task.execution.pool.size`　D) `server.max-connections`
10. 虚拟线程(Java 21,JEP 444)最适合的场景是?
    - A) CPU 密集计算　B) **海量 IO 密集任务** —— 线程极轻量,一任务一线程重新可行　C) 需要严格限流的场景　D) 单线程程序

> [!答案]
> **1-B**　顺序千万别记反。**举一反三**:这也解释了一个反直觉现象 —— 队列设得越大,临时线程越难被创建出来。
> **2-B**　队列是「加线程」之前的缓冲。**举一反三**:所以想让高峰快速扩容,队列就不能设太大,这是参数之间的权衡。
> **3-B**　无界队列是定时炸弹。**举一反三**:OOM 的栈会指向 `LinkedBlockingQueue.offer` —— 看到这个栈就该想起这一课。
> **4-B**　它是把线程数打爆而不是把队列撑爆。**举一反三**:两个工厂方法各踩一个极端,这正是「手动 new ThreadPoolExecutor」的理由。
> **5-B**　CPU 密集加线程只会更慢。**举一反三**:IO 密集则可以远大于核数,因为线程大量时间在等 —— 但最终值要靠压测标定,不是背公式。
> **6-C**　让调用方自己跑,形成天然背压。**举一反三**:相比直接丢弃,它把压力反向传导给上游,是很多生产系统的首选策略。
> **7-B**　能排障的代码从起个好名字开始。**举一反三**:第 43 话抓 CPU 热点线程时,这个名字会直接帮你省下十分钟。
> **8-B**　解耦是线程池的核心价值。**举一反三**:理解这一点,你才不会问出「一百万个任务是不是要一百万个线程」这种问题。
> **9-B**　默认 200。**举一反三**:配套的还有 `threads.min-spare`(常驻)和 `accept-count`(等待队列)—— 正好对应本话的核心线程与队列。
> **10-B**　虚拟线程为 IO 阻塞而生。**举一反三**:它不会让 CPU 密集任务变快 —— CPU 就那么多核,轻量的只是线程本身。

---

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
