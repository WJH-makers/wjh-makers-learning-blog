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

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. `interface` 描述的是什么?
   - A) 怎么做　B) **要能做什么**,不写怎么做　C) 数据结构　D) 类的字段布局
2. 一个类可以 `implements` 几个接口?
   - A) 只能 1 个　B) 最多 2 个　C) 多个 —— 这是接口相对继承的一大自由　D) 不限,但必须同包
3. `class WeChatPay implements PaymentMethod {}` 却没写 `pay`,会?
   - A) 运行时抛异常　B) 编译报错 `is not abstract and does not override abstract method pay(double)`　C) 自动生成空实现　D) 编译通过,调用时返回 null
4. 接口里 `void pay(double amount);` 的默认修饰符是?
   - A) `public abstract`　B) `protected`　C) 包私有　D) `private final`
5. 接口里写 `int MAX = 3;`,它其实是?
   - A) 实例字段　B) `public static final int MAX = 3`,一个常量　C) 局部变量　D) 编译错误
6. 实现接口方法时为什么必须显式写 `public`?
   - A) 习惯问题　B) 覆盖时访问权限只能放大不能缩小,不写就是包私有,等于缩小　C) 为了被反射调用　D) 因为接口是 public 的
7. 运营临时加「积分支付」,收银台一个字没改就上线,这体现的原则是?
   - A) 单一职责　B) 开闭原则:对扩展开放,对修改关闭　C) 里氏替换　D) 依赖倒置
8. 豆豆说接口省的不是打字,是什么?
   - A) 内存　B) **风险** —— 老代码不动,就不会被改出新 Bug　C) 编译时间　D) 类的数量
9. `PaymentMethod fake = amount -> charged[0] = amount;` 能这么写,因为?
   - A) 接口都能用 Lambda　B) 它只有一个抽象方法,是函数式接口　C) 用了 `var`　D) 因为在测试里
10. 收银台方法签名写 `checkout(PaymentMethod method, ...)` 而不是 `checkout(Alipay method, ...)`,好处是?
    - A) 参数更短　B) 只依赖抽象,任何实现都能传进来,不必为每种支付改代码　C) 运行更快　D) 支持多线程

> [!答案]
> **1-B**　接口只写契约,实现交给签约方。**举一反三**:「依赖抽象而不依赖具体」是依赖倒置原则,Spring 的依赖注入就建在这上面。
> **2-C**　类只能 `extends` 一个父类,却能 `implements` 多个接口。**举一反三**:所以能力型抽象(可比较、可序列化、可关闭)都用接口表达。
> **3-B**　签了合同就必须履约,编译期强制。**举一反三**:这是接口最大的价值之一 —— 把「忘了实现」从运行期错误变成编译期错误。
> **4-A**　接口方法默认 `public abstract`。**举一反三**:JDK 8 起还能写 `default` 和 `static` 方法,JDK 9 起能写 `private` 辅助方法。
> **5-B**　接口里的字段全是公有常量。**举一反三**:所以「用接口存常量」是个反模式 —— 常量该放在类或枚举里,别塞进契约。
> **6-B**　不写就是包私有,属于缩小权限。**举一反三**:同理子类覆盖父类的 `protected` 方法时,可以放大成 `public`,但不能缩成 `private`。
> **7-B**　加功能靠新增实现,不靠改老代码。**举一反三**:反过来,如果你发现「每加一个类型就要改一处 switch」,那就是该上接口/多态的信号。
> **8-B**　不动的代码不会出新 Bug。**举一反三**:这也是为什么大规模重构比新增功能风险高得多 —— 动的面积就是风险面积。
> **9-B**　只有一个抽象方法的接口是函数式接口,能用 Lambda 实现。**举一反三**:`Runnable`、`Comparator`、`Function` 都是,第三季讲 Stream 时会天天用。
> **10-B**　只认合同,不认脸。**举一反三**:测试里能塞一个假实现进去,正是「依赖接口」带来的可测试性红利。

---

*本话属于连载《从零开始学 Java》。世界观见 `docs/java-comic-academy/handbook.md`;季次地图见 `/java`。*
