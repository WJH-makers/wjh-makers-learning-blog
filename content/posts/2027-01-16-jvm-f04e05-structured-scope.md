---
title: "F4E5 并发不散养 — StructuredTaskScope 第五次预览"
date: "2027-01-16"
series: "jvm-academy"
season: 4
episode: 5
tags: ["Java 25", "StructuredTaskScope", "结构化并发", "虚拟线程", "Preview API"]
excerpt: "StructuredTaskScope 在 JDK 25 仍是第五次预览：旧版 ShutdownOnFailure/ShutdownOnSuccess 已被 open + Joiner 取代。用可运行的 Java 25 示例看清失败传播、竞速、超时与结构化取消。"
---

![JVM 火种纪漫画：f04e05-structured-scope](/comics/jvm/f04e05-structured-scope.png)

> **“结构化并发的价值不是少写几行,而是让子任务的生命周期、失败和取消都回到同一个代码块里。”**
> — 焰焰,关上围栏门

---

## 🎬 开场:旧攻略先别抄

> **〔1〕**
> 咖啡站下单流程要并发查询库存、积分和配送。阿零翻出一篇旧教程,第一行就是 `new StructuredTaskScope.ShutdownOnFailure()`。

> **〔2〕**
> 焰焰把 Java 25 编译器放到桌上:「这段在 JDK 25 已经编不过。JEP 505 把 API 改成了 `StructuredTaskScope.open(...)` 与 `Joiner`,而且仍需 `--enable-preview`。」

> **〔3〕**
> 默认 `open()` 适合“所有任务都要成功”;`Joiner.anySuccessfulResultOrThrow()` 适合“谁先成功用谁”。策略不再藏在两个子类里,而是由 joiner 明确表达。

> **〔4〕**
> 配送服务先失败时,scope 取消仍在执行的兄弟任务;超时到达时,`join()` 抛 `StructuredTaskScope.TimeoutException`,随后 `close()` 等子任务退出。围栏不是“保证线程一定听话”,而是保证父作用域不会悄悄把孩子遗留在外面。

---

## 🔑 Java 25 的真实 API 形状

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

JDK 25 的 `StructuredTaskScope` 是预览 API,编译和运行两边都要显式开启:

```bash
javac -encoding UTF-8 --release 25 --enable-preview ScopeDemo.java
java --enable-preview ScopeDemo
```

---

## ⚙️ 代码实录:三服务并发查询

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

## ⚠️ 三条不能省略的边界

1. **Preview 不是正式 API。** JDK 25 的代码升级到 JDK 26 时要重新编译,因为 JEP 525 又进行了一轮预览。
2. **取消是协作式的。** scope 会向未完成线程发出中断,但吞掉 `InterruptedException` 或长期执行不可中断本地调用的任务仍可能拖延关闭。
3. **`Subtask.get()` 只对 `SUCCESS` 有效。** 失败或被取消的任务不会自动变成一个可读取的“异常值”;先让 `join()` 决定整体结果。

`CompletableFuture` 也不是因此过时。事件驱动的长链编排、跨生命周期异步对象仍可能更适合 CF；结构化 scope 更适合一个请求块内边界清楚的 fork/join 聚合。

---

## 🔬 炉底显微镜

```bash
# 必须同时开启预览 API
javac --release 25 --enable-preview ScopeDemo.java
java --enable-preview \
  -XX:StartFlightRecording=filename=scope.jfr,duration=10s \
  ScopeDemo

# 观察虚拟线程与中断事件；事件是否出现取决于录制配置与实际执行路径
jfr summary scope.jfr
jfr print --events jdk.VirtualThreadStart,jdk.VirtualThreadEnd scope.jfr

# 对仍在运行的进程导出线程信息
jcmd <pid> Thread.dump_to_file -format=json scope-threads.json
```

观测时要区分三件事:scope 发出了取消、线程收到了中断、任务真正结束。前两项不自动证明第三项;任务代码仍要正确响应中断。

---

## 📐 版本边界

**版本边界**

状态核对于 2026-08-06。

| JDK | 状态 | 关键变化 |
|---|---|---|
| 19/20 | Incubator | JEP 428/437 |
| 21/22 | Preview / Second Preview | JEP 453/462 |
| 23/24 | Third / Fourth Preview | JEP 480/499 |
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

- **运行环境**:Oracle GraalVM 25.0.4+7.1,Windows 11,UTF-8。
- **验证方式**:`javac -encoding UTF-8 --release 25 --enable-preview ScopeDemo.java && java --enable-preview ScopeDemo`;四条路径均在本机实际编译运行。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[JEP 505: Structured Concurrency (Fifth Preview)](https://openjdk.org/jeps/505)、[JEP 525: Structured Concurrency (Sixth Preview)](https://openjdk.org/jeps/525)、[Java 25 StructuredTaskScope API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/StructuredTaskScope.html)。

---

## 🔮 下话预告:F4E6《何时仍需未来》

围栏建好了,但不是所有并发都适合一个词法作用域。下一话把 `CompletableFuture` 的跨阶段编排与 Structured Concurrency 的请求内聚合放到同一张决策表里。
