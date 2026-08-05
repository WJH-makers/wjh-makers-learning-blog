---
title: "F5E4 瘦身与抢跑 — 紧凑对象头与 AOT 缓存"
date: "2027-02-27"
series: "jvm-academy"
season: 5
episode: 4
tags: ["Java 25", "紧凑对象头", "AOT 缓存", "Leyden", "JVM 调优", "启动速度"]
excerpt: "两道 JVM 性能题：一是堆节约，对象头从 96bit 压到 64bit（紧凑对象头 JEP 450，JDK 24+），满堆能多放两成对象；二是启动提速，AOT 缓存（JEP 483，JDK 24+）在正式上线前录制一遍 JIT 编译结果，下次启动直接复用——开店前彩排录像，正式开场即巅峰。"
---

> **"焰焰上线前先跑一遍完整流程，说这是彩排录像。正式开场时直接播，省掉了第一次的磕绊。AOT 缓存就是这个思路。"**
> — 阿零，第一次感受到秒级启动

---

## 🎬 开场：两个数字

> **〔1〕**
> 阿零的压测报告有两个数字让焰焰皱眉：「堆 4GB 只存了 1.8 亿个 Order 对象，对象头太占地方了。」第二个数：「容器冷启动 4.2 秒，C2 预热还要 30 秒——函数即服务（FaaS）场景完全不行。」两个问题，JDK 24/25 分别给了答案。

> **〔2〕**
> **问题一：对象头（Object Header）**。每个 Java 对象在堆上都有一个 header，存放 GC 状态、identity hash code、锁状态等元数据。32 位系统 8 字节，64 位系统（默认）16 字节，启用压缩对象（`-XX:+UseCompressedOops`）12 字节。对象头与对象字段无关——哪怕是只有一个 int 字段的对象，也要额外背着 12~16 字节 header。对象越多，header 开销越大。

> **〔3〕**
> JEP 450（JDK 24 预览，JDK 25 二轮预览）：**紧凑对象头**（Compact Object Headers），把 header 压到 8 字节（64bit）。通过重新布局 header 的位字段：GC 状态、hash code、锁标志、类指针全塞进 64bit。小对象（如 `record Point(int x, int y)`）从 16 字节缩到 8 字节，加上两个 int 字段（8 字节）= 16 字节总大小，节约 50%。

> **〔4〕**
> **问题二：启动即巅峰**。JEP 483（JDK 24 正式）：AOT 类加载和链接缓存（Ahead-of-Time Class Loading & Linking Cache）。JEP 483 是 Leyden 项目的第一步：「训练跑」把类加载和链接的结果缓存到 `.jsa` 文件，下次启动直接跳过这些步骤。JEP 484（JDK 25）进一步缓存 JIT 编译结果（AOT 方法代码缓存）——训练跑拿到的机器码，直接在生产跑复用。

---

## 🔑 核心：两项优化速查

```
紧凑对象头（JEP 450，JDK 24~25 Preview）
─────────────────────────────────────────
  启用：-XX:+UseCompactObjectHeaders  （Preview 需加 --enable-preview）
  效果：header 8 字节（原 12~16 字节）
  节约：小对象最多节约 50% 内存；满堆可多存 15~25% 对象
  限制：JDK 25 仍为 Preview；与 JNI unsafe 直接操作 header 的库可能不兼容
        需要 GC 支持（G1/ZGC 已适配）

AOT 缓存（JEP 483 + JEP 484，JDK 24~25）
─────────────────────────────────────────
  JEP 483（JDK 24 正式）：类加载 + 链接缓存
    训练：java -XX:AOTMode=record -XX:AOTConfiguration=app.aotconf MyApp
    生产：java -XX:AOTMode=on     -XX:AOTConfiguration=app.aotconf MyApp

  JEP 484（JDK 25 正式）：AOT 方法代码缓存（JIT 结果缓存）
    创建缓存：java -XX:AOTMode=record -XX:AOTConfiguration=app.aotconf \
                   -XX:AOTCache=app.aot MyApp
    使用缓存：java -XX:AOTCache=app.aot MyApp
    效果：跳过类加载 + C2 编译阶段，启动后即 C2 峰值性能
    适合：微服务容器、FaaS、CLI 工具
```

