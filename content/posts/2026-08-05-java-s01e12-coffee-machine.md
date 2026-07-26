---
title: "《从零开始学 Java》12 · 控制台咖啡机(第一季大结局)"
date: 2026-08-05
summary: "菜单、点单、算价、判断、出杯、小票、异常兜底全部合体,交付第一季完整项目 v1,并配一套 JUnit 测试。第一位真实顾客的一通乱输入,成了它的成人礼。"
tags: [Java, Java漫画, 项目实战, 控制台程序, 阿零与豆豆]
---

# 《从零开始学 Java》12 · 控制台咖啡机(第一季大结局)

> 第一季「点火篇」第 12 话 · 基线 JDK 25 · 项目检查点:控制台咖啡机 v1。
> 长期项目:**豆豆咖啡站**。十二话走到这里,它第一次成为一台能真正交付的机器。

---

## 一、需求:把十一话拼成一台能用的机器

变量、运算、判断、switch、循环、数组、方法、输入、字符串、排障——十一话的能力,这一话全部整合成一个**真正能交互运行**的控制台咖啡机:开机循环显示菜单,顾客反复点单,出错不崩、给提示,输 0 离店。

---

## 二、漫画 · 第一位真实顾客

![《从零开始学 Java》12 · 控制台咖啡机(第一季大结局) —— 阿零与豆豆六格漫画](/comics/java/s01e12-coffee-machine.png)


> [!文字版]
> **〔1〕** 阿零合上最后一块面板,咖啡站的灯依次亮起,菜单在屏幕上滚动。
> 阿零:「它……真的能用了。菜单、点单、算价、小票,全接上了!」
>
> **〔2〕** 门铃"叮咚"——**第一位真实顾客**推门进来,一屁股坐到键盘前,手指乱按:编号栏敲了个 `k`,回车。
> 阿零(得意):「放心,我加了 `try`,不会崩——」
>
> **〔3〕** 屏幕突然疯了:「下单失败」「下单失败」「下单失败」……红字如瀑布狂刷,根本停不下来。顾客吓得后仰。
> 阿零(脸白):「它、它自己刷疯了?我明明 catch 住了啊!」
>
> **〔4〕** 豆豆坐在角落,没动,只抬了下眼皮:「五步法。观察现象——它在**无限重试**同一个坏输入。为什么 catch 了还停不下?」
>
> **〔5〕** 阿零盯着缓冲区,一拍大腿——独立想通了:「`nextInt()` 抛异常时**没吃掉**那个 `k`!它还赖在输入缓冲里,下一轮 `nextInt()` 又读到它、又抛……死循环!」他手动在 `catch` 里补上一句 `sc.nextLine()`,把坏 token 清干净。
> 阿零:「清掉缓冲——重跑!」瀑布戛然而止,机器稳稳打出「下单失败,请重新输入」。
>
> **〔6〕** 顾客这次老实敲了「1」「1」「20」,小票"嗤"地吐出。豆豆终于站起来,拍拍阿零:「看见没?你自己按住了一台差点崩掉的机器。第一季,你真的会写 Java 了。」
---

## 三、本话目标

- 把前十一话整合成一个连贯、能持续交互的程序;
- 用循环支撑「持续点单」,用 `try/catch` 兜住一切乱输入;
- 看懂 Scanner 缓冲死循环的成因与根治;
- 交付带测试的第一季项目 v1,并逐段走查、枚举边界。

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
            try {
                int choice = sc.nextInt();   // 放进 try:顾客敲字母也不会整个程序崩溃
                if (choice == 0) { System.out.println("欢迎再来 ☕"); break; }
                System.out.print("几杯:");
                int qty = sc.nextInt();
                System.out.print("付款:");
                double paid = sc.nextDouble();
                System.out.print(receipt(choice, qty, paid));
            } catch (RuntimeException e) {
                System.out.println("下单失败:" + e.getMessage());   // 兜住乱输入/余额不足
                sc.nextLine();   // ★ 清掉缓冲里残留的坏 token,否则下一轮 nextInt 会反复失败、死循环刷屏
            }
        }
    }
}
```

> **豆豆锐评 · 两处不能省的细节,栽过的人都懂**
> ① 读 `choice` 的 `nextInt()` **必须**在 `try` 里 —— 顾客第一步就敲字母,它直接抛 `InputMismatchException`;放在 `try` 外,就不是"下单失败",而是**整个程序当场崩溃**。
> ② `catch` 里那句 `sc.nextLine()` **不能删** —— `nextInt()` 抛异常时**不会吃掉**那个坏 token,它还赖在输入缓冲里。不清掉,下一轮 `nextInt()` 又读到它、又抛……**死循环刷「下单失败」**。这是几乎每个人写第一个交互程序都会踩的坑。

> **依赖致意**:这里的 `try/catch` 只当**「出错不崩、给个提示」的护栏**用——它拦住一切 `RuntimeException`,把崩溃变成一行友好提示。至于异常有几个家族、`checked` 与 `unchecked` 怎么分、`finally` 与 `try-with-resources` 怎么用,是**第三季「异常季」专门拆解**的大题。本话先会用这道护栏,原理留到那时讲透。

---

## 五、逐段走查(读懂每一块为什么在这)

```text
MENU / PRICES  —— 两个 static final 数组:菜单和价格,一一对应(编号 - 1 = 下标)
priceOf()      —— 先做上下界校验再取价,把「越界」挡在取数组之前
receipt()      —— 复用 priceOf 算总价,付款不足就抛异常,否则用文本块 + formatted 出小票
main()         —— while(true) 撑起「持续点单」,输 0 才 break;
                  一次点单的三步读取全包在 try 里,任何一步出错都落到同一张「护栏网」
