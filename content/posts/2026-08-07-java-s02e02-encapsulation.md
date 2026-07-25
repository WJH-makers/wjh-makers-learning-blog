---
title: "《从零开始学 Java》14 · 封装保险柜"
date: 2026-08-07
summary: "coffee.price = -100 竟然合法。把字段设成 private,用 getter/setter 上锁,在 setter 里挡住非法数据。"
tags: [Java, Java漫画, 封装, private, 阿零与豆豆]
---

# 《从零开始学 Java》14 · 封装保险柜

> 第二季「对象大陆」第 2 话 · 基线 JDK 25 · 承接:字段全公开的 Coffee 对象。

---

## 一、需求:别让外人乱改内部数据

上一话 `coffee.price = -100;`、`coffee.stock = -5;` 全都合法。对象的内部状态必须**受保护**,只能通过受控的入口修改。

---

## 二、漫画

> **〔1〕** Coffee 对象敞着门,路人随手把价格改成负数。
> 豆豆:「字段公开 = 保险柜不上锁。」

> **〔2〕** 豆豆给字段挂上 `private` 锁,只留一个 `setPrice` 的窗口,窗口里站着门卫:「负价格?不收。」

---

## 三、本话目标

- 用 `private` 隐藏字段;
- 用 getter/setter 提供受控访问;
- 在 setter 里做校验,拒绝非法数据;
- 踩一次「private 字段类外直接访问」的编译错误。

---

## 四、原理图

```text
private double price;        字段上锁,类外不可直接访问
double getPrice() { ... }    读:getter
void setPrice(double p) {    写:setter,在这里校验
    if (p < 0) throw ...;
    this.price = p;
}
```

封装 = 隐藏内部细节,只暴露安全的操作入口。

---

## 五、代码:给 Coffee 上锁

```java
public class Coffee {
    private String name;
    private double price;
    private int stock;

    Coffee(String name, double price, int stock) {
        this.name = name;
        setPrice(price);     // 构造时也走校验
        setStock(stock);
    }

    double getPrice() { return price; }

    void setPrice(double price) {
        if (price < 0) throw new IllegalArgumentException("价格不能为负:" + price);
        this.price = price;
    }

    int getStock() { return stock; }

    void setStock(int stock) {
        if (stock < 0) throw new IllegalArgumentException("库存不能为负:" + stock);
        this.stock = stock;
    }

    String getName() { return name; }

    public static void main(String[] args) {
        Coffee c = new Coffee("美式", 15.0, 20);
        c.setPrice(16.0);          // 合法
        System.out.println(c.getName() + " 现价 ¥" + c.getPrice());
    }
}
```

---

## 六、故意制造一个 Bug

在 `main` 里直接改私有字段:

```java
c.price = -100;   // ← 故意:类外访问 private 字段
```

---

## 七、读懂真实报错

```text
Coffee.java:33: error: price has private access in Coffee
        c.price = -100;
         ^
1 error
```

`price has private access` —— 编译官直接拦下:私有字段类外碰不到。想改价只能走 `setPrice`,而它会挡住负数(抛 `IllegalArgumentException`)。保险柜生效了。

---

## 八、修复,并用测试证明

改用 `c.setPrice(16.0);`,并验证非法值被拒:

```java
@Test
void rejects_negative_price() {
    Coffee c = new Coffee("美式", 15.0, 20);
    assertThrows(IllegalArgumentException.class, () -> c.setPrice(-1));
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v1.2

```text
新增:Coffee 字段私有化,价格/库存改动必过校验
还没有:高级咖啡机想复用普通咖啡机的逻辑,又要加新功能 —— 下一话进继承
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 封装 / private / getter-setter | OOP 三大特征之一,必问 |
| setter 校验 | 后端「参数校验」的对象内版本 |

---

## 十一、下一话悬念

咖啡站要上「高级咖啡机」:普通机的功能全都要,还要多一个奶泡功能。总不能把代码抄一遍。

> 下一话《继承家族》:用 `extends` 让高级咖啡机继承普通咖啡机,`super` 复用父类构造,`@Override` 改写行为。
