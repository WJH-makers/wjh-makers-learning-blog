---
title: "《从零开始学 Java》66 · IO 流家族与乱码事故"
date: 2026-10-23
summary: "排行榜发到分店满屏问号,分店回传的销量单又读成一串替换符,再转一手竟成了锟斤拷。这一话把 IO 流家族查个底朝天:四大基类、装饰器叠缓冲、翻译官的字典,再用 JEP 400 讲透乱码的来龙去脉——文件里躺着的从来不是字,是字节。"
tags: [Java, Java漫画, IO流, 字符编码, UTF-8, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》66 · IO 流家族与乱码事故

> 连载特刊 · 番外卷一「语言宝库」第 10 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——排行榜每晚导出发给分店,分店电脑上一打开,满屏问号。

---

## 一、事故:问号文件与锟斤拷回执

排行榜(上一话的 TreeSet)昨晚第一次出库发分店,事故直接双响:总店导出的榜单,分店那台没升级的老爷机打开是满屏问号;分店回传的销量单,阿零的程序读进来,中文全成了怪符号。

豆豆翻开技术债账本:「第 27 话用 Files 读写文件时,`readString` 后面那个**编码参数**咱们是跳着讲的。这页债,今天连本带息。」

---

## 二、漫画 · 文件里躺着的不是字,是字节

> **〔1〕** 深夜,分店群炸锅,满屏都是「????.csv」的截图。阿零盯着自己的屏幕抓头发。
> 阿零:「我这边打开明明是『拿铁,42』!过条马路怎么就成摩斯密码了?!」

> **〔2〕** 豆豆把文件拖到显微镜下,「字」瞬间碎成一排十六进制字节。
> 豆豆:「文件里躺着的从来不是字,是**字节**。『字』是读的人拿一本字典把字节翻出来的——你用 UTF-8 写,他用 GBK 翻,当然翻成鬼画符。」

> **〔3〕** 【全景格】IO 海关:左侧字节码头,`InputStream` / `OutputStream` 两个搬运工只认 0 和 1;右侧字符大厅,`Reader` / `Writer` 讲人话;中间玻璃亭坐着翻译官 **InputStreamReader**,桌上摆着一排字典:ASCII、GBK、UTF-8。
> 翻译官:「不指定字典?那我拿默认那本了啊,出了事别赖我。」

> **〔4〕** 分店回传的销量单进港,阿零大手一挥「用默认的读!」。字节刚过玻璃亭,Bug 怪家族的**乱码怪**破土而出——三头小怪,胸口分别印着「锟」「斤」「拷」。
> 乱码怪(合唱):「锟!斤!拷!」

> **〔5〕** 豆豆(叼着豆子叉腰):「JDK 18 起默认字典全平台统一成 UTF-8(JEP 400),可分店老爷机吐出来的是 GBK 字节。字典拿错,神仙也翻不对。」

---

## 三、本话目标

- 认清四大基类:字节流 `InputStream`/`OutputStream`,字符流 `Reader`/`Writer`;
- 用装饰器把翻译官、缓冲一层层叠上,并说清**缓冲为什么快**;
- 讲透乱码:编码只发生在读写边界,GBK 字节 × UTF-8 字典 = 事故;
- 踩一次「默认字符集读分店文件」的坑,弄懂 � 与锟斤拷的来历并修好;
- 立下咖啡站编码公约:**入库转码,出库统一 UTF-8**。

---

## 四、原理图:IO 流家族地图

```text
        字节世界(搬运工,只认 0/1)          字符世界(讲人话)
 读:InputStream  ──┐                      ┌──  Reader
 写:OutputStream ──┤  翻译官(手持字典)   ├──  Writer
                    └─ InputStreamReader ──┘
                       OutputStreamWriter

装饰器叠法(功能不靠继承爆炸,靠一层层包):
new BufferedReader(                    ← ③ 缓冲:一次预取 8 KB,少跑系统调用
    new InputStreamReader(             ← ② 翻译:字节 → 字符,指定字典
        new FileInputStream(f),        ← ① 搬运:贴着文件读原始字节
        Charset.forName("GBK")))
```

缓冲为什么快:不带缓冲时每次 `read()` 都是**一次系统调用**——用户态和内核态之间来回一趟,比内存访问贵几个数量级;`Buffered` 层一次搬 8 KB 进内存,后面的读直接从缓冲区拿。

字典(字符集)简史,三行看懂:

| 字符集 | 一句话 | 中文一个字占 |
|---|---|---|
| ASCII | 128 个英文字符,1 字节 | 根本存不了中文 |
| GBK | 中文国标,兼容 ASCII;老中文 Windows 的默认 | 2 字节 |
| UTF-8 | Unicode 变长编码,全球通用;英文仍 1 字节 | 常见汉字 3 字节 |

> **豆豆锐评**:`String` 表示已经解码后的文本;它的公开 `char` API 以 UTF-16 码元为单位，内部紧凑存储又是 JDK 实现细节，不能简单说成「码点数组」。**编码/解码的选择发生在边界**——读文件、写文件、走网络。排乱码先问两句:写端用哪本字典编的?读端用哪本字典解的?

> **⏳ 版本时光机 · 默认字符集怎么变的**

| JDK 版本 | 行为 | 关键变化 |
|---|---|---|
| ≤ JDK 17 | 默认字符集跟随操作系统:中文 Windows 是 GBK,Linux/macOS 多为 UTF-8 | 同一程序换台机器结果不同——乱码之源 |
| JDK 18 | JEP 400:默认字符集全平台统一为 UTF-8 | 不再看系统脸色;老项目升级时乱码「当场现形」 |
| Java 25(今天) | 默认已是 UTF-8,但边界处仍显式声明 charset | 显式即文档,不赌任何默认 |

一句演进小结:从「看机器脸色」到「全平台一本字典」;而工程习惯是更进一步——每个边界把字典写在明面上。

---

## 五、代码:排行榜长出进出口

上一话的排行榜(TreeSet,销量降序、名字兜底)今天长出两个 IO 口:`export` 出库、`printRaw` 入库观察。手工叠一次三层装饰器,看清每层在干嘛:

```java
import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

record RankRow(String name, int sold) {}

public class RankingIO {

    /** 出库:排行榜 → CSV,一律 UTF-8 */
    static void export(Path file, List<RankRow> rows) throws IOException {
        List<String> lines = rows.stream()
                .map(r -> r.name() + "," + r.sold())
                .toList();
        Files.write(file, lines, StandardCharsets.UTF_8);
    }

    /** 手工三层叠,教学版(平时用下面的一行版) */
    static void printRaw(Path file, Charset dict) throws IOException {
        try (var in = new BufferedReader(
                new InputStreamReader(
                        new FileInputStream(file.toFile()), dict))) {
            String line;
            while ((line = in.readLine()) != null) {
                System.out.println(line);
            }
        }   // try-with-resources 只关最外层,装饰器链会层层往里关(回看第 25 话)
    }

    /** 一行版:NIO.2 已替你叠好这三层(回看第 27 话) */
    static List<String> readAll(Path file, Charset dict) throws IOException {
        return Files.readAllLines(file, dict);
    }
}
```

> **🔀 豆豆的多解台 · 读一个文本文件,三种姿势怎么选?**

| 解法 | 代码要点 | 适合什么时候 | 坑 |
|---|---|---|---|
| `Files.readString` | `Files.readString(path, cs)` 一口气整读 | 小文件、配置、一次性处理 | 大文件吃满内存;编码不对**当场抛异常**(其实是优点) |
| `BufferedReader` 逐行 | `Files.newBufferedReader(path, cs)` + `readLine` | 大文件、逐行流水线 | 忘了 try-with-resources 就漏文件句柄 |
| `Scanner` | `new Scanner(path, cs)` 边读边解析 | 交互输入、按分隔符拆字段 | 三者中最慢;`hasNext` 会吞掉底层 IO 异常 |

豆豆锐评:小文件默认 `Files.readString`,大文件 `newBufferedReader` 逐行,`Scanner` 留给键盘;**三个都把 charset 参数写明白**。

---

## 六、故意制造一个 Bug:拿 UTF-8 字典翻 GBK 字节

分店回传的 `branch-sales.csv` 出自那台老爷机,字节是 GBK 的。阿零图省事,不给字典:

```java
// 阿零:「默认的不就挺好?」(JDK 18 起,默认字典全平台 = UTF-8)
try (var in = new BufferedReader(
        new InputStreamReader(new FileInputStream("branch-sales.csv")))) {
    String line;
    while ((line = in.readLine()) != null) {
        System.out.println(line);   // ← 故意:拿 UTF-8 字典翻 GBK 字节
    }
}
```

---

## 七、读懂真实报错

程序**没崩**,但输出全废——`InputStreamReader` 的默认策略是 REPLACE:翻不动的字节悄悄换成替换符 �(U+FFFD)接着跑:

```text
����,42
����,37
```

阿零没细看,把这份内容原样写回文件发给分店对账。分店老爷机按 GBK 一开:

```text
锟斤拷锟斤拷,42
锟斤拷锟斤拷,37
```

豆豆解密锟斤拷的身世:� 的 UTF-8 编码是 `EF BF BD`;两个连排就是 `EF BF BD EF BF BD`;GBK 两字节两字节地啃——`EF BF`=锟、`BD EF`=斤、`BF BD`=拷。「锟斤拷不是乱码的原因,是乱码被二次转手后的**尸检报告**。」

想让 JDK 别装死?换严格派 `Files.readString`(策略是 REPORT,翻不动直接报警):

```text
Exception in thread "main" java.nio.charset.MalformedInputException: Input length = 1
        at java.base/java.nio.charset.CoderResult.throwException(CoderResult.java:274)
        at java.base/java.lang.String.decodeWithDecoder(String.java:1212)
        ...
        at java.base/java.nio.file.Files.readString(Files.java:3403)
        at BranchImport.main(BranchImport.java:9)
```

`Input length = 1` 的意思是:解码器在当前位置啃了 1 个字节就发现序列非法。静默替换让事故晚爆炸,尽早报警才好排障。

---

## 八、修复,并用测试证明

根因:字节没错,字典拿错。咖啡站立下编码公约——**入库转码**(历史遗留文件各按各的真实字典读),**出库统一 UTF-8**:

```java
public class BranchImport {
    static final Charset GBK = Charset.forName("GBK");

    /** 入库:老爷机的 GBK 文件,用对字典读进来,进了内存就是干净的 String */
    static List<String> importBranchCsv(Path file) throws IOException {
        return Files.readAllLines(file, GBK);
    }

    /** 出库:一律 UTF-8,所有分店按同一本字典打开 */
    static void export(Path file, List<String> lines) throws IOException {
        Files.write(file, lines, StandardCharsets.UTF_8);
    }
}
```

JUnit 质检员(「证据呢?」)伪造一台 GBK 老爷机,验证一进一出:

```java
import org.junit.jupiter.api.Test;
import java.nio.charset.MalformedInputException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class BranchImportTest {

    @Test
    void gbk_in_utf8_out_keeps_chinese_intact() throws Exception {
        Path in = Files.createTempFile("branch", ".csv");
        Files.write(in, "拿铁,42".getBytes(BranchImport.GBK));   // 伪造 GBK 文件

        List<String> rows = BranchImport.importBranchCsv(in);
        assertEquals(List.of("拿铁,42"), rows);                  // 入库:字没翻坏

        Path out = Files.createTempFile("rank", ".csv");
        BranchImport.export(out, rows);
        assertArrayEquals(("拿铁,42" + System.lineSeparator())
                        .getBytes(StandardCharsets.UTF_8),
                Files.readAllBytes(out));                        // 出库:字节确为 UTF-8
    }

    @Test
    void reading_gbk_as_utf8_blows_up_loudly() throws Exception {
        Path in = Files.createTempFile("branch", ".csv");
        Files.write(in, "拿铁,42".getBytes(BranchImport.GBK));
        assertThrows(MalformedInputException.class,
                () -> Files.readString(in));   // 默认 UTF-8,严格解码当场报警
    }
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v8.10

```text
咖啡站形态:排行榜每晚出库 UTF-8;分店回传的 GBK 老文件照单全收
已具备  :四大基类心智图;装饰器叠 Buffered/翻译官;编码公约「入库转码、出库统一 UTF-8」;
          能讲清 � 与锟斤拷的完整案发过程
还没有  :文本会存了,可整个 Order 对象带着状态怎么原样过冬 —— 下一话序列化
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 字节流/字符流四大基类 + 装饰器叠法 | 「熟悉 Java IO」的真实含义,面试画图题常客 |
| 字符编码排障(GBK/UTF-8/替换符/锟斤拷) | 导入导出、接口对接的日常事故;能讲锟斤拷来历 = 排障老手 |
| JEP 400 默认 UTF-8(JDK 18) | 老项目升级的高频踩坑点,追问必备 |
| NIO.2 Files 读写 + try-with-resources | 资源不泄漏、编码不靠猜的基本功 |

---

## 十一、下一话悬念

文本会存了。可豆豆合上账本前又戳了一下柜台:那些做到一半的 Order 对象——带着状态、带着配料清单——冬歇一重启就全清零,几行 CSV 可装不下一个活对象。

> 下一话《序列化:让订单穿越重启》:让整个对象原样落盘、原样醒来。serialVersionUID 到底是什么、为什么类一改旧存档就打不开,以及 JDK 序列化的老毛病和现代替代方案。

---

## 🎯 随堂练习

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. IO 流的四大基类是?
   - A) File / Path / Files / Paths　B) **`InputStream` / `OutputStream`(字节)与 `Reader` / `Writer`(字符)**　C) Buffered 系列　D) Scanner / Printer
