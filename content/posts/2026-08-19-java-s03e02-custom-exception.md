---
title: "《从零开始学 Java》26 · 自定义业务异常"
date: 2026-08-19
summary: "IllegalStateException 只会喊『状态不对』,说不清哪款缺几杯。这一话造一个会说人话的专属警报 OutOfStockException,把业务信息打包进异常。"
tags: [Java, Java漫画, 自定义异常, Exception, 阿零与豆豆]
---

# 《从零开始学 Java》26 · 自定义业务异常

> 连载特刊 · 第三季「工程时代」第 2 话 · 基线 Java 25(最新 LTS)
> 承接:上一话给下单装了警报,但抛的是通用的 `IllegalStateException`,说不清"缺什么、差多少"。

---

## 一、需求:让警报会"说人话"

上一话美式缺货,警报响了,可它只会喊「状态不对」。收银台想据此做事——**缺货就提示"还差几杯、要不要补单",无此单品就推荐替代**——却发现:所有错误都长一个样,程序区分不出来。

豆豆:「通用异常像'哪里不对'的红灯,能亮,但不告诉你哪儿不对。今天造一个**专属警报**,把缺货的细节直接刻在它身上。」

---

## 二、漫画 · 专属铭牌

> **〔1〕** 库房墙上一排通用红灯,全写着「ERROR」。阿零对着灯发愁:「到底哪台机器缺料啊?」
> 豆豆:「灯只会亮,不会说话。你得给它挂**铭牌**。」

> **〔2〕** 豆豆掏出一块空白铭牌,刻上三行字:`单品:美式` `想要:5` `库存:0`。
> 豆豆:「这就是**自定义异常**——继承 `RuntimeException`,再把业务细节当字段带上。」

> **〔3〕** 阿零手快,造了个新异常却忘了把消息递给"祖宗"。警报亮起,铭牌**一片空白**。
> 阿零:「它……哑巴了?」豆豆(叼豆子):「你没调 `super(消息)`,祖宗那半张嘴没接上。经典翻车,记牢。」

> **〔4〕** 补上 `super(...)`,铭牌亮起完整信息。收银台看一眼就吆喝:「美式缺 5 杯,补单吗?」
> 豆豆:「看,异常不只是'报错',它是**带着上下文的信号**。」

---

## 三、本话目标

- 定义一个继承 `RuntimeException` 的业务异常 `OutOfStockException`;
- 给异常带上结构化字段(单品、需求量、库存),让上层精准响应;
- 踩一次"忘了调 `super(message)` 导致 `getMessage()` 为 null"的坑;
- 理解**异常链 `cause`**:转译异常时别把原始现场弄丢;
- 用测试断言异常携带的业务字段。

---

## 四、原理图:业务异常长什么样

```text
RuntimeException(unchecked,不强制 throws)
      ▲ extends
OutOfStockException
  ├─ String item        缺哪款
  ├─ int requested      顾客要多少
  ├─ int available      实际还剩多少
  └─ super(message)     一句人话,进栈轨迹给人看
```

为什么继承 `RuntimeException` 而不是 `Exception`?业务异常大多选 **unchecked**——否则从 `order()` 到 `main()` 每一层都得写 `throws`,接口被污染。想强制调用方必须处理时,才用 checked。

---

## 五、代码:造一个会说人话的异常

```java
public class OutOfStockException extends RuntimeException {
    private final String item;
    private final int requested;
    private final int available;

    public OutOfStockException(String item, int requested, int available) {
        // ★ 一定要把消息传给父类,否则 getMessage() 和栈轨迹都是空的
        super("库存不足:%s 只剩 %d 杯,却要 %d 杯".formatted(item, available, requested));
        this.item = item;
        this.requested = requested;
        this.available = available;
    }

    public String item() { return item; }
    public int shortfall() { return requested - available; }   // 缺口数量
}
```

上一话的 `order()` 改抛它:

