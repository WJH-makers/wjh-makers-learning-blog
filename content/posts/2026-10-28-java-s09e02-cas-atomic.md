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

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. CAS 操作依赖的三个要素是什么?
   - A) 内存地址、期望值、新值　　B) 内存值 V、期望值 E、新值 N　　C) 锁对象、线程 ID、时间戳　　D) 堆地址、栈地址、程序计数器

2. 在 x86 平台上,CAS 对应的底层指令是?
   - A) `test-and-set`　　B) `lock cmpxchg`　　C) `mfence`　　D) `lock xadd`

3. `AtomicInteger.incrementAndGet()` 内部,当 `compareAndSet` 失败后,下一次循环拿到的 expect 值来自哪里?
   - A) 从主内存重新读 `get()` 获取当前值　　B) 从失败时 `compareAndSet` 自动写入的寄存器读取　　C) 从 ThreadLocal 缓存中恢复上次的 expect　　D) 直接从上次 CAS 失败的返回码推算

4. 下列代码片段中,哪个在高并发下最典型地面临 ABA 问题?
   - A) `AtomicInteger` 做递增计数器　　B) `AtomicReference<Node>` 实现无锁栈 pop,Node 对象被 GC 回收后又恰被重新分配为同一引用值　　C) `LongAdder.increment()` 做 QPS 统计　　D) `AtomicBoolean.compareAndSet(false, true)` 做一次性开关

5. `LongAdder` 相比 `AtomicLong` 在高竞争下吞吐量显著更高的根本原因是?
   - A) 使用了更快的 CPU 指令集　　B) 内部用 `Cell[]` 数组将热点分散到多个内存位置,各线程落在不同 Cell 上独立 CAS,最后 sum 汇总　　C) 完全消除了 CAS 自旋,纯 wait-free 实现　　D) 用 `synchronized` 替代 CAS,减少了总线风暴

6. 对于以下哪个场景,`AtomicStampedReference` 是最适合的选择?
   - A) 统计 CDN 带宽使用量,允许 5 秒延迟　　B) 无锁栈的 pop 操作——需要保证「弹出节点 A→压入新节点 B→又压回 A」这种中间变化能被检测到　　C) 用 `AtomicLong` 做分布式 ID 生成器　　D) 用 `AtomicBoolean` 做集群选主标记

7. 下面关于 `AtomicInteger` 的使用,哪一段存在最典型的 check-then-act 竞态窗口?(多线程环境)
   - A) `atomic.getAndIncrement()`　　B) `if (atomic.get() > 0) { atomic.decrementAndGet(); }`　　C) `atomic.compareAndSet(5, 10)`　　D) `atomic.accumulateAndGet(3, Integer::sum)`

8. 关于 `LongAdder.sum()` 方法的正确描述是?
   - A) 调用时内部会加全局锁,返回值是调用瞬间的精确值　　B) 遍历 `Cell[]` 累加时不加锁,返回值是某个近似快照,因为其他线程可能同时在写入 Cell　　C) sum() 只能由创建 LongAdder 的线程调用　　D) sum() 返回的是最近一个完整秒内的聚合值

9. `AtomicInteger` 初始值为 0,线程 A 和 B 同时各执行一次 `getAndIncrement()`,以下哪组返回结果是不可能的?
   - A) A 得到 0,B 得到 1　　B) A 得到 1,B 得到 0　　C) A 得到 0,B 得到 0　　D) A 得到 0 和 B 得到 1 都是可能的,取决于调度

10. 某服务需要统计过去 60 秒的请求量以计算实时 QPS,极高并发(>10 万 TPS),误差允许 ±2%。从以下方案中选一个最优的:
   - A) `AtomicLong.incrementAndGet()` + 定时任务每分钟读一次　　B) `synchronized` 计数器 + 定时 reset　　C) `LongAdder.increment()` + 每秒 `sumThenReset()` 采样写入滑动窗口　　D) 每个线程维护自己的局部计数器,定时汇总到全局

### 解答题(5 道)

1. 用自己的话解释:CAS 中的 "Compare" 和 "Swap" 各做了什么,为什么一个 CPU 指令就能实现无锁的原子更新?

2. `AtomicInteger` 有 `getAndIncrement()` 和 `incrementAndGet()`,它们在底层 CAS 循环中分别返回什么值?两者的循环终止条件是否相同?

3. 某「秒杀已抢」计数器使用 `AtomicInteger`,大促 QPS 上到 5 万后 CPU 飙高、吞吐骤降。请分析根因,并说明为什么换 `LongAdder` 能改善——重点阐述 `Cell[]` 是如何「分散热点」的。