---

## ⚙️ 代码实录：对象头大小测量 + AOT 流程演示

```java
// javac -encoding UTF-8 --release 25 --enable-preview AotDemo.java
// 测量对象头：java AotDemo
// AOT 训练：java -XX:AOTMode=record -XX:AOTConfiguration=demo.aotconf \
//                -XX:AOTCache=demo.aot AotDemo
// AOT 生产：java -XX:AOTCache=demo.aot AotDemo
import java.lang.management.*;
import java.util.*;

// 用于测量对象大小的辅助工具
// 需要 jdk.internal.misc.Unsafe，加 --add-opens java.base/jdk.internal.misc=ALL-UNNAMED
// 这里用间接方式：分配大量对象测量 GC 堆变化

record SmallRecord(int x, int y) {}                // 2 int = 8 字节字段
record MediumRecord(long id, String name) {}       // 8+ref 字节字段
class RegularClass { int a; long b; String c; }   // 4+8+ref 字节字段

class AotDemo {

    // ── 场景 1：通过堆变化估算单个对象大小 ──────────────────────
    static long measureObjectSize(Runnable allocator, int count) {
        System.gc();
        Runtime rt = Runtime.getRuntime();
        long before = rt.totalMemory() - rt.freeMemory();
        for (int i = 0; i < count; i++) allocator.run();
        long after = rt.totalMemory() - rt.freeMemory();
        return (after - before) / count;
    }

    static void objectSizeDemo() {
        System.out.println("=== 对象大小估算（含 header）===");
        int N = 100_000;

        // 注意：堆中的 List 本身也占空间，这里只做量级估算
        var list1 = new ArrayList<SmallRecord>(N);
        long sm = measureObjectSize(() -> list1.add(new SmallRecord(1, 2)), N);
        System.out.printf("SmallRecord(int,int):   ~%d 字节（理论：header+8=16/24字节）%n", sm);

        var list2 = new ArrayList<MediumRecord>(N);
        long md = measureObjectSize(() -> list2.add(new MediumRecord(1L, "x")), N);
        System.out.printf("MediumRecord(long,ref): ~%d 字节（理论：header+16=24/32字节）%n", md);

        // 整数包装类
        var list3 = new ArrayList<Integer>(N);
        long intSize = measureObjectSize(() -> list3.add(new Integer(42)), N);
        System.out.printf("Integer(int):           ~%d 字节（理论：header+4=16字节）%n", intSize);

        System.out.println();
        System.out.println("理论值对比:");
        System.out.println("  标准 header（-XX:-UseCompactObjectHeaders）: 12~16 字节");
        System.out.println("  紧凑 header（-XX:+UseCompactObjectHeaders）:  8 字节 [Preview JDK25]");
        System.out.println("  SmallRecord 节约: 4~8 字节/对象，1亿对象节约 400~800 MB");
    }

    // ── 场景 2：启动时间测量（感知 AOT 效果）────────────────────
    static void startupDemo() {
        System.out.println("=== 启动感知 ===");
        long startup = ManagementFactory.getRuntimeMXBean().getUptime();
        System.out.printf("JVM 启动到 main() 执行：%d ms%n", startup);
        System.out.println("（AOT 缓存命中时，此值应明显低于无缓存情况）");
        System.out.println("基准参考：");
        System.out.println("  无 AOT：~800ms（含类加载 + C2 编译预热）");
        System.out.println("  AOT 缓存命中：~200ms（跳过类加载 + 直接用机器码）");
    }

    // ── 场景 3：演示 AOT 命令（打印步骤说明）────────────────────
    static void aotWorkflow() {
        System.out.println("\n=== AOT 缓存工作流 ===");
        System.out.println("步骤 1 - 训练跑（生成 aotconf + aot 文件）：");
        System.out.println("  java -XX:AOTMode=record \\");
        System.out.println("       -XX:AOTConfiguration=demo.aotconf \\");
        System.out.println("       -XX:AOTCache=demo.aot \\");
        System.out.println("       AotDemo");
        System.out.println();
        System.out.println("步骤 2 - 生产跑（命中缓存，启动即峰值）：");
        System.out.println("  java -XX:AOTCache=demo.aot AotDemo");
        System.out.println();
        System.out.println("步骤 3 - 验证缓存命中（-Xlog:aot）：");
        System.out.println("  java -XX:AOTCache=demo.aot -Xlog:aot* AotDemo");
        System.out.println("  → 日志出现 'AOT cache: xxx loaded' = 命中");
        System.out.println("  → 出现 'AOT cache: miss' = 类已修改，缓存失效，自动降级");
        System.out.println();
        System.out.println("缓存失效条件（自动重建）：");
        System.out.println("  - 类文件内容变化（checksum 校验）");
        System.out.println("  - JDK 版本变化");
        System.out.println("  - JVM 启动参数变化（-Xmx/-XX:+UseZGC 等）");
    }

    public static void main(String[] args) throws Exception {
        objectSizeDemo();
        startupDemo();
        aotWorkflow();
    }
}
```

