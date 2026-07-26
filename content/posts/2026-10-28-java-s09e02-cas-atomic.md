---
title: "《从零开始学 Java》71 · 无锁计数:CAS 与原子家族"
date: 2026-10-28
summary: "压测二十万单,volatile 计数还是丢了几千笔:count++ 是三步棋,可见性罩不住原子性。CAS 一条硬件指令赌值未变、赌输自旋重试,AtomicLong 把账扶正;热点再升 LongAdder 分散记账,ABA 用版本戳锁死。"
tags: [Java, Java漫画, CAS, 原子类, LongAdder, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》71 · 无锁计数:CAS 与原子家族

> 连载特刊 · 番外卷二「并发深水区」第 2 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——volatile 请走了可见性幽灵,可销量计数 count++ 还在丢数:不加锁,能不能安全地加一?

---

## 一、事故:二十万单压测,账面少了几千笔

冬歇特训第二天。上一话给停机标志刷上 volatile,可见性幽灵当场退散——阿零信心大涨,顺手把销量计数也刷了一层:`volatile int count`。这回每次读到的都是最新值,账总不会错了吧?

豆豆翻开技术债账本第二页,面试官脸:「上一话你自己总结的:volatile 保可见、禁重排,**不保原子**。`count++` 丢不丢,压测说话。」二十万单打进去,账面只有十九万五千多;再跑一次,丢的数还不一样。

阿零不服:「读到的明明是最新值,加一写回去就一瞬间,怎么会丢?」豆豆:「就是那一瞬间——**读**和**写回**之间没有护栏,谁都能插队。」

---

## 二、漫画 · 柜台上的黄铜印章

> **〔1〕** 特训室里,#70 修好的停机开关闪着绿灯。阿零往销量计数牌上也刷了层 volatile 荧光漆,拍板:「可见性搞定,账稳了。」
> 豆豆(叼着豆子叉腰):「面试官第一问就在这儿等你:看见最新值 ≠ 改的时候没人插队。」

> **〔2〕** 压测开闸,Race 双胞胎同时扑向计数牌:两人都看到「100」,各自心算「101」,一前一后把牌子翻成 101。两杯咖啡,账上只多了一杯。
> 豆豆:「`count++` 是三步棋:读、加一、写回。任何两步之间,都塞得进另一个线程。」

> **〔3〕** JVM 城主领两人下到硬件柜台:一枚刻着 **cmpxchg** 的黄铜印章,规则牌写着——「报上你以为的旧值;柜台里真是它,当场换新;不是,原样退回。整套动作一口气完成,无人能插队。」
> 阿零:「这不就是……乐观地赌一把『没人动过』?」

> **〔4〕** 阿零盖章失败(别人抢先改了),被印章弹回,他重读一次新值、再盖,第二回成功。
> 豆豆:「这叫**自旋重试**:赌输了不睡觉,原地再来。`AtomicLong` 的 `incrementAndGet`,骨子里就是这个循环。」

> **〔5〕** 大促回放:一万只手同时怼向同一枚印章,只有一只盖上,其余全在空转冒烟。豆豆拉出一排小格子账本:「热点太挤就分桶记账——**LongAdder**,各记各的,要总数再 `sum()`。」
> 阿零:「可 sum 的瞬间还有人在记……」豆豆:「所以它给的是统计值,不是精确即时值。会取舍,才叫工程。」

---

## 三、本话目标

- 看穿 `count++` 的三步真面目,解释 volatile 为什么罩不住它;
- 掌握 CAS 三要素(内存值/期望值/新值)与自旋重试,读懂 AtomicLong 的无锁加一;
- 用对 AtomicInteger / AtomicLong / AtomicReference,并给 ABA 幽灵配上版本戳;
- 把热点计数从 AtomicLong 升级为 LongAdder,说清它拿什么换了什么;
- 建立计数器选型直觉:synchronized、原子类、LongAdder 各守哪块地。

---

## 四、原理图:一条硬件指令的赌局

```text
count++ 的真面目(三步,步与步之间随时被插队):
  ① 读 count → ② 算 count+1 → ③ 写回

CAS(Compare-And-Swap)三要素:内存值 V · 期望值 E · 新值 N
  一条硬件指令(x86 的 lock cmpxchg)一口气完成:
    V == E ? 把 V 换成 N,返回成功 : 原样不动,返回失败(有人抢先改过)

自旋重试:失败 → 重新读 V → 再 CAS,直到成功
  锁    = 悲观:先排队再干活,拿不到就挂起线程
  CAS  = 乐观:先干活再验票,赌输不睡觉、原地重试

原子家族点将:
  AtomicInteger / AtomicLong    —— 数字的无锁加减
  AtomicReference<T>            —— 整个对象引用原子替换
  AtomicStampedReference<T>     —— 引用 + 版本戳,专治 ABA
  LongAdder                     —— base + cells[] 分散热点,sum() 汇总
```

> **豆豆旁白**:还有个省内存的偏门——`AtomicLongFieldUpdater` 能让已有类里的一个 volatile 字段直接获得 CAS 能力,百万级对象场景省掉一层 AtomicLong 包装,知道有这回事就行。

---

## 五、从上一话继续改代码:原子家族入列

在 #70 的工程旁加一间「原子工具房」,把家族逐个试用(钱一律 BigDecimal,#60 起的家规):

```java
import java.math.BigDecimal;
import java.util.concurrent.atomic.*;

public class AtomicFamilyTour {
    // AtomicLong.incrementAndGet 的直觉骨架:读 → CAS → 失败就重读再试
    static long spinIncrement(AtomicLong c) {
        long old;
        do { old = c.get(); } while (!c.compareAndSet(old, old + 1));
        return old + 1;
    }

    record PriceTable(BigDecimal latte, BigDecimal americano) {}

    public static void main(String[] args) {
        IO.println("自旋加一 → " + spinIncrement(new AtomicLong()));   // 1

        // AtomicReference:整张价目表原子换新(record 不可变,换引用即换版本)
        var prices = new AtomicReference<>(new PriceTable(
                new BigDecimal("18.00"), new BigDecimal("15.00")));
        var old = prices.get();
        prices.compareAndSet(old, new PriceTable(new BigDecimal("19.00"), old.americano()));
        IO.println("换表后 → " + prices.get());

        // ABA 现场:库存 10 → 卖出变 9 → 退款回 10;值一样,历史不一样
        var stock = new AtomicStampedReference<>(10, 0);   // 值 10,版本戳 0
        int[] stamp = new int[1];
        int seen = stock.get(stamp);                        // 读值,顺带读版本
        boolean ok = stock.compareAndSet(seen, seen - 1,    // 值、版本都对上才准换
                                         stamp[0], stamp[0] + 1);
        IO.println("带版本扣减 → " + ok + ",库存 " + stock.getReference());
    }
}
```

对纯计数,ABA 通常无害(10 就是 10);可一旦**值相等被当成「没发生过」的证据**——无锁栈的头节点被换下又换回、「库存没动过才对账」——就翻车。版本戳让历史留痕:值能回来,版本回不去。

> **🎯 面试直击**:什么是 ABA 问题?怎么解决?
> CAS 只比值:值从 A→B→A 后,CAS 误判「没人动过」照样成功,但历史已经发生(典型:无锁栈头节点)。解法:`AtomicStampedReference` 值+版本戳一起比,版本只增不回头;只关心「动没动过」可用 `AtomicMarkableReference`。追问点:计数场景 ABA 通常无害,**引用/链式结构**才致命。

---

## 六、故意制造一个 Bug:volatile 的 count++

阿零的原版计数板,原样上压测台:

```java
import java.util.concurrent.Executors;

class SalesBoard {
    private volatile int count = 0;   // 阿零:上一话的荧光漆,顺手也给它刷了
    void record() { count++; }        // ← 看着一行,其实三步
    int total()  { return count; }
}

public class StressDay {
    public static void main(String[] args) {
        var board = new SalesBoard();
        try (var pool = Executors.newFixedThreadPool(16)) {   // 线程池:回看第 38 话
            for (int i = 0; i < 200_000; i++) pool.execute(board::record);
        }   // 较新版本起 ExecutorService 可自动关闭:close() 会等全部任务跑完
        IO.println("期望 200000,实际 " + board.total());
    }
}
```

---

## 七、观察真实现象:每次丢的单都不一样

```text
期望 200000,实际 195804
期望 200000,实际 191263      ← 再跑一次,丢的数还不一样
```

不报错、不崩溃、静悄悄少账——这是并发 Bug 最阴的地方。时序还原:

```text
线程 A:读 count=100          线程 B:读 count=100
线程 A:算 101                 线程 B:算 101
线程 A:写回 101               线程 B:写回 101   ← 两次 ++,只涨了 1
```

JUnit 质检员(证据呢?)当场开单:

```text
SalesBoardTest > all_orders_counted() FAILED
    org.opentest4j.AssertionFailedError: expected: <200000> but was: <195804>
        at org.junit.jupiter.api.AssertionFailureBuilder.build(AssertionFailureBuilder.java:151)
        at org.junit.jupiter.api.AssertionFailureBuilder.buildAndThrow(AssertionFailureBuilder.java:132)
        at org.junit.jupiter.api.AssertEquals.failNotEqual(AssertEquals.java:197)
        at SalesBoardTest.all_orders_counted(SalesBoardTest.java:15)
```

---

## 八、修复并用测试证明;热点再升一级

第一步:把「读-改-写三步」换成 CAS 一步到位——

```java
import java.util.concurrent.atomic.AtomicLong;

class SalesBoard {
    private final AtomicLong count = new AtomicLong();
    void record() { count.incrementAndGet(); }   // CAS 自旋,插队者一律重试
    long total()  { return count.get(); }
}
```

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import java.util.concurrent.Executors;

class SalesBoardTest {
    @Test
    void all_orders_counted() {
        var board = new SalesBoard();
        try (var pool = Executors.newFixedThreadPool(16)) {
            for (int i = 0; i < 200_000; i++) pool.execute(board::record);
        }
        assertEquals(200_000, board.total());   // ✅ 分毫不差
    }
}
```

第二步:大促级热点回放时,监控里 CPU 居高不下——几十条线程挤同一个 AtomicLong,CAS 大量赌输空转。升级 LongAdder,把一个热点拆成一排格子:

```java
import java.util.concurrent.atomic.LongAdder;

class HotSalesBoard {
    private final LongAdder count = new LongAdder();
    void record() { count.increment(); }   // 各线程记自己的格子,几乎不撞车
    long total()  { return count.sum(); }  // base + 所有格子求和:统计值,非瞬时精确
}
```

> **🔀 豆豆的多解台 · 并发计数器,三把兵器怎么选?**

| 解法 | 代码要点 | 适合什么时候 | 坑 |
|---|---|---|---|
| `synchronized` | `synchronized void record() { count++; }` | 加一之外还要连带改别的状态;或并发本来就低 | 热点下线程排队挂起,吞吐垫底 |
| `AtomicLong` | `count.incrementAndGet()` | 中低竞争,且每次要拿**精确当前值**(取号、限流水位) | 高并发热点上 CAS 空转,CPU 白烧 |
| `LongAdder` | `increment()` 记账,`sum()` 汇总 | 高并发**统计型**计数:销量、QPS,写多读少 | `sum()` 非原子快照,别当精确即时值;也不能 CAS 到指定值 |

豆豆锐评:统计用 **LongAdder**,要精确即时值用 **AtomicLong**,牵连其他状态才请 synchronized——先问需求,再选兵器。

---

## 九、项目检查点 · 豆豆咖啡站 v9.2

```text
咖啡站形态:并发加固 v9.2 —— 销量计数无锁化
已具备  :压测 20 万单分毫不差;CAS+自旋直觉;价目表原子换新;ABA 有版本戳;热点计数 LongAdder 分散
还没有  :「查库存再扣库存」是两步棋,原子类罩不住 —— 得回头掀 synchronized 这把老锁的底
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| CAS 三要素 / 自旋 / cmpxchg 直觉 | 「熟悉 JUC」的第一道门槛,原理几乎必问 |
| AtomicLong / AtomicReference / AtomicStampedReference | 无锁编程基本功;ABA 是高频追问点 |
| LongAdder 分散热点 | 高并发统计场景选型题,答出「牺牲精确即时性」是加分项 |

---

## 十一、下一话悬念

阿零盯着下一张压测单发愁:扣库存是「先查再扣」两步棋,原子类只能保住其中一步,两步之间照样有人插队。豆豆合上账本:「单个数字的仗打完了。两步要连成一手,还得请老将出山——但这回,你得知道它盔甲底下是什么。」

> 下一话《synchronized 内幕与锁升级兴衰》:锁的从来不是代码,是**对象**——对象头里的 Mark Word 藏着锁的全部秘密;八股背熟的「偏向锁」,在现代 JDK 里已经进了博物馆。阿零还会用两个看似无关的锁对象,锁出一场诡异的连环卡顿。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
