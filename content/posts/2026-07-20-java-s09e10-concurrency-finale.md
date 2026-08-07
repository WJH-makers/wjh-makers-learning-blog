---
title: "《从零开始学 Java》79 · 并发终考:超卖事故复盘(番外卷二终)"
date: 2026-07-20
summary: "豆豆把椅子搬到角落:超卖事故,今天阿零独立复盘。五步排障挖出三层叠加病根,一次「修错了」的 volatile,一场 200 人齐射的并发终考——库存 -3 的账,今晚必须对上。"
tags: [Java, Java漫画, 并发, 超卖, 线程安全, 番外, 阿零与豆豆]
---

![Java漫画：s09e10-concurrency-finale](/comics/java/s09e10-concurrency-finale.png)

# 《从零开始学 Java》79 · 并发终考:超卖事故复盘(番外卷二终)

> 连载特刊 · 番外卷二「并发深水区」第 10 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——武器库配齐,豆豆当着监控大屏放话:#69 那晚的超卖,明天你独立复盘,我只旁观。

---

## 一、终考开考:一个人的复盘

冬歇特训最后一课。豆豆没有开讲,而是把椅子拖到角落,抱臂坐下:「事故是你的,复盘也是你的。全程,我只看。」

阿零重放 #69 验收夜的压测流量:100 件燕麦拿铁,卖出了 **103 单,库存被打成 -3**。JUnit 质检员把空白报告单推过来——这次,「证据呢?」三个字,要阿零自己写满。

---

## 二、漫画 · 深水区毕业考

> **〔1〕** 清晨,大屏定格在那晚的超卖曲线。豆豆坐在角落,全程一言不发;Race 双胞胎 Bug 怪趴在库存柜上,冲阿零挑衅地晃尾巴。
> 阿零(深呼吸):「今天没有救兵。五步法,开工。」

> **〔2〕** 重放流量,屏幕弹出 `stock = -3`。阿零没慌,把现象抄上白板:「-1、-2、-3,每次都不一样——是竞态,不是逻辑错。」
> JUnit 质检员递上报告单:「证据呢?」

> **〔3〕** 【特写格】阿零用马克笔在事故代码上画了三个圈:普通字段、锁外的 `if`、只罩半步的 `synchronized`。Race 双胞胎在三个圈里同时现形。
> 阿零:「不是一个 Bug,是三层病根叠着。」

> **〔4〕** 阿零把 `volatile` 拍上去,重跑——红灯依旧,`was: <102>`。角落里豆豆眉毛动了一下,仍没出声。
> 阿零(盯着屏幕):「……修错了。volatile 治『看不见』,治不了『两步棋』。」

> **〔5〕** 他把锁从半步挪到整个复合操作,200 人齐射,绿灯刷屏。Race 双胞胎被吸进测试报告,变成两行断言。
> 阿零:「1000 轮全绿。这才叫证据。」

> **〔6〕** 豆豆终于起身,在账本第二页盖下「清账」大印。
> 豆豆:「及格。不是因为你修对了——是你修错过一次,还知道错在哪。深水区,毕业。」

---

## 三、本话目标

- 独立走完五步排障法,从「库存 -3」挖出三层叠加病根;
- 用 CountDownLatch 齐射把事故钉成可复现的 JUnit 测试;
- 亲历一次「修错了」:volatile 为什么救不了超卖;
- 给出单机三套修复 + 多实例预告的分层防线,结清卷二总账。

---

## 四、五步排障:三层病根剖面

事故代码,就长在 v9 主干的扣库存上:

```java
class StockService {
    private int stock;                        // ① 普通字段:可见性缺失(#70)

    StockService(int init) { this.stock = init; }

    boolean tryDeduct() {
        if (stock > 0) {                      // ② 查:在锁外裸奔
            deduct();                         //    查和扣之间,门敞着(#74)
            return true;
        }
        return false;
    }

    private synchronized void deduct() {      // ③ 锁只罩住「扣」半步(#72)
        stock--;
    }

    int stock() { return stock; }
}
```

