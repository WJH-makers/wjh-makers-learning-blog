---
title: "《从零开始学 Java》15 · 继承家族"
date: 2026-08-08
summary: "高级咖啡机要复用普通机的全部功能再加奶泡。用 extends 继承、super 复用父类构造、@Override 改写行为。"
tags: [Java, Java漫画, 继承, extends, 阿零与豆豆]
---

# 《从零开始学 Java》15 · 继承家族

> 第二季「对象大陆」第 3 话 · 基线 JDK 25 · 承接:已封装的 Coffee 对象。

---

## 一、需求:别把父类代码抄一遍

「高级咖啡机」要有普通 `Coffee` 的全部字段和方法,只多一个「奶泡等级」。复制粘贴会制造两份要同步维护的代码。

---

## 二、漫画

> **〔1〕** 家谱图:`Coffee` 是父亲,`PremiumCoffee` 是儿子,继承了父亲的一切。
> 豆豆:「`extends` = 我拥有父类的全部,再加自己的新东西。」

> **〔2〕** 儿子想改写父亲的 `describe`,豆豆递上 `@Override` 印章:「盖了章,编译官才帮你确认你真的在改写父类方法。」

---

## 三、本话目标

- 用 `extends` 继承字段与方法;
- 用 `super(...)` 调用父类构造器;
- 用 `@Override` 改写(覆盖)父类方法;
- 踩一次「子类构造器没调 super」的编译错误。

---

## 四、原理图

```text
class PremiumCoffee extends Coffee {   继承 Coffee 的全部
    private int foam;                   自己新增的字段
    PremiumCoffee(...) {
        super(name, price, stock);      先构造父类的部分
        this.foam = foam;
    }
    @Override String describe() { ... } 改写父类行为
}
```

---

## 五、代码:高级咖啡机

```java
public class PremiumCoffee extends Coffee {
    private int foam;   // 奶泡等级 1~3

    PremiumCoffee(String name, double price, int stock, int foam) {
        super(name, price, stock);   // 复用父类构造,必须在第一行
        this.foam = foam;
    }

    @Override
    String describe() {
        return super.describe() + " · 奶泡 " + foam + " 级";   // super. 调父类版本再加料
    }

    public static void main(String[] args) {
        PremiumCoffee p = new PremiumCoffee("燕麦拿铁", 22.0, 8, 3);
        System.out.println(p.describe());
    }
}
```

输出:

```text
燕麦拿铁 ¥22.0(库存 8) · 奶泡 3 级
```

`super.describe()` 复用了父类的描述,子类只在后面加自己的部分 —— 零复制。

---

## 六、故意制造一个 Bug

把 `super(...)` 那一行删掉:

```java
PremiumCoffee(String name, double price, int stock, int foam) {
    this.foam = foam;    // ← 故意:没有先调 super
}
```

---

## 七、读懂真实报错

```text
PremiumCoffee.java:6: error: constructor Coffee in class Coffee cannot be applied to given types;
  required: String,double,int
  found:    no arguments
```

父类 `Coffee` 没有无参构造器,子类构造器又没显式 `super(...)`,编译器试图自动插入 `super()`(无参)却找不到 —— 于是报错。**子类必须先把父类那部分构造好**。

---

## 八、修复,并用测试证明

补回 `super(name, price, stock);`:

```java
@Test
void premium_extends_description() {
    PremiumCoffee p = new PremiumCoffee("燕麦拿铁", 22.0, 8, 3);
    assertEquals("燕麦拿铁 ¥22.0(库存 8) · 奶泡 3 级", p.describe());
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v1.3

```text
新增:PremiumCoffee 继承 Coffee,复用+扩展,零复制
还没有:想用一个列表统一管理普通杯和高级杯,并各自表现 —— 下一话进多态
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 继承 / super / @Override | OOP 必问;也牵出「组合优于继承」的进阶话题 |
| 构造器链 | 面试:子类实例化顺序 |

---

## 十一、下一话悬念

菜单里现在混着普通杯和高级杯,想「遍历菜单,每杯各自描述自己」。

> 下一话《多态调度中心》:父类引用指向子类对象,`describe()` 在运行时自动派发到正确的版本。
