---
title: "《从零开始学 Java》09 · 顾客输入:Scanner"
date: 2026-08-02
summary: "咖啡站自说自话,顾客点什么全写死。用 Scanner 读键盘输入变成交互式,并踩下几乎人人中招的坑:nextInt() 后紧跟 nextLine() 读到一个空串。"
tags: [Java, Java漫画, Scanner, 输入, 阿零与豆豆]
---

# 《从零开始学 Java》09 · 顾客输入:Scanner

> 第一季「点火篇」第 9 话 · 基线 JDK 25 · 承接:逻辑已收进方法的咖啡站。
> 长期项目:**豆豆咖啡站**。本话给柜台架上一支听筒,让顾客第一次能开口点单。

---

## 一、需求:让顾客自己点单

上一话把算价、判断、出杯都收进了方法,可传给方法的参数还是程序员写死的——`total(15.0, 3)` 那个 `3` 是替顾客拍的板。真开门做生意,得让程序**读取键盘输入**:顾客敲编号,咖啡站现场响应。

Java 读控制台输入,最顺手的入门工具是 `java.util.Scanner`。它像一支听筒,能从 `System.in`(标准输入,通常就是键盘)里,按你指定的类型一段段「听」出内容。

---

## 二、漫画 · 那声滋啦

![《从零开始学 Java》09 · 顾客输入:Scanner —— 阿零与豆豆六格漫画](/comics/java/s01e09-scanner.png)


> [!文字版]
> **〔1〕** 柜台上"咚"地升起一支麦克风,机身标着 `Scanner`,接线插进标着 `System.in` 的插座。
> 豆豆:「这是听筒。`nextInt()` 让它听**一个整数**,`nextLine()` 让它听**一整行**。你想听什么,得先说清楚。」
>
> **〔2〕** 第一位顾客走近,阿零喊:「请输入编号!」顾客却对着麦克风慢悠悠敲下——`abc`。
> 阿零:「……他怎么不按套路出牌?」
>
> **〔3〕** 听筒"滋啦——"一声爆响,火花四溅,整台机器黑屏。红字弹出:`InputMismatchException`。
> 阿零(捂脸):「我让它听整数,他喂了字母,它就……炸了?」
>
> **〔4〕** 豆豆叼着豆子,盯着那行红字,意味深长:「记住这声**滋啦**。今天它把程序掀翻,你只能认得它;可它不会是最后一次——第三季『异常季』,咱们专门回来驯服它。」
>
> **〔5〕** 阿零重启机器,自作聪明加了一步:先 `nextInt()` 读编号,再 `nextLine()` 读一句备注。结果备注栏**空空如也**,顾客明明打了字。
> 阿零:「这回没炸,可它把顾客的备注**吃了**?!」
>
> **〔6〕** 豆豆(叉腰,难得没吐槽):「没吃。是你没搞懂听筒是怎么**换气**的——这个坑,比刚才那声滋啦更常害人。坐下,我给你拆开看。」
---

## 三、本话目标

- 用 `Scanner` 读取整数和整行文本,搭出交互式点单;
- 把输入接到上一话的报价方法上;
- **重点**:看穿 `nextInt()` 紧跟 `nextLine()` 读到空串的经典坑;
- 认得 `abc` 触发的 `InputMismatchException`(异常季再深入驯服);
- 把「读输入」和「解析逻辑」拆开,让逻辑可测。

---

## 四、原理图:听筒是怎么读的

```text
Scanner sc = new Scanner(System.in);   // 接上键盘这根输入流

int    n = sc.nextInt();     // 读一个 token(整数),但把行尾的换行符 \n 留在缓冲里!
String s = sc.nextLine();    // 读到「下一个换行符」为止 —— 于是它读到那个残留的 \n,当场收工,返回 ""

输入缓冲区想象成一条纸带:  [ 2 ] [\n] [少冰] [\n]
  nextInt() 咬走 2,光标停在 \n 前 ─────┘
  nextLine() 从光标出发,一头撞上那个 \n → 立刻结束 → 得到空串
```