```java
if (qty > left)
    throw new OutOfStockException(name, qty, left);
```

收银台现在能**精准响应**——从异常里直接拿到缺口:

```java
try {
    shop.order("美式", 5);
} catch (OutOfStockException e) {
    System.out.println(e.getMessage());
    System.out.println("👉 " + e.item() + " 还差 " + e.shortfall() + " 杯,已通知补货");
}
```

---

## 六、故意制造一个 Bug:忘了调 super

把构造器里那行 `super(...)` 删掉:

```java
public OutOfStockException(String item, int requested, int available) {
    this.item = item;          // ← 故意:没有 super("...消息...")
    this.requested = requested;
    this.available = available;
}
```

---

## 七、读懂现象:哑巴异常

抛出后打印栈轨迹,变成这样:

```text
Exception in thread "main" OutOfStockException
	at CoffeeShop.order(CoffeeShop.java:20)
	at CoffeeShop.main(CoffeeShop.java:31)
```

`e.getMessage()` 返回 **`null`**,冒号后那句人话**消失了**。异常类型对,但铭牌空白——排障的人只知道"缺货了",不知道"缺哪款、差多少"。

根因:`Throwable` 的消息存在**父类**里,只有 `super(message)` 才能写进去。你不调,那半张嘴就没接上。补回 `super(...)` 即恢复。

> **⏳ 版本时光机 · 异常链 `cause`:转译时别丢现场**

| JDK 版本 | 能力 | 说明 |
|---|---|---|
| Java 1.3 及以前 | 异常只能带一句消息 | 转译后原始异常**丢失**,现场断线 |
| Java 1.4+ | **异常链**:`new XxxException(msg, cause)` 或 `initCause()` | 保留"根本原因",栈轨迹里出现 `Caused by:` |

当你在 `catch` 里把底层异常转成业务异常时,**一定要把原始异常当 `cause` 传进去**:

```java
catch (IOException e) {
    throw new OrderException("读订单文件失败", e);   // 第二参 = cause,栈轨迹会带 Caused by
}
```

丢了 `cause`,等于案发现场只留一句结论、没有监控录像。想支持 `cause`,给自定义异常再加一个 `(String, Throwable)` 构造器转调 `super(message, cause)` 即可。

> **🎯 面试直击**:自定义异常应该继承 `Exception` 还是 `RuntimeException`?
> 看你想不想**强制**调用方处理。继承 `Exception`(checked)→ 编译器逼每层 `try`/`throws`,适合"必须被处理的可恢复错误";继承 `RuntimeException`(unchecked)→ 不逼,适合业务规则违例(库存不足、参数非法)。现代业务代码与 Spring 生态**主流选 unchecked**,保持调用链干净、用统一异常处理器兜底(S4E05 会讲)。

---

## 八、修复后用测试钉死

不仅测"抛没抛",还要测"铭牌信息对不对":

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class OutOfStockTest {
    @Test
    void carries_business_fields() {
        CoffeeShop shop = new CoffeeShop();   // 美式库存 1
        OutOfStockException e = assertThrows(
            OutOfStockException.class, () -> shop.order("美式", 5));
        assertEquals("美式", e.item());
        assertEquals(4, e.shortfall());       // 要 5 剩 1,缺口 4
        assertNotNull(e.getMessage());        // 别再哑巴
    }
}
```

`assertThrows` 会**返回**捕获到的异常对象,于是你能继续断言它的字段——这正是自定义异常的价值:异常本身就是一份可编程的数据。

---

## 九、项目检查点 · 豆豆咖啡站 v2.2

```text
新增:OutOfStockException 业务异常,携带 单品/需求/库存/缺口,上层可精准响应
用到:继承 RuntimeException、super(message)、异常链 cause、assertThrows 返回值
还没有:关掉程序,菜单和库存就全没了 —— 下一话把数据存进文件
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 自定义异常设计 | 业务系统标配;CR 会看你异常语义清不清晰 |
| checked vs unchecked 选型 | 面试进阶追问,能答出"为什么 Spring 用 unchecked"加分 |
| 异常链 cause | 排障硬功:`Caused by` 读法、转译不丢现场 |

