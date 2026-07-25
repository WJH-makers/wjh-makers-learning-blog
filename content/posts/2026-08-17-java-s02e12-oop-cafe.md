---
title: "《从零开始学 Java》24 · 面向对象版咖啡站(第二季大结局)"
date: 2026-08-17
summary: "把第一季那台「数组 + 静态方法」的咖啡机,重构成一套干净的对象模型:Coffee 对象、Menu 索引、PaymentMethod 接口、订单集合。"
tags: [Java, Java漫画, 项目实战, 重构, 阿零与豆豆]
---

# 《从零开始学 Java》24 · 面向对象版咖啡站(第二季大结局)

> 第二季「对象大陆」第 12 话 · 基线 JDK 25 · 项目检查点:面向对象版咖啡站 v2。

---

## 一、需求:把散代码重构成对象模型

第一季的咖啡机靠 `MENU[]`/`PRICES[]` + 一堆 `static` 方法硬撑。第二季学的对象、集合、接口、泛型,现在全部用上,把它重构成职责清晰的模型。

---

## 二、漫画

> **〔1〕** 阿零把第一季那台缠满电线的机器拆开,零件按类归位:咖啡是 `Coffee`,菜单是 `Menu`,付款是 `PaymentMethod`。
> 豆豆:「同样的功能,现在每块各司其职 —— 这就是重构。」

> **〔2〕** 豆豆:「记住这套模型。第三季,我们要给它加上异常兜底、文件持久化和自动化测试,让它真正扛得住。」

---

## 三、本话目标

- 用对象 + 集合 + 接口组织一个完整的咖啡站;
- 让各部分职责单一、互相协作;
- 交付带测试的第二季项目 v2。

---

## 四、完整代码:对象模型 v2

```java
import java.util.*;

// 值对象:一杯咖啡(record 自动给 equals/hashCode/toString)
record Coffee(String name, double price) {}

// 付款契约
interface PaymentMethod { void pay(double amount); }

// 菜单:按名字索引 + 库存管理
class Menu {
    private final Map<String, Coffee> items = new LinkedHashMap<>();
    private final Map<String, Integer> stock = new HashMap<>();

    void add(Coffee c, int qty) { items.put(c.name(), c); stock.put(c.name(), qty); }

    Coffee require(String name) {
        Coffee c = items.get(name);
        if (c == null) throw new NoSuchElementException("无此咖啡:" + name);
        return c;
    }

    void reduce(String name, int qty) {
        int left = stock.getOrDefault(name, 0);
        if (left < qty) throw new IllegalStateException(name + " 库存不足");
        stock.put(name, left - qty);
    }

    List<Coffee> all() { return List.copyOf(items.values()); }
}

// 收银台:只依赖抽象
class Cashier {
    double checkout(Menu menu, String name, int qty, PaymentMethod pay) {
        Coffee c = menu.require(name);
        menu.reduce(name, qty);
        double total = c.price() * qty;
        pay.pay(total);
        return total;
    }
}

public class CafeApp {
    public static void main(String[] args) {
        Menu menu = new Menu();
        menu.add(new Coffee("美式", 15.0), 20);
        menu.add(new Coffee("拿铁", 18.0), 10);

        PaymentMethod alipay = amount -> System.out.println("支付宝扣款 ¥" + amount);
        double paid = new Cashier().checkout(menu, "拿铁", 2, alipay);
        System.out.println("成交 ¥" + paid + ",剩余菜单 " + menu.all().size() + " 款");
    }
}
```

---

## 五、故意制造一个 Bug

库存判断写成「小于等于」,导致刚好够时反而拒绝:

```java
if (left <= qty) throw new IllegalStateException(...);   // ← 故意:够买也被拒
```

买 10 杯、库存正好 10,却报「库存不足」。这类**边界写错**是重构时最容易溜进来的 Logic Bug,靠测试兜住。

---

## 六、给项目配测试

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CafeAppTest {
    private Menu menu() {
        Menu m = new Menu();
        m.add(new Coffee("美式", 15.0), 10);
        return m;
    }

    @Test
    void checkout_charges_total() {
        double total = new Cashier().checkout(menu(), "美式", 3, amt -> {});
        assertEquals(45.0, total);
    }

    @Test
    void exact_stock_is_allowed() {          // 守住边界:够买就该成功
        assertDoesNotThrow(() -> new Cashier().checkout(menu(), "美式", 10, amt -> {}));
    }

    @Test
    void unknown_coffee_rejected() {
        assertThrows(java.util.NoSuchElementException.class,
            () -> new Cashier().checkout(menu(), "摩卡", 1, amt -> {}));
    }
}
```

---

## 七、项目检查点 · 豆豆咖啡站 v2 🎉

```text
交付:Coffee/Menu/Cashier/PaymentMethod 组成的对象模型,职责清晰、带测试
对比 v1:同样的功能,从"一堆数组+静态方法"变成"各司其职的对象"
局限:数据还在内存里,程序一关全没;没有构建工具和规范的测试目录
        —— 这正是第三季要补的工程化
```

---

## 八、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 面向对象建模 | 简历项目的设计能力体现 |
| 职责分离 / 面向接口 | CR 与架构面必看 |
| 重构 + 回归测试 | 「有测试的重构」是资深标志 |

---

## 九、第二季完 · 下一季预告

你把咖啡站从散代码重构成了对象模型,但它还很"脆":乱输入会崩、关机数据就丢、没有构建和测试工程。

> 第三季《工程时代》:异常体系兜住错误、文件持久化留住数据、Maven 管理构建、JUnit 织成测试网、Git 记录每一步 —— 从"能运行"迈向"可维护"。

*完整季次地图见 [/java](/java);世界观设定见仓库 `docs/java-comic-academy/handbook.md`。*
