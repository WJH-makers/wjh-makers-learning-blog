---
title: "《从零开始学 Java》77 · 异步编排:CompletableFuture"
date: 2026-11-03
summary: "门闩等得齐,票据却拼不动:Future.get 一喊,阿零在取餐口罚站。CompletableFuture 把磨豆、奶泡、烤杯编成自动接力的传送带;可他在 thenApply 里打了个两秒长途,公共池被占满,连并行流都跟着冻结。"
tags: [Java, Java漫画, CompletableFuture, 异步编程, 线程池, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》77 · 异步编排:CompletableFuture

> 连载特刊 · 番外卷二「并发深水区」第 8 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——等齐会等了;可一杯咖啡的磨豆、打奶泡、烤杯明明能同时干,这次让流水线自己接力。

---

## 一、事故:门闩等得齐,票据拼不动

上一话的门闩解决了「等齐」。冬歇特训第八天,豆豆的考题是招牌「冬日三重奏」:磨豆 300ms、打奶泡 200ms、烤杯 250ms,三件事互不相干。阿零掏出线程池加 `Future`:

```java
try (var pool = Executors.newFixedThreadPool(3)) {
    String powder = pool.submit(Bar::grind).get();   // 提交完立刻 get:罚站 300ms
    String froth  = pool.submit(Bar::froth).get();   // 再罚 200ms
    String cup    = pool.submit(Bar::warmCup).get(); // 再罚 250ms —— 并行写成了串行
}
```

豆豆:「`get` 一喊你就石化。就算先全提交再统一 `get`,三张票据也**拼不到一起**——『奶泡好了自动去找豆粉』这种事 Future 干不了,它只有两招:阻塞的 `get`,轮询的 `isDone`。**阻塞、不可组合**,就是它的两宗罪。」

---

## 二、漫画 · 会自己接力的传送带

> **〔1〕** 阿零攥着三张 Future 票据,对第一张大喊「get!」,整个人瞬间石化,身后订单排成长龙。
> 豆豆:「异步提交、同步傻等,等于没异步。」

> **〔2〕** JVM 城主推开线程调度中心的侧门:一条公共流水线,牌匾写着 **ForkJoinPool.commonPool**,工人只有 CPU 核数减一个。
> JVM 城主:「全 JVM 共用这一条线——并行流、CompletableFuture 默认都来这儿排队。」

> **〔3〕** 豆豆铺开三条传送带:磨豆、奶泡、烤杯各走各的,末端自动汇成一杯,汇合口印着 `thenCombine`。
> 豆豆:「CompletableFuture 是**会自己往下传的票据**:上一站一完成,下一站自动开工,没人罚站。」

> **〔4〕** 阿零往传送带上偷偷装了台电话机(打给库存服务,一通两秒),整条公共流水线的工人全举着听筒发呆,隔壁并行流的货堆成山。
> 豆豆(叼着豆子叉腰):「公共池是全店共用的,你拿它打长途?」

---

## 三、本话目标

- 说清 `Future.get` 两宗罪:阻塞、不可组合;
- 用 `thenApply` / `thenCompose` / `thenCombine` 编排依赖与汇流,建立 map/flatMap 直觉;
- 用 `allOf` / `anyOf` 等齐或抢答,掌握 allOf 收结果的 `join` 姿势;
- 打通异常三通道与 `orTimeout` / `completeOnTimeout` 超时兜底;
- 刻死纪律:**默认公共池只干快活,阻塞 IO 必须自带线程池**。

---

## 四、原理图:一张会接力的票据

```text
supplyAsync(任务)                  开工,默认排进 ForkJoinPool.commonPool
  .thenApply(值 -> 新值)            同步变换:拿到结果加工一下(map 直觉)
  .thenCompose(值 -> 新票据)        接力另一段异步:拍平不套娃(flatMap 直觉)
  .thenCombine(另一票据, (a,b)->c)  两条传送带汇流
  .orTimeout(1, SECONDS)           超时按失败算,抛 TimeoutException(JDK 9+)
  .completeOnTimeout(默认值, …)     超时给默认值,不算失败(JDK 9+)
  .join()                          最后一刻才取货

Async 后缀:thenApply   = 完成上一步的线程顺手干(若已完成,就是调用线程自己干);
           thenApplyAsync = 重新排队——默认还是 commonPool,重载可传自己的 Executor。
```

异常走的是专用通道,三个口子别混:

| 通道 | 直觉 | 用途 |
|---|---|---|
| `exceptionally(e -> 兜底值)` | 只在出错时被叫到 | catch + 默认值 |
| `handle((v, e) -> 新值)` | 成败都经过,可换结果 | 统一收口转换 |
| `whenComplete((v, e) -> {})` | 成败都看一眼,**不改结果** | 记日志埋点,异常原样下传 |

等齐与抢答:

```java
var tasks = List.of(grind, froth, warm);
var all = CompletableFuture.allOf(tasks.toArray(CompletableFuture[]::new)) // CF<Void>:只管"齐了"
        .thenApply(v -> tasks.stream().map(CompletableFuture::join).toList());
var fastest = CompletableFuture.anyOf(豆商A报价, 豆商B报价);                 // 谁先回用谁
```

> **豆豆旁白**:`allOf` 返回 `CompletableFuture<Void>`,结果要回各张票据上 `join` 收——但放在 allOf **之后**收,票据都已完成,`join` 一下就取到,不会阻塞。这就是标准收结果姿势。

> **🔀 豆豆的多解台 · 异步三段位**

| 段位 | 代码要点 | 适合什么时候 | 坑 |
|---|---|---|---|
| 裸线程 + 回调 | `new Thread(() -> cb.accept(work()))` | 一次性玩具代码 | 回调地狱;异常没人接;线程数失控 |
| `Future.get` | `pool.submit(task)`,要用时 `get()` | 单步异步、结果马上要 | get 阻塞;票据无法组合;超时兜底全靠手写 |
| CompletableFuture | `supplyAsync` + `thenXxx` 声明式流水线 | 多步依赖、汇流、超时、兜底 | 默认公共池;忘传 Executor 就是本话事故 |

豆豆锐评:两步以上的异步依赖,默认 CompletableFuture——把「等」改写成「声明下一步」,线程腾出去干别的;但请把这句刻在吧台上:**公共池只干快活**。

---

## 五、从上一话继续改:三重奏传送带

把 #76 里「门闩等齐 + 主线程手工拼装」那段整体替换成自动汇流:

```java
import java.util.concurrent.*;

public class Bar {
    static String grind()   { return work(300, "深烘豆粉"); }
    static String froth()   { return work(200, "绵密奶泡"); }
    static String warmCup() { return work(250, "热杯"); }

    static String work(long ms, String out) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { throw new IllegalStateException(e); }
        return out;
    }

    public static void main(String[] args) {
        var grind = CompletableFuture.supplyAsync(Bar::grind);
        var froth = CompletableFuture.supplyAsync(Bar::froth);
        var cup = grind.thenCombine(froth, (g, f) -> g + " + " + f)
                .thenCombine(CompletableFuture.supplyAsync(Bar::warmCup),
                             (mix, c) -> mix + " 注入 " + c)
                .orTimeout(1, TimeUnit.SECONDS)
                .exceptionally(e -> "兜底速溶(原因:" + e.getCause() + ")");
        IO.println(cup.join());   // ≈300ms 出杯:三线并行,自动汇流,超时有兜底
    }
}
```

而「下单后查库存」这种**下一步本身也是异步**的场景,就是 thenApply 和 thenCompose 的分水岭:

```java
CompletableFuture<CompletableFuture<Integer>> 套娃 = order.thenApply(o -> stock.queryAsync(o));
CompletableFuture<Integer>                    拍平 = order.thenCompose(o -> stock.queryAsync(o));
```

值到值,`thenApply`;值到「另一张票据」,`thenCompose`——和 Stream 的 map/flatMap 同一个直觉。

---

## 六、故意制造一个 Bug:在 thenApply 里打长途

新需求:出杯前调一次库存服务(HTTP,约两秒)。阿零顺手一挂:

```java
static int queryStockBlocking(String bean) {   // 模拟 HTTP 调库存:阻塞 2 秒
    try { Thread.sleep(2_000); } catch (InterruptedException e) { throw new IllegalStateException(e); }
    return 42;
}

for (int i = 0; i < 100; i++) {                // 100 张订单涌进来
    CompletableFuture.supplyAsync(Bar::grind)
            .thenApply(Bar::queryStockBlocking)   // ← 故意:阻塞 IO 挂上公共池工人
            .thenApply(n -> "库存 " + n);
}
var total = sales.parallelStream().mapToLong(Sale::cups).sum(); // #68 的月度统计,同池
```

不带 Async 的 `thenApply` 由**完成上一步的线程顺手执行**——这里就是 commonPool 工人。工人只有核数减一个,一人一通两秒长途。

---

## 七、观察现象:全店流水线冻结

出杯从毫秒级掉到十几秒,月度统计一动不动。`jstack` 一看:

```text
"ForkJoinPool.commonPool-worker-1" #32 daemon prio=5 os_prio=0 cpu=1.83ms elapsed=37.52s tid=0x000002... nid=0x5f10 waiting on condition  [0x000000d8...]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
	at java.base/java.lang.Thread.sleepNanos0(java.base@25/Native Method)
	at java.base/java.lang.Thread.sleepNanos(java.base@25/Thread.java:496)
	at java.base/java.lang.Thread.sleep(java.base@25/Thread.java:527)
	at Bar.queryStockBlocking(Bar.java:21)
	at java.base/java.util.concurrent.CompletableFuture$UniApply.tryFire(CompletableFuture.java:646)
```

同样姿势的 worker 有核数减一个——**全体举着电话**。commonPool 是全 JVM 共享的计算池,专为短平快的 CPU 活设计;被阻塞 IO 占满后,所有借用它的人——并行流(回看第 68 话)、别人家的 CompletableFuture——一起陪葬。这不是慢,是**店级传染**。

> **🎯 面试直击**:thenApply 和 thenCompose 什么区别?默认线程池是谁、坑在哪?
> thenApply 接「值→值」,若下一步本身返回 CompletableFuture 会得到套娃;thenCompose 接「值→票据」并拍平——正是 map 与 flatMap 的关系。默认执行者是 ForkJoinPool.commonPool:全 JVM 共享、线程数约为核数减一、专为 CPU 短任务设计,塞进阻塞 IO 会占满工人,连并行流一起拖死。追问点:IO 密集怎么办?——用 *Async 重载传自定义 Executor,快慢活分池。

---

## 八、修复:阻塞活自带线程池

快活留在公共池,长途电话挪进自家 IO 池:

```java
static final ExecutorService IO_POOL =
        Executors.newFixedThreadPool(16, Thread.ofPlatform().name("io-", 0).factory());

CompletableFuture.supplyAsync(Bar::grind)                     // CPU 快活:公共池
        .thenApplyAsync(Bar::queryStockBlocking, IO_POOL)     // 阻塞 IO:自带池
        .thenApply(n -> "库存 " + n);                          // 快活:顺手接着干
```

JUnit 质检员:「证据呢?」

```java
import org.junit.jupiter.api.Test;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

class BarTest {
    @Test
    void blocking_step_runs_on_custom_pool() {
        try (var ioPool = Executors.newFixedThreadPool(4,
                Thread.ofPlatform().name("io-", 0).factory())) {
            String worker = CompletableFuture.supplyAsync(() -> "深烘豆")
                    .thenApplyAsync(b -> Thread.currentThread().getName(), ioPool)
                    .join();
            assertTrue(worker.startsWith("io-"));   // 阻塞步不再占公共池
        }
    }

    @Test
    void timeout_falls_back_to_instant_coffee() {
        String cup = CompletableFuture.supplyAsync(() -> Bar.work(500, "手冲"))
                .orTimeout(100, TimeUnit.MILLISECONDS)
                .exceptionally(e -> "兜底速溶")
                .join();
        assertEquals("兜底速溶", cup);
    }
}
```

两条全绿:阻塞步的执行线程名以 `io-` 开头,公共池重新只干快活;超时不再挂死,兜底速溶顶上。

---

## 九、项目检查点 · 豆豆咖啡站 v9.8

```text
咖啡站形态:三工序自动接力汇流,约 300ms 出杯;超时有兜底,阻塞 IO 有自带线程池
已具备  :thenApply/thenCompose/thenCombine 编排;allOf 收结果的 join 姿势;异常三通道;
          orTimeout/completeOnTimeout;公共池纪律(快慢活分池)
还没有  :编排再丝滑,一位顾客仍要占一条平台线程——十万在线顾客的坐席从哪来
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| CompletableFuture 编排(thenApply/thenCompose/thenCombine/allOf) | 异步接口聚合标配,中高级 Java 岗必问 |
| 默认线程池纪律(commonPool vs 自定义 Executor) | 生产事故高频源头,讲得清是硬加分 |
| 异常通道与超时兜底(exceptionally/handle/orTimeout) | 稳定性设计基本功 |

---

## 十一、下一话悬念

编排是丝滑了。豆豆却把技术债账本翻到夹页——来年大促目标:**十万在线顾客**。阿零掰着指头数:平台线程金贵,一人陪一位顾客,几千条就能把线程调度中心挤爆,十万条想都别想。

豆豆眯起眼:「要不,一人发一个分身?」

> 下一话《百万顾客:虚拟线程》:让 JVM 城主亲自演示,怎么用便宜到近乎免费的「分身线程」,把「一人一杯」撑到十万在线。

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. `Future` 接口的「两宗罪」指的是什么?
   - A) 不支持异步和不能取消　　B) `get()` 阻塞调用线程直到结果就绪,且无法对多个 Future 的结果做组合(一个等完才能处理下一个)　　C) 内存泄漏和线程泄漏　　D) 不支持超时和不支持中断

2. `thenApply` 和 `thenCompose` 的核心区别是什么?
   - A) 没有区别,只是方法名不同　　B) `thenApply` 的 Function 返回一个值,`thenCompose` 的 Function 返回一个 `CompletionStage`(通常是另一个 `CompletableFuture`)——`thenCompose` 用于扁平化,避免 `CompletableFuture<CompletableFuture<T>>` 这种嵌套　　C) `thenApply` 是异步的,`thenCompose` 是同步的　　D) `thenCompose` 只在异常时调用

3. `CompletableFuture.allOf(cf1, cf2, cf3)` 返回什么?
   - A) 三个 Future 结果的 List　　B) `CompletableFuture<Void>`——当所有 cf 都完成时,这个 Void Future 也完成;如果需要取各 cf 的结果,需要在 allOf 后分别 join/get 各 cf　　C) 第一个完成的 Future 的结果　　D) 所有结果的聚合对象

4. 处理 `CompletableFuture` 异常的三种方法:① `exceptionally`(只处理异常,返回默认值)② `handle`(无论正常还是异常都调用,接收 (result, throwable)) ③ `whenComplete`(类似 handle 但不改变返回值) — 以下哪个场景必须用 `handle` 而不能用 `exceptionally`?
   - A) 只在意异常,需要返回 fallback 值　　B) 需要同时处理正常结果和异常——如:正常时 log 结果,异常时 log 异常,且**延续正常的返回值给下游**　　C) 只需要在完成时执行清理操作　　D) 需要将异常转换为不同的异常类型

5. `CompletableFuture` 默认使用哪个线程池执行异步任务?
   - A) 一个专门的 `CompletableFuture` 线程池　　B) `ForkJoinPool.commonPool()`——JDK 的公共 ForkJoinPool,并行度为 CPU 核数 - 1　　C) `Executors.newCachedThreadPool()`　　D) 主线程

6. 以下代码中,`blockingIO()` 是阻塞 IO 操作。这段代码有什么问题?

```java
CompletableFuture.supplyAsync(() -> blockingIO())
    .thenAccept(result -> process(result));
```

- A) 没有问题,CompletableFuture 会自动处理阻塞 IO　　B) `supplyAsync` 默认使用公共 ForkJoinPool——阻塞 IO 会占用 ForkJoinPool 的有限工作线程(核数 - 1 个),导致所有使用公共池的异步任务都被卡住(线程饥饿),应改用 `supplyAsync(() -> blockingIO(), customExecutor)` 传入自定义线程池　　C) `thenAccept` 不能处理阻塞 IO 的结果　　D) 阻塞 IO 不能放在 `supplyAsync` 中

7. `thenCombine(cf1, cf2, (r1, r2) -> merge(r1, r2))` 的执行时机是?
   - A) cf1 或 cf2 任一完成时　　B) cf1 和 cf2 都完成后,merge 函数被调用,接收两个结果并返回组合结果　　C) cf1 完成后立即调用 merge,不管 cf2 的状态　　D) 在调用 `thenCombine` 时立即执行

8. 以下哪个 `CompletableFuture` 方法用来实现「两个异步任务中,谁先返回就用谁的结果,另一个结果丢弃」?
   - A) `allOf(cf1, cf2)`　　B) `anyOf(cf1, cf2)`　　C) `thenCombine(cf1, cf2, merger)`　　D) `runAfterBoth(cf1, cf2, action)`

9. `thenApply`、`thenApplyAsync`、`thenApplyAsync(Function, Executor)` 三个变体,线程选择规则是什么?
   - A) `thenApply`:在完成当前 Future 的同一个线程中执行;`thenApplyAsync()`:在公共 ForkJoinPool 中执行;`thenApplyAsync(fn, executor)`:在指定的 executor 中执行　　B) 三者没有区别,由 JVM 随机选择　　C) `thenApply` 永远在主线程执行　　D) `thenApplyAsync` 永远创建新线程

10. 关于 `CompletableFuture` 与虚拟线程(Virtual Threads)的配合,以下哪个说法最准确?
   - A) `CompletableFuture` 和虚拟线程不能一起使用　　B) 虚拟线程的出现,让 `CompletableFuture` 在某些场景下变得不必要——如果每个异步任务用一个虚拟线程执行(阻塞 IO 时自动 mount/unmount),代码风格可以保持同步式,不需要 thenApply/thenCompose 的链式回调;但 CPU 密集型的异步编排仍然需要 `CompletableFuture` 的结构化并发能力　　C) 虚拟线程替代了 `CompletableFuture`　　D) `CompletableFuture` 只能在虚拟线程上运行

### 解答题(5 道)

1. 用代码对比 `Future` 和 `CompletableFuture` 在执行「取用户信息 → 取用户订单 → 取订单详情」这个串行依赖链时的写法差异,并指出 `CompletableFuture` 解决了什么问题。

2. `thenApply`、`thenCompose`、`thenCombine`——三者的函数签名和组合语义分别是什么?给一个「查询用户 → 用 userId 查询订单(依赖) → 同时查询用户积分(并行) → 合并订单和积分」的链式调用,说明每一步用了哪个方法。

3. 你的咖啡站订单处理:① 接收订单(O) ② 并行执行:准备饮品(D)和准备小食(S) ③ D 和 S 都完成后,打包(P) ④ 如果任一步失败(如原料不足),整个订单标记为失败并返回错误信息。请用 `CompletableFuture` 写出完整的异步编排链,并解释异常处理的决策——为什么在这个链上用 `handle` 而不是 `exceptionally`?

4. 你维护的报表服务,某个接口逻辑:拉取 5 个数据源(数据库、缓存、外部 API),用 `allOf` 聚合。最近发现接口偶尔超时——排查发现某个外部 API 端响应时慢时而快,但 `allOf` 必须等所有源返回。请设计改进方案:不要求所有数据源成功,只需要「3/5 个数据源在 500ms 内返回」即可降级返回。要求使用 `CompletableFuture` 组合原语(不要引入外部框架)。

5. 虚拟线程时代,`CompletableFuture` 还是必需的吗?请分析:① 阻塞 IO 场景:虚拟线程如何改变「阻塞 IO 不能占公共 ForkJoinPool」这个问题 ② CPU 密集型异步编排:虚拟线程能替代 `CompletableFuture` 的组合/编排能力吗 ③ 异常处理:`CompletableFuture` 的异常三通道在虚拟线程下如何替代?写出你的判断:哪些场景保留 `CompletableFuture`,哪些用虚拟线程 + 同步风格重写?

> [!答案]
> **1-1** B(get 阻塞 + 不可组合——不能链式处理结果,不能组合多个 Future 的结果,不能优雅处理异常,这导致 Future 只能做最简单的异步任务)  
> **举一反三**:Future 的原始 API 就像只能跑一次的飞镖——扔出去(`submit`)后只能等在靶子前(`get`)看结果。CompletableFuture 是「飞镖 + 接力棒 + 汇合站」——扔出去后可以连后续动作,多根接力棒一起汇合,全程不用在靶子前站等。
>
> **1-2** B(`thenApply` 返回普通的 T,`thenCompose` 返回 `CompletionStage<U>`——其中关键的「flatMap」语义:当处理函数本身返回 `CompletableFuture<U>` 时,用 `thenApply` 会得到 `CompletableFuture<CompletableFuture<U>>` 的嵌套,而 `thenCompose` 自动扁平化为 `CompletableFuture<U>`)  
> **举一反三**:`thenApply` 类比 `map`,`thenCompose` 类比 `flatMap`——和 Stream API 完全对应。如果需要调用一个返回 Future 的方法(如 `asyncDB.query(id)` 返回 `CompletableFuture<Data>`),只能用 `thenCompose`。
>
> **1-3** B(返回 `CompletableFuture<Void>`——它是一个「等齐」的信号,完成表示所有子 Future 都完成了。要取各自结果,在 `allOf(...).thenRun(() -> { String r1 = cf1.join(); })` 中 join——因为 allOf 完成时各 cf 必然已完成,join 立即返回不阻塞)  
> **举一反三**:`allOf` 不会返回聚合结果,它只负责「等齐」。这是一种典型的设计——分离「同步控制」和「结果提取」。如果需要一个真正的 `List<Result>`,用 `allOf(...).thenApply(v -> futures.stream().map(CompletableFuture::join).toList())` 包装一层。
>
> **1-4** B(handle 的签名是 `BiFunction<? super T, Throwable, ? extends U>`——正常时接收 (result, null),异常时接收 (null, throwable)。如果需要在**两种情况下都执行业务逻辑、且不改变下游链类型**,只能用 handle;exceptionally 只在异常时调用且返回值替代原值;whenComplete 不改变返回值)  
> **举一反三**:异常三通道的选型口诀:只需异常回退→`exceptionally`,需同时看正常和异常→`handle`,只需旁观(记日志/监控)→`whenComplete`。注意 `whenComplete` 不会吃掉异常,异常继续向下传播。
>
> **1-5** B(ForkJoinPool.commonPool()——并行度 = Runtime.getRuntime().availableProcessors() - 1,至少为 1。这意味着在 8 核机器上,公共池只有 7 个工作线程)  
> **举一反三**:公共池被整个 JVM 共享——所有 `CompletableFuture`、`parallelStream()`、ForkJoinTask 默认都用它。阻塞 IO 放在公共池上会让这 7 个线程全被卡住,其他异步任务全堵死。这就是「必须传入自定义线程池」的根本原因。
>
> **1-6** B(阻塞 IO 占用公共 ForkJoinPool → 线程饥饿——公共池只有 CPU 核数-1 个线程,阻塞 IO 把有限的线程全卡住,其他使用公共池的异步任务(如 parallelStream、其他 CompletableFuture)无法执行。修法:`supplyAsync(heavyIO, Executors.newCachedThreadPool())`)  
> **举一反三**:区分「CPU 密集」和「IO 密集」是选池的根本依据。CPU 密集:用 ForkJoinPool(线程数 = 核数),不阻塞。IO 密集:用 CachedThreadPool 或自定义固定大小(线程数 = 核数 × 2 或更多),允许阻塞。
>
> **1-7** B(cf1 和 cf2 都完成时,merge 函数接收两者结果,返回组合结果——`thenCombine` 是「双输入、单输出」的二元组合操作)  
> **举一反三**:`thenCombine` 是并行编排的核心——它不要求 cf1 和 cf2 之间存在依赖(它们是并行的),只等两者都完成后合并。如果 cf2 依赖 cf1 的结果,应该用 `thenCompose` 而不是 `thenCombine`。
>
> **1-8** B(`anyOf`——返回一个新的 CompletableFuture,当传入的任意一个 cf 完成时,这个新 cf 就以该 cf 的结果完成(类型是 Object)。其他未完成的 cf 的结果被忽略,但那些 cf 仍在后台运行)  
> **举一反三**:`anyOf` 的适用场景——① 多副本请求,谁先返回用谁 ② 超时降级:`anyOf(realFuture, timeoutFuture)`,设一个延时 Future 和真实 Future 赛跑。但注意 `anyOf` 返回 Object,需要手动转型。
>
> **1-9** A(不带 Async:在完成前驱 Future 的线程中同步执行(fn 的计算和 Future 的完成在同一个线程);带 Async 无参数:在公共 ForkJoinPool.commonPool() 中执行;带 Async + Executor:在指定的线程池中执行)  
> **举一反三**:选型口诀:CPU 轻量计算→`thenApply`(省一次线程切换),CPU 重计算→`thenApplyAsync`(不阻塞前驱所在的线程),IO 操作→`thenApplyAsync(fn, ioPool)`(坚决不占公共池)。
>
> **1-10** B(虚拟线程让「同步风格写异步代码」成为现实——阻塞 IO 时虚拟线程自动 mount/unmount,不需要回调。但 CPU 密集型的任务编排(多个计算任务并行后合并)仍然需要 `CompletableFuture` 的组合能力;且 `CompletableFuture` + 结构化并发(`StructuredTaskScope`)的结合比纯 CompletableFuture 更清晰)  
> **举一反三**:JDK 21+ 的推荐范式:IO 密集 → 虚拟线程(同步写,自动 mount/unmount);CPU 密集编排 → `CompletableFuture.supplyAsync(compute, ForkJoinPool)`;两者混合 → `StructuredTaskScope` 替代复杂的 `allOf`/`anyOf` 编排。
>
> **2-1** Future 写法:
> ```java
> Future<User> userF = pool.submit(() -> getUser());
> User user = userF.get();  // 阻塞
> Future<List<Order>> ordersF = pool.submit(() -> getOrders(user.getId()));
> List<Order> orders = ordersF.get();  // 又阻塞
> Future<OrderDetail> detailF = pool.submit(() -> getDetail(orders.get(0).getId()));
> OrderDetail detail = detailF.get();  // 再阻塞
> ```
> CompletableFuture 写法:
> ```java
> CompletableFuture.supplyAsync(() -> getUser())
>     .thenCompose(user -> supplyAsync(() -> getOrders(user.getId()))) // 返 CF,扁平化
>     .thenCompose(orders -> supplyAsync(() -> getDetail(orders.get(0).getId())))
>     .thenAccept(detail -> process(detail));
> ```
> 解决的问题:① get 不阻塞——thenCompose/thenAccept 注册回调,结果就绪时自动执行 ② 链式编排——每一步的输出自动成为下一步的输入,不需要手动 get 传参 ③ 异常可以沿链传播,最后统一用 exceptionally/handle 捕获。  
> **举一反三**:Future 和 CompletableFuture 的差别是「拉」和「推」的差别——Future 是调用方主动拉取结果(get 阻塞式 pull),CompletableFuture 是结果就绪后主动推给回调(fn 注册 push)。push 模式天然适合异步组合。
>
> **2-2** 函数签名:① `thenApply(Function<? super T,? extends U> fn)`——同步函数,T→U,返回 `CF<U>`。② `thenCompose(Function<? super T,? extends CompletionStage<U>> fn)`——异步函数,T→CF\<U\>,返回 `CF<U>`(扁平化)。③ `thenCombine(CompletionStage<? extends U> other, BiFunction<? super T,? super U,? extends V> fn)`——两个并行 CF 的结果合并,(T,U)→V,返回 `CF<V>`。链式调用:
> ```java
> CompletableFuture<User> userCF = supplyAsync(() -> getUser());
>
> // 查询订单(依赖 user)
> CompletableFuture<List<Order>> ordersCF = userCF.thenCompose(user ->
>     supplyAsync(() -> getOrders(user.getId()))
> );
> // 同时并行查询积分(也依赖 user)
> CompletableFuture<Integer> pointsCF = userCF.thenCompose(user ->
>     supplyAsync(() -> getPoints(user.getId()))
> );
> // 合并订单和积分
> ordersCF.thenCombine(pointsCF, (orders, points) ->
>     new UserReport(orders, points)   // 双向合并
> ).thenAccept(report -> process(report));
> ```
> 每一步选型:user→orders 依赖(用 thenCompose),user→points 也依赖(用 thenCompose),orders 和 points 并行不依赖(用 thenCombine)。这就是典型的「依赖分析 + 并行化」的异步编排模式。  
> **举一反三**:编排的决策树:① 单个 CF 的结果→普通值:thenApply ② 单个 CF 的结果→新 CF:thenCompose ③ 两个独立 CF:thenCombine ④ 两个有依赖的 CF:CF_A.thenCompose(结果→CF_B) ⑤ 三个及以上 CF 都完成:allOf。
>
> **2-3** 异步编排链:
> ```java
> CompletableFuture<Order> orderCF = supplyAsync(() -> receiveOrder());
>
> CompletableFuture<Drink> drinkCF = supplyAsync(() -> prepareDrink());
> CompletableFuture<Snack> snackCF = supplyAsync(() -> prepareSnack());
>
> orderCF.thenCombine(
>     drinkCF.thenCombine(snackCF, (d, s) -> new Meal(d, s)),
>     (order, meal) -> pack(order, meal)
> ).handle((pkg, ex) -> {
>     if (ex != null) {
>         log.error("订单失败", ex);
>         return new FailureResult(ex.getMessage());
>     }
>     return new SuccessResult(pkg);
> }).thenAccept(result -> sendToCustomer(result));
> ```
> 选 `handle` 而不是 `exceptionally` 的原因:`handle` 的 BiFunction 在正常和异常时都调用,既能处理异常(返回 FailureResult),也保留正常路径(返回 SuccessResult)——下游 `thenAccept` 看到的是统一的 Result 类型,不需要再区分正常和异常分支。如果用 `exceptionally`,只能处理异常(返回默认值),丢失了正常结果的处理逻辑。用 `whenComplete` 只能旁观,无法将异常转换为业务 Result,不适合。  
> **举一反三**:handle 是防御式编程在 CompletableFuture 中的最佳体现——它把「异常和非异常」的分叉统一成一条输出链,下游不需要 try-catch 判断。这在微服务编排(调用 A/B/C 服务,任一失败返回降级结果)中特别实用。
>
> **2-4** 改进方案——用 `anyOf` + 降级超时实现「3/5 快速通道」:
> ```java
> List<CompletableFuture<Data>> allSources = List.of(
>     supplyAsync(() -> fetchDB()),
>     supplyAsync(() -> fetchCache()),
>     supplyAsync(() -> fetchAPI1()),
>     supplyAsync(() -> fetchAPI2()),
>     supplyAsync(() -> fetchAPI3())
> );
>
> // 给每个 source 加一个超时降级器
> List<CompletableFuture<Optional<Data>>> withTimeout = allSources.stream()
>     .map(f -> f.thenApply(Optional::of)
>                .applyToEither(timeoutFuture(500), opt -> opt)  // 超时返回空 Optional
>                .exceptionally(ex -> Optional.empty()))
>     .toList();
>
> // 计数:3 个有数据就够
> CompletableFuture<List<Data>> result = CompletableFuture.supplyAsync(() -> {
>     int ready = 0;
>     List<Data> datas = new ArrayList<>();
>     for (var f : withTimeout) {
>         Optional<Data> opt = f.getNow(Optional.empty()); // 非阻塞获取
>         opt.ifPresent(datas::add);
>         if (++ready >= 3 && datas.size() >= 3) break; // 够 3 个就停
>     }
>     return datas;
> });
> ```
> 更优雅的方案——批量 join + 超时:
> ```java
> CompletableFuture<List<Data>> fastest3 = CompletableFuture.supplyAsync(() -> {
>     List<Data> results = new CopyOnWriteArrayList<>();
>     List<CompletableFuture<Void>> futures = allSources.stream()
>         .map(f -> f.thenAccept(results::add))
>         .toList();
>     try {
>         CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
>             .orTimeout(500, TimeUnit.MILLISECONDS)  // JDK 9+
>             .exceptionally(ex -> null)  // 超时抛异常,降级处理
>             .join();
>     } catch (CompletionException e) { /* 超时,已有部分结果 */ }
>     return results;
> });
> ```
> 核心思路:不用 `allOf` 强制全部完成,给每个源加超时,收集已完成的结果直到 ≥3 个,未完成的源不关心(它们最终会超时或被 GC)。  
> **举一反三**:`allOf` 是全等模式(强一致),业务上很多场景是「多数派」(弱一致)就够了——降级的本质是放宽一致性要求换延迟。这类似于读写库的「读所有 + 等多数」策略,或者分布式共识的 Raft majority 思想。
>
> **2-5** ① 阻塞 IO 场景:虚拟线程让「占池子」不再存在——每个虚拟线程在阻塞 IO 时 mount 回平台线程(OS 线程),不阻塞公共池。可以安全地 `Thread.ofVirtual().start(() -> blockingIO())` 并放到任意线程池,因为线程只占内存不占排程。`ForkJoinPool` 的饥饿问题被根除。② CPU 密集型编排:虚拟线程**不能替代**——虚拟线程不加速 CPU 计算,它只是让阻塞 IO 不占资源。CPU 密集的并行计算(如模糊图像、解压缩)仍需要 `CompletableFuture` 或 ForkJoinTask 做真正的多核并行。③ 异常处理:同步风格的 try-catch 在虚拟线程中同样有效,不需要 `exceptionally`/`handle` 的三通道模式。判断:IO 密集且业务顺序清晰→用虚拟线程+同步代码,代码可读性和调试便利性碾轧 CompletableFuture 回调。CPU 密集且需要并行拆分/合并→保留 `CompletableFuture.supplyAsync(compute, pool)`。既有 IO 又有 CPU,结构化并发 `StructuredTaskScope` + 虚拟线程——`fork` 出子虚拟线程处理 IO → `join` 所有子线程 → 拿到 IO 结果后在主线程做 CPU 计算总合并。  
> **举一反三**:虚拟线程的时代,技术选型不再二选一——虚拟线程处理 IO 密集(任务数 >> 核数),CompletableFuture 处理 CPU 密集(任务数 ≈ 核数),StructuredTaskScope 作为两者之间的组织者。三者的职责清晰分离,不强求一个工具打全部。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*