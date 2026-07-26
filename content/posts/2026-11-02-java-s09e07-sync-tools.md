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

## 九、项目检查点 · 豆豆咖啡站(番外卷二 · 第 7 检)

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

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
