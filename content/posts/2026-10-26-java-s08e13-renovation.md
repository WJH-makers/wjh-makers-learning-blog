---
title: "《从零开始学 Java》69 · 精装修验收日(番外卷一终)"
date: 2026-10-26
summary: "十二项精装修一次性验收:BigDecimal 计价、枚举状态机、时间线、正则、双队叫号、LRU 热品墙、UTF-8、JSON 存档、Stream 报表全部就位。JUnit 质检员却在最后一刻亮起红灯——角落里一笔运费,还在用 double。"
tags: [Java, Java漫画, 项目实战, BigDecimal, 集合框架, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》69 · 精装修验收日(番外卷一终)

> 连载特刊 · 番外卷一「语言宝库」第 13 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——账本第一页十二项全部打勾,豆豆定下今天:精装修验收日,把全部改造一次性跑给全店看。

---

## 一、需求:十二笔债,一次对账

冬歇特训第十三天。#57 到 #68,阿零把主线欠下的「细节债」一笔笔还了:钱、状态、时间、校验、排队、缓存、编码、存档、报表。但豆豆不认「我改完了」四个字——春招的面试官更不认。

豆豆:「装修完不叫完,**验收通过才叫完**。今天,十二项改造全部接回咖啡站 v8 主干,用测试当证据,一项一项过。」JUnit 质检员抱着一摞空白报告单进门:「证据呢?」

---

## 二、漫画 · 验收日

> **〔1〕** 清晨,咖啡站十二盏射灯依次点亮,每盏照着一处改造。JUnit 质检员把报告单「啪」地拍在吧台上。
> 质检员:「十二项,一项一份证据。口说的,不算。」

> **〔2〕** 阿零现场点单:BigDecimal 小票分毫不差,订单状态沿 enum 状态机咔哒流转,VIP 从 PriorityQueue 队头「叮」地弹出。三盏灯连闪绿色。
> 阿零(逐渐嚣张):「下一项!」

> **〔3〕** 热品墙第四款咖啡上墙,最久没人碰的那款被 LRU 轻轻挤下去;分店电脑打开昨夜报表——中文清清爽爽,一个锟斤拷都没有。
> 豆豆(叼着豆子):「墙会自己吐旧货,报表会说中文了。继续。」

> **〔4〕** 质检员按下「全量回归」。绿色刷屏,阿零已经开始鞠躬谢幕——最后一行,红灯。
> 屏幕:`expected: <0.06> but was: <0.060000000000000005>`

> **〔5〕** 阿零顺着失败用例挖进代码角落,瞳孔地震:外送附加费——迁移 BigDecimal 那天漏了它,还在用 double。
> 豆豆(面试官脸):「验收的意义,就是抓漏网之鱼。你嘴里的『全改完了』,值几分钱?」

> **〔6〕** 当场换 BigDecimal,重跑,全绿。豆豆在账本第一页盖下「清账」大印,窗外飘雪。
> 豆豆:「卷一,关账。——别高兴太早,第二页比第一页厚。」

---

## 三、本话目标

- 把 #57–#68 的成果整合进咖啡站 v8 主干,给出可运行骨架;
- 对照验收大表逐项对账:债在哪、怎么还的;
- 用一组 JUnit 验收测试当证据,抓出最后一只漏网之鱼;
- 当场清掉最后一笔 double 债,卷一关账。

---

## 四、验收大表:十二项改造,逐项对账

| 改造点(补课话) | 主线欠债处 | 现在的样子 |
|---|---|---|
| 值传递与拷贝(#57) | 复制订单共享配料 List,改新单动老单 | 拷贝构造器深拷贝,record wither 思路 |
| 位运算(#58) | 七八个散装 boolean 口味字段 | int 位图 + EnumSet,负数标志位用 `>>>` |
| 装箱陷阱(#59) | Integer 用 `==` 判等级,128 起翻车 | 基本类型优先,判等 equals,认清 IntegerCache |
| 金额(#60) | double 计价,对账夜差 3 分钱 | BigDecimal + HALF_UP,入库 DECIMAL |
| 状态机(#61) | 裸字符串 "PAID",打错没人拦 | enum 状态机,持久化存显式 code 不存 ordinal |
| 时间(#62) | static SimpleDateFormat 多线程串染 | java.time + DateTimeFormatter 常量 |
| 校验(#63) | 人肉校验;嵌套量词正则 CPU 假死 | static final Pattern,先限长再匹配 |
| 叫号(#64) | 取餐一条龙,VIP 队尾冒烟 | ArrayDeque 普通队 + PriorityQueue VIP 队 |
| 排行与缓存(#65) | 排行榜同销量互吞元素 | thenComparing;LinkedHashMap 三行 LRU |
| 编码(#66) | 分店报表满屏锟斤拷 | 全链路 UTF-8,GBK 文件显式转码入库 |
| 存档(#67) | 重启订单清零;JDK 序列化一改字段就崩 | JSON 存档;serialVersionUID 显式声明 |
| 报表(#68) | 十行 for 循环人肉统计 | Stream groupingBy 一行出报表 |

---

## 五、整合骨架:v8 主干(精简可运行版)

#57/#58/#59 已融进各处细节;下面九项直接长在主干上——

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

record Coffee(String name, BigDecimal price, int stock) {}     // #60:计价 BigDecimal

enum Status { CREATED, PAID, MAKING, DONE, CANCELLED }         // #61:持久化存 code,别存 ordinal

record Order(int no, boolean vip, String phone,
             BigDecimal total, Status status, LocalDateTime at) {}  // #62:时间线

public class StationV8 {
    static final Pattern PHONE = Pattern.compile("^1\\d{10}$"); // #63:编译一次,无嵌套量词
    static final ObjectMapper JSON =                            // #67:Jackson 原生支持 record
            new ObjectMapper().registerModule(new JavaTimeModule());

    final Deque<Order> normals = new ArrayDeque<>();            // #64:普通队
    final Queue<Order> vips =                                   // #64:VIP 按下单时间优先
            new PriorityQueue<>(Comparator.comparing(Order::at));
    final Map<String, Coffee> hotWall =                         // #65:LRU 热品墙,只留 3 款
            new LinkedHashMap<>(16, 0.75f, true) {
                protected boolean removeEldestEntry(Map.Entry<String, Coffee> e) {
                    return size() > 3;
                }
            };

    void enqueue(Order o) {
        if (!PHONE.matcher(o.phone()).matches())
            throw new IllegalArgumentException("手机号不合法:" + o.phone());
        if (o.vip()) vips.offer(o); else normals.offer(o);
    }

    Order next() {                                              // 叫号:VIP 永远优先
        var v = vips.poll();
        return v != null ? v : normals.poll();
    }

    Map<Status, Long> report(List<Order> day) {                 // #68:Stream 一行出报表
        return day.stream().collect(Collectors.groupingBy(Order::status, Collectors.counting()));
    }

    void archive(Path file, List<Order> day) throws Exception { // #66+#67:JSON 存档,显式 UTF-8
        Files.writeString(file, JSON.writeValueAsString(day), StandardCharsets.UTF_8);
    }
}
```

---

## 六、验收抓出漏网之鱼

全量回归最后一行,红灯。质检员甩出失败用例——外送附加费,当年全站迁移 BigDecimal(#60)时,这个角落漏了:

```java
class DeliveryFee {
    // 漏网之鱼:每杯 0.05 元外送附加 + 0.01 元包装袋 —— 还是 double!
    static double surcharge(int cups) {
        return cups * 0.05 + 0.01;
    }
}
```

```java
@Test
void surcharge_is_exact_to_cent() {
    assertEquals(0.06, DeliveryFee.surcharge(1));   // 1 杯:0.05 + 0.01,应该正好 6 分钱
}
```

---

## 七、读懂真实报错

```text
DeliveryFeeTest > surcharge_is_exact_to_cent() FAILED
    org.opentest4j.AssertionFailedError: expected: <0.06> but was: <0.060000000000000005>
        at DeliveryFeeTest.surcharge_is_exact_to_cent(DeliveryFeeTest.java:9)
```

0.05 和 0.01 在二进制里都存不准(回看 #60),一相加,误差冒了头。人眼看不见小数点后第 18 位,JUnit 看得见,对账系统更看得见。

---

## 八、当场清账,测试作证

```java
class DeliveryFee {
    private static final BigDecimal PER_CUP = new BigDecimal("0.05"); // 字符串构造,零误差
    private static final BigDecimal BAG     = new BigDecimal("0.01");

    static BigDecimal surcharge(int cups) {
        return PER_CUP.multiply(BigDecimal.valueOf(cups))
                      .add(BAG)
                      .setScale(2, RoundingMode.HALF_UP);             // 统一两位小数
    }
}
```

再补一组整合验收测试,把主干也钉死:

```java
class RenovationAcceptanceTest {
    static Order order(int no, boolean vip) {
        return new Order(no, vip, "13800001111",
                new BigDecimal("18.00"), Status.PAID, LocalDateTime.now());
    }

    @Test
    void surcharge_is_exact_to_cent() {              // 第六节的漏网之鱼,清账
        assertEquals(new BigDecimal("0.06"), DeliveryFee.surcharge(1));
        assertEquals(new BigDecimal("0.51"), DeliveryFee.surcharge(10));
    }

    @Test
    void vip_jumps_the_queue() {                     // #64:VIP 优先出队
        var s = new StationV8();
        s.enqueue(order(1, false));
        s.enqueue(order(2, true));
        assertEquals(2, s.next().no());
    }

    @Test
    void bad_phone_is_rejected() {                   // #63:入口即校验
        var s = new StationV8();
        assertThrows(IllegalArgumentException.class, () -> s.enqueue(
            new Order(3, false, "1380", BigDecimal.ONE, Status.CREATED, LocalDateTime.now())));
    }

    @Test
    void hot_wall_evicts_least_recently_used() {     // #65:LRU 淘汰
        var s = new StationV8();
        for (var n : List.of("美式", "拿铁", "摩卡"))
            s.hotWall.put(n, new Coffee(n, new BigDecimal("15.00"), 9));
        s.hotWall.get("美式");                        // 摸一下,美式回到最新
        s.hotWall.put("燕麦拿铁", new Coffee("燕麦拿铁", new BigDecimal("21.00"), 9));
        assertFalse(s.hotWall.containsKey("拿铁"));   // 最久没人碰的被挤下墙
    }
}
```

> **豆豆锐评**:`assertEquals` 敢直接比 BigDecimal,是因为 `surcharge` 统一 `setScale(2)`——equals 连 scale 一起比。不定 scale 的地方,判等一律 `compareTo`(回看 #60)。

> **🎯 面试直击 · 这一卷你能答上的 5 个高频题**

| 高频题 | 一句话答法(出处) |
|---|---|
| Java 是值传递还是引用传递? | 只有值传递;引用类型传的是地址值的副本(#57) |
| Integer 127 `==` 为 true、128 为 false? | IntegerCache 缓存 -128~127,缓存内同对象;判等用 equals(#59) |
| 金额为什么不能用 double? | 二进制存不准十进制小数;用 BigDecimal,判等用 compareTo(#60) |
| 枚举为什么是最安全的单例? | JVM 保证实例唯一,天然防反射、防序列化破坏(#61) |
| 一条正则怎么打挂服务? | 嵌套量词遇不匹配长串灾难性回溯;先限长、消嵌套(#63) |

---

## 九、项目检查点 · 豆豆咖啡站 v8.13

```text
咖啡站形态:精装修 v8.13 —— 番外卷一《语言宝库》十二项改造全部验收通过
已具备  :BigDecimal 计价 / enum 状态机 / java.time 时间线 / Pattern 校验
          双队叫号 / LRU 热品墙 / 全链路 UTF-8 / JSON 存档 / Stream 报表
          一组验收测试守住全部改造
还没有  :并发安全 —— 十二项改造全部默认「同一时刻只有一个人动账本」;
          两个线程一起扣库存会发生什么,没人验收过
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 语言与类库全景(值传递/位运算/装箱/金额/枚举/时间/正则/集合/IO/序列化/Stream) | 「Java 基础扎实」不再是空话,是十二份证据 |
| 用 JUnit 做整合验收、抓回归 | 「重构不心虚」的底气,Code Review 硬通货 |
| 技术债清单化:记账 → 还债 → 验收 | 工程素养,面试能讲出完整故事 |

---

## 十一、卷一完 · 账本翻到第二页

验收夜,打烊。阿零顺手把大促压测脚本又跑了一轮,就当赛前热身。零点十二分,监控炸了:同一款燕麦拿铁,订单表卖出 101 杯,库存却只减了 99——**两个线程同时扣库存,各自读到同一个旧值,谁也没拦谁。**账,又对不上了。

豆豆把账本翻到第二页,「并发深水区」五个字压得纸面发沉。

> 番外卷二《并发深水区》:主线里你会「用」锁(回看第 39 话),这一卷要讲「透」——第一站:一个线程改了变量,另一个线程为什么可能永远看不见?
> 豆豆:「第一页是我陪你还的。这次,没有我兜底。」

## 🎯 随堂练习

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. 验收时抓到的「漏网之鱼」是什么?
   - A) 一个没关的流　B) **外送附加费还在用 `double` 计算**,当年全站迁 BigDecimal 时漏了这个角落　C) 一个未处理的异常　D) 一个死循环
2. `cups * 0.05 + 0.01`(1 杯)的实际结果是?
   - A) `0.06`　B) **`0.060000000000000005`**　C) `0.05`　D) 抛异常
3. 为什么这个 Bug 能潜伏这么久?
   - A) 代码没被执行　B) **人眼看不见小数点后第 18 位,但 JUnit 看得见,对账系统更看得见**　C) 只在特定机器出现　D) 被 catch 吞掉了
4. 测试里能直接 `assertEquals(new BigDecimal("0.06"), ...)`,前提是?
   - A) BigDecimal 重写了 equals　B) **`surcharge` 里统一了 `setScale(2)`** —— equals 连 scale 一起比　C) 用了 compareTo　D) 数值足够小
