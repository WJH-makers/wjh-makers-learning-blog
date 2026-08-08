---
title: "F5E5 炉火向明天 — 稳定 API、孵化器与 Valhalla"
date: "2027-03-06"
series: "jvm-academy"
season: 5
episode: 5
tags: ["Java 25", "FFM", "Vector API", "Valhalla", "JDK 26", "全剧终"]
summary: "全剧终不做版本预言：FFM 已在 JDK 22 正式,Vector API 在 JDK 25/26 仍是孵化器,Value Classes 的 JEP 401 仍处于 Submitted 并只在 Valhalla EA 试验。把可用于生产、需显式孵化模块和只能研究的能力分成三层。"
---

![JVM 火种纪漫画：f05e05-ffm-value-finale](/comics/jvm/f05e05-ffm-value-finale.png)

> **“真正的技术视野不是把未来写成已经发生,而是知道哪一层今天能依赖、哪一层只能试验、哪一层发布前必须重查。”**
> — 焰焰,合上《JEP 编年史》

---

## 🎬 开场:三只不同颜色的箱子

> **〔1〕**
> 绿色箱子写着“稳定”:Foreign Function & Memory API 已由 JEP 454 在 JDK 22 正式交付。Java 25 可以直接分配受生命周期管理的堆外内存,不需要 `--enable-preview`。

> **〔2〕**
> 黄色箱子写着“孵化”:Vector API 在 JDK 25 是 JEP 508（第十次孵化）,在 JDK 26 是 JEP 529（第十一次孵化）。它仍位于 `jdk.incubator.vector`,编译和运行都要 `--add-modules`。

> **〔3〕**
> 红色箱子写着“研究”:Value Classes and Objects 的 JEP 401 状态仍是 **Submitted**,没有进入标准 JDK 25 或 JDK 26。可下载 Valhalla Early-Access Build 试验,但不能把 `value class` 示例冒充 Java 25 实测。

> **〔4〕**
> 门外的 HTTP/3 快递也不是“规划中”了:JDK 26 已于 2026-03-17 发布,JEP 517 已交付,HTTP Client 需要显式选择 `HTTP_3`,并可按服务端能力回退。焰焰把三只箱子的钥匙交给阿零:「状态先于故事。」

---

## 🟢 稳定层:FFM 已经可以依赖

FFM 的价值不只是“少写 JNI”。它把堆外内存的范围、生命周期、对齐和读写布局放进受支持的 Java API。下面代码在标准 Java 25 上运行,没有预览开关:

```java
import java.lang.foreign.Arena;
import java.lang.foreign.ValueLayout;

class FfmDemo {
    public static void main(String[] args) {
        try (Arena arena = Arena.ofConfined()) {
            long intSize = ValueLayout.JAVA_INT.byteSize();
            var point = arena.allocate(intSize * 2, ValueLayout.JAVA_INT.byteAlignment());

            point.set(ValueLayout.JAVA_INT, 0, 3);
            point.set(ValueLayout.JAVA_INT, intSize, 4);

            int x = point.get(ValueLayout.JAVA_INT, 0);
            int y = point.get(ValueLayout.JAVA_INT, intSize);
            System.out.println("point=" + x + "," + y);
        }
    }
}
```

```bash
javac --release 25 FfmDemo.java
java FfmDemo
# point=3,4
```

`Arena` 关闭后再访问 segment 会失败,这正是生命周期边界。调用受限制的本地函数还涉及 native access 与平台 ABI,不能把“无需手写 JNI 胶水”简化成“跨平台没有风险”。

---

## 🟡 孵化层:Vector API 可以试,不能假装已定型

```text
JDK 25: JEP 508, tenth incubator
JDK 26: JEP 529, eleventh incubator
模块:   jdk.incubator.vector
开关:   --add-modules jdk.incubator.vector
```

Vector API 给 JIT 一个跨 CPU 指令集的向量表达,但“写了 Vector API”不等于一定生成 AVX-512。实际指令取决于 CPU、向量形状、HotSpot 优化与数据布局,要通过 JMH、JIT 日志或汇编观察验证。

```bash
# 先确认当前 JDK 是否携带孵化模块
java --list-modules | grep jdk.incubator.vector

# PowerShell
java --list-modules | Select-String jdk.incubator.vector

# 示例工程的编译/运行形状
javac --release 25 --add-modules jdk.incubator.vector VectorDemo.java
java --add-modules jdk.incubator.vector VectorDemo
```

跨 JDK 升级时必须重新编译并重跑测试,因为 incubator API 不承诺二进制与源代码兼容。

---

## 🔴 研究层:Valhalla 值类仍不是 Java 25 功能

JEP 401 的目标是引入没有对象身份、字段为 final 的 value objects,让 JVM 有更多布局与扁平化自由。但官方同时强调:它不保证某一种内存布局,部分优化还依赖后续语言与 JVM 增强。

```text
概念草图（仅用于理解,不是标准 JDK 25 源码）

value class Point {
    int x;
    int y;
}
```

截至 2026-08-06:

