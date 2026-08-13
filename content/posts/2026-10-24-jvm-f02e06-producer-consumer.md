---
title: "《JVM 火种纪》13 · 产消协奏曲"
date: 2026-10-24
tags: [Java, Java漫画, JVM, BlockingQueue, Java25, 阿零与焰焰]
summary: "上一话把三条队伍换成专用实现，高峰期 GC 噪音压住了——但咖啡师线程和取餐员线程还在互相忙等，台满硬塞、台空空轮询。阿零用 BlockingQueue 把等待逻辑内置进队列，put/take 一行代换掉所有 wait/notify；SynchronousQueue 是手递手窗口，生产消费必须同时到场。"
---

# 《JVM 火种纪》13 · 产消协奏曲

> JVM 火种纪 · 卷二「类库补课篇」第 6 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话三条队伍各归其位，GC 节点噪音消除了——但出杯台满了咖啡师还在硬塞、台空了取餐员还在空轮询，两边都是忙等，CPU 白耗。

---

## 一、事故：出杯台满了咖啡师还在往里塞

上一话把 `LinkedList` 换成了专用实现之后，GC 压力确实下来了。这周新问题冒出来：出杯台（容量上限 4 杯）偶尔会出现「台满仍有饮品入队，台空仍有取餐员不停 poll」的情况，日志里看到大量 offer 返回 false 和无效的空循环。

排查下来是阿零之前手写的并发控制：

```java
while (台.offer(drink) == false) { /* 忙等 */ }  // 台满时死循环
while (台.poll() == null) { /* 忙等 */ }          // 台空时死循环
```

焰焰看完直接说：「会写对，但太容易写错。你得自己管 `notifyAll` 时机，自己处理虚假唤醒，自己保证锁的获取顺序。`BlockingQueue` 把这些全包了——`put()` 队满时阻塞，`take()` 队空时阻塞，内部用 `ReentrantLock + Condition` 实现，经过千锤百炼。」

---

## 二、漫画 · 手动档换自动挡

![《JVM 火种纪》13 · 产消协奏曲——BlockingQueue 四格漫画](/comics/jvm/f02e06-producer-consumer.png)

> [!文字版]
>
> **〔1〕** 咖啡站自动化改造：咖啡师线程生产饮品，取餐员线程消费饮品，中间有一个出杯台（容量=4）。阿零的旧代码台满了死循环重试、台空了死循环等待——两边都在烧 CPU。
>
> **〔2〕** 阿零拿出 `synchronized + wait/notify` 方案。焰焰直接摇头：「会写对，但太容易写错。你得自己管 `notifyAll` 时机，自己处理虚假唤醒，自己保证锁的获取顺序。`BlockingQueue` 把这些全包了——`put()` 队满时阻塞，`take()` 队空时阻塞，内部用 `ReentrantLock + Condition` 实现，经过千锤百炼。」
>
> **〔3〕** 「`BlockingQueue` 有三个常用实现：`ArrayBlockingQueue(n)` 有界底层数组、`LinkedBlockingQueue(n)` 可选有界双锁、`SynchronousQueue` 容量=0 手递手。」阿零把出杯台换成 `ArrayBlockingQueue(4)`，代码量从 60 行缩到 15 行。
>
> **〔4〕** 炉底浮出一个 JDK 1.4 时代的版本残影，手里攥着一份 `wait()/notify()` 的使用手册：「我们那时候，所有阻塞队列都要自己用 Object 锁手工实现，忘了 `notifyAll` 就死锁，写了 `notify` 就可能漏唤醒。JDK 1.5 的 `java.util.concurrent` 一次性把这些坑都填了。」残影翻了翻那本手册，叹了口气散进火里。

---

## 三、本话目标

- 理解 `BlockingQueue.put/take` 与 `offer/poll` 的阻塞语义差；
- 用 `ArrayBlockingQueue` 实现有界生产者-消费者模式；
- 区分 `ArrayBlockingQueue`（单锁）与 `LinkedBlockingQueue`（双锁）的吞吐差；
- 理解 `SynchronousQueue` 零容量手递手语义；
- 说清 `java.util.concurrent` 队列的版本边界。

---

## 四、炉内原理图：BlockingQueue 方法矩阵

`BlockingQueue` 四列方法对应四种失败策略：

| 操作 | 抛异常 | 返回特殊值 | 阻塞等待 | 超时等待 |
|---|---|---|---|---|
| 入队 | `add(e)` | `offer(e)` | `put(e)` | `offer(e, t, unit)` |
| 出队 | `remove()` | `poll()` | `take()` | `poll(t, unit)` |
| 查看 | `element()` | `peek()` | — | — |

