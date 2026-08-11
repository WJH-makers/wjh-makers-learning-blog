---
title: "《JVM 火种纪》32 · 炉火向明天（全剧终）"
date: 2027-03-06
summary: "全剧终不做版本预言。FFM 已在 JDK 22 正式，Vector API 在 JDK 25/26 仍是孵化器，Value Classes 的 JEP 401 仍处于 Submitted 并只在 Valhalla EA 试验。把可用于生产、需显式孵化模块和只能研究的能力分成三层；阿零最后带走的不是功能清单，而是发布纪律。"
tags: [Java, Java漫画, JVM, FFM, VectorAPI, Valhalla, Java25, 阿零与焰焰, 全剧终]
chapterType: project
---

# 《JVM 火种纪》32 · 炉火向明天（全剧终）

> JVM 火种纪 · 卷五「优化前沿篇」第 5 话（全剧终）· 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。卷五前四话已把 GC、JIT、JFR 与 AOT 缓存全部过了一遍——阿零这次不是来学新 API，而是来学状态判断:稳定、孵化、研究，三层能力各有各的发布纪律。

---

## 一、事故：把实验特性写成"已发布"

卷五前四话走完，阿零对 JVM 底层已经有显微镜级的把握。但他在写技术博客时翻了车——把 Valhalla 值类写成"Java 25 新特性"，配了一段 `value class Point` 示例代码，标注"实测通过"。

焰焰看了一眼他的博客草稿：「你用的是标准 JDK 25，还是 Valhalla EA Build？」

阿零愣了：「我……我只是看了 JEP 401 的文档，觉得应该能编译。」

焰焰把他的代码拿去编译：

```bash
javac --release 25 Point.java
# error: value classes are not supported in -source 25
```

「JEP 401 仍然是 **Submitted** 状态，没有 Target Release。你写的是研究层能力，不是标准 JDK 25。」

---

## 二、漫画 · 三只不同颜色的箱子

![JVM 火种纪漫画：f05e05-ffm-value-finale](/comics/jvm/f05e05-ffm-value-finale.png)

> [!文字版]
> 
> **〔1〕** 阿零质疑：混淆层级
> 阿零把 FFM、Vector API、Valhalla 值类都写在"Java 25 新特性"清单里。焰焰摇头：「它们不在同一层。」
> 
> **〔2〕** 焰焰讲解：三层金字塔
> 绿色箱子（稳定层）：FFM 已由 JEP 454 在 JDK 22 正式交付，Java 25 可以直接用，不需要 `--enable-preview`。
> 黄色箱子（孵化层）：Vector API 在 JDK 25 是 JEP 508（第十次孵化），在 JDK 26 是 JEP 529（第十一次孵化）。它仍位于 `jdk.incubator.vector`，编译和运行都要 `--add-modules`。
> 红色箱子（研究层）：Value Classes 的 JEP 401 状态仍是 **Submitted**，没有进入标准 JDK 25 或 JDK 26。可下载 Valhalla Early-Access Build 试验，但不能把 `value class` 示例冒充 Java 25 实测。
> 
> **〔3〕** 阿零翻车：编译失败
> 阿零的 `value class Point` 代码用 `javac --release 25` 编译直接报错：`error: value classes are not supported in -source 25`。
> 
> **〔4〕** 焰焰强调：状态先于故事
> 「JEP 的 Status 字段（Draft / Submitted / Candidate / Proposed to Target / Targeted / Delivered）是技术视野的第一道闸门。Submitted 不等于 Targeted，Targeted 不等于 Delivered。」
> 
> **〔5〕** 版本残影：HTTP/3 已到不是门口
> 门外的 HTTP/3 快递也不是"规划中"了：JDK 26 已于 2026-03-17 发布，JEP 517 已交付，HTTP Client 需要显式选择 `HTTP_3`，并可按服务端能力回退。阿零把博客草稿里的"JDK 26 HTTP/3 快递到门口"改成"已交付且默认仍偏好 HTTP/2"。
> 
> **〔6〕** 全剧终标题卡
> 焰焰把三只箱子的钥匙交给阿零：「状态先于故事。先热身，再起飞。先核对，再发布。」画面定格在咖啡站的炉火上，字幕：《JVM 火种纪》全剧终。

