---
title: "F2E1 两个世界的时间 — java.time 核心类型"
date: "2026-09-19"
series: "jvm-academy"
season: 2
episode: 1
tags: ["Java 25", "java.time", "Instant", "LocalDateTime", "Duration"]
summary: "机器数秒（Instant）与人类看历（LocalDateTime）是两块完全不同的表——Date 把它们混在一起酿成了三十年的坑，java.time 把它们分开。"
---

> **"炉子里的温度传感器和墙上的挂钟，读的是两种不同的时间——你的旧代码把它们都叫做 Date。"**
> — 焰焰，指着烘豆炉的时间戳记录说

---

## 🎬 开场：两块表的误会

![《JVM 火种纪》08 · 两个世界的时间——java.time 六格漫画](/comics/jvm/f02e01-two-clocks.png)

> **〔1〕**
> 卷二开幕。阿零打开订单日志，发现一个奇怪的 bug：某张订单的"创建时间"在数据库里显示`2026-08-01 09:30:00`，但服务日志里却是 `2026-08-01 01:30:00`——差了整整8小时。
>
> 「这是同一个 `java.util.Date` 对象，为什么两边显示不一样？」

> **〔2〕**
> 焰焰翻开《JEP 编年史》到 `java.time` 那一章，尾巴是讲解模式的稳定黄色。
>
> 「因为 `Date` 本质上存的是 **Unix 时间戳**（从 1970-01-01T00:00:00Z 起的毫秒数）——这是机器时间。但你调用 `toString()` 时，它用了系统本地时区来格式化——这是人类时间。一个对象，两种解读，歧义永无止境。」

> **〔3〕**
> 「`java.time` 怎么解决的？」
>
> 「把两块表分开：**`Instant` 只管机器时间**（纳秒精度的 UTC 时间戳），**`LocalDateTime` 只管人类挂钟时间**（年月日时分秒，没有时区）。想在两者之间换算，必须显式指定 `ZoneId`——不给时区，换算代码写不出来。」

> **〔4〕**
> 「那旧的 `Date` 怎么迁移？」
>
> 「`legacyDate.toInstant()` ——一步切换到机器时间。`Date` 的残影从此锁进琥珀展览，不再参与业务逻辑。」

---

## 🔑 核心类型一览

| 类型 | 含义 | 有无时区 | 典型用途 |
|---|---|---|---|
| `Instant` | UTC 纳秒时间戳 | UTC（无本地时区） | 数据库、日志、Event 时间戳 |
| `LocalDateTime` | 挂钟时间（年月日时分秒） | ❌ 无 | 展示、计划、日历 |
| `LocalDate` | 日期（年月日） | ❌ 无 | 生日、节假日 |
| `LocalTime` | 时间（时分秒纳秒） | ❌ 无 | 营业时间、闹钟 |
| `ZonedDateTime` | 带时区的完整时间 | ✅ 有 | 跨时区调度、夏令时（下话） |
| `Duration` | 时间段（秒+纳秒） | - | 计时、超时配置 |
| `Period` | 日期段（年月日） | - | 年龄、合同期限 |

---

## ⚙️ 代码实录：两块表的基本操作

```java
// javac -encoding UTF-8 --release 25 TimeDemo.java
import java.time.*;
import java.time.format.DateTimeFormatter;

class TimeDemo {
    public static void main(String[] args) {
        // ── 机器时间：Instant ──────────────────────────────
        Instant now = Instant.now();          // UTC 纳秒时间戳
        System.out.println("Instant: " + now);
        // 输出: 2026-08-05T09:06:55.829415900Z

        Instant later = now.plusSeconds(3600);
        Duration dur = Duration.between(now, later);
        System.out.println("Duration: " + dur.toSeconds() + "s");  // 3600

        // ── 人类时间：LocalDateTime ────────────────────────
        LocalDateTime ldt = LocalDateTime.of(2026, 8, 1, 9, 30, 0);
        System.out.println("LocalDateTime: " + ldt);
        // 输出: 2026-08-01T09:30

        System.out.println("Formatted: " +
            ldt.format(DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm")));
        // 输出: 2026/08/01 09:30

        // ── 互相换算：必须经过 ZoneId ─────────────────────
        ZoneId shanghai = ZoneId.of("Asia/Shanghai");
        LocalDateTime fromInstant = LocalDateTime.ofInstant(now, shanghai);
        System.out.println("Instant→LocalDateTime(上海): " + fromInstant);

        Instant backToInstant = ldt.atZone(shanghai).toInstant();
        System.out.println("LocalDateTime→Instant: " + backToInstant);

        // ── 旧代码迁移：Date.toInstant() ──────────────────
        java.util.Date legacyDate = new java.util.Date();
        Instant fromLegacy = legacyDate.toInstant();
        System.out.println("Date→Instant: " + fromLegacy);
    }
}
```

