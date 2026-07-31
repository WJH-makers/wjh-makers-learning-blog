---
title: "《从零开始学 Java》73 · 锁的内脏:AQS 与显式锁"
date: 2026-07-14
summary: "synchronized 抢不到就死等,阿零受够了。豆豆拆开显式锁的内脏:一个 state 加一条 FIFO 队列,撑起半个并发包;公平与非公平只差一步;而一次没进 finally 的 unlock,让全店在深夜安静地排成长龙。"
tags: [Java, Java漫画, AQS, ReentrantLock, 并发, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》73 · 锁的内脏:AQS 与显式锁

> 连载特刊 · 番外卷二「并发深水区」第 4 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——synchronized 够用但太糙:不能超时、不能中断、不问公平;想要「讲道理的锁」,得拆开锁的内脏。

---

## 一、需求:一把讲道理的锁

冬歇特训第四夜。上一话攒下的三条怨气还没消:synchronized 抢不到就**死等**、等着不能被叫走、也不问先来后到。豆豆把一只工具箱拍上桌:`java.util.concurrent.locks`——显式锁。

豆豆:「先说清楚,这不是换把更快的锁,是换一把**受你控制**的锁:抢多久、听不听中断、讲不讲先来后到,全写在明面上。代价也在明面上——synchronized 出块自动还锁;这把锁,**你不还,它永远不回来**。」

---

## 二、漫画 · 取餐柜台的排队机

> **〔1〕** 豆豆把一把 ReentrantLock 大卸八块,零件摊了一桌,核心就俩:一块**数字牌**、一条**长椅队伍**。
> 阿零:「就这?」豆豆:「就这。数字牌叫 state,长椅叫等待队列,合体叫 **AQS**——并发包里一半的类,内脏都是它。」

> **〔2〕** 取餐柜台,牌子 0=空闲。线程 A 一个 CAS 把牌翻成 1,昂首入内;线程 B 翻失败,被引导员包成节点挂到队尾,`park` 一敲,当场睡着。
> JVM 城主:「睡着的线程不烧 CPU;A 出来时只 `unpark` 队头那一个,不搞全场广播。」

> **〔3〕** 新顾客 C 冲到柜台**先伸手翻牌**,竟翻上了,径直进门;长椅队头刚被叫醒,揉着眼看他背影。
> 豆豆:「非公平锁:先抢一把再说,省一次唤醒切换,吞吐高。公平锁在 tryAcquire 里多问一句『队里有人吗』,有,就乖乖去队尾。」

> **〔4〕** 柜台里的 A 又要了一次锁,数字牌 1→2;出来一次减一,减到 0 才真正撒手。
> 豆豆:「**可重入**:同一线程再进,state 计数加一。synchronized 也重入,只是不给你看计数;这把锁连 `getHoldCount()` 都亮给你。」

> **〔5〕** 阿零想把长椅上睡死的线程硬拽走,纹丝不动。豆豆递来遥控器,两个键:「限时」「可中断」。
> 阿零按下「限时」,那线程到点自己起身:「不等了。」阿零:「……它居然会自己走!」

---

## 三、本话目标

- 说清 AQS = state + FIFO 队列 + park/unpark,子类只填 tryAcquire;
- 用熟 ReentrantLock:重入计数、公平/非公平、tryLock 超时、lockInterruptibly;
- 用 Condition 多路等待,对比 wait/notify;
- 认识 ReadWriteLock 与 StampedLock 的读多写少场景;
- 踩一次「unlock 没进 finally」的锁泄漏并修好。

---

## 四、原理图:一块底盘撑半个并发包

```text
AbstractQueuedSynchronizer(AQS)三零件:
  state(int)     —— 原子变量:ReentrantLock 里 0=空闲,≥1=重入次数
  FIFO 等待队列   —— 抢不到的线程包成节点排队(CLH 队列变体)
  park / unpark  —— LockSupport 让排队线程睡下;释放时只叫醒队头

模板方法:排队、挂起、唤醒这些脏活 AQS 全包;子类只答一道题——
  tryAcquire(1):「现在能不能拿?」
  ReentrantLock 答:CAS 把 state 0→1(已持有则 +1);
  公平版先问 hasQueuedPredecessors():队里有前驱,就不抢。
(第 76 话的门闩、信号量,内脏也是这块底盘,只是 state 语义不同。)
```

ReentrantLock 比 synchronized 多出来的「道理」:

| 能力 | API | 一句话 |
|---|---|---|
| 限时 | `tryLock()` / `tryLock(2, TimeUnit.SECONDS)` | 抢不到立刻(或到点)放弃,不吊死 |
| 可中断 | `lockInterruptibly()` | 排队途中可被 interrupt 叫走 |
| 公平 | `new ReentrantLock(true)` | 严格先来后到,用吞吐换公道 |
| 多路等待 | `newCondition()` 建 N 间候车室 | wait/notify 只有一间 |

豆豆的选型口诀:**默认 synchronized**——写法短、绝不会忘还锁、JIT 还会替它做锁消除锁粗化(回看第 72 话);表里这四样能力真用得上,才请 ReentrantLock 出场。

读多写少的菜单还有更省的:`ReentrantReadWriteLock`——读锁共享(多人同看菜单)、写锁独占(改价清场),state 一劈两半:高 16 位记读、低 16 位记写重入。更激进的 `StampedLock` 支持**乐观读**:先不加锁直接读,读完 `validate` 没被写过就白赚——但它不可重入、没有 Condition,今天一笔带过。

> **🔀 豆豆的多解台 · 「等着,好了叫你」怎么实现?**

| 解法 | 代码要点 | 适合什么时候 | 坑 |
|---|---|---|---|
| wait / notify | synchronized 内 `while`+`wait`,改完 `notifyAll` | 最原始,无依赖 | 只有一个等待集,谁都睡一屋,常被迫 notifyAll 惊群 |
| Condition | `lock.newCondition()` 开多间;`await`/`signal` | 等待原因不止一种,要精准唤醒 | await 前必须持锁;照样要 `while` 防虚假唤醒 |
| BlockingQueue | `put`/`take` 内部封好等待-通知 | 生产者-消费者直接用成品 | 队列语义之外的等待还得回前两者(#64 预告过,后话正式登场) |

豆豆锐评:业务代码首选 BlockingQueue 成品;真要自己造轮子,Condition 是 wait/notify 的全面上位。

---

## 五、从上一话继续:StockService 换显式锁

把第 72 话的 synchronized 版换成 ReentrantLock,顺手给「等补货」开一间专属候车室:

```java
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

public class StockService {
    private final ReentrantLock lock = new ReentrantLock();   // 默认非公平
    private final Condition restocked = lock.newCondition();  // 「等补货」候车室
    private int stock = 50;

    public boolean deduct(int n) {
        lock.lock();                        // ① lock 紧跟着
        try {                               // ② try 立刻开
            if (stock < n) return false;
            stock -= n;
            return true;
        } finally {
            lock.unlock();                  // ③ unlock 只住 finally
        }
    }

    public void deductWhenAvailable(int n) throws InterruptedException {
        lock.lock();
        try {
            while (stock < n) restocked.await();   // 放锁睡下;必须 while
            stock -= n;
        } finally { lock.unlock(); }
    }

    public void restock(int n) {
        lock.lock();
        try { stock += n; restocked.signalAll(); } // 只叫醒这一间候车室
        finally { lock.unlock(); }
    }
}
```

> **豆豆旁白**:`await` 和 `wait` 一样,睡前**放开锁**,被 `signal` 后还要**重新抢到锁**才能往下走——醒来那一刻条件可能又变了,`while` 重查不是客套,是保命。

---

## 六、故意制造一个 Bug:有去无回的锁

价目牌组件,阿零嫌 finally 啰嗦,写了个「直路版」:

```java
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;

public class PriceBoard {          // 沿用 #60 的 record Coffee(String name, BigDecimal price, int stock)
    private final ReentrantLock lock = new ReentrantLock();
    private final Map<String, Coffee> menu = new HashMap<>();

    public String quote(String name) {
        if (lock.tryLock()) {
            var coffee = menu.get(name);
            if (coffee == null) return "已下架";   // ← 中途 return:没 unlock 就走人
            var line = coffee.name() + " ¥" + coffee.price();
            lock.unlock();
            return line;
        }
        return "系统忙,稍后再试";
    }

    public void reprice(String name, Coffee c) {
        lock.lock();                                // 深夜调价线程从这儿进
        try { menu.put(name, c); } finally { lock.unlock(); }
    }
}
```

有人查了一次早已下架的「摩卡」——从那一刻起,全店报价永远「系统忙」。

---

## 七、观察真实现象:无声的长龙

没有异常,没有崩溃,CPU 归零。`jstack` 一看:

```text
"repricer" #24 prio=5 os_prio=0 cpu=0.00ms elapsed=187.33s tid=0x000001f2c4a1b000 waiting on condition
   java.lang.Thread.State: WAITING (parking)
        at jdk.internal.misc.Unsafe.park(java.base@25/Native Method)
        - parking to wait for  <0x000000062a44c8e0> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)
        at java.util.concurrent.locks.LockSupport.park(java.base@25/LockSupport.java:369)
        at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquire(java.base@25/AbstractQueuedSynchronizer.java:754)
        at java.util.concurrent.locks.ReentrantLock$Sync.lock(java.base@25/ReentrantLock.java:154)
        at java.util.concurrent.locks.ReentrantLock.lock(java.base@25/ReentrantLock.java:323)
        at PriceBoard.reprice(PriceBoard.java:21)
```

复盘链条:查「摩卡」的线程 tryLock **拿到了锁** → 走了 `return "已下架"` 这条没有 unlock 的近道 → state 停在 1,持有者却早已收工回家。之后所有 `quote` 的 tryLock 永远失败;`reprice` 的 `lock()` 更惨——排进 AQS 队列 park 睡死,而世上根本不存在能叫醒它的人。这比死锁还阴:jstack 连 `deadlock` 都不报,只有一排 `WAITING (parking)`。

> **豆豆锐评**:synchronized 出块自动还锁;显式锁的自由 = **还锁也归你管**。顺带一句:unlock 只能由持有线程来调,别的线程好心「代还」,当场 `IllegalMonitorStateException`。

---

## 八、修复,并用测试证明

标准范式一条:**lock 之后一行进 try,unlock 只住 finally;tryLock 必检返回值,拿到了才配进 try**:

```java
public String quote(String name) {
    if (!lock.tryLock()) return "系统忙,稍后再试";   // 没拿到就走,别碰 unlock
    try {
        var coffee = menu.get(name);
        return coffee == null ? "已下架" : coffee.name() + " ¥" + coffee.price();
    } finally {
        lock.unlock();                                // return、异常,一律路过这里
    }
}
```

```java
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.locks.ReentrantLock;
import static org.junit.jupiter.api.Assertions.*;

class ExplicitLockTest {
    @Test
    void lock_survives_every_exit_path() {
        var board = new PriceBoard();
        assertEquals("已下架", board.quote("摩卡"));           // 先走一遍中途退出的路
        assertTimeoutPreemptively(Duration.ofMillis(500), () ->
                board.reprice("拿铁", new Coffee("拿铁", new BigDecimal("18.00"), 10)));
        assertTrue(board.quote("拿铁").contains("拿铁"));      // 锁回家了,后来人畅通
    }

    @Test
    void tryLock_walks_away_instead_of_waiting() throws InterruptedException {
        var lock = new ReentrantLock();
        lock.lock();                                           // 主线程占住不放
        var got = new AtomicBoolean(true);                     // 回看第 71 话
        var t = Thread.ofPlatform().start(() -> got.set(lock.tryLock()));
        t.join();
        assertFalse(got.get());                                // 抢不到,转身就走
        lock.unlock();
    }
}
```

JUnit 质检员:「证据呢?——每条退出路径都走一遍、锁都能回家,这才叫证据。」

> **🎯 面试直击**:AQS 一句话原理?公平锁与非公平锁差在哪一步?
> AQS = 一个 volatile int state + 一条 FIFO 等待队列 + park/unpark;子类只实现 tryAcquire/tryRelease,定义「state 怎样算拿到」。公平与非公平只差 tryAcquire 第一步:公平版先 `hasQueuedPredecessors()` 查队列,有前驱就不抢;非公平版直接 CAS 抢,抢败才排队。追问点:默认为什么非公平——省一次「唤醒队头」的线程切换,吞吐更高,代价是极端争抢下队头可能饿一阵。

---

## 九、项目检查点 · 豆豆咖啡站 v9.4

```text
咖啡站形态:柜台换上会讲道理的 ReentrantLock,「等补货」有了专属候车室
已具备  :AQS 三零件心智模型(state/FIFO 队列/park-unpark);重入计数、公平与非公平、
          tryLock 超时、lockInterruptibly;Condition 多路等待;读写锁与乐观读概念;
          lock/finally-unlock 已成肌肉记忆,锁泄漏会用 jstack 定位
还没有  :锁再讲道理,整张菜单 HashMap 在并发写下仍是裸奔——线程安全的容器还没上岗
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| AQS 原理(state / 队列 / park) | 「熟悉 JUC」的分水岭题,答出原理直接甩开背书选手 |
| ReentrantLock vs synchronized 选型 | 高频对比题;能讲「默认非公平换吞吐」是加分项 |
| Condition 多路等待 | 手写有界缓冲(生产者-消费者)笔试常客 |
| 锁泄漏排查(jstack 里的 WAITING parking) | 线上「服务假死」定位的硬功夫 |

---

## 十一、下一话悬念

锁这一层,阿零总算讲透了。可豆豆半夜巡店,目光落在另一样东西上:整张菜单还是第 22 话那只 **HashMap**——两个线程同时上新品,数据说没就没,它可从来没答应过并发这回事。

> 下一话《并发菜单:ConcurrentHashMap》:HashMap 并发写为什么丢数据;ConcurrentHashMap 从分段锁到「CAS + 桶头锁」的换代;还有一句反直觉的警告——线程安全的容器,不等于你的复合操作安全。

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. AQS(AbstractQueuedSynchronizer)的核心三零件是什么?
   - A) Thread、Runnable、Callable　　B) state 状态变量、CLH 变体队列、park/unpark 线程阻塞唤醒　　C) Lock、Condition、ReadWriteLock　　D) volatile、CAS、synchronized

2. `ReentrantLock.lock()` 和 `synchronized` 在「可重入性」上的关系是?
   - A) 只有 `ReentrantLock` 支持可重入,`synchronized` 不支持　　B) 两者都支持可重入——同一线程可多次获取同一把锁,state 递增,释放时递减　　C) 只有 `synchronized` 支持可重入　　D) 两者都不支持可重入,都需要显式释放

3. `ReentrantLock` 的公平锁和非公平锁,在 AQS 的 `tryAcquire` 实现中的关键区别是什么?
   - A) 公平锁会先检查队列中有没有等待更久的线程,有则让出;非公平锁直接抢,不管队列　　B) 公平锁用 `synchronized` 实现,非公平锁用 CAS　　C) 公平锁要求调用者提供线程优先级　　D) 非公平锁不支持可重入

4. `lockInterruptibly()` 相比 `lock()` 的核心优势是什么?
   - A) 可以设置超时时间　　B) 在等待锁的过程中可以响应线程中断(`Thread.interrupt()`),让等待中的线程有机会优雅退出,而不是死等　　C) 自动释放锁　　D) 支持公平模式

5. `ReentrantReadWriteLock` 的规则是?
   - A) 读读共享(多个读线程同时持有),写写互斥,读写互斥——读锁被持有时写锁必须等待　　B) 读读共享,写写也共享　　C) 所有操作都互斥(和普通锁一样)　　D) 读读共享,但写操作可以抢占读锁

6. Condition 相比 `wait/notify` 的核心优势是什么?
   - A) Condition 不需要 `synchronized` 块　　B) 一个 Lock 可以创建多个 Condition,每个 Condition 对应一个等待队列,可以实现精确唤醒——而不是像 `notifyAll()` 那样「全叫起来,各自检查条件」　　C) Condition 的 `await()` 不需要释放锁　　D) Condition 自动处理虚假唤醒

7. 以下代码中,`lock.unlock()` 没放在 finally 块里,最可能的后果是什么?

```java
Lock lock = new ReentrantLock();
lock.lock();
doRiskyWork();   // 可能抛异常
lock.unlock();   // ❌ 没放 finally
```

- A) 锁会自动在异常时释放,没有问题　　B) 如果 `doRiskyWork()` 抛异常,`unlock()` 永远不会被调用——锁永远不被释放,其他线程永久阻塞(死锁)　　C) JVM 会检测到异常并自动调用 `unlock()`　　D) 锁会被 GC 回收后自动释放

8. `StampedLock` 的「乐观读」模式相比 `ReentrantReadWriteLock` 的读锁,核心优势是什么?
   - A) 乐观读不需要获取读锁,直接读取后通过 `validate(stamp)` 检查读取期间是否有写操作——没有写的话读操作完全无锁,性能远高于读写锁的读锁(CAS 开销)　　B) 乐观读支持写操作的并发　　C) 乐观读是公平的　　D) 乐观读可以升级为写锁

9. `tryLock(long timeout, TimeUnit unit)` 返回 false 意味着什么?
   - A) 锁已经被其他线程持有,当前线程选择放弃等待　　B) 当前线程已经持有该锁(可重入)　　C) 锁对象已被 GC 回收　　D) 超时时间内锁未被释放,当前线程在获取锁上等待的总时间超过了 timeout

10. 以下关于 AQS 中 `park` 和 `unpark` 的描述,哪项是正确的?
   - A) `park` 和 `unpark` 是 Java 层面实现的,不涉及操作系统　　B) `unpark` 可以在 `park` 之前调用——如果先 `unpark`,后续的 `park` 会直接返回而不阻塞　　C) `park` 必须和 `synchronized` 配合使用　　D) `park` 会让线程进入 `BLOCKED` 状态

### 解答题(5 道)

1. 用自己的话解释 AQS 是如何用 `state`、CLH 队列和 `park/unpark` 这三样东西,撑起 `ReentrantLock` 的全部语义(加锁、排队、阻塞、唤醒、解锁)的。

2. `ReentrantLock` 的公平锁和非公平锁各有什么优缺点?为什么非公平锁的吞吐量通常更高?什么场景下必须用公平锁?

3. 你的咖啡站有一个「订单状态追踪」功能:多个写线程负责更新订单状态,多个读线程负责展示订单状态。读写比约 100:1。请对比 `ReentrantLock`、`ReentrantReadWriteLock` 和 `StampedLock` 三种锁在这个场景下的表现,并推荐最优选择。

4. 条件变量场景:你有一个有界缓存(BoundedBuffer),`put` 满时等 notFull,`take` 空时等 notEmpty。请设计 Condition 的用法——用 `notFull` 和 `notEmpty` 两个 Condition,写出 `put` 和 `take` 方法的伪代码,并说明相比 `wait/notifyAll` 的单条件队列,这个设计好在哪。

5. 你的咖啡站接下来要支持分布式部署。当前的 `ReentrantLock` 只能在单个 JVM 内工作。请设计一个分层的锁架构:① 先描述单机层的锁选型(考虑读写比和性能) ② 再描述跨 JVM 的分布式锁方案 ③ 画出决策流程:什么情况下走本地锁、什么情况下走分布式锁、两者如何协同。

> [!答案]
> **1-1** B(state + CLH 变体队列 + park/unpark —— AQS 定义了同步器的骨架,子类只需实现 `tryAcquire/tryRelease` 等模板方法)  
> **举一反三**:AQS 是模板方法模式的典范。`ReentrantLock`、`Semaphore`、`CountDownLatch` 都基于它,只是 `tryAcquire` 里对 state 的语义不同:ReentrantLock 是 0/1 + 重入计数,Semaphore 是许可数,CountDownLatch 是倒数。
>
> **1-2** B(两者都支持可重入——`synchronized` 靠 Mark Word 里的线程 ID + 重入计数,`ReentrantLock` 靠 AQS state 记录重入次数)  
> **举一反三**:可重入的设计意义:一个同步方法调用另一个同步方法(同一把锁)时不会自己卡死自己。如果没有可重入性,递归调用或嵌套调用的同步方法将直接死锁。
>
> **1-3** A(公平锁在 CAS 抢之前先调用 `hasQueuedPredecessors()` 检查是否有前驱等待节点;非公平锁跳过这个检查直接 CAS 抢)  
> **举一反三**:非公平锁在 `lock()` 时甚至会在入队之前先抢一次(插队),抢不到才入队排队——这就是「非公平」两字的含义。非公平锁的吞吐高就高在这次插队:刚释放锁的线程唤醒等待者需要时间,此时新来的线程可以直接拿到锁,减少了线程切换。
>
> **1-4** B(可响应中断——`lock()` 在等待时不响应中断直到拿到锁,`lockInterruptibly()` 在等待中收到中断信号会立即抛 `InterruptedException` 放弃等待)  
> **举一反三**:`synchronized` 没有「可中断等待」的能力——这是 `ReentrantLock` 相比 `synchronized` 的三大核心优势之一(另两个是 `tryLock` 超时和公平锁选择)。在需要「等待可取消」的场景(如用户取消操作),`lockInterruptibly` 是救命的。
>
> **1-5** A(读读共享、写写互斥、读写互斥——经典的多读单写模型)  
> **举一反三**:需要注意的坑——读锁不能升级为写锁(升级会导致死锁),但写锁可以降级为读锁。如果需要在读后决定写,不能「在读锁里加写锁」,必须释放读锁再获取写锁(检查期间数据可能已被改变)。
>
> **1-6** B(多条件队列是 Condition 的核心价值——一个 Lock 可创建多个 Condition,`notFull.signal()` 精准唤醒一个等「不满」的,`notEmpty.signal()` 精准唤醒一个等「非空」的,避免了 `notifyAll()` 的惊群效应)  
> **举一反三**:Condition 类比 `wait/notify` 就像数据库的「多个条件索引」对比「全表扫描」。用 `wait/notifyAll` 是所有等待者全叫起来自己看条件,用 Condition 是直接叫正确的人。
>
> **1-7** B(异常穿透到栈顶,`unlock()` 永远不执行——锁永不释放,任何试图获取该锁的线程将永久阻塞)  
> **举一反三**:这是 `ReentrantLock` 最常见的生产事故。防法只有一个:永远 `lock.lock(); try { ... } finally { lock.unlock(); }`。`synchronized` 不需要 finally 是因为 JVM 保证异常时自动解锁——这也是 `synchronized` 的唯一安全优势。
>
> **1-8** A(乐观读是 StampedLock 的性能杀手锏——`tryOptimisticRead()` 返回一个 stamp,读完后 `validate(stamp)` 检查期间是否有写;没写就白嫖了一次无锁读,有写就回退为悲观读锁重试)  
> **举一反三**:StampedLock 的性能模型:乐观读 < 悲观读锁 < 写锁。适用「写极少、读极多」的场景,在读写锁基础上还能再提一截吞吐。代价:① 不可重入 ② 没有 Condition ③ 乐观读模式需要手动 validate。
>
> **1-9** D(在指定的 timeout 时间内锁未被获取到,放弃并返回 false——线程在这段时间内处于等待状态但不会永久阻塞)  
> **举一反三**:`tryLock` + `tryLock(timeout)` 是实现「尝试获取,获取不到就降级处理/快速失败」的策略基础。例如:抢不到锁就走缓存、走消息队列异步处理,而不是死等。
>
> **1-10** B(`unpark` 的「许可」是累积的——如果线程还没 `park`,先调一次 `unpark`,下一次 `park` 就会消费这个许可并立即返回,不会阻塞)  
> **举一反三**:这与 `wait/notify` 的重要区别——`notify` 如果没有线程在 wait 就会丢失信号,而 `unpark` 的许可是「预存」的。这也是为什么 `LockSupport.park/unpark` 用作 AQS 的底层阻塞原语而不是 `wait/notify`。
>
> **2-1** ① **加锁**:`ReentrantLock.lock()` → AQS `acquire(1)` → 先尝试 `tryAcquire`(CAS 把 state 从 0 改为 1)。如果成功——获取锁,出队。② **排队与阻塞**:`tryAcquire` 失败 → `addWaiter` 把当前线程包装成 Node 节点加入 CLH 变体队列尾部(CAS 入队) → `acquireQueued` 进入自旋:检查前驱是不是 head(说明该我了),是则再抢一次 `tryAcquire`;不是或抢不到则 `shouldParkAfterFailedAcquire` 检查前驱状态,如果前驱在等就把当前节点标记为 SIGNAL → 调用 `LockSupport.park(this)` 阻塞当前线程。③ **唤醒**:`ReentrantLock.unlock()` → AQS `release(1)` → `tryRelease`(state 减到 0) → `unparkSuccessor(head)` 唤醒 head 的后继节点 → 那个线程从 `park` 返回,继续 `acquireQueued` 自旋,发现自己是 head 的后继 → 抢锁成功,自己成为新 head。④可重入:`tryAcquire` 检查 `getExclusiveOwnerThread() == current`,是则 state 累加,不是则抢锁。  
> **举一反三**:整个过程就是一个高效的「抢车位」模型——state 是车位状态(0=空,1=有人),CLH 队列是排队通道,`park/unpark` 是让排队的人坐在车里等(不空转)。理解这三个零件,就理解了所有 AQS 子类的原理。
>
> **2-2** 公平锁:线程严格按请求顺序获取锁,先到先得。优点:不会造成线程饥饿,适合需要严格公平性的场景(如排队处理用户请求)。缺点:每次 `tryAcquire` 都要检查队列,多了队列遍历开销;且刚释放锁的线程必须唤醒等待者,新来的线程不能插队,增加了线程切换。非公平锁:新来的线程可以直接抢,抢不到再排队。优点:吞吐量高——利用释放锁和唤醒等待者之间的「空窗期」,让新线程直接拿锁,减少了一次线程切换;极端情况下还能减少总的上下文切换次数。缺点:可能导致队列中的线程「饿死」——一直有后来者插队,先到的永远拿不到锁。必须用公平锁的场景:当业务逻辑要求操作的先后顺序有语义含义(如「先下单的必须先扣库存」)时,非公平锁打乱顺序可能导致业务错误。  
> **举一反三**:生产环境默认用非公平锁。`synchronized` 也是非公平的——大多数并发组件(包括 AQS 内部的 CLH 锁)都选择非公平,因为吞吐优势太明显。公平锁更像是「需要明确语义保证时才用的精确工具」。
>
> **2-3** 场景特征:读写比 100:1,说明绝大多数操作是读,只有极少写操作。① `ReentrantLock`:读写都互斥,100 个读线程排队串行,吞吐极差。② `ReentrantReadWriteLock`:读读共享,写独占。读线程可以并发进入,仅在有写操作时读线程才被阻塞。100:1 的读写比下,读锁几乎常驻,写锁偶尔插入——比 ReentrantLock 吞吐高约 100 倍(读并发度 ≈ 线程数)。③ `StampedLock`:进一步优化读性能——提供「乐观读」模式。读操作用 `tryOptimisticRead()` 获取 stamp,不获取锁直接读数据,读完后 `validate(stamp)` 检查期间是否有写。100:1 场景下写极少,乐观读几乎每次都 validate 通过,完全无锁。比读写锁的读锁还省了一次 CAS 操作。推荐:用 `StampedLock`。3~5 个写线程偶尔来一下,绝大多数读操作走乐观读路径,零锁开销。注意事项:① StampedLock 不可重入(如果业务代码嵌套调用锁,需用手动管理) ② 乐观读返回的 stamp 必须在读后再 validate ③ 不提供 Condition。  
> **举一反三**:这三个锁的选型有一条清晰升级线:写入频率越低、读取频率越高,越往右走。`ReentrantLock`(全互斥)→ `RWLock`(读共享)→ `StampedLock`(乐观读)。反过来,写频繁时 StampedLock 的乐观读频繁失败回退,性能反而不如读写锁。
>
> **2-4** Condition 版 BoundedBuffer:
> ```java
> class BoundedBuffer {
>     final Lock lock = new ReentrantLock();
>     final Condition notFull  = lock.newCondition();  // "不满"等待队列
>     final Condition notEmpty = lock.newCondition();  // "不空"等待队列
>     final Object[] items; int putIdx, takeIdx, count;
>
>     void put(Object x) {
>         lock.lock();
>         try {
>             while (count == items.length) notFull.await(); // 满了,等 notFull
>             items[putIdx] = x; putIdx = (putIdx + 1) % items.length; count++;
>             notEmpty.signal(); // 放入后,唤醒一个等 "不空" 的 (不是全唤醒)
>         } finally { lock.unlock(); }
>     }
>
>     Object take() {
>         lock.lock();
>         try {
>             while (count == 0) notEmpty.await(); // 空了,等 notEmpty
>             Object x = items[takeIdx]; takeIdx = (takeIdx + 1) % items.length; count--;
>             notFull.signal(); // 取出后,唤醒一个等 "不满" 的
>             return x;
>         } finally { lock.unlock(); }
>     }
> }
> ```
> 优势:相比 `wait/notifyAll` 共用同一个 wait set,两个 Condition 将「等空」和「等满」的线程分离到两个队列。`notFull.signal()` 只唤醒一个等「不满」的消费者,`notEmpty.signal()` 只唤醒一个等「不空」的生产者——精准唤醒,零惊群。如果只有一个 wait set,必须用 `notifyAll()` 无差别唤醒所有等待者,每个线程醒来后自己检查条件,不满足的再睡回去——O(n) 的唤醒成本变成 O(1)。  
> **举一反三**:这就是 Lock+Condition 对比 `synchronized+wait/notify` 的双条件队列优势——精准控制唤醒,降开销。大多数 `BlockingQueue` 的实现(如 `ArrayBlockingQueue`)就是 Lock+Condition 的两条件队列方案。
>
> **2-5** 分层锁架构:① **单机层**:基于场景——订单读写比约查询偏重读。本地锁选 `StampedLock`(乐观读 + 写锁)。业务接口:`updateOrderStatus()` 走写锁,`getOrderStatus()` 走乐观读(validate 失败则退化为悲观读锁)。为什么不用分布式的读锁:读操作远多于写,本地 `StampedLock` 零网络开销,延迟低。② **跨 JVM 层**:当订单状态更新可能来自不同服务实例时(如支付回调到实例 A,退款到实例 B),用 Redis 分布式锁(Redisson `RLock`)或数据库乐观锁(`UPDATE orders SET status=? WHERE id=? AND version=?`)。分布式锁粒度:在「单订单 ID」级别——不同订单用不同锁 key,互不阻塞。③ **决策流程**:读取操作——直接从本地缓存或 DB 读,不走分布式锁(高并发读加分布式锁是杀鸡用牛刀)。写入操作——判断:该订单的本地锁持有者是否是本实例?如果是,本地 `StampedLock` 写锁即可;如果可能多实例并发写同一订单,先本地锁(防单实例内的并发写),再 Redis 分布式锁(防跨实例写),形成本地锁+分布式锁双保险。协同原则:本地锁在外层,分布式锁在内层——先争本地锁(快速失败),再争分布式锁(网络开销,只跨实例时才用到)。如果分布式锁获取失败(> 3 次重试),走消息队列异步重试。  
> **举一反三**:设计分层锁架构的核心原则——「就近原则」:能本地锁的不远程锁,能细粒度锁的不全锁,能乐观锁的不悲观锁。每一层锁只处理该层能处理的竞争范围,上层没解决的溢出到下层的兜底。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*