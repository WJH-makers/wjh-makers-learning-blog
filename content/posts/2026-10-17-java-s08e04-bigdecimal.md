---
title: "《从零开始学 Java》60 · BigDecimal 与钱的尊严"
date: 2026-10-17
summary: "三张 0.1 元折扣券加起来不等于 0.3,冬歇对账夜账本裂开一道缝。IEEE 754 的二进制量杯为什么天生装不准 0.1?咖啡站把计价字段全线迁到 BigDecimal,又踩响除不尽的 ArithmeticException——钱的尊严,从显式舍入开始。"
tags: [Java, Java漫画, BigDecimal, 浮点数, 金额精度, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》60 · BigDecimal 与钱的尊严

> 连载特刊 · 番外卷一「语言宝库」第 4 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——包装类的缓存暗箱刚看穿,对账夜的账本又裂开一道缝:三张一毛钱折扣券,加起来竟不是三毛。

---

## 一、事故:对账单上多出的 0.00000000000000004

豆豆摊开技术债账本第一页「语言宝库」,指着欠得最久的一笔:**计价一直用 double**。自 `record Coffee(String name, double price, int stock)` 定型起(回看第 22 话),每一分钱都躺在浮点数里。月底对账出事了:一批订单各用了三张 0.1 元折扣券,`0.1 + 0.1 + 0.1` 的合计和 `0.3` 对不上。

阿零:「差多少?」
豆豆:「单笔 0.00000000000000004 元。但对账只认**分毫不差**——差多少不重要,『对不上』本身就是事故。今天这笔债,连本带利还清。」

---

## 二、漫画 · double 量杯与 BigDecimal 金库

> **〔1〕** 深夜对账室,阿零把三张 0.1 元折扣券摞在一起,账本「叮」地弹出 `0.30000000000000004`。
> 阿零:「我明明只发了三张一毛钱!多出来的零头是谁塞进去的?」

> **〔2〕** 豆豆掀开 double 的仓库门——满屋**二进制刻度**的量杯,0.1 元的咖啡液怎么倒都对不齐刻度线。
> 豆豆:「double 用二进制存小数,0.1 是二进制无限循环,量杯只有 52 格刻度,只能存『最接近的那杯』——不是算错,是**存错**。」

> **〔3〕** 阿零推来刻着「BigDecimal」的金库,却随手把 double 的 0.1 倒进去——金库门一开,滚出一长串 `0.1000000000000000055…`,把他埋了半截。
> 豆豆(叼着豆子叉腰):「你把已经洒了的那杯原样搬进金库。金库只负责**保真**,不负责纠错——要么传字符串,要么 `valueOf`。」

> **〔4〕** JUnit 质检员抱着对账单敲门:「证据呢?」阿零把绿色的测试报告拍在桌上:三杯 0.1,稳稳等于 0.3。
> 豆豆:「从今天起,钱的事只认 BigDecimal 和测试报告。」

---

## 三、本话目标

- 讲清 IEEE 754 用二进制存小数,0.1 为什么天生存不准;
- 把咖啡站计价字段从 double 全线迁到 BigDecimal,还清主线旧债;
- 分清 `new BigDecimal(0.1)` 与 `BigDecimal.valueOf(0.1)` 两条进门通道;
- 用 `setScale` + `RoundingMode` 显式舍入,金额判等只认 `compareTo`;
- 踩响「除不尽不给 scale」的 ArithmeticException 并修好;金额入库定 DECIMAL。

---

## 四、原理图:二进制量杯为什么装不下 0.1

```text
十进制 0.1 → 二进制:0.000110011001100110011…(「1100」无限循环)
double(IEEE 754,64 位)= 1 位符号 + 11 位阶码 + 52 位尾数
                          └─ 52 格刻度装不下循环节,只能舍入存「最接近的那个数」

0.1 实际存的 ≈ 0.10000000000000000555…(略大);0.1+0.1+0.1 → 0.30000000000000004(误差累积)

BigDecimal = unscaledValue(任意长的十进制整数)× 10^(-scale)
「1850 × 10⁻²」= 18.50 —— 十进制原样记账,没有二进制换算,也就没有换算误差
```

> **🔀 豆豆的多解台 · 金额到底怎么表示?**

| 解法 | 代码要点 | 适合什么时候 | 坑 |
|---|---|---|---|
| double 计价(反面教材) | `double price = 0.1;` | 图形、科学计算等**容忍近似**的场景 | 十进制小数存不准,误差随笔数累积;`==` 判等失灵 |
| long 以「分」为单位 | `long cents = 1850;` | 高频交易、性能敏感,运算以加减为主 | 折扣、分摊仍要手写舍入;「元/分」单位混用是事故高发区 |
| BigDecimal | `new BigDecimal("18.50")` | 订单、账务、退款等**一切对外金额**(默认解) | 必须字符串构造;除法必须给 scale + RoundingMode;判等用 `compareTo` |

豆豆锐评:**默认 BigDecimal + 字符串构造**,性能瓶颈实测成立后才考虑 long 分——而 double,从今天起不许碰钱。

---

## 五、代码:计价链路整体迁移(还债)

在主线定型的 record 之上,只动一个字段的类型:

```java
import java.math.BigDecimal;
import java.math.RoundingMode;

record Coffee(String name, BigDecimal price, int stock) {}   // double → BigDecimal,本话起全线遵循

public class MoneyMigration {
    public static void main(String[] args) {
        var latte = new Coffee("拿铁", new BigDecimal("18.00"), 10);

        // 两条进门通道,天差地别
        System.out.println(new BigDecimal(0.1));      // 把 double 的误差原样搬进金库
        System.out.println(BigDecimal.valueOf(0.1));  // 先走 Double.toString 的字符串路径 → 0.1

        // 舍入必须显式说规则:保留 2 位小数,四舍五入
        System.out.println(new BigDecimal("18.555").setScale(2, RoundingMode.HALF_UP));  // 18.56

        // 判等的两套标准
        var a = new BigDecimal("1.0");
        var b = new BigDecimal("1.00");
        System.out.println(a.equals(b));              // false:equals 连 scale 一起比
        System.out.println(a.compareTo(b) == 0);      // true :compareTo 只比数值
    }
}
```

第一行输出让阿零倒吸凉气:`new BigDecimal(0.1)` 打出 55 位长尾 `0.1000000000000000055511151231257827…`,忠实保存了那杯早就洒了的 double;`valueOf(0.1)` 打出干净的 `0.1`。

> **豆豆锐评**:钱要一路体面到数据库——建表用 **DECIMAL**(如 `price DECIMAL(10,2)`),与 BigDecimal 同为十进制定点数,无缝映射;用 FLOAT/DOUBLE 列存金额,等于把误差**固化进库**,对账永无宁日。

---

## 六、故意制造一个 Bug:三张折扣券对不上账

对账程序还是老 double 写法,今晚让它当众翻车:

```java
public class Reconcile {
    public static void main(String[] args) {
        double coupon = 0.1;
        double total = coupon + coupon + coupon;   // 三张 0.1 元折扣券
        System.out.println(total == 0.3);          // ← 故意:期望 true
        System.out.println(total);
    }
}
```

---

## 七、观察真实现象

```text
false
0.30000000000000004
```

没有异常——**Logic Bug 最阴险的形态**:程序一路绿灯,钱却错了。单个 `0.1` 打印正常,是因为 `Double.toString` 只打「能唯一还原这个 double 的最短十进制」,单杯误差被藏住;三杯误差累积后落在**另一个 double** 上,最短表示就成了那串长尾巴。

---

## 八、修复,并用测试证明

用字符串构造的 BigDecimal 重写合计,对账立刻严丝合缝。可阿零乘胜追击写「三人 AA 分账」时,金库当场炸响:

```java
var bill = new BigDecimal("19.00");
var each = bill.divide(new BigDecimal(3));   // ← 19 ÷ 3 除不尽,又不给舍入规则
```

```text
Exception in thread "main" java.lang.ArithmeticException: Non-terminating decimal expansion; no exact representable decimal result.
	at java.base/java.math.BigDecimal.divide(BigDecimal.java:1780)
	at SplitBill.main(SplitBill.java:8)
```

BigDecimal 的原则:除不尽时**绝不替你偷偷舍入**,不给规则宁可抛异常。修法:显式给出 scale 和 RoundingMode——

```java
var each = bill.divide(new BigDecimal(3), 2, RoundingMode.HALF_UP);   // 6.33
```

注意 6.33 × 3 = 18.99,少了一分——真实分账的收口:前两人各收 6.33,最后一人收 `19.00 − 6.33 × 2 = 6.34`,余额兜底。JUnit 质检员收证据:

```java
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MoneyTest {
    @Test
    void three_coupons_add_up_exactly() {
        var coupon = new BigDecimal("0.1");
        var total = coupon.add(coupon).add(coupon);
        assertEquals(0, total.compareTo(new BigDecimal("0.3")));   // 金额判等用 compareTo
    }

    @Test
    void split_bill_needs_explicit_scale_and_rounding() {
        var bill = new BigDecimal("19.00");
        assertThrows(ArithmeticException.class, () -> bill.divide(new BigDecimal(3)));
        assertEquals(new BigDecimal("6.33"),
                bill.divide(new BigDecimal(3), 2, RoundingMode.HALF_UP));
    }
}
```

> **🎯 面试直击**:为什么金额不能用 double?BigDecimal 判等用什么?
> double 按 IEEE 754 用二进制存小数,0.1 这类十进制小数是二进制无限循环,只能存最近似值,误差随运算累积——金额一律 BigDecimal(字符串构造)或 long 分。判等:`equals` 连 scale 一起比(1.0 ≠ 1.00),金额比较必须用 `compareTo`。追问点:`new BigDecimal(0.1)` 与 `valueOf(0.1)` 为何结果不同。

---

## 九、项目检查点 · 豆豆咖啡站 v8.4

```text
咖啡站形态:计价链路全线 BigDecimal,月底对账分毫不差
已具备  :IEEE 754 误差成因;字符串构造/valueOf;setScale+RoundingMode;compareTo 判等;DECIMAL 入库
还没有  :订单状态还是裸字符串 "PAID"/"MAKING",拼错一个字母没人拦得住 —— 下一话进枚举状态机
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 金额精度处理(BigDecimal / DECIMAL) | 支付、电商、账务岗 JD 的隐形门槛,事故复盘的高频主角 |
| IEEE 754 误差成因 | 「0.1+0.2 为什么不等于 0.3」是跨语言通用面试题 |
| equals vs compareTo / 显式舍入 | 代码评审红线:金额判等、除法不写舍入规则,直接打回 |

---

## 十一、下一话悬念

计价体面了,阿零却在订单表里瞥见一行 `status = "PIAD"`——手一抖拼错的字符串,编译器一声不吭,查单接口静静漏掉了这笔已付款订单。

> 下一话《枚举状态机》:把合法状态钉死在类型里,非法值在**编译期**就进不了门;豆豆还会把「下单 → 制作 → 出杯」的流转规则,直接长在枚举身上。

---

## 🎯 随堂练习

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. `double` 存不准 0.1 的根本原因是?
   - A) 精度位数不够　B) **IEEE 754 用二进制存小数,0.1 是二进制无限循环,只能存最接近的近似值**　C) JVM 实现有 bug　D) 打印时被截断
2. `0.1 + 0.1 + 0.1 == 0.3` 的结果是?
   - A) `true`　B) **`false`**,实际得到 `0.30000000000000004`　C) 编译报错　D) 抛异常
3. 单个 `0.1` 打印出来正常,是因为?
   - A) 它确实精确　B) `Double.toString` 只打「能唯一还原这个 double 的最短十进制」,把误差藏住了　C) 打印时四舍五入　D) 编译器优化
4. `new BigDecimal(0.1)` 和 `BigDecimal.valueOf(0.1)` 的区别是?
   - A) 没区别　B) **前者把 double 的误差原样搬进来(55 位长尾),后者走字符串路径得到干净的 0.1**　C) 后者更慢　D) 前者已废弃
5. 构造金额 BigDecimal 的正确姿势是?
   - A) `new BigDecimal(18.5)`　B) **`new BigDecimal("18.50")`** —— 字符串构造　C) `BigDecimal.valueOf(18.5f)`　D) 先转 float
6. `new BigDecimal("1.0").equals(new BigDecimal("1.00"))` 的结果是?
   - A) `true`　B) **`false`** —— `equals` 连 scale 一起比　C) 抛异常　D) 取决于 JDK 版本
7. 金额判等应该用?
   - A) `==`　B) `equals`　C) **`compareTo(...) == 0`** —— 只比数值不比 scale　D) `hashCode` 比较
8. `new BigDecimal("19.00").divide(new BigDecimal(3))` 会?
   - A) 得到 6.33　B) 得到 6.333333　C) **抛 `ArithmeticException`** —— 除不尽又没给舍入规则　D) 返回 null
9. 金额字段在 MySQL 里应该用什么类型?
   - A) FLOAT　B) DOUBLE　C) **DECIMAL** —— 与 BigDecimal 同为十进制定点数,无缝映射　D) VARCHAR
10. `long` 以「分」为单位存金额,适合什么场景?
    - A) 一切金额场景　B) **高频交易、性能敏感且运算以加减为主**;折扣分摊仍要手写舍入　C) 只适合小额　D) 已被淘汰

> [!答案]
> **1-B**　二进制量杯装不下十进制的 0.1。**举一反三**:这不是 Java 的问题 —— 所有用 IEEE 754 的语言(JS、Python、C)都一样。
> **2-B**　误差随运算累积。**举一反三**:「0.1+0.2 为什么不等于 0.3」是跨语言通用面试题,根因完全相同。
> **3-B**　最短表示藏住了误差。**举一反三**:所以「打印看着对」绝不等于「值是精确的」—— 眼见不为实。
> **4-B**　一个搬误差,一个走字符串。**举一反三**:即便是 `valueOf`,只要源头是 double 就已经有损了 —— 所以金额要从字符串一路进来。
> **5-B**　字符串构造是唯一可靠入口。**举一反三**:接口层接收金额也该用字符串,别让 JSON 反序列化把它先变成 double。
> **6-B**　scale 不同即不等。**举一反三**:所以 `BigDecimal` 不适合直接当 HashMap 的 key —— 1.0 和 1.00 会是两个键。
> **7-C**　只有 `compareTo` 比纯数值。**举一反三**:这是代码评审红线之一,金额用 `equals` 判等直接打回。
> **8-C**　除不尽宁可抛异常也不偷偷舍入。**举一反三**:这是很好的设计 —— 舍入规则关乎钱,必须由你显式声明,不能由库替你决定。
> **9-C**　DECIMAL 是定点数。**举一反三**:用 FLOAT/DOUBLE 列存金额等于把误差固化进库,对账永无宁日。
> **10-B**　性能场景的备选。**举一反三**:「元/分单位混用」是事故高发区 —— 选了这条路,单位就必须在命名和文档里写死。

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。