---

## 三、本话目标：学会状态分层判断

1. 识别 JEP 状态字段（Submitted / Targeted / Delivered）与能力层级的对应关系
2. 掌握稳定 API、孵化模块、EA 项目的验证方式差异
3. 写技术文章时，把"能力存在"、"默认行为"和"生产建议"分开陈述
4. 养成发布日当天重新核对 JEP 状态的习惯
5. 不把未来规划写成已发生的事实（**这是全剧终的元规则**）

---

## 四、炉内原理图：三层能力金字塔

```
┌────────────────────────────────────────┐
│  🟢 稳定层（Delivered, 标准 JDK）       │  ← FFM API (JDK 22), Scoped Values (JDK 25)
│     javac --release 25 直接编译          │     无需额外开关，跨版本二进制兼容
├────────────────────────────────────────┤
│  🟡 孵化层（Incubator / Preview）       │  ← Vector API (JEP 508/529), Structured Concurrency (Fifth Preview)
│     --add-modules / --enable-preview    │     API 可能变化，升级时需重新编译测试
├────────────────────────────────────────┤
│  🔴 研究层（Submitted / EA Build）      │  ← Valhalla Value Classes (JEP 401 Submitted)
│     标准 JDK 不支持，需专用 EA 发行版    │     语法、语义均未定稿，不能写"实测通过"
└────────────────────────────────────────┘

判断流程：
1. 查 JEP Status 字段（https://openjdk.org/jeps/XXX）
2. Delivered → 稳定层，核对 Target Release
3. Incubator/Preview → 孵化层，记录开关与兼容性声明
4. Submitted/Draft → 研究层，只能写"概念草图"或"EA 试验"
5. 发布文章当天重新检查 JEP 状态，过时内容必须改
```

---

## 五、从博客草稿开始改

阿零的博客草稿原本写的是：

```markdown
# Java 25 新特性清单

1. **FFM API**：堆外内存管理，不再需要 Unsafe
2. **Vector API**：跨平台 SIMD 支持
3. **Value Classes**：无对象身份的值类型，消灭 header 开销
4. **HTTP/3**：JDK 26 快递到门口

全部实测通过 ✓
```

焰焰逐条纠正：

1. **FFM**：正确，但要标注"JDK 22 正式交付（JEP 454）"，不是 Java 25 新增
2. **Vector API**：必须标注"第十次孵化（JEP 508），需 `--add-modules jdk.incubator.vector`"
3. **Value Classes**：**错误**，JEP 401 仍是 Submitted，标准 JDK 25 根本编译不过
4. **HTTP/3**：**过时**，JDK 26 已于 2026-03-17 发布，JEP 517 已交付，要写"已交付，默认仍偏好 HTTP/2"

修正后的版本：

```markdown
# Java 25 能力状态清单（核对于 2026-08-06）

## 🟢 稳定层
- **FFM API**（JEP 454，JDK 22 正式）：`javac --release 25` 直接编译
- **Scoped Values**（JEP 506，JDK 25 正式）：取代 ThreadLocal 的新方案

## 🟡 孵化层
- **Vector API**（JEP 508，第十次孵化）：需 `--add-modules jdk.incubator.vector`，JDK 26 仍是孵化状态
- **Structured Concurrency**（JEP 505，第五次 Preview）：需 `--enable-preview`

## 🔴 研究层
- **Value Classes**（JEP 401，Submitted）：标准 JDK 25 不支持，需 Valhalla EA Build

## 📦 已交付但非默认
- **HTTP/3**（JEP 517，JDK 26 已交付）：需显式选择 `HttpClient.Version.HTTP_3`
```

---

## 六、故意翻一次车：把孵化 API 当稳定 API 用

## 六、故意翻一次车：把孵化 API 当稳定 API 用

阿零写了一段 Vector API 示例，想演示 SIMD 加速：

