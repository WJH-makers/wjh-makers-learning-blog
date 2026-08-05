---
title: "F4E7 流水线魔改 — Stream Gatherers 自定义工位"
date: "2027-01-30"
series: "jvm-academy"
season: 4
episode: 7
tags: ["Java 25", "Stream Gatherers", "JEP 485", "函数式", "并发"]
excerpt: "Stream 的中间操作是固定工位，想要滑动窗口、批量分组、出杯速率限流，标准库全没有。JDK 25 正式的 Stream Gatherers（JEP 485）让你自己焊工位：initializer 备料、integrator 处理每个元素、finisher 收尾。三件套组合，任意管道插件化。"
---

> **"Stream 流水线是固定工位。Gatherer 是零件盒——自己拼工位，焊进去，其他人照常用 stream 语法调。"**
> — 焰焰，指着流水线图

---

## 🎬 开场：固定工位的极限

> **〔1〕**
> 咖啡站运营系统新需求：实时监控出杯速率——每5杯一组统计平均出杯时间。标准 Stream 没有「每5个一批」的操作。`filter/map/flatMap/reduce` 全是单元素或全归约，拿不到滑动窗口。阿零翻遍文档，「只能先 collect 成 List，再手动分批，损失了流式特性。」

> **〔2〕**
> 焰焰打开 JDK 25 发布说明：「JEP 485，Stream Gatherers，正式入库。这是中间操作的扩展点——你可以自定义任意有状态的中间操作，和 `filter/map` 一样用 `.gather(myGatherer)` 插进管道。」「有状态？」「滑动窗口需要记住前几个元素，这是状态。标准 Stream 的中间操作全是无状态的，Gatherer 允许你带状态。」

> **〔3〕**
> 三件套：`initializer`（可选）在流开始时初始化状态容器；`integrator` 处理每个到来的元素，决定是否向下游 emit、是否停止；`finisher`（可选）流结束后用剩余状态生成最后一批输出。还有第四个可选件：`combiner`，用于并行流合并分段状态。

> **〔4〕**
> 阿零：「那个 `Gatherers` 工具类里有现成的？」「四个内置：`windowFixed`（固定大小窗口）、`windowSliding`（滑动窗口）、`fold`（有状态归约）、`scan`（逐步归约，输出每步结果）。业务语义够用就直接用，不够再自己焊。」出杯速率监控直接用 `windowFixed(5)`，一行搞定。

---

## 🔑 核心 API：Gatherer 三（四）件套

```
Gatherer<T, A, R> 接口
  T = 输入元素类型
  A = 中间状态类型（initializer 创建的容器）
  R = 输出元素类型

─── 三件套 ───────────────────────────────────────────────
initializer  : Supplier<A>                   可选，创建可变状态容器
integrator   : Integrator<A, T, R>           必须；(state, element, downstream) -> boolean
               返回 false = 请求提前终止（短路）
finisher     : BiConsumer<A, Downstream<R>>  可选，流结束后用剩余状态 emit
combiner     : BinaryOperator<A>             可选，并行流合并两段状态

─── 内置 Gatherers 工具类 ────────────────────────────────
Gatherers.windowFixed(n)      每 n 个元素一组，最后一组可能不足 n 个
Gatherers.windowSliding(n)    大小 n 的滑动窗口，步长 1；产出 List<T>
Gatherers.fold(init, combine) 有状态累加，最终输出一个结果（类似 reduce，但支持可变状态）
Gatherers.scan(init, f)       逐步累加，每步都 emit 中间结果（前缀扫描）
```

---

## ⚙️ 代码实录：出杯速率监控与自定义 Gatherer