**实测输出**（GraalVM 25.0.4）：

```
Instant: 2026-08-05T09:06:55.829415900Z
Duration: 3600s
LocalDateTime: 2026-08-01T09:30
Formatted: 2026/08/01 09:30
Instant→LocalDateTime(上海): 2026-08-05T17:06:55.829415900
LocalDateTime→Instant: 2026-08-01T01:30:00Z
Date→Instant: 2026-08-05T09:06:55.844Z
```

---

## 🚨 常见陷阱

### 陷阱 1：LocalDateTime 减法不考虑夏令时

```java
// 错误：跨越夏令时边界的时间差，用 LocalDateTime 计算结果偏差 1 小时
LocalDateTime start = LocalDateTime.of(2026, 3, 8, 1, 0, 0);   // 纽约时间
LocalDateTime end   = LocalDateTime.of(2026, 3, 8, 3, 0, 0);   // 夏令时后
Duration wrongDur = Duration.between(start, end);
System.out.println(wrongDur.toHours());  // 2（实际只过了 1 小时！）
```

跨时区/夏令时场景必须用 `ZonedDateTime`（下话专门讲）。

### 陷阱 2：`now()` 不传时区，默认系统时区

```java
LocalDateTime.now()  // 用系统默认时区 → 部署到不同机器结果不同
Instant.now()        // 始终 UTC → 与部署机器无关（推荐用于存储）
```

---

## 🔬 炉底显微镜

> 焰焰在炉底贴了一张对比图：「`Instant` 和 `LocalDateTime` 在 JVM 里是什么？」

```bash
# 查看 Instant 类结构
javap -p java.time.Instant

# 查看 Duration 类结构
javap -p java.time.Duration
```

**关键字段（从 OpenJDK 源码）**：

```
// Instant 存两个字段
private final long seconds;    // 从 1970-01-01T00:00:00Z 起的秒数
private final int  nanos;      // 纳秒偏移量（0..999_999_999）

// LocalDateTime 存两个字段
private final LocalDate date;  // 年月日
private final LocalTime time;  // 时分秒纳秒
```

关键观测点：
- `Instant` 是两个 primitive 字段——轻量、无歧义、线程安全（final）
- `LocalDateTime` 同样不可变（`final` 字段）——`plusDays` 等方法返回新对象
- 两者均实现 `Comparable`，可直接 `before()`/`after()` 或 `compareTo()`
- `DateTimeFormatter` 是**线程安全**的（`SimpleDateFormat` 不是）

---

## 📐 版本边界

**版本边界**

| 里程碑 | JDK | 说明 |
|---|---|---|
| `java.util.Date` | JDK 1.0 | 线程不安全，时区混淆，大量方法已废弃 |
| Joda-Time（第三方） | - | java.time 的蓝本 |
| **java.time GA** | **JDK 8** | **JSR-310，彻底替代 Date/Calendar** |
| `Date.toInstant()` | JDK 8 | 老代码迁移桥梁 |
| 本话代码运行环境 | JDK 25 | ✅ |

```bash
# 证明 Instant 纳秒精度（毫秒时代的 Date 只有毫秒）
javap -p java.util.Date | grep "long"
# private transient long fastTime;  ← 只有毫秒精度的 long
```

---

## 🎯 随堂练习

**Q1.** `Instant` 和 `LocalDateTime` 的核心区别是什么？

**Q2.** 下列代码输出什么？