```java
// VectorDemo.java
import jdk.incubator.vector.*;

class VectorDemo {
    static final VectorSpecies<Float> SPECIES = FloatVector.SPECIES_256;
    
    public static void main(String[] args) {
        float[] a = {1, 2, 3, 4, 5, 6, 7, 8};
        float[] b = {8, 7, 6, 5, 4, 3, 2, 1};
        float[] c = new float[8];
        
        for (int i = 0; i < a.length; i += SPECIES.length()) {
            var va = FloatVector.fromArray(SPECIES, a, i);
            var vb = FloatVector.fromArray(SPECIES, b, i);
            va.add(vb).intoArray(c, i);
        }
        System.out.println("result: " + java.util.Arrays.toString(c));
    }
}
```

他像编译稳定 API 那样直接编译：

```bash
javac --release 25 VectorDemo.java
# error: package jdk.incubator.vector is not visible
#   (package jdk.incubator.vector is declared in module jdk.incubator.vector, which is not in the module graph)
```

**翻车了**。孵化模块不在默认模块图里，必须显式 `--add-modules`。

---

## 七、编译官罚单：孵化模块不自动可见

```
error: package jdk.incubator.vector is not visible
  (package jdk.incubator.vector is declared in module jdk.incubator.vector, 
   which is not in the module graph)
```

**罚单说明**：
- 孵化（Incubator）和预览（Preview）能力**不在默认模块图**，编译器不会自动找到它们
- 这不是语法错误，而是**模块可见性边界**——Java 9+ 的模块系统把孵化 API 隔离在独立模块里，避免开发者误用未稳定的 API
- 预览特性用 `--enable-preview`；孵化模块用 `--add-modules <module>`
- 与稳定 API 的区别：稳定 API 在 `java.base` 等核心模块里，默认可见；孵化 API 必须显式声明依赖

---

## 八、修复并验证

**修复方式**：编译和运行都加 `--add-modules jdk.incubator.vector`

```bash
# 先确认模块存在
java --list-modules | grep jdk.incubator.vector
# jdk.incubator.vector@25.0.4

# 编译
javac --release 25 --add-modules jdk.incubator.vector VectorDemo.java

# 运行
java --add-modules jdk.incubator.vector VectorDemo
# result: [9.0, 9.0, 9.0, 9.0, 9.0, 9.0, 9.0, 9.0]
```

**判据**：
1. ✓ 编译通过（加 `--add-modules` 后不再报 "not visible"）
2. ✓ 运行输出正确（8 对元素相加，每对和都是 9.0）
3. ✓ 升级到 JDK 26 后必须重新编译测试——孵化 API 不保证源码与二进制兼容

**稳定层示例**（对比）：

```java
// FfmDemo.java — 稳定 API，无需额外开关
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

`Arena` 关闭后再访问 segment 会失败，这正是生命周期边界。调用受限制的本地函数还涉及 native access 与平台 ABI，不能把"无需手写 JNI 胶水"简化成"跨平台没有风险"。

---

## 九、🔬 炉底显微镜

```bash
# ── 稳定基线 ────────────────────────────────────
java --version
# openjdk version "25.0.4" 2026-07-15
# Oracle GraalVM 25.0.4+7.1

javac --release 25 FfmDemo.java
java FfmDemo
# point=3,4

# ── 孵化模块是否存在 ────────────────────────────
java --list-modules | grep jdk.incubator.vector
# jdk.incubator.vector@25.0.4

# ── EA 能力不要在标准 JDK 上伪造成功 ────────────
java -XshowSettings:properties -version 2>&1 | grep -E "java.version|java.vendor"
# java.vendor = Oracle Corporation
# java.version = 25.0.4

