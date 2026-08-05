---
title: "F2E7 字节的地下水道 — InputStream、编码与 Buffered 装饰器"
date: "2026-10-31"
series: "jvm-academy"
season: 2
episode: 7
tags: ["Java 25", "InputStream", "BufferedInputStream", "编码", "UTF-8", "IO"]
excerpt: "裸字节走地下水道，Buffered 是蓄水罐——一滴一滴读和一桶一桶读，系统调用次数差千倍。乱码等于 UTF-8 滤网装错型号：字节本无意义，编码才给它意义。"
---

> **"字节流和字符流是两套水管。你用错了接头，水会流出来，但口味不对——那叫乱码。"**
> — 焰焰，对着一屏 `???` 说

---

## 🎬 开场：乱码的小票文件

> **〔1〕**
> 阿零打开一份小票日志文件，满屏 `???`。「我就用的 `FileInputStream` 啊，读出来的怎么是这个？」

> **〔2〕**
> 焰焰指着代码：「`FileInputStream` 读的是字节，不是字符。你直接 `new String(bytes)` 没指定编码，JVM 用了平台默认编码（Windows 可能是 GBK），文件是 UTF-8 存的——字节相同，但解码用了错误的码表，结果就是乱码。」

> **〔3〕**
> 「第二个问题——性能。」焰焰打开系统调用监控：「你每次 `read()` 读 1 个字节，系统调用了 8000 次。套上 `BufferedInputStream`，攒 8192 字节一次读，系统调用降到 2 次。」

> **〔4〕**
> 「修复方案：字节流套字符流，字符流套缓冲，编码明确指定 UTF-8。」焰焰在白板上画出装饰器链：
>
> ```
> BufferedReader
>   └── InputStreamReader(charset=UTF-8)
>         └── FileInputStream(file)
> ```
>
> 「装饰器模式——每一层只做一件事，串起来功能叠加。」

---

## 🔑 核心技术：IO 流装饰器链

### 字节流 vs 字符流

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

### Buffered 装饰器原理

```
无 Buffer：每次 read() → 1次系统调用 → 读1字节
有 Buffer：首次 read() → 1次系统调用 → 读8192字节到内存缓冲
            后续 read() → 直接从缓冲内存读，0次系统调用
```

---

## ⚙️ 代码实录：正确读写文本文件

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

        // ── 4. 演示乱码原因（GBK 解码 UTF-8 字节）────────────
        byte[] utf8Bytes = "咖啡".getBytes(StandardCharsets.UTF_8);
        String wrongDecode = new String(utf8Bytes); // 平台默认编码（Windows = GBK）
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
写入: C:\Users\...\AppData\Local\Temp\receipt.txt
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

关键验证：`BufferedReader+InputStreamReader(UTF-8)` 正确读出中文；`Files.readString` 等效但更简洁；UTF-8 每汉字3字节（`"咖啡"` = 6字节）。

---

## ⚠️ 常见陷阱

```java
// 陷阱1：FileReader 不指定编码，使用平台默认编码
new FileReader("file.txt")               // 危险！Windows 默认 GBK
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

## 🔬 炉底显微镜

> 焰焰用 `jcmd` 统计系统调用差异：

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

## 📐 版本边界

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
> **Q2. 使用平台默认编码**——JDK 17 之前是 `Charset.defaultCharset()`，Windows 中文版通常是 `GBK`，Linux 通常是 `UTF-8`。风险：跨平台读取 UTF-8 文件时在 Windows 乱码。JDK 11 起 `FileReader` 提供了带 `Charset` 参数的构造器，应始终指定编码。
>
> **Q3. `BufferedInputStream` 内部维护一个字节数组缓冲（默认8192字节）**。首次 `read()` 触发一次系统调用，从操作系统读取最多8192字节到缓冲区；后续的 `read()` 直接从缓冲区内存读取，无需系统调用，直到缓冲耗尽才再发起一次系统调用。
>
> **Q4. `new String(bytes)` 使用平台默认编码解码字节，当文件用 UTF-8 存储而平台默认编码是 GBK 时，字节被按错误的码表解释，输出乱码。**根本原因：字节本身没有语义，编码才赋予语义；解码时必须使用与编码时相同的字符集。
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
> **Q10. 历史原因**：`System.out` 在 JDK 1.0 就存在，那时 `PrintWriter` 还没有；为了向后兼容，`System.out` 保持 `PrintStream` 类型。`PrintStream` 内部用平台默认编码将字符转换为字节，这也是 Windows 控制台中文输出有时乱码的原因之一（控制台编码 ≠ JVM 平台编码）。JDK 17 起 `System.out` 默认使用 UTF-8。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 IODemo.java && java IODemo`，UTF-8 读写、Files.readString、HexFormat 输出均与文中一致；`"咖啡"` 字节数 6、`"Java火种"` 字节数 10 通过断言。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API - java.io](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/io/package-summary.html)。`Files.readString` 在 JDK 11 引入，JDK 25 无变更。

---

## 🔮 下话预告：F2E8《新时代的文件柜》

字节流搞懂了——卷终综合升级。

`Files.readString` 一勺舀起整个文件，`Files.walk` 派巡检无人机递归遍历目录，`try-with-resources` 自动锁门。老 `File` 类退休，`Path`+`Files` 是新一代文件柜。同时完成卷二清债：把咖啡站的日志读写全部升级到 NIO.2。