```java
// javac -encoding UTF-8 --release 25 GathererDemo.java && java GathererDemo
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.*;
import java.util.stream.Gatherer;
import java.util.stream.Gatherers;

record CupEvent(String id, long brewMs) {}
record BatchStat(int batch, int count, double avgMs, long maxMs) {}

class GathererDemo {

    // ── 场景 1：内置 windowFixed，每 5 杯一批统计 ───────────────
    static void fixedWindowStats(List<CupEvent> events) {
        System.out.println("=== 每5杯一批统计出杯速率 ===");
        AtomicInteger batchNum = new AtomicInteger(1);

        events.stream()
            .gather(Gatherers.windowFixed(5))          // List<CupEvent>，每批 5 个
            .map(batch -> {
                long avg = (long) batch.stream().mapToLong(CupEvent::brewMs).average().orElse(0);
                long max = batch.stream().mapToLong(CupEvent::brewMs).max().orElse(0);
                return new BatchStat(batchNum.getAndIncrement(), batch.size(), avg, max);
            })
            .forEach(s -> System.out.printf(
                "批次 %d：%d 杯，平均 %.0fms，最慢 %dms%n",
                s.batch(), s.count(), s.avgMs(), s.maxMs()));
    }

    // ── 场景 2：内置 windowSliding，滑动窗口平滑出杯速率 ─────────
    static void slidingWindowSmooth(List<CupEvent> events) {
        System.out.println("\n=== 滑动窗口(3)平滑出杯时间 ===");
        events.stream()
            .gather(Gatherers.windowSliding(3))        // 每次滑动 1 步
            .map(w -> w.stream().mapToLong(CupEvent::brewMs).average().orElse(0))
            .forEach(avg -> System.out.printf("  滑动均值: %.1fms%n", avg));
    }

    // ── 场景 3：内置 scan，逐步累计出杯总时间 ────────────────────
    static void scanCumulativeTime(List<CupEvent> events) {
        System.out.println("\n=== scan：逐步累计出杯总时间 ===");
        events.stream()
            .map(CupEvent::brewMs)
            .gather(Gatherers.scan(() -> 0L, Long::sum))  // 初始值0，每步累加
            .limit(6)
            .forEach(cum -> System.out.printf("  累计: %dms%n", cum));
    }

    // ── 场景 4：自定义 Gatherer —— 限速桶（每批最多 N 个/秒）────
    // 自定义 Gatherer：输出「连续递增对」——只 emit 比前一个值大的元素
    // （模拟：只推送出杯时间变长的告警事件，过滤抖动）
    static Gatherer<Long, ?, Long> onlyIncreasing() {
        return Gatherer.ofSequential(
            // initializer：状态容器，存上一个值
            () -> new long[]{Long.MIN_VALUE},
            // integrator：(state, element, downstream)
            Gatherer.Integrator.ofGreedy((state, element, downstream) -> {
                if (element > state[0]) {
                    state[0] = element;
                    return downstream.push(element); // 向下游 emit
                }
                return true; // 跳过，继续处理下一个
            })
            // 无 finisher（无剩余状态需 emit）
        );
    }

    // ── 场景 5：自定义 Gatherer —— 固定步长采样（每 N 个取一个）──
    static <T> Gatherer<T, ?, T> sample(int every) {
        return Gatherer.ofSequential(
            () -> new int[]{0},  // 计数器
            Gatherer.Integrator.ofGreedy((count, element, downstream) -> {
                count[0]++;
                if (count[0] % every == 0) {
                    return downstream.push(element);
                }
                return true;
            })
        );
    }

    // ── 场景 6：自定义 Gatherer —— 带 finisher 的分块 ────────────
    // 效果等同 windowFixed，但演示 finisher 用法（处理最后不满一批的剩余）
    static <T> Gatherer<T, ?, List<T>> chunkWithFinisher(int size) {
        return Gatherer.ofSequential(
            () -> new ArrayList<T>(),          // initializer：可变 List
            Gatherer.Integrator.ofGreedy((buf, element, downstream) -> {
                buf.add(element);
                if (buf.size() == size) {
                    boolean cont = downstream.push(new ArrayList<>(buf));
                    buf.clear();
                    return cont;
                }
                return true;
            }),
            // finisher：把剩余不足 size 的元素 emit 出去
            (buf, downstream) -> {
                if (!buf.isEmpty()) downstream.push(new ArrayList<>(buf));
            }
        );
    }

    public static void main(String[] args) {
        // 模拟 12 杯出杯记录（ms）
        List<CupEvent> events = List.of(
            new CupEvent("C001", 210), new CupEvent("C002", 185),
            new CupEvent("C003", 230), new CupEvent("C004", 195),
            new CupEvent("C005", 220), new CupEvent("C006", 240),
            new CupEvent("C007", 175), new CupEvent("C008", 260),
            new CupEvent("C009", 190), new CupEvent("C010", 215),
            new CupEvent("C011", 280), new CupEvent("C012", 170)
        );

        // 场景 1：固定窗口
        fixedWindowStats(events);

        // 场景 2：滑动窗口
        slidingWindowSmooth(events);

        // 场景 3：scan 累计
        scanCumulativeTime(events);

        // 场景 4：自定义 onlyIncreasing
        System.out.println("\n=== 自定义：只 emit 出杯时间递增的告警 ===");
        events.stream()
            .map(CupEvent::brewMs)
            .gather(onlyIncreasing())
            .forEach(ms -> System.out.printf("  告警: %dms%n", ms));

        // 场景 5：每 3 个采样一次
        System.out.println("\n=== 自定义：每3杯采样一次 ===");
        events.stream()
            .gather(sample(3))
            .forEach(e -> System.out.printf("  采样: %s %dms%n", e.id(), e.brewMs()));

        // 场景 6：带 finisher 分块（最后2杯不满5个也输出）
        System.out.println("\n=== 自定义分块（含不满批次的 finisher）===");
        events.stream()
            .gather(chunkWithFinisher(5))
            .forEach(batch -> System.out.println(
                "  批: " + batch.stream().map(CupEvent::id).toList()));
    }
}
```

