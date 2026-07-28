---
title: "《从零开始学 Java》25 · 异常警报系统"
date: 2026-08-18
summary: "顾客点 5 杯、库存只剩 1 杯,整台咖啡机当场崩溃、后面排队的全被赶走。这一话给咖啡站装上异常警报:单笔出错,不再拖垮整机。"
tags: [Java, Java漫画, 异常处理, Exception, 阿零与豆豆]
---

# 《从零开始学 Java》25 · 异常警报系统

> 连载特刊 · 第三季「工程时代」第 1 话 · 基线 Java 25(最新 LTS)
> 承接:第二季交付的 OOP 咖啡站 v2 —— 对象、集合都齐了,可它一遇意外就**整台崩**。

---

## 一、事故:一杯卖崩一整台机器

第三季开张第一天,OOP 咖啡站 v2 上线。第一位顾客点了 5 杯美式——库存只剩 1 杯。

程序"啪"地抛出一串红字,**整个进程退出**。结果不是"这一单没做成",而是**后面排队的所有顾客一起被赶出门**。

豆豆:「能跑不叫本事。**出了意外还能稳住**,才叫工程。今天给咖啡站装警报器。」

第二季我们让代码"能运行";这一季从"能运行"走向"可维护",第一站就是——别让一个意外掀翻全场。

---

## 二、漫画 · 异常警报系统

> **〔1〕** 大堂正中一根红色警报柱。平时沉默,一旦出事"哇——"地亮起。
> 豆豆:「这就是**异常(Exception)**。程序撞上没法正常走下去的情况,就拉响它。」

> **〔2〕** 警报柱背后浮起一棵家谱树,顶上刻着 `Throwable`。
> 豆豆:「所有能被『抛(throw)』和『接(catch)』的东西,祖宗都是 `Throwable`。它下面分两支——`Error` 和 `Exception`。」

> **〔3〕** 左边一支 `Error` 阴森森的:`OutOfMemoryError`、`StackOverflowError`。
> 豆豆:「`Error` 是系统级塌方,比如内存耗尽。**这一支别去接**,接了也救不回来。」

> **〔4〕** 右边 `Exception` 又叉成两股:一股贴着红色『编译期强制』封条(checked),一股是运行期才炸的 `RuntimeException`(unchecked)。
> 阿零:「所以……贴红封条那股,编译官会逼我处理?」豆豆:「聪明。你终于开始像工程师那样问问题了。」

> **〔5〕** 阿零手一抖没接住警报,警报柱轰然倒塌,压灭了一整排顾客的对话气泡。
> 豆豆(叼着豆子):「瞧,不处理异常长这样——**一个没接,全场陪葬**。」

---

## 三、本话目标

- 看懂 `Throwable` 家谱:`Error` / checked / unchecked 各是什么、该不该接;
- 用 `throw` 主动抛异常,表达"这单没法正常做";
- 用 `try / catch / finally` 兜住单笔失败,不拖垮整机;
- 读懂**栈轨迹(stack trace)**,一眼定位出事那一行;
- 用 `assertThrows` 给"该报错的地方"写测试。

---

## 四、原理图:Throwable 家谱

```text
Throwable ──────────────── 一切异常的祖宗,能被 throw / catch
├── Error                  系统级塌方,别接:OutOfMemoryError、StackOverflowError
└── Exception
    ├── RuntimeException   【unchecked】编译器不强制处理,多是"程序 Bug"
    │     IllegalArgumentException  IllegalStateException  NullPointerException …
    └── 其它 Exception      【checked】编译器强制你处理,多是"外部意外"
          IOException  SQLException …
```

判断口诀:**继承自 `RuntimeException` 的是 unchecked,其余 `Exception` 是 checked。** checked 编译官会盯着你处理;unchecked 不盯——但不盯不等于能不管。

---

## 五、代码:给下单装上警报

在第二季的对象模型上,新增一个 `CoffeeShop` 管库存(库存正好用上一季学的 `Map`):