阿零的五步法记录——

1. **观察现象**:卖出 103、库存 -3;超卖恰好发生在库存见底的瞬间。
2. **收集报错**:齐射测试红灯,差值每轮不同(-1/-2/-3)——典型竞态。
3. **提出假设**:库存剩 1 时,多个线程同时通过了 `stock > 0`,再排队各扣一刀。
4. **改一个变量**:在查与扣之间插一行 `Thread.sleep(1)` 放大窗口——超卖从 3 飙到 40 多,假设坐实。
5. **重跑验证**:留给修复后的齐射测试。

-3 这笔账也能对上:库存剩 1 时,恰有 4 个线程同时通过 `stock > 0`,随后在 `deduct()` 门口排队各扣一刀——1 − 4 = −3。那把只罩半步的锁没有拦住任何人进门,只是安排了他们挨个动手的次序。

```text
一次超卖 = 三层病根叠加

第 1 层 可见性(#70):stock 普通字段,线程各看各的缓存,旧值满天飞
第 2 层 原子性(#74):if (stock > 0) 与 stock-- 是两步棋,check-then-act 非原子
第 3 层 锁粒度(#72):synchronized 只罩住 deduct() 半步,检查逃在锁外
                     —— 罩不住复合操作的锁,等于没锁
```

---

## 五、把事故钉进测试:200 人齐射

先让 Bug 可复现,再谈修——#76 的门闩加 #78 的虚拟线程执行器,学以致用:

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

class OversellTest {
    @Test
    void volley_of_200_never_oversells() throws Exception {
        var svc   = new StockService(100);       // 100 件库存
        int n     = 200;                         // 200 个顾客
        var ready = new CountDownLatch(n);
        var go    = new CountDownLatch(1);
        var done  = new CountDownLatch(n);
        var sold  = new AtomicInteger();
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < n; i++) pool.submit(() -> {
                ready.countDown();
                go.await();                      // 全员就位,等发令枪
                if (svc.tryDeduct()) sold.incrementAndGet();
                done.countDown();
                return null;
            });
            ready.await();
            go.countDown();                      // 齐射!
            done.await();
        }
        assertEquals(100, sold.get());           // 最多卖出 100 单
        assertEquals(0, svc.stock());            // 库存归零,不许是负数
    }
}
```

跑在事故代码上,红灯稳定复现:

```text
OversellTest > volley_of_200_never_oversells() FAILED
    org.opentest4j.AssertionFailedError: expected: <100> but was: <103>
        at OversellTest.volley_of_200_never_oversells(OversellTest.java:24)
```

---

## 六、第一次修复:修错了

阿零想起 #70:「可见性缺失?上 volatile!」

```java
private volatile int stock;   // ← 只补第 1 层,②③ 两层原封不动
```

---

## 七、读懂真实报错:红灯依旧

```text
OversellTest > volley_of_200_never_oversells() FAILED
    org.opentest4j.AssertionFailedError: expected: <100> but was: <102>
        at OversellTest.volley_of_200_never_oversells(OversellTest.java:24)
```

超卖从 3 变 2,但**还在超**。volatile 保证「写了别人立刻看得见」,可 `if (stock > 0)` 和 `stock--` 仍是两步棋:两个线程可以**同时**看见同一个新鲜的 `1`,然后一起动手。豆豆在 #70 就锐评过——「volatile 不是锁的平替」,今天阿零用一盏红灯把这句话焊进了脑子。

修错也有修错的价值:它排除了一层变量——现在可以确定,剩下的病根全在**原子性与锁粒度**,方向清楚了。

---

## 八、修对:一把锁罩住复合操作,分层设防

第一防线——把锁收窄到扣减方法,但必须**罩住整个「查+扣」**;锁自带 happens-before(#70),volatile 可以功成身退:

```java
class StockService {
    private int stock;

    StockService(int init) { this.stock = init; }

