---
title: "《JVM 火种纪》12 · 排队的艺术"
date: 2026-10-17
tags: [Java, Java漫画, JVM, Queue, Java25, 阿零与焰焰]
summary: "上一话正则回溯灾难刚压住，咖啡站的取餐窗口又乱了套：三种排队逻辑全往一个 LinkedList 里塞，GC 噪音压垮高峰流量。阿零用 ArrayDeque 当双门神、PriorityQueue 做 VIP 小顶堆，把每种语义对齐到专用实现；炉底扒开 PriorityQueue 内部数组，印证 poll() 和 forEach() 的顺序差。"
---

# 《JVM 火种纪》12 · 排队的艺术

> JVM 火种纪 · 卷二「类库补课篇」第 5 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话回溯灾难刚复盘完，正则捕兽夹的设计刚收紧——但取餐台这边，三条队伍还挤在同一个 LinkedList 里，午高峰每秒上千笔订单，GC 噪音开始吃帧。

---

## 一、事故：三条队伍挤在一个 LinkedList

上一话把正则回溯压住之后，阿零以为后厨已经稳了。高峰期监控弹出第二条警报：**取餐窗口延迟陡升，GC 日志里链表节点的回收频次是平时的十倍**。

排查下来是阿零之前随手写的代码：普通取餐队列、盘子叠放栈、VIP 快道——三种逻辑全用 `new LinkedList<>()` 塞进去。问题不在逻辑错，在于 LinkedList 每次 `offer/poll` 都会创建或回收一个节点对象，GC 压力是循环数组实现的数倍；而且「栈」「队列」「优先队列」三种语义混在一个类型里，代码一眼看不出谁是谁。

焰焰从炉口探头，尾巴是冷静的蓝色：「LinkedList 是个万金油，但万金油不是最好的专业药。每种队列语义都有专用实现，用对了才叫会用集合。」

---

## 二、漫画 · 三条窗口换分拣机

![《JVM 火种纪》12 · 排队的艺术——队列选型六格漫画](/comics/jvm/f02e05-queue-art.png)

> [!文字版]
>
> **〔1〕** 咖啡站高峰期。阿零面对三个需求：普通取餐先到先得（FIFO）、盘子叠放后放的先取（LIFO）、VIP 快道按等级优先。他把三种需求全塞进 `new LinkedList<>()`，心想「反正都是队列」。
>
> **〔2〕** 焰焰摇头，「可以，但是错的。`LinkedList` 是链表——每个节点独立分配，GC 压力大，CPU 缓存友好性差。现在有更好的：`ArrayDeque` 底层循环数组，可以当栈也可以当队列，比 `LinkedList` 快 2-3 倍；`PriorityQueue` 小顶堆，自动按优先级排序，`poll()` 永远取出最小的那个。」
>
> **〔3〕** 「接口用法记一句话：`offer` 入队，`poll` 出队并移除，`peek` 看顶不移除。区别于 `add/remove/element`——后三个失败时抛异常，前三个失败时返回 `false`/`null`。」阿零抄进笔记。
>
> **〔4〕** 阿零把三个需求分别接上 `ArrayDeque`（普通 FIFO + 盘子叠放）和 `PriorityQueue`（VIP 快道），代码量反而更少，逻辑一目了然。
>
> **〔5〕** 阿零翻出一段旧代码问：「`pq.forEach()` 不就能看优先级顺序吗？」焰焰弹了弹尾巴：「`forEach` 是按堆内部数组遍历，顺序不保证。只有连续 `poll()` 才保证优先级。你刚才那段日志打印——输出顺序是随机的。」阿零脸红了。
>
> **〔6〕** 炉底浮出一个 JDK 1.0 时代的版本残影，手里攥着一份 `Stack` 类的源码：「我们那时候 `Stack` 继承 `Vector`，每个方法都有 `synchronized`，单线程也得付锁的开销——不是设计失误，是当年的认知局限。」残影轻叹一声散进火里。

---

## 三、本话目标

