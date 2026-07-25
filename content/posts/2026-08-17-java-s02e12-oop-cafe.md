---
title: "《从零开始学 Java》24 · 面向对象版咖啡站(第二季大结局)"
date: 2026-08-17
summary: "把第一季那台「数组 + 静态方法」的咖啡机,重构成一套干净的对象模型:Coffee 值对象、Menu 索引、PaymentMethod 接口、Cashier 收银台各司其职,并交付回归测试。"
tags: [Java, Java漫画, 项目实战, 重构, 阿零与豆豆]
---

# 《从零开始学 Java》24 · 面向对象版咖啡站(第二季大结局)

> 连载特刊 · 第二季「对象大陆」第 12 话 · 主线基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。第二季大结局——把攒了一季的对象、集合、接口、泛型,全部拧成一台干净的咖啡机 v2。

---

## 一、需求:把散代码重构成对象模型

第一季那台咖啡机,靠 `MENU[]` / `PRICES[]` 两个平行数组 + 一大堆 `static` 方法硬撑:加一个字段要改三处、库存和价格靠下标对齐、稍不留神就错位。第二季学的对象、集合、接口、泛型,现在**全部用上**,把它重构成一套职责清晰、能测试、能替换实现的模型。豆豆:「功能一个不多不少,但**代码的形状**要脱胎换骨——这一话不学新语法,学怎么把学过的拧成一件作品。」

---

## 二、漫画 · 阿零的成长回望

> **〔1〕** 阿零把第一季那台缠满电线、`MENU[]`/`PRICES[]` 贴满补丁的老机器整个拆开,零件按类归位:咖啡归 `Coffee`,菜单归 `Menu`,付款归 `PaymentMethod`。
> 豆豆:「同样的功能,现在每一块各司其职——这就是重构。」

> **〔2〕**【成长回望格】阿零翻出自己第一季 E12 写的 v1 源码,盯着那一屏平行数组和满地 `static`,忍不住皱眉:「这……真是我写的?下标对齐、到处 `static`,我现在自己都看不下去了。」
> 豆豆(难得没毒舌):「看得出它乱,说明你长本事了。第一季的你只求『能跑』,现在的你开始要求『能维护』——这一年没白熬。」

> **〔3〕** 重构后的机器:`Cashier` 收银台只认一块 `PaymentMethod` 插槽,支付宝、微信像充电头一样即插即换,机器本体一行不改。
> 阿零:「换支付方式居然不用动收银台?」豆豆:「因为收银台只依赖**接口**这个抽象,不依赖具体谁来付钱。这叫**面向接口**。」

> **〔4〕** 阿零把一杯不存在的「摩卡」硬塞进收银台,机器「啪」地弹出一张 `NoSuchElementException` 红条——但这次是**主动、体面地**拒绝,不是崩。豆豆:「职责清楚了,连出错都出得干净。」

> **〔5〕** 豆豆合上机盖,指向远方的工程之城:「记住这套模型。第三季,我们给它加上**异常兜底、文件持久化、Maven 构建、测试工程**,让它从『能运行』长成『扛得住』。」

---

## 三、本话目标

- 用对象 + 集合 + 接口 + 泛型,组织一个完整的咖啡站;
- 让各部分**职责单一、面向接口**、彼此协作;
- 交付一份带**回归测试**的第二季项目 v2,守住边界不回退。

---

## 四、完整代码:对象模型 v2

```java
import java.util.*;

// 值对象:一杯咖啡。全季统一 record,固定三字段(含库存 stock)
record Coffee(String name, double price, int stock) {}

// 付款契约:收银台只依赖这个抽象,不关心具体谁来扣款
interface PaymentMethod { void pay(double amount); }

// 菜单:按名字索引 + 库存管理
class Menu {
    private final Map<String, Coffee> items = new LinkedHashMap<>();   // 保持录入顺序

    void add(Coffee c) { items.put(c.name(), c); }

    Coffee require(String name) {
        Coffee c = items.get(name);
        if (c == null) throw new NoSuchElementException("无此咖啡:" + name);
        return c;
    }

    void reduce(String name, int qty) {
        Coffee c = require(name);
        if (c.stock() < qty) throw new IllegalStateException(name + " 库存不足");
        // Coffee 是 record(不可变),减库存 = 用新库存造一个新 Coffee 替换回去
        items.put(name, new Coffee(c.name(), c.price(), c.stock() - qty));
    }

    int stockOf(String name) { return require(name).stock(); }
    List<Coffee> all() { return List.copyOf(items.values()); }
}

// 收银台:只依赖抽象 PaymentMethod
class Cashier {
    double checkout(Menu menu, String name, int qty, PaymentMethod pay) {
        Coffee c = menu.require(name);      // 不存在 → 主动抛,不返回 null
        menu.reduce(name, qty);             // 库存不足 → 主动抛
        double total = c.price() * qty;
        pay.pay(total);                     // 具体怎么付,交给传进来的实现
        return total;
    }
}

public class CafeApp {
    public static void main(String[] args) {
        Menu menu = new Menu();
        menu.add(new Coffee("美式", 15.0, 20));
        menu.add(new Coffee("拿铁", 18.0, 10));

        // alipay 是一段 lambda,把「怎么付款」当参数传进去(细节见下方致意)
        PaymentMethod alipay = amount -> System.out.println("支付宝扣款 ¥" + amount);
        double paid = new Cashier().checkout(menu, "拿铁", 2, alipay);
        System.out.println("成交 ¥" + paid + ",拿铁剩 " + menu.stockOf("拿铁") + " 杯");
    }
}
```

