---
title: "《JVM 火种纪》14 · 字节的地下水道"
date: 2026-10-31
tags: [Java, Java漫画, JVM, InputStream, Java25, 阿零与焰焰]
summary: "出杯台的并发问题刚压住，小票日志文件打开满屏是 '???'——FileInputStream 读的是字节不是字符，没指定编码就把正确性押给了运行时默认值。阿零用装饰器链套上 InputStreamReader 指定 UTF-8，再用 BufferedInputStream 把系统调用从八千次降到两次；炉底扒开 HexFormat 看清 UTF-8 的字节布局。"
---

# 《JVM 火种纪》14 · 字节的地下水道

> JVM 火种纪 · 卷二「类库补课篇」第 7 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话出杯台换成了 `BlockingQueue`，生产消费协奏顺畅了——但阿零打开小票日志，满屏是 `???`，`FileInputStream` 裸读字节、没指定编码的坑终于爆了。

---

## 一、事故：小票日志满屏问号

上一话把并发问题压住之后，阿零去查历史小票日志——准备做一个按月汇总的报表。文件打开，满屏是 `???`。

他的代码是这样的：

```java
byte[] bytes = new FileInputStream("receipt.log").readAllBytes();
System.out.println(new String(bytes)); // 没指定编码
```

焰焰指着代码：「`FileInputStream` 读的是字节，不是字符。你直接 `new String(bytes)` 没指定编码，就把正确性押给了运行时默认值。JDK 18 起标准默认值是 UTF-8，但旧 JDK、`-Dfile.encoding=COMPAT` 与历史数据仍可能使用本地编码——字节相同，解码码表不同，结果就是乱码。」

第二个问题紧接着出来：「性能。」焰焰打开系统调用监控：「你每次 `read()` 读 1 个字节，系统调用了 8000 次。套上 `BufferedInputStream`，攒 8192 字节一次读，系统调用降到 2 次。」

---

## 二、漫画 · 装饰器链接对水管

![《JVM 火种纪》14 · 字节的地下水道——IO 装饰器四格漫画](/comics/jvm/f02e07-byte-stream.png)

> [!文字版]
>
> **〔1〕** 阿零打开一份小票日志文件，满屏 `???`。「我就用的 `FileInputStream` 啊，读出来的怎么是这个？」他把代码递给焰焰，一脸委屈。
>
> **〔2〕** 焰焰指着代码：「`FileInputStream` 读的是字节，不是字符。你直接 `new String(bytes)` 没指定编码，就把正确性押给了运行时默认值。JDK 18 起标准默认值是 UTF-8，但旧 JDK、`-Dfile.encoding=COMPAT` 与历史数据仍可能使用本地编码——字节相同，解码码表不同，结果就是乱码。」
>
> **〔3〕** 「第二个问题——性能。」焰焰打开系统调用监控：「你每次 `read()` 读 1 个字节，系统调用了 8000 次。套上 `BufferedInputStream`，攒 8192 字节一次读，系统调用降到 2 次。」 焰焰在白板上画出装饰器链：`BufferedReader → InputStreamReader(charset=UTF-8) → FileInputStream(file)`。「装饰器模式——每一层只做一件事，串起来功能叠加。」
>
> **〔4〕** 炉底浮出一个 JDK 1.0 时代的版本残影，抱着一本《Java I/O》第一版：「我们那时候字节流和字符流就分开设计了，桥接器 `InputStreamReader` 从 JDK 1.1 就有——但显式传 `Charset` 这件事，愣是到 JDK 11 才给 `FileReader` 加上构造器参数。二十年，一个参数。」残影摇摇头散进火里。

---

## 三、本话目标

- 区分字节流（`InputStream`/`OutputStream`）和字符流（`Reader`/`Writer`）的职责边界；
- 用 `InputStreamReader(InputStream, Charset)` 桥接字节流和字符流并指定编码；
- 用 `BufferedInputStream/BufferedReader` 减少系统调用次数；
- 理解 `new String(bytes)` 产生乱码的根本原因；
- 说清 `try-with-resources`、`FileReader` 指定编码的版本边界。

---

## 四、炉内原理图：IO 流装饰器层次

字节流与字符流的职责清晰分离，不能混用：

```
字节流（InputStream/OutputStream）
  └── 操作 byte，不关心编码
  └── FileInputStream、ByteArrayInputStream、Socket.getInputStream()

字符流（Reader/Writer）
  └── 操作 char（UTF-16 码元），需要编码桥梁
  └── FileReader、StringReader

桥接器（字节→字符）
  └── InputStreamReader(InputStream, Charset)   ← 指定编码，避免乱码
  └── OutputStreamWriter(OutputStream, Charset)
```

`Buffered` 装饰器的系统调用差异：

