---
title: "《从零开始学 Java》17 · 接口合同"
date: 2026-08-10
summary: "收银台面对支付宝、微信、现金不想写三套逻辑。用 interface 定义统一契约,各付款方式各自实现,收银台只认接口。"
tags: [Java, Java漫画, 接口, interface, 阿零与豆豆]
---

# 《从零开始学 Java》17 · 接口合同

> 第二季「对象大陆」第 5 话 · 基线 JDK 25 · 承接:靠多态统一调度咖啡的咖啡站。

---

## 一、需求:收银台只关心「能不能付款」

支付宝、微信、现金,细节各不相同,但收银台只需要一个能力:`pay(金额)`。它不该为每种付款方式写一套分支。

---

## 二、漫画

> **〔1〕** 一份合同标题 `interface PaymentMethod`,只有一条条款:`void pay(double amount);`。
> 豆豆:「接口只写**要能做什么**,不写**怎么做**。」

> **〔2〕** 支付宝、微信、现金三方各自签字(`implements`),按自己的方式履约。收银台把合同一递,谁来都能付。

---

## 三、本话目标

- 用 `interface` 定义行为契约;
- 用 `implements` 让多个类履约;
- 面向接口编程:调用方只依赖接口,不依赖具体实现;
- 踩一次「实现类漏实现接口方法」的编译错误。

---

## 四、原理图

```text
interface PaymentMethod {      契约:只声明方法,不写实现
    void pay(double amount);
}
class Alipay implements PaymentMethod {   履约:必须实现契约里所有方法
    public void pay(double amount) { ... }
}
收银台:void checkout(PaymentMethod m, double amt) { m.pay(amt); }  只认接口
```

一个类可以 `implements` **多个**接口(不像继承只能有一个父类)。

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

新增一种付款方式(比如「积分支付」),只要再写一个 `implements PaymentMethod` 的类,`checkout` 完全不用动。

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

> 只有一个抽象方法的接口叫「函数式接口」,能直接用 Lambda 实现 —— 第三季会专门讲。

---

## 九、项目检查点 · 豆豆咖啡站 v1.5

```text
新增:PaymentMethod 接口 + 三种付款实现,收银台只依赖接口
还没有:接口和抽象类到底该用哪个,阿零有点晕 —— 下一话讲清取舍
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 接口 / 面向接口编程 | OOP 核心;Spring 的 Bean 依赖注入基础 |
| 函数式接口 + Lambda | 「Java 8~21 新特性」 |

---

## 十一、下一话悬念

「接口」和「抽象类」看着都能定义「未完成的方法」,阿零分不清什么时候用哪个。

> 下一话《抽象类 vs 接口》:一张对照表 + 一个咖啡设备的例子,讲清「is-a 共享状态」用抽象类、「能做某事的契约」用接口。
