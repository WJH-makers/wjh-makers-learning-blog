---
title: "F5E4 瘦身与抢跑 — 紧凑对象头与 AOT 缓存"
date: "2027-02-27"
series: "jvm-academy"
season: 5
episode: 4
tags: ["Java 25", "JEP 519", "AOT 缓存", "Leyden", "JVM 调优", "启动速度"]
excerpt: "JDK 25 的紧凑对象头已是可选产品特性,不是 Preview；Leyden AOT 缓存保存类加载/链接结果与方法画像,不是把 C2 机器码直接封进缓存。用 JEP 519/483/514/515 把两条边界讲清。"
---

![JVM 火种纪漫画：f05e04-aot-compact-headers](/comics/jvm/f05e04-aot-compact-headers.png)

> **“瘦身先量对象布局,抢跑先分清缓存里到底装了什么。两个名词都叫优化,证据却完全不同。”**
> — 焰焰,把“启动即巅峰”从黑板上擦掉

---

## 🎬 开场:两张被夸大的海报

> **〔1〕**
> 第一张海报写着:“JDK 25 紧凑对象头还是第二次预览,必须 `--enable-preview`。”焰焰摇头:JEP 519 已在 JDK 25 把它提升为产品特性,只是仍需显式开启。

> **〔2〕**
> 第二张海报写着:“JEP 484 缓存 C2 机器码,启动直接到峰值。”阿零查完 JEP 才发现,JEP 484 是 Class-File API,与 Leyden AOT 方法代码缓存不是一回事。

> **〔3〕**
> 真正的 AOT 主线是:JEP 483 在 JDK 24 缓存类加载与链接结果;JEP 514 在 JDK 25 把两步建缓存简化为 `AOTCacheOutput`;JEP 515 在缓存中加入**方法执行画像**,让 JIT 更早拿到热点证据。

> **〔4〕**
> 画像不是机器码。生产 JVM 仍会 JIT 编译,也会继续收集在线画像并去优化。AOT 缓存缩短启动和热身,但不承诺每个应用都到同一个毫秒数字。

---

## 🔑 紧凑对象头:8 字节,但不是默认

在常见的 64 位 HotSpot、开启压缩类指针时,普通对象头通常是 12 字节;对象最终大小还要按对象对齐补齐。紧凑对象头把 header 合并为 64 bit（8 字节）。

```text
record Point(int x, int y)

经典对象头:12 + 字段 8 = 20 -> 按 8 字节对齐为 24
紧凑对象头: 8 + 字段 8 = 16 -> 已对齐为 16

这个布局下每个 Point 节约 8 字节,即 33%
```

正确的版本线:

| JDK | JEP | 状态 |
|---|---|---|
| 24 | JEP 450 | Experimental,需解锁实验选项 |
| 25 | JEP 519 | **Product feature**,不再需要解锁实验选项 |

JDK 25 启用方式:

```bash
java -XX:+UseCompactObjectHeaders MyApp
```

它在 JDK 25 **不是默认布局**。不要添加无关的 `--enable-preview`,也不要把 JEP 472 写成“第二轮紧凑对象头”——JEP 472 实际讲的是未来限制 JNI 使用。

JEP 519 给出的 SPECjbb 等结果说明该特性在部分工作负载上可显著节省堆与 CPU,但那是特定基准结果,不是“所有应用满堆多放两成对象”的保证。

---

## 🔑 AOT 缓存:缓存类与画像,不缓存 C2 成品

```text
JEP 483 / JDK 24
  AOT class loading & linking
  缓存已读取、解析、加载、链接的类状态

JEP 514 / JDK 25
  AOT command-line ergonomics
  用 -XX:AOTCacheOutput 一步完成训练 + 建缓存

JEP 515 / JDK 25
  AOT method profiling
  缓存训练跑的方法执行画像,让 JIT 更早做正确优化

不属于这条链
  JEP 484 = Class-File API
  它不是 AOT 方法机器码缓存
```

JEP 515 的官方边界很明确:AOT 缓存提供历史画像,HotSpot 在生产启动后仍由 JIT 生成机器码。在线画像不会停,所以训练流量与生产流量不完全一致时,JVM 仍能继续适应。

---

## ⚙️ 代码实录:AOT 一步工作流

```java
import java.lang.management.ManagementFactory;
import java.util.List;
import java.util.stream.Collectors;

class AotDemo {
    static String greeting(int n) {
        return List.of("Hello", Integer.toString(n), "world")
                .stream()
                .filter(word -> !word.contains("0"))
                .collect(Collectors.joining(", "));
    }

    public static void main(String[] args) {
        for (int i = 0; i < 100_000; i++) greeting(i);
        System.out.println(greeting(0));
        System.out.println("uptime=" +
                ManagementFactory.getRuntimeMXBean().getUptime());
    }
}
```

先打成 JAR。JEP 483 的缓存约束要求类路径使用 JAR,目录类路径不适合作为可复用 AOT 缓存输入:

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

不要拿单次 `uptime` 当性能结论。要比较无缓存与有缓存的多轮分布,固定 JDK 发行版、OS、CPU 架构、类路径和关键模块参数,并观察日志确认缓存真的命中。

---

## ⚠️ 常见陷阱