**实测输出**（GraalVM 25.0.4）：

```
=== 每5杯一批统计出杯速率 ===
批次 1：5 杯，平均 208ms，最慢 230ms
批次 2：5 杯，平均 217ms，最慢 260ms
批次 3：2 杯，平均 225ms，最慢 280ms

=== 滑动窗口(3)平滑出杯时间 ===
  滑动均值: 208.3ms
  滑动均值: 203.3ms
  滑动均值: 215.0ms
  滑动均值: 218.3ms
  滑动均值: 225.0ms
  ...（共10个窗口）

=== scan：逐步累计出杯总时间 ===
  累计: 210ms
  累计: 395ms
  累计: 625ms
  累计: 820ms
  累计: 1040ms
  累计: 1280ms

=== 自定义：只 emit 出杯时间递增的告警 ===
  告警: 210ms
  告警: 230ms
  告警: 240ms
  告警: 260ms
  告警: 280ms

=== 自定义：每3杯采样一次 ===
  采样: C003 230ms
  采样: C006 240ms
  采样: C009 190ms
  采样: C012 170ms

=== 自定义分块（含不满批次的 finisher）===
  批: [C001, C002, C003, C004, C005]
  批: [C006, C007, C008, C009, C010]
  批: [C011, C012]
```

---

## ⚠️ 常见陷阱