关键在于 **`nextXxx()` 和 `nextLine()` 对换行符的态度不一样**:`nextInt()` / `nextDouble()` 这类只咬走「一个 token」,把结尾的换行符 `\n` 吐回缓冲区;而 `nextLine()` 是「读到换行为止」——它一出发就撞上那个残留的 `\n`,以为这一行到头了,返回一个空串。这不是 bug,是两种方法设计目标不同导致的**必然结果**。

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

## 六、故意制造一个 Bug(本话主坑)

给点单加一句「口味备注」,先读编号、紧接着读一整行备注——绝大多数人第一次写交互程序都这么写:

```java
System.out.print("请输入编号:");
int choice = sc.nextInt();          // 读走 2,把回车键那个 \n 留在缓冲里
System.out.print("口味备注(如少冰):");
String note = sc.nextLine();        // ← 撞上残留的 \n,直接返回空串,根本不等你打字
System.out.println("备注是:[" + note + "]");
```

顾客明明在「口味备注」后老老实实敲了「少冰」,程序却头也不回地打印:

---

## 七、读懂现象(无报错的 Logic Bug)

```text
请输入编号:2
口味备注(如少冰):备注是:[]        ← 光标根本没停下来等你,备注是空的
```

它**不报错、不崩溃**,却悄悄吞掉了一整行输入——这比那声「滋啦」更阴险,因为没有红字提醒你。病根就在原理图那张纸带:`nextInt()` 留下的 `\n` 被紧随其后的 `nextLine()` 一口吃掉。

**两种修法**,任选其一:

```java
// 修法 A:nextInt() 后补一句 sc.nextLine(),专门吃掉那个残留换行
int choice = sc.nextInt();
sc.nextLine();                      // ← 清掉行尾 \n
String note = sc.nextLine();        // 现在能正常读到「少冰」

// 修法 B:干脆全程只用 nextLine() 读整行,再自己 parse 成需要的类型
int choice = Integer.parseInt(sc.nextLine().trim());
String note = sc.nextLine();
```

> **豆豆锐评**:修法 B 是很多老手的默认习惯——**输入一律 `nextLine()` 读成字符串,再自己转类型**。这样就永远不用记「谁留了换行、谁没留」,把混用带来的坑从源头掐掉。代价是每个数字都要手动 `parseInt`,但换来的是可预测。

> **🔀 豆豆的多解台 · 读一行控制台输入,有几种姿势?**

| 方案 | 代码要点 | 适合什么时候 | 坑 |
|---|---|---|---|
| `Scanner.nextInt/nextDouble` | 按类型直接读 token | 快速读单个数字 | 与 `nextLine()` 混用会残留换行;遇非法输入抛 `InputMismatchException` |
| `Scanner.nextLine()` + 手动 parse | 一律读整行,再 `Integer.parseInt` | 想彻底躲开换行坑、输入格式不固定 | 每个数字要手动转,转失败抛 `NumberFormatException` |
| `BufferedReader.readLine()` | 包住 `System.in`,逐行读 | 海量输入、追求吞吐(竞赛/日志) | 要处理 `IOException`、要 `import java.io.*`(异常与 IO 后面话专讲) |

> 豆豆锐评:**入门和交互式小程序,`Scanner` 最顺手**,记牢「数字后补一句 `nextLine()`」就够用;要读几十万行才考虑 `BufferedReader`。别一上来就上重武器。

---

## 八、修复,并用测试证明

