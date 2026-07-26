---
title: "《从零开始学 Java》74 · 并发菜单:ConcurrentHashMap"
date: 2026-10-31
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

## 九、项目检查点 · 并发特训 5/10

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

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