4. 假设你用 `AtomicReference<Node>` 实现了一个无锁栈:push 时 new Node,node.next=栈顶,CAS 更新栈顶;pop 时 CAS 把栈顶改为栈顶.next。请分析:若 Node 的内存被回收后又被新分配得到相同引用,会触发什么 Bug?它本质上属于哪类并发问题?`AtomicStampedReference` 为什么会是解药?

5. 你的项目需要以下三种计数器,请逐一选型(从 `AtomicInteger`/`LongAdder`/`AtomicBoolean`/`AtomicReference`/`AtomicStampedReference` 中选)并写出 1 句话选型理由:① 商品库存扣减,需要精确,并发量约每秒 500 次;② 全站请求 QPS 统计,并发量超 10 万 TPS,展示可用近似值;③「是否已预热」一次性开关。

> [!答案]
> **1-1** B(CAS 三要素:内存值 V、期望值 E、新值 N——Compare 比较 V 与 E,Swap 在 V==E 时把内存写为 N)  
> **举一反三**:把 CAS 理解为「带条件的 set」——不是「先读再改」,而是「读和改合并成一个原子操作」,这解释了为什么它能做无锁并发的基础件。
>
> **1-2** B(x86 上 `lock cmpxchg` 是 CAS 的直接指令映射,`lock` 前缀锁定总线/缓存行保证原子性)  
> **举一反三**:`lock cmpxchg` 不仅完成比较交换,还自带内存屏障效果——这也是为什么 `AtomicInteger` 的 get/set 天然具备类似 volatile 的可见性语义。
>
> **1-3** A(循环内 `do { v = get(); } while (!compareAndSet(v, v+1))`——每次 CAS 失败后用 `get()` 重新读取当前内存值作为新一轮 expect)  
> **举一反三**:看 OpenJDK 源码就会发现,循环体第一部分一定是 `get()` 拉取最新值,不是沿用上次的旧 expect。这保证了自旋总能基于最新状态重试。
>
> **1-4** B(无锁栈 pop 场景是 ABA 的教科书案例——引用值可能在「弹出去又被塞回来」之后重现,但中间发生过修改,单纯的引用等值判断无法察觉)  
> **举一反三**:ABA 的必要条件:① 值能「绕一圈回到原点」② 中间发生的操作是你关心的。递增计数器值只涨不跌,天然免疫 ABA;引用型数据结构(栈/队列/链表)在内存复用场景下最容易中招。
>
> **1-5** B(`Cell[]` 分散热点是 LongAdder 的核心设计——每个 Cell 独立做 CAS,线程通过 hash 落到不同 Cell,从「多对一」变成「多对多」,冲突率指数级下降)  
> **举一反三**:这个思想和 ConcurrentHashMap JDK7 的分段锁、以及 CPU 多级缓存的多 bank 设计同出一辙——「把全局热点拆成多个局部热点」是高性能系统设计的通用范式。
>
> **1-6** B(ABA 场景恰是 `AtomicStampedReference` 的唯一使命——在引用比较之外增加版本号比较,每次成功更新版本号+1)  
> **举一反三**:`AtomicMarkableReference` 是二元标记版本(比如「已逻辑删除」标记),不需要递增版本号的场景用它更轻量。选型口诀:需要检测「变过几次」用 Stamped,只需要知道「是否被改过」用 Markable。
>
> **1-7** B(`get()` 检查值和 `decrementAndGet()` 修改值之间是两步——如果有线程在这两步之间把值从 1 改成 0,递减就多执行了一次)  
> **举一反三**:这正是 #79 超卖事故的病根之一——原子类保证单个操作原子,但两个原子操作拼在一起,中间就有窗口。复合原子操作要么用 `compareAndSet` 循环,要么让锁罩住整个复合。
>
> **1-8** B(近似快照——`sum()` 遍历 `Cell[]` 不加锁,其他线程可能正在写某个 Cell,返回值不能视为瞬时精确值)  
> **举一反三**:`LongAdder` 的设计取舍:以精确性换吞吐。如果需要精确瞬时值,用 `AtomicLong`;如果需要高频累加后再清零,用 `sumThenReset()`;如果只关心趋势和量级,直接用 `sum()`。
>
> **1-9** C(A 得到 0,B 也得到 0 是不可能的——`getAndIncrement()` 保证每个返回值唯一递增)  
> **举一反三**:即使用 1000 个线程并发调 `getAndIncrement()`,返回的 1000 个值必然是 0 到 999 的一个排列。这是原子类的最根本保障:每个操作严格串行化,不丢不重。
>
> **1-10** C(`LongAdder` 分散写入 + 每秒 `sumThenReset()` 做滚动窗口聚合,是生产环境 QPS 统计的标准范式)  
> **举一反三**:该方案在 Netflix、阿里的实时监控中都有类似用法。要点:写入走 `LongAdder.increment()` (低延迟),读取走定时采样 (低频),读写分离互不干扰。
>
> **2-1** "Compare"是比较内存当前值 V 与期望值 E:若 V==E,说明从上次读到现在的期间内没有其他线程修改过这个位置;"Swap"是把新值 N 写入内存。整个比较+交换由一个 CPU 指令(`lock cmpxchg`)原子完成——硬件保证指令执行期间总线/缓存行被锁定,其他核心无法插入操作。它之所以叫「无锁」,是指没有操作系统级别的锁(不阻塞线程、不切换上下文),失败后由软件自旋重试,本质是一种乐观并发策略。  
> **举一反三**:用「便利贴改数字」类比:你看到门上贴的是 3,写一张「改成 5」的便利贴;但贴上去的瞬间如果门上还是 3 则换成功,如果已被改成 4 便利贴自动脱落,你再看一眼当前数字,重新写一张便利贴。
>
> **2-2** `getAndIncrement()` 返回旧值(自增前的值),底层: `do { v = get(); } while (!compareAndSet(v, v+1)); return v;`。`incrementAndGet()` 返回新值,底层: `do { v = get(); } while (!compareAndSet(v, v+1)); return v+1;`。两者循环终止条件完全相同——都是 `compareAndSet` 成功时跳出。区别仅在于最终 `return` 的表达式。  
> **举一反三**:两个方法生成的 CPU 指令几乎一样。面试常问场景选择——「先拿号再办事」(取号排队)用 `getAndIncrement`,「想知道当前是多少号」用 `incrementAndGet`。但也别忘了,最简单的 `getAndAdd` 可以一步到位传任意增量。
>
> **2-3** 根因:所有线程竞争同一个 `AtomicInteger` 底层的内存地址。每次 CAS 失败后自旋重试,在高并发下大量 CPU 周期消耗在空转上;同时缓存一致性协议(MESI)导致这个缓存行在多个 CPU 核之间反复传输(缓存乒乓/bus-snooping),内存总线成为瓶颈。`LongAdder` 的改善:内部维护一个 `Cell[]` 数组,每个 Cell 是一个独立的 `long` 值+CAS 操作。线程通过 `ThreadLocalRandom.getProbe()` 哈希到某个 Cell,修改只在局部 Cell 的缓存行上进行,不同线程大概率落到不同 Cell,不存在竞争。只有极少数冲突情况(两个线程哈希到同一 Cell)需要自旋。`sum()` 遍历所有 Cell 累加,不要求每次写入都全局可见。代价是 sum 返回值是近似快照,恰好满足「展示用计数器」对精度的宽松要求。  
> **举一反三**:这就是「分散热点,事后汇总」的思想——和 MapReduce、分库分表是同一个原理在不同层面的体现。关键判断:能不能接受最终一致性。
>
> **2-4** 场景:线程 A 读到栈顶 head=X,准备 CAS 改 head 为 X.next;在此期间:(a)线程 B pop 了 X,(b)线程 B 又 pop 了 Y,(c)线程 C 新 push 了一个节点 Z——但不幸 Z 刚好复用了 X 被 GC 回收后那块内存(引用值相同)。线程 A 执行 CAS:当前 head 引用==Z(地址碰巧等于旧 X 的地址),CAS「误以为」什么都没变,将 head 更新为 X.next(此时可能是无效指针)——造成链表断裂或丢数据。这本质是 ABA 问题:值回来了,但状态变了。`AtomicStampedReference` 的解法:每次 CAS 不仅比较引用值,还比较版本号(stamp)。每次成功的 CAS 都递增 stamp,即使引用值相同,版本号不同也会让 CAS 失败。  
> **举一反三**:ABA 的本质是「值相等 ≠ 状态未变」。数据库乐观锁的 version 字段、分布式系统的 vector clock、甚至 Git 的 commit hash,全都是在不同层面解决同一类问题:如何检测「中间发生过变化」。
>
> **2-5** ① 库存扣减:`AtomicInteger`——需要精确值,每秒 500 次并发属于中等竞争,CAS 自旋开销可接受,且配合 `compareAndSet` 循环可实现「检查库存>扣减」的复合原子操作。② QPS 统计:`LongAdder`——10 万 TPS 级别的高竞争写入,必须分散热点,近似值满足展示需求。③ 预热开关:`AtomicBoolean`——语义最清晰,`compareAndSet(false, true)` 天然是一次性开关,不需要版本号,也不存在 ABA 风险。  
> **举一反三**:计数器选型决策树——第一步「是否要求精确瞬时值」划定 AtomicLong vs LongAdder,第二步「是否有复合操作」决定是否配合锁或 CAS 循环,第三步「是否有回退/重复」判断是否需要 Stamped。三步走完,95% 的场景都能直接落子。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*