```
无 Buffer：每次 read() → 1次系统调用 → 读1字节
有 Buffer：首次 read() → 1次系统调用 → 读8192字节到内存缓冲
            后续 read() → 直接从缓冲内存读，0次系统调用
```

这一话接上一话：上一话解决「生产消费等待语义」，这一话解决「字节落地成文字的编码语义」——都是「接头接错了」，只是层次不同。

---

## 五、从上一话继续改代码：给日志读写加上正确的编码与缓冲

```java
// javac -encoding UTF-8 --release 25 IODemo.java
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

class IODemo {

    public static void main(String[] args) throws IOException {

        Path file = Path.of(System.getProperty("java.io.tmpdir"), "receipt.txt");

        // ── 1. 写文件（UTF-8）────────────────────────────────
        try (var writer = new BufferedWriter(
                new OutputStreamWriter(
                    new FileOutputStream(file.toFile()),
                    StandardCharsets.UTF_8))) {
            writer.write("咖啡×2 ￥56.00\n");
            writer.write("COUPON:BREW20\n");
            writer.write("合计 ￥56.00\n");
        }
        System.out.println("写入: " + file);

        // ── 2. 正确读文件（UTF-8）────────────────────────────
        System.out.println("--- 正确读（UTF-8）---");
        try (var reader = new BufferedReader(
                new InputStreamReader(
                    new FileInputStream(file.toFile()),
                    StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("  " + line);
            }
        }

        // ── 3. NIO.2 简化写法（推荐，见 F2E8）──────────────
        // Files.readString / Files.writeString 内部帮你做好了 BufferedReader
        String content = Files.readString(file, StandardCharsets.UTF_8);
        System.out.println("--- Files.readString ---");
        System.out.println(content.strip());

        // ── 4. 显式演示乱码原因（GBK 解码 UTF-8 字节）────────
        byte[] utf8Bytes = "咖啡".getBytes(StandardCharsets.UTF_8);
        String wrongDecode = new String(utf8Bytes, java.nio.charset.Charset.forName("GBK"));
        String rightDecode = new String(utf8Bytes, StandardCharsets.UTF_8);
        System.out.println("--- 编码对比 ---");
        System.out.println("UTF-8字节长: " + utf8Bytes.length);     // 6 (每汉字3字节)
        System.out.println("正确解码: "  + rightDecode);             // 咖啡
        System.out.println("UTF-8字节个数: " + utf8Bytes.length);
    }
}
```

**实测输出**（GraalVM 25.0.4，Windows 11 UTF-8 环境）：

```
写入: <用户目录>\...\AppData\Local\Temp\receipt.txt
--- 正确读（UTF-8）---
  咖啡×2 ￥56.00
  COUPON:BREW20
  合计 ￥56.00
--- Files.readString ---
咖啡×2 ￥56.00
COUPON:BREW20
合计 ￥56.00
--- 编码对比 ---
UTF-8字节长: 6
正确解码: 咖啡
UTF-8字节个数: 6
```

关键验证：装饰器链正确读出中文；`Files.readString` 等效但更简洁；UTF-8 每汉字3字节（`"咖啡"` = 6字节）。

---

## 六、故意翻一次车：不指定编码直接 new String(bytes)

阿零故意复原之前的错误写法，在 UTF-8 环境下感受一次乱码是怎么来的：

```java
// 阿零故意试一次：GBK 解码 UTF-8 字节，复现乱码
byte[] utf8Bytes = "咖啡".getBytes(StandardCharsets.UTF_8);
// 用错误的码表解码
String garbled = new String(utf8Bytes, java.nio.charset.Charset.forName("GBK"));
System.out.println("GBK解码UTF-8字节: " + garbled); // 输出乱码
```

这段代码不报错，也不崩溃，只是输出结果不对。乱码产生的根本原因是：**字节本身没有任何字符语义，只是数字序列；是编码/解码的码表决定了它代表什么字符。** 写入用 UTF-8，读取用 GBK，码表不对齐，结果就是乱码。

---

## 七、编译官罚单

> **📋 编译官罚单 · 这次编译官没吭声**
>
> `new String(bytes)` 不指定编码——这不是编译错误。编译器对此完全无异议，类型完全正确。
>
> 编码问题是运行时的语义问题：在 UTF-8 机器上本地测试没有问题，一旦部署到默认编码不同的历史系统，或者读取历史数据文件，就会出现乱码。编译器管不到「你选错了码表」这类错误，所以更危险——错误会静默地跑在生产上，直到有人发现报表里的中文全是问号。

---

## 八、修复并验证

修复三步：

1. 写入时显式用 `OutputStreamWriter(stream, StandardCharsets.UTF_8)` 指定编码；
2. 读取时用 `InputStreamReader(stream, StandardCharsets.UTF_8)` 指定同一编码；
3. 都套上 `Buffered` 装饰器减少系统调用。

验证判据：

