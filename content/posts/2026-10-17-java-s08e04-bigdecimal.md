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

### 选择题(10 道)

1. double 存 0.1 为什么「存不准」?
   - A) Java 的 double 设计有缺陷　B) 0.1 在二进制里是无限循环小数,52 位尾数装不下　C) 编译器 bug　D) 只发生在 Windows 上
2. `0.1 + 0.1 + 0.1 == 0.3` 在 Java 中的结果是?
   - A) true　B) false　C) 编译错误　D) 随机
3. `new BigDecimal(0.1)` 和 `BigDecimal.valueOf(0.1)` 的区别是?
   - A) 完全一样　B) 前者原封不动保存 double 的误差,后者先走字符串路径得到干净的 0.1　C) 前者更精确　D) 前者是静态方法
4. `new BigDecimal("1.0").equals(new BigDecimal("1.00"))` 结果是?
   - A) true　B) false　C) 异常　D) 编译错误
5. 两个 BigDecimal 的金额比大小,正确做法是?
   - A) `equals`　B) `compareTo` == 0　C) `==`　D) `>` 直接比
6. `new BigDecimal("19.00").divide(new BigDecimal(3))` 会?
   - A) 返回 6.33　B) ArithmeticException:除不尽且没给 scale　C) 返回 6　D) 四舍五入
7. 正确的除法写法是?
   - A) `divide(bd)`　B) `divide(bd, 2, RoundingMode.HALF_UP)`　C) `divide(bd, Math.round)`　D) 不能用除法
8. 数据库里存金额的列类型应该是?
   - A) FLOAT　B) DOUBLE　C) DECIMAL　D) VARCHAR
9. 测试里 `assertEquals(new BigDecimal("0.3"), threeCoupons)` 的前提是?
   - A) 凑巧　B) 双边的 scale 必须一致,equals 连小数位数一起比　C) 用 compareTo 重写 assertEquals　D) 做不到
10. `double` 可以合法用在哪?
    - A) 绝不——永远用 BigDecimal　B) 图形渲染/科学计算等容忍近似误差的场景　C) 金额计算　D) 数据库主键

> [!答案]
> **1-B**　IEEE 754 用二进制存小数,0.1 的二进制是 `0.0001100110011…` 无限循环,52 位尾数截断后只能存最近似值。**举一反三**:这不是 Java 的问题,C/Python/JS 的浮点数同理,`0.1+0.2 === 0.3 // false` 在 JS 控制台就能复现。
> **2-B**　三张 0.1 加起来是 0.30000000000000004 而不是 0.3。**举一反三**:浮点判等不要用 `==`,给一个误差容忍 `Math.abs(a-b) < 1e-9`;金额则直接用 BigDecimal 的 compareTo。
> **3-B**　`new BigDecimal(0.1)` 先用 double 保存了 0.1(已经带误差),再把误差原封不动传给 BigDecimal;`valueOf` 内部用了 `Double.toString(0.1)`,先得到字符串再传给 BigDecimal。**举一反三**:这一条背死——金额永远用字符串构造 `new BigDecimal("18.00")` 或 `valueOf`,函数形参已经是 double 时 `valueOf` 是唯一选择。
> **4-B**　`equals` 比较时连 scale(小数位数)一起比,1.0(scale=1) ≠ 1.00(scale=2)。**举一反三**:`equals` 偶尔有用(比如验证 setScale 是否正确),金额判等则永远用 `compareTo==0`。
> **5-B**　金额比较只能用 `compareTo`,它只看数值不看 scale。**举一反三**:写 `a.compareTo(b) == 0` 而不是 `a.equals(b)`,养成肌肉记忆到手指。
> **6-B**　BigDecimal 除不尽时绝不偷偷舍入——不给 scale + RoundingMode 宁可抛 ArithmeticException 也不静默错。**举一反三**:这就是金融计算的铁则:拒绝"悄悄近似";你写的每一行 BigDiv 除法都要有 RoundingMode。
> **7-B**　除法三要素:除数 + 保留几位小数(scale) + 舍入规则(RoundingMode)。**举一反三**:HALF_UP 是最常用的四舍五入;分账时最后一人用「总额 - 前 N−1 人的和」兜底,避免 6.33×3=18.99 少一分。
> **8-C**　DECIMAL 是十进制定点数,与 Java 的 BigDecimal 同为十进制,无缝映射;FLOAT/DOUBLE 是二进制近似值,存进去误差就固化了。**举一反三**:MySQL 的 `price DECIMAL(10,2)` 表示最多 10 位数字、其中 2 位是小数;BigDecimal 的 scale=2 与之一一对应。
> **9-B**　`assertEquals` 底层调 equals,equals 连 scale 一起比;双方 setScale 统一后测试才可靠。**举一反三**:或者写 `assertTrue(threeCoupons.compareTo(new BigDecimal("0.3")) == 0)`,这种写法对 scale 不敏感,也是金测惯用模板。
> **10-B**　double 的设计初衷是科学计算——速度快、允许近似;只有「容忍近似」的场景才合法。**举一反三**:即使科学计算,Java 里用 `StrictMath`(对标 IEEE 754 严格语义)而非 `Math`(允许不同处理器略不同)能复现跨平台结果——但这两个都跟钱无关。