---

## 十一、下一话悬念

咖啡站的菜单和库存现在全在内存里——**一关程序,全部清零**。明天开门又得从头录入。

> 下一话《文件与 Path API》:阿零用 `java.nio` 的 `Files` / `Path` 把菜单写进文件、再读回来,让咖啡站**关了机也记得住**。顺便,上一话预告的 `try-with-resources` 这次真的登场。

---

## 🎯 随堂练习
先自己做，再对答案。选择难度递进，解答从概念到综合，代码含边界验证。

### 一、选择题（10 道）

1. [基础] 自定义业务异常最常见的做法是继承？
- A) `Throwable`　B) `Error`　C) `Exception` 或 `RuntimeException`　D) 任意类

2. [基础] 自定义异常构造器中忘记调 `super(message)` 的后果是？
- A) 编译失败　B) `getMessage()` 返回 `null`　C) 栈轨迹完全空白　D) 异常类型被改变

3. [基础] try-with-resources 要求资源实现哪个接口？
- A) `Closeable`　B) `Serializable`　C) `AutoCloseable`　D) `Runnable`

4. [进阶] `OutOfStockException` 继承 `RuntimeException` 而非 `Exception` 的原因是？
- A) 可以携带自定义字段　B) 不强制每层 `throws`，避免污染接口　C) 运行时效率更高　D) `Exception` 不允许自定义构造器

5. [进阶] 在 catch 块中把 `IOException` 转译为 `OrderException` 时，应该怎么写？
- A) `throw new OrderException("失败");`　B) `throw new OrderException("失败", e);`　C) `throw e;`　D) `return new OrderException("失败", e);`

6. [进阶] try-with-resources 关闭多个资源的顺序是？
- A) 声明顺序　B) 声明顺序的逆序　C) 随机顺序　D) 按资源类型排序

7. [进阶] 如果 try 块和 close() 都抛异常，try-with-resources 会怎么处理？
- A) close 的异常覆盖 try 的异常　B) try 的异常为主，close 的异常被**压制(suppressed)**　C) 两个异常同时抛出　D) 编译期报错

8. [综合] 以下自定义异常类**缺少**什么？
```java
public class PaymentException extends RuntimeException {
    private final String orderId;
    public PaymentException(String orderId) {
        this.orderId = orderId;
    }
}
```
- A) 缺少 `getMessage()`　B) 缺少 `super(消息)`，导致 `getMessage()` 为 null　C) 缺少 getter 方法　D) 缺少无参构造器

9. [综合] 关于 try-with-resources 和手动 finally 关闭流，说法**错误**的是？
- A) try-with-resources 代码更短　B) 手动 finally 忘关流可能导致资源泄漏　C) try-with-resources 只能用在一个资源上　D) try-with-resources 自动逆序关闭

10. [综合] 自定义异常除了业务字段，还应该提供哪类构造器？
- A) 只有无参构造器　B) 只有带 message 的　C) 带 `(String message, Throwable cause)` 的异常链构造器　D) 不需要额外构造器