5. 没有统一 scale 的地方,金额判等应该用?
   - A) `equals`　B) `==`　C) **`compareTo(...) == 0`**　D) `hashCode`
6. 「Java 是值传递还是引用传递」的标准答法是?
   - A) 引用类型是引用传递　B) **只有值传递;引用类型传的是地址值的副本**　C) 视情况而定　D) 由 JVM 决定
7. 「枚举为什么是最安全的单例」?
   - A) 因为它是 final 的　B) **JVM 保证实例唯一,且天然防反射创建、防序列化产生分身**　C) 因为不能有构造器　D) 因为占内存小
8. LRU 热品墙验收用例里,`s.hotWall.get("美式")` 这一步的作用是?
   - A) 检查存在性　B) **在 accessOrder 模式下「摸一下」把美式挪到最新位**,让最久没人碰的「拿铁」被挤下墙　C) 预热缓存　D) 触发扩容
9. VIP 优先与手机号校验分别落在哪一层?
   - A) 都在数据库　B) **VIP 优先靠 `PriorityQueue` 出队策略;手机号校验在 `enqueue` 入口即拦**　C) 都在 Controller　D) 都靠定时任务
10. 这一卷示范的技术债处理流程是?
    - A) 发现即修　B) **记账 → 还债 → 验收**,每项都用测试留下证据　C) 攒够一次性重写　D) 交给下一任

