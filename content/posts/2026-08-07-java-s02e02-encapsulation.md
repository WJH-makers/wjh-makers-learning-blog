---
title: "《从零开始学 Java》14 · 封装保险柜"
date: 2026-08-07
summary: "coffee.price = -100 竟然合法。把字段设成 private、用 getter/setter 上锁,更本质的收益是——对象一出生就守住『价格永不为负』这条不变量。"
tags: [Java, Java漫画, 封装, private, 阿零与豆豆]
---

# 《从零开始学 Java》14 · 封装保险柜

> 第二季「对象大陆」第 2 话 · 基线 JDK 25 · 承接:上一话字段全公开的 Coffee 对象。

---

## 一、需求:别让外人乱改内部数据

上一话末尾埋了个雷:`coffee.price = -100;`、`coffee.stock = -5;` 全都合法。字段公开,意味着**任何人、在任何地方、都能把对象改成一个根本不该存在的状态**——价格是负数的咖啡,一旦流进结账逻辑,后面全乱套。

豆豆:「你以为封装是『把字段藏起来』?那只是手段。**真正的收益是不变量(invariant)**——让『价格永远 ≥ 0』这条规矩,从对象**出生的那一刻起**就成立,而且**这辈子都破不了**。藏字段只是为了没人能绕过这条规矩。」

---

## 二、漫画 · 走后门被逮

![《从零开始学 Java》s02e02 漫画：阿零与豆豆的本话知识点场景](/comics/java/s02e02-encapsulation.png)

---

## 三、本话目标

- 用 `private` 隐藏字段,把「能不能改」的权力收回对象自己手里;
- 用 getter/setter 提供**受控**访问;
- 在 setter 里做校验,守住**不变量**:非法数据一律拒之门外;
- 踩一次「private 字段类外直接访问」的编译错误。

---

## 四、原理图

```text
private double price;        字段上锁,类外不可直接访问(编译期守卫)
double getPrice() { ... }    读:getter
void setPrice(double p) {    写:setter,在这里守不变量(运行期守卫)
    if (p < 0) throw ...;    ← 非法数据挡在门外,对象状态永远合法
    this.price = p;
}
```

封装 = 隐藏内部细节 + 只暴露安全入口,**目的是让对象无论被谁调用,内部状态始终满足它自己定的规矩**。

---

## 五、代码:给 Coffee 上锁

```java
public class Coffee {
    private String name;
    private double price;
    private int stock;

    Coffee(String name, double price, int stock) {
        this.name = name;
        setPrice(price);     // 关键:构造时也走校验,保证「一出生就合法」
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
        c.setPrice(16.0);          // 合法,走门卫
        System.out.println(c.getName() + " 现价 ¥" + c.getPrice());
    }
}
```

注意构造器里没有直接写 `this.price = price`,而是**转手交给 `setPrice`**——这样「非负」这条规矩在**创建时**就被强制执行,不给非法对象留一秒钟的存在空间。

---

## 六、故意制造一个 Bug

在 `main` 里学阿零走后门,直接改私有字段:

```java
c.price = -100;   // ← 故意:类外访问 private 字段
```

---

## 七、读懂真实报错

编译官当场拦下:

```text
Coffee.java:33: error: price has private access in Coffee
        c.price = -100;
         ^
1 error
```

`price has private access` —— 私有字段类外碰不到,**编译期**就报错,连 JVM 的门都进不去。想改价只能走 `setPrice`,而它会拦住负数(抛 `IllegalArgumentException`)。两道守卫合起来,负价格无论从哪条路都进不来。

> **🎯 面试直击**:封装的意义只是「隐藏字段、加 getter/setter」吗?
> 不止。隐藏字段是**手段**,守住**不变量**才是**目的**——通过把修改收进受控入口,保证对象**任何时刻**的状态都合法(如价格非负、库存非负)。追问点:那种「字段私有、却机械地配一对空 getter/setter 直接暴露」的写法,等于没封装——因为它没有守任何不变量,外部照样能把对象改到非法状态。

---

## 八、修复,并用测试证明

把非法赋值改成走门卫 `c.setPrice(16.0);`,并验证非法值确实被拒:

```java
@Test
void rejects_negative_price() {
    Coffee c = new Coffee("美式", 15.0, 20);
    assertThrows(IllegalArgumentException.class, () -> c.setPrice(-1));
}

@Test
void invariant_holds_from_birth() {
    // 连构造时都挡住非法值:对象根本无法以负价诞生
    assertThrows(IllegalArgumentException.class, () -> new Coffee("坏账", -5, 10));
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v1.2

```text
新增:Coffee 字段私有化;价格/库存的每一次改动(含构造)都必过校验
已具备:private 隐藏 / getter-setter 受控访问 / 不变量守卫(双保险)
还没有:高级咖啡机想复用普通咖啡机的逻辑,又要加新功能 —— 下一话进继承
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 封装 / private / getter-setter | OOP 三大特征之一,必问 |
| 不变量(invariant)守卫 | 区分「真封装」与「机械 getter/setter」的分水岭 |
| setter 校验 | 后端「参数校验」的对象内版本 |

---

## 十一、下一话悬念

咖啡站要上「高级咖啡机」:普通机的功能全都要,还要多一个奶泡功能。总不能把封装好的 Coffee 代码抄一遍。

> 下一话《继承家族》:用 `extends` 让高级咖啡机继承普通咖啡机,`super` 复用父类构造,`@Override` 改写行为——顺便见识 Java 25 给 `super()` 松的一道绑。

---

*本话属于连载《从零开始学 Java》。世界观见 `docs/java-comic-academy/handbook.md`;季次地图见 `/java`。*
