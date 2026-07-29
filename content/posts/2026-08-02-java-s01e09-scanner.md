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

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. `sc.nextInt()` 紧跟 `sc.nextLine()`,后者读到空串的根本原因是?
   - A) `nextLine()` 有 bug　B) `nextInt()` 只咬走一个 token,把行尾的 `\n` 留在了缓冲区　C) 键盘输入太快　D) `Scanner` 不支持中文
2. 让 `nextInt()` 读到 `abc`,会发生什么?
   - A) 返回 0　B) 返回 -1　C) 抛 `InputMismatchException`　D) 阻塞等待重新输入
3. 修法 A 是怎么修的?
   - A) 把 `nextLine()` 换成 `next()`　B) 在 `nextInt()` 后补一句 `sc.nextLine()`,专门吃掉残留换行　C) 每次重建 `Scanner`　D) 用 `try-catch` 包住
4. 很多老手默认的修法 B 是?
   - A) 全程只用 `nextInt()`　B) 输入一律用 `nextLine()` 读成字符串,再自己转类型　C) 改用 `System.in.read()`　D) 输入前先 `flush`
5. `Scanner sc = new Scanner(System.in);` 里的 `System.in` 是?
   - A) 一个文件　B) 标准输入流,通常就是键盘　C) 控制台窗口对象　D) 一个字符串
6. `nextLine()` 的语义是?
   - A) 读一个单词　B) 读到「下一个换行符」为止　C) 读固定长度的字符　D) 读整个输入缓冲区
7. 「备注被吞掉」这个问题属于哪一类?
   - A) 编译错误　B) 运行期异常　C) 不报错、不崩溃的 Logic Bug,比抛异常更阴险　D) 环境配置问题
8. 把 `parseChoice(String raw)` 单独抽出来的意义是?
   - A) 代码更短　B) 让解析与校验脱离键盘,可以被 JUnit 直接测　C) 提高读取速度　D) 避免 `InputMismatchException`
9. `Integer.parseInt("abc")` 会抛?
   - A) `InputMismatchException`　B) `NumberFormatException`　C) `IllegalArgumentException`　D) 返回 0
10. 要读几十万行输入、追求吞吐时,更合适的是?
    - A) `Scanner.nextInt()`　B) `Scanner.nextLine()`　C) `BufferedReader.readLine()`　D) 一次性 `System.in.readAllBytes()`

> [!答案]
> **1-B**　`nextInt()` 把换行符吐回缓冲,`nextLine()` 一出发就撞上它、当场收工。**举一反三**:这不是 bug,是两种方法「对换行符的态度不同」导致的必然结果 —— 理解机制比背结论管用。
> **2-C**　让它听整数却喂了字母,当场「滋啦」。**举一反三**:第三季异常季会回来驯服它,那时你会用 `hasNextInt()` 先问一句再读。
> **3-B**　多读一行,把残留的 `\n` 吃掉。**举一反三**:同理 `nextDouble()`、`next()` 之后接 `nextLine()` 都有这个坑。
> **4-B**　一律读整行再自己 parse,从源头掐掉混用问题。**举一反三**:代价是每个数字要手动转,换来的是**可预测** —— 工程上通常值这个价。
> **5-B**　`System.in` 是标准输入流。**举一反三**:所以命令行里 `java Cafe < input.txt` 能把文件重定向成输入,程序一行都不用改。
> **6-B**　它以换行符为终点。**举一反三**:正因为如此,它才会被残留的换行「秒结束」。
> **7-C**　没有红字提醒,输入被悄悄吞掉。**举一反三**:凡是「静默错误」都要靠测试和输出校验兜住,不能指望异常提醒你。
> **8-B**　交互本身没法自动测,但纯逻辑可以。**举一反三**:「把 IO 和逻辑拆开」是可测试代码的第一课,后面每一季都会再用到。
> **9-B**　`parseInt` 失败抛 `NumberFormatException`(它是 `IllegalArgumentException` 的子类)。**举一反三**:所以修法 B 只是把异常类型换了,校验一样不能省。
> **10-C**　`BufferedReader` 是为吞吐设计的重武器。**举一反三**:入门和交互式小程序用 `Scanner` 最顺手,别一上来就上重武器 —— 选型看场景。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 `/java`。*
