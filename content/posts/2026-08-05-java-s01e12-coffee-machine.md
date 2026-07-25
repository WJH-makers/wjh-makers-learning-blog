---
title: "《从零开始学 Java》12 · 控制台咖啡机(第一季大结局)"
date: 2026-08-05
summary: "菜单、点单、算价、判断、出杯、小票、异常处理全部合体,交付第一季完整项目 v1,并配一套 JUnit 测试。"
tags: [Java, Java漫画, 项目实战, 控制台程序, 阿零与豆豆]
---

# 《从零开始学 Java》12 · 控制台咖啡机(第一季大结局)

> 第一季「点火篇」第 12 话 · 基线 JDK 25 · 项目检查点:控制台咖啡机 v1。

---

## 一、需求:把十一话拼成一台能用的机器

变量、运算、判断、switch、循环、数组、方法、输入、字符串、排障 —— 十一话的能力,这一话全部整合成一个**真正能交互运行**的控制台咖啡机。

---

## 二、漫画

> **〔1〕** 阿零合上最后一块面板,咖啡站的灯依次亮起,菜单在屏幕上滚动。
> 阿零:「它……真的能用了。」

> **〔2〕** 豆豆:「记住此刻它的样子。第二季,我们要把这一堆散代码,重构成一个个**对象**。」

---

## 三、本话目标

- 把前十一话整合成一个连贯程序;
- 用循环支撑「持续点单」,用异常处理兜住乱输入;
- 交付带测试的第一季项目 v1。

---

## 四、完整代码:控制台咖啡机 v1

```java
import java.util.Scanner;

public class CoffeeMachine {
    static final String[] MENU = {"美式", "拿铁", "卡布奇诺"};
    static final double[] PRICES = {15.0, 18.0, 20.0};

    static double priceOf(int choice) {
        if (choice < 1 || choice > MENU.length)
            throw new IllegalArgumentException("没有编号 " + choice);
        return PRICES[choice - 1];
    }

    static String receipt(int choice, int qty, double paid) {
        double total = priceOf(choice) * qty;
        if (paid < total)
            throw new IllegalStateException("余额不足,还差 ¥%.2f".formatted(total - paid));
        return """
               —— 豆豆咖啡站 ——
               %s × %d 杯
               应付 ¥%.2f · 找零 ¥%.2f
               ——————————————
               """.formatted(MENU[choice - 1], qty, total, paid - total);
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println("欢迎光临豆豆咖啡站(输入 0 离店)");
        while (true) {
            for (int i = 0; i < MENU.length; i++)
                System.out.println((i + 1) + ". " + MENU[i] + " ¥" + PRICES[i]);
            System.out.print("请输入编号:");
            int choice = sc.nextInt();
            if (choice == 0) { System.out.println("欢迎再来 ☕"); break; }
            try {
                System.out.print("几杯:");
                int qty = sc.nextInt();
                System.out.print("付款:");
                double paid = sc.nextDouble();
                System.out.print(receipt(choice, qty, paid));
            } catch (RuntimeException e) {
                System.out.println("下单失败:" + e.getMessage());   // 兜住乱输入/余额不足
            }
        }
    }
}
```

---

## 五、故意制造一个 Bug

把库存边界判断写反,允许了编号 0 以外的越界:

```java
if (choice < 1 || choice > MENU.length)   // 正确
// 若写成 choice > MENU.length 少了下界:
if (choice > MENU.length)                 // ← 故意:负数/0 漏防
```

传入 `choice = -1` 时,`PRICES[choice - 1]` → `PRICES[-2]` 直接 `ArrayIndexOutOfBoundsException`。**边界判断少一侧**是最常见的线上事故来源之一。修回双侧判断即可。

---

## 六、给项目配测试

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CoffeeMachineTest {
    @Test
    void price_by_menu() {
        assertEquals(15.0, CoffeeMachine.priceOf(1));
        assertEquals(20.0, CoffeeMachine.priceOf(3));
    }

    @Test
    void reject_out_of_range() {
        assertThrows(IllegalArgumentException.class, () -> CoffeeMachine.priceOf(0));
        assertThrows(IllegalArgumentException.class, () -> CoffeeMachine.priceOf(9));
    }

    @Test
    void reject_insufficient_payment() {
        assertThrows(IllegalStateException.class,
            () -> CoffeeMachine.receipt(1, 3, 10.0));   // 45 元只付 10
    }
}
```

---

## 七、项目检查点 · 豆豆咖啡站 v1 🎉

```text
交付:一个可交互运行、带异常兜底、带测试的控制台咖啡机
局限:所有数据在一堆数组和散方法里,咖啡的"名字+价格+库存"没有绑在一起
        —— 这正是第二季要解决的:用"对象"把它们打包
```

---

## 八、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 整合一个可运行的小程序 | 简历第一个「作品」 |
| 异常兜底 / 边界处理 | 代码健壮性,面试与 CR 都看 |
| 给项目写测试 | 「熟悉单元测试」的真实证据 |

---

## 九、第一季完 · 下一季预告

第一季你从一行 `Hello` 走到了一台能用的咖啡机,靠的是「一堆变量 + 一堆方法」。当咖啡的种类越来越多、每种都有自己的名字、价格、库存和做法时,散装代码会迅速失控。

> 第二季《对象大陆》:阿零学会用 `class` 把「一杯咖啡」打包成对象,用集合管理成百上千的订单 —— 这才是 Java 真正的灵魂。

*完整季次地图见 [/java](/java);世界观设定见仓库 `docs/java-comic-academy/handbook.md`。*
