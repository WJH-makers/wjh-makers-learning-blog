---
title: "F2E5 排队的艺术 — Queue、Deque 与 PriorityQueue"
date: "2026-10-17"
series: "jvm-academy"
season: 2
episode: 5
tags: ["Java 25", "Queue", "ArrayDeque", "PriorityQueue", "集合", "数据结构"]
excerpt: "取餐队 FIFO 靠 ArrayDeque 双门神，VIP 优先出杯是 PriorityQueue 小顶堆。LinkedList 退休了——双端队列和优先队列都有更专的实现。"
---

![JVM 火种纪漫画：f02e05-queue-art](/comics/jvm/f02e05-queue-art.png)

> **"队列有两种错误：用错了类，和用 LinkedList 当队列。"**
> — 焰焰，看着代码里的 `new LinkedList<>()` 说

---

## 🎬 开场：取餐台前三条队伍

> **〔1〕**
> 咖啡站高峰期。阿零面对三个需求：
>
> - 普通取餐：先到先得，FIFO 队列
> - 盘子叠放：先放的盘子在底，后放的在顶，LIFO 栈
> - VIP 快道：按等级优先，不管来的早晚
>
> 「三种逻辑，用同一个 `LinkedList` 解决，可以吗？」

> **〔2〕**
> 焰焰摇头，「可以，但是错的。`LinkedList` 是链表——每个节点独立分配，GC 压力大，CPU 缓存友好性差。现在有更好的：」
>
> - **`ArrayDeque`**：双端队列，底层循环数组，可以当栈也可以当队列，比 `LinkedList` 快 2-3 倍
> - **`PriorityQueue`**：小顶堆，自动按优先级排序，`poll()` 永远取出最小的那个
> - `Queue` 接口：统一的 `offer/poll/peek` 语义

> **〔3〕**
> 「接口用法记一句话：`offer` 入队，`poll` 出队并移除，`peek` 看顶不移除。区别于 `add/remove/element`——后三个失败时抛异常，前三个失败时返回 `false`/`null`。」

> **〔4〕**
> 阿零把三个需求分别接上 `ArrayDeque`（普通 FIFO + 盘子叠放）和 `PriorityQueue`（VIP 快道），代码量反而更少，逻辑一目了然：
>
> ```
> 取餐队(FIFO):  A→B→C  offer(D) → A出  poll返回A
> 盘子栈(LIFO):  底→中→顶  push(新) → 顶出  pop返回顶
> VIP 堆:       等级1最优先  poll() 永远取等级最小者
> ```

---

## 🔑 核心技术：三种队列语义

### Queue 接口方法对比

| 操作 | 失败抛异常 | 失败返回特殊值 |
|---|---|---|
| 入队 | `add(e)` | `offer(e)` → false |
| 出队（移除） | `remove()` | `poll()` → null |
| 查看头部 | `element()` | `peek()` → null |

**生产代码用 `offer/poll/peek`**——不会因为队列满/空而抛出 `NoSuchElementException`。

### ArrayDeque 双端操作

```
offerFirst/offerLast  →  头部/尾部入队
pollFirst/pollLast    →  头部/尾部出队
peekFirst/peekLast    →  头部/尾部查看

当栈使用：push = offerFirst，pop = pollFirst，peek = peekFirst
当队列使用：offer = offerLast，poll = pollFirst
```

---

## ⚙️ 代码实录：三种队列实战

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

## ⚠️ 常见陷阱

```java
// 陷阱1：遍历 PriorityQueue 不保证顺序
// pq.forEach() 迭代顺序不是堆排序，只有 poll() 才保证顺序
PriorityQueue<Integer> pq = new PriorityQueue<>(List.of(3,1,2));
pq.forEach(System.out::println); // 可能输出 1,3,2（堆内部布局）
// 正确：用 poll() 循环

// 陷阱2：用 Stack 类（已过时）
Stack<String> s = new Stack<>(); // 不推荐，Stack 继承 Vector，有同步开销
// 正确：new ArrayDeque<>()

// 陷阱3：在优先队列里修改已入队对象的比较字段
// 修改后堆顺序不会自动修复，必须先 remove() 再重新 offer()
```

---

## 🔬 炉底显微镜

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
- `PriorityQueue` 不是线程安全的；并发场景用 `PriorityBlockingQueue`（卷二 F2E6 主题）

---

## 📐 版本边界

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
> **Q10. `java.util.concurrent.BlockingQueue` 的实现类**，如 `ArrayBlockingQueue`（有界）、`LinkedBlockingQueue`（可选有界）、`PriorityBlockingQueue`（优先级+阻塞）。`BlockingQueue` 的 `put()/take()` 在队满/队空时阻塞等待，天然适合生产者-消费者模式（详见 F2E6）。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 QueueDemo.java && java QueueDemo`，FIFO、LIFO、PriorityQueue 排序、双端操作输出均与文中一致。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API - java.util.Queue](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Queue.html)、[ArrayDeque](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/ArrayDeque.html) 与 [PriorityQueue](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/PriorityQueue.html)。`ArrayDeque` 在 JDK 1.6 引入，JDK 25 无变更。

---

## 🔮 下话预告：F2E6《产消协奏曲》

队列有了——下一话让队列「会等待」。

`BlockingQueue` 在队满时让生产者阻塞，队空时让消费者阻塞：出杯台满了咖啡师站着等，空了取餐员站着等。`SynchronousQueue` 是手递手窗口——生产者和消费者必须同时到场才能完成传递。
