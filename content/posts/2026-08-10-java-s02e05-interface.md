---
title: "《从零开始学 Java》17 · 接口合同"
date: 2026-08-10
summary: "收银台面对支付宝、微信、现金不想写三套逻辑。用 interface 定义统一契约,各付款方式各自实现;临时插队的『积分支付』现场演示什么叫『加功能不动老代码』。"
tags: [Java, Java漫画, 接口, interface, 阿零与豆豆]
---

# 《从零开始学 Java》17 · 接口合同

> 第二季「对象大陆」第 5 话 · 基线 JDK 25 · 承接:上一话靠多态统一调度咖啡的咖啡站。

---

## 一、需求:收银台只关心「能不能付款」

支付宝、微信、现金,扣款细节各不相同,但收银台只需要一个能力:`pay(金额)`。它不该为每种付款方式写一套 `if-else` 分支——那样每加一种支付,就得回去改一次收银台,改着改着就成了一坨谁都不敢碰的老代码。

豆豆:「收银台要的不是『支付宝』这个具体东西,而是『一个能 `pay` 的东西』。把这个『能力』单独写成一份**合同**,谁签谁履约——这就是接口。」

---

## 二、漫画 · 积分支付临时插队

![《从零开始学 Java》17 · 接口合同 —— 阿零与豆豆六格漫画](/comics/java/s02e05-interface.png)


> [!文字版]
> **〔1〕** 一份合同摊开,标题 `interface PaymentMethod`,通篇只有一条条款:`void pay(double amount);`。
> 豆豆:「接口只写**要能做什么**,不写**怎么做**。」
>
> **〔2〕** 支付宝、微信、现金三方排队上前,各自签字(`implements`),按自己的方式履约。收银台把合同一递,谁来都能付。
>
> **〔3〕** 开业当天,运营突然冲进来:「加个『积分支付』!马上!」阿零脸都白了:「收银台代码是不是要大改?」
>
> **〔4〕** 豆豆慢悠悠拈起一张新合同,让「积分支付」当场签字 `implements PaymentMethod`,写好自己的 `pay`。收银台那边——**一个字没动**,新支付就上线了。
> 豆豆(叉腰):「这叫**开闭原则**:对扩展开放,对修改关闭。加功能靠**新增实现**,不靠**去改老代码**。收银台只认合同,不认脸。」
>
> **〔5〕** 阿零长舒一口气:「原来接口是这么省事……」
> 豆豆:「省的不是打字,是**风险**。老代码不动,就不会被你改出新 Bug。」
---

## 三、本话目标

- 用 `interface` 定义行为契约;
- 用 `implements` 让多个类履约(一个类可实现多个接口);
- 面向接口编程:调用方只依赖接口,不依赖具体实现;
- 理解接口成员的默认修饰符,顺带体会**开闭原则**;
- 踩一次「实现类漏实现接口方法」的编译错误。

---

## 四、原理图

```text
interface PaymentMethod {      契约:只声明方法,不写实现
    void pay(double amount);   默认就是 public abstract
}
class Alipay implements PaymentMethod {   履约:必须实现契约里所有方法
    public void pay(double amount) { ... } 实现处必须写 public(见面试直击)
}
收银台:void checkout(PaymentMethod m, double amt) { m.pay(amt); }  只认接口
```

一个类可以 `implements` **多个**接口(不像继承只能有一个父类)——这是接口相对继承的一大自由。

---

## 五、代码:统一收银

```java
interface PaymentMethod {
    void pay(double amount);
}

class Alipay implements PaymentMethod {
    public void pay(double amount) { System.out.println("支付宝扣款 ¥" + amount); }
}
class WeChatPay implements PaymentMethod {
    public void pay(double amount) { System.out.println("微信扣款 ¥" + amount); }
}
class Cash implements PaymentMethod {
    public void pay(double amount) { System.out.println("收现金 ¥" + amount + ",请找零"); }
}

public class Checkout {
    static void checkout(PaymentMethod method, double amount) {
        method.pay(amount);       // 只认接口,不关心是哪一种
    }

    public static void main(String[] args) {
        checkout(new Alipay(), 45.0);
        checkout(new Cash(), 20.0);
    }
}
```

