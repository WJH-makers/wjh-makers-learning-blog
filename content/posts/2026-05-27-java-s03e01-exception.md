---
title: "《从零开始学 Java》25 · 异常警报系统"
date: 2026-05-27
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

![《从零开始学 Java》25 · 异常警报系统 —— 阿零与豆豆六格漫画](/comics/java/s03e01-exception.png)

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

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. `Throwable` 下面分成哪两支?
   - A) `Exception` 和 `RuntimeException`　B) `Error` 和 `Exception`　C) `checked` 和 `unchecked`　D) `Throwable` 和 `Throwable`
2. 对 `OutOfMemoryError`、`StackOverflowError` 这一支,正确做法是?
   - A) 一律用 try-catch 接住　B) 别去接 —— 系统级塌方,接了也救不回来　C) 转成 RuntimeException 再抛　D) 记日志后继续运行
3. 判断 checked / unchecked 的口诀是?
   - A) 名字带 Exception 的是 checked　B) 继承自 `RuntimeException` 的是 unchecked,其余 `Exception` 是 checked　C) 运行时抛的都是 unchecked　D) 自定义的都是 checked
4. 异常抛出后没人接,会怎样?
   - A) 程序继续往下走　B) 一路冒泡到 `main` 之外,JVM 打印栈轨迹并**终止整个程序**　C) 自动重试　D) 返回默认值
5. 栈轨迹应该怎么读?
   - A) 从下往上,最后一行是出事点　B) 从上往下:第一行是异常类型和消息,紧跟的 `at` 是真正抛出的那一行　C) 只看最后一行　D) 只看行号
6. `finally` 块什么时候执行?
   - A) 只有 try 成功时　B) 只有 catch 兜住时　C) 无论 try 成功还是 catch 兜住都执行,常用来收尾　D) 只有抛异常时
7. `catch (Exception e) {}` 这种写法的问题是?
   - A) 性能差　B) 等于把警报器的线剪了 —— 出事你毫不知情,Bug 潜伏到线上才爆　C) 编译报错　D) 会导致内存泄漏
8. 多重 catch `catch (IOException | SQLException e)` 是哪个版本起支持的?
   - A) Java 5　B) Java 6　C) Java 7　D) Java 8
9. `assertThrows(IllegalStateException.class, () -> shop.order("美式", 999));` 断言的是?
   - A) 这段代码不会抛异常　B) 这段代码必须抛出指定类型的异常,并返回那个异常对象供进一步断言　C) 返回值等于某个常量　D) 方法执行时间
10. 框架(如 Spring)偏爱 unchecked 异常的原因是?
    - A) 性能更好　B) 不逼业务代码到处 `throws`,接口更干净　C) 编译更快　D) 更容易被捕获

> [!答案]
> **1-B**　`Error` 是系统塌方,`Exception` 才是你该处理的。**举一反三**:两者共同的祖先 `Throwable` 才是 `throw`/`catch` 真正认的类型。
> **2-B**　内存都没了,catch 里的代码多半也跑不动。**举一反三**:唯一常见的例外是最外层框架为了「优雅记录一笔再退出」,但那不是恢复。
> **3-B**　看是不是 `RuntimeException` 的后代。**举一反三**:所以自定义业务异常继承谁,决定了调用方是否被强制处理 —— 这是设计决策不是随手选。
> **4-B**　一个没接,全场陪葬。**举一反三**:本话的事故本质不是「一单失败」,而是「全店打烊」——护栏该放在能继续服务的那一层。
> **5-B**　第一行看类型和消息,`at` 行看出事点。**举一反三**:栈轨迹从「出事点」到「最外层调用者」,中间还能看出调用链,是排障第一手材料。
> **6-C**　`finally` 是收尾专用。**举一反三**:关文件、还连接都靠它 —— 不过下一话的 `try-with-resources` 能让你连它都不用写。
> **7-B**　空 catch 是最致命的新手习惯。**举一反三**:至少要打印或记日志;真要忽略,也该写注释说明为什么可以忽略。
> **8-C**　Java 7 的多重 catch。**举一反三**:同版本还带来了 `try-with-resources`,两者都是为了减少异常处理的样板代码。
> **9-B**　它断言必须抛,还把异常对象还给你。**举一反三**:异常路径和正常路径一样值得测 —— 「该报错的地方真的报错」也是需求。
> **10-B**　接口签名不被 `throws` 淹没。**举一反三**:代价是调用方可能忘了处理,所以文档和统一异常处理器要跟上。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*