2. `new BufferedReader(new InputStreamReader(new FileInputStream(f), GBK))` 三层各是什么?
   - A) 三层都是缓冲　B) **① 搬运原始字节 ② 翻译字节→字符(带字典)③ 缓冲一次预取**　C) 顺序反了　D) 只有最外层有用
3. 加 `Buffered` 一层为什么会快?
   - A) 用了多线程　B) **不带缓冲时每次 `read()` 都是一次系统调用,用户态↔内核态往返很贵;缓冲一次搬 8KB 进内存**　C) 压缩了数据　D) 跳过了校验
4. 乱码发生在哪一环?
- A) String 存在内存里的时候　B) **读写边界** —— 选错编码/解码规则时发生;已得到的 `String` 是文本抽象，不要把它误说成简单的码点数组　C) 网络传输中　D) 编译期
5. JDK 18(JEP 400)带来的关键变化是?
   - A) 移除 GBK　B) **默认字符集全平台统一为 UTF-8**,不再看操作系统脸色　C) 强制显式声明 charset　D) 新增字符集
6. 用 UTF-8 字典去读 GBK 字节,`InputStreamReader` 的默认表现是?
   - A) 抛异常　B) **REPLACE 策略:翻不动的字节悄悄换成替换符 �,程序不崩继续跑**　C) 返回空　D) 自动识别改用 GBK
