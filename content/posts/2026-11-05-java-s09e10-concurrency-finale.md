---
title: "《从零开始学 Java》79 · 并发终考:超卖事故复盘(番外卷二终)"
date: 2026-11-05
summary: "豆豆把椅子搬到角落:超卖事故,今天阿零独立复盘。五步排障挖出三层叠加病根,一次「修错了」的 volatile,一场 200 人齐射的并发终考——库存 -3 的账,今晚必须对上。"
tags: [Java, Java漫画, 并发, 超卖, 线程安全, 番外, 阿零与豆豆]
---

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

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