# ── 研究层能力：Value Classes 编译失败 ─────────
# echo 'value class Point { int x; int y; }' > Point.java
# javac --release 25 Point.java
# error: value classes are not supported in -source 25
```

**验证报告至少记录**：
- JDK vendor/build（Oracle GraalVM / OpenJDK / Azul Zulu 等）
- 是否开启 preview/incubator（`--enable-preview` / `--add-modules`）
- CPU 架构（x86_64 / aarch64）
- 运行命令和真实输出

只写"JDK 25 实测"却给出标准 JDK 根本不存在的 `value class` 语法，比不写验证更误导。

---

## 十、⏳ 版本时光机：JDK 26 与能力状态核对

**版本边界**

状态核对于 2026-08-06。

| 能力 | Java 25 状态 | Java 26 状态 | 备注 |
|---|---|---|---|
| FFM API | 正式 | 正式 | JEP 454，自 JDK 22 |
| Scoped Values | 正式 | 正式 | JEP 506 |
| Compact Object Headers | 可选产品特性 | 可选产品特性 | JEP 519，非默认 |
| Structured Concurrency | Fifth Preview | Sixth Preview (JEP 525) | 需 `--enable-preview` |
| Vector API | Tenth Incubator (JEP 508) | Eleventh Incubator (JEP 529) | 需 `--add-modules` |
| Value Classes | **不在标准 JDK** | **不在标准 JDK** | JEP 401 Submitted，Valhalla EA |
| Generational ZGC | 选择 ZGC 时的唯一模式 | 同左 | JDK 24 已移除非分代模式；默认收集器仍是 G1 |
| AOT method profiling | 已交付 | 已交付 | JEP 515，缓存画像而非机器码 |
| HTTP/3 | **不在 JDK 25** | 已交付 (JEP 517) | 需显式选择 `HTTP_3`，默认仍偏好 HTTP/2 |

**JDK 26 已于 2026-03-17 GA**——与本话相关的已交付能力包括：

| 能力 | JEP | 真实状态 |
|---|---|---|
| HTTP/3 for HTTP Client | 517 | JDK 26 已交付，需显式选择 HTTP/3 |
| AOT Object Caching with Any GC | 516 | JDK 26 已交付 |
| Structured Concurrency | 525 | **Sixth Preview**，仍未正式 |
| Vector API | 529 | **Eleventh Incubator** |

所以"JDK 26 HTTP/3 快递已到门口"必须改成"已交付且默认仍偏好 HTTP/2"。新功能的存在、默认行为和生产建议是三件不同的事。

---

## 十一、对应招聘技能

**关键词**：技术视野、版本管理、JEP 状态判断、生产可靠性工程

**典型岗位**
- **技术 Lead / 架构师**："制定技术选型标准，评估新技术可行性与风险"
- **SRE / 平台工程师**："负责 JDK 升级策略，制定生产环境稳定性指南"
- **技术作家 / 开发者关系**："撰写技术博客，对外传播时需准确区分能力状态"

**简历可写项**（需实证支撑）
- 制定团队 JDK 升级决策流程，区分稳定 API、预览特性与孵化模块的采纳时机
- 评估 JEP 状态（Submitted / Targeted / Delivered）与生产就绪度的对应关系
- 撰写技术博客 XX 篇，发布前核对 JEP 状态与版本边界，避免过时信息传播

**面试可能问到**
- JEP 的 Status 字段有哪些？Submitted 与 Delivered 的区别是什么？
- 为什么孵化 API 需要 `--add-modules`？稳定 API 为什么不需要？
- 如何验证一个 JEP 是否已交付？（去 openjdk.org/jeps/XXX 看 Status 与 Target Release）
- 写技术文章时，如何避免把未来规划写成已发生的事实？

---

## 十二、项目检查点 · 豆豆咖啡站 v5.5（卷五全剧终）

阿零把博客草稿重新校对了一遍，把"Java 25 新特性"改成"Java 25 能力状态清单（核对于 YYYY-MM-DD）"，分层标注稳定 / 孵化 / 研究。

焰焰点头：「新特性不是发布那天就该上生产。产品特性意味着**可以安心测试了**，不是**必须立刻用**。孵化 API 意味着**可以试验了**，不是**已经稳定了**。Submitted 意味着**可以关注了**，不是**可以写实测了**。」

**卷五全季回顾**：
- v5.1：GC 选型（G1 默认 + ZGC 分代唯一）
- v5.2：JIT 分层编译与 Code Cache 监控
- v5.3：JFR 常态录制上线，凌晨三点十七分那笔账等下次再出现就能回溯
- v5.4：紧凑对象头与 AOT 缓存写进文档，生产环境暂不开启
- v5.5：学会状态分层判断，博客发布前核对 JEP 状态（**全剧终里程碑**）

当前状态：咖啡站优化债已还清，技术视野从"会用 API"升级到"会判断能力状态"。

---

## 十三、下一话悬念：火种是校验习惯

没有下一话了。

阿零最后带走的不是一张"未来功能清单"，而是一套发布纪律：

- 稳定 API 写可运行示例
- 预览与孵化功能写清开关和兼容风险
- 研究项目只陈述当前状态
- 未来排期在上线当天重新核验

焰焰把炉门合到只剩一道红线：「先热身，再起飞。先核对，再发布。」

**🔥 全剧终：火种是校验习惯，不是功能清单。**

---

## 🎯 随堂练习

## 🎯 随堂练习

**Q1.** FFM 在 Java 25 是否需要 `--enable-preview`？

**Q2.** Vector API 为什么需要 `--add-modules`？

**Q3.** Value Classes 是否属于标准 JDK 25？

**Q4.** JDK 26 的 HTTP/3 是否已经交付，是否默认使用？

**Q5.** 为什么不能承诺 value object 一定扁平化？

**Q6.** 如何判断一个 JEP 是否已正式交付？

**Q7.** 写技术博客时，如何避免把未来规划写成已发生的事实？

**Q8.** 孵化 API 与稳定 API 的编译方式有何不同？

**Q9.** JEP 的 Status 字段有哪些状态？Submitted 与 Targeted 的区别是什么？

**Q10.** 全剧终留下的核心原则是什么？

> [!答案]
>
> **Q1. 不需要。** FFM 已由 JEP 454 在 JDK 22 正式交付。调用受限制的本地函数仍要处理 native access 与平台 ABI 边界。
>
> **Q2.** 因为 JDK 25 的 Vector API 仍在 `jdk.incubator.vector` 孵化模块中；孵化 API 不保证跨版本兼容。
>
> **Q3. 不是。** JEP 401 仍是 Submitted，试验需要 Valhalla EA Build，不能用标准 `javac --release 25` 编译。
>
> **Q4. 已交付。** JEP 517 随 JDK 26 GA；HTTP Client 需要显式选择 `HttpClient.Version.HTTP_3`，默认协议偏好没有从 HTTP/2 改成 HTTP/3。
>
> **Q5.** JEP 401 的目标是给 JVM 优化自由，不保证具体布局。是否扁平化还受可空性、原子读写宽度、使用点编译信息与 JVM 实现影响。
>
> **Q6.** 去 openjdk.org/jeps/XXX 查看 Status 字段：Delivered 表示已交付，Target Release 字段标注交付版本。
>
> **Q7.** 发布前核对 JEP Status；Submitted/Draft 只能写"研究"或"EA 试验"；Delivered 才能写"已交付"；写明核对日期。
>
> **Q8.** 稳定 API：`javac --release 25` 直接编译；孵化 API：需 `javac --release 25 --add-modules jdk.incubator.vector`。
>
> **Q9.** Draft（草案）→ Submitted（提交）→ Candidate（候选）→ Proposed to Target（提议目标版本）→ Targeted（已定目标版本）→ Delivered（已交付）。Submitted 只是提交了提案，Targeted 是已确定要进哪个版本。
>
> **Q10. 状态先于故事。先热身，再起飞。先核对，再发布。** 火种是校验习惯，不是功能清单。

---

## 运行环境、验证与依据

- **运行环境**：Oracle GraalVM 25.0.4+7.1，Windows 11，UTF-8。
- **验证方式**：FFM `MemorySegment` 示例已用 `javac --release 25` 编译运行；Vector 模块用 `java --list-modules` 核对；标准 JDK 25 不接受 Valhalla `value class` 语法，因此本文明确不伪造该项"实测通过"。所有 JEP 状态均于 2026-08-06 核对。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[JEP 454: Foreign Function & Memory API](https://openjdk.org/jeps/454)、[JEP 508: Vector API (Tenth Incubator)](https://openjdk.org/jeps/508)、[JEP 529: Vector API (Eleventh Incubator)](https://openjdk.org/jeps/529)、[JEP 401: Value Classes and Objects](https://openjdk.org/jeps/401)、[Project Valhalla](https://openjdk.org/projects/valhalla)、[JEP 517: HTTP/3 for HTTP Client](https://openjdk.org/jeps/517)、[JEP 516: Ahead-of-Time Class Loading & Linking](https://openjdk.org/jeps/516)、[JEP 525: Structured Concurrency (Sixth Preview)](https://openjdk.org/jeps/525)、[JDK 26 Release Notes](https://jdk.java.net/26/release-notes)。

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