- 理解 `Queue` 接口 `offer/poll/peek` 与 `add/remove/element` 的语义差；
- 用 `ArrayDeque` 分别实现 FIFO 队列和 LIFO 栈；
- 用 `PriorityQueue` 实现按优先级出队的 VIP 快道；
- 分清 `PriorityQueue.forEach()` 与连续 `poll()` 的顺序差；
- 说清 `ArrayDeque`、`Stack`、`Deque` 的版本边界与迁移理由。

---

## 四、炉内原理图：三种语义对应三种实现

三种队列语义需要三种专用实现，不能混用一个万金油类型：

| 语义 | 推荐实现 | 底层结构 | 不推荐 |
|---|---|---|---|
| FIFO 队列 | `ArrayDeque` | 循环数组 | `LinkedList`（GC 压力） |
| LIFO 栈 | `ArrayDeque`（push/pop） | 循环数组 | `Stack`（继承 Vector，有同步开销） |
| 优先队列 | `PriorityQueue` | 二叉堆（数组） | `LinkedList`（无序） |

关键设计逻辑：`ArrayDeque` 底层是循环数组，头尾操作均摊 O(1)，内存连续，CPU 缓存命中率高；`PriorityQueue` 底层是二叉堆，`poll()` 是 O(log n)，`peek()` 是 O(1)，`forEach` 遍历是堆内部数组顺序，**不保证优先级排序**。

这一话接上一话的教训：上一话的问题是「用错了工具的参数（贪婪量词）」，这一话的问题是「用错了工具本身」——选型的精度和参数的精度同样重要。

`ArrayDeque` 不允许存入 `null`，因为 `poll()` 用 `null` 表示队列为空，混进真正的 null 元素就无法区分。`PriorityQueue` 同理。

---

## 五、从上一话继续改代码：把三条队伍换成专用实现

```java
// javac -encoding UTF-8 --release 25 QueueDemo.java
import java.util.*;

class QueueDemo {

    // VIP 等级（数字越小优先级越高）
    record Customer(String name, int vipLevel) implements Comparable<Customer> {
        @Override
        public int compareTo(Customer o) {
            return Integer.compare(this.vipLevel, o.vipLevel);
        }
    }

    public static void main(String[] args) {

        // ── 1. FIFO 队列：ArrayDeque 当普通队列 ─────────────
        Deque<String> takeQueue = new ArrayDeque<>();
        takeQueue.offer("阿零");
        takeQueue.offer("焰焰");
        takeQueue.offer("店长");
        System.out.println("=== 取餐队（FIFO）===");
        while (!takeQueue.isEmpty()) {
            System.out.println("  叫号: " + takeQueue.poll());
        }

        // ── 2. LIFO 栈：ArrayDeque 当栈（比 Stack 类快）──────
        Deque<String> plateStack = new ArrayDeque<>();
        plateStack.push("底盘");
        plateStack.push("中盘");
        plateStack.push("顶盘");
        System.out.println("=== 盘子叠放（LIFO）===");
        while (!plateStack.isEmpty()) {
            System.out.println("  取出: " + plateStack.pop());
        }

        // ── 3. 优先队列：PriorityQueue 小顶堆 ───────────────
        PriorityQueue<Customer> vipQueue = new PriorityQueue<>();
        vipQueue.offer(new Customer("普通张", 3));
        vipQueue.offer(new Customer("黄金李", 2));
        vipQueue.offer(new Customer("钻石王", 1));
        vipQueue.offer(new Customer("普通陈", 3));

        System.out.println("=== VIP 快道（优先队列）===");
        while (!vipQueue.isEmpty()) {
            Customer c = vipQueue.poll();
            System.out.printf("  服务: %-8s 等级=%d%n", c.name(), c.vipLevel());
        }

        // ── 4. 双端队列：两头都能操作 ────────────────────────
        Deque<String> deque = new ArrayDeque<>();
        deque.offerFirst("中间");
        deque.offerFirst("头部");  // 头部插入
        deque.offerLast("尾部");   // 尾部插入
        System.out.println("=== 双端操作 ===");
        System.out.println("  头: " + deque.peekFirst()); // 头部
        System.out.println("  尾: " + deque.peekLast());  // 尾部
        System.out.println("  出头: " + deque.pollFirst());
        System.out.println("  出尾: " + deque.pollLast());
        System.out.println("  剩余: " + deque.peekFirst()); // 中间
    }
}
```