交互本身没法自动测(它要真人敲键盘),但可以把**解析与校验**这段纯逻辑抽出来,脱离键盘单独测:

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
    assertEquals(2, Cafe.parseChoice(" 2 "));                                  // 容忍前后空格
    assertThrows(IllegalArgumentException.class, () -> Cafe.parseChoice("9")); // 越界拦下
}
```

把「读输入」和「解析逻辑」分开,逻辑就能脱离键盘被测试——这是可测试代码的第一课。

---

## 九、项目检查点 · 豆豆咖啡站 v0.9

```text
新增:顾客可用键盘现场点单,程序第一次变成交互式;能读编号、能读备注
已具备:Scanner 读整数/整行、换行坑的规避、解析逻辑可测
还没有:带名字和备注的规整订单、一张像样的小票 —— 下一话进字符串王国
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 控制台 IO / Scanner | Java 基础;新人第一个交互程序 |
| **nextInt/nextLine 换行坑** | 笔试常见找茬题,踩过一次终身不忘 |
| 输入校验意识 | 后端「参数校验」的雏形 |
| 读输入的多种方案权衡 | 「有没有工程判断」的观察点 |

---

## 十一、下一话悬念

现在顾客的名字和备注都只是「一整行字符串」，可要在小票上写「张三 的 美式(少冰)」，还想把好几行拼成一张完整小票——阿零随手用 `==` 比了两个名字,结果字明明一样却判成「不是同一个人」。

> 下一话《名称与备注:String》:String 为什么**不可变**、`==` 和 `equals` 到底比什么、`+` 拼接在现代 JDK 到底慢不慢、什么时候才真该用 `StringBuilder`。

---

## 🎯 随堂练习

先自己做，再对答案。选择1-3基础识记，4-6理解应用，7-9分析判断，10综合；解答递进；代码题从写到验证。

### 一、选择题（10 道）

1. [基础] `Scanner` 类位于哪个包中？
   - A) `java.lang`　B) `java.util`　C) `java.io`　D) `java.text`

2. [基础] 以下哪行代码正确创建了一个读取控制台输入的 Scanner？
   - A) `Scanner sc = new Scanner();`　B) `Scanner sc = new Scanner(System.in);`　C) `Scanner sc = Scanner(System.in);`　D) `Scanner sc = new Scanner(Console.in);`

3. [基础] `nextInt()` 和 `nextLine()` 的最关键区别是？
   - A) 没有区别　B) `nextInt()` 读整数，`nextLine()` 读一行字符串　C) `nextInt()` 只能读正整数　D) `nextLine()` 会自动跳过空白

4. [理解] `nextInt()` 后直接调 `nextLine()`，最常见的问题是什么？
   - A) 编译报错　B) `nextLine()` 读到空字符串　C) 程序崩溃　D) 类型不匹配异常

5. [理解] 用户输入 "abc" 后调用 `sc.nextInt()`，会发生什么？
   - A) 返回 0　B) 返回 -1　C) 抛出 `InputMismatchException`　D) 跳过该输入

6. [应用] 如何安全地读取一个整数，避免用户输入非数字导致崩溃？
   - A) 用 `try-catch` 包裹　B) 先用 `hasNextInt()` 判断再读取　C) 先读 String 再手动解析　D) B 和 C 都可以

7. [分析] 以下代码的问题是什么？`Scanner sc = new Scanner(System.in); int age = sc.nextInt(); String name = sc.nextLine();`
   - A) 没有问题　B) `name` 会跳过用户输入直接得到空字符串　C) 变量声明顺序错误　D) Scanner 构造错误

8. [分析] 以下代码输出什么？用户输入 "42" 并回车。`int n = sc.nextInt(); sc.nextLine(); String s = sc.nextLine(); System.out.println(s.length());`
   - A) 0　B) 2　C) 取决于第二行的输入　D) 抛出异常

9. [判断] 关于 `Scanner` 的使用，以下说法错误的是？
   - A) Scanner 读完后应调用 `close()` 释放资源　B) `System.in` 被关闭后无法重新打开　C) `nextLine()` 会丢弃读取到的换行符　D) 多个 Scanner 可以同时读取 `System.in`