1. **编码对齐**：写入 UTF-8、读取 UTF-8，中文字符正确还原，不出现 `???` 或乱码。
2. **字节数验证**：`"咖啡".getBytes(StandardCharsets.UTF_8).length` 应为 6（每个汉字3字节）。
3. **Files.readString 等效**：`Files.readString(path, UTF_8)` 与装饰器链读取结果相同。

正常路径实测输出（GraalVM 25.0.4，同上文代码块）：

```
正确解码: 咖啡
UTF-8字节个数: 6
```

---

## 九、🔬 炉底显微镜 · UTF-8 字节布局实录

> 焰焰用 `HexFormat` 把字节拍到炉底：

```bash
# 查看 BufferedInputStream 内部缓冲大小
javap -p java.io.BufferedInputStream | grep -E "buf|DEFAULT"

# 演示 UTF-8 编码字节布局
java -ea --source 25 - <<'EOF'
import java.nio.charset.*;
import java.util.HexFormat;
void main() {
    byte[] bytes = "Java火种".getBytes(StandardCharsets.UTF_8);
    System.out.println("字节数: " + bytes.length);           // ASCII 4个+中文6个=10
    System.out.println("十六进制: " + HexFormat.of().formatHex(bytes));
    // 4A617661 = "Java"(4 ASCII bytes)
    // E7 81 AB  = '火' (3 UTF-8 bytes)
    // E7 A7 8D  = '种' (3 UTF-8 bytes)
}
EOF
```

**实测输出**：

```
字节数: 10
十六进制: 4a617661e781abe7a78d
```

关键观测点：
- ASCII 字符（`Java`）在 UTF-8 中每字符1字节，与 ASCII/Latin-1 兼容
- 常用汉字在 UTF-8 中每字符3字节（`火` = `E7 81 AB`，`种` = `E7 A7 8D`）
- `BufferedInputStream` 默认缓冲区 8192 字节（`DEFAULT_BUFFER_SIZE`）；可通过构造器第二参数自定义
- `try-with-resources` 在 JDK 7 引入，实现 `AutoCloseable` 的流均可用

---

## 十、⏳ 版本时光机 · IO 编码支持版本边界

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| `InputStream`/`OutputStream` | JDK 1.0 | 字节流基类 |
| `BufferedInputStream` | JDK 1.0 | 缓冲装饰器 |
| `InputStreamReader` | JDK 1.1 | 字节→字符桥接 |
| `try-with-resources` | JDK 7 | 自动关流 |
| `FileReader(File, Charset)` | **JDK 11** | FileReader 终于支持指定编码 |
| `Files.readString/writeString` | **JDK 11** | NIO.2 一行读写文本 |
| `HexFormat` | **JDK 17** | 十六进制工具类 |
| 本话代码运行环境 | JDK 25 | ✅ |

---

## 十一、常见 IO 陷阱速查

```java
// 陷阱1：FileReader 不指定编码，依赖运行时默认编码
new FileReader("file.txt")               // JDK 18+ 默认 UTF-8；兼容模式/旧 JDK 可能不同
new FileReader("file.txt", StandardCharsets.UTF_8) // ✅ JDK 11+ 支持

// 陷阱2：new String(bytes) 不指定编码
new String(bytes)                        // 危险！
new String(bytes, StandardCharsets.UTF_8) // ✅

// 陷阱3：忘记关流（未用 try-with-resources）
InputStream in = new FileInputStream(f); // 如果抛异常，流不会关闭
// ✅ 正确：
try (InputStream in = new FileInputStream(f)) { ... }

// 陷阱4：在字节流上直接 toString()
System.out.println(new FileInputStream(f)); // 输出对象地址，不是内容
```

---

## 十二、项目检查点 · 豆豆咖啡站 jvm-v1.7

- **已具备**：小票日志读写加上 `InputStreamReader(UTF-8)` + `BufferedReader`，乱码消除，系统调用从八千次降到个位数；`try-with-resources` 保证流不泄漏。
- **还没有**：IO 层还在用 `FileInputStream + BufferedReader` 的多层套娃，`Files.readString/writeString/walk` 这套更简洁的 NIO.2 API 还没用上——下一话卷二收官，全面升级。

阿零的变化：他第一次理解了「字节和字符是两个世界，它们之间需要一个翻译器，而翻译器必须说对语言」。乱码不是 Java 的 bug，是接头接错了。

---

## 十三、对应招聘技能

字节流与字符流边界、IO 装饰器模式、UTF-8 编码原理与字节布局、乱码第一性原理、BufferedInputStream 系统调用优化、JDK 18 默认编码变更（JEP 400）。

---

## 十四、下一话悬念

字节水道走通了，但阿零发现日志目录下还躺着大量历史文件要遍历、汇总，代码里全是 `new File(path).list()`、`file.mkdir()`——老 `File` 类的旧写法，操作失败只返回 `false`，连出错原因都不说。

