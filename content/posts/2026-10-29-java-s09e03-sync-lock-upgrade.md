---
title: "《从零开始学 Java》72 · synchronized 内幕与锁升级兴衰"
date: 2026-10-29
summary: "阿零以为 synchronized 锁的是代码,豆豆三连追问把他问穿:锁在对象头的 Mark Word 上;八股里的四级锁升级早已改朝换代,偏向锁谢幕退场;而一根 \"LOCK\" 字符串常量,竟让两个不相干的模块深夜互相锁死。"
tags: [Java, Java漫画, synchronized, 锁升级, 并发, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》72 · synchronized 内幕与锁升级兴衰

> 连载特刊 · 番外卷二「并发深水区」第 3 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——原子类稳住了单个计数,可「查库存再扣库存」是两步棋,原子类罩不住;只好回头审视 synchronized 这把老锁:它底下到底是什么?

---

## 一、事故:三连追问,一个没接住

冬歇特训第三夜。上一话原子类把「卖出杯数」稳住了(回看第 71 话),下一个需求立刻打脸:扣库存前得先查库存——`stock >= n` 是一步,`stock -= n` 又是一步,**两步之间**只要有人插队,照样超卖。

阿零轻车熟路,给方法拍上 `synchronized`,测试全绿,合上电脑:「锁嘛,谁不会。」

豆豆(面试官脸):「三个问题:synchronized 锁的是**什么**?抢不到锁的线程在**哪儿**等?你背的『偏向锁』,如今**还在不在**?」

三连问,阿零一个没接住。

---

## 二、漫画 · 掀开对象的额头

> **〔1〕** 阿零把一枚金色大锁「啪」地拍在代码块上,流水线立刻秩序井然。他叉腰:「并发?加锁就完了。」
> 豆豆(眼镜一推):「行。那这把锁,锁的是这几行**代码**,还是别的什么?」
> 阿零:「当然是代码!」——空气凝固两秒。

> **〔2〕** JVM 城主领两人钻进堆城区,指着一个对象的额头:那里嵌着一块小铭牌——**Mark Word**。
> JVM 城主:「synchronized 锁的从来是**对象**。谁想进同步块,先来对象头这块铭牌上登记。代码只是门后的房间,门牌钉在对象头上。」

> **〔3〕** 【分镜格】左:一个线程用 CAS 往铭牌里装自己的锁记录,装不上就原地小碎步转圈(**轻量级锁·自旋**);右:抢的人多了,铭牌换成叫号机,没排上号的线程被领去长椅睡觉(**重量级锁·OS 互斥量**)。
> 豆豆:「CAS 你上一话刚练过。自旋是『不睡觉地等』,省下挂起唤醒的开销;抢的人一多,继续自旋就是白烧 CPU,JVM 就膨胀成重量级锁,把等待线程**挂起**,交给操作系统叫号。」

> **〔4〕** 阿零抢答背书:「我背过!无锁→**偏向锁**→轻量级→重量级,四级!」豆豆按停面试计时器。
> 豆豆:「偏向锁在 JDK 15 就被**默认禁用并弃用**,JDK 18 起**移除**(JEP 374)。你背的那一级,是博物馆展品。」

> **〔5〕** 深夜,两个互不相识的柜台组件之间,Race 双胞胎把**同一根锁链**悄悄穿过两边门把手——整条流水线无声卡死。
> 豆豆(压低声音):「更邪门的在后头:有人拿**字符串常量**当锁,锁着锁着,把别人家的门也锁上了。」

---

## 三、本话目标

- 说清 synchronized 锁的是对象:对象头 Mark Word 的登记直觉;
- 分清同步方法 / 同步块、实例锁 vs 类锁,四种写法各锁在谁头上;
- 讲透锁升级的「八股与现实」:偏向锁的兴衰,现代路径只剩三级;
- 记住 wait / notify 必须持锁,否则 `IllegalMonitorStateException`;
- 踩一次「常量池/缓存对象当锁」引发的跨模块死锁并修好。

---

## 四、原理图:对象头上的门牌与三级锁

```text
一个 Java 对象 = [对象头 | 实例数据 | 对齐填充]
                    │
                    ├─ Mark Word:哈希码 / GC 年龄 / 锁状态 ←— synchronized 全在这儿做文章
                    └─ 类型指针:我是哪个类的实例
(Java 25 的 JEP 519「紧凑对象头」把这一头压得更小——引擎室的事,番外卷三再深挖)

现代锁升级路径(偏向锁已移除,见时光机):
  无锁     —— 没人争,铭牌平放
  轻量级锁 —— 线程用 CAS 把锁记录装进 Mark Word,失败则自旋(回看第 71 话)
  重量级锁 —— 争抢者多/自旋太久,膨胀为 monitor,抢不到的线程被 OS 挂起
  (只升不降:持有期间不会退回轻量级)
```

锁的是对象,那「哪个对象」就成了第一问。四种写法,四个答案:

| 写法 | 锁对象 | 一句话 |
|---|---|---|
| `synchronized void deduct()` | `this`(实例锁) | 同一实例互斥;不同实例各玩各的 |
| `static synchronized void reload()` | `StockService.class`(类锁) | 全类共用一把,与实例锁**互不干扰** |
| `synchronized (this) { … }` | `this` | 还是实例锁,但临界区可收窄到几行 |
| `synchronized (lock) { … }` | 自选对象 | 最灵活;锁对象必须**私有、final、不可替换** |

还有一条铁律:`wait` / `notify` 是「持锁者的动作」——必须先拿到**同一个对象**的锁再调,否则 JVM 当场翻脸:

```text
Exception in thread "main" java.lang.IllegalMonitorStateException: current thread is not owner
        at java.base/java.lang.Object.wait0(Native Method)
        at java.base/java.lang.Object.wait(Object.java:389)
        at StockService.awaitRestock(StockService.java:21)
```

原因一句话:`wait` 的语义是「**放开这把锁**并睡下」——你都没持有,谈何放开。

> **豆豆旁白**:JIT 工厂还会背着你做两件好事——逃逸分析发现锁对象根本逃不出单线程,直接**锁消除**;一个循环里反复拆装同一把锁,合并成一次**锁粗化**。所以「加了锁就一定慢」是错觉。工厂内幕,第 83 话《字节码与 JIT》再进车间。

> **⏳ 版本时光机 · 偏向锁:一项优化的兴衰**

| 阶段 | 状态 | 为什么 |
|---|---|---|
| 诞生(多核前夜) | 引入偏向锁 | 老一代类库大量方法自带 synchronized,却常年只有一个线程进出;把锁「偏向」首个线程,重入近乎零成本 |
| JDK 15 | 默认禁用并弃用(JEP 374) | 收益大跌:新代码早改用无同步的集合;而撤销偏向需要全局安全点,停顿反成负担 |
| JDK 18 起 | 移除 | 四级八股正式成为历史,现实只剩:无锁 → 轻量级 → 重量级 |

一句演进小结:优化为具体时代的负载而生;负载变了,优化就该退场——能讲出「为什么删」,比背「它存在过」值钱。

---

## 五、从上一话继续:把「查 + 扣」关进同一间房

上一话的 `AtomicInteger` 只保住计数这一步棋。今天在它旁边,把库存的两步棋装进同一把锁:

```java
public class StockService {
    private int stock = 50;

    public synchronized boolean deduct(int n) {   // 实例锁:锁的是 this
        if (stock < n) return false;              // 查
        stock -= n;                               // 扣——两步进了同一间房,无人能插队
        return true;
    }

    public synchronized int stock() { return stock; }  // 读也进锁:互斥之外,还给了可见性(回看第 70 话)
}
```

> **豆豆锐评**:synchronized 一次给你两样东西——**互斥**(同一时刻一间房只进一人)和**可见性**(出房间时改动对下一个进房的人可见)。上一话的 volatile 只给后者,这就是它替不了锁的原因。

---

## 六、故意制造一个 Bug:「我自己的锁」

冬歇大扫除,阿零发现库存盘点和小票汇总两个组件**各自**都声明了「自己的锁」,深夜一起跑:

```java
class InventoryTask implements Runnable {              // 库存盘点(阿零写的)
    private static final String LOCK = "LOCK";         // 「我自己的锁」
    @Override public void run() {
        synchronized (LOCK) {
            nap();
            synchronized (Integer.valueOf(1)) {        // 1 号柜台的「柜台锁」
                IO.println("盘点完成");
            }
        }
    }
    static void nap() { try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } }
}

class ReceiptTask implements Runnable {                // 小票汇总(学长早年写的)
    private static final Integer COUNTER = Integer.valueOf(1);
    @Override public void run() {
        synchronized (COUNTER) {
            InventoryTask.nap();
            synchronized ("LOCK") {                    // 「我自己的锁」……吗?
                IO.println("小票汇总完成");
            }
        }
    }
}
```

```java
void main() throws InterruptedException {              // Cleanup.java(紧凑源文件)
    var t1 = new Thread(new InventoryTask(), "inventory-task");
    var t2 = new Thread(new ReceiptTask(), "receipt-task");
    t1.start(); t2.start();
    t1.join();  t2.join();
    IO.println("大扫除结束");                           // 永远打印不出来
}
```

---

## 七、观察真实现象:无声的卡死

不报错、不退出、CPU 归零——最阴的一种故障。掏出 `jstack <pid>`(S5 学过的老朋友):

```text
Found one Java-level deadlock:
=============================
"inventory-task":
  waiting to lock monitor 0x000001c8f2a04b00 (object 0x000000062a1c4d20, a java.lang.Integer),
  which is held by "receipt-task"

"receipt-task":
  waiting to lock monitor 0x000001c8f2a06d80 (object 0x000000062a0018f8, a java.lang.String),
  which is held by "inventory-task"

Found 1 deadlock.
```

两个「互不相识」的类,怎么会抢到**同一把**锁?

- `"LOCK"` 字面量进**字符串常量池**,全 JVM 只有一份——两个类写的 `"LOCK"` 是**同一个对象**;
- `Integer.valueOf(1)` 走 **IntegerCache**(默认 -128~127,回看第 59 话),同样全 JVM 一份;
- 于是两个模块各持一把、互等对方——经典 ABBA 死锁,还是**跨模块**的。

其实编译时就有人贴过罚单,只是阿零没看:

> **📋 编译官罚单**

```text
ReceiptTask.java:5: warning: [synchronization] attempt to synchronize on an instance of a value-based class
        synchronized (COUNTER) {
        ^
1 warning
```

> **豆豆锐评**:拿字符串常量或缓存的包装对象当锁,等于把你家门锁焊在**公共走廊**上——谁路过都能顺手一拧。锁的是对象;对象是公共的,锁就是公共的。

---

## 八、修复,并用测试证明

锁对象三原则:**私有**(private)、**钉死**(static final 或 final)、**专用**(就 `new Object()`,绝不用 String / 包装类 / 任何外界拿得到的东西):

```java
class InventoryTask implements Runnable {
    private static final Object LOCK = new Object();       // 全世界仅此一份,且只有我拿得到
    private static final Object COUNTER_LOCK = new Object();
    // run() 逻辑不变,只换锁对象;ReceiptTask 同样各自 new 自己的锁
}
```

```java
import org.junit.jupiter.api.Test;
import java.time.Duration;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

class SyncLockTest {
    @Test
    void deduct_never_oversells_under_contention() throws InterruptedException {
        var service = new StockService();                   // 初始库存 50
        var threads = new ArrayList<Thread>();
        var success = new AtomicInteger();                  // 回看第 71 话
        for (int i = 0; i < 100; i++)
            threads.add(Thread.ofPlatform().start(() -> {
                if (service.deduct(1)) success.incrementAndGet();
            }));
        for (var t : threads) t.join();
        assertEquals(50, success.get());                    // 恰好卖出 50,一杯不超
        assertEquals(0, service.stock());
    }

    @Test
    void cleanup_tasks_no_longer_deadlock() {
        assertTimeoutPreemptively(Duration.ofSeconds(2), () -> {
            var t1 = new Thread(new InventoryTask());
            var t2 = new Thread(new ReceiptTask());
            t1.start(); t2.start();
            t1.join();  t2.join();                          // 修复后 2 秒内必然收工
        });
    }
}
```

JUnit 质检员:「证据呢?——100 线程不超卖,2 秒内不卡死,这才叫证据。」

> **🎯 面试直击**:说说 synchronized 的锁升级路径?
> 现代 JDK 只有三级:无锁 → 轻量级(CAS 自旋)→ 重量级(OS 互斥量,线程挂起)。答出「偏向锁 JDK 15 默认禁用并弃用、JDK 18 已移除(JEP 374)」是加分项;追问点:为什么删——无争用收益消失,撤销偏向还要全局安全点,得不偿失。

---

## 九、项目检查点 · 豆豆咖啡站 v9.3

```text
咖啡站形态:老锁 synchronized 被拆开看了个通透,「查+扣」两步棋关进了同一间房
已具备  :锁在对象头不在代码;四种写法各锁谁分得清;锁升级只剩三级(偏向锁已成历史);
          锁对象一律私有 final 的 Object;死锁会用 jstack 定位;wait/notify 知道要持锁
还没有  :synchronized 抢不到就死等——不能超时、不能中断、不问公平;「讲道理的锁」还没见过
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| synchronized 原理(对象头 / Mark Word / monitor) | 「熟悉 JVM 并发原语」,后端并发岗几乎必问 |
| 锁升级路径 + 版本现实(JEP 374) | 八股高频;能讲「偏向锁为什么被删」,直接与背书选手拉开差距 |
| 死锁定位(jstack)与锁对象规范 | 「具备线上问题排查能力」的硬证据 |
| wait / notify 与持锁前提 | 手写生产者-消费者的地基,笔试常客 |

---

## 十一、下一话悬念

特训收工,阿零却攒了一肚子新怨气:synchronized 抢不到就**死等**——不能限时放弃,不能被中断,更不问先来后到。

豆豆:「它够用,但太糙。想要能超时、能中断、能公平的『讲道理的锁』,你得拆开锁的**内脏**看看。」

> 下一话《锁的内脏:AQS 与显式锁》:一个 state 变量加一条排队的队列,如何撑起 Java 显式锁的半壁江山;ReentrantLock 凭什么说自己比 synchronized「讲道理」。

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. `synchronized` 锁的信息记录在对象的哪个部分?
   - A) 对象的 `Class` 元数据中　　B) Java 对象头的 Mark Word 中　　C) JVM 方法区的锁表中　　D) 线程栈帧的局部变量表中

2. synchronized 锁升级的正确路径(JDK 17+)是?
   - A) 偏向锁 → 轻量级锁 → 重量级锁　　B) 无锁 → 轻量级锁(自旋 CAS) → 重量级锁(互斥)　　C) 无锁 → 偏向锁 → 重量级锁　　D) 自旋锁 → 偏向锁 → 重量级锁

3. 关于偏向锁,以下哪项正确?
   - A) 偏向锁在 JDK 21 中仍然是默认开启的优化　　B) 偏向锁在 JDK 15 被默认禁用,JDK 18 被正式移除　　C) 偏向锁只在单核 CPU 场景下有效　　D) 偏向锁是为减少轻量级锁的自旋开销而设计的

4. wait() / notify() / notifyAll() 必须在 synchronized 块内调用,根本原因是?
   - A) JVM 语法校验要求,编译期强制　　B) 这三个方法内部需要先获取对象的 monitor 锁,否则 `wait` 语义中的「释放锁」不成立　　C) 因为 `Object.wait()` 本身就是 `synchronized` 方法　　D) 只是为了使用规范,实际上不持有锁也能调用,只是抛 `IllegalMonitorStateException` 警告

5. JIT 编译器对 synchronized 的「锁消除」优化,触发条件是什么?
   - A) 锁对象被多个线程共享时　　B) 锁对象是局部变量、逃逸分析判定不会逃逸到当前线程之外时　　C) 锁被持有超过 100ms 时　　D) 锁在内层循环中被重复加解锁时

6. 以下代码中,线程 B 调用 `obj.notify()` 后,线程 A 在 `obj.wait()` 处被唤醒,唤醒后线程 A 的第一个动作是什么?

```java
synchronized (obj) {
    obj.wait();         // 线程 A 在此阻塞
    doSomething();      // 唤醒后执行这行之前,需要什么?
}
```

- A) 立即执行 `doSomething()`　　B) 重新竞争获取 `obj` 的 monitor 锁,拿到后才能继续　　C) 进入 `BLOCKED` 状态,等待 `notify` 线程释放锁后自动获得锁　　D) 直接跳到 `notify` 线程的上下文继续执行

7. JIT 的「锁粗化」优化,会把以下哪段代码优化?
   - A) 一个方法内连续对同一个锁对象加锁-解锁多次,合并成一次加锁　　B) 多个不同的锁对象合并成一个锁对象　　C) 将 `synchronized` 方法内的锁降级为自旋锁　　D) 把 `synchronized` 块内的代码移到块外执行

8. 以下哪个说法准确地描述了重量级锁在操作系统层面的行为?
   - A) 线程自旋等待,自旋超过阈值后才挂起　　B) 线程直接调用操作系统的互斥量(mutex),未拿到锁时被 pthread 挂起,发生用户态↔内核态切换　　C) 重量级锁实际上是 CAS 自旋的重试次数上限被设为无限大　　D) 重量级锁通过内存屏障实现,不使用 OS 线程调度

9. 以下代码中,线程 A 执行 `lockA()`、线程 B 执行 `lockB()`,死锁会不会发生?

```java
final Object a = new Object(), b = new Object();

void lockA() { synchronized (a) { synchronized (b) { work(); } } }
void lockB() { synchronized (b) { synchronized (a) { work(); } } }
```

- A) 必然死锁,因为 `synchronized` 不可重入　　B) 可能死锁——A 拿到 a 等 b,B 拿到 b 等 a,形成循环等待　　C) 不会死锁,因为锁对象不同,JVM 会自动检测并打破死锁　　D) 不会死锁,因为两条线程的执行顺序总是确定的

10. 以下关于 `notify()` 和 `notifyAll()` 的选型,哪个说法最准确?
   - A) 应该永远使用 `notifyAll()`,因为 `notify()` 可能导致信号丢失　　B) 当所有等待线程的等待条件相同时用 `notify()`,当条件不同时用 `notifyAll()`;用 `notify()` 而条件不同可能导致「信号丢失」——唤醒的线程不满足条件又睡回去,但满足条件的线程没被唤醒　　C) `notify()` 比 `notifyAll()` 性能好,应该尽量用 `notify()`　　D) 两者本质上没区别,只是 `notifyAll()` 多了一个循环

### 解答题(5 道)

1. `synchronized(obj) { ... }`——这行代码里,锁的到底是「obj」还是「花括号里的代码」?请结合对象头的 Mark Word 解释。

2. 请画出 JDK 17+ 的锁升级路径图,标注每个升级的触发条件和降级条件(如果有的话)。为什么偏向锁会被移除?

3. 某业务代码中对同一个 `StringBuffer` 实例连续调了十几次 `append()`,JIT 发现了什么?它会怎么优化这段代码?请从锁消除和锁粗化两个维度分析。

4. 生产者-消费者模型:一个队列,`put()` 满时等待,`take()` 空时等待。请解释为什么 `wait()` 必须在 `while` 循环里调用而不是 `if`,以及 `notifyAll()` 在这个场景的必要性——用一个具体的错误执行序列来说明。

5. 你的咖啡站订单系统有一个共享的订单状态对象,多个线程可能同时读取和修改它。你有两个候选设计:① 全部用 `synchronized` 方法 ② 先上 `synchronized`,再结合 JIT 的锁优化(锁消除、锁粗化)来减少开销。请问你应该依赖 JIT 的优化来为锁「减负」吗?哪些优化可以信任,哪些不能?对你的代码设计有什么指导原则?

> [!答案]
> **1-1** B(锁信息存储在对象头的 Mark Word 中——包括锁标志位、锁记录指针、monitor 指针等)  
> **举一反三**:Java 对象头 = Mark Word + Klass Pointer。Mark Word 是一块多用途内存,无锁时存 hashCode/GC 年龄,锁定时存锁记录或 monitor 指针。所以「锁的是对象不是代码」。
>
> **1-2** B(JDK 17+ 路径:无锁 → 轻量级锁(CAS 自旋) → 重量级锁(mutex)。偏向锁已被移除,没有这个阶段)  
> **举一反三**:很多八股还是旧的「偏向→轻量→重量」,面试中答 JDK 17+ 的路径能展现你对版本演进的关注。加分项:说明偏向锁被移除的原因——现代高并发场景下偏向锁的撤销开销超过了收益。
>
> **1-3** B(偏向锁从 JDK 15 起默认禁用、JDK 18 中被正式移除代码)  
> **举一反三**:偏向锁的初衷:在大多数时候锁只被一个线程访问的场景下(如 `StringBuffer`/`Vector` 内部方法),省掉 CAS 操作。但现代应用高并发场景多,偏向锁的批量撤销(bulk revocation)反而拖累性能,OpenJDK 社区权衡后将其移除。
>
> **1-4** B(`wait/notify` 基于 monitor 机制——线程必须持有对象 monitor 锁才能调用 `wait()` 释放它,否则「释放一个你没持有的锁」在语义上说不通,JVM 会抛 `IllegalMonitorStateException`)  
> **举一反三**:可以把 monitor 理解为「房间唯一的钥匙」——只有拿着钥匙的人才有权说「我先睡一会儿,钥匙放桌上」(`wait`),也只有拿着钥匙的人才能拍醒别人(`notify`)。
>
> **1-5** B(逃逸分析判定锁对象不会离开当前线程时,JIT 直接消除锁——既然只有自己用,加不加锁都一样)  
> **举一反三**:锁消除是逃逸分析的直接应用,所以写代码时尽量用局部变量、避免不必要的字段暴露,能帮 JIT 更好地做这种优化。典型受益场景:`StringBuffer` 在方法内作为局部变量使用时,内部的 `synchronized` 会被消掉。
>
> **1-6** B(`wait()` 被唤醒后,线程必须先重新获取对象的 monitor 锁,拿到后才能继续执行 wait 后面的代码)  
> **举一反三**:`wait()` 的完整语义:① 释放锁 ② 阻塞等待 ③ 被唤醒 ④ **重新竞争锁** ⑤ 拿到锁后继续执行。从 `wait()` 返回时,当前线程一定再次持有了锁。这也是为什么 `wait()` 释放锁和重新获取锁之间存在竞态窗口。
>
> **1-7** A(连续的加锁-解锁被合并成一次——减少频繁的锁获取/释放开销)  
> **举一反三**:锁粗化是 JIT 自动做的,但你写代码时也应该有意识地避免在循环内频繁加锁解锁。`synchronized` 放在循环外面而不是里面,既省了 JIT 的活,也让代码意图更清晰。
>
> **1-8** B(重量级锁 = OS 互斥量。线程未拿到锁时被 OS 挂起,从用户态切到内核态,由 OS 调度器管理等待队列。上下文切换开销远大于 CAS 自旋)  
> **举一反三**:轻量级锁和重量级锁的核心区别——轻量级在用户态自旋(消耗 CPU 但不切换上下文),重量级进入内核态挂起(不消耗 CPU 但要切换)。自旋策略的选择:「锁持有时间短」→自旋更划算;「锁持有时间长」→挂起更划算。
>
> **1-9** B(可能死锁——A 拿 a 等 b,B 拿 b 等 a,形成经典的循环等待。`synchronized` 不提供死锁检测或超时机制)  
> **举一反三**:预防死锁的经典原则——所有线程按相同顺序获取锁。如果用 `ReentrantLock.tryLock(timeout)`,至少可以在超时后放弃,避免永久阻塞。`synchronized` 在这一点上确实比显式锁弱。
>
> **1-10** B(关键在等待条件是否相同——所有线程等同一条件用 `notify()` 就够了;但如果是「满等待」「空等待」等不同条件混在同一 wait set 中,用 `notify()` 可能唤醒一个不满足条件的线程,它又 `wait()` 回去,而真正满足条件的线程没被唤醒——这就是信号丢失)  
> **举一反三**:Java 的 wait set 只有一个(不区分条件),所以 `notify()` 唤醒的是随机一个等待线程。这也是为什么 `Condition` (AQS 支持)可以在一个锁上建多个等待队列——精准唤醒,根除了 notify/notifyAll 的语义歧义。
>
> **2-1** 锁关联的是「obj」这个**对象**,不是代码块。`synchronized(obj)` 对同一对象建立互斥关系;两个线程锁同一对象才互斥,锁不同对象即使代码相同也不互斥。对象头、Mark Word、锁记录和 monitor 是 HotSpot 的重要实现观察窗口,但不是 Java 语言规范承诺的稳定布局;不同 JDK、GC 与紧凑对象头实现会改变细节。排障和面试可以用它解释现象,业务正确性只应依赖 `synchronized` 的互斥与 happens-before 语义。
> **举一反三**:`synchronized` 的可重入性是 Java 并发语义,不应把「Mark Word 里必定如何记录」当成跨版本契约。
>
> **2-2** 面向面试的 HotSpot 概念图(不是规范承诺,也不要拿它推导固定阈值):
> ```
> 无锁 ──(首次加锁,有竞争)──▶ 轻量级锁(CAS)
>                                  │ (自旋失败/竞争激烈/调用wait)
>                                  ▼
>                              重量级锁(OS mutex)
> ```
> 膨胀/阻塞的具体触发由 HotSpot 按竞争、持有时间、`wait` 等运行时状态决定;不要背 `-XX:PreBlockSpin` 的「默认 10 次」——它不是现代 JDK 可依赖的通用调参契约。偏向锁移除的原因是其维护与撤销成本在现代工作负载下常超过收益。
> **举一反三**:回答锁实现题时,先标注「这是某版本 HotSpot 的实现模型」;真正要验证竞争和停顿,应使用 JFR、线程栈、锁事件与压测,而不是凭状态图调参数。
>
> **2-3** 锁消除:如果 `StringBuffer` 是方法内局部变量(new 出来就只在这个方法里用),逃逸分析会发现它不会逃逸到其他线程——既然只有一个线程访问,所有 `append()` 里的 `synchronized` 都是多余的,JIT 在编译为本地代码时直接消除这些锁。锁粗化:即使 `StringBuffer` 需要被共享(无法消除),JIT 看到连续十几次 `append()` 调用,每次都加锁-解锁-加锁-解锁……会将其合并——在第一个 `append` 前加锁,最后一个 `append` 后解锁,中间十几次操作在同一个锁保护下完成,减少十几次锁获取/释放的开销。  
> **举一反三**:这两个优化展示了 JIT 为什么比 AOT 编译有优势——JIT 能根据运行时信息(逃逸分析结果、热点路径)做针对性优化。但不要依赖它们来为糟糕的锁设计买单:该加在循环外面的锁,别全指望 JIT 帮你粗化。
>
> **2-4** 错误方案(用 `if`):
> ```java
> // put() 端
> synchronized (queue) {
>     if (queue.isFull()) queue.wait();  // ❌ 用 if
>     queue.add(item);
>     queue.notifyAll();
> }
> // take() 端
> synchronized (queue) {
>     if (queue.isEmpty()) queue.wait(); // ❌ 用 if
>     Item item = queue.remove();
>     queue.notifyAll();
> }
> ```
> 致命执行序列:① 队列满,两个生产者 A 和 B 先后 `wait()`。② 消费者取走一个元素,`notifyAll()` 唤醒 A 和 B。③ A 先拿到锁,add 了一个元素(队列又满了)。④ A 释放锁。⑤ B 拿到锁,从 `wait()` 返回,因为是 `if` 不再检查条件,直接 `add()`——队列溢出。修法:把 `if` 改成 `while`——B 唤醒后 `while (isFull())` 发现又满了,继续 `wait()`。`notifyAll()` 的必要性:队列中有 put 和 take 两拨等待者,等待条件不同。如果用 `notify()`,JVM 只随机唤醒一个——可能唤醒一个 put 等待者(队列已满,它继续 wait),而 take 等待者(队列有数据,可以取)没被唤醒,导致永久阻塞。`notifyAll()` 一次性唤醒所有人,各自检查条件,不满足的继续等。  
> **举一反三**:这是「条件变量+while 循环」的经典模式,几乎所有并发编程的教材都会强调。本质上,`wait/notify` 的低级抽象要求程序员自己处理虚假唤醒和信号丢失,而 `Condition` 和 `BlockingQueue` 等高层抽象已经在内部帮你做了这些。
>
> **2-5** 不能依赖 JIT 优化来为糟糕的锁设计「减负」。可信任的优化:①锁消除——把 `StringBuffer` 换成 `StringBuilder` 更好,但如果用 `StringBuffer` 作为局部变量,JIT 的锁消除是可靠的,因为逃逸分析是精确的。②锁粗化——JIT 会帮你合并连续的锁操作,但这是「锦上添花」而非「雪中送炭」。不可依赖的点:①JIT 优化有触发条件(热点代码、编译阈值),冷代码不会优化;②只在 Server Compiler(C2) 下有效,Client Compiler(C1) 不做高级优化;③不能指望 JIT 优化一个设计错误的锁策略。自己的锁粒度必须比 JIT 的行为更可靠。设计指导原则:①尽可能缩小锁范围;②循环外放锁,别在里面反复加解锁;③局部变量直接用线程安全的不变对象或非同步版本;④把锁消除/粗化当作「免费加速」,不当作「设计兜底」。好的设计是:不打开优化也性能尚可,打开优化后锦上添花。  
> **举一反三**:依赖 JIT 优化的代码是脆弱代码——换个 JDK 版本、换套 JVM 参数、碰到冷路径,性能就雪崩。写法要对齐你的意图:如果你知道某个对象只有一个线程访问,就不要给它加锁,而不是加了锁然后指望 JIT 帮你消掉。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
