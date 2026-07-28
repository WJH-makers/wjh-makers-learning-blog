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

> **豆豆锐评**:`String` 在内存里是 Unicode 码点序列,**永远无辜**;编码这回事只发生在**边界**——读文件、写文件、走网络。排乱码只问两句:写端用哪本字典编的?读端用哪本字典解的?

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

### 选择题(10 道)

1. IO 流四大基类分字节流和字符流,配对正确的是?
   - A) InputStream/OutputStream — 字符流　B) Reader/Writer — 字节流　C) InputStream/OutputStream — 字节流,Reader/Writer — 字符流　D) 没有区分
2. 把字节流转成字符流的翻译官是?
   - A) BufferedReader　B) InputStreamReader(手持字符集字典)　C) FileReader　D) Scanner
3. 文件里躺着的到底是什么?
   - A) 字符　B) 字节——「字」是读的人拿字符集翻出来的　C) 数字　D) Unicode 码点
4. 分店用 GBK 写的文件,用 UTF-8 读,默认行为(REPLACE)会?
   - A) 抛异常　B) 翻不动的字节悄悄换成 �(U+FFFD),继续跑　C) 自动转换　D) 跳过
5. 锟斤拷是怎么来的?
   - A) 随机的乱码　B) � 的 UTF-8 编码被 GBK 二字一字啃的产物(EF BF→锟, BD EF→斤, BF BD→拷)　C) 编译器产��　D) 内存溢出
6. Buffered 层的核心价值是?
   - A) 好看　B) 减少系统调用——一次预取 8KB,后面的读从内存取而不调内核　C) 自动编码　D) 支持并发
7. JEP 400(JDK 18)对默认字符集做了什么?
   - A) 新增了字符集　B) 全平台统一为 UTF-8,不再跟操作系统走　C) 去掉了 UTF-8　D) 只影响 Windows
8. `try-with-resources` 关流时,装饰器链怎么办?
   - A) 只关最外层,外层 close 会一层层往里关　B) 每层都要单独关　C) 不会自动关　D) 手动关
9. `Files.readString(path)` 和 `Files.readString(path, charset)` 的关键区别?
   - A) 完全一样　B) 前者用系统默认 charset(现在已是 UTF-8),后者显式指定　C) 前者更快　D) 不支持中文
10. 咖啡站的编码公约应该是什么?
    - A) 用系统默认　B) 入库按原文件的真实 charset 转码,出库统一 UTF-8　C) 全部用 GBK　D) 只存字节不关心编码

> [!答案]
> **1-C**　字节流(InputStream/OutputStream)搬运原始字节,字符流(Reader/Writer)搬运人眼可读的字符。**举一反三**:字符流内部一定包着一层字节流 + InputStreamReader——字符流是字节流加了「字符集字典」的包装。
> **2-B**　InputStreamReader 是字节到字符的桥梁,构造时必须指定 Charset——它就是那个「手持字典的翻译官」。**举一反三**:FileReader 就是 InputStreamReader 的子类,但它用默认 charset,不能传参指定编码——这也是 FileReader 被诟病之处。
> **3-B**　文件/网络/磁盘里存的永远是字节序列。你打开看到的中文,是编辑器拿某个字符集把字节翻成了字符。**举一反三**:这一认知是理解乱码的前提——排乱码只问两句:写端用什么字典编码的?读端用什么字典解码的?
> **4-B**　InputStreamReader 默认策略是 REPLACE——翻不动的字节换成 �(U+FFFD),不抛异常。**举一反三**:`Files.readString` 的策略是 REPORT——翻不动就抛 MalformedInputException,当场报警;REPLACE 策略让事故延后暴露,REPORT 尽早暴露才好排障。
> **5-B**　� 的 UTF-8 字节是 EF BF BD;连续两个 � → EF BF BD EF BF BD;GBK 二字一字啃——EF BF→锟、BD EF→斤、BF BD→拷。**举一反三**:"锟斤拷不是乱码的原因,是乱码被二次转手后的尸检报告" ——第一次用错字典翻出了 �,第二次又把 � 的字节用另一种字典翻了,层层转码的每一步都留下痕迹。
> **6-B**　不带缓冲,每次 read 都是一次系统调用(用户态↔内核态切换)。Buffered 层一次预取 8KB,后续靠内存直接返回,省掉成千上万次系统调用。**举一反三**:8KB 是默认缓冲区大小,可以构造函数指定更大的;对于大文件的逐行处理,BufferedReader.readLine 就是最经典的用法。
> **7-B**　JDK 18 前默认字符集跟操作系统走(中文 Windows = GBK,Linux = UTF-8)——同一程序换台机器行为不同。JEP 400 统一成 UTF-8,终于「一次编写到处不乱码」。**举一反三**:但这个改动也意味着老代码在 JDK 18+ 升级后,以前依赖默认 GBK 的地方会开始「读不出中文」——升级时要排查的文件读写的编码参数。
> **8-A**　try-with-resources 只关最外层(如 BufferedReader),它内部的字节流/InputStreamReader 会顺着 close 链一层层往里关,不会泄漏。**举一反三**:装饰器模式的 close 链是标准实现——每个 close() 方法内部都会关掉它包裹的那个流;如果你分别 new 并分别 close,里面的流会被关两次(第二次 close 是无害的空操作,但不要主动这样做)。
> **9-B**　无参版走系统默认——JDK 18+ 默认 UTF-8;带 charset 参数版显式声明,无论系统怎么变,字典拿对。**举一反三**:永远显式给 charset 参数——写代码时多敲几个字符,省掉迁移 JDK 版本时满世界翻找读文件的编码 bug。
> **10-B**　入库:分店回传的 GBK 文件用 GBK 读入(String 在内存里已经是干净的 Unicode);出库:统一 UTF-8 写入,所有下游都按同一本字典打开。**举一反三**:这就是「边界编码」原则——只在内存进出时操心编码,进了内存就是 Unicode,不再有编码概念。

