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

**——番外卷一《语言宝库》完 · 特训继续——**

---

## 🎯 随堂练习

### 选择题(10 道)

1. 番外卷一《语言宝库》共清偿了多少项技术债?
   - A) 6　B) 12　C) 56　D) 100
2. 验收测试抓出的「漏网之鱼」是什么?
   - A) 枚举状态机有 bug　B) 外送附加费还在用 double　C) BigDecimal 构造函数错误　D) 队列复杂度问题
3. double 0.05 + 0.01 在 Java 中的结果是?
   - A) 0.06　B) 0.060000000000000005　C) 0.05999999999999999　D) 0.061
4. 验收测试中 validate `assertEquals(new BigDecimal("0.06"), DeliveryFee.surcharge(1))` 为什么能成功(equals 连 scale 比)?
   - A) 巧合　B) surcharge 统一 setScale(2),与期望双方 scale 一致　C) 自动转换　D) equals 不比较 scale
5. 卷一所有改造里,面对外部输入的第一道防线是什么?
   - A) 正则　B) 先设长度上限,再匹配　C) Try-catch　D) 队列缓冲
6. JUnit 验收测试的核心价值是什么?
   - A) 让代码跑不死　B) 把「口说的没问题」变成「测试报告说没问题」——证据说话　C) 提速　D) 自动补文档
7. enum 持久化的安全底线是什么?
   - A) 存 name　B) 存显式 code,不存 ordinal　C) 存序号　D) 不用 enum
8. 「技术债账本」的方法论核心是什么?
   - A) 记下来放着　B) 每笔债:记录(主线欠的)→还(番外补)→验收(测试一条一条过)　C) 假装不欠　D) 重写
9. 卷一完结时咖啡站的项目版本号到多少?
   - A) v1　B) v7　C) v8.13　D) v10
10. 卷一的 12 项改造全部就位后,下一个待解决的是什么?
    - A) 没什么了　B) 并发安全——两个线程一起扣库存会超卖　C) 前端重构　D) 数据库迁移

> [!答案]
> **1-B**　12 笔:值传递与拷贝、位运算、装箱陷阱、金额(BigDecimal)、枚举状态机、时间(java.time)、正则(Pattern)、叫号(Queue)、排行与 LRU、IO 编码、序列化(JSON)、函数式(Stream)。**举一反三**:12 笔债涵盖了「Java 程序员的基本盘」——面试前把这些知识点各准备一道口头题,基本盘就稳了。
> **2-B**　全站迁移 BigDecimal 时,外送附加费那段藏在角落里被漏了。**举一反三**:验收的价值正是抓这种漏网之鱼——阿零嘴里的「全改完了」不值钱,JUnit 跑出来的红灯才算数。
> **3-B**　0.05 和 0.01 在二进制都存不准(IEEE 754),相加误差累积到 0.060000000000000005。**举一反三**:这就是第 60 话的 double 原罪——一个简单的加法,结果不是你想的那样;人眼看不出 JUnit 看得出。
> **4-B**　surcharge return 时调了 `setScale(2, HALF_UP)`,两边 BigDecimal 的 scale 一致(2),equals 比对通过。**举一反三**:不统一 scale 的情况下,正确的比对方式是 `compareTo==0` 或 `assertThat(bd).isEqualByComparingTo(expected)`。
> **5-B**　正则匹配前先对输入设长度上限——消掉嵌套量词的隐患后,输入长度决定回溯步数的上限。**举一反三**:所有用户输入在 Controller/网关层先做长度校验和格式白名单检查——尤其是开放给未登录用户的接口。
> **6-B**　JUnit 的价值是把「主观判断」转化为「客观证据」——口说的没问题不能上线,测试通过的才行。**举一反三**:每一篇文章里的 JUnit 测试都在体现这一点——质检员问「证据呢?」就是全系列最核心的质量文化符号。
> **7-B**　code 是稳的——无论 enum 里声明顺序怎么变、名字怎么改,code 不变。ordinal 是声明座位号,中间插一个全部错位;name 改名也翻车。**举一反三**:数据库中建一张 ENUM 类型的列更理想(MySQL 原生支持 enum 类型),或存 code 值并用应用层的 `ofCode(int)` 映射——最不稳的就是 ordinal。
> **8-B**　债要记(主线注释),要还(番外集中清偿),要验收(测试一条条过)。三阶段对应工程的三条纪律:发现问题不放过、集中改正、验收不留漏网之鱼。**举一反三**:面试时回答「你们怎么管理技术债」——这就是答案的三个档位,每一档都有具体实践支撑。
> **9-C**　v8.1~v8.12 每项改造一版,验收日上线 v8.13——Java 基础到此精装完毕。**举一反三**:v 后面跟的不是产品版本号,是项目工程形态;这种明线贯穿整个连载——每期结束都有「项目检查点」。
> **10-B**　十二项改造默认单线程操作——两个线程同时扣库存会发生什么?超卖。这就是番外卷二《并发深水区》要解决的。**举一反三**:本季最后一句预告是精心设计的:从卷一「语言」跨到卷二「并发」——先写对,再写快、写准。

