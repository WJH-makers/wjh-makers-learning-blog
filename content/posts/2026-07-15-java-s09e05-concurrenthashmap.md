---
title: "《从零开始学 Java》74 · 并发菜单:ConcurrentHashMap"
date: 2026-07-15
summary: "双十一的监控回放里,菜单上的限定特调无声消失——HashMap 并发写丢键,不报错不留痕。换装 ConcurrentHashMap 后阿零双保险齐上,销量榜却还是少了几十单:线程安全容器,为什么防不住他那句 containsKey?"
tags: [Java, Java漫画, ConcurrentHashMap, 并发容器, HashMap, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》74 · 并发菜单:ConcurrentHashMap

> 连载特刊 · 番外卷二「并发深水区」第 5 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——显式锁讲透了,可豆豆一翻账本:整张菜单还是第 22 话那只 HashMap,在并发写面前一直在裸奔。

---

## 一、事故:菜单墙的无声失窃

冬歇特训第五夜。锁的内脏刚拆完(回看第 73 话),豆豆把双十一的监控回放拍在桌上:大促当晚运营上了三款限定特调,菜单上却只查得到两款——**没有异常,没有日志,键就是不见了**。

阿零:「HashMap 丢东西?它敢?」

豆豆(面试官脸):「第 22 话只讲了它单线程多能打,没讲它在并发写面前什么德行。今晚三件事:**看清病根、给菜单换装、再看你踩一个新坑**。」

---

## 二、漫画 · 从一把大锁到一枚别针

> **〔1〕** 监控回放:Race 双胞胎同时往菜单墙**同一个桶**里挂纸条,各自把链尾接到自己那张上;哥哥那张无声飘落,没人回头。
> 豆豆:「两个线程同桶尾插,彼此看不见对方刚接的节点,后写的把前写的整段覆盖——键就这么没了。早年头插法扩容还会拉成环形死循环,现代 JDK 改了尾插,不再死环,**但照样丢**。」

> **〔2〕** 阿零掏出昨晚的 ReentrantLock 要给整面菜单墙上锁,被豆豆按住手。旁边「Hashtable 老掌柜」的铺子全店一把大锁,门口读的写的排成长龙。
> 豆豆:「`Hashtable` 和 `Collections.synchronizedMap` 就是这么慢死的:读也排队,写也排队。锁要**细**,不是要多。」

> **〔3〕** JVM 城主领两人参观并发菜单墙一代目:仓库被隔成 16 个隔间,每个隔间门口各挂一把锁。
> JVM 城主:「JDK 7 的 ConcurrentHashMap——**分段锁 Segment**,每段其实就是一把 ReentrantLock(上一话的老朋友)看守一小张表。十六个隔间互不打扰,并发度=段数。」

> **〔4〕** 二代目:隔间墙全拆了,锁缩小成钉在**每个桶头**上的一枚小别针;空桶前,线程「啪」地一贴即走。
> JVM 城主:「JDK 8 起推倒重造:空桶用 **CAS** 直接放(回看第 71 话),撞车了才对**那一个桶头** synchronized;链表过长照样树化成红黑树(回看第 22 话)。锁从『一段』细到『一个桶』。」

> **〔5〕** 阿零找「总销量计数器」,却看见每个收银台各记各的小账本,汇总员要总数时才挨个抄。
> 豆豆:「全员挤一个计数器,CAS 能打出火星子。所以它的 size 用**分散计数**:baseCount 加一排 CounterCell 各记各的,取值再求和——LongAdder 的思路。」

> **〔6〕** 阿零盘点到一半,有人往墙上挂新品。他抱头等雷——盘点单却平静写完,只是没有最新那款。
> 豆豆:「**弱一致迭代器**:遍历时允许别人改,不抛 ConcurrentModificationException;代价是你看到的未必是最新全貌。并发世界,一致性和吵架总得选一个。」

---

## 三、本话目标

- 复现 HashMap 并发丢数,说清病根「同桶尾插相互覆盖」;
- 给菜单换装 ConcurrentHashMap,讲透 JDK 7 分段锁 → JDK 8 CAS+桶头锁+红黑树 的演进;
- 说清 size 分散计数与弱一致迭代器;
- 记住「线程安全容器 ≠ 复合操作安全」,用 putIfAbsent / computeIfAbsent / merge 补原子性;
- CopyOnWriteArrayList 读多写少,点到即止。

---

## 四、原理图:一张写入路线图

```text
ConcurrentHashMap(JDK 8 起)put(key, value):
  ├─ 桶是空的        → CAS 把新节点放进桶头(乐观,不加锁)
  ├─ 桶非空/CAS 失败 → synchronized (桶头节点) { 链表尾插 或 红黑树插入 }
  └─ 正在扩容        → 顺手帮忙搬桶,搬完再插

读取:get 全程不加锁 —— 桶数组与节点的 value/next 都按 volatile 语义读(回看第 70 话),
      写线程的最新值对读线程可见,这正是它读性能碾压「全店一把锁」的底气
计数:baseCount + CounterCell[] 分散记账,size() 时求和(LongAdder 思想)
遍历:弱一致迭代器 —— 不抛 CME,反映的是遍历前后某个一致的片段
禁忌:key 和 value 都不许 null(HashMap 允许,这是两套规矩)
```

---

## 五、从上一话继续改代码:菜单换装

上一话给「查库存+扣库存」包上了 lock / finally-unlock,那层不动;今天动的是另一层——第 22 话那只 `HashMap` 菜单。先做对照实验,眼见为实:

```java
void main() throws InterruptedException {                 // MenuCrash.java(紧凑源文件)
    var plain = new java.util.HashMap<String, Integer>();
    Runnable half = () -> {
        var who = Thread.currentThread().getName();
        for (int i = 0; i < 50_000; i++) plain.put(who + "-" + i, i);
    };
    var a = new Thread(half, "A");  var b = new Thread(half, "B");
    a.start(); b.start(); a.join(); b.join();
    IO.println("期望 100000,实际 " + plain.size());
}
```

```text
期望 100000,实际 99961      ← 每次丢的数目都不同,偶尔还全对——这才吓人
```

十万个**互不相同**的键,凭空少几十个。换 `ConcurrentHashMap`,一个不丢:

```java
import java.math.BigDecimal;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

record Coffee(String name, BigDecimal price, int stock) {}   // 第 60 话起,价格一律 BigDecimal

class Menu {
    private final ConcurrentMap<String, Coffee> items = new ConcurrentHashMap<>();

    void putOnShelf(Coffee c) { items.put(c.name(), c); }
    Coffee find(String name)  { return items.get(name); }
    Iterable<String> names()  { return items.keySet(); }     // 弱一致:边盘点边上新,不炸
}
```

顺带一提:老菜单要是**边遍历边改**,连单线程都当场翻脸——这是真跑得出来的:

```text
Exception in thread "stocktake" java.util.ConcurrentModificationException
	at java.base/java.util.HashMap$HashIterator.nextNode(HashMap.java:1605)
	at java.base/java.util.HashMap$KeyIterator.next(HashMap.java:1628)
	at Stocktake.main(Stocktake.java:12)
```

这就是两种脾气:HashMap 的迭代器是 **fail-fast**——发现结构被改,宁可当场掀桌抛异常也不给你脏数据;ConcurrentHashMap 的迭代器是**弱一致**——照单继续走,允许你看到的是「稍旧但自洽」的片段。前者适合单线程早暴露问题,后者才是并发场里的生存之道。

> **豆豆旁白**:List 也有并发款——`CopyOnWriteArrayList`:每次写都复制整个底层数组,读永远无锁。适合「读一万次、写一次」的名单类场景(监听器、黑名单);写频繁就是灾难。一笔带过,遇到再说。

---

## 六、故意制造一个 Bug:双保险的销量榜

阿零给销量榜上双保险:并发容器 + 原子计数器(回看第 71 话),写完还得意地念了一遍:

```java
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicInteger;

class SalesBoard {
    private final ConcurrentMap<String, AtomicInteger> sales = new ConcurrentHashMap<>();

    void record(String name) {
        if (!sales.containsKey(name)) {               // 先检查……
            sales.put(name, new AtomicInteger());     // ……再动手(check-then-act)
        }
        sales.get(name).incrementAndGet();
    }

    int total() { return sales.values().stream().mapToInt(AtomicInteger::get).sum(); }
}
```

阿零:「容器线程安全,计数器原子,这榜焊死了。」

---

## 七、观察真实现象:又是无声的少

100 线程 × 1000 单压上去:

```text
下单总数 = 100000
榜上总数 = 99978          ← 不报错、不打日志,又静默少了一截
```

时间线一摆,缝隙现形:

```text
线程 A:containsKey("拿铁") → false
线程 B:containsKey("拿铁") → false      ← 也没看见
线程 A:put("拿铁", 计数器α);α 上连记 17 单
线程 B:put("拿铁", 计数器β)             ← β 把 α 整个顶掉
结果  :α 和它身上的 17 单,再也没人找得到
```

`containsKey` 是原子的,`put` 也是原子的——但**两次调用拼成的一句业务**不是。这就是 check-then-act,第 72 话「查库存再扣库存」的翻版,只是这次翻在了「线程安全」容器头上。

> **豆豆锐评**:**线程安全容器 ≠ 复合操作安全**。ConcurrentHashMap 只担保「单次调用」原子;你在两次调用之间留的缝,它管不着。要原子,就用它递给你的原子积木——别自己拿胶带缠。

---

## 八、修复,并用测试证明

原子积木四兄弟,按需取用:

| 方法 | 语义 | 典型场景 |
|---|---|---|
| `putIfAbsent(k, v)` | 没有才放,返回旧值 | 值已现成造好 |
| `computeIfAbsent(k, fn)` | 没有才**算**,查+建+放一步完成 | 懒初始化(本话的坑) |
| `compute(k, fn)` | 有没有都重算 | 依赖旧值的更新 |
| `merge(k, v, fn)` | 没有放 v,有则合并 | 计数、累加一行流 |

修复只改一行:

```java
void record(String name) {
    sales.computeIfAbsent(name, k -> new AtomicInteger()).incrementAndGet();
}
```

值就是个整数的话,`merge` 更省——连 AtomicInteger 都不用请:

```java
sales.merge(name, 1, Integer::sum);      // 没有则放 1,有则原子地加
```

```java
import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import static org.junit.jupiter.api.Assertions.assertEquals;

class SalesBoardTest {
    @Test
    void hundred_threads_lose_no_sale() throws InterruptedException {
        var board = new SalesBoard();
        var threads = new ArrayList<Thread>();
        for (int i = 0; i < 100; i++)
            threads.add(Thread.ofPlatform().start(() -> {
                for (int j = 0; j < 1_000; j++) board.record("拿铁");
            }));
        for (var t : threads) t.join();
        assertEquals(100_000, board.total());     // 十万单,一单不丢
    }
}
```

JUnit 质检员:「证据呢?——十万单一单不少,这才叫证据。」

> **🎯 面试直击**:ConcurrentHashMap 1.7 → 1.8 锁粒度怎么变的?size 怎么算的?

| 维度 | JDK 7 | JDK 8 起 |
|---|---|---|
| 结构 | Segment 数组(每段继承 ReentrantLock)+ 段内小哈希表 | Node 数组 + 链表/红黑树 |
| 写入锁 | 锁**整段**,默认 16 段,并发度=段数 | 空桶 **CAS** 直入;非空只 synchronized **那一个桶头** |
| size | 按段计数再汇总 | baseCount + CounterCell[] 分散计数,取值求和(LongAdder 思想) |

> 追问点:迭代器是**弱一致**的——不抛 CME,但不保证看到遍历开始后的修改;以及 key/value 为什么禁 null——并发下 `get` 返回 null 时,你分不清「没这个键」还是「值本来就是 null」,二义性没法用 containsKey 再查一次来补(那又是 check-then-act)。

---

## 九、项目检查点 · 豆豆咖啡站 v9.5

```text
咖啡站形态:菜单与销量榜换装并发容器,边营业边盘点不再心惊
已具备  :HashMap 并发丢数的病根(同桶尾插相互覆盖)看得明白;CHM 两代演进(分段锁 → CAS+桶头锁+红黑树)讲得出;
          size 分散计数、弱一致迭代器心里有数;复合操作一律换用 putIfAbsent/computeIfAbsent/merge 原子积木
还没有  :线程池里「当前订单的会员上下文」开始串号——工人们共用一块工作台,谁的单是谁的,全靠缘分
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| HashMap 并发失效场景 | 「熟悉集合框架并发陷阱」,追问丢数据机理是分水岭 |
| ConcurrentHashMap 1.7→1.8 演进 / size 原理 | 并发八股 Top 级考点,答出分散计数直接加分 |
| check-then-act 识别 + 原子复合 API | 代码评审高频扣分点,会用 computeIfAbsent/merge 是熟手标志 |
| 弱一致迭代器 / CopyOnWriteArrayList 选型 | 「合理选用并发容器」的落地证据 |

---

## 十一、下一话悬念

容器稳了,新告警又到:晚高峰的线程池里,「当前订单的会员上下文」开始**串号**——张三的会员折扣打到了李四的账单上。共享变量放不得,层层传参又要把每个方法签名都改一遍。

豆豆:「工人们共用一块工作台,不串号才怪。该给**每个工人发一个只属于自己的托盘**了——顺便警告你:线程池里的托盘,用完不收拾,是会发霉的。」

> 下一话《一人一托盘:ThreadLocal》:每个线程一份私有副本,上下文不传参也不串号;以及那个让无数生产环境中招的问题——为什么在线程池里不 remove,就是内存泄漏。

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. 两个线程并发向 `HashMap` put 不同键值对,最可能发生的故障是?
   - A) 抛出 `ConcurrentModificationException`　　B) 数据丢失——put 过程中链表/红黑树被并发破坏,导致某些条目不可达被「丢掉」　　C) 死锁　　D) 内存溢出

2. `ConcurrentHashMap` 在 JDK 7 和 JDK 8 中的实现机制,以下哪个说法正确?
   - A) JDK 7 用 `synchronized` + 分段锁(16 个 Segment),JDK 8 用 CAS + 桶头 `synchronized`　　B) JDK 7 用分段锁(Segment extends ReentrantLock),JDK 8 用 CAS 放桶头 + 桶头元素 `synchronized`　　C) JDK 7 和 JDK 8 都用分段锁,没变化　　D) JDK 8 完全无锁,纯 CAS 实现

3. `ConcurrentHashMap` 为什么不允许 null 键和 null 值?
   - A) `HashMap` 也不允许,是 Map 接口的通用约定　　B) 并发环境下 null 有二义性——`get(key)` 返回 null,到底是 key 不存在还是 value 是 null?如果允许 null,`containsKey` 的判断就不可靠了;且在并发下 put 和 get 交替,这个二义性会放大　　C) 因为 CAS 操作不能处理 null　　D) 为了和 `Hashtable` 保持一致

4. 以下哪个操作是原子的(不需要额外同步)?

```java
ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
```

- A) `map.get("key")`　　B) `if (map.get("key") == null) { map.put("key", 1); }`　　C) `map.replace("key", map.get("key") + 1)`　　D) 以上所有操作都是原子的

5. `computeIfAbsent` 和 `putIfAbsent` 的核心区别是什么?
   - A) 没有区别,只是方法名不同　　B) `putIfAbsent` 传的是具体值,`computeIfAbsent` 传的是 Function——只有当 key 不存在时才会调用 Function 计算值,可以避免「先算出值→发现 key 已存在→值浪费」的问题　　C) `computeIfAbsent` 比 `putIfAbsent` 快　　D) `putIfAbsent` 是原子的,`computeIfAbsent` 不是

6. `ConcurrentHashMap` 迭代器的「弱一致性」指的是?
   - A) 迭代过程中会抛出 `ConcurrentModificationException`　　B) 迭代器遍历的是创建迭代器那一刻或某一时刻的快照,遍历期间其他线程的修改可能不会被反映到迭代结果中,但不会抛异常　　C) 迭代器每次 `next()` 都会重新读取最新值　　D) 迭代器的结果总是精确反映当前 map 的状态

7. `CopyOnWriteArrayList` 适合哪种场景?
   - A) 读多写多、需要实时一致性的场景　　B) 读多写极少(如监听器列表、路由表)——写时复制整个数组,读写不互斥,适合「遍历远多于修改」的场景　　C) 所有并发 List 场景,是 `ArrayList` 的万能替代　　D) 需要频繁在列表中间插入删除的场景

8. 以下代码在多线程下同时执行,`compute` 方法是原子的吗?

```java
map.compute("counter", (k, v) -> v == null ? 1 : v + 1);
```

- A) 是原子的——`compute` 内部锁住整个桶,Function 在桶锁的保护下执行,整个计算替换过程原子　　B) 不是原子的,Function 的执行不在锁保护范围内　　C) 是原子的但需要配合 `synchronized`　　D) 原子性取决于 key 的 hashCode 分布

9. 关于 `synchronized` 的适用场景,以下哪项是正确的?
   - A) 全部替换为 `BlockingQueue`　　B) 多次写比较少,每次写复制整个底层数组——适合「读多写极少」,不适合「读多写多」　　C) `CopyOnWriteArrayList` 的写操作是 O(1)　　D) `CopyOnWriteArrayList` 的迭代器是 fail-fast 的

10. 假设你用一个 `ConcurrentHashMap<String, Integer>` 实现商品库存,以下哪种写法能**原子地**实现「扣减:仅当 key 存在且 value > 0 时减 1」?
   - A) `if (map.get("A") > 0) { map.put("A", map.get("A") - 1); }`　　B) `map.computeIfPresent("A", (k, v) -> v > 0 ? v - 1 : v);`　　C) `map.replace("A", map.get("A"), map.get("A") - 1);`　　D) `synchronized (map) { map.get("A"); map.put(...); }`

### 解答题(5 道)

1. 用一句话解释 HashMap 为什么并发 put 会丢数据——从 put 过程中链表插入的步骤说明。

2. `ConcurrentHashMap` JDK 7 → JDK 8,从 Segment 分段锁到 CAS + 桶头 synchronized,请从锁粒度、并发度、实现复杂度三个角度解释这个替换的动因。

3. 你维护的代码中有一段:
```java
ConcurrentHashMap<String, Long> counters = new ConcurrentHashMap<>();
// 多线程执行
counters.put("qps", counters.get("qps") + 1);
```
这段代码线程安全吗?如果不是,请给出至少两种修复方案,并说明各自适用场景。

4. `ConcurrentHashMap` 的迭代器不抛 `ConcurrentModificationException`——这到底是优点还是潜在陷阱?请结合一个具体场景(如遍历所有 key 做批量清理),分析「弱一致性」可能导致的业务问题,以及如何规避。

5. 你需要在咖啡站系统中存储「每个门店的每类饮品的实时库存」,并发度高(200 个门店 × 50 种饮品 = 10000 个 key),操作包括读、扣减、补货、新品上架。请设计选型方案:① 存储容器选型及理由 ② 针对扣减写出原子复合操作的实现 ③ 如果有跨门店的汇总统计需求(如「所有门店的拿铁总库存」),该如何保证统计的近似一致性而不是精确一致性?

> [!答案]
> **1-1** B(HashMap 并发 put 时,链表/红黑树的数据结构被多个线程同时修改,可能导致指针断裂或形成环——数据在遍历路径上「消失」)  
> **举一反三**:这个 bug 需要实际触发。经典死锁场景:JDK 7 HashMap 并发 put 时 resize 过程中的头插法链表反转可能形成死循环环(CPU 100%),JDK 8 改为尾插法解决了环但未解决丢数据。
>
> **1-2** B(JDK 7 Segment 分段锁(每 Segment 一把 ReentrantLock,默认 16 段),JDK 8 CAS 做桶头无锁插入(桶为空时),桶非空时对桶头元素 `synchronized`)  
> **举一反三**:JDK 7 分段锁的思想延续了「分段锁=高并发度」的设计,但 16 段固定,段级竞争仍可发生。JDK 8 把锁下放到桶级别——数组扩容前有 N 个桶就有 N 把桶头锁,并发度理论上 = N。
>
> **1-3** B(null 的二义性在并发下更致命——`map.get(key)` 返回 null,你无法区分「key 不存在」还是「value 是 null」。如果允许 null,在并发检查 `containsKey` 时 key 可能刚好被删掉,判断结果立即失效。禁止 null 从源头消除了这个歧义)  
> **举一反三**:`HashMap` 允许 null 键值是因为它能通过 `containsKey` 来消除歧义,但在并发下 `containsKey` 结果不可靠——查完就过时了。CHM 的禁止 null 是一项安全设计。
>
> **1-4** A(单个 `get` 是原子的——它读的是 volatile 读(数组的 volatile 读),保证看到最新值。但 B 和 C 都是复合操作,在 get 和后续操作之间有窗口,不原子)  
> **举一反三**:CHM 的原子性范围:单个 `get/put/remove/compute*/merge*` 是原子的。任何「先 get 再根据结果做操作」的组合都需要用 `compute/computeIfPresent/computeIfAbsent/replace` 等原子方法。
>
> **1-5** B(`putIfAbsent` 传的是已计算好的值——如果 key 不存在才放入;`computeIfAbsent` 传的是计算逻辑——只有在 key 不存在时才执行 Function,延迟计算,开销更低)  
> **举一反三**:选型口诀:值已经算好了用 `putIfAbsent`,值需要「按需创建」(比如创建新 List、创建数据库连接)用 `computeIfAbsent`——后者避免了不必要的对象创建。
>
> **1-6** B(弱一致性——迭代器创建时拿到数组引用,遍历这个引用,期间其他线程的修改(新增/删除)不会反映到迭代过程,但也不会抛 CME 异常。这是一个有意的设计取舍:用弱一致性换无锁遍历)  
> **举一反三**:如果必须看到最新全量快照,用 `ConcurrentHashMap` 写时复制整个 map 的办法太重。更实际的处理:接受弱一致性,或用 `synchronized` 包裹遍历(恢复强一致性但失去并发读)。
>
> **1-7** B(读写比极高、写极少——监听器列表、路由表、白名单、配置项等。写操作 add/set/remove 复制整个数组,内存和 CPU 开销大,适合「会变但变得慢」的数据)  
> **举一反三**:读多写少是唯一合适场景。如果读写比没到「极多vs极少」,用 `Collections.synchronizedList()` 或直接用 `ConcurrentLinkedQueue`/`ConcurrentHashMap` 替代 List 语义。
>
> **1-8** A(`compute` 内部对整个桶加锁——找到 key 所在的桶,对桶头元素 `synchronized`,然后执行传入的 Function,计算结果直接原子地更新到桶中)  
> **举一反三**:**`compute` 族的实现原理:先 CAS 拿桶头(如果桶空则直接 CAS 放),再 `synchronized (桶头元素)` 保护整个 compute 过程——Function 执行 + 节点更新都在锁内。这就是 CHM 原子复合操作的核心实现。**
>
> **1-9** B(写入时复制整个底层数组——add 操作 new 一个数组把旧数据全拷贝过去,新元素加进去,再把引用指向新数组——O(n) 拷贝。读操作直接读当前数组引用,O(1)无锁)  
> **举一反三**:`CopyOnWriteArrayList` 的读写分离思想与 MVCC 同源——写时创建新版本,读操作持续看到旧版本。代价就是写开销大,且内存占用翻倍。
>
> **1-10** B(`computeIfPresent` 在桶锁保护下原子执行:检查 key 存在→传当前值给 Function→仅在返回值不为 null 时代替旧值。整个过程在桶锁内一气呵成)  
> **举一反三**:CHM 复合原子操作三剑客——`compute`(无中生有可)、`computeIfPresent`(有则更新可删除返回 null 即删)、`computeIfAbsent`(无则新建)。三种覆盖了 95% 的复合操作场景,不需要额外锁。
>
> **2-1** HashMap put 过程:计算 hash → 定位桶 → 遍历链表找 key。并发 put 时,两个线程同时定位到同一桶,同时走到「尾插入新节点」:① 线程 A 读到链表尾,准备插入 ② 线程 B 也读到链表尾(还没看到 A 的插入),也准备插入 ③ B 先完成,链表尾变 B ④ A 完成,把自己插入到旧尾后——A 的节点插入成功,但 B 的节点可能丢失(A 的 next 指向旧尾而不是 B)。或更糟:resize 期间并发 put,可能形成循环链表。精简一句话:并发修改链表结构,没有互斥保护,导致指针覆盖或断裂。  
> **举一反三**:**HashMap 非线程安全的本质原因——它所有操作(put/get/remove/resize)都假设只有一个线程在操作内部数据结构,没有 CAS 也没有锁。任何并发访问都违反了这个假设,行为就是 undefined。**
>
> **2-2** 锁粒度:Segment 锁住一段 hash 范围(16 个桶一组)→ 桶头锁只锁一个桶。并发度固定(默认 16 段)→ 随扩容自然提升(N 个桶 = N 个可并发更新的点)。实现复杂度:分段逻辑额外维护了 Segment 对象和跨段操作(如 size)→ 简化,没有 Segment 层,只维护桶数组。替换动因:① 现代多核环境并发度要求高,固定段数不够用,动态桶锁更灵活 ② CAS 技术成熟,省去 Segment 初始化的内存开销 ③ `synchronized` 锁升级(JIT 优化)使桶头锁在低竞争时实际退化为 CAS 自旋,性能不输显式锁。④ 代码量减少——去掉 Segment,内聚性提升。结论:JDK 8 的改造本质是将「粗粒度显式锁」降为「细粒度内置锁+CAS」的混合方案,兼顾低竞争性能和高竞争安全。  
> **举一反三**:这个演进的启示——不是锁越显式越好,而是「锁的粒度」和「锁的实现成本」之间取得平衡。JDK 8 证明了内置 `synchronized` 在 JIT 优化下可以匹敌显式锁,而细粒度大大减少了竞争概率。
>
> **2-3** 不是线程安全的——`get` 和 `put` 两步之间存在窗口:线程 A get 到 1,线程 B 也 get 到 1,两者都 put 2,结果少加了一次。修复方案一:`counters.compute("qps", (k, v) -> v == null ? 1 : v + 1)`——原子复合操作,桶内锁定,适合需要精确计数、key 数量可控的场景。修复方案二:如果用 `ConcurrentHashMap` 只是当 key-value 存储,不如换成 `LongAdder` 做 QPS 计数器——如果统计的是「总 QPS」而不是按某维度分 key,CHM 的 key-value 模型根本就是多余的,直接用 `LongAdder.increment()` 更好。方案选择:需要按维度分组(key=接口名)时用方案一;只统计总量时用方案二。  
> **举一反三**:很多「CHM 复合操作不线程安全」的问题其实是选型错误——如果只是全局计数器,就不该用 CHM 模拟,直接上 `LongAdder`/`AtomicLong`。CHM 的复合操作能力(`compute` 族)是用来处理复杂 key-value 更新的,全局计数器太轻量了。
>
> **2-4** 优点:不会抛 CME,遍历时不需要锁表,并发性能好——适合「对数据有一致性要求不那么强」的场景(如监控、展示)。潜在陷阱:① 场景:遍历所有 key 做批量清理(如遍历库存 map,清理过期 key)。线程 A 遍历时,线程 B 删掉了某个 key,B put 了一个新 key——A 的迭代器可能看到删除前的旧值、看不到新增的 key、甚至同一个 key 看到两次。② 业务问题:如果清理逻辑对「全量数据」有严格精确性要求(如持久化到外存),弱一致迭代可能导致:某个 key 被删了但迭代器仍看到它(重复删除),或者新增 key 迭代器漏掉(未清理)。③ 规避方式:a) 接受弱一致:在清理逻辑中加入幂等保护(重复清理无害)。b) 如果需要强一致性 flush,创建快照后再关闭新写入:用一个 `CountDownLatch` 等待写入完毕→ `new HashMap<>(chm)`(此时拿到近似快照)→基于快照清理。c) 对于关键的删除操作,不用「遍历中删除」而用「收集 key→遍历后批量删除」。  
> **举一反三**:CHM 的弱一致性本质——它帮你解决了「遍历不抛异常」,但语义上的「一致性」是业务责任。理解不一致的窗口范围:单 key 的 put/remove 是原子的,但跨 key 的快照不是——别把它当成数据库的事务 snapshot。
>
> **2-5** ① **存储容器选型**:`ConcurrentHashMap<String, Integer>`——key=`"门店ID:饮品ID"`。理由:CHM 桶级锁支持 10000 个 key 的高并发,读不阻塞,写仅桶内互斥。不用分段锁:桶锁粒度更细,10000 个 key 落入不同桶,绝大部分操作无竞争。不用 Redis:10000 个 key 本地操作延迟远低于网络,且库存扣减要求强一致性,本地锁+CAS 比分布式锁性能高。② **原子扣减**:
> ```java
> stores.compute(key, (k, v) -> {
>     if (v == null || v <= 0) return null;   // 没上架或库存不足→删 key
>     return v - 1;
> });
> ```
> `compute` 在桶锁保护下原子执行:检查库存 → 减 1 → 返回 null 则删 key。如果 value 降到 0,返回 null 会自动 remove 掉这个 key(节约内存)。③ **跨门店汇总统计**:10000 个 key 精确汇总——`stores.values().stream().mapToInt(v -> v).sum()`——但这是在弱一致性迭代器之上的,不能保证精确同步。近似一致性设计:维护一个 `LongAdder totalLatte` 辅助计数器——每次扣减拿铁时除了 `stores.compute`,也 `totalLatte.decrement()`。查询总库存时 `totalLatte.sum()`(也是近似但误差在可接受范围)。如果要求绝对精确:阶段性快照——`synchronized` 包裹汇总操作,遍历所有 key 的同时暂停所有写操作(不实用)。更现实:每 5 秒定时跑一次汇总到快照表,业务读快照表。  
> **举一反三**:分布式场景下的近似一致性与精确一致性的权衡——CAP 中的 C(一致性)是相对的。实时监控、前端展示用近似快照(高性能),对账、财务用精确汇总(强一致)。两者用一个「定时快照」桥接——近似数据持续写入,定时跑精确汇总纠正。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*