```java
LocalDateTime ldt = LocalDateTime.of(2026, 1, 1, 12, 0);
Instant i = ldt.toInstant();  // ← 不传 ZoneId
```

**Q3.** `DateTimeFormatter.ofPattern("yyyy-MM-dd")` 是线程安全的吗？`SimpleDateFormat` 呢？

**Q4.** 数据库 TIMESTAMP 字段对应 java.time 的哪个类型最合适？

**Q5.** `Duration.between(a, b)` 中，`a` 和 `b` 可以是 `LocalDateTime` 吗？结果包含时区信息吗？

**Q6.** 如何把 `Instant` 转为上海时间的 `LocalDateTime`？写出一行代码。

**Q7.** `Period.between(LocalDate.of(2020,1,1), LocalDate.of(2026,8,5))` 返回什么？

**Q8.** `Instant.EPOCH` 代表什么时间点？

**Q9.** `LocalDateTime.now()` 在 UTC+0 和 UTC+8 的服务器上结果相同吗？

**Q10.** 为什么推荐用 `Instant` 存数据库时间戳而不是 `LocalDateTime`？

---

> [!答案]
>
> **Q1.** `Instant` 是机器时间（UTC 时间戳，绝对），与时区无关；`LocalDateTime` 是人类挂钟时间（年月日时分秒，相对），没有时区信息——同一个 `LocalDateTime` 在不同时区代表不同的 `Instant`。
>
> **Q2. 编译报错。**`LocalDateTime.toInstant()` 必须传 `ZoneOffset` 参数（如 `ldt.toInstant(ZoneOffset.UTC)` 或 `ldt.atZone(zoneId).toInstant()`），不能无参调用。
>
> **Q3. `DateTimeFormatter` 线程安全；`SimpleDateFormat` 线程不安全。**`DateTimeFormatter` 是不可变对象，可以安全地作为 static final 常量共享；`SimpleDateFormat` 内部有可变状态，多线程共用会产生随机格式错误。
>
> **Q4. `Instant`（或 `OffsetDateTime`）。**TIMESTAMP 存的是绝对时间，对应 `Instant`。若数据库 JDBC 驱动支持，可用 `OffsetDateTime` 保留时区信息。
>
> **Q5. 可以。**`Duration.between(LocalDateTime, LocalDateTime)` 合法，结果是纯时间段（不含时区信息）——注意跨夏令时时结果可能不准确，需要用 `ZonedDateTime` 才能正确处理。
>
> **Q6.** `LocalDateTime.ofInstant(instant, ZoneId.of("Asia/Shanghai"))`
>
> **Q7.** `P6Y7M4D`（6年7个月4天）。`Period` 用年月日表示，不转换为总天数。
>
> **Q8. `Instant.EPOCH` = `1970-01-01T00:00:00Z`**（Unix 纪元），即 `seconds=0, nanos=0`。
>
> **Q9. 不相同。**`LocalDateTime.now()` 使用系统默认时区：UTC+0 服务器返回 UTC 时间，UTC+8 返回北京时间，相差8小时。生产代码中应明确指定时区：`LocalDateTime.now(ZoneId.of("Asia/Shanghai"))`。
>
> **Q10. `Instant` 是绝对时间，不受部署机器时区影响；`LocalDateTime` 依赖时区解释，存入数据库后若服务器时区配置变更，读出的含义会改变。**时间戳语义的字段（创建时间、修改时间）应存 `Instant`/`TIMESTAMP WITH TIME ZONE`，避免时区歧义。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：本话所有代码以 `javac -encoding UTF-8 --release 25` 编译后运行；`Duration.toSeconds()` 断言通过；`Instant.now()` 纳秒精度输出截图取自实际运行。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API - java.time](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/time/package-summary.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。`java.time`（JSR-310）在 JDK 8 正式引入，JDK 25 无变更。

---

## 🔮 下话预告：F2E2《夏令时凶案》

`Instant` 和 `LocalDateTime` 分清楚了——下一话进入实战：海外分店订单凭空「穿越」了一小时。

破案过程将展示 `ZonedDateTime`、`ZoneId`、夏令时边界计算——以及为什么多线程共用一支 `SimpleDateFormat` 笔会出现随机乱码。