> [!答案] **1-C** `Exception`（checked）或 `RuntimeException`（unchecked）。不要继承 `Throwable`（太底层）或 `Error`（系统级）。**举一反三**：现代业务系统主流选 unchecked，配合统一异常处理器兜底。
> [!答案] **2-B** Throwable 的消息存在父类中，调 `super(message)` 才会写入。不调则铭牌空白，排障时只知道异常类型，不知道具体原因。**举一反三**：写自定义异常时，构造器第一行永远是 `super(有意义的消息)`。
> [!答案] **3-C** `AutoCloseable` 接口。`Closeable` 是它的子接口（专用于 IO）。**举一反三**：几乎所有 JDK 流/连接都实现了 `AutoCloseable`，可以直接放进 `try()` 括号。
> [!答案] **4-B** unchecked 不强制调用方写 `throws`，保持接口干净。如果选 checked，从 `order()` 到 `main()` 每一层都得声明。**举一反三**：除非你**必须**逼调用方处理，否则业务异常默认选 unchecked。
> [!答案] **5-B** 第二参 `e` 就是 cause，保留 `Caused by: IOException` 链。只写消息不带 cause，等于案发现场只留结论没有监控。**举一反三**：让你的自定义异常支持 `(String, Throwable)` 构造器。
> [!答案] **6-B** 逆序关闭。例如 `try (a; b; c)` 关闭顺序是 c→b→a。**举一反三**：逆序关闭可以避免"前一个资源还没用完，后一个资源就先关了"的时序问题。
> [!答案] **7-B** try 的异常是"主异常"，close 的异常被压制，可以通过 `e.getSuppressed()` 查看。**举一反三**：手动 finally 关闭时 close 的异常会直接覆盖 try 的异常——这也是 try-with-resources 的一个重要优势。
> [!答案] **8-B** 消息由父类管理，必须 `super(消息)`。当前写法 `getMessage()` 返回 null，栈轨迹只有异常类型没有说明。**举一反三**：IDE 的"生成构造器"功能会自动帮你加上 `super(message)`。
> [!答案] **9-C** try-with-resources 可以声明多个资源，用分号 `;` 分隔。说法错误的是 C。**举一反三**：`try (var in = ...; var out = ...)` 两个资源都会被自动关闭。
> [!答案] **10-C** 异常链构造器是标配：业务异常除了自身信息，还应能承载底层原因。标配三个构造器：无参、`(String)`、`(String, Throwable)`。**举一反三**：加上 `serialVersionUID` 避免序列化警告（IDE 通常自动提示）。

### 二、解答题（3 道）

1. [概念] try-with-resources 相比手动 finally 关闭资源有哪些优势？如果在 try 块和 close() 时都发生了异常，两种方式的行为有何关键差异？

2. [场景] 咖啡站现在有 3 种业务错误——"库存不足"、"菜单无此单品"、"支付失败"。请设计一个异常类层次：哪些用 checked、哪些用 unchecked？每个异常该携带哪些结构化字段？

3. [综合] 一个文件导入功能：先读文件，再解析每一行，最后写入数据库。如果读文件失败（`IOException`）、某行格式错误（`NumberFormatException`）、数据库写入失败（`SQLException`），你打算在哪一层分别捕获、如何转译、是否需要保留 cause？画出异常处理全链路。

> [!答案] **1** 优势：①代码更短，不需要手写 finally；②多资源自动逆序关闭；③close() 异常被压制而非覆盖主异常。行为差异：手动 finally——close() 异常会直接覆盖 try 异常（原始错误丢失）；try-with-resources——try 异常为主，close 的异常作为 suppressed 附加，可通过 `getSuppressed()` 获取。**举一反三**：try-with-resources 是 Java 7 引入的，要求资源实现 `AutoCloseable`。
> [!答案] **2** 层次设计：`BusinessException(RuntimeException)` 为基类，三个子类——`OutOfStockException`(unchecked，字段：item、requested、available、shortfall)、`UnknownItemException`(unchecked，字段：item)、`PaymentException`(unchecked，字段：orderId、amount、reason)。全部选 unchecked 的理由：这些是业务规则违例，不是"可恢复的外部意外"，让上层用全局异常处理器统一处理。**举一反三**：如果支付失败需要调用方**必须**重试（不可忽略），`PaymentException` 可以考虑 checked。
> [!答案] **3** 全链路：①读文件层——catch `IOException`，转为 `ImportException("文件读取失败", e)`（保留 cause），中断导入；②解析层——catch `NumberFormatException`，转为 `ImportException("第X行格式错误:" + line, e)`，可设计为"跳过该行继续"；③数据库层——catch `SQLException`，转为 `ImportException("写入失败,行:" + line, e)`，考虑事务回滚。每一层转译都带 cause，最终上层只需要 catch `ImportException`，通过 `getCause()` 追溯根因。**举一反三**：不要在底层直接打印日志然后吞掉——统一在入口处记录。