```java
import java.util.HashMap;
import java.util.Map;

public class CoffeeShop {
    private final Map<String, Integer> stock = new HashMap<>();

    CoffeeShop() {
        stock.put("美式", 1);
        stock.put("拿铁", 5);
    }

    // 库存不足时,主动抛异常,表达"这单没法做"
    void order(String name, int qty) {
        Integer left = stock.get(name);
        if (left == null)
            throw new IllegalArgumentException("菜单里没有:" + name);
        if (qty > left)
            throw new IllegalStateException(
                "库存不足:%s 只剩 %d 杯,却要 %d 杯".formatted(name, left, qty));
        stock.put(name, left - qty);
        System.out.println("✅ 出杯:" + name + " × " + qty);
    }
}
```

`IllegalArgumentException`(参数不对)和 `IllegalStateException`(状态不允许)都是 `RuntimeException` 的子类,是 Java 内置、语义清晰的"标准件"。先用它们,下一话再造自己的。

---

## 六、故意制造一个 Bug:不接警报

先看**完全不处理**会怎样:

```java
public static void main(String[] args) {
    CoffeeShop shop = new CoffeeShop();
    shop.order("美式", 1);   // ✅ 出杯
    shop.order("美式", 5);   // 💥 库存只剩 0,这里抛异常
    shop.order("拿铁", 2);   // ← 永远执行不到
}
```

---

## 七、读懂真实报错:栈轨迹

第二单抛出后没人接,异常一路"冒泡"到 `main` 之外,JVM 打印栈轨迹并**终止整个程序**:

```text
Exception in thread "main" java.lang.IllegalStateException: 库存不足:美式 只剩 0 杯,却要 5 杯
	at CoffeeShop.order(CoffeeShop.java:18)
	at CoffeeShop.main(CoffeeShop.java:26)
```

栈轨迹**从上往下读 = 从"出事点"到"最外层调用者"**:

- 第一行:异常类型 + 你写的那句消息 —— 先看它,八成能猜到原因;
- `at CoffeeShop.order(...:18)` —— 真正抛出的那一行,**直接跳过去**;
- `at CoffeeShop.main(...:26)` —— 是谁调用了它。

关键后果:第三单「拿铁 2 杯」库存明明够,却因为**前一单把整个程序带崩了**而根本没机会执行。这就是事故的本质——不是一单失败,是全店打烊。

---

## 八、修复:用 try/catch 兜住单笔失败

把每一单包进 `try`,单笔出错只记一笔、继续服务下一位:

```java
public static void main(String[] args) {
    CoffeeShop shop = new CoffeeShop();
    String[][] orders = {{"美式", "1"}, {"美式", "5"}, {"拿铁", "2"}};
    for (String[] o : orders) {
        try {
            shop.order(o[0], Integer.parseInt(o[1]));
        } catch (IllegalStateException e) {
            System.out.println("⚠️ 拒单:" + e.getMessage());     // 库存不足
        } catch (IllegalArgumentException e) {
            System.out.println("⚠️ 无此单品:" + e.getMessage());
        } finally {
            System.out.println("—— 本单处理完毕 ——");            // 无论成败都执行
        }
    }
}
```

输出:

```text
✅ 出杯:美式 × 1
—— 本单处理完毕 ——
⚠️ 拒单:库存不足:美式 只剩 0 杯,却要 5 杯
—— 本单处理完毕 ——
✅ 出杯:拿铁 × 2
—— 本单处理完毕 ——
```

美式那单被拒,**拿铁那单照常做成**。警报响过,机器还稳稳站着。

`finally` 里的代码**无论 try 成功、还是 catch 兜住,都会执行**,常用来收尾(关文件、还连接)——下一话讲文件时你会天天见它。

> **豆豆锐评 · 绝不写"空 catch"**
> `catch (Exception e) {}` —— 接住异常却什么都不做,是新手最致命的习惯。它等于把警报器的线剪了:出了事你毫不知情,Bug 一路潜伏到线上才爆。**至少也要打印或记日志。**

> **⏳ 版本时光机 · 接多种异常的写法怎么变的**

| JDK 版本 | 写法 | 变化 |
|---|---|---|
| Java 6 | 每种异常各写一个 `catch` 块 | 处理逻辑相同也得重复 |
| Java 7+ | **多重 catch**:`catch (IOException \| SQLException e)` | 一个竖线合并同类处理 |
| Java 7+ | **try-with-resources**:`try (var in = ...) { }` | 自动关闭资源,告别手写 `finally` 关流(E03 就用) |