新增一种付款方式(比如漫画里插队的「积分支付」),只要再写一个 `implements PaymentMethod` 的类,`checkout` 完全不用动:

```java
class PointsPay implements PaymentMethod {
    public void pay(double amount) { System.out.println("积分抵扣 ¥" + amount); }
}
// checkout(new PointsPay(), 30.0);  ← 收银台一字未改,新支付即插即用
```

---

## 六、故意制造一个 Bug

给微信支付「忘了」实现 `pay`:

```java
class WeChatPay implements PaymentMethod {
    // 忘了写 pay 方法
}
```

---

## 七、读懂真实报错

```text
Checkout.java: error: WeChatPay is not abstract and does not override
        abstract method pay(double) in PaymentMethod
```

签了合同(`implements`)就必须履约 —— 没实现 `pay`,编译官不让你把这个类当成一个正常(非抽象)类。这正是接口的价值:**用编译期强制保证契约被兑现**。

> **🎯 面试直击**:实现接口方法时为什么必须写 `public`?接口里的字段是什么?
> 接口里的方法默认就是 `public abstract`,字段默认是 `public static final`(即公有常量)。**实现类覆盖方法时,访问权限只能放大、不能缩小**——父契约是 `public`,你实现处若不写(默认包私有)就是在**缩小**权限,编译报错,所以必须显式写 `public`。追问点:接口里写 `int MAX = 3;` 不加任何修饰符,它其实是 `public static final int MAX = 3`——一个常量,不是实例字段。

---

## 八、修复,并用测试证明

补上 `pay` 实现。用一个可断言的实现验证收银流程:

```java
@Test
void checkout_delegates_to_method() {
    double[] charged = {0};
    PaymentMethod fake = amount -> charged[0] = amount;   // 接口只有一个方法,可用 Lambda
    Checkout.checkout(fake, 45.0);
    assertEquals(45.0, charged[0]);
}
```

> 只有一个抽象方法的接口叫「函数式接口」,能直接用 Lambda 实现 —— 第三季会专门讲,这里先当个「一次性实现」用。

---

## 九、项目检查点 · 豆豆咖啡站 v1.5