10. [综合] 以下程序运行时，用户依次输入：`25<回车>` 和 `李四<回车>`，输出是什么？`Scanner sc = new Scanner(System.in); int age = sc.nextInt(); String name = sc.nextLine(); System.out.println("[" + name + "]");`
    - A) `[李四]`　B) `[]`　C) `[25]`　D) 程序等待第三次输入

> [!答案]
> **1-B**：`Scanner` 在 `java.util` 包中，使用前需要 `import java.util.Scanner;`。`java.lang` 中的类（如 `String`、`System`）自动导入无需 import。**举一反三**：IDEA/Eclipse 中可自动补全 import，但手写代码时需要记住常用类的包路径。
> **2-B**：构造参数 `System.in` 是标准输入流（键盘）。A 缺少参数，C 缺少 `new`，D 没有 `Console.in` 这个流。**举一反三**：`Scanner` 不仅可以读控制台，还可以读文件（`new Scanner(new File("data.txt"))`）和字符串（`new Scanner("1 2 3")`）。
> **3-B**：`nextInt()` 读取下一个整数值（遇到非数字抛出异常），`nextLine()` 读取包括空格在内的一整行直到换行符。关键区别：`nextInt()` **不消费**行尾的换行符，`nextLine()` 会消费换行符——这是缓冲区残留问题的根源。**举一反三**：`next()` 读取下一个 token（以空白分隔），类似 `nextInt()` 但返回 String。
> **4-B**：`nextInt()` 读取整数后，换行符残留在输入缓冲区，紧接着的 `nextLine()` 遇到换行符立即返回空字符串。解决方案：在 `nextInt()` 后多加一次 `nextLine()` "吃掉"残留换行符。**举一反三**：所有 `nextXxx()`（除了 `nextLine()`）都不会消费换行符，这是设计上的不对称。
> **5-C**：`nextInt()` 期望读取一个合法的 `int` 值，遇到 "abc" 无法解析，抛出 `InputMismatchException`（运行时异常）。**举一反三**：`hasNextInt()` 可以安全地检查下一个 token 是否能解析为 int——先判断再读取是防御式编程。
> **6-D**：三种方案都可行：`try-catch` 捕获异常后重新提示输入；`hasNextInt()` 预检查；`nextLine()` 读整行后用 `Integer.parseInt()` 解析并 catch `NumberFormatException`。实际推荐顺序：`hasNextInt()` > `nextLine+parseInt` > 纯 `try-catch`。**举一反三**：生产级代码常用"全部用 `nextLine()` 读取然后手动转换"——逻辑统一，不受混合读取的缓冲区困扰。
> **7-B**：这是典型的缓冲区残留问题。用户输入 "25 张三" 为一行或 "25\n张三\n" 两行，`nextInt()` 读完 25 留下 `\n`，`nextLine()` 直接读到空字符（或 " 张三"）。修复：`sc.nextLine();` 吃掉残留换行再读 name。**举一反三**：在 IDE 中运行和命令行运行表现可能不同——IDE 的控制台模拟器可能处理换行方式不同，建议以命令行验证为准。
> **8-C**：`nextInt()` 读 42，`nextLine()` 吃掉残留换行符，第二个 `nextLine()` 等待用户输入第二行。如果输入 "hello"，`s.length()` 输出 5。**举一反三**：这里的 `nextLine()` 吃换行符是主动用法——当你知道前面有残留时，主动调用一次清理缓冲区。
> **9-D**：多个 Scanner 同时读取 `System.in` 会互相干扰——一个 Scanner 可能消费了另一个尚未读取的数据。A 正确：用完 Scanner 建议关闭。B 正确：`sc.close()` 会连带关闭底层的 `System.in`，后续无法再读键盘（除非重新打开新流，但这很麻烦）。C 正确：`nextLine()` 读取并丢弃 `\n`。**举一反三**：如果程序退出前还要读键盘，不要关闭 Scanner；或者永远只用一个 Scanner 实例。
> **10-B**：`nextInt()` 读取 25 后，第一行的换行符残留。紧接着 `nextLine()` 读到这个换行符，立即返回空字符串 `""`，赋给 `name`，输出 `[]`。这就是"姓名被吃掉"的经典场景。**举一反三**：修复——在 `nextInt()` 后加一行 `sc.nextLine();`（不赋值），然后再 `nextLine()` 正常读姓名。