上面美式、拿铁两种异常若处理方式相同,可合并成 `catch (IllegalStateException | IllegalArgumentException e)`。

> **🎯 面试直击**:checked 和 unchecked 异常有什么区别?
> checked(如 `IOException`)继承自 `Exception` 但不是 `RuntimeException`,**编译器强制**你 `try` 或 `throws`,用于"调用方有理由预期并处理"的外部意外;unchecked(`RuntimeException` 及子类)编译器不强制,多表示程序 Bug(参数非法、空指针)。追问点:Spring 等框架偏爱 unchecked,因为不逼业务代码到处 `throws`,接口更干净。

---

## 九、用测试钉死"该抛的地方真的抛"

异常路径和正常路径一样值得测:

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CoffeeShopTest {
    @Test
    void reject_when_stock_not_enough() {
        CoffeeShop shop = new CoffeeShop();
        assertThrows(IllegalStateException.class, () -> shop.order("美式", 999));
    }

    @Test
    void reject_unknown_item() {
        CoffeeShop shop = new CoffeeShop();
        assertThrows(IllegalArgumentException.class, () -> shop.order("豆浆", 1));
    }
}
```

`assertThrows` 断言"这段代码必须抛出指定异常"——它捕获并返回那个异常对象,你还能进一步断言消息内容。

---

## 十、项目检查点 · 豆豆咖啡站 v2.1

```text
新增:下单具备异常兜底 —— 单笔失败(库存不足 / 无此单品)不再拖垮整机
用到:Throwable 家谱、throw、try/catch/finally、栈轨迹、assertThrows
还没有:异常类型还在借用 IllegalStateException 这种"通用件",
        表达不出"库存不足"这种业务语义 —— 下一话造自己的异常
```

---

## 十一、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 异常体系 / checked vs unchecked | Java 面试必考,几乎每轮都问 |
| try/catch/finally 正确使用 | CR 高频:空 catch、吞异常是明确减分项 |
| 读栈轨迹定位问题 | 线上排障第一步,决定你多快找到病灶 |
| 给异常路径写测试 | `assertThrows`,资深工程师的基本功 |

---

## 十二、下一话悬念

现在库存不足抛的是 `IllegalStateException` —— 它能说"状态不对",却说不清"到底是**哪款、还差几杯**"。上层想按不同错误做不同响应(缺货就提示补货、无此单品就推荐替代),靠通用异常很难优雅区分。

> 下一话《自定义业务异常》:阿零给咖啡站造第一个"专属警报"——`OutOfStockException`,把缺货的单品名、缺口数量一起打包进异常,让上层一眼看懂、精准响应。

---

## 🎯 随堂练习
先自己做，再对答案。选择难度递进，解答从概念到综合，代码含边界验证。

### 一、选择题（10 道）

1. [基础] 下列哪个类是 Java 异常体系的根？
- A) `Exception`　B) `Throwable`　C) `Error`　D) `RuntimeException`

2. [基础] `finally` 块在什么情况下**不会**执行？
- A) `try` 中有 `return`　B) `try` 块中抛异常　C) JVM 崩溃或 `System.exit()`　D) `catch` 块中有异常

3. [基础] 关于 checked 异常，说法正确的是？
- A) 继承自 `Error`　B) 编译器不强制处理　C) 必须 `try-catch` 或 `throws`　D) 都是 `RuntimeException` 的子类

4. [进阶] 阅读以下栈轨迹，真正抛出异常的是哪一行？
```text
Exception ... IllegalStateException: 库存不足
    at CoffeeShop.order(CoffeeShop.java:18)
    at CoffeeShop.main(CoffeeShop.java:26)