**生产代码首选 `put/take`（无限等待）或 `offer/poll` 超时版（可设最大等待时间）。**

接上一话：上一话的 `ArrayDeque` 是单线程专用，没有任何锁；这一话的 `BlockingQueue` 是并发安全的，内部有锁/CAS，代价是多线程场景下不需要外部同步。选型原则是：单线程用 `ArrayDeque`，多线程用 `BlockingQueue`。

---

## 五、从上一话继续改代码：出杯台换成 BlockingQueue

```java
// javac -encoding UTF-8 --release 25 CafeQueue.java
import java.util.concurrent.*;

class CafeQueue {

    static final BlockingQueue<String>台 = new ArrayBlockingQueue<>(4);
    static final int DRINKS = 6;
    static final String POISON = "DONE"; // 毒丸信号，通知消费者退出

    // 生产者：咖啡师
    static Thread barista() {
        return Thread.ofPlatform().name("咖啡师").start(() -> {
            String[] menu = {"拿铁", "卡布", "美式", "摩卡", "绿茶", "红茶"};
            try {
                for (String drink : menu) {
                    台.put(drink);
                    System.out.println("[咖啡师] 上架: " + drink
                        + "  台中: " + 台.size());
                    Thread.sleep(50);
                }
                台.put(POISON); // 结束信号
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
    }

    // 消费者：取餐员
    static Thread waiter() {
        return Thread.ofPlatform().name("取餐员").start(() -> {
            try {
                while (true) {
                    String drink = 台.take();
                    if (POISON.equals(drink)) break;
                    System.out.println("          [取餐员] 取走: " + drink);
                    Thread.sleep(120); // 消费慢于生产，台会积压
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
    }

    public static void main(String[] args) throws InterruptedException {
        Thread b = barista();
        Thread w = waiter();
        b.join(); w.join();
        System.out.println("=== 全部完成，台中剩余: " + 台.size() + " ===");
    }
}
```

**实测输出**（GraalVM 25.0.4，节选）：

```
[咖啡师] 上架: 拿铁  台中: 1
[咖啡师] 上架: 卡布  台中: 2
          [取餐员] 取走: 拿铁
[咖啡师] 上架: 美式  台中: 2
[咖啡师] 上架: 摩卡  台中: 3
[咖啡师] 上架: 绿茶  台中: 4
          [取餐员] 取走: 卡布
[咖啡师] 上架: 红茶  台中: 4
          [取餐员] 取走: 美式
=== 全部完成，台中剩余: 0 ===
```

关键验证：台中最大为 4（有界），咖啡师在台满时自动阻塞（红茶上架后台=4，此后咖啡师等取餐员取走才能放毒丸）；最终台中剩余 0。

---

## 六、故意翻一次车：把 BlockingQueue 换回忙等循环

阿零故意把旧代码恢复出来，想感受一下区别：

```java
// 阿零故意试一次：用 offer 重试模拟阻塞
ArrayDeque<String>台old = new ArrayDeque<>(4); // 非阻塞，无边界
// ... 生产者
while (!台old.offerLast(drink)) {
    // 忙等：台满时死循环，CPU 白耗
}
// ... 消费者
String item;
while ((item = 台old.pollFirst()) == null) {
    // 忙等：台空时死循环
}
```

这段代码在低负载下看起来「能跑」，但有三个问题：`ArrayDeque` 没有容量上限，`offerLast` 永远不会返回 false；两个线程同时读写 `ArrayDeque` 没有同步保护，会出现数据竞争；忙等循环在台满/台空时把 CPU 跑满，影响其他线程。

---

## 七、编译官罚单

> **📋 编译官罚单 · 这次编译官没吭声**
>
> 忙等循环、数据竞争、`ArrayDeque` 的非并发安全——这些都不是编译错误。编译器对 `while (queue.poll() == null) {}` 完全无异议。
>
> 并发错误是运行时的语义问题，在压力测试或特定线程调度时才会暴露，不会有罚单，只有生产故障。这类错误比编译错误更危险：它们会安静地潜伏在低负载环境中，直到午高峰流量来临才爆发。

---

## 八、修复并验证

修复是把 `ArrayDeque` 换成 `ArrayBlockingQueue(4)` 并把 `offer/poll` 循环换成 `put/take`。`put/take` 在内部用 `ReentrantLock + Condition` 实现阻塞，不烧 CPU，线程安全。

验证判据：