### 解答题(5 道)

1. 用 12 项改造画一张对照表:旧债(主线欠了什么) → 怎么还的(BigDecimal/enum/时间/正则/队列/缓存/编码/存档/Stream),每一项一句话就行。
2. 验收测试和普通单元测试有什么区别?为什么验收测试尤其适合抓「漏网之鱼」?
3. 你接手了一个用 double 存金额的老系统,按什么优先级逐步迁移?
4. 卷一里哪项改造最可能在新项目中踩坑?给出 3 个具体的防范建议。
5. 卷一的 5 个高频面试题:值传递、Integer 127/128、金额精度、枚举单例、ReDoS——各用一句话答法,并给出面试追问答案。

> [!答案]
> **1**　| 旧债(主线) | 还法(番外卷一) ||---|---|| 复制订单共享配料 | 深拷贝构造器 + List.copyOf(#57) || 八个散装 boolean | int 位图 + EnumSet 位向量(#58) || Integer 用 == 判等 | equals/Objects.equals(#59) || double 计价 | BigDecimal + HALF_UP(#60) || 裸字符串状态 | enum 状态机,存 code(#61) || static SDF 并发 | DateTimeFormatter 常量(#62) || 人肉校验 + 嵌套量词 | Pattern + 先限长(#63) || ArrayList 模拟排队 | ArrayDeque + PriorityQueue(#64) || 排行榜同销量互吞 | thenComparing(#65) || GBK 锟斤拷 | 全链路 UTF-8(#66) || JDK 序列化一改就崩 | JSON + serialVersionUID(#67) || 十行 for 流水线 | Stream groupingBy(#68) |　**举一反三**:这张表就是卷一的知识地图——面试前扫一眼,任何一项都能作为项目经历拿出来讲;每个还能顺带讲出事故故事,比背理论生动。
> **2**　普通单元测试聚焦单一方法(输入→输出),验收测试跑主干场景(一道完整业务流程):从下单到付款到制作到导出——沿线走下来才能发现「外送附加费还在用 double」这种藏在角落的漏网之鱼。**举一反三**:验收测试不是一次也不用的,而是每次大版本发布前必跑的全业务流测试。现代实践也管这叫「smoke test」或「主干场景测试」。
> **3**　第一优先级:对外接口/API——在 Controller 和 DTO 层转 BigDecimal,内外隔离。第二:核心业务逻辑——订单计算、对账、退款。第三:内部非结算字段(如统计数据)可暂缓。每批迁移跑全量验收测试,double→BigDecimal 这类全局性改造不能一次推全量。**举一反三**:「convergence → isolation → migration」三步:先在出入口建 API 墙,再逐步迁移内部,不走炸裂式全改。
> **4**　最可能踩的坑:持久化枚举的 ordinal(最易犯且静默错位)。三防:① 上线前跑一轮 `values()` 遍历对序号的测试——任何新增、删改、重排枚举定义都会报警;② DB 迁移脚本用 code 字段 + `ofCode` 映射,不碰 ordinal;③ code review 时执行 grep `\.ordinal()`——看到就挡。**举一反三**:这三条防御就是验收思维的延伸——把「谁提醒谁补」变成「自动拦截」。
> **5**　| 题 | 一句话 | 追问 ||---|---|---|| 值传递? | 只有值传递,引用类型传地址值副本(#57) | 那为什么方法能改 list?→同一条地址走进去改同一栋房 || 127/128? | IntegerCache,判等 equals | 缓存上界可调→但不能依赖;换台机器结果反转 || 金额类型? | BigDecimal,字符串构造,compareTo 判等 | divide 不传 scale→ArithmeticException,除不尽绝不偷偷舍入 || 枚举单例? | JVM 保证实例唯一 + 防反射 + 防序列化 | 普通单例怎么防?readResolve(补丁),额外同步—枚举天生 || ReDoS? | 嵌套量词,指数级回溯;先限长,消嵌套 | 占有量词 `++` 直接在量词层消除回溯——吃了不吐 |　**举一反三**:面试能答出追问级别 = 「不仅背了八股,还能讲出原理和踩过的坑」——这是从「能干活」到「能讲透」的质变。*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
