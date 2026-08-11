---
title: "《JVM 火种纪》08 · 两个世界的时间"
date: 2026-09-19
summary: "促销引擎上线了，订单时间戳却还攥着 java.util.Date：同一个对象在数据库里是 09:30，在日志里是 01:30。阿零把它拆成 Instant 管机器秒、LocalDateTime 管人类挂钟，换算一律显式过 ZoneId；炉底看到 Instant 其实只是两个 final 字段。"
tags: [Java, Java漫画, JVM, java.time, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》08 · 两个世界的时间

> JVM 火种纪 · 卷二「类库补课篇」第 1 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。卷一终章的促销引擎已经上线，后厨语法全面切到 Java 25——可算折扣要用的那个订单时间戳，还攥着 `java.util.Date`。

---

## 一、事故：数据库和日志差了 8 小时

卷一终章把促销引擎交付之后，阿零以为语法债已经还清了。这周对账，账对不上。

同一张订单，数据库里「创建时间」写的是 `2026-08-01 09:30:00`，服务日志里却是 `2026-08-01 01:30:00`——差整整 8 小时。两边读的是同一个 `java.util.Date` 对象。

他把类型翻出来看：促销规则全是 record、全是 sealed、全是穷尽 switch，干干净净。而它算折扣要用的那个时间戳，还攥着 JDK 1.0 时代的 `java.util.Date`。

豆豆凑过来看了一眼：「卷一你让编译器守住了**类型**。可这不是类型问题——是**同一个值有两种读法**，编译器管不着。」

---

## 二、漫画 · 两块表的误会

![《JVM 火种纪》08 · 两个世界的时间——java.time 六格漫画](/comics/jvm/f02e01-two-clocks.png)

> [!文字版]
> **〔1〕** 卷二开幕，地下一层。阿零把两块屏幕并排摆着：左边数据库写 `2026-08-01 09:30:00`，右边服务日志写 `2026-08-01 01:30:00`。「同一个 `java.util.Date` 对象，为什么两边显示不一样？」
>
> **〔2〕** 焰焰翻开《JEP 编年史》到 `java.time` 那一章，尾巴是讲解模式的稳定黄色。「因为 `Date` 存的是 **Unix 时间戳**（从 1970-01-01T00:00:00Z 起的毫秒数）——这是机器时间。但你调 `toString()` 时，它拿系统本地时区去格式化——这是人类时间。一个对象，两种解读，歧义永无止境。」
>
> **〔3〕** 阿零不服:「那我全站统一时区不就完了?」焰焰尾巴一甩:「统一到哪台机器上?这个'统一'写在部署脚本里，还是写在类型里?写在脚本里的规矩，换台机器就没了。」
>
> **〔4〕** 「`java.time` 怎么解决的?」「把两块表分开:**`Instant` 只管机器时间**（纳秒精度的 UTC 时间戳），**`LocalDateTime` 只管人类挂钟时间**（年月日时分秒，没有时区）。要在两者之间换算，必须显式给 `ZoneId`——**不给时区，代码写不出来**。」
>
> **〔5〕** 阿零还想省事，直接写 `ldt.toInstant()`。编译器当场拒收——这个方法必须收一个 `ZoneOffset`。「看见了吗，」焰焰说，「歧义在旧 API 里是运行时的锅，在新 API 里是编译期的错。」
>
> **〔6〕** 炉底浮出一个 1996 年的 `Date` 残影，怀里抱着一摞已废弃的 `getYear()`、`getMonth()`:「我们那会儿以为一个类能同时装下时间戳和日历……」焰焰把它请进琥珀展柜:「`legacyDate.toInstant()` 一步就能过河。你留在展柜里，别再进业务逻辑。」残影散进火里。

---

## 三、本话目标

- 分清 `Instant`（机器时间）与 `LocalDateTime`（人类挂钟时间）两套语义；
- 用 `ZoneId` 显式完成两者之间的换算；
- 用 `Duration` / `Period` 分别表达时间段与日期段；
- 用 `Date.toInstant()` 把旧代码接进新体系；
- 说清 `java.time` 相对 `Date`/`Calendar` 的版本边界。

---

## 四、炉内原理图：一个值，两种读法

卷一的教训是「把不变量交给编译器守」。这一话的坑长得不一样:**`Date` 里的不变量不是坏了，是压根没定义清楚**——它同时想当时间戳和日历，于是每次读它都要猜一次用谁的时区。

`java.time` 的解法是把这一个类拆成一组类型，每个类型只承诺一件事:

| 类型 | 含义 | 有无时区 | 典型用途 |
|---|---|---|---|
| `Instant` | UTC 纳秒时间戳 | UTC（无本地时区） | 数据库、日志、Event 时间戳 |
| `LocalDateTime` | 挂钟时间（年月日时分秒） | ❌ 无 | 展示、计划、日历 |
| `LocalDate` | 日期（年月日） | ❌ 无 | 生日、节假日 |
| `LocalTime` | 时间（时分秒纳秒） | ❌ 无 | 营业时间、闹钟 |
| `ZonedDateTime` | 带时区的完整时间 | ✅ 有 | 跨时区调度、夏令时（下话） |
| `Duration` | 时间段（秒+纳秒） | - | 计时、超时配置 |
| `Period` | 日期段（年月日） | - | 年龄、合同期限 |

拆开之后，「歧义」这件事就换了位置:想从 `Instant` 拿到 `LocalDateTime`，你**必须**交出一个 `ZoneId`,少给一个参数编译就不过。上一话是编译器替你数分支，这一话是编译器替你要时区——**都是把「靠人记住」换成「不给就编不过」**。

---

## 五、从上一话继续改代码：订单时间戳换 java.time

促销引擎那套 record 不动，先把它读的时间戳换掉:

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

第 5 行和第 1 行是同一个时刻的两种读法:UTC 的 `09:06:55` 就是上海的 `17:06:55`。区别在于这次「8 小时」是**写在代码里的 `ZoneId`**，不是猜出来的。

---

## 六、故意翻一次车：把时区省掉试试

阿零想知道——如果他偷懒不给时区，或者拿人类挂钟时间去做算术，后果是什么。他故意试了两次。

**第一次翻车**:用 `LocalDateTime` 算跨夏令时的时间差。

```java
// 错误：跨越夏令时边界的时间差，用 LocalDateTime 计算结果偏差 1 小时
LocalDateTime start = LocalDateTime.of(2026, 3, 8, 1, 0, 0);   // 纽约时间
LocalDateTime end   = LocalDateTime.of(2026, 3, 8, 3, 0, 0);   // 夏令时后
Duration wrongDur = Duration.between(start, end);
System.out.println(wrongDur.toHours());  // 2（实际只过了 1 小时！）
```

跨时区/夏令时场景必须用 `ZonedDateTime`（下话专门讲）。

**第二次翻车**:用 `now()` 不传时区。

```java
LocalDateTime.now()  // 用系统默认时区 → 部署到不同机器结果不同
Instant.now()        // 始终 UTC → 与部署机器无关（推荐用于存储）
```

这正是开头那 8 小时的来源:代码没写时区，时区就由「这台机器碰巧配了什么」决定。

---

## 七、编译官罚单

> **📋 编译官罚单 · 这次编译官只吭了一半声**
>
> 门一，缺时区的换算，编译器**会**拦:`LocalDateTime` 上根本没有无参的 `toInstant()`——`ChronoLocalDateTime.toInstant(ZoneOffset)` 只有带偏移量的这一个重载。想跨到机器时间，就必须交出 `ZoneOffset` 或走 `ldt.atZone(zoneId).toInstant()`。
>
> 门二，上面那两次翻车，编译器**一声不吭**:
>
> ```text
> （无编译错误——两段代码都能跑，只是答案是错的）
> Duration.between(LocalDateTime, LocalDateTime).toHours() = 2   // 纽约实际只过了 1 小时
> LocalDateTime.now()  在 UTC+0 与 UTC+8 两台机器上相差 8 小时   // 同一份代码，两种结果
> ```
>
> 这就是本话比卷一麻烦的地方:卷一那些坑（漏分支、写反顺序、偷加子类型）都在编译器管辖范围内，罚单当场就开。而**时区语义是类型带来的语义，不是语法错误**——`Duration.between` 的两个参数类型完全合法，编译器无权过问它们代表的是哪个时区的挂钟。编译器管不到，所以它更危险:它会一路正常跑到对账那天。

---

## 八、修复并验证

修复只有一条规则:**存储与运算走 `Instant`，展示走 `LocalDateTime`，跨界必过 `ZoneId`**。

- 订单时间戳字段改存 `Instant`——绝对时刻，与部署机器无关；
- 要给人看时，`LocalDateTime.ofInstant(instant, zone)` 当场转，转完就扔，不落库；
- 跨夏令时的算术交给 `ZonedDateTime`（下一话专门破这个案）。

验证判据三条，都要真跑出来:

1. **换算可往返**:`ldt.atZone(shanghai).toInstant()` 与 `LocalDateTime.ofInstant(instant, shanghai)` 互为逆运算，8 小时差来自代码里的 `ZoneId` 而不是机器配置。
2. **时间段算得准**:`Duration.between(now, now.plusSeconds(3600)).toSeconds()` 等于 `3600`。
3. **旧代码接得上**:`legacyDate.toInstant()` 拿到的时刻与 `Instant.now()` 处于同一毫秒量级。

正常路径的验证（GraalVM 25.0.4 实测输出）：

```text
Instant: 2026-08-05T09:06:55.829415900Z
Duration: 3600s
LocalDateTime: 2026-08-01T09:30
Formatted: 2026/08/01 09:30
Instant→LocalDateTime(上海): 2026-08-05T17:06:55.829415900
LocalDateTime→Instant: 2026-08-01T01:30:00Z
Date→Instant: 2026-08-05T09:06:55.844Z
```

七行全部对上预期。注意第 6 行:`09:30` 的上海挂钟时间转成机器时间是 `01:30Z`——**开头那个「差 8 小时」的 bug，在新体系里变成了一次写明白的换算**。

---

## 九、🔬 炉底显微镜 · 两块表在 JVM 里各存了什么

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

卷一在 `javap -p` 里看到的是 record 的 `private final` 字段，这里看到的是 JDK 自己也用同一套手法:**不可变靠字段 final 兑现，不靠文档里的一句「请勿修改」**。

---

## 十、⏳ 版本时光机 · Date 到 java.time 走了十八年

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

## 十一、项目检查点 · 豆豆咖啡站 jvm-v1.1

- **已具备**：促销引擎与三件套数据模型（v1.0）；订单时间戳换成 `Instant`，存储与运算不再受部署机器时区影响；要给人看时才用 `ZoneId` 转成 `LocalDateTime`，换算写在代码里而不是猜。
- **还没有**：海外分店的跨时区订单还没处理，夏令时边界一碰就错；日志格式化仍在用 `SimpleDateFormat`，多线程下会串。

阿零的变化：卷一他学会了「把不变量交给编译器守」，这一话他第一次遇到**编译器守不了的那一类错误**——语义歧义。于是他换了个办法：不指望编译器骂人，而是**选一个不允许歧义存在的类型**。

---

## 十二、对应招聘技能

`java.time`（JSR-310）类型体系、机器时间与挂钟时间的语义区分、时区显式化、`Duration`/`Period` 选型、`java.util.Date` 遗留代码迁移。

---

## 十三、下一话悬念

订单时间戳换成 `Instant` 之后，国内的账终于对上了。可海外分店的报警在凌晨来了——美国分店 2026 年 3 月 8 日凌晨 2:00 的订单时间戳跳到了 3:00，中间那一小时像是被人抽走了。

焰焰听完只问了一句：「你把两块表分开了，可你还没问过——**挂钟本身会不会突然跳一格**？」下一话，**`ZonedDateTime` 与 `ZoneId`** 上场破案：夏令时边界怎么算，以及为什么多线程共用一支 `SimpleDateFormat` 笔会写出 `2026-12-32` 这种日期。

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

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