    synchronized boolean tryDeduct() {        // 查+扣,同一把锁下一气呵成
        if (stock > 0) { stock--; return true; }
        return false;
    }

    synchronized int stock() { return stock; }
}
```

重跑齐射:`sold = 100,stock = 0`,连跑 1000 轮全绿。`stock()` 读方法也进锁不是多此一举——读不加锁,就等于把第 1 层可见性病根又请了回来。防线还能按场景继续升级——

| 防线 | 写法要点 | 什么时候用 | 坑 |
|---|---|---|---|
| 单机 · 一把锁 | `synchronized` 罩住整个复合操作 | 单品类、竞争不激烈 | 只罩半步等于没罩;读方法也要进锁 |
| 单机 · 无锁 | `AtomicInteger` CAS 自旋:读旧值→判断→`compareAndSet`,失败重来(#71) | 热点竞争高、状态就一个数 | 高热点空转烧 CPU |
| 单机 · 整张菜单 | `stocks.computeIfPresent(name, (k, v) -> v > 0 ? v - 1 : v)`(#74) | 多品类各自扣减 | 容器安全 ≠ 复合安全,必须走 compute 家族 |
| 多实例 | 数据库乐观锁 / 分布式锁(回看 #48) | 咖啡站开分店、服务多副本 | 单机锁出不了本 JVM,再对也白搭 |

> **🎯 面试直击**:库存超卖怎么防?
> 分层答:单机先保证「查+扣」原子——synchronized 罩全复合操作 / CAS 自旋 / CHM compute 家族;多实例时单机锁失效,上数据库乐观锁(`UPDATE ... SET stock = stock - 1 WHERE stock > 0` 或版本号)或分布式锁,数据库约束做终极兜底。追问点:volatile 能防吗?不能——它只管可见性,合不拢两步棋。

---

## 九、卷二总账:十话知识大表 · 项目检查点

| 话数 | 知识点 | 一句话本质 |
|---|---|---|
| #70 | JMM 与 volatile | 可见性 + 禁重排,不保证原子性;顺序只信 happens-before |
| #71 | CAS 与原子类 | 期望值对得上才写,失败自旋;热点计数交给 LongAdder 分散 |
| #72 | synchronized 内幕 | 锁的是对象不是代码;现代路径:无锁→轻量级(CAS)→重量级 |
| #73 | AQS 与显式锁 | state + FIFO 队列 + park/unpark;unlock 必进 finally |
| #74 | ConcurrentHashMap | CAS 放桶头 + 桶头 synchronized;复合操作用 compute 家族 |
| #75 | ThreadLocal | 一线程一副本;线程池里用完必 remove,否则泄漏 |
| #76 | 并发工具箱 | Latch 一次性门闩 / Barrier 可重用栅栏 / Semaphore 许可池 |
| #77 | CompletableFuture | 可组合的异步;IO 密集必自带线程池,别占公共池 |
| #78 | 虚拟线程 | 阻塞即卸载;一任务一虚拟线程,别池化 |
| #79 | 超卖复盘 | 并发事故 = 可见性 + 原子性 + 锁粒度叠加,防线要分层 |

```text
咖啡站形态:并发加固 v9.10 —— 番外卷二《并发深水区》十话结课
已具备  :扣库存复合操作原子化(锁罩全 / CAS / compute 三套单机方案)
          200 人齐射并发测试进回归;可见性、锁、容器、工具箱、异步、虚拟线程全线讲透