**实测输出**（GraalVM 25.0.4）：

```
=== 取餐队（FIFO）===
  叫号: 阿零
  叫号: 焰焰
  叫号: 店长
=== 盘子叠放（LIFO）===
  取出: 顶盘
  取出: 中盘
  取出: 底盘
=== VIP 快道（优先队列）===
  服务: 钻石王    等级=1
  服务: 黄金李    等级=2
  服务: 普通张    等级=3
  服务: 普通陈    等级=3
=== 双端操作 ===
  头: 头部
  尾: 尾部
  出头: 头部
  出尾: 尾部
  剩余: 中间
```

关键验证：FIFO 顺序与插入顺序一致；LIFO 逆序弹出；PriorityQueue 按 `vipLevel` 升序出队（相同等级保留插入顺序不保证）；双端操作头尾独立。

---

## 六、故意翻一次车：用 forEach 打印优先队列

阿零想验证一件事：他之前的日志模块里有一段 `pq.forEach(System.out::println)`，他一直以为打出来的顺序就是优先级顺序。

```java
// 阿零故意试一次：PriorityQueue 遍历不保证顺序
PriorityQueue<Integer> pq = new PriorityQueue<>(List.of(3, 1, 2));
System.out.println("forEach 遍历: ");
pq.forEach(System.out::println); // 实际可能输出 1,3,2（堆内部布局，非排序顺序）
```

这段代码不报错，也不崩溃。但输出的顺序是堆内部的数组布局，不是「最高优先级先出」的顺序。**日志里的 VIP 服务记录一直在按错误顺序打印，没有人发现，因为程序没有报错。**

---

## 七、编译官罚单

> **📋 编译官罚单 · 这次编译官没吭声**
>
> `pq.forEach()` 不是编译错误，编译器对此完全无异议。用错遍历顺序是运行时的语义问题，不是语法问题。
>
> 编译器管不到「你选错了迭代方式」这类错误，所以更危险——错误会安安静静地跑在生产上，直到有人对账发现 VIP 服务记录打印顺序和实际服务顺序不一致。
>
> 这类问题没有罚单，只有事后复盘。

---

## 八、修复并验证

修复方案是把 `forEach` 换成 `while (!pq.isEmpty()) pq.poll()`。只有连续调用 `poll()` 才保证按优先级顺序取出。

验证判据：

1. **FIFO 顺序**：`ArrayDeque` 当队列时，`poll()` 返回顺序与 `offer()` 顺序完全一致。
2. **LIFO 顺序**：`ArrayDeque` 当栈时，`pop()` 返回顺序是 `push()` 的逆序。
3. **优先级顺序**：`PriorityQueue` 连续 `poll()` 按 `vipLevel` 升序；`forEach` 顺序不保证，以 `poll()` 为准。

正常路径实测输出（GraalVM 25.0.4，同上文代码块）：

```
=== VIP 快道（优先队列）===
  服务: 钻石王    等级=1
  服务: 黄金李    等级=2
  服务: 普通张    等级=3
  服务: 普通陈    等级=3
```

等级 1 最先出队，相同等级（两个等级=3）之间顺序不保证，但全部服务完、台中剩余 0。

---

## 九、🔬 炉底显微镜 · 堆内部布局 vs poll 顺序

> 焰焰把 PriorityQueue 的堆结构暴露出来：

```bash
# 查看 PriorityQueue 内部字段（堆数组）
javap -p java.util.PriorityQueue | grep -E "queue|size|comparator"

# 演示堆内部布局 vs poll 顺序
java -ea --source 25 - <<'EOF'
import java.util.*;
void main() {
    PriorityQueue<Integer> pq = new PriorityQueue<>(List.of(5,3,8,1,4));
    System.out.println("内部数组(不保证排序): " + pq);   // [1, 3, 8, 5, 4] 或类似
    System.out.print("poll 顺序(保证): ");
    while (!pq.isEmpty()) System.out.print(pq.poll() + " ");
    System.out.println(); // 1 3 4 5 8
}
EOF
```