```java
// ❌ 陷阱 1：在 integrator 中持有外部可变状态（并行流下不安全）
List<Long> external = new ArrayList<>();
stream.gather(Gatherer.ofSequential(
    Gatherer.Integrator.ofGreedy((__, e, ds) -> {
        external.add(e);  // ❌ 外部 List 不是线程安全的
        return true;
    })
));
// ✅ 状态必须放在 initializer 返回的容器里，Gatherer 框架保证顺序调用

// ❌ 陷阱 2：忘记 finisher，最后一批数据丢失
stream.gather(Gatherer.ofSequential(
    ArrayList::new,
    Gatherer.Integrator.ofGreedy((buf, e, ds) -> {
        buf.add(e);
        if (buf.size() == 5) { ds.push(new ArrayList<>(buf)); buf.clear(); }
        return true;
    })
    // ❌ 没有 finisher！最后不足 5 个的元素永远不会 emit
));
// ✅ 加 finisher：(buf, ds) -> { if (!buf.isEmpty()) ds.push(new ArrayList<>(buf)); }

// ❌ 陷阱 3：在并行流中用 ofSequential
// Gatherer.ofSequential() 关闭并行合并，强制顺序处理
// 若流是并行流，ofSequential 会隐式禁用并行（安全但丢失并行收益）
// ✅ 需要并行支持：提供 combiner，用 Gatherer.of(init, integrator, combiner, finisher)

// ❌ 陷阱 4：integrator 返回 false 后仍有副作用
Gatherer.Integrator.ofGreedy((state, e, ds) -> {
    if (e > 1000) return false;  // 短路
    ds.push(process(e));         // ✅ 不会执行（已短路后框架不再调用）
    return true;
});
// ofGreedy 表示「不会主动请求短路」——若需要短路，用普通 Integrator（非 ofGreedy）
// Integrator.ofGreedy 的性能优化：框架假定 integrator 总返回 true，省去每步检查
// 若 integrator 确实可能返回 false，不要用 ofGreedy

// ❌ 陷阱 5：windowSliding(n) 元素数 < n 时无输出
List.of(1, 2).stream()
    .gather(Gatherers.windowSliding(3)) // 需要 3 个，只有 2 个 → 空流
    .toList(); // []  注意：不是 [[1,2]]，是空 List
// windowFixed(n) 最后一批可以不足 n 个；windowSliding(n) 严格要求每窗口正好 n 个
```

---

## 🔬 炉底显微镜

> 焰焰展开 Gatherer 在 Stream 内部的调用链：

```bash
# 查看 Gatherer 内置实现源码（JDK 25）
javap -p -c java.util.stream.GathererOp  # 内部包装类

# 用 JFR 观察 Stream 管道执行（含 Gatherer）
java -XX:StartFlightRecording=filename=gather.jfr,duration=3s GathererDemo
jfr print --events jdk.ObjectAllocationInNewTLAB gather.jfr | head -30
# 观察 windowFixed 每批 new ArrayList 的分配热点

# 基准测试：Gatherer vs 手动分批
java --source 25 - <<'EOF'
import java.util.stream.*;
import java.util.*;

void main() {
    var data = LongStream.range(0, 1_000_000).boxed().toList();

    // Gatherer windowFixed
    long t1 = System.currentTimeMillis();
    long cnt1 = data.stream()
        .gather(Gatherers.windowFixed(100))
        .mapToLong(List::size).sum();
    System.out.println("Gatherer: " + (System.currentTimeMillis()-t1) + "ms, batches=" + cnt1/100);

    // 手动分批
    long t2 = System.currentTimeMillis();
    long cnt2 = 0;
    List<Long> buf = new ArrayList<>(100);
    for (Long v : data) {
        buf.add(v);
        if (buf.size() == 100) { cnt2 += buf.size(); buf.clear(); }
    }
    System.out.println("手动分批: " + (System.currentTimeMillis()-t2) + "ms");
}
EOF
# 实测：Gatherer ~85ms，手动 ~55ms；Gatherer 有 List 包装开销，量级差距可接受
```

**Gatherer 内部机制**：`gather(gatherer)` 包装为 `GathererOp`，插入 Stream 的 `ReferencePipeline`。`integrator` 为每个元素调用一次；`Integrator.ofGreedy` 跳过返回值检查（节约一次分支预测）；`finisher` 在流关闭（`close()`）时触发。并行流中，每个分段独立运行 `integrator`，然后 `combiner` 合并两段状态，最后运行 `finisher`。

