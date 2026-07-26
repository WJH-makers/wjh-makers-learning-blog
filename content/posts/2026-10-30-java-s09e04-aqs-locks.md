---
title: "《从零开始学 Java》73 · 锁的内脏:AQS 与显式锁"
date: 2026-10-30
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

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
