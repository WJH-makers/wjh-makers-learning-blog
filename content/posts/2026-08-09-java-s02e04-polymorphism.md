---
title: "《从零开始学 Java》16 · 多态调度中心"
date: 2026-08-09
summary: "一个列表里混着普通杯和高级杯,却希望每杯各自描述自己。父类引用指向子类对象,运行时自动派发。"
tags: [Java, Java漫画, 多态, 动态派发, 阿零与豆豆]
---

# 《从零开始学 Java》16 · 多态调度中心

> 第二季「对象大陆」第 4 话 · 基线 JDK 25 · 承接:有了 Coffee 与 PremiumCoffee 家族。

---

## 一、需求:一视同仁,又各显其能

菜单里既有 `Coffee` 也有 `PremiumCoffee`。想用**同一种类型**装下它们、用**同一个调用** `describe()`,却让每杯输出自己的描述。

---

## 二、漫画

> **〔1〕** 调度中心一排相同的传送口,标着 `Coffee`,里面滚出的却有普通杯、有带奶泡的高级杯。
> 豆豆:「用父类 `Coffee` 接住所有子类,这叫**向上转型**。」

> **〔2〕** 阿零喊一声 `describe()`,每杯自动报出自己的版本。
> 豆豆:「调用哪个版本,**运行时**看对象的真实类型决定 —— 这就是多态。」

---

## 三、本话目标

- 理解「父类引用指向子类对象」;
- 理解运行时动态派发(调用子类覆盖后的方法);
- 用一个 `List<Coffee>` 统一管理不同子类;
- 认识 `instanceof` 的模式匹配写法(Java 现代语法)。

---

## 四、原理图

```text
Coffee c = new PremiumCoffee(...);   引用类型是 Coffee,真实对象是 PremiumCoffee
c.describe();                         调用的是 PremiumCoffee 覆盖后的版本(运行时决定)

现代 instanceof:
if (c instanceof PremiumCoffee p) {  匹配成功就直接得到已转型的 p
    ... p.getFoam() ...
}
```

---

## 五、代码:统一调度不同咖啡

```java
import java.util.List;

public class Menu {
    public static void main(String[] args) {
        // 父类引用装子类对象,一个列表混装
        List<Coffee> menu = List.of(
            new Coffee("美式", 15.0, 20),
            new PremiumCoffee("燕麦拿铁", 22.0, 8, 3)
        );

        for (Coffee c : menu) {
            System.out.println(c.describe());   // 各自派发到正确版本
        }
    }
}
```

输出:

```text
美式 ¥15.0(库存 20)
燕麦拿铁 ¥22.0(库存 8) · 奶泡 3 级
```

同一句 `c.describe()`,两种行为 —— 新增一种咖啡子类,这段调度代码**一个字都不用改**。

---

## 六、故意制造一个 Bug

想对高级杯额外操作,直接强转所有元素:

```java
for (Coffee c : menu) {
    PremiumCoffee p = (PremiumCoffee) c;   // ← 故意:把普通美式也强转成高级杯
    System.out.println(p.describe());
}
```

---

## 七、读懂真实报错

```text
Exception in thread "main" java.lang.ClassCastException:
        class Coffee cannot be cast to class PremiumCoffee
        at Menu.main(Menu.java:12)
```

`ClassCastException` —— 美式的真实类型是 `Coffee`,硬转成子类 `PremiumCoffee` 会崩。**向下转型前必须先判断类型**。

---

## 八、修复,并用测试证明

用现代 `instanceof` 模式匹配,只对真的高级杯操作:

```java
static int foamLevel(Coffee c) {
    return c instanceof PremiumCoffee p ? p.getFoam() : 0;   // 不是高级杯就当 0
}
```

```java
@Test
void polymorphic_foam() {
    assertEquals(0, Menu.foamLevel(new Coffee("美式", 15, 20)));
    assertEquals(3, Menu.foamLevel(new PremiumCoffee("拿铁", 22, 8, 3)));
}
```

> 需要给 `PremiumCoffee` 加一个 `int getFoam(){ return foam; }`。

---

## 九、项目检查点 · 豆豆咖啡站 v1.4

```text
新增:用 List<Coffee> 统一调度多种咖啡,靠多态各显其能
还没有:顾客要用支付宝/微信/现金付款,收银台不想为每种写一套 —— 下一话进接口
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 多态 / 动态派发 | OOP 三大特征之一,面试重头 |
| instanceof 模式匹配 | 「Java 新特性」高频 |
| ClassCastException | 向下转型的经典坑 |

---

## 十一、下一话悬念

收银台面对支付宝、微信、现金,总不能写三套 if-else。它需要的只是「一个能 `pay()` 的东西」。

> 下一话《接口合同》:用 `interface PaymentMethod` 定义统一契约,三种付款方式各自实现,收银台只认接口。