- JEP 401 状态是 `Submitted`,没有 Target Release;
- 试验入口是 Project Valhalla Early-Access Build;
- `value record`、`Objects.hasIdentity` 等示例属于该 EA 设计,不能放进 `javac --release 25` 的验证结果;
- “值对象必然消灭 header、必然扁平化”是过度承诺。JEP 401 只赋予 JVM优化自由,具体编码受使用点、原子性、可空性与编译信息影响。

这类文章要在**发布日期当天**重新检查 JEP 状态和 EA 语法,不能用写稿日的路线图冻结到 2027 年。

---

## JDK 26:已经发布,不是“门口规划”

JDK 26 的 GA 日期是 2026-03-17。与本话相关的已交付能力包括:

| 能力 | JEP | 真实状态 |
|---|---|---|
| HTTP/3 for HTTP Client | 517 | JDK 26 已交付,需显式选择 HTTP/3 |
| AOT Object Caching with Any GC | 516 | JDK 26 已交付 |
| Structured Concurrency | 525 | **Sixth Preview**,仍未正式 |
| Vector API | 529 | **Eleventh Incubator** |

所以“JDK 26 HTTP/3 快递已到门口”必须改成“已交付且默认仍偏好 HTTP/2”。新功能的存在、默认行为和生产建议是三件不同的事。

---

## 🔬 炉底显微镜

```bash
# 稳定基线
java --version
javac --release 25 FfmDemo.java
java FfmDemo

# 孵化模块是否存在
java --list-modules | grep jdk.incubator.vector

# EA 能力不要在标准 JDK 上伪造成功；先记录实际发行版
java -XshowSettings:properties -version 2>&1 | grep -E "java.version|java.vendor"
```

验证报告至少记录:JDK vendor/build、是否开启 preview/incubator、CPU 架构、运行命令和真实输出。只写“JDK 25 实测”却给出标准 JDK 根本不存在的 `value class` 语法,比不写验证更误导。

---

## 📐 全季版本边界终表

**版本边界**

状态核对于 2026-08-06。

| 能力 | Java 25 状态 | 备注 |
|---|---|---|
| FFM API | 正式 | JEP 454,自 JDK 22 |
| Scoped Values | 正式 | JEP 506 |
| Compact Object Headers | 可选产品特性 | JEP 519,非默认 |
| Structured Concurrency | Fifth Preview | JEP 505,需 `--enable-preview` |
| Vector API | Tenth Incubator | JEP 508,需 `--add-modules` |
| Value Classes | **不在标准 JDK 25** | JEP 401 Submitted,Valhalla EA |
| Generational ZGC | 选择 ZGC 时的唯一模式 | JDK 24 已移除非分代模式;默认收集器仍是 G1 |
| AOT method profiling | 已交付 | JEP 515,缓存画像而非机器码 |

---

## 🎯 随堂练习

**Q1.** FFM 在 Java 25 是否需要 `--enable-preview`？

**Q2.** Vector API 为什么需要 `--add-modules`？

**Q3.** Value Classes 是否属于标准 JDK 25？

**Q4.** JDK 26 的 HTTP/3 是否已经交付,是否默认使用？

**Q5.** 为什么不能承诺 value object 一定扁平化？

> [!答案]
>
> **Q1. 不需要。** FFM 已由 JEP 454 在 JDK 22 正式交付。调用受限制的本地函数仍要处理 native access 与平台 ABI 边界。
>
> **Q2.** 因为 JDK 25 的 Vector API 仍在 `jdk.incubator.vector` 孵化模块中;孵化 API 不保证跨版本兼容。
>
> **Q3. 不是。** JEP 401 仍是 Submitted,试验需要 Valhalla EA Build,不能用标准 `javac --release 25` 编译。
>
> **Q4. 已交付。** JEP 517 随 JDK 26 GA;HTTP Client 需要显式选择 `HttpClient.Version.HTTP_3`,默认协议偏好没有从 HTTP/2 改成 HTTP/3。
>
> **Q5.** JEP 401 的目标是给 JVM 优化自由,不保证具体布局。是否扁平化还受可空性、原子读写宽度、使用点编译信息与 JVM 实现影响。

---

## 运行环境、验证与依据

- **运行环境**:Oracle GraalVM 25.0.4+7.1,Windows 11,UTF-8。
- **验证方式**:FFM `MemorySegment` 示例已用 `javac --release 25` 编译运行;Vector 模块用 `java --list-modules` 核对;标准 JDK 25 不接受 Valhalla `value class` 语法,因此本文明确不伪造该项“实测通过”。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[JEP 454: Foreign Function & Memory API](https://openjdk.org/jeps/454)、[JEP 508: Vector API (Tenth Incubator)](https://openjdk.org/jeps/508)、[JEP 401: Value Classes and Objects](https://openjdk.org/jeps/401)、[Project Valhalla](https://openjdk.org/projects/valhalla)、[JEP 517: HTTP/3](https://openjdk.org/jeps/517)、[JDK 26 Release Notes](https://jdk.java.net/26/release-notes)。

---

## 🔥 全剧终:火种是校验习惯

阿零最后带走的不是一张“未来功能清单”,而是一套发布纪律:稳定 API 写可运行示例,预览与孵化功能写清开关和兼容风险,研究项目只陈述当前状态,未来排期在上线当天重新核验。

焰焰把炉门合到只剩一道红线:「先热身,再起飞。先核对,再发布。」
