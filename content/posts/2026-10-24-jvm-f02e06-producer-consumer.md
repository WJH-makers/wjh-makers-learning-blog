---
title: "F2E6 产消协奏曲 — BlockingQueue 与生产者-消费者"
date: "2026-10-24"
series: "jvm-academy"
season: 2
episode: 6
tags: ["Java 25", "BlockingQueue", "生产者-消费者", "并发", "SynchronousQueue"]
excerpt: "出杯台满了咖啡师干等、空了取餐员干瞪眼——BlockingQueue 把等待逻辑内置在队列里，生产者和消费者不用自己写 wait/notify。SynchronousQueue 是手递手窗口，传递即握手。"
---

![JVM 火种纪漫画：f02e06-producer-consumer](/comics/jvm/f02e06-producer-consumer.png)

> **"wait/notify 是手动档，BlockingQueue 是自动挡——功能一样，但你会开错的可能性少了九成。"**
> — 焰焰，关掉一份用 synchronized+wait 实现的生产者-消费者代码

---

## 🎬 开场：出杯台的阻塞问题

> **〔1〕**
> 咖啡站自动化改造：咖啡师线程生产饮品，取餐员线程消费饮品，中间有一个出杯台（容量=4）。问题有两个：
>
> - 出杯台满了，咖啡师应该停下等待，不能强行塞入
> - 出杯台空了，取餐员应该等待，不能一直空轮询

> **〔2〕**
> 阿零拿出 `synchronized + wait/notify` 方案。焰焰直接摇头：「会写对，但太容易写错。你得自己管 `notifyAll` 时机，自己处理虚假唤醒，自己保证锁的获取顺序。」
>
> 「`BlockingQueue` 把这些全包了——`put()` 队满时阻塞，`take()` 队空时阻塞，内部用 `ReentrantLock + Condition` 实现，经过千锤百炼。」

> **〔3〕**
> 「`BlockingQueue` 有三个常用实现：」焰焰列出清单：
>
> - `ArrayBlockingQueue(n)`：有界，底层数组，生产者和消费者共用一把锁
> - `LinkedBlockingQueue(n)`：可选有界，生产者和消费者各一把锁，高并发吞吐更高
> - `SynchronousQueue`：容量=0，生产者必须等消费者就位才能完成传递（手递手）

> **〔4〕**
> 阿零把出杯台换成 `ArrayBlockingQueue(4)`，咖啡师调 `put()`，取餐员调 `take()`。代码量从 60 行缩到 15 行，逻辑清晰如白纸：
>
> ```
> 咖啡师 put(拿铁) → 台未满 → 立即入队
> 咖啡师 put(卡布) → 台已满 → 阻塞等待
> 取餐员 take()   → 取出拿铁 → 咖啡师解除阻塞
> ```

---

## 🔑 核心技术：BlockingQueue 方法矩阵

| 操作 | 抛异常 | 返回特殊值 | 阻塞等待 | 超时等待 |
|---|---|---|---|---|
| 入队 | `add(e)` | `offer(e)` | `put(e)` | `offer(e, t, unit)` |
| 出队 | `remove()` | `poll()` | `take()` | `poll(t, unit)` |
| 查看 | `element()` | `peek()` | — | — |

**生产代码首选 `put/take`（无限等待）或 `offer/poll` 超时版（可设最大等待时间）。**

---

## ⚙️ 代码实录：出杯台生产者-消费者

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

## 🔬 炉底显微镜

> 焰焰用 `jcmd` 查看线程阻塞状态：

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

## 📐 版本边界

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

---

## 🔮 下话预告：F2E7《字节的地下水道》

队列会阻塞了——下一话处理字节。

`InputStream` 是地下水道——裸字节一滴一滴流；`BufferedInputStream` 是蓄水罐——攒够一桶再处理；乱码等于 UTF-8 滤网装错型号。焰焰教阿零看懂乱码的第一性原理，再用 `InputStreamReader` + 正确编码把水道接对。
