---
title: "《从零开始学 Java》08 · 制作步骤:方法"
date: 2026-08-01
summary: "出杯代码到处复制,改一处要改十处。把步骤封装成方法,一处定义处处调用,理解参数、返回值与返回类型。"
tags: [Java, Java漫画, 方法, 函数, 阿零与豆豆]
---

# 《从零开始学 Java》08 · 制作步骤:方法

> 第一季「点火篇」第 8 话 · 承接:菜单已用数组管理的咖啡站。

---

## 一、需求:别再复制粘贴

「算总价」「判断够不够钱」「出杯」这些逻辑散落在 `main` 各处,重复且难改。把它们收进**方法**:定义一次,到处调用。

---

## 二、漫画

> **〔1〕** 一台贴着 `makeCoffee(名称, 杯数)` 的机器,投入原料(参数),吐出成品(返回值)。
> 豆豆:「方法 = 一台可复用的机器:**参数**是入口,**返回值**是出口。」

> **〔2〕** 阿零造了台声明「会吐出 `double`」的机器,却忘了放传送带(没 `return`)。
> 豆豆:「声明了返回类型,就必须真的 `return` 一个值。」

---

## 三、本话目标

- 定义带参数、带返回值的方法;
- 理解返回类型与 `return`;
- 用 `void` 表示「只做事、不返回」;
- 踩一次「缺少 return 语句」的编译错误。

---

## 四、原理图

```text
返回类型 方法名(参数类型 参数名, ...) {
    ...
    return 值;      // 返回类型不是 void 时必须 return
}

void 方法:只执行动作,不返回值。
```

---

## 五、代码:把步骤收进方法

```java
public class Cafe {
    // 有返回值:算总价
    static double total(double price, int qty) {
        return price * qty;
    }

    // 有返回值:够不够付
    static boolean canAfford(double paid, double total) {
        return paid >= total;
    }

    // void:只负责出杯这个动作
    static void serve(String name, int qty) {
        for (int i = 1; i <= qty; i++) {
            System.out.println("第 " + i + " 杯" + name + " ☕");
        }
    }

    public static void main(String[] args) {
        double t = total(15.0, 3);
        if (canAfford(50.0, t)) serve("美式", 3);
    }
}
```

---

## 六、故意制造一个 Bug

给 `total` 声明了 `double` 返回类型,却把 `return` 删了:

```java
static double total(double price, int qty) {
    double t = price * qty;
    // return t;   ← 故意删掉
}
```

---

## 七、读懂真实报错

```text
Cafe.java:5: error: missing return statement
    }
    ^
1 error
```

`missing return statement` —— 方法承诺「吐出一个 `double`」,却存在一条没 `return` 就走到底的路径。编译官要求:**非 void 方法的每条路径都必须 return**。

---

## 八、修复,并用测试证明

补回 `return t;`。方法天然好测:

```java
@Test
void total_and_afford() {
    assertEquals(45.0, Cafe.total(15.0, 3));
    assertTrue(Cafe.canAfford(50.0, 45.0));
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v0.8

```text
新增:算价 / 判断 / 出杯 都收进了可复用方法,main 变清爽
还没有:一切都写死在代码里,顾客没法自己输入 —— 下一话让顾客开口
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 方法 / 参数 / 返回值 | Java 基础;也是「值传递」辨析的前提 |
| void vs 返回类型 | 面试:方法签名与重载 |

---

## 十一、下一话悬念

咖啡站现在自说自话,顾客点什么全写死在代码里。

> 下一话《顾客输入:Scanner》:用 `Scanner` 读取键盘输入,让顾客自己点单,咖啡站第一次变成交互式程序。
