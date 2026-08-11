---
title: 《JVM 火种纪》25 · 并发不散养
date: 2027-01-16
summary: “StructuredTaskScope 在 JDK 25 仍是第五次预览：旧版 ShutdownOnFailure/ShutdownOnSuccess 已被 open + Joiner 取代。阿零用 Java 25 真实 API 看清失败传播、竞速、超时与结构化取消——围栏不是保证线程一定听话，而是保证父作用域不会悄悄把孩子遗留在外面。”
tags: [Java, Java漫画, JVM, StructuredTaskScope, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》25 · 并发不散养

> JVM 火种纪 · 卷四「并发新纪元篇」第 5 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话把请求上下文换成 `ScopedValue`，作用域结束自动失效——可子任务还在散养，fork 出去就不管了。

---

## 一、事故：旧攻略先别抄

上一话把上下文传递改成 `ScopedValue` 之后，阿零想把并发查询也规范一下。下单流程要并发查库存、积分和配送，他翻出一篇教程，第一行就是 `new StructuredTaskScope.ShutdownOnFailure()`。

焰焰瞥了一眼那篇文章的日期——2024 年 3 月——然后把 Java 25 编译器放到桌上：「这段在 JDK 25 已经编不过。JEP 505 把 API 改成了 `StructuredTaskScope.open(...)` 与 `Joiner`，而且仍需 `--enable-preview`。旧教程的代码，在新版本里是语法错误。」

阿零愣住：「那我该怎么写？」「先把旧攻略放一边。这一话我们用 Java 25 的真实 API 写一遍，看清失败传播、竞速、超时与协作式取消的边界——然后你就知道为什么教程会过时，以及怎么判断一份代码是不是还能用。」

---

##二、漫画 · 关上围栏门

![JVM 火种纪漫画：f04e05-structured-scope](/comics/jvm/f04e05-structured-scope.png)

> [!文字版]
> **〔1〕** 咖啡站下单流程要并发查询库存、积分和配送。阿零翻出一篇旧教程，第一行就是 `new StructuredTaskScope.ShutdownOnFailure()`。
>
> **〔2〕** 焰焰把 Java 25 编译器放到桌上：「这段在 JDK 25 已经编不过。JEP 505 把 API 改成了 `StructuredTaskScope.open(...)` 与 `Joiner`，而且仍需 `--enable-preview`。」
>
> **〔3〕** 「那『全部成功才继续』和『谁先成功用谁』怎么写？」阿零问。「默认 `open()` 适合前者；后者用 `Joiner.anySuccessfulResultOrThrow()`。策略不再藏在两个子类里，而是由 joiner 明确表达。」
>
> **〔4〕** 配送服务先失败时，scope 取消仍在执行的兄弟任务；超时到达时，`join()` 抛 `StructuredTaskScope.TimeoutException`，随后 `close()` 等子任务退出。阿零嘴硬：「那它能保证线程立刻停吗？」焰焰摇头：「取消是协作式的——scope 发中断，任务要自己响应。围栏不是保证线程一定听话，而是保证父作用域不会悄悄把孩子遗留在外面。」
>
> **〔5〕** 阿零写了一个三服务并发查询的完整实现。一服务失败，其他两个立刻收到取消信号；超时到了，`join()` 先抛异常，`close()` 再等所有子任务退出。「看见了吗，」焰焰指着代码块的花括号，「生命周期的边界就在这对大括号上——出了这个块，所有子任务要么成功、要么失败、要么被取消，不会有一个还在外面跑。」
>
> **〔6〕** 炉底浮出一个 2019 年的 `ExecutorService` 残影，手里攥着一堆没 `shutdown()` 的线程池：「我们那会儿 fork 出去的任务，要自己记得 `awaitTermination`……谁要是忘了，线程就一直活着。」残影散进火里。

---

## 三、本话目标

- 用 Java 25 的 `StructuredTaskScope.open(...)` 与 `Joiner` 写出可编译运行的代码；
- 区分「全部成功」与「任一成功」两种策略；
- 验证失败传播与超时取消；
- 说清协作式取消的边界；
- 划清 Preview API 的版本风险。

---

## 四、炉内原理图：Java 25 的真实 API 形状

卷一的教训是「把不变量交给编译器守」，上一话是「把清理交给作用域守」。这一话的坑长得又不一样：**子任务的生命周期散落在代码各处**——fork 出去的任务没人管，异常了也不知道，聚合结果时容易漏。

`StructuredTaskScope` 的解法是把子任务的生命周期从「散养」换成「围栏」：

```text
全部成功才继续
  StructuredTaskScope.open()
  fork(...) -> Subtask<T>
  join()     -> 任一失败时抛 FailedException

竞速取任一成功结果
  StructuredTaskScope.open(Joiner.anySuccessfulResultOrThrow())
  join()     -> 直接返回获胜结果

超时
  open(joiner, config -> config.withTimeout(Duration...))
  join()     -> 到期抛 StructuredTaskScope.TimeoutException

自定义完成策略
  实现 StructuredTaskScope.Joiner<T, R>
  不再继承 StructuredTaskScope 并重写 handleComplete(...)
```

JDK 25 的 `StructuredTaskScope` 是预览 API，编译和运行两边都要显式开启：

```bash
javac -encoding UTF-8 --release 25 --enable-preview ScopeDemo.java
java --enable-preview ScopeDemo
```

---

## 五、从上一话继续改代码：三服务并发查询

```java
import java.time.Duration;
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.StructuredTaskScope.Joiner;
import java.util.concurrent.StructuredTaskScope.Subtask;

record OrderInfo(String inventory, int points, String delivery) {}

class ScopeDemo {
    static String queryInventory(String item) throws InterruptedException {
        Thread.sleep(80);
        return "库存: " + item + " x3";
    }

    static int queryPoints(String userId) throws InterruptedException {
        Thread.sleep(120);
        return 850;
    }

    static String queryDelivery(String addr) throws InterruptedException {
        Thread.sleep(60);
        return "配送: 明日达 -> " + addr;
    }

    static String queryDeliveryFail(String addr) throws InterruptedException {
        Thread.sleep(30);
        throw new RuntimeException("配送服务超时");
    }

    static OrderInfo aggregateAll(String item, String userId, String addr)
            throws InterruptedException {
        try (var scope = StructuredTaskScope.<Object>open()) {
            Subtask<String> inv = scope.fork(() -> queryInventory(item));
            Subtask<Integer> pts = scope.fork(() -> queryPoints(userId));
            Subtask<String> del = scope.fork(() -> queryDelivery(addr));

            scope.join();
            return new OrderInfo(inv.get(), pts.get(), del.get());
        }
    }

    static OrderInfo aggregateWithFailure(String item, String userId, String addr)
            throws InterruptedException {
        try (var scope = StructuredTaskScope.<Object>open()) {
            Subtask<String> inv = scope.fork(() -> queryInventory(item));
            Subtask<Integer> pts = scope.fork(() -> queryPoints(userId));
            Subtask<String> del = scope.fork(() -> queryDeliveryFail(addr));

            scope.join();
            return new OrderInfo(inv.get(), pts.get(), del.get());
        }
    }

    static String raceFastest(String query) throws InterruptedException {
        try (var scope = StructuredTaskScope.open(
                Joiner.<String>anySuccessfulResultOrThrow())) {
            scope.fork(() -> { Thread.sleep(150); return "源A: " + query; });
            scope.fork(() -> { Thread.sleep(80); return "源B: " + query; });
            scope.fork(() -> { Thread.sleep(200); return "源C: " + query; });
            return scope.join();
        }
    }

    static OrderInfo aggregateWithTimeout(String item, String userId, String addr)
            throws InterruptedException {
        try (var scope = StructuredTaskScope.<Object, Void>open(
                Joiner.awaitAllSuccessfulOrThrow(),
                config -> config.withTimeout(Duration.ofMillis(100)))) {
            Subtask<String> inv = scope.fork(() -> queryInventory(item));
            Subtask<Integer> pts = scope.fork(() -> queryPoints(userId));
            Subtask<String> del = scope.fork(() -> queryDelivery(addr));

            scope.join();
            return new OrderInfo(inv.get(), pts.get(), del.get());
        }
    }

    public static void main(String[] args) throws Exception {
        System.out.println(aggregateAll("拿铁", "user-001", "北京朝阳"));

        try {
            aggregateWithFailure("拿铁", "user-001", "北京朝阳");
        } catch (StructuredTaskScope.FailedException expected) {
            System.out.println("失败传播: " + expected.getCause().getMessage());
        }

        System.out.println(raceFastest("咖啡因含量"));

        try {
            aggregateWithTimeout("拿铁", "user-001", "北京朝阳");
        } catch (StructuredTaskScope.TimeoutException expected) {
            System.out.println("超时取消");
        }
    }
}
```

本机 Java 25.0.4 的实际输出:

```text
OrderInfo[inventory=库存: 拿铁 x3, points=850, delivery=配送: 明日达 -> 北京朝阳]
失败传播: 配送服务超时
源B: 咖啡因含量
超时取消
```

---

## 六、故意翻一次车：用旧 API 编译新版本

阿零想知道——如果他照抄那篇 2024 年教程的代码，在 JDK 25 上会发生什么。他把旧代码原样粘贴进来。

**第一次翻车**：用已废弃的 `ShutdownOnFailure`。

```java
// 错误：JDK 25 已经移除这个子类
var scope = new StructuredTaskScope.ShutdownOnFailure();
scope.fork(() -> queryInventory(item));
scope.join();
scope.throwIfFailed();
```

**第二次翻车**：忘记 `--enable-preview`。

```bash
javac --release 25 ScopeDemo.java
# error: StructuredTaskScope is a preview API and is disabled by default.
```

旧 API 在 JDK 25 里已经不存在，新 API 还在预览——这就是为什么焰焰让阿零先把旧攻略放一边。

---

## 七、编译官罚单

> **📋 编译官罚单 · 预览 API 的两道门**
>
> 门一，旧 API 在 JDK 25 已经移除（Java 25 实测）：
>
> ```text
> error: cannot find symbol
> var scope = new StructuredTaskScope.ShutdownOnFailure();
>                                     ^
>   symbol:   class ShutdownOnFailure
>   location: class StructuredTaskScope
> ```
>
> 门二，新 API 需要 `--enable-preview`（实测）：
>
> ```text
> error: StructuredTaskScope is a preview API and is disabled by default.
> (use --enable-preview to enable preview APIs)
> ```
>
> 两张罚单都开在**编译期**。那篇 2024 年教程在当时的 JDK 版本里是对的，但 API 形状在预览期间改了——这就是 Preview API 的版本风险：**每次预览都可能改 API，直到正式转正才稳定**。

---

## 八、修复并验证

修复不是改回旧 API，是**用 Java 25 的新 API 重写**：`StructuredTaskScope.open(...)` + `Joiner`。锁上之后，上面两段代码都要按新形状写。

验证判据分三条，都要真跑出来：

1. **全部成功聚合**：三个服务都成功，`join()` 正常返回，`get()` 拿到结果。
2. **失败传播**：一个服务失败，`join()` 抛 `FailedException`，其余任务被取消。
3. **超时取消**：超时到达，`join()` 抛 `TimeoutException`，所有任务被取消。

正常路径的验证（GraalVM 25.0.4 实测输出）：

```text
OrderInfo[inventory=库存: 拿铁 x3, points=850, delivery=配送: 明日达 -> 北京朝阳]
失败传播: 配送服务超时
源B: 咖啡因含量
超时取消
```

四行全部对上预期。注意第 2 行：配送服务抛异常后，`join()` 把它包装成 `FailedException` 抛出——**scope 不会静默吞掉子任务的异常**。第 3 行：竞速取最快，B 先返回，A 和 C 被取消。

---

## 九、🔬 炉底显微镜 · scope 发出取消与任务响应中断

> 焰焰在炉底贴了一张流程图：「取消不是一步到位的——scope 发中断，任务要自己响应。」

```bash
# 必须同时开启预览 API
javac --release 25 --enable-preview ScopeDemo.java
java --enable-preview \
  -XX:StartFlightRecording=filename=scope.jfr,duration=10s,settings=profile \
  ScopeDemo

# 观察虚拟线程与中断事件
jfr summary scope.jfr
jfr print --events jdk.VirtualThreadStart,jdk.VirtualThreadEnd scope.jfr

# 对仍在运行的进程导出线程信息
jcmd <pid> Thread.dump_to_file -format=json scope-threads.json
```

观测时要区分三件事：scope 发出了取消、线程收到了中断、任务真正结束。前两项不自动证明第三项——任务代码仍要正确响应中断。

---

## 十、⏳ 版本时光机 · StructuredTaskScope 走了六轮预览

**版本边界**

| JDK | 状态 | 关键变化 |
|---|---|---|
| 19/20 | Incubator | JEP 428/437 |
| 21/22 | Preview / Second Preview | JEP 453/462 |
| 23/24 | Third / Fourth Preview | JEP 480/499 |
| 25 | **Fifth Preview** | JEP 505；改为 `open()` + `Joiner` |
| 26 | **Sixth Preview** | JEP 525；发布前仍需再核对 |

因此本话固定在 Java 25 API 形状，不把它称为「正式生产 API」，也不把旧的 `ShutdownOnFailure`/`ShutdownOnSuccess` 示例冒充 Java 25 实测。

---

## 十一、三条不能省略的边界

1. **Preview 不是正式 API。** JDK 25 的代码升级到 JDK 26 时要重新编译，因为 JEP 525 又进行了一轮预览。
2. **取消是协作式的。** scope 会向未完成线程发出中断，但吞掉 `InterruptedException` 或长期执行不可中断本地调用的任务仍可能拖延关闭。
3. **`Subtask.get()` 只对 `SUCCESS` 有效。** 失败或被取消的任务不会自动变成一个可读取的「异常值」；先让 `join()` 决定整体结果。

`CompletableFuture` 也不是因此过时。事件驱动的长链编排、跨生命周期异步对象仍可能更适合 CF；结构化 scope 更适合一个请求块内边界清楚的 fork/join 聚合。

---

## 十二、项目检查点 · 豆豆咖啡站 jvm-v3.5

- **已具备**：请求上下文改用 `ScopedValue`（v3.4）；子任务生命周期关进 `StructuredTaskScope`，失败传播与超时取消都由 scope 管理，不会散养。
- **还没有**：多步异步编排还没有决策天平——什么时候用 `StructuredTaskScope`、什么时候用 `CompletableFuture`，阿零还分不清；`CompletableFuture` 的超时、链式组合与异常处理也还没学。

阿零的变化：卷一他学会了「把不变量交给编译器守」，上一话他学会了「把清理交给作用域守」，这一话他第一次遇到 **Preview API 的版本风险**——代码今天能跑，明年可能要改。于是他学会了看 JEP 编号、查版本状态，不再照抄教程就当真理。

---

## 十三、对应招聘技能

`StructuredTaskScope`（JEP 505）、`Joiner` 策略、失败传播与超时取消、协作式中断、Preview API 版本边界、fork/join 聚合模式。

---

## 十四、下一话悬念

围栏建好了，但不是所有并发都适合一个词法作用域。

下一话把 `CompletableFuture` 的跨阶段编排与 `StructuredTaskScope` 的请求内聚合放到同一张决策表里——三方比价场景摆出决策天平：编排/超时/合并用 CF，同步直写用虚拟线程，什么时候混用、什么时候单用。

---

| 25 | **Fifth Preview** | JEP 505；改为 `open()` + `Joiner` |
| 26 | **Sixth Preview** | JEP 525；发布前仍需再核对 |

因此本文固定在 Java 25 API 形状,不把它称为“正式生产 API”,也不把旧的 `ShutdownOnFailure`/`ShutdownOnSuccess` 示例冒充 Java 25 实测。

---

## 🎯 随堂练习

**Q1.** JDK 25 使用 Structured Concurrency 是否需要 `--enable-preview`？

**Q2.** “全部成功才继续”和“任一成功即可”分别用什么入口？

**Q3.** JDK 25 如何配置 scope 超时？

**Q4.** 子任务收到取消后是否保证立刻停止？

**Q5.** 为什么不能继续照抄 `new ShutdownOnFailure()`？

> [!答案]
>
> **Q1. 需要。** 编译用 `javac --release 25 --enable-preview`,运行也要 `java --enable-preview`。
>
> **Q2.** 全部成功用 `StructuredTaskScope.open()` 或 `Joiner.awaitAllSuccessfulOrThrow()`；竞速用 `Joiner.anySuccessfulResultOrThrow()`。
>
> **Q3.** 在三参数形状的 `open(joiner, configurer)` 中调用 `config.withTimeout(Duration...)`;到期时 `join()` 抛 `StructuredTaskScope.TimeoutException`。
>
> **Q4. 不保证立刻停止。** 取消依赖线程中断和任务协作；`close()` 会等待子任务终止,因此不响应中断的代码会拖慢父作用域退出。
>
> **Q5.** 那是 JDK 24 及更早预览版的 API 形状。JEP 505 在 JDK 25 改为工厂方法与 Joiner,旧代码不能作为 Java 25 的可运行示例。

---

## 运行环境、验证与依据

- **运行环境**：Oracle GraalVM 25.0.4+7.1，Windows 11，UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 --enable-preview ScopeDemo.java && java --enable-preview ScopeDemo`；四条路径均在本机实际编译运行。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[JEP 505: Structured Concurrency (Fifth Preview)](https://openjdk.org/jeps/505)、[JEP 525: Structured Concurrency (Sixth Preview)](https://openjdk.org/jeps/525)、[Java 25 StructuredTaskScope API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/StructuredTaskScope.html)。

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*