1. **有界生效**：台中 `size()` 最大值不超过 4。
2. **阻塞生效**：生产者在台满后确实停顿（输出行之间有间隔），不是连续快速上架。
3. **毒丸退出**：消费者收到 `POISON` 后退出循环，最终 `size()` 为 0。

正常路径实测输出（GraalVM 25.0.4，同上文代码块）：

```
=== 全部完成，台中剩余: 0 ===
```

---

## 九、🔬 炉底显微镜 · ReentrantLock 内部结构与 SynchronousQueue

> 焰焰用 `javap` 查看 BlockingQueue 的内部锁结构，再演示 SynchronousQueue 的手递手行为：

```bash
# 编译并后台运行，立即 jcmd 抓线程状态
javac -encoding UTF-8 --release 25 CafeQueue.java

# 查看 BlockingQueue 内部 ReentrantLock 结构
javap -p java.util.concurrent.ArrayBlockingQueue | head -20

# 演示 SynchronousQueue：容量=0，put 阻塞直到有线程 take
java -ea --source 25 - <<'EOF'
import java.util.concurrent.*;
void main() throws Exception {
    SynchronousQueue<String> sq = new SynchronousQueue<>();
    var t = Thread.ofPlatform().start(() -> {
        try { sq.put("手递手咖啡"); } catch (InterruptedException e) {}
    });
    Thread.sleep(100);
    System.out.println("收到: " + sq.take()); // take 触发，put 解除阻塞
    t.join();
}
EOF
```

**实测输出**：

```
收到: 手递手咖啡
```

关键观测点：
- `ArrayBlockingQueue` 用单把 `ReentrantLock` + 两个 `Condition`（notFull/notEmpty）实现阻塞；`LinkedBlockingQueue` 用 putLock/takeLock 两把锁，生产和消费可并发
- `SynchronousQueue` 容量为 0，`put()` 阻塞直到另一个线程调用 `take()`，适合线程池任务直接交接（`Executors.newCachedThreadPool()` 内部就用它）
- 毒丸（Poison Pill）是最简单的消费者退出信号；多个消费者时每个消费者消费一个毒丸后各放回一个，或用 `AtomicBoolean` 标志位

---

## 十、⏳ 版本时光机 · java.util.concurrent 队列版本边界

**版本边界**

| 类型 | JDK | 说明 |
|---|---|---|
| `BlockingQueue` 接口 | JDK 1.5 | `java.util.concurrent` 包引入 |
| `ArrayBlockingQueue` | JDK 1.5 | 有界，单锁 |
| `LinkedBlockingQueue` | JDK 1.5 | 可选有界，双锁 |
| `SynchronousQueue` | JDK 1.5 | 零容量，手递手 |
| `LinkedTransferQueue` | **JDK 7** | 无界，支持 `transfer()`（消费者就位才返回）|
| 本话代码运行环境 | JDK 25 | ✅ |

---

## 十一、ArrayBlockingQueue vs LinkedBlockingQueue 对比

| 维度 | `ArrayBlockingQueue` | `LinkedBlockingQueue` |
|---|---|---|
| 底层结构 | 数组（有界，必须指定容量） | 链表（可选有界，默认 `Integer.MAX_VALUE`） |
| 锁策略 | 单把 `ReentrantLock` | 生产/消费各一把锁（双锁） |
| 并发吞吐 | 生产消费互斥 | 生产消费可并发（更高吞吐） |
| 内存 | 预分配固定大小数组 | 按需分配节点（GC 压力略高） |
| 适用场景 | 容量已知、低并发 | 高并发生产消费分离 |

> [!坑] `LinkedBlockingQueue` 默认容量是 `Integer.MAX_VALUE`（约21亿），相当于无界。生产者速度远快于消费者时，队列无限增长，耗尽堆内存触发 OOM。**生产代码应始终指定合理的有界容量。**

---

## 十二、项目检查点 · 豆豆咖啡站 jvm-v1.6

- **已具备**：出杯台换成 `ArrayBlockingQueue(4)`，咖啡师用 `put/take` 阻塞而非忙等，GC 节点噪音和 CPU 忙等双双消除；毒丸模式实现消费者优雅退出。
- **还没有**：IO 这一块还没动——咖啡站的小票日志文件读写还在用 `FileInputStream` 裸读，一个字节一个字节地调系统调用，且乱码风险没有消除。

阿零的变化：他第一次把「并发」和「队列」真正联系在一起——队列不只是放东西的容器，**带等待语义的队列才是并发协作的正确姿势**。`put/take` 两个方法名背后是经过千锤百炼的锁与条件变量。

---

## 十三、对应招聘技能