### 解答题(5 道)

1. 用 IEEE 754 的二进制原理,解释为什么 0.1 + 0.1 + 0.1 不等于 0.3。
2. `new BigDecimal(0.1)` 打印出了 55 位长尾巴,为什么 `BigDecimal.valueOf(0.1)` 打印干净的 0.1?源码层面发生了什么?
3. `equals` 和 `compareTo` 对 BigDecimal 的区别是什么?金额判等为什么不能用 `equals`?
4. 公司团建 19 元账单三人 AA,按 BigDecimal + HALF_UP 分,写出完整代码,并说明最后一人为什么要用「减法兜底」。
5. 如果 Legacy 系统已经把金额存成了 double,该在哪个环节转成 BigDecimal,怎么转?

> [!答案]
> **1**　IEEE 754 用二进制存小数:0.1 的二进制是 `0.0001100110011…`(1100 无限循环),double 的 52 位尾数只截取前 52 位(舍入),实际存的值略大于 0.1。三个「略大」相加,误差累积到 0.00000000000000004,所以不等于 0.3。**举一反三**:二进制不擅长存分母不是 2ⁿ 的十进制小数,和「3 进制无法精确表示 1/3」是一个道理——不是 Bug,是进制换算的必然。
> **2**　`new BigDecimal(0.1)` 拿到的是 double 字面量 0.1——它已经带着二进制近似的误差了(实际长约 0.10000000000000000555…),BigDecimal 忠实地把误差原样转成十进制,所以一排长尾。`valueOf(0.1)` 内部先用 `Double.toString(0.1)` 把 double 打成能唯一还原的最短字符串,恰巧就是 "0.1",再以字符串构造 BigDecimal。**举一反三**:所有从 double 进 BigDecimal 的门,优先走 `valueOf`;如果 double 是 JSON 反序列化得到的,说明 JSON 解析那步就已经该拦截。
> **3**　`equals` 比较数值 + scale(1.0 和 1.00 不等),`compareTo` 只比数值(1.0 和 1.00 相等)。金额在乎的是「一元钱是不是一元钱」,所以必须 `compareTo`。**举一反三**:`TreeSet<BigDecimal>` 的元素判重看 `compareTo`,不是 `equals`——如果把 equal scale 不同的同数值 BD 放进 TreeSet,只有先加那一个会被保留。
> **4**　```java
BigDecimal bill = new BigDecimal("19.00");
BigDecimal each = bill.divide(new BigDecimal("3"), 2, RoundingMode.HALF_UP); // 6.33
BigDecimal last = bill.subtract(each.multiply(new BigDecimal("2")));   // 6.34 兜底
```　前两人各 6.33,最后一人 6.34——总额 = 6.33+6.33+6.34 = 19.00 分毫不差。**举一反三**:任何分账/分摊/佣金分配,最后一份用 「总额 − 已分配总和」兜底,这是金融系统的惯用模式。
> **5**　在数据进系统的最外层(Controller 入口、MQ 消费端、文件读取)就拦截:拿到 double 后立即 `BigDecimal.valueOf(d).setScale(...)` 转成 BigDecimal,之后的业务逻辑只碰 BigDecimal。**举一反三**:最差但常见的情况是系统内部已经到处是 double 了——不要试图「一把全改」,先收敛到一两处出入口,再逐步往里迁移,每次迁移都跑全量回归测试。*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