> **豆豆旁白 · Lambda 致意**:上面那句 `amount -> System.out.println(...)` 是 **Lambda 表达式**——因为 `PaymentMethod` 只有一个方法,可以直接用一行代码当它的实现传进去,省掉写一个类。本季只是「顺手一用」,**系统讲解留到第三季专门开一话讲 Lambda 与 Stream**,那时你会懂它为何是现代 Java 的半壁江山。

> **🎯 面试直击**:什么是「面向接口编程」?它好在哪?
> `Cashier` 依赖的是 `PaymentMethod` **接口**,不是支付宝或微信任何**具体**类。这意味着:换支付方式只需传入不同实现,收银台代码**一行不改**(可扩展);写测试时可以传一个「什么都不做」的假实现,不必真调支付(可测试)。这就是「依赖抽象而非实现」——设计原则里的**依赖倒置**,也是 Spring 依赖注入的思想地基,第四季会再见到它。

---

## 五、故意制造一个 Bug:边界写反

库存判断手滑写成「小于等于」,导致**刚好够**时反而拒绝:

```java
if (c.stock() <= qty) throw new IllegalStateException(...);   // ← 故意:够买也被拒
```

买 10 杯、库存正好 10,却报「库存不足」。这类**边界写错**(`<` 写成 `<=`)是重构时最容易溜进来的 Logic Bug——编译不报错、大多数情况也正常,只在「刚好卡边界」时翻车。它不靠编译官,只能靠**测试**兜住。

---

## 六、给项目配测试:守住边界不回退

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CafeAppTest {
    private Menu menu() {
        Menu m = new Menu();
        m.add(new Coffee("美式", 15.0, 10));
        return m;
    }

    @Test
    void checkout_charges_total() {
        double total = new Cashier().checkout(menu(), "美式", 3, amt -> {});
        assertEquals(45.0, total);          // 15 × 3
    }

    @Test
    void exact_stock_is_allowed() {          // 守住边界:够买就该成功,不许被拒
        assertDoesNotThrow(() -> new Cashier().checkout(menu(), "美式", 10, amt -> {}));
    }

    @Test
    void unknown_coffee_rejected() {         // 不存在的咖啡,该体面地抛
        assertThrows(NoSuchElementException.class,
            () -> new Cashier().checkout(menu(), "摩卡", 1, amt -> {}));
    }
}
```

第二个测试 `exact_stock_is_allowed` 就是为第五节那个 `<=` 埋的边界哨兵:一旦有人再把 `<` 写成 `<=`,它立刻变红。**有测试兜底,你才敢放手改代码。**

---

## 七、项目检查点 · 豆豆咖啡站 v2 🎉

```text
交付:Coffee / Menu / Cashier / PaymentMethod 组成的对象模型,职责清晰、面向接口、带回归测试
对比 v1:同样的功能,从「一堆平行数组 + 静态方法」变成「各司其职的对象」

本季一句话总结:职责分离 = 未来可测、可换实现
  · 可测 —— 每块职责单一,能单独喂假数据测试(如传一个空的 PaymentMethod)
  · 可换 —— 收银台只认接口,换支付方式、换菜单存储都不动核心代码

明确的局限(正是第三季入口):数据全在内存、关机即丢;乱输入直接抛异常崩掉、无统一兜底;
             没有构建工具与规范测试目录,全靠手动 javac
```

---

## 八、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 面向对象建模 | 简历项目的设计能力体现,面试常让你「设计一个 XX 系统」 |
| 职责分离 / 面向接口 / 依赖倒置 | 代码评审与架构面必看,直通 Spring 思想 |
| 重构 + 回归测试 | 「有测试的重构」是初级到资深的分水岭 |

---

## 九、第二季完 · 下一季预告

你把咖啡站从一季前那堆散代码,重构成了一套职责清晰、有测试兜底的对象模型;阿零回头看第一季的自己都嫌乱——这就是**成长**。但这台机器还很「脆」,而这些脆点,正是第三季的入口。

> 第三季《工程时代》:**异常体系**兜住错误、**文件持久化**留住数据、**Maven** 管理构建、**JUnit** 织成测试网、**Git** 记录每一步,还要专门开一话讲透本季只是顺手一用的 **Lambda 与 Stream**——带咖啡站从「能运行」迈向「可维护」。

*完整季次地图见 [/java](/java);世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`。*
