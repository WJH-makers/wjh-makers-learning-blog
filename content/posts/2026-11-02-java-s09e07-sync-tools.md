---
title: "《从零开始学 Java》76 · 并发工具箱:门闩·栅栏·信号量"
date: 2026-11-02
summary: "开店仪式要等 8 台设备自检到齐,阿零却把 countDown 写在正常路径末尾——一台设备自检炸了,await 从此永睡,仪式僵在原地。门闩、栅栏、信号量三件工具各管什么,AQS 的 state 如何一具身体三种玩法,这一话一次讲清。"
tags: [Java, Java漫画, CountDownLatch, CyclicBarrier, Semaphore, 并发, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》76 · 并发工具箱:门闩·栅栏·信号量

> 连载特刊 · 番外卷二「并发深水区」第 7 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——ThreadLocal 给每个线程发了专属托盘,上下文不再串味;可开店仪式要等 8 台设备自检到齐、磨豆机只有 3 台,一堆线程要排兵布阵——光有隔离不够,得开工具箱。

---

## 一、事故或需求:开店仪式卡在「等人齐」

冬歇期结束试营业。开门前的仪式:8 台设备(磨豆机×3、奶泡机×2、烤杯机×2、收银机×1)各自起线程自检,**全部就位才能开门**。阿零的写法是 `Thread.sleep(3000)`——「三秒总够了吧」。结果快的设备干等,慢的设备没检完门就开了,顾客进店点单,烤杯机还在预热。

豆豆:「你在用『猜时间』代替『等事件』。等一组线程到齐,JDK 工具箱里有现成的三件套:**门闩、栅栏、信号量**——今天全给你配齐。」

---

## 二、漫画 · 三件工具进店

> **〔1〕** 线程调度中心里,JVM 城主看着 8 条设备线程各跑各的;阿零站在店门口掐秒表,`sleep(3000)` 一到就拉门闸——烤杯机线程在他身后哀嚎「我还没热!」。
> 豆豆:「`sleep` 是赌博,不是同步。你赌的是『三秒内大家都好了』,输了就翻车。」

> **〔2〕** 豆豆搬来一扇挂着 **8 道锁扣的大门**(CountDownLatch):每台设备自检完就「咔哒」扣掉一格,计数归零,门自己弹开。
> 豆豆:「门闩只认计数:`countDown()` 扣一格,`await()` 的人睡到归零。**扣完就废,一次性用品。**」

> **〔3〕** 出餐口立着一道 **3 人栅栏**(CyclicBarrier):三杯咖啡各自做完,凑齐第三杯的瞬间栏杆抬起,**最后到的那条线程顺手端走整托盘**(barrierAction),栏杆「咔」地自动复位,等下一托盘。
> 阿零:「它跟门闩不是一回事?」豆豆:「门闩是『有人等别人』,栅栏是『大家互相等』;而且栅栏到齐自动复位,能循环用。」

> **〔4〕** 磨豆机只有 3 台,10 条订单线程蜂拥而上;豆豆撒出 **3 块磨豆牌**(Semaphore):有牌才能上机,没牌的靠墙排队。阿零磨完把牌揣兜里就走,队伍瞬间少了一个坑位。
> 豆豆(叼着豆子叉腰):「**牌是借的,不是发的!** `release()` 不写进 finally,你就是并发世界的老赖。」

---

## 三、本话目标

- 用 CountDownLatch 实现「主等多」与「多等一」两种姿势;
- 用 CyclicBarrier 凑托盘出餐,理解 barrierAction 与 broken 语义;
- 用 Semaphore 给 3 台磨豆机限流,`release` 必进 finally;
- 站在 AQS 视角(回看第 73 话)看穿三件工具的同一具骨架;
- 踩一次「countDown 没进 finally,await 永睡」并修好。

---

## 四、原理图:三件工具对照 + AQS 一具骨架

```text
工具           一句话              计数方向          可重用   典型场景
CountDownLatch 门闩:数到 0 门开    只减不复位        否      主等多(等全员就位)/ 多等一(发令枪)
CyclicBarrier  栅栏:到齐一起走     到齐自动复位      是      分轮计算、凑托盘;barrierAction 由最后到者执行
Semaphore      许可池:有牌才进     acquire 减/release 加  是   3 台磨豆机、连接池、接口限流

broken 语义:栅栏上任何一个参与者被中断 / 等待超时 / 有人调 reset(),
栅栏当场「碎裂」——其余所有 await 的线程立刻抛 BrokenBarrierException 醒来,
绝不留人傻等;想再用,得 reset()。

编外二将(各一句):Phaser = 参与者可动态增减、可分多阶段的豪华版栅栏;
Exchanger = 两条线程一手交钱一手交货的定点交换台。
```

AQS 视角(第 73 话那套 `state + FIFO 队列 + park/unpark`,今天看它的三种玩法):

| 工具 | state 的含义 | 模式 |
|---|---|---|
| ReentrantLock(#73) | 重入次数,0 = 无主 | 独占:一次只放一个 |
| CountDownLatch | 剩余计数,0 = 门开 | 共享:归零后放行**所有**等待者 |
| Semaphore | 剩余许可数 | 共享:有几张牌放几个人 |

> **豆豆锐评**:CyclicBarrier 是个例外——它**不直接继承 AQS**,而是拿 ReentrantLock + Condition 组装的「组合件」,靠换代计数实现循环复用。另外 Semaphore 和 ReentrantLock 一样分公平/非公平:`new Semaphore(3, true)` 先来先得不许插队,代价是吞吐略降——插队逻辑第 73 话讲透了,此处同理。

---

## 五、从上一话继续:开店仪式三件套上岗

在第 75 话的试营业代码之上,把「猜时间」换成「等事件」:

```java
import java.util.concurrent.*;

public class OpeningCeremony {
    static final CountDownLatch gun   = new CountDownLatch(1);  // 多等一:发令枪
    static final CountDownLatch ready = new CountDownLatch(8);  // 主等多:8 台设备
    static final Semaphore grinders   = new Semaphore(3);       // 3 台磨豆机 = 3 块牌

    public static void main(String[] args) throws InterruptedException {
        for (int i = 1; i <= 8; i++) {
            int id = i;
            Thread.ofPlatform().name("device-" + id).start(() -> {
                try {
                    gun.await();          // 全体待命,等一声令下同时开测
                    selfCheck(id);
                    ready.countDown();    // 检完扣一格(这一行的位置,埋着雷)
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }
        gun.countDown();                  // 砰!8 台同时自检
        ready.await();                    // 主线程睡到 8 格扣完
        IO.println("8 台设备全部就位,开门!");
    }

    static void grind(String order) throws InterruptedException {
        grinders.acquire();               // 拿牌,拿不到就排队
        try {
            IO.println(order + " 占用磨豆机");
            Thread.sleep(200);
        } finally {
            grinders.release();           // 铁律:还牌必进 finally
        }
    }
}
```

出餐口的栅栏,三杯一托盘、循环复用:

```java
static final CyclicBarrier tray =
        new CyclicBarrier(3, () -> IO.println("凑满一托盘,端走!")); // 最后到者执行

// 每杯做完调用 tray.await():前两杯的线程原地等,
// 第 3 杯到达 → 触发 barrierAction → 栏杆自动复位,下一托盘接着凑。
```

> **🔀 豆豆的多解台 · 「等一组任务全部做完」怎么解?**

| 解法 | 代码要点 | 适合什么时候 | 坑 |
|---|---|---|---|
| `Thread.join()` | 逐个 `t.join()` | 手里攥着每个 Thread 引用的小场面 | 只能等「线程死透」,等不了「阶段完成」;线程池里拿不到 Thread |
| CountDownLatch | 干完活 `countDown()`,主线程 `await()` | 等的是**事件**而非线程;配线程池最顺手 | 一次性;countDown 忘进 finally 就永睡(见下文) |
| `CompletableFuture.allOf` | 每个任务一个 future,`allOf(...).join()` | 还要拿**返回值**、接着编排后续动作 | 预告:下一话专讲 |

豆豆锐评:**默认 CountDownLatch**——它等的是「事件发生」,跟任务跑在哪条线程上彻底解耦;要结果、要链式编排,等下一话的 CompletableFuture。

---

## 六、故意制造一个 Bug:countDown 写在正常路径末尾

试营业第二天,3 号磨豆机刀盘卡死,自检直接抛异常:

```java
static void selfCheck(int id) {
    if (id == 3) throw new IllegalStateException("磨豆机 3 号自检失败:刀盘卡死");
    IO.println("设备 " + id + " 自检通过");
}
```

而上面的代码里,`ready.countDown()` 跟在 `selfCheck(id)` **后面的正常路径上**——异常一抛,这行永远执行不到。

---

## 七、观察真实错误信息:一格锁扣,永远扣不上

控制台先甩出 3 号设备的临终遗言:

```text
Exception in thread "device-3" java.lang.IllegalStateException: 磨豆机 3 号自检失败:刀盘卡死
	at OpeningCeremony.selfCheck(OpeningCeremony.java:31)
	at OpeningCeremony.lambda$main$0(OpeningCeremony.java:14)
	at java.base/java.lang.Thread.run(Thread.java:1583)
```

然后——**没有然后了**。程序不报错也不退出,「开门!」永远打不出来。阿零掏出 `jstack`(第 56 话大促排障练过的手艺),主线程的堆栈原形毕露:

```text
"main" #1 prio=5 os_prio=0 waiting on condition
   java.lang.Thread.State: WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@25/Native Method)
	- parking to wait for  <0x000000062a1b2c40> (a java.util.concurrent.CountDownLatch$Sync)
	at java.util.concurrent.locks.LockSupport.park(java.base@25/LockSupport.java:369)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquireSharedInterruptibly(java.base@25/AbstractQueuedSynchronizer.java:1077)
	at java.util.concurrent.CountDownLatch.await(java.base@25/CountDownLatch.java:230)
	at OpeningCeremony.main(OpeningCeremony.java:22)
```

看堆栈第四行:main 正躺在 **AQS 的共享队列**里睡觉——`state` 卡在 1,永远归不了零。门闩计数只减不加、也没有「参与者挂了」的感知,**一格扣不上,门就一辈子不开**。

---

## 八、修复并用测试证明:finally 计数 + 超时兜底

两针一起下:**成败都要计数**(finally),**等待必须有底线**(超时分支):

```java
static boolean openWhenReady(java.util.List<Runnable> checks, long seconds)
        throws InterruptedException {
    var ready = new CountDownLatch(checks.size());
    for (var check : checks) {
        Thread.ofPlatform().start(() -> {
            try {
                check.run();
            } finally {
                ready.countDown();            // 修复①:自检炸了也扣格,仪式必然结束
            }
        });
    }
    return ready.await(seconds, TimeUnit.SECONDS);  // 修复②:超时返回 false,绝不永睡
}

// 调用侧处理超时分支:
if (openWhenReady(checks, 5)) IO.println("全员响应,按自检结果决定开门");
else IO.println("5 秒仍未到齐:打印未响应设备清单,报警,今天不开门");
```

注意语义分工:finally 保证的是「**仪式一定散场**」;至于 3 号机检没检过,用单独的结果收集去判断——**卡死**和**失败**是两码事,别让前者掩盖后者。

JUnit 质检员:「证据呢?」

```java
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;

class OpeningCeremonyTest {
    @Test
    void latch_opens_even_if_one_device_fails() throws InterruptedException {
        List<Runnable> checks = List.of(
                () -> {},                                             // 正常设备
                () -> { throw new IllegalStateException("刀盘卡死"); } // 故障设备
        );
        assertTrue(OpeningCeremony.openWhenReady(checks, 2));  // finally 保证归零,2 秒内必返回
    }

    @Test
    void await_with_timeout_never_sleeps_forever() throws InterruptedException {
        var never = new CountDownLatch(1);                     // 永远没人 countDown
        assertFalse(never.await(200, TimeUnit.MILLISECONDS));  // 超时给 false,不给永睡
    }
}
```

> **🎯 面试直击**:CountDownLatch 和 CyclicBarrier 的三点区别?
> ① **复用**:门闩计数归零即报废;栅栏到齐自动开启下一代,可循环。② **角色**:门闩分「计数方 / 等待方」两种角色,`countDown` 本身不阻塞;栅栏是参与者互等,`await` 既报到又阻塞。③ **底子**:门闩直接继承 AQS 走共享模式;栅栏是 ReentrantLock + Condition 的组合件,还多送 barrierAction 和 broken 语义。追问点:栅栏上有人被中断会怎样?——栅栏碎裂,其余线程集体抛 BrokenBarrierException,不留人傻等。

---

## 九、项目检查点 · 豆豆咖啡站 v9.7

```text
咖啡站形态:开店仪式用门闩等齐、出餐口用栅栏凑盘、磨豆机用信号量限流
已具备  :主等多/多等一两种门闩姿势;barrierAction 与 broken 语义;release/countDown 必进 finally;
          await 带超时兜底;能从 jstack 里认出 AQS 共享队列
还没有  :等齐是会等了,可一杯咖啡的磨豆、打奶泡、烤杯明明能同时干,现在还是串行排队——缺异步编排
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| CountDownLatch / CyclicBarrier / Semaphore 选型 | 「熟悉 JUC 并发工具类」的具体内容,场景题高频 |
| AQS 共享模式与 state 语义 | 能把三件工具讲成一具骨架,是「懂原理」的分水岭 |
| finally 计数 / 带超时的 await / jstack 定位卡死 | 线上「服务假死」排障的基本功 |

---

## 十一、下一话悬念

仪式不僵了,可阿零盯着出餐流程直皱眉:一杯拿铁,磨豆 → 打奶泡 → 烤杯,三步明明互不依赖,现在却排成一条队干等。「等齐」这门功课及格了,「**同时干、再汇合、还要接力传结果**」呢?

> 下一话《异步编排:CompletableFuture》:把每一步变成可组合的未来值,`thenApply` 接力、`thenCombine` 汇流、`allOf` 收网——多解台里预告过的那位,正式登场。

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. `CountDownLatch` 的计数器到零后,是否可以重置复用?
- A) 可以,调用 `reset()` 方法重置计数器　　B) 不可以——它是「一次性门闩」,count 到零后 latch 的 state 不能恢复,需要重新 new 一个　　C) 可以,调用 `countDown()` 传入负数恢复　　D) 可以通过反射重置

2. `CyclicBarrier` 的 `await()` 调用后,当最后一个线程到达时,barrier 的动作是什么?
- A) 随机唤醒一个等待线程　　B) 先执行构造时传入的 barrierAction(如果有的话),然后所有等待线程被同时释放,barrier 的计数恢复到初始值,进入下一轮——所以叫「Cyclic」　　C) 只释放最后一个线程,前面的继续等待　　D) 所有线程按到达顺序依次释放

3. `Semaphore` 的 `acquire()` 和 `release()` 与锁的最关键区别是什么?
- A) Semaphore 没有区别,就是另一种锁　　B) `release()` 不需要由获取许可的线程调用——任何线程都可以 release 许可,且 release 的次数可以超过 acquire 的次数(增加总许可数)　　C) Semaphore 自动处理死锁　　D) Semaphore 是基于 CAS 的无锁结构

4. `CountDownLatch` 和 `CyclicBarrier` 的核心区别是什么?
- A) 没有区别,只是 API 不同　　B) CountDownLatch 是「等待其他线程完成」——主线程等 N 个子线程 countDown;CyclicBarrier 是「线程相互等待」——N 个线程各自 await,最后一个到达时全体释放　　C) CountDownLatch 可以重用,CyclicBarrier 不能　　D) CountDownLatch 基于 AQS,CyclicBarrier 不是

5. 从 AQS 的视角看,`CountDownLatch` 的 `tryAcquireShared` 返回什么表示「门闩已开」?
- A) state == 0 时返回正数表示成功,state > 0 时返回负数表示仍需等待　　B) 始终返回 true　　C) 只检查队列是否为空　　D) 返回 state 的原始值

6. `Semaphore` 用 AQS 实现时,`tryAcquireShared` 的逻辑是?
- A) 检查 state 是否 > 0,是则 CAS 减 state 返回剩余许可数;否则返回负数　　B) 检查 state 是否等于 0　　C) 检查是否有排队的线程　　D) 直接加 state

7. 以下代码中,`countDown()` 没有放在 finally 中的隐患是什么?

```java
CountDownLatch latch = new CountDownLatch(5);
for (int i = 0; i < 5; i++) {
    executor.submit(() -> {
        doWork();           // 可能抛异常
        latch.countDown();  // ❌ 没放 finally
    });
}
latch.await(); // 主线程永久等
```

- A) latch 会自动检测异常并 countDown　　B) 如果 `doWork()` 抛异常,`countDown()` 不执行,latch 永远不会到零,主线程永久阻塞　　C) 编译器会警告,阻止编译　　D) `await()` 有内置超时,不会永久阻塞

8. `CyclicBarrier` 内部使用什么锁机制?
- A) CAS 自旋　　B) `ReentrantLock` + Condition(CyclicBarrier 内部有 `lock = new ReentrantLock()` 和 `trip = lock.newCondition()`)　　C) `synchronized`　　D) `StampedLock`

9. 以下关于 `Semaphore(1)` 和 `ReentrantLock` 的对比,哪项不正确?
- A) Semaphore(1) 可以实现互斥效果,类似于 lock　　B) Semaphore 的 release 可以由非获取线程执行(如线程 A acquire,线程 B release),而 lock 的 unlock 只能由持有锁的线程执行　　C) Semaphore(1) 是可重入的　　D) Semaphore 不支持 Condition

10. `await(long timeout, TimeUnit unit)` 在三个工具中的表现——哪个工具的超时后需要特别处理「部分线程超时导致计数器混乱」?
- A) CountDownLatch——超时后 latch 仍可能被其他线程 countDown 到零,但 await 已返回 false,不会影响计数　　B) CyclicBarrier——如果某个线程 await 超时抛出 TimeoutException,barrier 被标记为 broken,其他等待中的线程收到 BrokenBarrierException;如果不处理,barrier 处于损坏状态需重置　　C) Semaphore——超时后许可被永久扣减　　D) 三者都没有超时后的副作用

### 解答题(5 道)

1. 用「等待模式」的视角,区分 `CountDownLatch`、`CyclicBarrier`、`Semaphore` 三个工具的语义:各是谁等谁、等什么、一次还是反复?

2. 从 AQS 源码角度,解释为什么 `CountDownLatch` 用 `tryAcquireShared` 实现,而 `Semaphore` 也用 `tryAcquireShared`——两者在 state 语义上有什么不同?共享锁和独占锁的区别在代码中如何体现?

3. 你的咖啡站需要这样一个启动流程:① 磨豆机、蒸汽锅炉、收银台 3 个设备各自初始化(并行) ② 全部初始化完成后,吧台才能开始接单。同时还需要限流:最多 3 个咖啡师同时操作。请设计——要用 `CountDownLatch` + `Semaphore` 还是 `CyclicBarrier` 搭配什么?写出核心代码逻辑。

4. `CyclicBarrier` 的 `barrierAction` 和 broken 状态的深层问题:① 如果在 barrierAction 中抛异常,等待的线程会怎样?② 如果某线程 await 超时,其他线程会收到什么?③ 为什么 barrier broken 状态需要显式重置?给出一个场景:如果 broken 状态不处理,下次复用时有什么后果?

5. 从 AQS 的设计哲学出发,分析这三个工具如何用「对 state 的不同语义解释」实现三种完全不同的同步模式。再基于这个分析,判断:JDK 的 `Phaser` 为什么比 `CyclicBarrier` 更灵活?它本质上也是 AQS 吗?

> [!答案]
> **1-1** B(一次性——count 到 0 后 latch 的 AQS state 不可逆,无法重置。需要重用用 CyclicBarrier 或 Phaser)  
> **举一反三**:CountDownLatch 的名字已经暗示了——count down(倒计数),到了就锁死。AQS 的 `tryAcquireShared` 在 state==0 时返回正数,一旦 state 到 0,没有方法能把它改回正数。
>
> **1-2** B(先执行 barrierAction → 然后所有等待线程同时释放 → 计数恢复到 parties → 进入下一轮。「先 action 再释放」保证 action 在下一轮开始前执行)  
> **举一反三**:barrierAction 的典型用途——汇总上一轮的结果、打印检查点日志、重置共享状态。它在「所有线程都到达但还没释放」的时间点执行,所以能看到完整的一轮中间结果。
>
> **1-3** B(所有权无关——锁有持有者(owner)概念,谁 lock 谁 unlock;Semaphore 没有所有权,任何线程都可以 release,release 次数也不受 acquire 次数限制(你可以 release 10 次,即使只 acquire 过 3 次,多出的许可会扩大总容量))  
> **举一反三**:这是 Semaphore 最容易误用的点——release 无所有权检查,多 release 会「凭空造许可」。如果需要「谁 acquire 谁 release」的语义,用锁而不是 Semaphore。
>
> **1-4** B(Latch 是「一等多」——一个或多个线程等 N 个线程完成任务;Barrier 是「多等一」(互相等)——N 个线程各自执行到 barrier 点,等所有人都到齐再一起继续)  
> **举一反三**:简单记忆:Latch 是你等我(我等你们干完活),Barrier 是我们互相等(每个线程都等等彼此)。`join()` 是一种特殊的 Latch(等一线程)。
>
> **1-5** A(state==0 时 `tryAcquireShared` 返回正数,表示可以通行;state>0 返回 -1,表示还需要等待。AQS 的 acquireShared 检测到负数就 park 当前线程)  
> **举一反三**:AQS 的共享锁模板:`tryAcquireShared` 返回负→阻塞,返回非负→获取成功。CountDownLatch 的 `countDown()` 只是 `releaseShared(1)`——把 state 减 1,减到 0 唤醒所有等待者。
>
> **1-6** A(检查 state(许可数) > 0,是则 CAS 减 1 并返回剩余数;否则返回负数表示无许可。`acquire()` 失败则 park 等待,`release()` 则 CAS 加 state)  
> **举一反三**:Semaphore 和 CountDownLatch 都是 AQS 共享模式,核心区别在 state 语义:Latch 是「还剩多少没完成」(向下减),Semaphore 是「还有多少许可」(向上减)。
>
> **1-7** B(countDown 不执行 → latch 永远到不了零 → `await()` 永久阻塞。如果 await 没设超时,主线程挂掉)  
> **举一反三**:CountDownLatch 的第一纪律:`countDown()` 永远放 finally 里。如果你连有几个 countDown 都不确定,更应该用 `await(timeout)`——设置一个最大等待时间,超时就降级处理而不是死等。
>
> **1-8** B(CyclicBarrier 内部使用 `ReentrantLock` + Condition——`lock.lock()` 保护计数,`trip.await()` 让线程等待,最后一个线程 `trip.signalAll()` 唤醒全部。不是基于 AQS 的同步器,而是用 AQS 的锁来保护)  
> **举一反三**:区别:CountDownLatch 和 Semaphore 的直接父类是 AQS(自己就是同步器);CyclicBarrier 内部「包含」一个 ReentrantLock,用锁+Codition 实现,它是 AQS 的使用者而非子类。
>
> **1-9** C(Semaphore(1) **不可重入**——如果同一线程 acquire 两次,第二次会阻塞(因为许可已被自己用掉,只剩 0 个许可,第二次 acquire 需要等别人 release))  
> **举一反三**:互斥锁和二叉信号量的区别是经典的并发面试题。互斥锁(=可重入+owner 检查+不可跨线程 unlock),二叉信号量(=不可重入+无 owner+可跨线程 release)。选 Semaphore(1) 还是 ReentrantLock 取决于你需要可重入性和所有权语义。
>
> **1-10** B(CyclicBarrier 的 broken 是最危险的——某线程 await 超时/中断/异常,barrier 被标记为 broken,所有其他在 await 的线程立即收到 `BrokenBarrierException`,需要 `reset()` 恢复。如果不 reset,后续所有 `await()` 调用全部抛异常)  
> **举一反三**:CyclicBarrier 在生产中最容易翻车的就是 broken 状态没有正确处理。好的实践:① `await` 永远带超时 ② 捕获 BrokenBarrierException 后调用 `reset()` ③ 区分「本轮失败」(超时)和「底层故障」(barrier 损坏)。
>
> **2-1** CountDownLatch:主线程(们)等 N 个子线程完成「一件事」——等点:子线程 countDown 把计数器降到零。等一次。CyclicBarrier:N 个线程互相等,全部到达屏障点后一起释放——等点:最后一个到达者。可反复循环。Semaphore:不「等」——它控制同时做某事的线程数。acquire 拿不到许可就等(不限谁),release 还许可(不限谁)。等点:获取许可。没有「完成」概念,只有「目前容量」。  
> **举一反三**:三者的等待模式记忆法:Latch=「你们干完我上」,Barrier=「我们一起冲」,Semaphore=「限流,不准太多人同时上」。
>
> **2-2** 两者都用 AQS 共享模式的 `tryAcquireShared`,但 state 语义完全不同:CountDownLatch 的 state = 还需要 countDown 多少次。`tryAcquireShared` 的实现:`return (getState() == 0) ? 1 : -1;` → 只要 state 没到 0,所有 acquireShared 调用都阻塞。Semaphore 的 state = 当前剩余许可数。`tryAcquireShared` 的实现:`for (;;) { int avail = getState(); int rem = avail - acquires; if (rem < 0) return rem; if (CAS state from avail to rem) return rem; }` → 只要还有剩余许可,CAS 减掉并通;不够就阻塞。区别在代码:CountDownLatch 是「等 state 到 0 就放」,Semaphore 是「state 持续减加,每次减都要有剩余」。共享锁 vs 独占锁的区别:AQS 的 `acquireShared` 成功后可能连锁唤醒后续等待者(因为共享模式允许多个线程同时持有)——如 Semaphore 有 3 个许可,releaseShared 后可能唤醒 3 个等待者。独占锁一次只唤醒一个。  
> **举一反三**:AQS 的设计之美:同一套模板(acquireShared/releaseShared),只需改变 `tryAcquireShared` 中 state 的语义解释,就能产生完全不同的同步行为。这就是「框架」的力量——将不变的部分(排队、park/unpark)和变化的部分(state 语义)分离。
>
> **2-3** 设计:① 用 `CountDownLatch(3)`——3 个设备线程各自初始化,完成后 `latch.countDown()`。主线程 `latch.await()` 等到三个设备就绪后接单。② 用 `Semaphore(3)`——控制「最多 3 个咖啡师同时操作」这个限流:每个咖啡师任务执行前 `sem.acquire()`,执行后 `sem.release()`。
> ```java
> CountDownLatch ready = new CountDownLatch(3);
> Semaphore baristas = new Semaphore(3);
>
> // 设备初始化(3 个线程)
> init("磨豆机", ready); init("蒸汽锅炉", ready); init("收银台", ready);
>
> // 主线程:等全部就绪
> ready.await();
> System.out.println("所有设备就绪,开门接单!");
>
> // 接单后:咖啡师执行(不限线程数,但最多 3 个同时)
> void makeCoffee(Order order) {
>     baristas.acquire();
>     try { brew(order); }
>     finally { baristas.release(); }
> }
> ```
> 用 CountDownLatch(一次性)而不是 CyclicBarrier:因为设备初始化只做一次,不需要反复同步。CyclicBarrier 适合「多轮反复」场景——如每轮打包前统计数量,最后一轮收尾。这里只需要启动时等一次。  
> **举一反三**:选择 Latch vs Barrier 的决策:看「这件事要做几次」。一次→Latch,多次→Barrier 或 Phaser。
>
> **2-4** ① barrierAction 抛异常:异常会传播到**最后到达的那个线程**(执行 action 的线程),同时 barrier 被标记为 broken。其他等待线程立即收到 `BrokenBarrierException`,不再等待。② await 超时:超时的线程收到 `TimeoutException`,与此同时 barrier 被标记为 broken,其他等待线程收到 `BrokenBarrierException`。③ broken 状态不重置的后果:barrier 的 generation 损坏后,任何后续对 `await()` 的调用都会立即抛 `BrokenBarrierException`——即使所有线程都准备好了,barrier 也不会释放它们。需要显式 `reset()`——它创建新的 generation、重置 count。场景:第一轮计算中某个线程超时(网络调用超时),barrier 变 broken。如果没有 `reset()`,第二轮计算时第一个 `await()` 的线程直接抛 BrokenBarrierException,其他线程莫名其妙。正确做法:`try { barrier.await(5, SECONDS); } catch (TimeoutException | BrokenBarrierException e) { barrier.reset(); /* 通知其他线程终止本轮 */ }`  
> **举一反三**:barrier broken 是 CyclicBarrier 的「默认 fail-fast」设计——只要一个人掉队,全队停止。这要求使用者必须处理 two-phase:「正常完成」或「全队取消」。如果没有这个心理准备,线上会发生雪崩式的 BrokenBarrierException 风暴。
>
> **2-5** 三个工具的 state 语义:AQS state 是一个 `volatile int`。① CountDownLatch:state = 剩余未 countDown 次数。`countDown()` = `state--`;acquireShared 等 state==0。② Semaphore:state = 剩余许可数。`acquire()` = state--(如果 state>0);`release()` = state++。③ CyclicBarrier:不用 AQS 子类(而是内含 ReentrantLock),但可以类比——它也有一个 count 字段,每轮初始化为 parties,`await()` 时 count--,到 0 则执行 barrierAction 并 reset。三者本质全是「对同一计数器的不同操作规则」——Latch 只减不增,到 0 停止;Semaphore 可增可减,保持非负;Barrier 每次减到 0 后重置。`Phaser` 更灵活的原因:① 支持动态注册/注销 parties(到达时 register/deregister,不像 Barrier 固定 parties) ② 多阶段(Phase)自动推进,不需要手动 reset ③ 支持分层(树状 Phaser,减少协调开销) ④ 没有 broken 状态——某个线程异常不会拖垮整个 phaser。Phaser **不是** AQS——它使用的是基于 `AtomicReference` 的 Treiber 栈 + ForkJoinPool 的 ManagedBlocker,完全不同的实现路线。  
> **举一反三**:Phaser 取代 CyclicBarrier 的趋势在 JDK 7 就开始了——对于任何需要「动态参与方数量」或「多阶段迭代」的场景,Phaser 都更合适。Barrier 的优势仅限于「最简单的固定人数反复同步」场景,代码量比 Phaser 少。
---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