> [!答案]
> **1-B**　迁移总有漏网的角落。**举一反三**:大范围类型迁移后,最好用全局搜索 + 测试双保险,别信「应该都改完了」。
> **2-B**　两个存不准的数一相加,误差冒头。**举一反三**:0.05 和 0.01 单独打印都正常,合起来才现形 —— 和第 60 话三张券的机理完全相同。
> **3-B**　机器比人眼可靠。**举一反三**:这正是「金额必须有测试」的理由 —— 人工验收永远抓不到第 18 位。
> **4-B**　scale 统一了 equals 才可靠。**举一反三**:所以对外的金额 API 最好都在出口处 `setScale`,让调用方拿到形状一致的值。
> **5-C**　只有 compareTo 比纯数值。**举一反三**:这条和第 4 题不矛盾 —— 统一了 scale 才可以用 equals,否则一律 compareTo。
> **6-B**　地址值的副本。**举一反三**:这是番外卷一第一话就打下的地基,后面的深拷贝、防御性拷贝全建在它上面。
> **7-B**　三重保险。**举一反三**:普通单例要靠 `readResolve` 打补丁,枚举是天生的。
> **8-B**　访问序会把被摸过的挪到队尾。**举一反三**:这也说明 LRU 的「最近使用」既包括写也包括读 —— `get` 同样算一次使用。
> **9-B**　各在各的位置。**举一反三**:校验放最外层、策略放数据结构里,这种「各司其职」正是十二项改造串起来的价值。
> **10-B**　记账、还债、验收。**举一反三**:面试里能讲出这套完整流程,比罗列十个知识点更能体现工程素养。

---

**——番外卷一《语言宝库》完 · 特训继续——**

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