catch          —— 统一兜 RuntimeException(它是 IllegalArgument/IllegalState/InputMismatch 的共同祖先)
                  + sc.nextLine() 清缓冲,是这台机器能「反复接客」而不刷屏的关键
```

一条设计原则贯穿始终:**校验前置、异常兜底、动作复用**——正是第八话「把步骤收进方法」的直接兑现。

---

## 六、故意制造一个 Bug

把库存边界判断写反,只防上界、漏了下界:

```java
if (choice < 1 || choice > MENU.length)   // 正确:双侧都防
// 若写成只判上界:
if (choice > MENU.length)                 // ← 故意:负数/0 漏防
```

传入 `choice = -1` 时,`PRICES[choice - 1]` → `PRICES[-2]`,直接 `ArrayIndexOutOfBoundsException`。**边界判断少一侧**,是最常见的线上事故来源之一——修回双侧判断即可。这也呼应上一话的教训:边界,是逻辑 Bug 最爱藏身的地方。

---

## 七、边界枚举:这台机器扛得住哪些乱输入

工程交付前,把「顾客能干出的坏事」列全,逐条确认有没有兜住:

| 顾客输入 | 机器反应 | 靠什么兜住 |
|---|---|---|
| 编号敲 `abc` | `nextInt` 抛 `InputMismatchException` → 提示「下单失败」并继续 | `try` + `catch` 里 `sc.nextLine()` 清缓冲 |
| 编号敲 `9`(超范围) | `priceOf` 抛 `IllegalArgumentException` → 提示后继续 | `priceOf` 的上下界校验 |
| 编号敲 `0` | 打印「欢迎再来」正常离店 | `if (choice == 0) break;` |
| 付款少于总价 | `receipt` 抛 `IllegalStateException` → 提示「余额不足…」 | `paid < total` 判断 |
| 杯数处敲字母 | 同样抛异常落进 catch,清缓冲后重来 | 三步读取全在同一个 `try` 内 |
| 编号敲 `-1`(若漏下界) | 会 `ArrayIndexOutOfBounds` —— **正是第六节的 Bug** | 双侧边界校验 |

> **豆豆锐评**:能把这张表写全的人,和「只测了一遍正常流程就说做完了」的人,差的就是**健壮性意识**。真实顾客永远比你想象的更有创造力。

---

## 八、给项目配测试

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
        assertThrows(IllegalArgumentException.class, () -> CoffeeMachine.priceOf(0));  // 下界
        assertThrows(IllegalArgumentException.class, () -> CoffeeMachine.priceOf(9));  // 上界
    }

    @Test
    void reject_insufficient_payment() {
        assertThrows(IllegalStateException.class,
            () -> CoffeeMachine.receipt(1, 3, 10.0));   // 45 元只付 10
    }
}
```

注意测的都是 `priceOf` / `receipt` 这些**纯逻辑方法**——不碰键盘,所以能被自动验证;交互部分交给上面那张边界表人工过一遍。这正是全季反复强调的:**把逻辑从 IO 里剥出来,才测得动**。

---

## 九、项目检查点 · 豆豆咖啡站 v1 🎉

```text
交付:一个可交互运行、带异常兜底、带测试的控制台咖啡机
能力:菜单循环 / 点单 / 算价 / 边界校验 / 小票 / 出错不崩
局限:所有数据散在一堆数组和 static 方法里,咖啡的「名字+价格+库存」没绑在一起
       —— 这正是第二季要解决的:用「对象」把它们打包
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 整合一个可运行的小程序 | 简历第一个「作品」 |
| 异常兜底 / 边界处理 | 代码健壮性,面试与 Code Review 都盯 |
| Scanner 缓冲死循环的根治 | 「你怎么排查一个死循环」的真实案例 |
| 给项目写测试 | 「熟悉单元测试」的真实证据 |

---

## 十一、第一季完 · 下一季预告

第一季,阿零从一行 `Hello` 走到了一台能用、能扛乱输入、有测试兜底的咖啡机;更重要的是,他从「事事问豆豆」长到了「自己按住一台差点崩掉的机器」。靠的,是「一堆变量 + 一堆方法」。

可当咖啡的种类越来越多、每种都有自己的名字、价格、库存和做法时,散在数组里的数据会迅速失控——`MENU[i]` 和 `PRICES[i]` 全靠下标「暗中约定」对齐,一旦错位就是灾难。

> 第二季《对象大陆》:阿零学会用 `class` 把「一杯咖啡」的名字、价格、库存**打包成一个对象**,再用集合管理成百上千的订单——这才是 Java 真正的灵魂。

*完整季次地图见 [/java](/java);世界观设定见仓库 `docs/java-comic-academy/handbook.md`。*