### 二、解答题（3 道）

1. [概念阐述] 什么是"输入缓冲区残留问题"？它只发生在 `nextInt()` + `nextLine()` 组合吗？请列举至少 3 种会产生残留的 `nextXxx` 方法，并说明通用的解决方案。

2. [场景解释] 咖啡机系统需要用户依次输入：饮品编号（int）、数量（int）、会员手机号（String）、备注（String，可能含空格）。请给出每一行输入后的缓冲区处理方案，并说明为什么这个顺序需要特别注意。

3. [综合分析] 从健壮性角度，比较三种键盘输入方案：①`Scanner` + `nextInt`/`nextLine`；②`Scanner` + 全用 `nextLine()` 读取 + `Integer.parseInt()` 解析；③`BufferedReader` + `readLine()` + 手动解析。从"缓冲区问题""异常处理""适用场景"三方面对比。

> [!答案]
> **1**　缓冲区残留问题：`nextInt()`/`nextDouble()`/`nextBoolean()` 等 token 读取方法只读取对应的值，**不消费**后面的换行符（`\n`）。紧接着调用 `nextLine()` 时，残留的 `\n` 被立即读走，返回空字符串。其他会产生残留的方法：`nextDouble()`、`nextLong()`、`nextBoolean()`、`nextShort()`、`nextFloat()` 等所有非 `nextLine()` 的 `nextXxx()` 方法。通用解决方案有三：①混合读取时，每次 `nextXxx()` 后立即调用一次 `sc.nextLine()` 清缓冲区；②全部用 `nextLine()` 读取整行后手动转换（推荐）；③用单独的 Scanner 实例分别处理。**举一反三**：这不仅是 Scanner 的问题——C 语言的 `scanf("%d\n", &n)` 和处理回车也是经典笔试陷阱。
> **2**　方案：同一条 `sc.nextLine()` 清残留规则——`sc.nextInt()` 读编号 → `sc.nextLine()` 清残留；`sc.nextInt()` 读数量 → `sc.nextLine()` 清残留；`sc.nextLine()` 读手机号（正常）；`sc.nextLine()` 读备注（正常）。注意：如果手机号和备注之间没有混合 `nextInt()`，两次 `nextLine()` 可以直接连续读取。一旦跳过某次 `sc.nextLine()` 清残留，后续所有 `nextLine()` 都会错位——姓名变成空字符串，备注变成手机号等等，且**不报任何错误**，完全静默。**举一反三**：最稳妥的做法是统一用 `nextLine()` 读取所有输入，整数提取用 `Integer.parseInt()` 并 catch `NumberFormatException`——这样代码逻辑统一，彻底消除缓冲区残留。
> **3**　对比：①`Scanner` 混合方案——最简洁，适合快速原型和练习题；但缓冲区残留是高频陷阱，`InputMismatchException` 需要额外防护。②`Scanner` 全 `nextLine` 方案——没有缓冲区问题，类型转换集中管理，适合交互式控制台程序；但每个值都需要 `parseInt`/`parseDouble` 等，代码略长。③`BufferedReader` 方案——性能最好（适合大文本处理），字符流控制更精细；但控制台交互不如 Scanner 方便（需要手动处理 IO 异常）。推荐策略：教学和简单练习用①但要小心缓冲区；交互式应用用②；文件读取和数据处理用③。**举一反三**：Java 21 引入了 `Scanner` 的 `useLocale()` 等更多控制方法，但核心问题仍没变——理解缓冲区原理比依赖具体 API 更重要。

### 三、代码题（2 道）