7. 「锟斤拷」的真实来历是?
   - A) 一种编码　B) **� 的 UTF-8 字节 `EF BF BD` 连排后,被 GBK 两字节两字节地啃出来的结果** —— 是乱码被二次转手后的尸检报告　C) GBK 的保留字　D) 输入法问题
8. `Files.readString` 遇到非法字节序列会?
   - A) 静默替换　B) **抛 `MalformedInputException`**(REPORT 严格策略)　C) 返回 null　D) 跳过该字节
9. `try-with-resources` 包住装饰器链的最外层,内层流会?
   - A) 泄漏　B) **被层层往里关闭**　C) 需要手动关　D) 由 GC 回收
10. 本话立下的编码公约是?
    - A) 全部用 GBK　B) **入库转码(按各自真实字典读)、出库统一 UTF-8**　C) 依赖系统默认　D) 存成二进制

> [!答案]
> **1-B**　字节两个、字符两个。**举一反三**:记住「字节流搬运、字符流讲人话」,中间那个翻译官(`InputStreamReader`)就是两个世界的桥。
> **2-B**　装饰器一层加一个能力。**举一反三**:这就是装饰器模式 —— 功能靠组合而不是继承爆炸,Java IO 是教科书级案例。
> **3-B**　系统调用比内存访问贵几个数量级。**举一反三**:同理批量写、批量提交数据库,省的都是「往返次数」。
> **4-B**　乱码的根因通常在读写边界选错了字典。**举一反三**:排乱码先问两句 —— 写端用哪本字典编的?读端用哪本字典解的?涉及 emoji/生僻字时，再检查代码是否把一个 Unicode 码点错误地按单个 `char` 处理。
> **5-B**　全平台一本字典。**举一反三**:老项目升级到 18+ 时,那些一直靠 GBK 默认值运行的代码会「当场现形」。
> **6-B**　静默替换,事故延后爆炸。**举一反三**:静默降级看似友好,实则让问题在更远的地方以更难查的形式出现。
> **7-B**　它是二次转手的产物。**举一反三**:能讲清这个链条,基本可以证明你真的排过编码故障。
> **8-B**　严格策略当场报警。**举一反三**:尽早报警好过静默替换 —— 这也是选 API 时的一个隐藏考量点。
> **9-B**　关最外层即可。**举一反三**:但要注意关闭顺序是**由外向内**,所以中间层的缓冲会先被 flush。
> **10-B**　入库转码、出库统一。**举一反三**:每个边界把字典写在明面上 —— 显式即文档,不赌任何默认值。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