还没有  :多实例部署下的库存一致(单机锁出不了本 JVM,回看 #48);
          synchronized 底下 JVM 到底干了什么、GC 与 Spring 的底舱 —— 账本最后一页
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 独立完成事故复盘:现象→根因→分层修复→回归 | 「讲一次你排查过的线上问题」的满分模板 |
| 防超卖分层方案(锁 / CAS / compute / 分布式) | 电商、交易类岗位必问场景题 |
| 并发测试:CountDownLatch 齐射 + 虚拟线程压测 | 「怎么证明代码线程安全」的硬证据 |

---

## 十一、卷二完 · 账本翻到最后一页

考试通过当晚,打烊。阿零把修好的 `StockService` 又读了一遍,目光停在 `synchronized` 三个字上,忽然发起呆:这把锁,JVM 城主到底是怎么落的闩?还有 GC 清洁队的调度、Spring 管家的魔法……「我会用它们了,可它们的**引擎室**里到底长什么样?」

豆豆没接话,只是把技术债账本翻到最后一页。「引擎室」三个字下面,压着一整排门:反射、类加载、字节码、GC、索引、事务、缓存、Bean……他把今天那份复盘报告收进档案,补上全场唯一一次点评:「这份报告留着。下次再有人超卖,**你就是别人的豆豆**。」

> 番外卷三《引擎室》:第一站,给程序一面镜子——反射。JUnit 怎么找到你的 @Test?Spring 管家怎么凭空造出 Bean?钥匙,就是那枚 Class 对象。

**——番外卷二《并发深水区》完 · 特训继续——**

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. 超卖事故的「三层病根」是什么?
   - A) 死锁、活锁、饥饿　　B) 可见性缺失(普通字段)、原子性缺失(check-then-act 非原子)、锁粒度不足(synchronized 只罩半步)　　C) CPU 缓存、指令重排、内存屏障　　D) 线程池耗尽、连接池耗尽、内存溢出

2. 在 #79 的「五步排障法」中,第四步「改一个变量」的目的是什么?
   - A) 修好 Bug　　B) 验证第三步的假设——通过放大竞态窗口(如加 sleep)观察超卖是否加剧,从而确认「这就是根因」　　C) 优化性能　　D) 简化代码结构

3. 为什么 `volatile` 没能修好超卖?
   - A) volatile 有 bug,不能用在库存场景　　B) volatile 只保证可见性(修改后其他线程立即可见),不保证原子性——`if (stock > 0)` 和 `stock--` 是两步操作,volatile 不能阻止两个线程同时读到一个「新鲜 1」然后各自减一次　　C) volatile 需要配合synchronized 使用　　D) volatile 只在单线程环境工作

4. #79 的齐射测试中,`CountDownLatch` 作为「发令枪」的作用是?
   - A) 限制并发数　　B) 让 200 个线程在同一时间点同时出发——`ready.await()` 等全员就位,`go.countDown()` 发令,最大化竞态窗口,让 Bug 稳定复现　　C) 统计成功数　　D) 防止线程泄漏

5. 修复超卖的正确方案——「synchronized 罩住整个复合操作」解决了第几层病根?
   - A) 只解决第 1 层(可见性)　　B) 同时解决第 2 层(原子性)和第 3 层(锁粒度不足)——`synchronized boolean tryDeduct()` 把查和扣放在同一把锁下,且锁的 happens-before 保证了可见性(第 1 层也间接解决)　　C) 只解决第 3 层　　D) 只解决第 2 层

6. 以下哪种修复方案能解决超卖,但性能在高竞争下最差?
   - A) `AtomicInteger.decrementAndGet()` + 检查值是否≥0　　B) `synchronized` 方法罩住整个复合操作　　C) `map.computeIfPresent(key, (k, v) -> v > 0 ? v - 1 : v)`　　D) CAS 自旋:循环 `while (true) { int cur = stock.get(); if (cur <= 0) return false; if (stock.compareAndSet(cur, cur-1)) return true; }`

7. `volatile` 在 #79 中「修错」了,但它对下面哪个场景是正确的选择?
   - A) 库存扣减(需要原子复合操作)　　B) 停止标志位——`volatile boolean running = true; while (running) { doWork(); }` 在多线程环境下,其他线程 `running = false` 后工作线程能立即看到　　C) 计数器增 1　　D) 多个字段组成的不变式