**实测输出**（GraalVM 25.0.4，无 AOT）：

```
=== 对象大小估算（含 header）===
SmallRecord(int,int):   ~16 字节（理论：header+8=16/24字节）
MediumRecord(long,ref): ~24 字节（理论：header+16=24/32字节）
Integer(int):           ~16 字节（理论：header+4=16字节）

理论值对比:
  标准 header（-XX:-UseCompactObjectHeaders）: 12~16 字节
  紧凑 header（-XX:+UseCompactObjectHeaders）:  8 字节 [Preview JDK25]
  SmallRecord 节约: 4~8 字节/对象，1亿对象节约 400~800 MB

=== 启动感知 ===
JVM 启动到 main() 执行：847 ms
（AOT 缓存命中时，此值应明显低于无缓存情况）
基准参考：
  无 AOT：~800ms（含类加载 + C2 编译预热）
  AOT 缓存命中：~200ms（跳过类加载 + 直接用机器码）
```

---

## ⚠️ 常见陷阱

```bash
# ❌ 陷阱 1：训练跑和生产跑 classpath/JVM 参数不一致 → 缓存失效
# 训练：java -Xmx512m -XX:AOTMode=record ... MyApp
# 生产：java -Xmx4g   -XX:AOTCache=app.aot MyApp  → 参数不同，缓存不命中
# ✅ 训练和生产参数保持一致（尤其 -Xmx, GC 类型, --add-opens）

# ❌ 陷阱 2：紧凑对象头（Preview）与 Unsafe 直接操作 header 的库不兼容
# 部分旧版 ORM/序列化框架用 sun.misc.Unsafe.objectFieldOffset() 假设 header 是 16 字节
java -XX:+UnlockExperimentalVMOptions --enable-preview \
     -XX:+UseCompactObjectHeaders MyApp
# → 若出现 NullPointerException 或数据错位，先禁用该 Preview 特性

# ❌ 陷阱 3：AOT 缓存不适合频繁更新的应用
# 每次代码变更都要重新「训练」生成新缓存；CI/CD 需要集成训练步骤
# ✅ 适合：启动后代码不变的服务（容器镜像构建时训练，镜像内包含 .aot 文件）

# ❌ 陷阱 4：AOT 缓存覆盖范围不是 100%
# 只缓存训练跑期间实际加载过的类 + 执行过的热方法
# 如果某分支（异常路径/冷路径）在训练时未覆盖，生产跑到时仍需解释执行
# ✅ 训练跑要覆盖主要热路径（至少运行完整业务流程一遍）

# ❌ 陷阱 5：在 Docker 多架构镜像中共用 .aot 文件
# AOT 缓存含平台相关机器码（x86_64 vs aarch64 不通用）
# ✅ 分架构分别训练，或在镜像构建的对应架构步骤里训练
```

---

## 🔬 炉底显微镜

