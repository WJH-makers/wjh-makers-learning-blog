---
title: 《JVM 火种纪》31 · 瘦身与抢跑
date: 2027-02-27
summary: “JDK 25 的紧凑对象头已是产品特性不再需要 `--enable-preview`，但它仍不是默认布局；Leyden AOT 缓存保存类加载/链接结果与方法画像，不是把 C2 机器码直接封进缓存。两张被夸大的海报，这一话把版本边界与证据口径讲清。”
tags: [Java, Java漫画, JVM, 紧凑对象头, AOT缓存, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》31 · 瘦身与抢跑

> JVM 火种纪 · 卷五「炉心与未来篇」第 4 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话装好了黑匣子，凌晨三点十七分那笔账迟早能算清。但阿零发现另一个躲不掉的成本：每次发版重启，头几秒的请求都特别慢——不是代码问题，是 JVM 从零开始热身。

---

## 一、两张被夸大的海报

f05e01 那话阿零学会了”预热到 C2 再计时”。可那只对压测有用——**生产发版时不可能让第一批用户当陪练**，头几秒的慢请求会被真实用户吃掉。

他在网上搜”JDK 启动优化”，看到两张海报。

第一张写着:”JDK 25 紧凑对象头还是第二次预览，必须 `--enable-preview`。”

第二张写着:”JEP 484 缓存 C2 机器码，启动直接到峰值。”

阿零照着配，第一条报错说不认识 `--enable-preview`，第二条翻完 JEP 484 发现那是 Class-File API，和启动性能一毛钱关系都没有。

「两张都是假的。」焰焰把那两页撕下来，「第一张过期了，第二张从头就没对过。」

---

## 二、漫画 · 两条边界线

![JVM 火种纪漫画：f05e04-aot-compact-headers](/comics/jvm/f05e04-aot-compact-headers.png)

> [!文字版]
>
> **〔1〕** 阿零把两张海报摊在桌上:「第一张说 JDK 25 的紧凑对象头还在预览，第二张说 JEP 484 是 AOT 方法缓存。」焰焰扫了一眼，「第一张**写的时候是对的**，但 JEP 519 已经把它提成产品特性；第二张**从头就没对过**，JEP 484 是 Class-File API。」
>
> **〔2〕** 「那真的 AOT 缓存在哪?」阿零翻开 JEP 清单。焰焰的尾巴指了三条:「JEP 483 缓存类加载与链接，JEP 514 把两步简化为 `AOTCacheOutput` 一步完成，JEP 515 在缓存里加方法执行**画像**——注意是画像，不是机器码。」
>
> **〔3〕** 「画像跟机器码有什么区别?」阿零皱眉。焰焰:「画像是**热点证据**:哪个方法调了多少次、哪个分支走得多、哪些类型在运行时真实出现过。JIT 拿到这份历史记录，就不用从零摸索——**但生成机器码这步还是 JIT 在启动时做，不是从缓存里复制一份成品。**」
>
> **〔4〕** 「为什么不直接缓存机器码?」焰焰把炉膛打开一条缝:「因为你不能保证训练流量和生产流量走的是同一条路。画像只是建议，JIT 还会继续在线收集、继续去优化。缓存机器码就是把建议变成命令——一旦猜错，去优化的代价比从零编译还高。」
>
> **〔5〕** 第一张海报的作者幽灵浮出来，手里攥着一份 2025 年初的 JDK 24 EA 文档:「我写的时候它**真的是 Experimental**。」它看着 JEP 519 的时间线，「JDK 25 提成产品特性那天，我这篇文章就过期了。技术文章没有永久正确。」
>
> **〔6〕** 阿零抄起记号笔，在白板上写了两条:「一、JDK 25 紧凑对象头是产品特性，用 `-XX:+UseCompactObjectHeaders` 开启，不需要 `--enable-preview`，但它**仍不是默认布局**。二、JEP 515 缓存的是方法画像，不是 C2 机器码，生产跑起来还会继续 JIT。」

---

## 三、本话目标

- 说清 JEP 519 在 JDK 25 的实际状态（产品特性、非默认、不需要 preview）；
- 说清 JEP 483/514/515 分别做什么、以及 JEP 484 不是 AOT 缓存；
- 立下”测启动性能要多轮对照、固定环境、看日志确认缓存命中”的规矩；
- 把”方法画像”与”C2 机器码”的区别讲透；
- 记住一条：技术文章会过期，版本边界以发布时的 JEP 状态为准。

---

## 四、炉内原理图：紧凑对象头与 AOT 缓存速查

**紧凑对象头 (JEP 519)**

在常见的 64 位 HotSpot、开启压缩类指针时，普通对象头通常是 12 字节；对象最终大小还要按对象对齐补齐。紧凑对象头把 header 合并为 64 bit（8 字节）。

```text
record Point(int x, int y)

经典对象头: 12 + 字段 8 = 20 -> 按 8 字节对齐为 24
紧凑对象头:  8 + 字段 8 = 16 -> 已对齐为 16

这个布局下每个 Point 节约 8 字节，即 33%
```

正确的版本线：

| JDK | JEP | 状态 |
|---|---|---|
| 24 | JEP 450 | Experimental，需解锁实验选项 |
| 25 | JEP 519 | **Product feature**，不再需要解锁实验选项 |

JDK 25 启用方式：

```bash
java -XX:+UseCompactObjectHeaders MyApp
```

它在 JDK 25 **不是默认布局**。不要添加无关的 `--enable-preview`，也不要把 JEP 472 写成”第二轮紧凑对象头”——JEP 472 实际讲的是未来限制 JNI 使用。

JEP 519 给出的 SPECjbb 等结果说明该特性在部分工作负载上可显著节省堆与 CPU，但那是特定基准结果，不是”所有应用满堆多放两成对象”的保证。

**AOT 缓存 (JEP 483 / 514 / 515)**

```text
JEP 483 / JDK 24
  AOT class loading & linking
  缓存已读取、解析、加载、链接的类状态

JEP 514 / JDK 25
  AOT command-line ergonomics
  用 -XX:AOTCacheOutput 一步完成训练 + 建缓存

JEP 515 / JDK 25
  AOT method profiling
  缓存训练跑的方法执行画像，让 JIT 更早做正确优化

不属于这条链
  JEP 484 = Class-File API
  它不是 AOT 方法机器码缓存
```

JEP 515 的官方边界很明确：AOT 缓存提供历史画像，HotSpot 在生产启动后仍由 JIT 生成机器码。在线画像不会停，所以训练流量与生产流量不完全一致时，JVM 仍能继续适应。

---

## 五、从上一话继续改代码：AOT 一步工作流

```java
import java.lang.management.ManagementFactory;
import java.util.List;
import java.util.stream.Collectors;

class AotDemo {
    static String greeting(int n) {
        return List.of(“Hello”, Integer.toString(n), “world”)
                .stream()
                .filter(word -> !word.contains(“0”))
                .collect(Collectors.joining(“, “));
    }

    public static void main(String[] args) {
        for (int i = 0; i < 100_000; i++) greeting(i);
        System.out.println(greeting(0));
        System.out.println(“uptime=” +
                ManagementFactory.getRuntimeMXBean().getUptime());
    }
}
```

先打成 JAR。JEP 483 的缓存约束要求类路径使用 JAR，目录类路径不适合作为可复用 AOT 缓存输入：

```bash
javac --release 25 AotDemo.java
jar --create --file app.jar --main-class AotDemo AotDemo.class

# JDK 25 一步训练并创建缓存
java -XX:AOTCacheOutput=app.aot -cp app.jar AotDemo

# 生产运行
java -XX:AOTCache=app.aot -cp app.jar AotDemo

# 看缓存是否打开、哪些优化降级
java -XX:AOTCache=app.aot -Xlog:aot=info -cp app.jar AotDemo
```

不要拿单次 `uptime` 当性能结论。要比较无缓存与有缓存的多轮分布，固定 JDK 发行版、OS、CPU 架构、类路径和关键模块参数，并观察日志确认缓存真的命中。

---

## 六、阿零故意翻车：拿单次启动时间当证据

阿零把训练跑了一次，生产跑了一次，看到 `uptime` 从 850ms 降到 620ms：「快了 27%！」

焰焰把电源拔了重插：「再跑三次。」

三次结果：680ms、740ms、590ms。平均 670ms，跟第一次的 620ms 差了 50ms。

「单次数字没有统计意义。磁盘缓存、CPU 频率、杀毒软件后台扫描、容器 CPU 配额——任何一个都能让同一份字节码在同一台机器上跑出 20% 的波动。」

焰焰在白板上写了一条：**冷启动测性能 = 至少 10 轮 × 无缓存 vs 有缓存对照，丢掉最高最低各两个，取中位数做比较。单次数字只能证明你这次运气好。**

---

## 七、编译官罚单（无）

这一话的两个特性都属于 JVM 运行时优化，不涉及语法或类型系统变更。编译官全程沉默。

---

## 八、修复并验证：从单次数字到统计对照

阿零把测试脚本改成了 10 轮循环，每轮冷启动（清操作系统文件缓存），分别跑无缓存和有缓存版本，记录每次的 `uptime`，最后取中位数。

```bash
# 伪代码示意（实际需要 OS 级缓存清理与多轮统计）
for i in 1..10; do
  # 清文件系统缓存（Linux: sync && echo 3 > /proc/sys/vm/drop_caches）
  java -cp app.jar AotDemo | tee -a baseline.log
  java -XX:AOTCache=app.aot -cp app.jar AotDemo | tee -a aot.log
done
# 取中位数对比
```

10 轮结果：无缓存中位数 680ms，有缓存中位数 610ms，加速约 10%——比第一次试出来的 27% 保守多了，但这才是可复现的结论。

焰焰点头：「10% 也是真的。27% 是运气。」

---

## 九、🔬 炉底显微镜

焰焰用日志验证缓存真的打开了：

```bash
# Windows：确认 JDK 25 已把该标志作为产品选项
java -XX:+UseCompactObjectHeaders -XX:+PrintFlagsFinal -version 2>&1 | findstr UseCompactObjectHeaders

# Linux/macOS
java -XX:+UseCompactObjectHeaders -XX:+PrintFlagsFinal -version 2>&1 | grep UseCompactObjectHeaders

# AOT 日志：重点看 cache opened / linked classes / profile 等信息与降级原因
java -XX:AOTCache=app.aot -Xlog:aot*=debug -cp app.jar AotDemo

# 对象布局应使用 JOL 或同等级工具在固定 VM 参数下测量
# 不要用 Runtime.totalMemory()-freeMemory() 除以对象数冒充对象大小
```

阿零追问三个问题：

**Q1. 为什么 JEP 515 不直接缓存 C2 机器码？**

焰焰把炉底的一份记录翻出来：「因为你不能保证训练流量和生产流量走的是同一条路。假设训练时 80% 的订单是会员、20% 是散客,JIT 会针对会员路径做激进优化,散客路径留个去优化出口。但生产上线那天正好是双十一,散客占 70%——缓存的机器码会疯狂去优化,性能比从零编译还差。」

「画像只是建议：'上次这个方法调了 10 万次,那个分支走了 9 万次。'JIT 拿到这份历史,可以更早做决定,但它还会继续在线收集、继续调整。缓存机器码就是把建议变成命令——灵活性没了。」

**Q2. 为什么紧凑对象头在 JDK 25 还不是默认？**

「因为它会改变对象内存布局,某些依赖 `Unsafe` 或 JNI 直接操作对象头的库可能会炸。JEP 519 把它提成产品特性,说明 OpenJDK 认为它已经足够稳定,可以放心在生产环境显式开启——但默认开启意味着**整个生态的所有库都必须兼容**,那需要更长的验证周期。」

**Q3. JEP 484 到底是什么？**

「Class-File API。它让你用 Java 代码读、写、变换 class 文件,不需要自己解析字节码格式。跟 AOT 缓存一毛钱关系都没有——可能是因为它们都在 JDK 24/25 发布,有人把两条新闻混在一起了。」

`Runtime` 堆差分会混入 TLAB、数组、GC 时机和 JIT 逃逸分析,无法证明单个对象的 header 大小。文章可以给布局公式,实测必须换成专门工具并记录 VM 标志。

---

## 十、⏳ 版本时光机

**版本边界**（核对于 2026-08-06）

| 能力 | JDK 25 状态 | 官方依据 |
|---|---|---|
| 紧凑对象头 | 可选产品特性,非默认 | JEP 519 |
| AOT 类加载与链接 | 已交付 | JEP 483（JDK 24） |
| 一步生成 AOT 缓存 | 已交付 | JEP 514 |
| AOT 方法画像 | 已交付 | JEP 515 |
| AOT 原生方法代码 | **不在上述 JEP 中** | JEP 515 明确仍由 JIT 生成代码 |
| Class-File API | 已交付,但不是 AOT 缓存 | JEP 484（JDK 24） |

未来排期文章发布前必须重新检查 JEP 状态,尤其不能根据项目路线图把尚未交付的"未来工作"写成当前命令已经支持。

---

## 十一、对应招聘技能

**关键词**：JVM 调优、启动性能优化、内存布局、AOT 编译

**典型岗位**
- **后端 Java 高级/专家**："熟悉 JVM 调优，有生产环境启动性能优化经验"
- **性能工程师**："理解 JVM 内存模型、对象布局与 GC 调优"
- **基础架构/中间件**："了解 AOT 编译、类加载优化等 JVM 前沿特性"

**简历可写项**（需实测支撑）
- 使用 JEP 515 AOT 缓存优化服务冷启动，多轮对照测试验证加速 X%
- 评估 JEP 519 紧凑对象头在特定工作负载下的内存收益
- 用 JFR 与 `-Xlog:aot*` 诊断 AOT 缓存命中率与降级原因

**面试可能问到**
- AOT 缓存的是什么？为什么不直接缓存 C2 机器码？
- 紧凑对象头在 JDK 25 是什么状态？为什么不是默认？
- 如何验证启动性能优化的效果？单次测试够吗？

**常见陷阱清单**
1. **把 JEP 484 当 Leyden 方法缓存。** 它是标准 Class-File API。
2. **把方法画像写成机器码。** JEP 515 让 JIT 提前拿到画像,不是直接复用训练跑的 C2 原生代码。
3. **缓存输入用散落的 `.class` 目录。** 使用可重复构建的 JAR,并保持类路径一致。
4. **只报最快一次启动时间。** 冷启动受磁盘缓存、杀毒软件、容器配额和 CPU 频率影响,必须做多轮对照。
5. **忽略发行版注入的 JVM 参数。** 训练和生产的模块图或 VM 选项不一致时,日志可能显示部分 AOT 优化被禁用。
6. **认为一键流程只起一个 JVM。** JEP 514 的 `AOTCacheOutput` 会协调训练与缓存创建子进程；大堆场景要预留额外内存。

---

## 十二、项目检查点 · 豆豆咖啡站 v5.4

阿零把紧凑对象头和 AOT 缓存都加进了启动脚本注释里，但没敢默认打开——「等下一个 LTS 发布半年后，看社区有没有踩坑报告，再决定要不要开。」

焰焰点头：「新特性不是发布那天就该上生产。产品特性意味着**可以安心测试了**，不是**必须立刻用**。」

当前状态：
- JIT 分层编译与 GC 选型已定稿（v5.1 / v5.2）
- JFR 常态录制已上线，凌晨三点十七分那笔账等下次再出现就能回溯（v5.3）
- 紧凑对象头与 AOT 缓存写进文档，生产环境暂不开启（v5.4）

---

## 十三、下一话悬念：三层能力金字塔

焰焰翻开最后一页日历：「卷五还剩一话。FFM 已经正式了，Vector API 还在孵化，Valhalla 值类……」她停顿了一下，「那个要看发布时的 JEP 状态。稳定能力、孵化 API、早期访问项目——三层金字塔，下一话把它们拆清楚。」

阿零点头：「卷五全剧终。」

---

## 🎯 随堂练习

**Q1.** JDK 25 启用紧凑对象头是否需要 `--enable-preview`？

**Q2.** JEP 483、514、515 各自解决什么？

**Q3.** JEP 515 是否缓存 C2 机器码？

**Q4.** 为什么训练与生产的类路径、JDK 与架构要保持兼容？

**Q5.** 为什么不能用一次 `Runtime` 堆差分证明对象头大小？

> [!答案]
>
> **Q1. 不需要。** JEP 519 已把紧凑对象头变成 JDK 25 产品特性；用 `-XX:+UseCompactObjectHeaders` 显式开启即可，但它仍不是默认布局。
>
> **Q2.** JEP 483 缓存类加载与链接状态；JEP 514 简化缓存创建命令；JEP 515 缓存方法执行画像，帮助 JIT 更快做优化决定。
>
> **Q3. 不缓存。** JEP 515 明确让 JIT 在启动后利用历史画像更早生成原生代码，生产运行仍会在线画像、JIT 和去优化。
>
> **Q4.** 缓存绑定于具体类内容、运行时与平台约束。环境不兼容时 JVM 会拒绝或降级使用缓存；日志是判断是否真正命中的依据。
>
> **Q5.** 堆差分混入容器数组、TLAB、GC、对象存活与 JIT 优化。对象布局要用 JOL 等工具，同时记录压缩指针、对象对齐和紧凑头标志。

---

## 运行环境、验证与依据

- **运行环境**：Oracle GraalVM 25.0.4+7.1，Windows 11，UTF-8。
- **验证方式**：`java -XX:+UseCompactObjectHeaders -version` 已验证产品标志可直接启用；`AOTCacheOutput` 已实际生成缓存文件并可由 `AOTCache` 打开。启动时间因本机发行版注入 JVMCI 选项而只作流程验证，不把单次数字写成性能结论。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[JEP 519: Compact Object Headers](https://openjdk.org/jeps/519)、[JEP 483: Ahead-of-Time Class Loading & Linking](https://openjdk.org/jeps/483)、[JEP 514: Ahead-of-Time Command-Line Ergonomics](https://openjdk.org/jeps/514)、[JEP 515: Ahead-of-Time Method Profiling](https://openjdk.org/jeps/515)、[JEP 484: Class-File API](https://openjdk.org/jeps/484)。

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