```text
新增:PaymentMethod 接口 + 三种(现可四种)付款实现,收银台只依赖接口
已具备:interface 契约 / implements 履约 / 面向接口编程 / 开闭原则
还没有:接口和抽象类到底该用哪个,阿零有点晕 —— 下一话讲清取舍
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 接口 / 面向接口编程 | OOP 核心;Spring 的 Bean 依赖注入基础 |
| 开闭原则 | 设计原则高频;「加需求不改老代码」的落地 |
| 接口成员默认修饰符 | 八股:public abstract / public static final |
| 函数式接口 + Lambda | 「Java 8~21 新特性」 |

---

## 十一、下一话悬念

「接口」和「抽象类」看着都能定义「未完成的方法」,阿零彻底分不清什么时候用哪个。

> 下一话《抽象类 vs 接口》:一张对照表 + 一台咖啡设备,讲清「is-a 共享状态」用抽象类、「能做某事的契约」用接口——并给一条能当场拍板的选型法则。

---

## 🎯 随堂练习
先自己做，再对答案。选择难度递进，解答从概念到综合，代码含边界验证。

### 一、选择题（10 道）

1. [基础] 在 Java 中用什么关键字定义接口？- A) `class`　B) `interface`　C) `abstract`　D) `implements`
2. [基础] 一个类实现接口用什么关键字？- A) `extends`　B) `interface`　C) `implements`　D) `inherit`
3. [基础] 接口中的方法默认是什么修饰符？- A) `private`　B) `protected`　C) `public abstract`　D) `static`
4. [基础] 一个类可以实现几个接口？- A) 1 个　B) 2 个　C) 最多 5 个　D) 没有数量限制
5. [进阶] 接口中的字段默认是什么修饰符？- A) `private`　B) `public static final`　C) `protected`　D) 实例字段
6. [进阶] `default` 方法（Java 8+）的目的是什么？- A) 替代抽象方法　B) 给接口加新方法而不破坏已有实现类　C) 让接口能实例化　D) 提高性能
7. [进阶] 如果一个类同时实现两个接口，两个接口有同名的 `default` 方法，会发生什么？- A) 随机选一个　B) 编译错误，实现类必须手动覆写解决冲突　C) 自动合并　D) 运行时报错
8. [进阶] 以下哪项是正确的接口实现？- A) `class A interface B {}`　B) `class A extends B, C {}`　C) `class A implements B, C {}`　D) `class A implement B {}`
9. [综合] "面向接口编程" 的核心好处是什么？- A) 代码更短　B) 调用方依赖接口而非具体类，换实现时不改调用方代码　C) 运行更快　D) 不需要写测试
10. [综合] 接口和抽象类的最关键区别是？- A) 完全没区别　B) 接口不涉及状态（无实例字段），抽象类可以有状态和构造器　C) 接口可以实例化　D) 抽象类可以被多继承

> [!答案] **1-B**　`interface` 关键字定义接口。**2-C**　`implements` 表示"实现接口"。**3-C**　接口方法隐式是 `public abstract`，可以省略不写。**4-D**　Java 支持多接口实现，数量无上限——这是"单继承"的补偿机制。**5-B**　接口字段隐式是 `public static final`（常量），不能声明实例字段。**6-B**　`default` 方法让接口在不破坏已有实现类的前提下新增带方法体的方法——如 `Collection.stream()`。**7-B**　编译器会要求实现类手动覆写，明确指定用哪个接口的版本（`A.super.method()`）。**8-C**　`implements` 后面可以跟多个接口，逗号分隔。**9-B**　"开闭原则"——对扩展开放（加新实现类）、对修改关闭（调用方不用改）。**10-B**　接口 = 无状态的契约（Java 8+ 有 `default` 方法但无实例字段），抽象类 = 可以有状态和构造器。
**举一反三**：第 4、5、10 题的组合是面试高频——"接口 vs 抽象类" + "接口字段隐式 static final"，能讲清楚这两个，面向对象选型就毕业了。

### 二、解答题（3 道）

1. [概念] 什么是"面向接口编程"？为什么它能实现"对扩展开放、对修改关闭"（开闭原则）？举一个具体的业务例子说明。
2. [场景] 咖啡站有支付宝、微信、现金三种付款方式，收银台需要调用 `pay(amount)`。设计接口方案，说明为什么收银台不应该依赖具体的付款类。
3. [综合] 两个接口 `Printer`（`default print()`）和 `Scanner`（`default scan()`）各自有 `default` 方法。类 `AllInOne` 同时实现这两个接口时，这两个 `default` 方法会冲突吗？什么情况会冲突？冲突时怎么解决？

> [!答案] **1**　面向接口编程 = 调用方声明的是**接口类型**而非具体类类型。比如收银台参数写 `PaymentMethod pm` 而非 `AliPay p`。好处：加新付款方式（如积分支付）只需新增实现类，收银台一行代码不用改——这就是"对扩展开放、对修改关闭"。反例：如果收银台写死 `if (alipay) ... else if (wechat) ...`，每加一种付款方式都要改收银台代码。**举一反三**：Spring 的依赖注入（DI）就是大规模面向接口编程——`@Autowired PaymentService` 注入接口类型，运行时挂哪个实现由容器决定。**2**　
> ```java
> interface PaymentMethod { void pay(double amount); }
> class AliPay implements PaymentMethod { ... }
> class WechatPay implements PaymentMethod { ... }
> class Cash implements PaymentMethod { ... }
> // 收银台:
> void checkout(PaymentMethod pm, double total) { pm.pay(total); }
> ```
> 收银台只认 `PaymentMethod` 接口——不管传入的是支付宝、微信还是现金，都只调 `pay()`。不依赖具体类的好处：①加积分支付只需新增实现类，不动收银台；②测试时可以用匿名内部类或 Lambda 模拟付款（`amount -> {}`），不需要真的扣钱。**举一反三**：违反这个原则的代码特征——方法参数里出现具体类名、方法体内出现 `instanceof` 分支判断付费方式。**3**　两个 `default` 方法**只要签名不同就不会冲突**——`print()` 和 `scan()` 名字不同，各自独立。冲突发生在**两个接口有同签名同方法名的 `default` 方法**时，比如两个接口都有 `default void start()`。此时实现类必须覆写 `start()` 来解决歧义，可以明确指定用哪个：
> ```java
> @Override public void start() { Printer.super.start(); }  // 选 Printer 的版本
> ```
> **举一反三**：Java 这个设计保证了向后兼容——`default` 方法的引入不会让已有代码编译失败（除非恰好有同名冲突，而这是少数且编译器会明确提醒）。

### 三、代码题（2 道）

1. [基础] 定义 `Payable` 接口（`void pay(double amount)`），`CashPayment` 和 `CardPayment` 分别实现——现金打印 `"现金支付 X 元"`，刷卡打印 `"刷卡支付 X 元"`。用接口类型变量接收两个不同实现并调用 `pay()`，验证多态。
2. [综合] 设计 `CoffeeMaker` 接口：方法 `String brew()` 和 `default String clean()`（返回 `"清洗完成"`）。`BasicMaker` 实现 `brew()` 返回 `"滴滤美式"`，并覆写 `clean()` 返回 `"基础款清洗完成"`。`PremiumMaker` 实现 `brew()` 返回 `"高压拿铁"`，**不覆写** `clean()`（继承 default 版本）。写测试验证两个实现类的 `brew()` 和 `clean()` 输出，覆盖 default 方法被覆写和未被覆写两种路径。

> [!答案] **1 验收**：
> ```java
> interface Payable { void pay(double amount); }
> class CashPayment implements Payable {
>     public void pay(double amount) { System.out.println("现金支付 " + amount + " 元"); }
> }
> class CardPayment implements Payable {
>     public void pay(double amount) { System.out.println("刷卡支付 " + amount + " 元"); }
> }
> // 接口变量接收实现:
> Payable p1 = new CashPayment();
> Payable p2 = new CardPayment();
> p1.pay(15.9);  // 现金支付 15.9 元
> p2.pay(22.0);  // 刷卡支付 22.0 元
> ```
> **举一反三**：后面扩展积分支付只需 `class PointsPayment implements Payable`，上面两行调用不动——这就是开闭原则。**2 验收**：
> ```java
> interface CoffeeMaker {
>     String brew();
>     default String clean() { return "清洗完成"; }
> }
> class BasicMaker implements CoffeeMaker {
>     public String brew() { return "滴滤美式"; }
>     @Override public String clean() { return "基础款清洗完成"; }
> }
> class PremiumMaker implements CoffeeMaker {
>     public String brew() { return "高压拿铁"; }
>     // 不覆写 clean() —— 用接口 default 版本
> }
> // 测试:
> CoffeeMaker basic = new BasicMaker();
> System.out.println(basic.brew());   // 滴滤美式
> System.out.println(basic.clean());  // 基础款清洗完成 （覆写版）
> CoffeeMaker premium = new PremiumMaker();
> System.out.println(premium.brew());  // 高压拿铁
> System.out.println(premium.clean()); // 清洗完成 （default 版）
> ```
> **举一反三**：`default` 方法的最佳实践——先给一个通用默认实现，子类需要时再覆写。"清洗"对基础款有特殊流程所以覆写，高级款用默认就够了。这是"接口演化"（API evolution）的经典模式。

---

*本话属于连载《从零开始学 Java》。世界观见 `docs/java-comic-academy/handbook.md`;季次地图见 `/java`。*