**实测输出**：

```
内部数组(不保证排序): [1, 3, 8, 5, 4]
poll 顺序(保证): 1 3 4 5 8
```

关键观测点：
- `PriorityQueue` 底层是二叉堆（数组存储），`poll()` 是 O(log n)，`offer()` 是 O(log n)，`peek()` 是 O(1)
- `ArrayDeque` 底层是循环数组，头尾操作均摊 O(1)；不支持 `null` 元素
- `LinkedList` 作队列：每次 `offer/poll` 创建/销毁节点对象，GC 压力是 `ArrayDeque` 数倍，不推荐
- `PriorityQueue` 不是线程安全的；并发场景用 `PriorityBlockingQueue`（下一话主题）

---

## 十、⏳ 版本时光机 · 队列家族版本边界

**版本边界**

| 类型 | JDK | 说明 |
|---|---|---|
| `Stack` | JDK 1.0 | 过时，不推荐 |
| `Queue` 接口 | JDK 1.5 | `offer/poll/peek` 语义 |
| `PriorityQueue` | JDK 1.5 | 小顶堆 |
| `Deque` 接口 + `ArrayDeque` | **JDK 1.6** | 推荐的栈和队列实现 |
| `SequencedCollection` | JDK 21 | `Deque` 实现了该接口，统一头尾方法 |
| 本话代码运行环境 | JDK 25 | ✅ |

---

## 十一、Queue 接口方法对比

| 操作 | 失败抛异常 | 失败返回特殊值 |
|---|---|---|
| 入队 | `add(e)` | `offer(e)` → false |
| 出队（移除） | `remove()` | `poll()` → null |
| 查看头部 | `element()` | `peek()` → null |

**生产代码用 `offer/poll/peek`**——不会因为队列满/空而抛出 `NoSuchElementException`。

`ArrayDeque` 双端操作速查：

```
offerFirst/offerLast  →  头部/尾部入队
pollFirst/pollLast    →  头部/尾部出队
peekFirst/peekLast    →  头部/尾部查看

当栈使用：push = offerFirst，pop = pollFirst，peek = peekFirst
当队列使用：offer = offerLast，poll = pollFirst
```

---

## 十二、项目检查点 · 豆豆咖啡站 jvm-v1.5

- **已具备**：取餐队列、盘子叠放栈、VIP 快道三条队伍各归其位，`ArrayDeque` + `PriorityQueue` 替换掉 LinkedList，GC 节点噪音消除；`offer/poll/peek` 语义明确，不再用抛异常版本。
- **还没有**：队列在并发场景下仍不安全，咖啡师线程和取餐员线程同时操作时需要 `BlockingQueue` 的阻塞语义——出杯台满了咖啡师该等，空了取餐员该等，这件事 `ArrayDeque` 管不了。

阿零的变化：他第一次意识到——**同一个「队列」这个词，背后藏着 FIFO、LIFO、优先级三种完全不同的语义**，而且每种语义都有更专、更快的实现，随手 `new LinkedList<>()` 是懒，不是通用。

---

## 十三、对应招聘技能

Queue/Deque 接口语义、ArrayDeque 底层循环数组、PriorityQueue 小顶堆与 O(log n) 复杂度、集合选型依据、LinkedList 弃用场景分析。

---

## 十四、下一话悬念

队列会排了，但咖啡师和取餐员还是两条独立线程，台满了咖啡师会往里硬塞、台空了取餐员会空轮询——两边都是忙等，CPU 白耗。

焰焰合上《JEP 编年史》：「你有了对的队列，但队列还不会等待。下一话，`BlockingQueue` 把等待逻辑内置在队列里——出杯台满了咖啡师自动阻塞，空了取餐员自动阻塞，一行 `put/take` 换掉你所有的 `wait/notify`。」

---

## 🎯 随堂练习

**Q1.** `offer()` 和 `add()` 的语义区别是什么？哪个更适合生产代码？

