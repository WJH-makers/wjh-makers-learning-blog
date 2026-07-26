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

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
