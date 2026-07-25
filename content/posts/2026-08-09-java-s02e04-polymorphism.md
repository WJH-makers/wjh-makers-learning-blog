---
title: "《从零开始学 Java》16 · 多态调度中心"
date: 2026-08-09
summary: "一个数组里混着普通杯和高级杯,却希望每杯各自描述自己。父类引用指向子类对象,运行时自动派发——阿零嘴硬『都是咖啡怕什么』,被强转当场打脸。"
tags: [Java, Java漫画, 多态, 动态派发, 阿零与豆豆]
---

# 《从零开始学 Java》16 · 多态调度中心

> 第二季「对象大陆」第 4 话 · 基线 JDK 25 · 承接:上一话有了 Coffee 与 PremiumCoffee 家族(PremiumCoffee 已暴露 `getFoam()`)。

---

## 一、需求:一视同仁,又各显其能

菜单里既有 `Coffee` 也有 `PremiumCoffee`。想用**同一种类型**装下它们、用**同一个调用** `describe()`,却让每杯输出自己的描述。第一季刚学过数组,正好拿它把这一排咖啡串起来。

> 说明:统一装载这一步,本话继续用**数组** `Coffee[]`——集合 `List` 要到本季稍后才登场,先不越界。

---

## 二、漫画 · 都是咖啡怕什么

> **〔1〕** 调度中心一排相同的传送口,全标着 `Coffee`,里面滚出的却有普通杯、也有带奶泡的高级杯。
> 豆豆:「用父类 `Coffee` 接住所有子类,这叫**向上转型**——安全,子类天生就是一种父类。」

> **〔2〕** 阿零喊一声 `describe()`,每杯自动报出自己的版本:美式报美式,拿铁多报一句奶泡。
> 豆豆:「调用哪个版本,**运行时**看对象的真实类型决定 —— 这就是多态。」

> **〔3〕** 阿零得意忘形,想把每一杯都强行当高级杯处理:「都是咖啡,怕什么!」抬手就把美式那杯 `(PremiumCoffee)` 一转——
> **〔4〕** 「哐当!」美式那杯当场炸开,弹出 `ClassCastException`。阿零糊一脸咖啡渣。
> 豆豆(叼豆子看戏):「嘴硬。**向上转型**人人有份,**向下转型**得先验明正身。美式压根不是高级杯,你硬塞,它当然翻脸。」

> **〔5〕** 阿零抹脸:「那我咋知道哪杯是高级杯?」
> 豆豆:「转之前先用 `instanceof` 问一句『你到底是不是』,是了再转。**先判类型,再向下转**——这条能救你无数次。」

---

## 三、本话目标

- 理解「父类引用指向子类对象」(向上转型);
- 理解运行时**动态派发**(调用子类覆盖后的方法);
- 用一个 `Coffee[]` 数组统一管理不同子类;
- 认清「字段无多态、静态方法无多态,多态只对实例方法成立」;
- 学会「向下转型前先 `instanceof` 判类型」。

---

## 四、原理图

```text
Coffee c = new PremiumCoffee(...);   引用类型是 Coffee,真实对象是 PremiumCoffee
c.describe();                         调用的是 PremiumCoffee 覆盖后的版本(运行时决定)

现代 instanceof(判类型 + 转型一步到位):
if (c instanceof PremiumCoffee p) {  匹配成功就直接得到已转型的 p
    ... p.getFoam() ...
}
```

---

## 五、代码:统一调度不同咖啡

```java
public class Menu {
    public static void main(String[] args) {
        // 父类引用装子类对象,一个数组混装(数组第一季已学)
        Coffee[] menu = {
            new Coffee("美式", 15.0, 20),
            new PremiumCoffee("燕麦拿铁", 22.0, 8, 3)
        };

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

同一句 `c.describe()`,两种行为 —— 新增一种咖啡子类,这段调度代码**一个字都不用改**。这就是多态的杀伤力:对扩展开放,对修改关闭。

> **🎯 面试直击**:多态对字段和静态方法也生效吗?
> **不**。多态(动态派发)**只对实例方法**成立。**字段**看引用的**编译期类型**——父类引用访问同名字段拿到的是父类那份;**静态方法**绑定在类上、由编译期类型决定,子类同名静态方法只是「隐藏」而非「覆盖」。一句话记牢:**只有实例方法会在运行时按真实类型派发**。追问点:所以别用父类引用去读子类「覆盖」的字段,也别指望 `静态方法` 有多态——它们在编译期就被钉死了。

---

## 六、故意制造一个 Bug

学阿零嘴硬,想对每一杯都按高级杯处理,直接强转所有元素:

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

`ClassCastException` —— 美式的**真实类型**是 `Coffee`,硬转成子类 `PremiumCoffee` 会在**运行时**崩掉(编译期看着是 `Coffee` 转子类,语法上放行,所以这类坑往往躲过编译、跑起来才炸)。向上转型总是安全,**向下转型必须先验明正身**。

> **豆豆锐评**:向上转型是「儿子当爹用」,天然成立、不用检查;向下转型是「把爹硬认成某个儿子」,得先问清楚「你到底是不是这个儿子」。别信「都是咖啡怕什么」——运行时的 `ClassCastException` 可不跟你讲人情。`instanceof` 那一问,就是你的安全带。

---

## 八、修复,并用测试证明

用现代 `instanceof` 模式匹配,先判类型、匹配成功再拿到已转型的 `p`,只对真的高级杯操作:

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

> `getFoam()` 上一话已经加到 `PremiumCoffee` 里,这里直接用。

---

## 九、项目检查点 · 豆豆咖啡站 v1.4

```text
新增:用 Coffee[] 统一调度多种咖啡,靠多态各显其能
已具备:向上转型 / 动态派发 / instanceof 模式匹配安全向下转型
还没有:顾客要用支付宝/微信/现金付款,收银台不想为每种写一套 —— 下一话进接口
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 多态 / 动态派发 | OOP 三大特征之一,面试重头 |
| 字段/静态方法无多态 | 高频陷阱题,专坑「以为一切都多态」 |
| instanceof 模式匹配 | 「Java 新特性」高频 |
| ClassCastException | 向下转型的经典坑 |

---

## 十一、下一话悬念

收银台面对支付宝、微信、现金,总不能写三套 if-else。它需要的只是「一个能 `pay()` 的东西」。

> 下一话《接口合同》:用 `interface PaymentMethod` 定义统一契约,三种付款方式各自实现,收银台只认接口——「积分支付」还会临时插队,现场演示什么叫「加功能不动老代码」。

---

*本话属于连载《从零开始学 Java》。世界观见 `docs/java-comic-academy/handbook.md`;季次地图见 `/java`。*
