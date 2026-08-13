---
title: "《JVM 火种纪》28 · 尾巴变红之前"
date: 2027-02-06
summary: "阿零给卷四的并发改造做压测，同一段代码第一次 8ms、第三次 0.3ms，差 30 倍，他一度以为是机器抖动。真相是前两次测的根本不是同一个东西：解释器、C1、C2 是三个阶段。这一话把分层编译的 5 个层级拆开，用 PrintCompilation 看每一次编译事件落在哪一层。"
tags: [Java, Java漫画, JVM, JIT分层编译, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》28 · 尾巴变红之前

> JVM 火种纪 · 卷五「炉心与未来篇」第 1 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话把并发流水线改到能扛百万——可阿零一压测就发现数字对不上，他还没搞清自己测的是哪个阶段的 JVM。

---

## 一、事故：同一段代码，第一次比第三次慢 30 倍

卷四收尾时，阿零想给改造后的订单流水线留一份性能证据。他掏出最朴素的办法：`System.nanoTime()` 掐表。

第一次 8.4ms。第二次 6.2ms。第三次 0.31ms。

他以为是机器在抖，重跑了几遍——每次都是这个形状：前两次慢得离谱，第三次开始稳定在 0.3ms 左右。

「三十倍。」阿零盯着屏幕，「同一个方法、同一份数据、同一个进程，凭什么？」

这个数字他不敢写进任何文档——因为他不知道该写 8ms 还是 0.3ms，也不知道生产环境上跑出来会是哪个。

---

## 二、漫画 · 尾巴第一次变红

![JVM 火种纪漫画：f05e01-jit-tiered](/comics/jvm/f05e01-jit-tiered.png)

> [!文字版]
>
> **〔1〕** 深夜炉边。阿零把三次计时结果并排贴在白板上:8.4ms / 6.2ms / 0.31ms。「机器抖成这样，我这压测还有什么意义?」焰焰凑过来瞄了一眼，尾巴还是蓝的:「机器没抖。你测了三个不同的东西。」
>
> **〔2〕** 「第一次是解释器在逐条翻译字节码。」焰焰的尾巴慢慢转黄，「第二次 C1 刚编译完，还带着插桩开销。第三次 C2 才真正上手——你前两次量的是**热身中的 JVM**，不是生产状态的 JVM。」
>
> **〔3〕** 阿零不服:「那 JVM 就不能一上来就用最好的编译器?」焰焰的尾巴烧到橙:「C2 优化一个方法的成本，比解释执行它一千次还贵。只跑三次的代码，编译完程序都结束了——**编译本身也要花钱**。」
>
> **〔4〕** 焰焰在白板上画出五个格子:Level 0 解释器、Level 1~3 是 C1 的三档插桩、Level 4 是 C2。「方法沿着这条路往上爬，每层有自己的计数器阈值。C2 只精修最热的那几个。」
>
> **〔5〕** 「所以正确的压测怎么做?」焰焰的尾巴终于烧成红色:「①预热至少 5~10 轮，让它爬到 Level 4;②用 JMH，让框架替你处理预热和多轮采样;③丢掉前几轮，看稳定后的均值。**手写计时只能验证量级，当不了基准。**」
>
> **〔6〕** 炉底浮出一个 1999 年的版本残影，抱着一份 HotSpot Server Compiler 的早期设计稿:「我们当年做 C2，就是赌『长跑的程序值得等编译』。」它看了看阿零那份三次计时的表格，「你这三次，连热身都没结束。」

---

## 三、本话目标

- 分清解释器、C1、C2 三个执行阶段的区别；
- 读懂分层编译 5 个层级各自的职责；
- 用 `-XX:+PrintCompilation` 观察真实的编译事件与层级升级；
- 说清逃逸分析、去虚化、OSR 各自解决什么问题；
- 立下"压测必先预热"的规矩，并知道为什么手写计时不算基准。

---

## 四、炉内原理图：分层编译 5 层级

```
Level 0  解释器（Interpreter）
         字节码逐条翻译，无优化；会插入 invocation counter
         
Level 1  C1：无计数插桩
         快速编译，无 profiling 开销；仅用于被 C2 拒绝的大方法

Level 2  C1：有限插桩
         编译 + 方法/回边计数，供 C2 profiling 决策

Level 3  C1：完整插桩（最常见的 C1 状态）
         编译 + 完整 profiling（类型记录、分支统计）
         → 数据够了 → 进 C2 队列

Level 4  C2（Server Compiler）
         最激进优化：
         ✦ 内联（inlining）：调用链展平进一个大方法
         ✦ 逃逸分析（Escape Analysis）：对象不逃逸则栈上分配 / 标量替换
         ✦ 循环展开（Loop Unrolling）
         ✦ 去虚化（Devirtualization）：通过 profiling 数据把虚调用改为直接调用
         ✦ 向量化（Auto-Vectorization）：SIMD 指令

阈值（默认，-client 模式不同）：
  CompileThreshold（C1/解释器→Level3）: ~1500 调用次数
  C2 Entry Count:                       ~10000（方法调用）
  C2 Back Edge Count:                   ~14000（循环回边，OSR 编译）
```

---

这张表接上一话：卷四把并发调到能扛百万，靠的是**少等**（虚拟线程、结构化并发）；这一话讲的是**跑得快**，靠的是 JVM 在运行期把热代码换成机器码。两件事叠起来才是真实的生产性能——而阿零那份三次计时，量的是热身中途的半成品。

关键差别在于：**C2 的收益要用时间换**。这也解释了为什么 CLI 工具、Lambda 函数从 C2 里几乎拿不到好处——它们还没爬到 Level 4 就退出了。

---

## 五、从上一话继续改代码：观察 JIT 分层编译过程

```java
// javac -encoding UTF-8 --release 25 JitDemo.java
// java -XX:+PrintCompilation -XX:+UnlockDiagnosticVMOptions \
//      -XX:+PrintInlining JitDemo 2>&1 | head -60
import java.util.*;
import java.util.stream.*;

class JitDemo {

    // 故意写一个「足够热」的方法，让 C2 可以触发
    static long sumArray(int[] arr) {
        long total = 0;
        for (int v : arr) total += v;
        return total;
    }

    // 演示逃逸分析：Point 不逃逸，可能被栈上分配
    record Point(int x, int y) {
        int dist() { return x * x + y * y; }
    }

    static long escapeAnalysisDemo(int n) {
        long sum = 0;
        for (int i = 0; i < n; i++) {
            // Point 创建后只在这一帧使用（不逃逸到堆）
            // C2 逃逸分析：可能标量替换为 x/y 两个局部变量
            sum += new Point(i, i + 1).dist();
        }
        return sum;
    }

    // 演示去虚化：Animal 只有一个实现时，虚调用被优化为直接调用
    interface Animal { String sound(); }
    record Cat() implements Animal { public String sound() { return "meow"; } }

    static long devirtualizeDemo(List<Animal> animals) {
        return animals.stream().filter(a -> a.sound().length() > 0).count();
    }

    // ── 手工计时（演示预热效果）────────────────────────────────
    static void warmupDemo() {
        int[] arr = new int[100_000];
        Arrays.fill(arr, 42);

        System.out.println("=== 手工计时（不预热 vs 预热）===");
        // 前 5 次（冷启动，解释器/C1阶段）
        for (int i = 0; i < 5; i++) {
            long t = System.nanoTime();
            long result = sumArray(arr);
            System.out.printf("第 %d 次: %,dns  (result=%d)%n",
                i+1, System.nanoTime()-t, result);
        }

        System.out.println("  ... 预热中 (10000次) ...");
        for (int i = 0; i < 10_000; i++) sumArray(arr); // 驱动到 C2

        // C2 编译后
        System.out.println("C2 预热后:");
        for (int i = 0; i < 5; i++) {
            long t = System.nanoTime();
            long result = sumArray(arr);
            System.out.printf("第 %d 次: %,dns  (result=%d)%n",
                i+1, System.nanoTime()-t, result);
        }
    }

    // ── 逃逸分析基准 ──────────────────────────────────────────
    static void escapeDemo() {
        System.out.println("\n=== 逃逸分析（预热后）===");
        // 先预热
        for (int i = 0; i < 10_000; i++) escapeAnalysisDemo(1000);

        long t = System.nanoTime();
        long result = escapeAnalysisDemo(1_000_000);
        System.out.printf("escapeAnalysisDemo(1M): %,dns  result=%d%n",
            System.nanoTime()-t, result);
        // C2 逃逸分析后 Point 可能被栈上分配，GC 压力极低
    }

    // ── 去虚化基准 ─────────────────────────────────────────────
    static void devirtDemo() {
        System.out.println("\n=== 去虚化演示 ===");
        // 单态调用点：只有 Cat 实现
        var cats = Collections.<Animal>nCopies(100_000, new Cat());
        for (int i = 0; i < 10_000; i++) devirtualizeDemo(cats); // 预热

        long t = System.nanoTime();
        long cnt = devirtualizeDemo(cats);
        System.out.printf("单态去虚化: %,dns  count=%d%n",
            System.nanoTime()-t, cnt);
    }

    public static void main(String[] args) {
        warmupDemo();
        escapeDemo();
        devirtDemo();
    }
}
```

**实测输出**（GraalVM 25.0.4，`-XX:+PrintCompilation` 片段）：

```
=== 手工计时（不预热 vs 预热）===
第 1 次:  8,423,100ns  (result=4200000)   ← 解释器
第 2 次:  6,187,200ns  (result=4200000)   ← Level 3 C1（刚编译）
第 3 次:    312,500ns  (result=4200000)   ← Level 4 C2 生效
第 4 次:    298,100ns  (result=4200000)
第 5 次:    291,400ns  (result=4200000)
  ... 预热中 (10000次) ...
C2 预热后:
第 1 次:    274,300ns  (result=4200000)
第 2 次:    271,800ns  (result=4200000)
...
（预热前后：8ms → 0.27ms，差约 30 倍）

-XX:+PrintCompilation 输出节选：
    74    1       3       JitDemo::sumArray (12 bytes)        ← C1 Level3
    89    2       4       JitDemo::sumArray (12 bytes)        ← C2 Level4
    89    1       3       JitDemo::sumArray (12 bytes)  made not entrant  ← C1 淘汰
```

PrintCompilation 列解释：时间戳(ms) | 编译ID | 是否OSR | 层级(1-4) | 方法 | 字节码大小

---

## 六、故意翻一次车：把五个坑一次踩全

阿零不服气，说这些坑我都懂。焰焰让他把自己那份压测代码原样贴出来，然后逐条对照——五个坑他踩了三个。

```java
// ❌ 陷阱 1：不预热就测性能
long t1 = System.nanoTime();
long result = sumArray(arr);   // 第一次：解释器，慢 30x
System.out.println(System.nanoTime() - t1); // 完全不准
// ✅ 至少 warmup 10000 次，或用 JMH @Warmup(iterations=5)

// ❌ 陷阱 2：手写微基准没有防止 JIT 死代码消除
long sum = 0;
for (int i = 0; i < N; i++) {
    sum += heavyCompute(i);    // JIT 发现 sum 不被用到？可能整块消除
}
// ✅ JMH 自动 blackhole 处理；手写时至少把结果 println 出来

// ❌ 陷阱 3：认为 C2 一定比 C1 快（编译时机问题）
// C2 编译本身消耗 CPU 时间，短跑任务（启动即结束）C2 来不及生效
// CLI 工具、Lambda 函数、测试跑单次 → C1 或解释器阶段就结束了
// ✅ 长跑服务受益于 C2；短生命周期进程考虑 AOT/CDS（下话）

// ❌ 陷阱 4：-client 关掉 C2
// JDK 9+ -client 已等同 -server，但某些嵌入式 JRE 仍区分
// 确认：java -version 输出包含 "Server VM" 表示 C2 可用

// ❌ 陷阱 5：修改被内联的方法后以为立刻生效（OSR 与去优化）
// C2 内联了 A 后，若 A 的类层次变化，JIT 触发去优化（deoptimization）
// 回退到解释器重跑，再次热了再编译。-XX:+PrintDeoptimization 可观察
```

阿零中的是 1、2、3 三条：没预热、结果没被使用、以及以为"跑一次的脚本也能受益于 C2"。

---

## 七、编译官罚单

> **📋 编译官罚单 · 这次编译官一声没吭**
>
> 阿零那份压测代码**编译完全通过**，运行也不报错。它只是安静地给出了一个错三十倍的数字。
>
> ```text
> 第 1 次:  8,423,100ns  (result=4200000)   ← 解释器
> 第 2 次:  6,187,200ns  (result=4200000)   ← Level 3 C1（刚编译）
> 第 3 次:    312,500ns  (result=4200000)   ← Level 4 C2 生效
> ```
>
> 编译官管的是语法与类型，它不知道你想量什么。**这类错误没有罚单，只有一个看起来很正常的错数字**——比编不过去危险得多：编不过你会修，数字错了你会拿它去做决策。
>
> 真正的"罚单"要自己去要：`-XX:+PrintCompilation` 会把每一次编译事件、每一层升级、每一次淘汰都打出来。

---

## 八、修复并验证

修法不是改代码，是改**测量方式**：先预热到 Level 4，再开始计时；结果必须被使用；多轮取稳定值。

验证判据三条：

1. **预热生效**：`-XX:+PrintCompilation` 输出里能看到目标方法从 Level 3 升到 Level 4。
2. **旧版本被淘汰**：同一方法出现 `made not entrant`，说明 C1 版本已让位给 C2。
3. **数字稳定**：预热后连续多次计时的波动收敛（本例 0.27~0.31ms），不再出现首次的 8ms。

三条都对上，这个数字才敢写进文档——并且要连口径一起写：**JDK 版本、预热轮数、数据规模，缺一个这数字就没意义**。

---

## 九、🔬 炉底显微镜 · 每一次编译事件落在哪一层

```bash
# 打印每次 JIT 编译事件（方法名、层级、字节码大小）
java -XX:+PrintCompilation JitDemo 2>&1 | head -40

# 打印内联决策（哪些调用被内联进去，哪些因太大被拒绝）
java -XX:+PrintCompilation -XX:+UnlockDiagnosticVMOptions \
     -XX:+PrintInlining JitDemo 2>&1 | grep -E "inline|inlining|too"

# 查看哪些方法被去优化（deoptimized）
java -XX:+PrintDeoptimization JitDemo 2>&1 | grep deoptimize

# 打印逃逸分析结果（哪些对象被标量替换）
java -XX:+UnlockDiagnosticVMOptions -XX:+PrintEscapeAnalysis JitDemo

# 打印编译线程用时（C1/C2 各花了多少时间）
java -XX:+CITime JitDemo 2>&1 | grep -E "C1|C2|Total"

# 禁用分层编译（强制只用解释器，观察最慢状态）
java -Xint JitDemo        # 纯解释器模式

# 强制只用 C1（禁用 C2）
java -XX:TieredStopAtLevel=1 JitDemo

# 查看 JIT 编译的机器码（需要 hsdis-amd64.dll 或 .so）
java -XX:+PrintAssembly -XX:CompileCommand=print,JitDemo.sumArray JitDemo
```

**关键指标**：

```
PrintCompilation 输出格式：
  timestamp  compile-id  osr?  level  classname::method  (bytes)  [flags]

flags:
  %   = OSR 编译（On-Stack Replacement，循环热点替换）
  !   = 方法含异常处理
  s   = 同步方法
  b   = 阻塞编译（少见，一般是编译队列溢出）
  n   = native 封装
  made not entrant = 旧编译版本被新版本替换，不再可入
  made zombie      = 不再被引用，等待 GC 回收
```

---

## 十、⏳ 版本时光机 · 编译器走了二十多年

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| Server Compiler（C2）| **JDK 1.3** | 最早的优化编译器 |
| 分层编译（TieredCompilation）| **JDK 7** | 5层级 |
| 分层编译默认开启 | **JDK 8** | -server 默认 |
| GraalVM Compiler（替代 C2）| **JDK 11+** | `-XX:+UseJVMCICompiler`，JDK 25 实验 |
| AOT 缓存（Leyden）| **JDK 24+** | F5E4 话题 |
| 本话代码运行环境 | JDK 25 | ✅ |

> [!坑] `-XX:CompileThreshold` 在默认开启的分层编译下**是被忽略的**。真正生效的是 `-XX:Tier3InvocationThreshold`（进 C1，默认 200）与 `-XX:Tier4InvocationThreshold`（进 C2，默认 5000）。想调阈值先确认你调的是哪个参数。

---

## 十一、项目检查点 · 豆豆咖啡站 jvm-v4.1

- **已具备**：并发能扛百万（v4.0）；一份带口径的压测流程——预热到 Level 4、结果被使用、多轮取稳定值；能用 `PrintCompilation` 证明代码真的进了 C2。
- **还没有**：GC 侧的证据（堆压力、停顿分布还没量过）；启动期性能（冷启动这段仍然只能忍）。

阿零的变化：他不再问"这段代码多快"，而是先问"你测的是哪个阶段"。这是从**要一个数字**变成**要一个带条件的数字**。

---

## 十二、对应招聘技能

JIT 分层编译与执行阶段、逃逸分析与去虚化、OSR 与去优化、基准测试方法论（JMH / 预热 / 死代码消除）、`PrintCompilation` 与 CodeCache 观测、性能数据的口径表达。

---

## 十三、下一话悬念

C2 把 CPU 榨到位了，阿零的流水线跑得飞快——但压测跑到第四十分钟，响应时间开始规律性地往上跳，每隔十几秒抖一下。

焰焰扫了一眼监控:「CPU 没满，你猜是谁在偷偷停你的工?」下一话，**分代 ZGC 与 GC 选型决策树**上场：新生代豆渣当场扬掉，老生代偶尔深清，而 ZGC 清渣的时候炉子不停火——`-Xlog:gc*` 会把这十几秒一次的抖动，指名道姓地交出来。

---

## 🎯 随堂练习

**Q1.** 分层编译的 5 个层级（Level 0~4）分别对应什么？

**Q2.** `-XX:+PrintCompilation` 输出中，"made not entrant" 是什么意思？

**Q3.** 为什么 CLI 工具类程序（启动即执行即退出）很难从 C2 中受益？

**Q4.** 逃逸分析（Escape Analysis）在 JIT 中能做哪些优化？

**Q5.** OSR（On-Stack Replacement）解决什么问题？

**Q6.** 手写微基准测试不用 JMH 时，至少需要做哪两件事来避免结果失真？

**Q7.** `-Xint` 标志的作用是什么？什么情况下会用它？

**Q8.** C2 的「去虚化」（Devirtualization）依赖什么信息？什么时候会失效？

**Q9.** `PrintCompilation` 输出里的 `%` 标志代表什么编译类型？

**Q10.** C1 和 C2 对同一个方法编译后，旧的 C1 编译结果去哪了？

---

> [!答案]
>
> **Q1. Level 0：解释器（字节码逐条翻译，无优化）；Level 1：C1 无插桩（快速编译，不收集 profiling）；Level 2：C1 有限插桩（方法调用 + 回边计数）；Level 3：C1 完整插桩（类型统计、分支概率，为 C2 提供 profiling 数据）；Level 4：C2（最激进优化，基于 profiling 做内联/逃逸分析/去虚化）。**方法从 0 → 3 → 4 是最常见路径；简单方法可能 0 → 1；大方法被 C2 拒绝后止步于 Level 1。
>
> **Q2. "made not entrant" 表示该编译版本不再接受新的调用入口，但正在栈上执行的旧版本仍继续运行到完成。**通常在两种情况下出现：①同一方法被更高层级重新编译（如 C1→C2 升级），旧 C1 版本变为 not entrant，等所有旧帧退出后变为 "made zombie"；②去优化（deoptimization）发生时，当前编译版本被废弃，方法回退到解释器。
>
> **Q3. C2 编译本身有延迟：方法需要被调用约 10000 次才触发 C2 编译，编译完成前程序可能已经结束。**CLI 工具通常只执行一次主逻辑，核心代码调用次数远达不到 C2 阈值——全程在解释器或 C1 Level 3 运行。解决方案：使用 AOT 缓存/Class Data Sharing（CDS）在启动时直接加载预编译代码（F5E4 话题）。
>
> **Q4. 逃逸分析判断对象是否「逃逸」到当前方法/线程之外。不逃逸的对象可做三类优化：①栈上分配（Stack Allocation）：对象分配在栈帧而非堆，方法返回时自动回收，GC 压力为零；②标量替换（Scalar Replacement）：把对象拆散成字段直接存寄存器/栈，消除对象本身；③锁消除（Lock Elision）：对不逃逸对象的 synchronized 块直接消除，因为没有其他线程能访问。**GraalVM JIT 的逃逸分析比 HotSpot C2 更激进。
>
> **Q5. OSR（On-Stack Replacement，栈上替换）解决「方法在一次调用中执行了大量循环，循环本身是热点，但方法调用次数不多」的问题。**例如 `main()` 只调用一次，但内部有 100 万次循环。OSR 在循环「回边」（back edge，循环跳回判断条件的那条指令）达到阈值时，把仍在执行的解释器帧「热替换」为 JIT 编译帧，不需要等方法结束重新调用。`PrintCompilation` 中的 `%` 标志即 OSR 编译。
>
> **Q6. ①预热（Warmup）：至少调用目标方法 10000 次，让 C2 完成编译，丢弃预热期间的计时结果；②防止死代码消除（Dead Code Elimination）：确保结果被实际使用（如 println），否则 JIT 可能发现结果从未被用到而删除整个计算。**还应避免：循环体太短被完全内联导致测量不到任何开销；测量包含 GC 停顿（建议跑多轮取中位数）。
>
> **Q7. `-Xint` 强制 JVM 只使用解释器执行，完全禁用 JIT 编译。**使用场景：①调试 JIT 引入的优化问题（如果 `-Xint` 下不复现则是 JIT bug）；②测量基准性能下限（看解释器有多慢）；③某些安全审计场景需要禁用 JIT。正常生产绝不使用——性能会下降 10~100 倍。
>
> **Q8. 去虚化（Devirtualization）依赖 C1 Level 3 收集的「类型 profiling」数据：记录虚调用点实际见到了哪些具体类型（单态/双态/多态）。单态调用点（只见过一种实现类）被优化为 guard-check + 直接调用（inline）：先检查类型是否匹配，匹配则走内联路径，不匹配 deoptimize。**失效条件：程序运行中出现了 profiling 时未见过的新子类（多态污染），JIT 触发去优化，退回解释器重新 profiling，再次热了重新编译（此时可能选择双态或虚调用内联）。
>
> **Q9. `%` 代表 OSR 编译（On-Stack Replacement）。**OSR 是在方法「执行中途」（一般是循环回边达阈值时）发生的编译和热替换，区别于普通的方法入口编译。`PrintCompilation` 格式中 `%` 出现在层级数字之后，如：`74    5  %  4  JitDemo::main @ 45 (120 bytes)` 中的 `@45` 表示 OSR 发生在字节码偏移 45（某个回边）处。
>
> **Q10. 旧的 C1 编译版本被标记为 "made not entrant"——新的调用入口（方法入口）不再指向它，但若栈上还有正在执行该版本的帧，它继续运行到完成。**当所有使用该编译版本的栈帧都退出后，它变为 "made zombie"，由 GC 在适当时机回收该段机器码所占的 CodeCache 空间（`-XX:ReservedCodeCacheSize` 控制 CodeCache 大小，JDK 11+ 默认 240MB）。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 JitDemo.java && java -XX:+PrintCompilation JitDemo`；第 1 次调用 ~8ms（解释器），第 3 次 ~0.3ms（C2 生效），PrintCompilation 可见 `sumArray` Level 3→4 升级及 "made not entrant"；预热前后性能差约 30 倍，与文中一致。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[JVM TI：CompileMethod 事件](https://docs.oracle.com/en/java/javase/25/docs/specs/jvmti.html)、[HotSpot JIT Compilation](https://openjdk.org/groups/hotspot/docs/RuntimeOverview.html)、[JEP 410: Remove the Experimental AOT and JIT Compiler](https://openjdk.org/jeps/410)（说明 GraalVM JIT 走独立路线）。

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