BlockingQueue 语义与选型、生产者-消费者模式、ArrayBlockingQueue 单锁 vs LinkedBlockingQueue 双锁、SynchronousQueue 手递手、毒丸退出模式、并发集合线程安全边界。

---

## 十四、下一话悬念

出杯台的并发问题解决了，但阿零打开小票日志文件，满屏是 `???`。他用的是 `FileInputStream` 直接读字节，没指定编码——字节流和字符流是两套水管，接头接错了水流出来但口味不对，那叫乱码。

焰焰指着那屏 `???`：「字节本无意义，编码才给它意义。你用错了接头，下一话我们来摸清地下水道的走向——`InputStream`、`Buffered` 装饰器、`InputStreamReader`，一层一层搭对了，乱码才能消失。」

---

## 🎯 随堂练习

**Q1.** `BlockingQueue.put()` 和 `offer()` 的区别？

**Q2.** `ArrayBlockingQueue` 和 `LinkedBlockingQueue` 高并发下哪个吞吐更高？为什么？

**Q3.** `SynchronousQueue` 的容量是多少？`put()` 什么时候返回？

**Q4.** 毒丸模式（Poison Pill）是什么？有什么局限？

**Q5.** 生产者比消费者快，`ArrayBlockingQueue` 容量耗尽后，生产者线程处于什么状态？

**Q6.** `BlockingQueue` 是线程安全的吗？`ArrayDeque` 呢？

**Q7.** `LinkedBlockingQueue` 不指定容量时，默认容量是多少？有什么风险？

**Q8.** `BlockingQueue.drainTo(collection)` 的作用是什么？

**Q9.** `PriorityBlockingQueue` 的 `take()` 保证顺序吗？

**Q10.** 如果想让消费者能够超时放弃等待（不是无限阻塞），应该用哪个方法？

---

> [!答案]
>
> **Q1. `put(e)` 在队满时永久阻塞（直到有空位或线程中断）；`offer(e)` 在队满时立即返回 `false`，不等待。**还有超时版 `offer(e, timeout, unit)`，等待指定时间后若仍满则返回 `false`。
>
> **Q2. `LinkedBlockingQueue` 吞吐更高。**它使用两把独立的 `ReentrantLock`（putLock/takeLock），生产者和消费者可以真正并发操作（各自持有各自的锁）。`ArrayBlockingQueue` 只有一把锁，put 和 take 互斥。
>
> **Q3. 容量为 0。`put()` 在另一个线程调用 `take()` 之前永远阻塞**——生产者必须等到消费者就位，完成"手递手"后才返回。
>
> **Q4. 毒丸是一个特殊哨兵值（如 `"DONE"`），消费者取到它时退出循环。**局限：多个消费者时需要为每个消费者放一个毒丸；若消费者数量动态变化，管理复杂。替代方案：`volatile boolean running`标志位 或 `ExecutorService.shutdown()`。
>
> **Q5. 线程阻塞在 `put()` 内部，处于 `WAITING` 状态**（等待 `notFull` Condition 被唤醒）。JVM 调度器不会主动唤醒它，直到消费者调用 `take()` 取走一个元素后通知 `notFull`。
>
> **Q6. `BlockingQueue` 的所有实现都是线程安全的**（内部有锁/CAS）。**`ArrayDeque` 不是线程安全的**——并发修改会产生不可预期的结果，需要外部同步或改用 `BlockingQueue`。
>
> **Q7. 默认容量是 `Integer.MAX_VALUE`（约21亿），相当于无界。**风险：生产者速度远快于消费者时，队列无限增长，耗尽堆内存，触发 OOM。生产代码应该始终设置合理的有界容量。
>
> **Q8. `drainTo(collection)` 原子地把队列中所有（或最多指定数量）元素移入目标集合**，比循环 `poll()` 效率高（只加一次锁），适合批量消费场景，如攒一批日志再统一写入。
>
> **Q9. 是的，`PriorityBlockingQueue.take()` 保证按优先级顺序返回**（内部维护堆结构，线程安全）。与 `PriorityQueue` 不同，它的 `take()` 在队空时阻塞，适合并发场景。
>
> **Q10. `poll(timeout, TimeUnit)`**——等待指定时间，若队列仍为空则返回 `null`，消费者可据此决定是否继续等待或执行其他逻辑（如定期心跳）。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 CafeQueue.java && java CafeQueue`，生产者-消费者交替输出正确，台中最大值不超过4，最终剩余0；SynchronousQueue 手递手实测通过。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API - BlockingQueue](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/BlockingQueue.html)。`java.util.concurrent` 在 JDK 1.5 引入，JDK 25 无变更。

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