### 解答题(5 道)

1. 画出装饰器三层叠法:`BufferedReader → InputStreamReader → FileInputStream`,标注每层的作用和指定 charset 的环节。
2. 乱码排障的一段话:分店用 GBK 写了"拿铁",阿零用 UTF-8 读看到 �。写出从字节角度还原全过程的推导。
3. `Files.readString` (REPORT 策略)和 `new InputStreamReader + readLine`(REPLACE 策略)遇到乱码时行为有什么不同?哪个更容易尽早暴露问题?
4. JEP 400 统一默认 UTF-8 后,一个原本在 Windows 上依赖默认 GBK 的老项目升级 JDK 18 会出什么问题?怎么修?
5. 读取一个 500MB 的日志文件,统计其中包含 "ERROR" 的行数。用三种姿势(Files.readString 整读、BufferedReader 逐行、Scanner)分析各自的适用性。

> [!答案]
> **1**　```
FileInputStream → 贴着文件读原始字节
  ↓
InputStreamReader(charset) → 拿指定字典把字节翻成字符
  ↓
BufferedReader → 一次读 8KB 减少系统调用
```　指定 charset 的环节只有一个:InputStreamReader 构造时。**举一反三**:这就是 Java IO 的「装饰器模式」经典三板斧;理解了它,任何 IO 代码拆开的包层都是同样的思路。
> **2**　"拿铁" GBK 编码:C4 C3 CC FA(4 字节)。UTF-8 解码读到 C4→需要 2 字节,C4 C3→没有这个 UTF-8 序列(在 UTF-8 里 C4 后跟的字节必须在 A0-BF 范围,但 C3 不在)→解码失败→�。连续四个字节全失败→四个 �。**举一反三**:UTF-8 有严格的编码规则——高位字节后面跟的字节必须在特定范围内;GBK 的字节序列恰好可能违反 UTF-8 规则,这就是为什么「拿错字典就翻出 �」。
> **3**　`Files.readString` 默认严格解码(CharsetDecoder 的 onMalformedInput=REPORT)——遇到无法识别的字节序列直接抛 MalformedInputException。`InputStreamReader` 默认宽松(REPLACE)——换 � 续跑。**举一反三**:严格模式尽早暴露问题,适合你确认编码一定正确的场景(如自己的系统内部文件);宽松模式适合「我知道可能有脏数据,先尽量读出来再过滤」的容错场景。
> **4**　Windows 上老代码可能 `new FileReader(file)` 或 `Files.readString(path)` 没传 charset——JDK 17 及以前默认 GBK 能正常读中文;升到 JDK 18+ 默认变 UTF-8,读中文文件会出乱码。修复:所有文件读写的构造或方法都显式传入 `Charset.forName("GBK")` 或 `StandardCharsets.UTF_8`。**举一反三**:升级 JDK 版本前跑一遍全项目 grep——搜索所有 `FileReader`、`InputStreamReader`、`readString` 不带 charset 参数的调用——这是自动化的升级清单。
> **5**　`Files.readString`:500MB 整读进内存——爆内存。`BufferedReader` 逐行:内存只用一行,适合大文件。`Scanner`:比 BufferedReader 更慢(内部额外做解析),但能从一行中直接提取字段。最佳方案:`Files.newBufferedReader(path, charset)` + 循环 `readLine` + 过滤。**举一反三**:大文件处理还有 `Files.lines(path)` 返回 Stream<String>,但别忘关 Stream(包在 try-with 里);并行流处理大文件理论上更快,但要小心 IO 密集不是并行流的强项。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