8. 分层防超卖方案中,为什么「分布式锁」是「单机锁出不了本 JVM」的补救?
   - A) 分布式锁比单机锁快　　B) 单机 `synchronized` 或 `ReentrantLock` 只能保护一个 JVM 内的线程互斥——如果服务部署了 3 个副本(3 个 JVM),每个副本的锁独立的,互不感知,无法阻止跨副本的并发扣减。分布式锁(如 Redis `RLock`/数据库乐观锁)在所有 JVM 之间协调互斥　　C) 分布式锁不需要网络通信　　D) 单机锁有 bug,分布式锁没有

9. #79 的 `assertEquals(0, svc.stock())` 断言在 `synchronized` 修复后能通过,但有一个前提是 `stock()` 也必须加锁——为什么?
   - A) 为了代码对齐风格统一　　B) 如果不加锁,`stock()` 读到的值可能不是最新的(synchronized 加的锁是互斥锁,解锁时将修改刷回主内存;读不加锁没有 happens-before,可能读到过期的缓存值)　　C) `stock()` 加锁后更快　　D) 编译器要求 getter 必须与 setter 的同步级别一致

10. 200 人齐射测试中,用 `AtomicInteger sold` 记录成功卖出数——如果 `sold` 是普通 `int`,`assertEquals(100, sold)` 可能失败,为什么?
   - A) 普通 int 在多线程自增时会出现 「丢失更新」——线程 A 读到 sold=0,线程 B 也读到 sold=0,两者都写回 1,两次自增只加了 1　　B) 普通 int 自增是原子的　　C) 普通 int 会变负数　　D) 这是 JUnit 的 bug

### 解答题(5 道)

1. 用自己的话复述 #79 的五步排障法:每一步的名字和它在超卖复盘中的实际操作。

2. 「stock 从普通的 int 变成 volatile int 后,超卖从 -3 变 -2」——这个改善说明 volatile 确实起了作用,但为什么还不够?从可见性和原子性的区别,说明 volatile 能管什么、管不了什么。

3. 给出三个单机修复超卖的方案(锁/CAS/compute),并对比它们的适用场景:①竞争低 ②竞争高 ③CPU 敏感。

4. 你的同事写出以下「防超卖」代码,说「用了 AtomicInteger 就是线程安全的」:
```java
AtomicInteger stock = new AtomicInteger(100);
boolean tryBuy() {
    if (stock.get() > 0) {   // 第①步
        stock.decrementAndGet(); // 第②步
        return true;
    }
    return false;
}
```
这段代码一定线程安全吗?请用具体的线程执行序列说明可能的错误,并给出 CAS 自旋的修复写法。

5. 综合设计:你的咖啡站在 #79 结课后从单机升级到多实例(3 副本)。请设计一套库存扣减的「防线体系」——从客户端请求到最终数据库写入,至少包含三层防线,每层的职责、使用的技术、以及「万一这一层漏了,下一层怎么兜底」。画出防线的纵向剖面图(文字描述即可)。