1. **把 JEP 484 当 Leyden 方法缓存。** 它是标准 Class-File API。
2. **把方法画像写成机器码。** JEP 515 让 JIT 提前拿到画像,不是直接复用训练跑的 C2 原生代码。
3. **缓存输入用散落的 `.class` 目录。** 使用可重复构建的 JAR,并保持类路径一致。
4. **只报最快一次启动时间。** 冷启动受磁盘缓存、杀毒软件、容器配额和 CPU 频率影响,必须做多轮对照。
5. **忽略发行版注入的 JVM 参数。** 训练和生产的模块图或 VM 选项不一致时,日志可能显示部分 AOT 优化被禁用。
6. **认为一键流程只起一个 JVM。** JEP 514 的 `AOTCacheOutput` 会协调训练与缓存创建子进程;大堆场景要预留额外内存。

---

## 🔬 炉底显微镜

```bash
# Windows:确认 JDK 25 已把该标志作为产品选项
java -XX:+UseCompactObjectHeaders -XX:+PrintFlagsFinal -version 2>&1 \
  | findstr UseCompactObjectHeaders

# Linux/macOS
java -XX:+UseCompactObjectHeaders -XX:+PrintFlagsFinal -version 2>&1 \
  | grep UseCompactObjectHeaders

# AOT 日志:重点看 cache opened / linked classes / profile 等信息与降级原因
java -XX:AOTCache=app.aot -Xlog:aot*=debug -cp app.jar AotDemo

# 对象布局应使用 JOL 或同等级工具在固定 VM 参数下测量
# 不要用 Runtime.totalMemory()-freeMemory() 除以对象数冒充对象大小
```

`Runtime` 堆差分会混入 TLAB、数组、GC 时机和 JIT 逃逸分析,无法证明单个对象的 header 大小。文章可以给布局公式,实测必须换成专门工具并记录 VM 标志。

---

## 📐 版本边界

**版本边界**

状态核对于 2026-08-06。

| 能力 | JDK 25 状态 | 官方依据 |
|---|---|---|
| 紧凑对象头 | 可选产品特性,非默认 | JEP 519 |
| AOT 类加载与链接 | 已交付 | JEP 483（JDK 24） |
| 一步生成 AOT 缓存 | 已交付 | JEP 514 |
| AOT 方法画像 | 已交付 | JEP 515 |
| AOT 原生方法代码 | **不在上述 JEP 中** | JEP 515 明确仍由 JIT 生成代码 |
| Class-File API | 已交付,但不是 AOT 缓存 | JEP 484（JDK 24） |

未来排期文章发布前必须重新检查 JEP 状态,尤其不能根据项目路线图把尚未交付的“未来工作”写成当前命令已经支持。

---

## 🎯 随堂练习

**Q1.** JDK 25 启用紧凑对象头是否需要 `--enable-preview`？

**Q2.** JEP 483、514、515 各自解决什么？

**Q3.** JEP 515 是否缓存 C2 机器码？

**Q4.** 为什么训练与生产的类路径、JDK 与架构要保持兼容？

**Q5.** 为什么不能用一次 `Runtime` 堆差分证明对象头大小？

> [!答案]
>
> **Q1. 不需要。** JEP 519 已把紧凑对象头变成 JDK 25 产品特性;用 `-XX:+UseCompactObjectHeaders` 显式开启即可,但它仍不是默认布局。
>
> **Q2.** JEP 483 缓存类加载与链接状态;JEP 514 简化缓存创建命令;JEP 515 缓存方法执行画像,帮助 JIT 更快做优化决定。
>
> **Q3. 不缓存。** JEP 515 明确让 JIT 在启动后利用历史画像更早生成原生代码,生产运行仍会在线画像、JIT 和去优化。
>
> **Q4.** 缓存绑定于具体类内容、运行时与平台约束。环境不兼容时 JVM 会拒绝或降级使用缓存;日志是判断是否真正命中的依据。
>
> **Q5.** 堆差分混入容器数组、TLAB、GC、对象存活与 JIT 优化。对象布局要用 JOL 等工具,同时记录压缩指针、对象对齐和紧凑头标志。

---

## 运行环境、验证与依据

- **运行环境**:Oracle GraalVM 25.0.4+7.1,Windows 11,UTF-8。
- **验证方式**:`java -XX:+UseCompactObjectHeaders -version` 已验证产品标志可直接启用;`AOTCacheOutput` 已实际生成缓存文件并可由 `AOTCache` 打开。启动时间因本机发行版注入 JVMCI 选项而只作流程验证,不把单次数字写成性能结论。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[JEP 519: Compact Object Headers](https://openjdk.org/jeps/519)、[JEP 483: Ahead-of-Time Class Loading & Linking](https://openjdk.org/jeps/483)、[JEP 514: Ahead-of-Time Command-Line Ergonomics](https://openjdk.org/jeps/514)、[JEP 515: Ahead-of-Time Method Profiling](https://openjdk.org/jeps/515)、[JEP 484: Class-File API](https://openjdk.org/jeps/484)。

---

## 🔮 下话预告:F5E5《炉火向明天》

最后一话把稳定能力、孵化 API 与早期访问项目拆成三层:FFM 已正式,Vector API 仍在孵化,Valhalla 值类仍要以当时的 JEP 状态为准。