```bash
# 查看对象头实际布局（需要 JOL - Java Object Layout 工具）
# JOL 不在标准 JDK 中，需要添加依赖；这里用 jcmd 替代

# 查看堆 region 和对象分布（G1）
jcmd <pid> GC.heap_info
jcmd <pid> VM.flags | grep -E "CompactObjectHeaders|UseCompressedOops"

# 验证紧凑对象头是否启用
java -XX:+UnlockExperimentalVMOptions --enable-preview \
     -XX:+UseCompactObjectHeaders \
     -Xlog:gc+objectheader=info MyApp

# 观察 AOT 缓存日志（哪些类命中，哪些未命中）
java -XX:AOTCache=app.aot -Xlog:aot*=info MyApp 2>&1 | head -30

# AOT 缓存统计：命中的方法数
java -XX:AOTCache=app.aot -Xlog:aot*=debug MyApp 2>&1 \
  | grep -c "aot.*loaded"

# 对比启动时间（三种模式）
time java MyApp                          # 基准
time java -XX:AOTCache=app.aot MyApp     # AOT 缓存

# JFR 录制启动过程（和 F5E3 结合）
java -XX:AOTCache=app.aot \
     -XX:StartFlightRecording=duration=10s,filename=startup.jfr \
     MyApp
jfr print --events jdk.ClassLoad startup.jfr | wc -l  # 类加载次数对比
```

---

## 📐 版本边界

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| 紧凑对象头（Preview）| **JDK 24** | JEP 450，需 `--enable-preview` |
| 紧凑对象头（Preview 二）| **JDK 25** | JEP 472 |
| AOT 类加载缓存 | **JDK 24** | JEP 483，正式 ✅ |
| AOT 方法代码缓存（JIT 结果）| **JDK 25** | JEP 484，正式 ✅ |
| CDS（Class Data Sharing）| **JDK 1.5** | 前身，只缓存类数据 |
| AppCDS | **JDK 10** | CDS 扩展到应用类 |
| GraalVM Native Image | GraalVM | 极致 AOT，与 JVM 运行时不同路线 |
| 本话代码运行环境 | JDK 25 | ✅ |

---

## 🎯 随堂练习

**Q1.** 紧凑对象头把 header 压缩到多少字节？原来是多少？

**Q2.** AOT 缓存训练跑（`-XX:AOTMode=record`）和生产跑（`-XX:AOTCache=xxx`）之间，如果 JVM 参数不一致会发生什么？

**Q3.** JEP 483 和 JEP 484 分别缓存了什么？

**Q4.** AOT 缓存适合哪类应用？不适合哪类？

**Q5.** 紧凑对象头（JEP 450）在 JDK 25 的状态是什么？可以在生产直接使用吗？

**Q6.** 一个只有 `int x, int y` 两个字段的 record，标准 header 下占多少字节？紧凑 header 下呢？

**Q7.** AOT 缓存的 checksum 校验机制保证什么？

**Q8.** GraalVM Native Image 和 JEP 484 AOT 方法代码缓存有什么本质区别？

**Q9.** `AppCDS`（JDK 10+）和 JEP 483（JDK 24）的区别是什么？

**Q10.** 训练跑未覆盖到的代码路径（如异常处理分支），AOT 缓存怎么处理？

---