### 三、代码题（2 道）

1. [基础] 定义一个 `InsufficientBalanceException`（继承 `RuntimeException`），携带字段 `balance`（当前余额）和 `needed`（所需金额），构造器生成消息 `"余额不足：当前%.2f元，需要%.2f元"`。写一个 `pay(balance, amount)` 方法，余额不足时抛该异常。在 main 中用 try-catch 调用，catch 中打印 `getMessage()` 和缺口 `(needed - balance)`。

2. [综合] 用 try-with-resources 实现复制文件功能：`copyFile(Path src, Path dest)`。要求：①用 `BufferedReader` + `BufferedWriter` 逐行复制；②用 try-with-resources 管理两个流；③如果源文件不存在，包装成 `FileCopyException`（继承 `RuntimeException`，带 cause）；④在 main 中调用并验证异常链。

> [!答案] **1 验收**：
> ```java
> class InsufficientBalanceException extends RuntimeException {
>     private final double balance;
>     private final double needed;
>     public InsufficientBalanceException(double balance, double needed) {
>         super("余额不足：当前%.2f元，需要%.2f元".formatted(balance, needed));
>         this.balance = balance;
>         this.needed = needed;
>     }
>     public double balance() { return balance; }
>     public double shortage() { return needed - balance; }
> }
> static void pay(double balance, double amount) {
>     if (amount > balance)
>         throw new InsufficientBalanceException(balance, amount);
>     System.out.println("支付成功，余额：" + (balance - amount));
> }
> public static void main(String[] args) {
>     try { pay(50, 100); }
>     catch (InsufficientBalanceException e) {
>         System.out.println(e.getMessage());    // 余额不足：当前50.00元，需要100.00元
>         System.out.println("还差：" + e.shortage() + "元"); // 还差：50.0元
>     }
> }
> ```
> **举一反三**：`super(message)` 的消息进了栈轨迹的第一行，是排障的第一眼信息，绝不能省略或写死一个空串。
> [!答案] **2 验收**：
> ```java
> class FileCopyException extends RuntimeException {
>     public FileCopyException(String msg, Throwable cause) { super(msg, cause); }
> }
> static void copyFile(Path src, Path dest) {
>     try (var reader = Files.newBufferedReader(src);
>          var writer = Files.newBufferedWriter(dest)) {
>         String line;
>         while ((line = reader.readLine()) != null) {
>             writer.write(line);
>             writer.newLine();
>         }
>     } catch (NoSuchFileException e) {
>         throw new FileCopyException("源文件不存在：" + src, e);
>     } catch (IOException e) {
>         throw new FileCopyException("复制失败：" + src + " → " + dest, e);
>     }
> }
> public static void main(String[] args) throws IOException {
>     Path src = Path.of("source.txt");
>     Files.writeString(src, "第一行\n第二行\n");
>     Path dest = Path.of("target.txt");
>     copyFile(src, dest);
>     System.out.println(Files.readString(dest)); // 第一行\n第二行\n
>     // 边界：源文件不存在
>     try { copyFile(Path.of("no.txt"), Path.of("out.txt")); }
>     catch (FileCopyException e) {
>         System.out.println(e.getCause().getClass().getSimpleName()); // NoSuchFileException
>     }
> }
> ```
> **举一反三**：try-with-resources 会自动逆序关闭两个流——先关 writer 再关 reader，顺序正确且不会覆盖异常。

---

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
