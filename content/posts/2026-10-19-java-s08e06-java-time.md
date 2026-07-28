---
title: "《从零开始学 Java》62 · 时间大陆 java.time"
date: 2026-10-19
summary: "生日券把 12 月算成来年 1 月,两笔订单的时间戳还互相串染——Date/Calendar/SimpleDateFormat 三宗罪集中爆发。搬进时间大陆:LocalDate 管挂历、Instant 管时刻、ZonedDateTime 管时区,DateTimeFormatter 天生线程安全。"
tags: [Java, Java漫画, java.time, 日期时间, 时区, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》62 · 时间大陆 java.time

> 连载特刊 · 番外卷一「语言宝库」第 6 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——订单状态机稳了;会员生日券要算日期,阿零却掏出了上古的 Date 和 SimpleDateFormat。

---

## 一、事故:生日券连环翻车

冬歇期第六天,#61 的枚举状态机刚上线,运营就来提需求:**会员生日当天发一张 7 天有效的生日券**;顺便,老板把冬季快闪店开到了温哥华,海外订单的时间也得对得上账。

阿零信心满满掏出三件上古兵器:`Date`、`Calendar`、`SimpleDateFormat`。半天后事故清单摆上桌:12 月 24 日的生日券发到了来年 1 月;日志里两笔订单的时间戳互相串染;温哥华分店的对账单凭空差了一小时。

豆豆合上技术债账本:「老三样的三宗罪——**可变、月份从 0、线程不安全**——你一个下午全踩齐了。收拾行李,搬家去时间大陆。」

---

## 二、漫画 · 逃离时间老城区

> **〔1〕** 老城区钟楼下,阿零敲下 `calendar.set(2026, 12, 24)`,打印出来却是 **2027-01-24**。
> 阿零:「我明明写的 12!」豆豆:「老城钟楼的刻度是 **0 到 11**,12 月得写 11。你写 12,它不报错,默默滚到明年 1 月。」

> **〔2〕** 生日券上的 `Date` 被另一段代码 `setTime` 拧了一把,券面日期当场变脸。
> 豆豆(叼着豆子叉腰):「可变的时间就是公共橡皮泥,谁路过都能捏一把,你还没法知道是谁捏的。」

> **〔3〕** 【特写格】柜台上只有一支公用笔——`static SimpleDateFormat`,**Race 双胞胎**一人拽一头,两张小票的时间写串了。
> 豆豆:「它肚子里只有一本共享的 Calendar 草稿,format 先往草稿上写再誊到纸上——两个线程同时写草稿,后到的覆盖先到的。」

> **〔4〕** 豆豆拉着阿零跨过大桥进入时间大陆新城:三块路牌——**LocalDate(挂历区)**、**Instant(时间线)**、**ZonedDateTime(时区关卡)**;城门石碑刻着「全员不可变」。

> **〔5〕** 阿零随手 `birthday.plusDays(7)`,原石碑纹丝不动,手里多出一块新石碑。
> 阿零:「改不动原件,心里踏实多了。」豆豆:「每次修改都返回新对象——这是不可变的安全感,也是 DateTimeFormatter 敢全店共用一份的底气。」

---

## 三、本话目标

- 认清老三样的三宗罪:可变、月份从 0、线程不安全;
- 分清 LocalDate/LocalTime/LocalDateTime(挂历)、Instant(时刻)、ZonedDateTime(时刻+时区);
- 用 Duration 量秒、用 Period 量年月日,别拿错尺子;
- 把格式化器换成线程安全的 `DateTimeFormatter` 常量;
- 定下入库规矩:事件时刻 TIMESTAMP↔Instant,挂历语义 DATETIME↔LocalDateTime。

---

## 四、原理图:时间大陆全图

```text
时间大陆(java.time,JDK 8 引入,JSR 310)

「挂历时间」—— 不带时区,只是日历上的字
   LocalDate      2026-10-19          生日、券的有效期
   LocalTime      08:00               每天的营业时间
   LocalDateTime  2026-10-19T08:00    挂历+挂钟,但不知道自己在地球哪里

「时间线上的一点」—— 全球唯一的物理时刻
   Instant        自 1970-01-01T00:00:00Z 起的秒+纳秒(机器视角)

「时刻 + 时区规则」
   ZonedDateTime  2026-10-19T08:00+08:00[Asia/Shanghai]
                  = Instant + 换算规则(含夏令时)

两把尺子(别拿混):
   Duration  机器尺:秒/纳秒          出一杯咖啡用了 90 秒
   Period    日历尺:年/月/日         距生日还有 2 个月零 5 天

全员不可变:plusDays / withYear 一律返回新对象,原对象纹丝不动。
月份从 1 开始,还有 Month.DECEMBER 枚举兜底,想错都难。
```

> **⏳ 版本时光机 · 处理时间这件事怎么变的**

| 年代 | 写法 | 关键变化 |
|---|---|---|
| ≤ JDK 7 | Date + Calendar + SimpleDateFormat | 可变、月份从 0、格式化线程不安全,改个日期要 set 一串字段 |
| JDK 8(JSR 310) | java.time:LocalDate / Instant / ZonedDateTime + DateTimeFormatter | 全员不可变线程安全;月份从 1;「挂历 / 时刻 / 时区」拆成三种类型,各管一段 |
| 今天的最佳实践 | 存储统一 Instant(UTC),展示时才换 ZoneId;格式化器做 static final 常量 | 老三样只在对接遗留 API 时出现,进门第一件事转成 java.time |

一句演进小结:从「一个可变的 Date 什么都当」,到「类型替你把挂历、时刻、时区分清楚」。

---

## 五、代码:生日券与温哥华之夜

在 #61 的会员档案上补一个 `LocalDate birthday` 字段(计价沿用 #60 的 BigDecimal,不动):

```java
import java.time.*;
import java.time.temporal.ChronoUnit;

record Member(String name, LocalDate birthday) {}
record BirthdayCoupon(String owner, LocalDate validFrom, LocalDate validTo) {}

public class BirthdayCouponService {

    /** 生日当天生效,含当天共 7 天 */
    static BirthdayCoupon issue(Member m, LocalDate today) {
        LocalDate thisYear = m.birthday().withYear(today.getYear());
        LocalDate from = thisYear.isBefore(today) ? thisYear.plusYears(1) : thisYear;
        return new BirthdayCoupon(m.name(), from, from.plusDays(6));
    }

    public static void main(String[] args) {
        var member = new Member("老顾客阿姨", LocalDate.of(1978, 12, 24));
        var today  = LocalDate.of(2026, 10, 19);
        var coupon = issue(member, today);
        IO.println(coupon);   // 12 月就是 12,不用背「月份从 0」

        var wait = Period.between(today, coupon.validFrom());
        IO.println("距生日还有 " + wait.getMonths() + " 个月零 " + wait.getDays() + " 天");
        IO.println("合计 " + ChronoUnit.DAYS.between(today, coupon.validFrom()) + " 天");

        var paidAt   = Instant.parse("2026-10-19T00:12:30Z");
        var servedAt = Instant.parse("2026-10-19T00:14:00Z");
        IO.println("出杯耗时 " + Duration.between(paidAt, servedAt).toSeconds() + " 秒");
    }
}
```

```text
BirthdayCoupon[owner=老顾客阿姨, validFrom=2026-12-24, validTo=2026-12-30]
距生日还有 2 个月零 5 天
合计 66 天
出杯耗时 90 秒
```

> **豆豆旁白**:`Period.getDays()` 只是「零头」那部分,总天数要用 `ChronoUnit.DAYS.between`——多少人在这栽过跟头。

再看温哥华分店。11 月 1 日是当地夏令时结束夜,凌晨 1:30 会**出现两次**:

```java
var placed = ZonedDateTime.of(LocalDateTime.of(2026, 11, 1, 1, 30),
                              ZoneId.of("America/Vancouver"));
IO.println(placed);                // 歧义时刻,java.time 默认取前一个偏移
IO.println(placed.plusHours(1));   // 物理上过了 1 小时,墙钟还是 1:30
IO.println(placed.withZoneSameInstant(ZoneId.of("Asia/Shanghai")));
```

```text
2026-11-01T01:30-07:00[America/Vancouver]
2026-11-01T01:30-08:00[America/Vancouver]
2026-11-01T16:30+08:00[Asia/Shanghai]
```

对账差一小时的谜底就在这:拿「当地挂历时间」直接对账必翻车。入库规矩就此定死:

| 数据库列 | Java 类型 | 用在哪 |
|---|---|---|
| TIMESTAMP(MySQL 按 UTC 存、按会话时区换算) | Instant | 下单、支付等事件时刻 |
| DATETIME(存字面值,不做换算) | LocalDateTime | 门店排班表等挂历语义 |
| DATE | LocalDate | 生日、券有效期 |

> **豆豆锐评**:跨时区一条铁律——**存 UTC(Instant),展示时才换 ZoneId**。把上海挂历时间塞进 TIMESTAMP、再在温哥华读出来,就是今天这张错账。

---

## 六、故意制造一个 Bug:全店共用一支 SimpleDateFormat

阿零嫌每次 `new SimpleDateFormat` 浪费,把它提成了 static 常量,全店的打单线程共用:

```java
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.util.Date;

class LegacyOrderClock {
    static final SimpleDateFormat SDF = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    static String stamp(Date d) { return SDF.format(d); }
}

public class StampRace {
    public static void main(String[] args) throws InterruptedException {
        // 机器时区 Asia/Shanghai:对应 08:00 与 22:00
        Date morning = Date.from(Instant.parse("2026-10-19T00:00:00Z"));
        Date closing = Date.from(Instant.parse("2026-10-19T14:00:00Z"));
        var t1 = Thread.ofPlatform().start(() -> check("早班单", morning, "2026-10-19 08:00:00"));
        var t2 = Thread.ofPlatform().start(() -> check("打烊单", closing, "2026-10-19 22:00:00"));
        t1.join(); t2.join();
    }

    static void check(String tag, Date d, String expected) {
        for (int i = 0; i < 100_000; i++) {
            String got = LegacyOrderClock.stamp(d);
            if (!got.equals(expected)) IO.println(tag + " 期望 " + expected + " 实际 " + got);
        }
    }
}
```

---

## 七、观察真实现象:两单时间互相串染

跑一次,日志里随机蹦出串染行(每次位置都不同,典型的并发时隐时现):

```text
早班单 期望 2026-10-19 08:00:00 实际 2026-10-19 22:00:00
打烊单 期望 2026-10-19 22:00:00 实际 2026-10-19 08:00:00
早班单 期望 2026-10-19 08:00:00 实际 2026-10-19 22:00:00
```

根因:`SimpleDateFormat` 继承的 `DateFormat` 里有一个**共享的可变 `Calendar` 字段**。`format` 分两步——先 `calendar.setTime(date)` 写草稿,再从草稿读字段拼字符串。两个线程同时用,一个刚写完草稿、另一个把草稿覆盖,读出来就是别人的时间。若并发调的是 `parse`,还会随机抛 `NumberFormatException`,甚至安静地解析出一个错日期——那才是最毒的。

> **🎯 面试直击**:SimpleDateFormat 为什么线程不安全?
> 因为它内部持有可变的 Calendar 实例,format/parse 都是「先写 calendar 再读」的两步操作,多线程共享时互相覆盖中间状态——轻则串值,重则 NumberFormatException。追问点:怎么救?老代码可用 ThreadLocal 每线程一份(线程池里记得 remove),新代码直接换**不可变、无中间状态**的 DateTimeFormatter,常量共用毫无压力。

---

## 八、修复,并用测试证明

订单时刻字段整体从 `Date` 换成 java.time,格式化器换成 `DateTimeFormatter` 常量——不可变对象没有可覆盖的草稿,共用即安全:

```java
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class OrderClock {
    static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    static String stamp(LocalDateTime t) { return TS.format(t); }
}
```

```java
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import static org.junit.jupiter.api.Assertions.assertEquals;

class OrderClockTest {

    @Test
    void stamp_survives_8_threads() throws Exception {
        var base = LocalDateTime.of(2026, 10, 19, 8, 0, 0);
        List<Future<String>> results = new ArrayList<>();
        try (var pool = Executors.newFixedThreadPool(8)) {
            for (int i = 0; i < 10_000; i++) {
                var t = base.plusSeconds(i);
                results.add(pool.submit(() -> OrderClock.stamp(t)));
            }
        }   // close() 会等所有任务执行完
        for (int i = 0; i < 10_000; i++)
            assertEquals(OrderClock.stamp(base.plusSeconds(i)), results.get(i).get());
    }

    @Test
    void birthday_coupon_covers_7_days() {
        var m = new Member("老顾客阿姨", LocalDate.of(1978, 12, 24));
        var c = BirthdayCouponService.issue(m, LocalDate.of(2026, 10, 19));
        assertEquals(LocalDate.of(2026, 12, 24), c.validFrom());
        assertEquals(LocalDate.of(2026, 12, 30), c.validTo());
    }
}
```

一万次并发格式化,零串染。JUnit 质检员:「证据呢?——这次有了。」

---

## 九、项目检查点 · 豆豆咖啡站 v8.6

```text
咖啡站形态:精装修 v8.6 —— 时间体系整体迁入 java.time
已具备  :生日券按 LocalDate 计算;订单时刻统一存 Instant、展示才换时区;
          温哥华分店扛住了夏令时切换;DateTimeFormatter 常量化,线程安全
还没有  :注册表单的手机号、邮箱还靠人肉校验,脏数据天天往库里钻
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| java.time 全家桶(LocalDate/Instant/ZonedDateTime,Duration vs Period) | JD 里「熟悉 Java 8+ 新特性」的真实考点 |
| SimpleDateFormat 线程不安全的根因 | 并发八股高频,能答出「共享 Calendar 字段」是加分项 |
| 时区/夏令时处理,存 UTC 展示本地 | 有海外业务的公司必问 |
| TIMESTAMP/DATETIME 与 Java 类型映射 | 后端建表评审的日常功课 |

---

## 十一、下一话悬念

时间修好了,阿零转头看注册表单:手机号一栏里「138 0013 8000」「+86-13800138000」「一三八……」五花八门,他人肉校验到眼瞎。

> 下一话《正则表达式与失控的备注》:模式匹配的正牌军进场——Pattern 编译一次到处用,捕获组精准抽取。豆豆还会展示一个恐怖故事:一条写坏的正则,能让整台服务 CPU 100% 假死。

---

## 🎯 随堂练习

### 选择题(10 道)

1. 老三样(Date/Calendar/SimpleDateFormat)的三宗罪不包括哪项?
   - A) 可变　B) 月份从 0　C) SimpleDateFormat 线程不安全　D) 不支持 Java 8
2. `Calendar.set(2026, 12, 24)` 设置了 12 月,实际会?
   - A) 12 月　B) 悄悄滚到明年 1 月　C) 抛异常　D) 编译期拦截
3. LocalDate / LocalDateTime / ZonedDateTime 的共同特征是?
   - A) 全部可变　B) 全都线程不安全　C) 全员不可变(修改返回新对象)　D) 都有时区
4. `SimpleDateFormat` 线程不安全的根因是什么?
   - A) 字段不是 final　B) 内部持有可变的 Calendar 字段,format/parse 是「先写再读」两步操作　C) 源码太老　D) 没有 synchronized
5. 日期时间格式化器应该用什么?
   - A) SimpleDateFormat　B) DateTimeFormatter(不可变,线程安全,可做 static final 常量)　C) 手写 format 方法　D) DateFormat
6. 数据库存「事件发生时刻」,Java 类型和 DB 列类型的最佳拍档是?
   - A) Date ↔ VARCHAR　B) Instant ↔ TIMESTAMP　C) LocalDateTime ↔ DATETIME　D) 随便
7. 跨时区铁律是?
   - A) 存本地时间　B) 存 UTC(Instant),展示时才换 ZoneId　C) 存字符串　D) 所有时区统一
8. Duration 和 Period 分别该怎么用?
   - A) 可以混用　B) Duration 量秒/纳秒(机器尺),Period 量年月日(日历尺)　C) Duration 更大　D) 已经合并
9. `Period.between(birthday, today).getDays()` 返回?
   - A) 总天数　B) 只返回「零头」那部分天数(月以下)　C) 总天数自动换算　D) 永远 0
10. 总天数应该用什么?
    - A) Period.getDays()　B) ChronoUnit.DAYS.between(a, b)　C) Duration.toDays()　D) 手算

> [!答案]
> **1-D**　老三样都是 JDK 1.0/1.1 时代的产品,后来 Java 8 推出了 java.time,所以它们"也能在 JDK 8+ 用",问题不在"不支持"而在三宗罪。**举一反三**:只要代码里出现了 `import java.util.Date`,就该警觉——除非是接遗留接口,进门第一件事就该转成 Instant。
> **2-B**　Calendar 月份从 0 开始——0=1月,11=12月,12 不存在 → 静默进位到明年 1 月(不抛异常)。**举一反三**:这就是为什么 `Calendar.JANUARY` 等常量是给日子看的:永远用 `Calendar.DECEMBER` 而不是数字 12;但更好的做法是别用 Calendar。
> **3-C**　java.time 的类全是不可变:plus/minus/with 一律返回新对象,原对象纹丝不动。不可变 = 线程安全,所以 DateTimeFormatter 可以 static final。**举一反三**:不可变是 JSR 310 设计的核心——String 和 BigDecimal 也走这条路;学会一个学别的全是有肌肉记忆的。
> **4-B**　`DateFormat.format` 先 `calendar.setTime(date)` 写草稿,再从草稿读字段拼字符串——多线程共享一个 SDF,一个刚写完、另一个把草稿覆盖,串值随机染。**举一反三**:parse 更危险——不仅串值,遇到扭曲字节还能抛 `NumberFormatException`,甚至解析出合法但错误的日期。
> **5-B**　DateTimeFormatter 不可变、线程安全、可预编译为常量。**举一反三**:`DateTimeFormatter.ISO_LOCAL_DATE` 这类预定义常量直接就能用;自定义格式用 `DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")`,然后记住它的文档里 `yyyy` 和 `YYYY` 不一样(后者是周年)。
> **6-B**　TIMESTAMP 存 UTC 时间戳,Java 的 Instant 也是 UTC 时刻——天生一对。DATETIME 存字面值(无时区),对应 LocalDateTime。**举一反三**:把上海 LocalDateTime 塞进 TIMESTAMP 列再在温哥华读出来——你以为是上海时间,MysQL 按会话时区一顿换算,对账永远不在一个频道上。
> **7-B**　存 UTC 是跨时区系统的唯一方案:所有写入都转 UTC(Instant),所有展示都按目标时区(ZonedDateTime)。**举一反三**:数据库的 TIMESTAMP 列设计之初就管这个——你往里写 `2026-10-19 08:00:00`,MySQL 会先按当前会话时区转换成 UTC 再存。
> **8-B**　Duration 机器尺,量 90 秒;Period 日历尺,量「两个月零五天」。不能混:P2M5D 和 P90D 不是一回事。**举一反三**:`Duration.between(a, b).toDays()` 只给了整天数,不在意日历的月;反之 `Period.between(a, b)` 在意月季年,跨月才有意义。
> **9-B**　`Period.getDays()` 返回的是「零头」天数的部分——离生日还有 2 个月零 5 天时返回 5,不是 66。**举一反三**:这一坑在 StackOverflow 有上万个踩踏记录;总天数永远走 `ChronoUnit.DAYS.between`。
> **10-B**　`ChronoUnit.DAYS.between(a, b)` 返回精确日历天数,和 Period 的零头天数是两回事。**举一反三**:`ChronoUnit` 还能算周、月、年、世纪——`ChronoUnit.MONTHS.between` 返回整月数,跨年也正确处理。

### 解答题(5 道)

1. 画一张表对比 Date/Calendar/SimpleDateFormat 和 java.time(LocalDate/Instant/DateTimeFormatter)的差异(可变/月份/线程安全/类型分离)。
2. SimpleDateFormat 为什么线程不安全?代码层面给出一个多线程串染的最小复现,并说明根因。
3. 会员生日券:今天是 2026-10-19,会员生日 12-24,发券逻辑是什么?写出完整实现,包含「若今年生日已过,发明年」的判断。
4. 温哥华分店夏令时结束夜(11 月 1 日)凌晨 1:30 在墙钟上出现两次,Java 的 ZonedDateTime 如何处理?
5. 你现在接手了一个用 Date 和 SimpleDateFormat 写的老项目,怎么安全地逐步迁移到 java.time?

> [!答案]
> **1**　| 维度 | 老三样 | java.time ||---|---|---|| 可变性 | Date/Calendar 可变 | 全部不可变 || 月份 | 0~11(1月=0) | 1~12,Month 枚举兜底 || 线程安全 | SimpleDateFormat 不安全 | DateTimeFormatter 不可变可常量化 || 类型 | 一个 Date 既管时刻又管挂历 | 三个类型各管一段:LocaDate(日期)/Instant(时刻)/ZonedDateTime(时刻+时区) |　**举一反三**:为什么 JSR 310 拆成三个类型?因为需求本来就三类——「10 月 19 日发券」不需要时区;「订单支付时刻」必须是 UTC 时间线;「温哥华早上 8 点」既要知道时区还要知道夏令时。
> **2**　```java
static final SimpleDateFormat SDF = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
// 线程A: SDF.format(dateA) → calendar.setTime(dateA) 刚写完
// 线程B: SDF.format(dateB) → calendar.setTime(dateB) 覆盖了A的时间
// 线程A: 读完拼字符串 → 得到的是 B 的时间
```　根因:SDF 继承的 DateFormat 内有一个**共享的可变 Calendar 实例**,format 分"写→读"两步,多线程并发时第二步读到的可能是别人的草稿。**举一反三**:如果必须留在 SimpleDateFormat 的遗留代码,补救方案是用 ThreadLocal 给每线程一份——但线程池里记得 finally remove;新代码直接用 DateTimeFormatter 常量。
> **3**　```java
LocalDate today = LocalDate.of(2026, 10, 19);
LocalDate birthday = LocalDate.of(1978, 12, 24);
LocalDate thisYear = birthday.withYear(today.getYear());
LocalDate from = thisYear.isBefore(today) ? thisYear.plusYears(1) : thisYear;
LocalDate to = from.plusDays(6); // 含当天 7 天
```　**举一反三**:`withYear` 遇到闰年 2 月 29 日生日时怎么办?如果今年不是闰年,`withYear` 会抛 DateTimeException;更健壮的写法是用 `MonthDay` 类,它只存月日不管年,天然避开了闰年雷区。
> **4**　ZonedDateTime.of(LocalDateTime, ZoneId) 默认取**前一个偏移**(−07:00),`plusHours(1)` 之后墙钟还是 1:30 但偏移变成 −08:00——物理上确实过了 1 小时。需要精确区分时可传 `ZoneOffsetTransition` 或用 `withLaterOffsetAtOverlap()`。**举一反三**:`withZoneSameInstant` 是跨时区对账的救命工具——把温哥华的凌晨 Instant 换成上海时区,就知道总部现在几点了。
> **5**　第一步:遗留 API 入口(`Date.from(instant)`, `date.toInstant()`)做好双向转换,新代码只碰 java.time;第二步:数据库列从 DATETIME 腾挪到 TIMESTAMP,对应 Java 的 Instant;第三步:SimpleDateFormat → DateTimeFormatter 常量,并发问题一根代码就根治;第四步:跑全量回归,尤其对账逻辑。**举一反三**:Gradual migration 的铁则是「收敛到出入口 + 新代码只用新 API」,不要试图一次全改。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