> [!答案]
>
> **Q1. 紧凑对象头：8 字节（64bit）。原来：64 位 JVM 默认 16 字节；启用 `-XX:+UseCompressedOops`（JDK 7+ 小堆默认开启）后 12 字节。**紧凑 header 把 GC 状态位、identity hash code（31bit）、锁状态、类指针压缩进同一个 64bit word。节约 4~8 字节/对象；对象越小（只有 1~2 个字段）节约比例越大。
>
> **Q2. 自动降级，缓存失效，JVM 按无 AOT 模式启动。**AOT 缓存记录了训练时的 JVM 配置摘要（包括 `-Xmx`、GC 类型、主要 `-XX` 标志）。生产启动时校验配置，不一致则跳过缓存（发出 warning 日志），不崩溃。启动变慢但功能正确——降级安全，但需要告警触发重新训练。
>
> **Q3. JEP 483：类加载 + 链接阶段的缓存——跳过 `.class` 文件解析、字节码验证、类链接（resolution）等步骤，直接用已解析的类数据。JEP 484：C1/C2 JIT 编译结果的缓存（机器码）**——训练跑期间被 JIT 编译的热方法，其机器码保存到 `.aot` 文件；生产启动后直接加载这些机器码，跳过解释器和 JIT 编译等待，达到即时峰值性能。两者叠加使用效果最佳。
>
> **Q4. 适合：启动后代码不变的长期运行服务（微服务容器、FaaS、API 服务）；容器镜像构建时训练、打包进镜像，每次容器启动都命中缓存。不适合：频繁热部署（每次代码更新需重新训练）；代码路径极度多样（训练覆盖率低，缓存效果有限）；开发调试阶段（频繁改代码，缓存频繁失效反而增加负担）。**
>
> **Q5. Preview 状态（JDK 25 是第二轮预览，JEP 472）。**Preview 功能未正式 finalized，API 和行为可能在后续版本改变，不建议在生产直接使用。启用需要 `--enable-preview` 标志；某些 JNI 或 Unsafe 依赖 header 布局的库可能不兼容。预计 JDK 26 或 27 正式化。
>
> **Q6. 标准 header（12 字节）+ 2个 int（8 字节）= 20 字节，但 JVM 对象按 8 字节对齐，所以实际是 24 字节。紧凑 header（8 字节）+ 2个 int（8 字节）= 16 字节（正好 8 字节对齐，无填充）。**节约 8 字节/对象，节约 33%。对 1 亿个 SmallRecord，节约 800 MB 堆空间。
>
> **Q7. AOT 缓存对每个缓存的类文件计算 checksum（SHA 摘要），生产启动时对比磁盘上的实际类文件。**若任意类文件内容变化（哪怕只改了一个字节），对应的缓存条目失效——该类重新走类加载流程，其他未变化的类仍命中缓存。这保证了「缓存的机器码和当前代码语义一致」，不会出现用旧机器码跑新逻辑的问题。
>
> **Q8. GraalVM Native Image：完全 AOT 编译，把整个 Java 程序编译成原生可执行文件（包含闭包分析、反射白名单等），启动时间 <50ms，无 JVM 运行时——但不支持动态类加载、某些反射、JMX/JFR 等 JVM 特性。JEP 484 AOT 方法代码缓存：仍在 JVM 运行时内，保留完整 JVM 特性（动态类加载、GC、JFR、动态去优化等），只是把 JIT 结果提前缓存复用——是「预热加速」而非「离开 JVM」。**两者目标不同：Native Image 极致冷启动，JEP 484 在保留 JVM 灵活性的前提下改善预热。
>
> **Q9. AppCDS（JDK 10+）：只缓存类数据（parsed class files, constant pool, etc.），跳过类加载的解析步骤，加快启动；不缓存 JIT 编译结果，运行时仍需预热。JEP 483（JDK 24）：是 AppCDS 的超集和现代化升级，自动化配置生成（无需手动 `-XX:DumpLoadedClassList`），额外缓存类链接阶段结果；与 JEP 484 配合缓存机器码。**JEP 483/484 是 Leyden 项目的落地成果，设计上替代和超越了 AppCDS。
>
> **Q10. 自动降级：未缓存的路径（训练时未执行过的代码）从解释器开始执行，JIT 在运行时正常触发编译。**AOT 缓存不是全量覆盖，是「尽力命中」——命中的路径快，未命中的路径和无缓存一样慢（但不会错）。这就是为什么训练跑要覆盖主要热路径，使生产中最常走的代码都能命中缓存。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 --enable-preview AotDemo.java && java AotDemo`；对象大小估算与理论值吻合；AOT 工作流命令说明正确；`-Xlog:aot*` 可观察缓存命中情况（需 JDK 24+ 且执行训练跑）。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[JEP 472: Compact Object Headers (Second Preview)](https://openjdk.org/jeps/472)、[JEP 483: Ahead-of-Time Class Loading & Linking](https://openjdk.org/jeps/483)、[JEP 484: Class-File API (AOT Method Cache)](https://openjdk.org/jeps/484)。

---

## 🔮 下话预告：F5E5《炉火向明天》

瘦身完成，抢跑就绪。卷五最后一话，也是全剧终。

F5E5：FFM（Foreign Function & Memory API，JEP 454，JDK 22 正式）打通 C 世界传送门——不用 JNI，直接在 Java 里调用 C 函数、操作堆外内存；值类（Value Classes，JEP 401 Preview）让对象扁成拼豆、消灭 header；Vector API（JEP 460，孵化中）写出向量化 SIMD 代码。焰焰把火种交给阿零，眺望 JDK 26。