1. [基础实现] 用 `Scanner` 实现一个"用户注册"输入流程：依次读入用户名（String）、年龄（int）、身高（double，米）。正确处理后三者打印为 `"张三，25 岁，1.75 米"` 格式。要求：①处理 `nextInt()`/`nextDouble()` 后的缓冲区残留；②对年龄和身高做合法性验证（年龄 1-120，身高 0.5-2.5），不合格提示重新输入。

2. [综合设计] 写一个"点单计算器"交互程序：使用 `do-while` 循环，每轮：①提示用户输入饮品编号（1=美式15元, 2=拿铁18元, 3=摩卡22元, 0=结账退出）；②输入杯数；③累加总价。退出时打印订单明细（每项的名称×杯数=小计）和总价。所有输入用 `nextLine()` 统一读取（避免缓冲区问题），数字用 `Integer.parseInt()` 转换并用 try-catch 处理非法输入。

> [!答案]
> **1 验收**：
> ```java
> Scanner sc = new Scanner(System.in);
>
> System.out.print("用户名：");
> String name = sc.nextLine();
>
> int age;
> while (true) {
>     System.out.print("年龄：");
>     age = sc.nextInt();
>     sc.nextLine(); // 清残留
>     if (age >= 1 && age <= 120) break;
>     System.out.println("年龄不合法，请重新输入（1-120）");
> }
>
> double height;
> while (true) {
>     System.out.print("身高(米)：");
>     height = sc.nextDouble();
>     sc.nextLine(); // 清残留
>     if (height >= 0.5 && height <= 2.5) break;
>     System.out.println("身高不合法，请重新输入（0.5-2.5）");
> }
>
> System.out.printf("%s，%d 岁，%.2f 米\n", name, age, height);
> // 示例：张三，25 岁，1.75 米
> ```
> **举一反三**：每次 `nextInt()`/`nextDouble()` 后立即 `sc.nextLine()` 清残留已成为标准习惯——宁可多写一行，也别让它变成难以调试的幽灵 bug。
>
> **2 验收**：
> ```java
> Scanner sc = new Scanner(System.in);
> String[] menu = {"美式", "拿铁", "摩卡"};
> double[] prices = {15, 18, 22};
> double total = 0;
> StringBuilder receipt = new StringBuilder();
> int choice;
>
> do {
>     System.out.println("\n=== 菜单 ===");
>     System.out.println("1.美式 15元 | 2.拿铁 18元 | 3.摩卡 22元 | 0.结账");
>     System.out.print("请选择：");
>
>     String line = sc.nextLine();
>     try {
>         choice = Integer.parseInt(line);
>     } catch (NumberFormatException e) {
>         System.out.println("请输入数字！");
>         choice = -1;
>         continue;
>     }
>
>     if (choice == 0) break;
>     if (choice < 1 || choice > 3) {
>         System.out.println("无此饮品，请重新选择");
>         continue;
>     }
>
>     System.out.print("杯数：");
>     int qty;
>     try {
>         qty = Integer.parseInt(sc.nextLine());
>     } catch (NumberFormatException e) {
>         System.out.println("请输入数字！");
>         continue;
>     }
>     if (qty <= 0) {
>         System.out.println("杯数必须 > 0");
>         continue;
>     }
>
>     double subtotal = prices[choice - 1] * qty;
>     total += subtotal;
>     receipt.append(String.format("%s × %d = %.1f\n", menu[choice - 1], qty, subtotal));
>     System.out.printf("已添加：%s × %d = %.1f\n", menu[choice - 1], qty, subtotal);
>
> } while (true);
>
> System.out.println("\n=== 订单明细 ===");
> System.out.print(receipt);
> System.out.printf("总价：%.1f 元\n", total);
> sc.close();
> ```
> 运行验证：选择 1+3杯 → 45元，选 3+2杯 → 44元，结账 → 总价 89.0 元，明细完整。**举一反三**：全 `nextLine()` 方案零缓冲区残留，配合 `try-catch` 可优雅处理所有非法输入——这是生产级控制台程序的经典范式。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 `/java`。*