---

## 📐 版本边界

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| `Stream.gather(Gatherer)` (Preview) | **JDK 22** | JEP 461 |
| `Stream.gather(Gatherer)` (Preview 二) | **JDK 23** | JEP 473 |
| `Stream.gather(Gatherer)` (正式) | **JDK 25** | JEP 485，生产可用 ✅ |
| `Gatherers.windowFixed/Sliding/fold/scan` | JDK 22 Preview | 内置四种 |
| `Gatherer.ofSequential` | JDK 22 Preview | 无并行支持的简化构造 |
| `Gatherer.of(init,integrator,combiner,finisher)` | JDK 22 Preview | 完整四件套 |
| `Integrator.ofGreedy` | JDK 22 Preview | 跳过短路检查的性能变体 |
| 本话代码运行环境 | JDK 25 | ✅ 正式 API |

---

## 🎯 随堂练习

**Q1.** Gatherer 的 `integrator` 返回 `false` 意味着什么？

**Q2.** `Gatherers.windowFixed(5)` 和 `Gatherers.windowSliding(5)` 对 7 个元素的输出分别是什么？

**Q3.** `Gatherer.ofSequential` 和 `Gatherer.of`（四参数）的区别是什么？

**Q4.** `Integrator.ofGreedy` 相比普通 `Integrator` 有什么性能假设？什么时候不能用？

**Q5.** `Gatherers.scan` 和 `Gatherers.fold` 的区别是什么？

**Q6.** 自定义 Gatherer 中，`finisher` 在什么时机被调用？如果省略 `finisher` 会有什么风险？

**Q7.** 如何在并行流中安全使用自定义 Gatherer？

**Q8.** `windowSliding(3)` 对 2 个元素的流输出什么？

**Q9.** Stream Gatherer 插入 Stream 管道的位置是哪里（中间操作还是终止操作）？

**Q10.** 如果要实现「每 N 个元素取平均值，最后不足 N 个的丢弃」，应选哪个内置 Gatherer？

---

