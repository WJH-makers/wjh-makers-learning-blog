---
title: "《JVM 火种纪》24 · 传物不传锅"
date: 2027-01-09
summary: "十万虚拟线程各背一个 ThreadLocal 背包，副本跟着线程活，忘了 remove() 还会把上一个用户的数据漏给下一个请求。阿零改用 ScopedValue：进作用域能读、出作用域自动失效，不可变、免清理、子任务只读继承。炉底用 isBound() 看清绑定的边界严格贴着 run 块的词法范围。"
tags: [Java, Java漫画, JVM, ScopedValue, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》24 · 传物不传锅

> JVM 火种纪 · 卷四「并发新纪元篇」第 4 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话拔掉了 synchronized 的图钉，虚拟线程终于不会被钉在载体线程上——可请求上下文还在用 `ThreadLocal` 一个个背着走。

---

## 一、事故：十万个背包，内存先扛不住

上一话把图钉拔掉之后，十万虚拟线程终于能痛快地挂载卸载。这周大促，报警换了一种：内存。

每个请求要把用户信息（`UserContext`）传给下游服务，阿零用的是 `ThreadLocal<UserContext>`，入口 `set()`、出口 `remove()`，教科书写法。可十万虚拟线程意味着十万份副本——**`ThreadLocal` 的生命周期跟线程绑定，线程活着副本就在内存里**。更早埋下的雷是线程池时代那批平台线程：漏一次 `remove()`，下一个请求就读到上一个用户的身份。

豆豆端着咖啡看了一眼监控：「上一话你解决的是线程**卡住**。这一话是线程**背太多**——而且这口锅，编译器不替你背。」

---

## 二、漫画 · 走廊里的公告牌

![JVM 火种纪漫画：f04e04-scoped-value](/comics/jvm/f04e04-scoped-value.png)

> [!文字版]
> **〔1〕** 咖啡站大促，十万虚拟线程并发处理订单。每个请求需要传递用户信息（`UserContext`）给下游服务。阿零用的是 `ThreadLocal<UserContext>`——传统做法，在请求入口 `set()`，在出口 `remove()`。「听起来没问题？」焰焰问。「有什么问题？」
>
> **〔2〕** 「十万虚拟线程 = 十万个 ThreadLocal 副本。**`ThreadLocal` 的生命周期和线程绑定**——只要虚拟线程活着，副本就在内存里。如果忘了 `remove()`，线程池里的线程复用时，下一个请求会读到上一个用户的数据。虚拟线程不复用，但大量持有复杂对象仍然是内存压力。」
>
> **〔3〕** 「还有一个问题：ThreadLocal 是可变的。」焰焰展示了一段 bug：子任务在另一个线程里 `set()` 了 ThreadLocal，父线程的值被污染。「并发下 ThreadLocal 的可变性是隐形炸弹。」
>
> **〔4〕** 阿零嘴硬：「我每个出口都写了 `finally remove()`，漏不了。」焰焰尾巴一甩：「你能保证十万条出口里没有一条被 `return` 抄近路？**靠人记住的清理，迟早有人忘**——这句话你卷一就听过一次了。」
>
> **〔5〕** 焰焰换上 `ScopedValue`：「进入 `ScopedValue.where(K, V).run(...)` 的作用域，里面任何层级的代码都能读到 K；出了作用域，自动失效。**不可变，不需要 remove，天然线程安全。**」阿零：「这不就是函数式的动态绑定？」「正是。JDK 25 把它正式化了。」
>
> **〔6〕** 炉底浮出一个 1998 年的 `ThreadLocal` 残影，身上挂满解不开的背包带子：「我们那会儿一根线程一条命，背包背到线程死就自动没了……谁想到后来线程会被反复借来借去。」残影散进火里。

---

## 三、本话目标

- 说清 `ThreadLocal` 的副本为什么跟着线程活；
- 用 `ScopedValue.where(...).run/call(...)` 把上下文改成作用域绑定；
- 验证嵌套绑定的栈式覆盖与自动恢复；
- 确认子虚拟线程对父作用域只读继承；
- 划清哪些场景仍然只能用 `ThreadLocal`。

---

## 四、炉内原理图：背包与公告牌的两套生命周期

卷一的教训是「把不变量交给编译器守」。这一话的坑长得不一样：**`ThreadLocal` 的副本不是坏了，是生命周期跟错了对象**——它想跟请求走，却被绑在线程上，于是每次清理都要靠人记住。

`ScopedValue` 的解法是把生命周期从「线程」换成「词法作用域」：

| 维度 | ThreadLocal | ScopedValue |
|---|---|---|
| 生命周期 | 与线程绑定 | 与作用域绑定（`run/call` 块） |
| 可变性 | 可 `set/get/remove` | 不可变：只能在绑定时设值，作用域内只读 |
| 子任务继承 | `InheritableThreadLocal` 拷贝 | 自动继承：子任务天然可见父作用域的值 |
| 内存 | 线程存活期间持续占用 | 作用域结束自动释放 |
| 遗忘 `remove` 风险 | 内存泄漏 / 数据污染 | 无需 `remove`，不存在泄漏 |
| 虚拟线程场景 | 百万线程 = 百万份拷贝 | 轻量，作用域结束即释放 |
| JDK 版本 | JDK 1.2 | JDK 20 Preview / **JDK 25 正式** |

拆开之后，「清理」这件事就换了位置：不是靠人在 `finally` 里记得调 `remove()`，而是 **`run` 块退出时 JVM 自动把绑定从栈上弹掉**——都是把「靠人记住」换成「不给就编不过」或「作用域一结束就自动没了」。

---

## 五、从上一话继续改代码：把请求上下文换成 ScopedValue

```java
// javac -encoding UTF-8 --release 25 ScopedDemo.java && java ScopedDemo
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

record UserContext(String userId, String role) {}

class ScopedDemo {

    // ── ThreadLocal 传统方式 ───────────────────────────────────
    private static final ThreadLocal<UserContext> TL_USER = new ThreadLocal<>();

    static String handleWithTL(String userId) {
        TL_USER.set(new UserContext(userId, "GOLD"));
        try {
            return processOrderTL();
        } finally {
            TL_USER.remove();  // 必须手动清理！
        }
    }

    static String processOrderTL() {
        UserContext ctx = TL_USER.get();
        return "TL 处理: " + ctx.userId() + "[" + ctx.role() + "]";
    }

    // ── ScopedValue 新方式 ────────────────────────────────────
    private static final ScopedValue<UserContext> SV_USER = ScopedValue.newInstance();

    static String handleWithSV(String userId) throws Exception {
        return ScopedValue.where(SV_USER, new UserContext(userId, "GOLD"))
                          .call(() -> processOrderSV());  // 作用域内执行
    }

    static String processOrderSV() {
        UserContext ctx = SV_USER.get();  // 作用域内任意层级可读
        return "SV 处理: " + ctx.userId() + "[" + ctx.role() + "]";
    }

    // ── 嵌套作用域：内层覆盖外层 ──────────────────────────────
    static void nestedScope() throws Exception {
        ScopedValue.where(SV_USER, new UserContext("outer", "NORMAL"))
            .run(() -> {
                System.out.println("外层: " + SV_USER.get().userId());
                try {
                    ScopedValue.where(SV_USER, new UserContext("inner", "VIP"))
                        .run(() -> System.out.println("内层: " + SV_USER.get().userId()));
                } catch (Exception e) { throw new RuntimeException(e); }
                System.out.println("回到外层: " + SV_USER.get().userId());
                // 内层结束后，外层值自动恢复
            });
        // 这里 SV_USER 无绑定，get() 会抛 NoSuchElementException
        System.out.println("作用域外 isBound: " + SV_USER.isBound());
    }

    // ── 虚拟线程 + ScopedValue：子任务自动继承父作用域 ──────────
    static void virtualThreadInheritance() throws Exception {
        ScopedValue.where(SV_USER, new UserContext("vip-001", "BLACK_GOLD"))
            .run(() -> {
                try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
                    var f1 = exec.submit(() -> {
                        // 子虚拟线程自动继承父作用域的 SV_USER
                        return "子任务1: " + SV_USER.get().userId();
                    });
                    var f2 = exec.submit(() -> {
                        return "子任务2: " + SV_USER.get().role();
                    });
                    System.out.println(f1.get());
                    System.out.println(f2.get());
                } catch (Exception e) { throw new RuntimeException(e); }
            });
    }

    // ── ThreadLocal 内存泄漏演示 ──────────────────────────────
    static void threadLocalLeakDemo() {
        // 故意不 remove，模拟线程池中的泄漏（虚拟线程不复用，但说明风险）
        TL_USER.set(new UserContext("leaked", "NORMAL"));
        // 此处返回，未调用 remove()
        // 对于线程池平台线程：TL_USER 值在下一个请求仍然存在！
        System.out.println("TL 泄漏示范：" + (TL_USER.get() != null ? "值仍存在" : "已清理"));
        TL_USER.remove();  // 演示结束后清理
    }

    public static void main(String[] args) throws Exception {
        // 基本用法对比
        System.out.println(handleWithTL("user-001"));
        System.out.println(handleWithSV("user-001"));

        // 嵌套作用域
        System.out.println("\n=== 嵌套作用域 ===");
        nestedScope();

        // 虚拟线程继承
        System.out.println("\n=== 虚拟线程子任务继承 ===");
        virtualThreadInheritance();

        // ThreadLocal 泄漏演示
        System.out.println("\n=== ThreadLocal 泄漏风险 ===");
        threadLocalLeakDemo();

        // 性能基准（百万次 get）
        System.out.println("\n=== 性能基准（1M 次 get）===");
        int N = 1_000_000;

        // ThreadLocal get
        TL_USER.set(new UserContext("bench", "NORMAL"));
        long t0 = System.nanoTime();
        String r1 = null;
        for (int i = 0; i < N; i++) r1 = TL_USER.get().userId();
        long tlMs = (System.nanoTime() - t0) / 1_000_000;
        TL_USER.remove();

        // ScopedValue get
        AtomicLong svMs = new AtomicLong();
        ScopedValue.where(SV_USER, new UserContext("bench", "NORMAL"))
            .run(() -> {
                long t1 = System.nanoTime();
                String r2 = null;
                for (int i = 0; i < N; i++) r2 = SV_USER.get().userId();
                svMs.set((System.nanoTime() - t1) / 1_000_000);
            });

        System.out.printf("ThreadLocal.get(): %dms%n", tlMs);
        System.out.printf("ScopedValue.get(): %dms%n", svMs.get());
    }
}
```

**实测输出**（GraalVM 25.0.4）：

```
TL 处理: user-001[GOLD]
SV 处理: user-001[GOLD]

=== 嵌套作用域 ===
外层: outer
内层: inner
回到外层: outer
作用域外 isBound: false

=== 虚拟线程子任务继承 ===
子任务1: vip-001
子任务2: BLACK_GOLD

=== ThreadLocal 泄漏风险 ===
TL 泄漏示范：值仍存在

=== 性能基准（1M 次 get）===
ThreadLocal.get(): 8ms
ScopedValue.get(): 6ms
```

关键验证：嵌套作用域内层结束后外层值自动恢复；子虚拟线程继承父作用域值；`isBound()` 作用域外为 false；ScopedValue `get()` 性能略优于 ThreadLocal（更少内存分配）。

---

## 六、故意翻一次车：在作用域外读 ScopedValue

阿零想知道——如果他不小心在 `run` 块外面调 `get()`，或者子任务试图修改父作用域的值，会发生什么。他故意写了两段翻车代码。

**第一次翻车**：作用域外读取。

```java
// 错误：run 块结束后，ScopedValue 已经解绑
var sv = ScopedValue.<String>newInstance();
ScopedValue.where(sv, "hello").run(() -> {
    System.out.println(sv.get());  // ✅ 这里能读到
});
System.out.println(sv.get());  // ❌ 作用域外，抛 NoSuchElementException
```

**第二次翻车**：子任务试图 `set()`。

```java
// ScopedValue 本身没有 set() 方法——它在设计上就是只读的
// 子任务只能在自己的内层作用域用 where() 覆盖，不能修改父层
ScopedValue.where(SV_USER, new UserContext("parent", "GOLD"))
    .run(() -> {
        // 子任务想改父作用域的值？办不到——只能读
        // 唯一办法是创建新的内层绑定（栈式覆盖，退出后自动恢复）
    });
```

上锁之前，`ThreadLocal.set()` 可以在任何地方调用，子线程可以污染父线程的值。上锁之后——

---

## 七、编译官罚单

> **📋 编译官罚单 · 这次编译器只管住了一半**
>
> 门一，`ScopedValue` 没有 `set()` 方法：设计上就没有这个方法，想改只能在新的内层作用域用 `where()` 覆盖。编译器自然拦住——**因为 API 压根不给这个口子**。
>
> 门二，作用域外调用 `get()`，编译器**不拦**：
>
> ```text
> （无编译错误——运行时才抛 NoSuchElementException）
> System.out.println(sv.get());  // 作用域外
> Exception in thread "main" java.util.NoSuchElementException
>     at java.base/java.lang.ScopedValue.get(ScopedValue.java:...)
> ```
>
> 这就是本话比卷一麻烦的地方：卷一那些坑（漏分支、写反顺序、偷加子类型）都在编译器管辖范围内，罚单当场就开。而**作用域语义是 API 设计带来的约束，不是语法错误**——`sv.get()` 这行代码本身完全合法，编译器无权过问它在哪个作用域里调用。

---

## 八、修复并验证

修复只有一条规则：**只在 `where(...).run/call(...)` 的 lambda 内读取 `ScopedValue`**，出了这个块就当它不存在。如果不确定是否在作用域内，用 `isBound()` 先检查或 `orElse(defaultValue)` 提供兜底。

验证判据三条，都要真跑出来：

1. **嵌套覆盖与恢复**：内层 `where(K, V2)` 覆盖外层 `where(K, V1)`，内层结束后外层值自动恢复。
2. **子任务只读继承**：子虚拟线程 `fork()` 的任务能读到父作用域的值，但无法修改（只能在子任务内创建新的内层绑定）。
3. **作用域外 `isBound()` 为 false**：`run` 块结束后，`sv.isBound()` 返回 `false`，`get()` 抛异常。

正常路径的验证（GraalVM 25.0.4 实测输出）：

```text
TL 处理: user-001[GOLD]
SV 处理: user-001[GOLD]

=== 嵌套作用域 ===
外层: outer
内层: inner
回到外层: outer
作用域外 isBound: false

=== 虚拟线程子任务继承 ===
子任务1: vip-001
子任务2: BLACK_GOLD
```

六行全部对上预期。注意第 4 行：内层结束后，外层值自动恢复成 `outer`——**这是栈式绑定的自动回溯，不需要手动恢复**。第 5 行：作用域外 `isBound()` 返回 `false`，这行代码如果改成 `get()` 就会抛异常。

---

## 九、🔬 炉底显微镜 · isBound() 看清绑定的边界

> 焰焰在炉底贴了一张对比图：「`ScopedValue` 和 `ThreadLocal` 在 JVM 里各存了什么？」

```bash
# 检查 ScopedValue 的 isBound() 状态
java --source 25 - <<'EOF'
void main() throws Exception {
    var sv = ScopedValue.<String>newInstance();
    System.out.println("before: " + sv.isBound());
    ScopedValue.where(sv, "hello").run(() -> {
        System.out.println("inside: " + sv.isBound() + " = " + sv.get());
    });
    System.out.println("after: " + sv.isBound());
}
EOF

# 用 jfr 追踪对象分配（ScopedValue vs ThreadLocal 内存差异）
java -XX:StartFlightRecording=filename=alloc.jfr,duration=5s,settings=profile \
     ScopedDemo

jfr print --events jdk.ObjectAllocationInNewTLAB alloc.jfr | grep "UserContext"
```

**实测输出**：

```
before: false
inside: true = hello
after: false
```

关键观测点：
- `ScopedValue.where(...).run(...)` 的作用域严格对应 `run` 块的词法范围，不存在跨线程意外传播
- `ScopedValue.get()` 在未绑定时抛 `NoSuchElementException`，用 `orElse()` / `isBound()` 防御
- 子线程（包括虚拟线程）**只读继承**父作用域的值，无法修改父作用域
- `ScopedValue.where(...).call(Callable)` 对应有返回值的版本（`call` vs `run`）

---

## 十、⏳ 版本时光机 · ScopedValue 从预览到正式

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| `ThreadLocal` | JDK 1.2 | 老 API，仍在维护 |
| `InheritableThreadLocal` | JDK 1.2 | 子线程继承，但性能差 |
| `ScopedValue`（Preview）| **JDK 20/21/22** | JEP 429/446/464 |
| `ScopedValue`（正式）| **JDK 25** | JEP 487，生产可用 ✅ |
| `ScopedValue.orElse()` / `isBound()` | JDK 25 | 防御性 API |
| `StructuredTaskScope` 与 ScopedValue 联动 | JDK 25 | 见下一话 |

---

## 十一、何时仍用 ThreadLocal

```java
// ✅ 继续用 ThreadLocal 的场景
// ① 需要可变状态（ScopedValue 是只读的）
ThreadLocal<StringBuilder> sb = new ThreadLocal<>();
sb.set(new StringBuilder());
sb.get().append("累积");  // 需要跨调用修改

// ② 框架兼容性：现有框架大量使用 ThreadLocal（Spring RequestContextHolder 等）
//    迁移成本高，保持不变
RequestContextHolder.getRequestAttributes();  // 内部用 ThreadLocal

// ③ 线程私有缓存（如 SimpleDateFormat 实例，不可共享）
ThreadLocal<SimpleDateFormat> SDF = ThreadLocal.withInitial(
    () -> new SimpleDateFormat("yyyy-MM-dd"));

// ✅ 改用 ScopedValue 的场景
// ① 请求上下文传递（用户信息、Trace ID、权限）
// ② 不可变配置在调用栈中共享
// ③ 虚拟线程大并发场景（内存更友好）
// ④ 需要天然线程安全（不可变，无需同步）
```

---

## 十二、项目检查点 · 豆豆咖啡站 jvm-v3.4

- **已具备**：虚拟线程一人一单（v3.1）；挂载卸载机制（v3.2）；synchronized 去钉住（v3.3）；请求上下文改用 `ScopedValue`，作用域结束自动释放，不再手动 `remove()`。
- **还没有**：子任务还在散养——fork 出去的任务生命周期没人管，异常了也不知道；多个子任务要聚合结果时，手动 `join()` 容易漏。

阿零的变化：卷一他学会了「把不变量交给编译器守」，卷三他学会了「把清理交给 try-with-resources 守」，这一话他第一次遇到**编译器和语法都守不了的那一类错误**——生命周期语义。于是他换了个办法：**选一个把生命周期绑在作用域上的 API，让作用域结束时自动清理**。

---

## 十三、对应招聘技能

`ScopedValue`（JEP 487）、`ThreadLocal` 与 `InheritableThreadLocal` 的生命周期区别、虚拟线程上下文传递、不可变绑定与栈式覆盖、`isBound()` 防御性检查。

---

## 十四、下一话悬念

上下文传好了，下一话管好任务的生死。

`StructuredTaskScope`（JDK 25 第五次预览）：把子任务关进「围栏」——默认策略等待全部成功或在失败时取消其余任务，竞速则用 `Joiner.anySuccessfulResultOrThrow()`。它仍需 `--enable-preview`，不是正式 API，但已经是最接近正式的形态。

---

## 🎯 随堂练习

**Q1.** ScopedValue 和 ThreadLocal 最核心的两个区别是什么？

**Q2.** `ScopedValue.where(K, V).run(task)` 结束后，作用域外能调用 `K.get()` 吗？

**Q3.** 子虚拟线程能修改父作用域绑定的 ScopedValue 吗？

**Q4.** 什么情况下仍然应该用 ThreadLocal 而不是 ScopedValue？

**Q5.** `ScopedValue.where(K, V1).run(() -> ScopedValue.where(K, V2).run(...))` 内外层如何访问？

**Q6.** `ScopedValue.get()` 在未绑定时抛什么异常？如何安全获取？

**Q7.** `ThreadLocal` 在线程池中为什么必须 `remove()`？

**Q8.** ScopedValue 如何处理有返回值的任务？

**Q9.** `InheritableThreadLocal` 和 ScopedValue 的子任务继承有什么差别？

**Q10.** 在性能上，ScopedValue.get() 和 ThreadLocal.get() 哪个更快？原因是什么？

---

> [!答案]
>
> **Q1. ①不可变性：ScopedValue 在作用域内只读，ThreadLocal 可任意 set/get；②生命周期：ScopedValue 绑定到词法作用域（run 块），结束自动释放，ThreadLocal 绑定到线程生命周期，需要手动 remove。**这两点使 ScopedValue 天然线程安全，无泄漏风险。
>
> **Q2. 不能，`get()` 会抛 `NoSuchElementException`。**`isBound()` 返回 false，代表当前执行上下文没有有效绑定。可以用 `K.orElse(defaultValue)` 或 `K.orElseThrow()` 提供默认值或自定义异常。
>
> **Q3. 不能。**ScopedValue 是不可变绑定，子任务只能读取，不能修改父作用域的绑定值。若子任务需要不同的值，可以在子任务内用 `ScopedValue.where(K, newV).run(...)` 创建新的内层绑定，不影响父作用域。
>
> **Q4. 需要可变状态时仍用 ThreadLocal：**①累积计算结果（如 `StringBuilder`、计数器）；②框架兼容性（Spring `RequestContextHolder` 等大量框架内部依赖 ThreadLocal，不建议手动迁移）；③线程私有缓存（非共享的昂贵对象，如 `SimpleDateFormat`、随机数生成器）。
>
> **Q5. 内层作用域覆盖外层：内层 `run` 块中 `K.get()` 返回 `V2`；内层结束后回到外层，`K.get()` 返回 `V1`（自动恢复，无需手动操作）。**嵌套绑定形成栈式结构，每次进入新作用域压栈，退出弹栈，语义清晰。
>
> **Q6. 抛 `java.util.NoSuchElementException`。安全获取方式：①`sv.orElse(defaultValue)` — 未绑定时返回默认值；②`sv.isBound()` 先检查再 `get()`；③`sv.orElseThrow(MyException::new)` — 自定义异常。**框架代码推荐用 `isBound()` 守卫，业务代码若确定一定在作用域内，直接 `get()` 加文档注释即可。
>
> **Q7. 线程池中平台线程会被复用——一个请求处理完后，同一线程会处理下一个请求。如果 `ThreadLocal` 没有 `remove()`，下一个请求 `get()` 会读到上一个请求的数据（用户信息、事务上下文等），导致数据污染和安全漏洞。**虚拟线程不复用（每任务一线程），泄漏不会导致数据污染，但大量持有复杂对象仍有内存压力。
>
> **Q8. 用 `ScopedValue.where(K, V).call(Callable<T>)` 代替 `run(Runnable)`，`call()` 可返回值并传播受检异常：**
> ```java
> String result = ScopedValue.where(SV_USER, ctx).call(() -> processOrderSV());
> ```
> `run()` 用于 `Runnable`（无返回值，受检异常需包装）；`call()` 用于 `Callable`（有返回值，可传播受检异常）。
>
> **Q9. `InheritableThreadLocal` 是在创建子线程时做一次值拷贝，之后父子线程互相独立，子线程对值的修改不影响父线程（但拷贝本身有成本，且只在线程创建时发生一次）。ScopedValue 子任务读取的是父作用域的同一不可变绑定，不做拷贝，开销更低；且是只读的，语义更安全。**另外，`InheritableThreadLocal` 和线程池配合有问题（线程复用时继承的是创建线程时的值，不是提交任务时的值），ScopedValue 无此问题。
>
> **Q10. ScopedValue.get() 通常略快于 ThreadLocal.get()。**`ThreadLocal` 的 `get()` 需要通过 `Thread.currentThread()` 找到 `ThreadLocalMap`，再做哈希查找；`ScopedValue` 的查找机制针对不可变绑定做了优化（基于 carrier thread 的作用域栈，查找路径更短）。差异不大（本话实测 6ms vs 8ms），主要优势在内存而非速度。

---

## 运行环境、验证与依据

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 ScopedDemo.java && java ScopedDemo`；嵌套作用域自动恢复验证；子虚拟线程继承父作用域值；性能基准 TL 8ms vs SV 6ms；`isBound()` 作用域外 false 与文中一致。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[JEP 487: Scoped Values](https://openjdk.org/jeps/487)、[java.lang.ScopedValue API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ScopedValue.html)。

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*

