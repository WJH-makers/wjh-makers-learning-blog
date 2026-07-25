---
title: "《从零开始学 Java》09 · 顾客输入:Scanner"
date: 2026-08-02
summary: "咖啡站自说自话,顾客点什么全写死。用 Scanner 读键盘输入变成交互式,并踩一次输入类型不匹配的异常。"
tags: [Java, Java漫画, Scanner, 输入, 阿零与豆豆]
---

# 《从零开始学 Java》09 · 顾客输入:Scanner

> 第一季「点火篇」第 9 话 · 基线 JDK 25 · 承接:逻辑已收进方法的咖啡站。

---

## 一、需求:让顾客自己点单

现在点什么都写死在代码里。得让程序**读取键盘输入**,顾客敲编号,咖啡站现场响应。

---

## 二、漫画

> **〔1〕** 柜台上出现一个麦克风,标着 `Scanner`。
> 豆豆:「`Scanner` 是听筒,`nextInt()` 听一个整数,`nextLine()` 听一整行。」

> **〔2〕** 阿零让顾客输编号,顾客却敲了「abc」。听筒「滋啦」一声报错。
> 豆豆:「让它读整数,你却喂了字母 —— 类型对不上。」

---

## 三、本话目标

- 用 `Scanner` 读取整数和字符串;
- 把输入接到上一话的报价方法上;
- 踩一次 `InputMismatchException`;
- 认识最新 JDK 的极简输入 `IO.readln`。

---

## 四、原理图

```text
Scanner sc = new Scanner(System.in);
int n     = sc.nextInt();     // 读一个整数
String s  = sc.nextLine();    // 读一整行

最新 JDK(25):也可 String s = IO.readln("提示:");  —— 面向初学者的极简入口
```

---

## 五、代码:交互式点单

```java
import java.util.Scanner;

public class Cafe {
    static double priceOf(int choice) {
        return switch (choice) {
            case 1 -> 15.0;
            case 2 -> 18.0;
            case 3 -> 20.0;
            default -> throw new IllegalArgumentException("没有编号 " + choice);
        };
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("请输入咖啡编号(1 美式 / 2 拿铁 / 3 卡布奇诺):");
        int choice = sc.nextInt();
        System.out.println("你点了编号 " + choice + ",¥" + priceOf(choice));
    }
}
```

---

## 六、故意制造一个 Bug

运行后,在「请输入编号」时敲 `abc` 再回车:

---

## 七、读懂真实报错

```text
Exception in thread "main" java.util.InputMismatchException
        at java.base/java.util.Scanner.throwFor(Scanner.java:947)
        at java.base/java.util.Scanner.next(Scanner.java:1602)
        at java.base/java.util.Scanner.nextInt(Scanner.java:2267)
        at Cafe.main(Cafe.java:16)
```

`InputMismatchException` —— `nextInt()` 想要整数,收到的却是字母。真实程序里,用户乱输入是常态,这正是后面几话「异常处理 / 参数校验」要解决的问题;现在先学会**认出这个异常**。

---

## 八、修复,并用测试证明

先用 `hasNextInt()` 做最基础的防守,把「读取合法编号」抽成可测的纯逻辑:

```java
static int parseChoice(String raw) {
    int c = Integer.parseInt(raw.trim());
    if (c < 1 || c > 3) throw new IllegalArgumentException("编号需在 1~3");
    return c;
}
```

```java
@Test
void parses_valid_choice() {
    assertEquals(2, Cafe.parseChoice(" 2 "));
    assertThrows(IllegalArgumentException.class, () -> Cafe.parseChoice("9"));
}
```

> 把「读输入」和「解析逻辑」分开,逻辑就能脱离键盘被测试 —— 这是可测试代码的第一课。

---

## 九、项目检查点 · 豆豆咖啡站 v0.9

```text
新增:顾客可用键盘现场点单,程序第一次变成交互式
还没有:带名字和备注的订单、一张像样的小票 —— 下一话进字符串王国
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 控制台 IO / Scanner | Java 基础 |
| 输入校验意识 | 后端「参数校验」的雏形 |

---

## 十一、下一话悬念

想在小票上写「张三 的 美式(少冰)」,还想把好几行拼成一张完整小票。

> 下一话《名称与备注:String》:String 为什么不可变、`==` 和 `equals` 的区别、用 `StringBuilder` 和文本块拼小票。
