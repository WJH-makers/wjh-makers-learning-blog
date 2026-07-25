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

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
