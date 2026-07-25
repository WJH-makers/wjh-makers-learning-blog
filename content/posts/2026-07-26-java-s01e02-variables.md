---
title: "《从零开始学 Java》02 · 变量仓库"
date: 2026-07-26
summary: "咖啡站记不住任何东西。走进变量仓库,用 8 种基本类型给价格、库存、营业状态各找一个盒子。"
tags: [Java, Java漫画, 变量, 基本类型, 阿零与豆豆]
---

# 《从零开始学 Java》02 · 变量仓库

> 第一季「点火篇」第 2 话 · 承接上一话:能开口、但记不住任何东西的咖啡站。

---

## 一、需求:让咖啡站记住价格和库存

上一话咖啡站能说「营业中」,可顾客问「美式多少钱」,它答不上来 —— 价格、库存根本没地方存。

豆豆:「要记住东西,先得有**盒子**。在 Java 里,盒子叫**变量**。」

---

## 二、漫画

> **〔1〕** 一间仓库,墙上一排排贴着标签的盒子:`int`、`double`、`boolean`……
> 阿零:「为什么盒子还分种类?」

> **〔2〕** 豆豆拎起两个盒子:「整数装 `int`,带小数的钱装 `double`。**盒子的标签(类型)决定它能装什么**,装错会被编译官当场拦下。」

> **〔3〕** 阿零把 `15.0` 硬塞进 `int` 盒子,盒子「啪」地弹开。
> 编译官(严肃):「`double` 装不进 `int`,会丢小数。」

---

## 三、本话目标

- 认识变量:声明 = 开一个带类型标签的盒子;
- 记住 Java 的 8 种基本类型各装什么;
- 用变量存下咖啡站的价格、库存、营业状态;
- 踩一次「类型装错」的编译错误。

---

## 四、原理图:8 种基本类型

```text
整数   byte(1字节) short(2) int(4,最常用) long(8,后缀 L)
小数   float(4,后缀 f) double(8,最常用)
字符   char(单个字符,单引号 '美')
真假   boolean(true / false)
```

一句话:**类型标签一旦贴上,盒子只能装对应的东西**;编译官在编译期就按标签检查。

---

## 五、代码:咖啡站的第一批变量

```java
public class Cafe {
    public static void main(String[] args) {
        String name = "美式";      // 名称(String 不是基本类型,是引用类型,后面细讲)
        double price = 15.0;        // 单价(元),有小数用 double
        int stock = 20;             // 库存(杯),整数用 int
        boolean open = true;        // 是否营业

        System.out.println(name + " ¥" + price + " · 库存 " + stock + " · 营业:" + open);
    }
}
```

输出:

```text
美式 ¥15.0 · 库存 20 · 营业:true
```

---

## 六、故意制造一个 Bug

豆豆:「把价格的盒子标签改成 `int` 试试。」

```java
int price = 15.0;   // ← 故意:用整数盒子装小数
```

---

## 七、读懂真实报错

```text
Cafe.java:4: error: incompatible types: possible lossy conversion from double to int
        int price = 15.0;
                    ^
1 error
```

`possible lossy conversion from double to int` —— 把 `double` 塞进 `int` 会**丢掉小数**,编译官不允许这种静默损失。价格必须能带小数,所以盒子得是 `double`。

---

## 八、修复,并用测试证明

改回 `double price = 15.0;`。把「美式单价」抽成方法,交给 JUnit 钉死:

```java
static double americanoPrice() {
    return 15.0;
}
```

```java
@Test
void americano_should_be_15() {
    assertEquals(15.0, Cafe.americanoPrice());
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v0.2

```text
新增:能记住 名称 / 单价 / 库存 / 营业状态 四个变量
还没有:根据杯数算总价 —— 下一话进运算街
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 8 种基本类型 | 「Java 基础」第一考点 |
| 类型与隐式转换 | 面试高频:`int`/`long`/`double` 溢出与精度 |

---

## 十一、下一话悬念

价格记住了,可顾客要买 3 杯,咖啡站还是算不出总价。

> 下一话《咖啡价格计算器》:阿零走进运算街,`+ - * / %` 一字排开 —— 以及那个坑了无数新人的「整数除法」陷阱。