**Q2.** 为什么不推荐用 `LinkedList` 作队列，推荐 `ArrayDeque`？

**Q3.** `PriorityQueue` 遍历（`forEach`/`iterator`）能保证优先级顺序吗？

**Q4.** 用 `ArrayDeque` 实现栈，用哪两个方法 push 和 pop？

**Q5.** `PriorityQueue<String>` 不传 `Comparator` 时，按什么顺序出队？

**Q6.** `PriorityQueue` 中，`peek()` 的时间复杂度是多少？`poll()` 呢？

**Q7.** `ArrayDeque` 是否允许存入 `null`？为什么？

**Q8.** 如何实现大顶堆（最大值优先出队）？

**Q9.** `Stack` 类的问题是什么？为什么被 `ArrayDeque` 取代？

**Q10.** 并发场景下用队列，应该选哪个类？（提示：BlockingQueue）

---

> [!答案]
>
> **Q1. `offer(e)` 在队列满时返回 `false`；`add(e)` 在队列满时抛 `IllegalStateException`。**对于无界队列（`ArrayDeque`、`PriorityQueue`）两者等价，但生产代码推荐 `offer()`——行为可预测，不需要 try-catch 处理容量异常。
>
> **Q2. `LinkedList` 每次 `offer/poll` 创建/回收节点对象**，造成 GC 压力，且链表节点内存不连续，CPU 缓存命中率低。`ArrayDeque` 底层循环数组，头尾操作均摊 O(1)，内存连续，吞吐量通常是 `LinkedList` 的 2-3 倍。
>
> **Q3. 不能。**`PriorityQueue` 的 `forEach`/`iterator` 按堆内部数组顺序遍历，不保证优先级排序。只有连续调用 `poll()` 才能按优先级顺序取出元素。
>
> **Q4. `push(e)`（等同于 `offerFirst(e)`）和 `pop()`（等同于 `pollFirst()`）。**两者都操作队列头部，实现 LIFO 语义。也可以直接用 `offerFirst/pollFirst`。
>
> **Q5. 按自然顺序（字典序）升序**——`String` 实现了 `Comparable<String>`，`PriorityQueue` 默认使用自然顺序构成小顶堆，字典序最小的字符串优先出队。
>
> **Q6. `peek()` 是 O(1)**——直接返回数组下标 0 的元素（堆顶）。**`poll()` 是 O(log n)**——移除堆顶后，将最后一个元素移到堆顶，再执行下沉操作（sift-down），最多下沉 log n 层。
>
> **Q7. `ArrayDeque` 不允许 `null`。**因为 `poll()` 用 `null` 表示队列为空，如果允许存 `null`，就无法区分「队列空」和「取到了一个 null 元素」。
>
> **Q8. 传入 `Comparator.reverseOrder()` 或 `Collections.reverseOrder()`：**
> ```java
> PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
> ```
> 也可以让 `Comparable.compareTo()` 返回反向结果，但修改 `compareTo` 语义不推荐。
>
> **Q9. `Stack` 继承自 `Vector`，所有方法都有 `synchronized` 锁。**单线程场景下这些锁是纯开销，没有益处。此外，`Stack` 暴露了 `Vector` 的 `get(index)` 等随机访问方法，破坏了栈的封装性。`ArrayDeque` 无锁、无多余接口，是正确的替代品。
>
> **Q10. `java.util.concurrent.BlockingQueue` 的实现类**，如 `ArrayBlockingQueue`（有界）、`LinkedBlockingQueue`（可选有界）、`PriorityBlockingQueue`（优先级+阻塞）。`BlockingQueue` 的 `put()/take()` 在队满/队空时阻塞等待，天然适合生产者-消费者模式（详见下一话）。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 QueueDemo.java && java QueueDemo`，FIFO、LIFO、PriorityQueue 排序、双端操作输出均与文中一致。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API - java.util.Queue](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Queue.html)、[ArrayDeque](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/ArrayDeque.html) 与 [PriorityQueue](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/PriorityQueue.html)。`ArrayDeque` 在 JDK 1.6 引入，JDK 25 无变更。

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