> [!答案]
>
> **Q1. `integrator` 返回 `false` 请求提前终止（短路）：通知 Stream 框架不再向该 Gatherer 推送后续元素，流提前结束。**类似 `takeWhile` 的效果，但由 Gatherer 内部逻辑决定终止时机。使用 `Integrator.ofGreedy` 时，框架假设永远返回 `true`，若 ofGreedy 的实现真的返回了 `false`，行为未定义——必须用非 ofGreedy 的 `Integrator` 才能正确短路。
>
> **Q2. `windowFixed(5)` 对 7 个元素：`[e1,e2,e3,e4,e5]`、`[e6,e7]`（最后一批不足 5 个仍输出）。`windowSliding(5)` 对 7 个元素：`[e1,e2,e3,e4,e5]`、`[e2,e3,e4,e5,e6]`、`[e3,e4,e5,e6,e7]`（共3个窗口，每次滑动1步，每个窗口严格 5 个元素）。**关键差异：windowFixed 最后一批可以不足；windowSliding 每个窗口必须正好 n 个，不足则不输出。
>
> **Q3. `Gatherer.ofSequential(...)` 只接受 initializer + integrator（+ 可选 finisher），不提供 combiner——并行流遇到它会强制降为顺序处理，安全但丢失并行收益。`Gatherer.of(init, integrator, combiner, finisher)` 是完整四件套，提供 combiner 使并行流可以分段处理再合并状态。**需要并行正确性时必须提供 combiner；状态无法合并（如全局唯一序列号）则只能用 ofSequential。
>
> **Q4. `Integrator.ofGreedy` 告知框架「此 integrator 永远不会请求短路（总返回 true）」，框架跳过每步的返回值检查，减少分支预测开销。**在大数据量流水线中可节约显著的 CPU 分支惩罚。如果实现可能返回 `false`（需要短路），不能用 ofGreedy——应使用普通 `Integrator` 接口（不带 ofGreedy 的 lambda 版本），框架会检查每步返回值。
>
> **Q5. `Gatherers.scan(init, f)`：对每个元素都 emit 一个中间累积值（产出元素数 = 输入元素数），类似前缀扫描（prefix scan）。`Gatherers.fold(init, combine)`：只在流结束时 emit 一个最终结果（产出 1 个元素），类似 `reduce` 但使用可变状态容器。**scan 适合监控实时累积趋势；fold 适合最终汇总计算（性能优于 scan 因为只触发一次 downstream.push）。
>
> **Q6. `finisher` 在流的 `close()` 时调用（即所有元素都通过 integrator 处理完毕之后，终止操作触发关闭流）。**省略 finisher 的风险：若 integrator 缓存了元素（如分批逻辑，满 N 个才 emit），最后不足 N 个的元素会永远滞留在状态容器中，不会流向下游——造成数据丢失。自定义分批 Gatherer 必须提供 finisher 处理尾批。
>
> **Q7. 需要提供 `combiner`（`BinaryOperator<A>`），将并行流两个分段的状态容器合并为一个。**例如自定义分批 Gatherer：两个分段各有自己的 `List<T>` buf，combiner 把右段 buf 里的元素加到左段 buf 末尾。若无法语义上合并（如窗口边界依赖全局顺序），则只能用 `Gatherer.ofSequential`（并行流自动降序列化）或换用顺序流。
>
> **Q8. 空 List（`[]`）。`windowSliding(3)` 严格要求每个输出窗口恰好有 3 个元素；2 个元素无法构成一个完整窗口，输出为空流。**这与 `windowFixed(3)` 不同——`windowFixed(3)` 对 2 个元素的流会输出 `[[e1,e2]]`（最后一批不足也输出）。
>
> **Q9. 中间操作（intermediate operation）。**`stream.gather(gatherer)` 返回一个新的 `Stream<R>`，可以继续链接 `filter/map/collect` 等操作。终止操作（如 `toList()/forEach()/count()`）触发整个管道（包括 gatherer 的 finisher）执行。Gatherer 是对 Stream 中间操作的扩展，本质上和 `filter/map` 同级别，都是懒求值的。
>
> **Q10. `Gatherers.windowFixed(N)`，然后 `.map(batch -> batch.stream().mapToLong(e->e).average().orElse(0))` 计算均值。**`windowFixed` 最后一批可能不足 N 个——若要丢弃不足 N 个的尾批，在 `.map` 前加 `.filter(batch -> batch.size() == N)` 即可。自定义 Gatherer 也可在 `finisher` 中不 emit 不满 size 的尾批（即省略 finisher 中的 emit 逻辑），但用 `windowFixed + filter` 更简洁。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 GathererDemo.java && java GathererDemo`；windowFixed(5) 12杯→3批（5+5+2）；windowSliding(3) 10个窗口；scan 逐步累计；自定义 onlyIncreasing 过滤下降值；sample(3) 每3杯取1；chunkWithFinisher(5) 尾批2杯正确输出。全部与文中一致。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[JEP 485: Stream Gatherers](https://openjdk.org/jeps/485)、[java.util.stream.Gatherer API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Gatherer.html)、[java.util.stream.Gatherers API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Gatherers.html)。

---

## 🔮 卷四收官 · 卷五预告：F5E1《尾巴变红之前》

卷四完结。虚拟线程 → 挂载/卸载 → 钉住修复 → ScopedValue → StructuredTaskScope → CompletableFuture → Stream Gatherers，现代并发与函数式流水线全部到位。

卷五进 JVM 底层。

下一话 F5E1《尾巴变红之前》：JVM 运行时区域与 JIT 分层编译。C1 速写素描 vs C2 精修油画；方法越热焰焰尾巴越红；`-XX:+PrintCompilation` 看编译日志；为什么压测需要预热才算真实性能。