```
- A) main 的第 26 行　B) order 的第 18 行　C) 两行都有可能　D) 需要从下往上读

5. [进阶] `catch (Exception e)` 写在 `catch (IllegalStateException e)` 前面会怎样？
- A) 正常运行，自动匹配　B) 编译报错 "unreachable"　C) 运行时忽略顺序　D) 只有第二个 catch 生效

6. [进阶] 以下哪个是 **unchecked** 异常？
- A) `IOException`　B) `SQLException`　C) `NullPointerException`　D) `ClassNotFoundException`

7. [进阶] `throw` 和 `throws` 的区别是？
- A) 完全相同，只是写法差异　B) `throw` 抛异常实例，`throws` 声明可能抛的类型　C) `throws` 在方法体内，`throw` 在方法签名　D) `throw` 只能用于 checked 异常

8. [进阶] 异常链中 `cause` 参数（`new XxxException(msg, cause)`）的作用是？
- A) 替代原始异常　B) 保留 `Caused by` 链，不丢根本原因　C) 自动修复异常　D) 抑制栈轨迹输出

9. [综合] 为什么"空 catch 块"是新手最致命的习惯？
- A) 编译失败　B) 吞掉异常，Bug 静默潜伏，线上无从排查　C) 性能严重下降　D) 违反 Java 语法

10. [综合] Java 7 引入的多重 catch 语法是？
- A) `catch (IOException, SQLException e)`　B) `catch (IOException | SQLException e)`　C) `catch (IOException & SQLException e)`　D) `catch (IOException || SQLException e)`

> [!答案] **1-B** `Throwable` 是所有异常的祖宗，只有它和它的子类能被 `throw`/`catch`。**举一反三**：不要直接继承 `Throwable`——语义太重，从 `Exception` 或 `RuntimeException` 继承即可。
> [!答案] **2-C** `finally` 几乎总是执行；唯一例外是 JVM 崩溃、`System.exit()` 被调用、或守护线程被强制终止。**举一反三**：不要在 `finally` 中写 `return`，它会吞掉 `try` 中的异常和返回值。
> [!答案] **3-C** checked 异常（`Exception` 除 `RuntimeException` 外）编译器强制处理。**举一反三**：`IOException`、`SQLException` 是典型 checked 异常。
> [!答案] **4-B** 栈轨迹 `at` 第一行就是抛出异常的**精确位置**。先看异常类型和消息，再直接跳 `at` 第一行定位。**举一反三**：栈轨迹从上往下 = 从出事点到最外层调用者。
> [!答案] **5-B** `catch` 必须从具体到宽泛（先子类后父类），否则父类的 catch 覆盖了子类，编译器报 unreachable。**举一反三**：`catch (Exception e)` 放最后兜底。
> [!答案] **6-C** `NullPointerException` 继承自 `RuntimeException`，是 unchecked。其它三个都是 checked。**举一反三**：判断口诀——继承自 `RuntimeException` 的就是 unchecked。
> [!答案] **7-B** `throw` 是动作（抛出一个异常实例），写在方法体内；`throws` 是声明，写在方法签名上。**举一反三**：override 时子类 `throws` 的范围不能比父类更宽。
> [!答案] **8-B** 把底层异常作为 `cause` 传入，栈轨迹显示 `Caused by: ...`，完整保留因果链。**举一反三**：catch 中做异常转译时，**必须**把原异常当 cause 传进去。
> [!答案] **9-B** `catch (Exception e) {}` 吞掉异常，程序继续运行但 Bug 悄然潜伏。**举一反三**：至少打印日志或重抛 —— `throw new RuntimeException(e)`。
> [!答案] **10-B** 竖线 `|` 合并多个异常类型，共用一段处理。**举一反三**：多重 catch 的变量 `e` 是隐式 `final` 的，不能重新赋值。

### 二、解答题（3 道）

1. [概念] checked 异常和 unchecked 异常各举两个 Java 内置类的例子，说明各自适合的使用场景。为什么 Spring 生态偏爱 unchecked？

2. [场景] 方法 A 调用方法 B，B 调用方法 C。C 中抛出一个 checked 异常 `IOException`，但 C 和 B 都没有 `try-catch`。请描述异常传播路径，以及 A 和 B 各需要做什么才能让代码编译通过。

3. [综合] 你正在设计一个库存管理 API 的异常策略，包含三个操作：`checkout(item, qty)`（出库）、`queryStock(item)`（查库存）、`restock(item, qty)`（入库）。哪些异常应该用 checked 强制调用方处理，哪些用 unchecked？说明理由并画出异常类层次。

> [!答案] **1** checked 示例：`IOException`（文件/网络不可控）、`SQLException`（数据库连接失败）——用于"调用方有理由预期并能恢复"的外部意外。unchecked 示例：`NullPointerException`、`IllegalArgumentException`——表示程序 Bug，应让它崩出来暴露。Spring 偏爱 unchecked 的原因：不污染业务接口签名、配合全局异常处理器兜底。**举一反三**：checked 的代价是每一层都要 `throws` 或 `try`——调用链越长，污染越重。
> [!答案] **2** C 抛 `IOException` 后，异常沿调用栈向上冒泡：C→B→A→JVM。B 没有 catch 就必须在方法签名声明 `throws IOException`；同理 A 要么 catch 住，要么也声明 `throws`。如果一路都不处理，最终 JVM 终止线程并打印栈轨迹。**举一反三**：设计 API 时，checked 异常会**强制传播**到所有调用方——这就是为什么滥用 checked 会污染整个调用链。
> [!答案] **3** checked：`InsufficientStockException`（查询后出库，调用方可先补货后重试——可恢复）。unchecked：`InvalidItemException`（参数错误，程序 Bug）、`NegativeQuantityException`（传负数，调用方代码逻辑错误）。层次：`RuntimeException → BusinessException → InsufficientStockException`，`Exception → InventoryException → StockDataException`（checked 分支）。**举一反三**：核心判断标准——调用方**有没有合理恢复手段**。有则 checked，没有则 unchecked。

### 三、代码题（2 道）

1. [基础] 写一个 `safeDivide(int a, int b)` 方法：除数为 0 时抛出 `IllegalArgumentException("除数不能为零")`。在 `main` 中用 `try-catch-finally` 调用：catch 打印异常消息，finally 打印"计算结束"。分别用 `(10, 2)` 和 `(10, 0)` 验证输出。

2. [综合] 写一个 `FileProcessor` 类，包含 `readFirstLine(Path path)` 方法：用 `Files.newBufferedReader` 打开文件，读取第一行后返回，在 **finally** 中关闭 reader。如果文件不存在（`NoSuchFileException`），捕获后包装成自定义的 `ProcessingException`（继承 `RuntimeException`，有 `(String msg, Throwable cause)` 构造器）。在 main 中调用并断言 `e.getCause()` 不为 null。

> [!答案] **1 验收**：
> ```java
> static int safeDivide(int a, int b) {
>     if (b == 0) throw new IllegalArgumentException("除数不能为零");
>     return a / b;
> }
> public static void main(String[] args) {
>     int[][] cases = {{10, 2}, {10, 0}};
>     for (int[] c : cases) {
>         try {
>             System.out.println(safeDivide(c[0], c[1]));
>         } catch (IllegalArgumentException e) {
>             System.out.println("出错：" + e.getMessage());
>         } finally {
>             System.out.println("计算结束");
>         }
>     }
> }
> // 输出:
> // 5
> // 计算结束
> // 出错：除数不能为零
> // 计算结束
> ```
> **举一反三**：`finally` 中若写 `return`，会覆盖 `try` 的返回值——几乎所有代码检查工具都会告警。
> [!答案] **2 验收**：
> ```java
> class ProcessingException extends RuntimeException {
>     public ProcessingException(String msg, Throwable cause) { super(msg, cause); }
> }
> static String readFirstLine(Path path) {
>     BufferedReader reader = null;
>     try {
>         reader = Files.newBufferedReader(path);
>         return reader.readLine();
>     } catch (NoSuchFileException e) {
>         throw new ProcessingException("文件不存在：" + path, e);
>     } catch (IOException e) {
>         throw new ProcessingException("读取失败：" + path, e);
>     } finally {
>         if (reader != null) {
>             try { reader.close(); } catch (IOException ignored) { }
>         }
>     }
> }
> public static void main(String[] args) {
>     Path notExist = Path.of("nonexistent.txt");
>     try {
>         readFirstLine(notExist);
>     } catch (ProcessingException e) {
>         System.out.println(e.getMessage());                     // 文件不存在：nonexistent.txt
>         System.out.println(e.getCause().getClass().getSimpleName()); // NoSuchFileException
>     }
> }
> ```
> **举一反三**：本话的 `finally` 关闭流实际上是过渡方案——下一话用 try-with-resources 可以省掉这段手工 `close()` 代码，且不会压制定主异常。

---

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