> [!答案]
> **1-1** B(三层叠加:①可见性——stock 普通字段,线程各看自己缓存中的旧值;②原子性——查与扣分两步,中间可以被插入;③锁粒度——synchronized 只罩住扣,查(if)在锁外)  
> **举一反三**:超卖事故的本质公式——超卖 = 可见性缺失 × 原子性缺失 × 锁粒度不足。三个因素叠在一起,每一个单独看都不是致命的,但三者相乘就是生产事故。
>
> **1-2** B(改一个变量是为了验证假设——通过放大竞态窗口确认观察到的现象是否有因果关系。在查和扣之间插入 sleep 后超卖从 3 飙到 40+,证明「检查到扣减之间的窗口」就是问题所在,假设成立)  
> **举一反三**:这一步是五步法中区分「真根因」和「现象伴随」的关键——如果改了变量后问题没加剧,说明假设方向错了,需要返回第三步提新假设。这就是科学方法论:假设→实验→验证/推翻。
>
> **1-3** B(volatile 只保证可见性,不保证原子性——两个线程可以同时读到 stock=1,CAS 各自减 1,stock 变 -1)  
> **举一反三**:volatile 的适用场景口诀:一写多读、标志位、DCL 安全。任何涉及「读后写」的复合操作(计数器、库存扣减、if-then-modify)都必须用锁或 CAS。
>
> **1-4** B(CountDownLatch 双闩法:先 `ready.await()` 等所有线程到达起跑线,再 `go.countDown()` 发令枪齐射,使竞态窗口最大化。这比随机调度更容易暴露竞态条件)  
> **举一反三**:并发测试的三个要点:① 发令枪(让所有线程同时出发)② 放大窗口(如 yield、sleep)③ 重复运行(至少 1000 轮)。缺任何一个都可能是「假性通过」。
>
> **1-5** B(锁罩全——synchronized 在方法上:同一时刻只有一个线程进入 tryDeduct,查和扣在锁保护下一气呵成,解决了第 2、3 层;且锁的 happens-before(unlock→后续 lock)保证可见性,变相解决了第 1 层)  
> **举一反三**:synchronized 的锁之所以「顺便」解决了可见性,是因为 JMM 规定:一个线程释放锁(unlock)前所有的写,对后续获取同一把锁(lock)的线程可见。所以在锁中的修改变成「自动同步」的,不需要 volatile。
>
> **1-6** B(synchronized 方法在高竞争下最差——因为所有线程串行化,锁竞争导致线程阻塞和上下文切换。CAS 自旋方案(D)在低竞争时最优,高竞争时空转消耗 CPU 但不会阻塞;AtomicInteger 方案(A)需要额外循环检测;compute 方案(C)基于 CHM 桶锁,适合多品类各自扣减)  
> **举一反三**:性能排序:低竞争时 CAS(无上下文切换)→ CHM compute(桶级锁)→ synchronized(方法级互斥)。高竞争时 CHM compute(桶分散)→ CAS(空转浪费 CPU)→ synchronized(大量线程阻塞)。选型需结合并发度和等待时间。
>
> **1-7** B(停止标志位——volatile 的正确场景:一个线程写、多个线程读。写线程修改 running=false,所有读线程立即可见,退出循环)  
> **举一反三**:volatile 的正确使用判断:① 写不依赖当前值(写是 set,不读当前值)② 单线程写(或只写不读)③ 只用于标志或状态枚举。一旦满足「读-改-写」模式,必须用锁或 CAS。
>
> **1-8** B(单机锁的边界是 JVM——每个 JVM 有独立的锁和内存空间,三个副本 = 三组独立的 synchronized 锁。跨 JVM 的协调需要分布式组件:Redis 锁(Redisson)、ZooKeeper 临时顺序节点、数据库乐观锁等)  
> **举一反三**:分层防线的原理——第一层本地锁(快但范围小),第二层分布式锁(慢但范围大),第三层数据库约束(最后兜底)——有点像瑞士奶酪模型:每层都有孔,但孔不对齐,风险就被挡住了。
>
> **1-9** B(读也需要 happens-before 保证——synchronized 的 happens-before 规则是「unlock → lock」。如果 stock() 不加锁,读线程和写线程之间没有 happens-before 链,读到的可能是过期值。即使库存已经被正确扣减,读出来的值可能是旧的)  
> **举一反三**:这是 「synchronized 读写方法都要加锁」这个原则的理论基础——写方法 unlock 和读方法的 lock 之间形成 happens-before,保证读能看到最新写。很多人只锁写不锁读,结果读到脏数据。
>
> **1-10** A(丢失更新——普通 int 的 ++ 操作不是原子的:读→加 1→写。两个线程读到相同的 sold=0,加 1 后都写回 1,两次自增只加了一次。用 AtomicInteger 或 volatile+锁能避免)  
> **举一反三**:这是最经典的竞态条件——丢失更新。表现出来的症状就是最终计数小于并发操作数。这也是所有计数器必须用原子类或锁的根本原因。
>
> **2-1** 五步:①观察现象——库存 -3,卖出 103 单,超卖发生在线程尾部(库存见底)。②收集报错——齐射测试红灯,差值每轮不同(-1/-2/-3),确认是竞态而非固定逻辑错。③提出假设——库存剩 1 时,多个线程同时通过「stock > 0」检查,再排队自减。④改一个变量——在检查与扣减之间插入 `Thread.sleep(1)`,超卖从 3 飙到 40+,证实「检查到扣减的窗口」是根因。⑤重跑验证——修复后跑 1000 轮齐射全绿,打上「清账」印。  
> **举一反三**:这五步构成一个思维闭环:现象驱动→假设检验→定量验证→持续回归。不需要任何工具,只需要清晰的推理链。这种结构化思维在面对无日志、无报错、无指标的生产灵异事件时,是唯一的武器。
>
> **2-2** volatile 起了作用:把可见性从「不定时」变成「实时」——修改 volatile 后,所有线程能立即看到最新 stock 值,超卖从 -3 改善到 -2。这说明 volatile 确实修复了第 1 层(可见性)——旧值导致的额外超卖被消除了。不够的原因:volatile 管的是「读」,管不了「读后写」。写一个 volatile 变量是原子的,但「读一个 volatile → 判断 → 写同一个 volatile」不是。两个线程可以同时读到 stock=1(都看到了最新值),各自判断 >0 为 true,然后在 `decrementAndGet()` 上互斥(这个方法是原子的),各自减一次——stock 变成 -1。volatile 能管的:标志位、配置的 final 字段声明(配合 final)、一写多读。管不了的:任何需要「根据当前值决定新值」的操作。  
> **举一反三**:volatile 的语义可以总结为——「读总能读到最新写的值,但写的时候不能基于这个读过的值」。它的原子性仅限于单次写,不扩展到读-改-写的序列。
>
> **2-3** 方案一(锁):`synchronized boolean tryBuy()`——整个方法互斥。适用:低竞争(锁持有时间短,阻塞时间可接受)、简单场景(不需要复杂的 CAS 逻辑)。方案二(CAS 自旋):`while (true) { int cur = stock.get(); if (cur <= 0) return false; if (stock.compareAndSet(cur, cur-1)) return true; }`——无锁竞争,失败重试。适用:高竞争(CAS 失败率高→CPU 空转小,比线程阻塞切换开销小)、库存变动的概率低(大部分 CAS 一次就成功)。方案三(CHM compute):`map.computeIfPresent(sku, (k, v) -> v > 0 ? v - 1 : v)`——桶级锁,比全局锁粒度细。适用:多品类各自扣减(每个品类落在不同桶)、竞争高但分散。选择矩阵:竞争低→方案一(最简);竞争高且单个品类→方案二(无上下文切换);竞争高且多品类各自扣减→方案三(桶分散)。CPU 敏感场景(软实时系统,不能忍受 CAS 空转)→方案一或方案三。  
> **举一反三**:「哪种方案最好」的答案永远是 depands——取决于竞争度(synchronized 阻塞 vs CAS 空转的取舍)、数据分布(单一热点 vs 多 key 分散)、代码复杂度(可读性 vs 极致性能)。成熟系统的选择往往是在性能和可维护性之间取平衡。
>
> **2-4** 不是线程安全的。执行序列:① 库存 = 1。② 线程 A 执行第①步:`stock.get() > 0` → true。③ 线程 B 执行第①步:`stock.get() > 0` → true。④ A 执行第②步:`decrementAndGet()` → stock 变为 0。⑤ B 执行第②步:`decrementAndGet()` → stock 变为 -1。结果:超卖 -1。CAS 自旋修复:
> ```java
> boolean tryBuy() {
>     while (true) {
>         int cur = stock.get();
>         if (cur <= 0) return false;                // 没货了,直接走
>         if (stock.compareAndSet(cur, cur - 1))     // CAS 原子减
>             return true;                           // 成功
>         // CAS 失败 → 其他人抢先改了,回到循环顶部重读重试
>     }
> }
> ```
> 原理:CAS 把「检查(cur<=0)」和「扣减(cur-1)」合并成一个原子指令——如果 cur 变了(被其他线程改了),CAS 失败,自动用新值重新判断。这就消除了 check-then-act 窗口。  
> **举一反三**:这个CAS 循环就是大多数无锁数据结构的基础——`do { expected = get(); next = compute(expected); } while (!compareAndSet(expected, next));`。三个步骤:读当前值→算出目标值→CAS 原子写。失败了就自动用新值重试,直到成功或条件不满足。
>
> **2-5** 三层防线体系(纵剖面):
> ```
> ┌─────────────────────────────────────────────┐
> │ 第一层:业务入口限流(Semaphore/令牌桶)       │
> │ 职责:控制进入扣减流程的请求总量             │
> │ 技术:Semaphore(100) / Sentinel 限流         │
> │ 兜底:即使这一层漏了,第二层能处理            │
> └──────────────┬──────────────────────────────┘
>                │ 通过限流的请求
> ┌──────────────▼───────────────────────────────┐
> │ 第二层:本地锁/CAS(单 JVM 互斥)               │
> │ 职责:保证单个 JVM 内查 + 扣原子              │
> │ 技术:synchronized 罩全/Atomic CAS 自旋       │
> │ 兜底:这一层只能管本 JVM,漏给第三层           │
> └──────────────┬───────────────────────────────┘
>                │ 本地互斥后的请求
> ┌──────────────▼──────────────────────────────────┐
> │ 第三层:分布式锁 + 数据库约束(跨 JVM + 最后防线) │
> │ 职责:跨 JVM 互斥 + 数据层面最终一致性           │
> │ 技术:Redis RLock + DB UPDATE WHERE stock>0      │
> │ 兜底:最终防线;这里再漏就没有救了                │
> └─────────────────────────────────────────────────┘
> ```
> 各层详细:
> - 第一层 (限流):`Semaphore(100)` 控制同一时刻最多 100 个请求进入下一层。超出的快速失败返回「系统繁忙」。兜底:即使限流失效流量汹涌,第二层仍有序处理。
> - 第二层 (本地锁):每个实例内部的复合操作原子化——`synchronized synchronizedDeduct()` 确保同一实例上查扣一气呵成。这层解决单实例内的竞态。兜底:本层锁不住跨实例的并发(3 个实例各有各的锁),所以扣减请求抵达数据库时可能仍有并发。
> - 第三层 (分布式 + DB):
>   a. 进入之前获取 Redis 分布式锁(`redisson.getLock("stock:sku123")`)。锁定 key 是 SKU 级别。获取失败(已被锁)则重试或降级。
>   b. 拿到分布式锁后在数据库执行:`UPDATE stock SET count = count - 1 WHERE sku = ? AND count > 0`。`WHERE count > 0` 是最后的数据库约束兜底——即使分布式锁失效了(Redis 故障、网络分区),数据库的 WHERE 条件也能在 SQL 层面拒绝超卖。`UPDATE` 返回 0(影响行数为 0)就说明超卖了,回滚事务。
>   兜底:如果这层全失效(Redis 锁失效 + 数据库主从延迟 + 分区),系统进入「不可用」状态——宁可少卖也不能超卖。
> 分层原则:就近处理(本 JVM 内最快)→跨实例协调(分布式锁)→数据层兜底(数据库约束)。每层设计时应假设「上层可能失效」,在失效路径上仍有防守。
> **举一反三**:这个三层的设计模式是生产环境的防超卖最佳实践——它不是「三层全开才安全」,而是「任何一层漏了,下一层能兜住」。这比「一个超级锁」更健壮,因为锁本身也有失败的可能。从成本上:第一层最便宜(纯内存),第二层次之(本 JVM),第三层最贵(网络 + DB I/O)——大多数请求在第一或第二层就被处理,只有极少数请求走到分布式锁,效率远比所有请求都走分布式锁高。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*