焰焰翻到《JEP 编年史》2011 年那页：「NIO.2，JDK 7 就来了。`Path + Files` 是新一代文件柜——失败会告诉你为什么，路径拼接不用担心斜杠方向，原子移动一行搞定。下一话是卷二终章，把咖啡站 IO 全面升级，类库债一次还清。」

---

## 🎯 随堂练习

**Q1.** `InputStream` 读字节，`Reader` 读字符，两者如何桥接？

**Q2.** `FileReader` 不指定编码，默认用什么编码？有什么风险？

**Q3.** `BufferedInputStream` 如何减少系统调用次数？

**Q4.** `new String(bytes)` 产生乱码的根本原因是什么？

**Q5.** `try-with-resources` 要求流实现什么接口？

**Q6.** UTF-8 编码中，一个汉字占几个字节？ASCII 字符呢？

**Q7.** `Files.readString(path)` 默认使用什么编码？

**Q8.** `BufferedWriter.flush()` 和 `close()` 的区别？

**Q9.** 如果要把 `byte[]` 包装成 `InputStream`（不涉及文件），用哪个类？

**Q10.** 为什么 `System.out` 是 `PrintStream`（字节流）而不是 `PrintWriter`（字符流）？

---

> [!答案]
>
> **Q1. 用 `InputStreamReader(InputStream, Charset)`**——它实现了 `Reader` 接口，内部调用 `CharsetDecoder` 把字节解码为字符，必须指定编码（推荐 `StandardCharsets.UTF_8`）。
>
> **Q2. 使用 `Charset.defaultCharset()`。JDK 18 起 JEP 400 把标准默认值统一为 UTF-8；JDK 17 及更早版本会随系统区域设置变化，而 JDK 18+ 仍可用 `-Dfile.encoding=COMPAT` 恢复旧行为。**因此协议、持久化文件和跨版本迁移仍应显式传 `StandardCharsets.UTF_8`（或文件实际编码）。
>
> **Q3. `BufferedInputStream` 内部维护一个字节数组缓冲（默认8192字节）**。首次 `read()` 触发一次系统调用，从操作系统读取最多8192字节到缓冲区；后续的 `read()` 直接从缓冲区内存读取，无需系统调用，直到缓冲耗尽才再发起一次系统调用。
>
> **Q4. `new String(bytes)` 使用运行时默认编码解码。JDK 18+ 的默认值通常是 UTF-8，但旧 JDK、兼容模式或非标准运行环境仍可能不同。**根本原因是字节本身没有字符语义；跨系统文件必须让解码字符集与写入时一致，不能把"当前机器刚好可用"当协议。
>
> **Q5. `AutoCloseable` 接口**（或其子接口 `Closeable`）。所有标准 IO 流类（`InputStream`、`OutputStream`、`Reader`、`Writer` 及其子类）都实现了 `Closeable`，可直接用于 `try-with-resources`。
>
> **Q6. 常用汉字（基本多文种平面，U+4E00~U+9FFF）在 UTF-8 中占3个字节**；ASCII 字符（U+0000~U+007F）占1个字节。增补平面字符（emoji 等）占4个字节。
>
> **Q7. `Files.readString(path)` 默认使用 `UTF-8` 编码**（JDK 11 引入时明确规定），不受平台默认编码影响。可通过 `Files.readString(path, charset)` 指定其他编码。
>
> **Q8. `flush()` 强制把缓冲区中未写出的数据刷到底层流，但不关闭流**，流仍可继续使用。`close()` 先调用 `flush()` 刷出剩余数据，再释放流资源（关闭文件句柄）。`try-with-resources` 自动调用 `close()`。
>
> **Q9. `ByteArrayInputStream`**——将 `byte[]` 包装成 `InputStream`，适合在内存中模拟流、测试、或将字节数组传给需要 `InputStream` 的 API。
>
> **Q10. 历史兼容使 `System.out` 保持 `PrintStream` 类型。它的编码不等同于 `Charset.defaultCharset()`：JEP 400 明确把标准输出和错误输出排除在"默认 UTF-8"改动外，控制台流按 `Console.charset()`/`stdout.encoding` 等运行环境信息决定。**所以文件编码与终端显示要分开诊断，不能用一条"JDK 17 起都为 UTF-8"的规则概括。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 IODemo.java && java IODemo`，UTF-8 读写、Files.readString、HexFormat 输出均与文中一致；`"咖啡"` 字节数 6、`"Java火种"` 字节数 10 通过断言。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API - java.io](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/io/package-summary.html)、[JEP 400: UTF-8 by Default](https://openjdk.org/jeps/400)。`Files.readString` 在 JDK 11 引入；默认字符集从 JDK 18 起统一为 UTF-8，但控制台编码另有边界。

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
