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



## 🎯 随堂练习
先自己做，再对答案。选择难度递进，解答从概念到综合，代码含边界验证。

### 一、选择题（10 道）

1. [基础] S2 重构后，咖啡站各模块通过什么方式协作？- A) 全局变量　B) 接口契约和对象引用　C) `static` 方法直接调用　D) 数据库
2. [基础] 值对象（如 `Coffee`）的最合适的实现方式是？- A) 普通类手写 getter/setter　B) `record`　C) `HashMap`　D) `String[]`
3. [基础] `Menu` 用哪种数据结构实现"按名查咖啡"最合适？- A) `List<Coffee>`　B) `Map<String, Coffee>`　C) `Coffee[]`　D) `Set<Coffee>`
4. [进阶] 下面哪种设计**不符合**职责分离原则？- A) `Coffee` 只管数据、`Cashier` 只管结账　B) `Coffee` 类里写一个 `pay()` 方法处理付款逻辑　C) `PaymentMethod` 接口只管付款契约　D) `Menu` 只管索引和查找
5. [进阶] 从 S1（数组+静态方法）到 S2（对象+接口+集合），最核心的质量提升是？- A) 代码变短了　B) 修改成本降低——改一处不引发雪崩　C) 运行更快　D) 变量名变短了
6. [进阶] 收银台 `checkout(PaymentMethod pm, double amount)` 为什么参数写接口类型而非具体类？- A) 因为接口写在前面好看　B) 面向接口编程——换付款方式不用修改收银台代码　C) 因为具体类不能用　D) 因为接口更快
7. [进阶] "对扩展开放、对修改关闭"（开闭原则）在本季中的最佳体现是？- A) 所有代码写在一个文件　B) 加新饮品加新子类，加新付款方式加新实现类，都不动已有代码　C) 用 switch 分派　D) 用 if-else 判断
8. [综合] 测试中的"回归测试"（regression test）指什么？- A) 测试代码回归到旧版本　B) 修改代码后跑已有测试，确保之前修好的 bug 不会重新出现　C) 只测新功能　D) 自动生成的测试
9. [综合] 重构和重写（rewrite）的区别是什么？- A) 没区别　B) 重构是不改变外部行为的前提下改善内部结构；重写是从头写　C) 重构更慢　D) 重写更安全
10. [综合] S2 咖啡站的"明确局限"（数据在内存、关机即丢）是第三季的入口。这个问题对应什么解决方案？- A) 泛型　B) 异常处理　C) 文件持久化/数据库　D) 多态

> [!答案] **1-B**　S2 的核心是面向对象——Coffee 值对象、Menu 索引、PaymentMethod 接口、Cashier 结算，通过接口契约和对象引用协作。**2-B**　`record` 一行代码搞定构造器 + getter + equals/hashCode/toString——值对象的最佳实践。**3-B**　`Map<String, Coffee>` 提供 O(1) 按名查找，是菜单索引的天然选择。**4-B**　`Coffee` 处理付款逻辑违反了单一职责——Coffee 是值对象，只该管自己的数据，付款逻辑属于收银台或 PaymentMethod。**5-B**　衡量重构质量的不是"代码变短"，而是"修改成本降低"——分离的职责意味着改付款不影响咖啡，改菜单不影响结账。**6-B**　接口参数让收银台不绑定具体付款方式——加积分支付只需新增实现类，收银台零改动。**7-B**　S2 的核心成就——加饮品加子类、加付款加实现类，已有代码不动。open for extension, closed for modification。**8-B**　回归测试 = 每次改动后把之前写的测试全跑一遍——保证旧功能没被新代码弄坏。S02E12 结尾的测试就是这个目的。**9-B**　重构是在有测试保护的前提下逐步改善结构（行为不变）；重写是推倒重来。有测试是重构的前提——这也是为什么 S02E12 强调先写测试再改代码。**10-C**　数据在内存关机消失 → 需要持久化到文件或数据库。第三季 S03E03（文件处理）和第四季 S04E04（MySQL）就是解决这个问题的。
**举一反三**：第 5、7、8 三题串起了 S2 的"工程意识"暗线——重构不是炫技，是为了改得动代码；回归测试不是负担，是改代码的底气。

### 二、解答题（3 道）

1. [概念] S2 重构后，咖啡站的对象模型（Coffee/Menu/Cashier/PaymentMethod）各自的职责是什么？画出职责边界，说明为什么不能把所有功能塞到一个类里。
2. [场景] 现在要在咖啡站加一个新功能：折扣卡（持有者享受 9 折）。说明在 S2 架构下怎么加这个功能，需要改哪些类、不动哪些类——对比如果在 S1 架构下要改多少地方。
3. [综合] "面向接口编程"在本季有两个层面的应用：①`PaymentMethod` 接口（业务层）；②Java 集合接口（`List`/`Map`/`Set`，JDK 层）。分别说明它们如何体现"依赖抽象而非具体实现"，以及带来的好处。

> [!答案] **1**　职责边界：`Coffee`（值对象）——持有 name/price/stock 数据，管好自己的不变量（价格≥0、库存≥0）。`Menu`（仓储）——管理所有 Coffee 的增删查改，提供按名查找（O(1)）。`Cashier`（业务逻辑）——根据订单计算总价、扣减库存、调用付款接口完成结算。`PaymentMethod`（接口契约）——定义付款行为签名，各付款方式自行实现。不能塞到一个类里的原因：①单一职责——一个类只有一个改变的理由；②可测试——每个类可独立 mock 依赖测试；③可替换——改付款方式只换 PaymentMethod 实现，Cashier 无感。**举一反三**：Spring 里的 Controller → Service → Repository 三层架构就是这种职责分离的规模化版本。**2**　S2 架构下只需：①新增 `DiscountCard` 类（字段 `cardId, discountRate`）；②在 `Cashier.checkout` 增加一个可选参数 `DiscountCard card`，或重载一个带折扣参数的方法；③结算时 `total *= card.getRate()`。已有类零改动。S1 架构下（数组+静态方法）：①改全局数组加折扣数据；②改 `calculateTotal` 静态方法加折扣逻辑（所有调用方都受影响）；③可能还要改 `printReceipt` 加折扣行。一个功能动全身。**举一反三**：这就是衡量设计好坏的标准——"加一个需求需要改几个地方"。改的越少，设计越好。**3**　业务层 `PaymentMethod`：收银台依赖接口而非具体付款类，好处——①换付款方式不动收银台；②测试时用 Lambda 模拟（`amount -> {}`）不需要真实支付网关；③未来加硬件支付（刷卡机/NFC）同样只加实现类。JDK 层集合接口：`List<Coffee> orders = new ArrayList<>()`——代码只认 `List` 接口，好处——①如果性能需要换 `LinkedList`，只改 `new` 那行；②方法参数写 `List` 而非 `ArrayList`，调用方可以传任何 List 实现；③`Collections.unmodifiableList()` 返回的也是 List——统一接口让装饰器/代理模式无缝接入。**举一反三**：Spring 的依赖注入就是把这条原则推到极致——你在代码里只写 `@Autowired PaymentService`（接口类型），Spring 在运行时决定注入哪个实现（可能由配置文件、profile、条件注解决定）。

### 三、代码题（2 道）

1. [基础] 不看原文，自己设计 S2 咖啡站的最小可运行模型（只写类结构和方法签名，不要求完整实现）：至少包含 `Coffee`（值对象）、`Menu`（管理菜单）、`Cashier`（结账）、`PaymentMethod`（付款接口）、一个具体付款实现。画出类关系。
2. [综合] 实现一个简化的收银台 `Cashier`：有 `checkout(String coffeeName, int quantity, PaymentMethod pm)` 方法。流程：查 Menu 获取咖啡 → 检查库存 → 扣库存 → 计算总价 → 调 `pm.pay(total)`。库存不足时抛 `IllegalStateException`，咖啡不存在时抛 `NoSuchElementException`。写两个测试：①正常结算流程；②库存不足抛异常（验证库存未被扣减）。

> [!答案] **1 验收**：
> ```java
> // Coffee 值对象
> record Coffee(String name, double price, int stock) {}
> 
> // Menu 管理咖啡
> class Menu {
>     Map<String, Coffee> items = new HashMap<>();
>     void add(Coffee c) { items.put(c.name(), c); }
>     Coffee find(String name) { return items.get(name); }
> }
> 
> // PaymentMethod 付款接口
> interface PaymentMethod { void pay(double amount); }
> class CashPay implements PaymentMethod {
>     public void pay(double amount) { System.out.println("现金支付: ¥" + amount); }
> }
> 
> // Cashier 收银台
> class Cashier {
>     void checkout(Menu menu, String name, int qty, PaymentMethod pm) {
>         Coffee c = menu.find(name);
>         // ... 检查库存、扣减、计算总价、调用 pm.pay
>     }
> }
> // 关系: Menu 持有多个 Coffee（1:N）
> //       Cashier 依赖 Menu（查咖啡）和 PaymentMethod（付款）
> //       但 Cashier 不持有它们——通过方法参数传入（依赖注入的雏形）
> ```
> **举一反三**：`Cashier` 不持有 Menu 和 PaymentMethod 作为字段，而是方法参数——这叫"方法参数注入"，是依赖注入（DI）的最简形式。**2 验收**：
> ```java
> import java.util.*;
> 
> record Coffee(String name, double price, int stock) {
>     Coffee withStock(int newStock) { return new Coffee(name, price, newStock); }
> }
> 
> class Menu {
>     private final Map<String, Coffee> items = new HashMap<>();
>     void add(String name, double price, int stock) {
>         items.put(name, new Coffee(name, price, stock));
>     }
>     Coffee find(String name) {
>         Coffee c = items.get(name);
>         if (c == null) throw new NoSuchElementException("没有这款咖啡: " + name);
>         return c;
>     }
>     void update(Coffee c) { items.put(c.name(), c); }
> }
> 
> interface PaymentMethod { void pay(double amount); }
> 
> class Cashier {
>     void checkout(Menu menu, String coffeeName, int quantity, PaymentMethod pm) {
>         Coffee coffee = menu.find(coffeeName);           // 不存在→NoSuchElementException
>         if (coffee.stock() < quantity) {
>             throw new IllegalStateException("库存不足: " + coffeeName + " 只有 " + coffee.stock() + " 杯");
>         }
>         menu.update(coffee.withStock(coffee.stock() - quantity));  // 扣库存
>         double total = coffee.price() * quantity;
>         pm.pay(total);
>     }
> }
> 
> // 测试1: 正常结算
> Menu menu = new Menu();
> menu.add("美式", 15.0, 10);
> double[] charged = {0};
> PaymentMethod recorder = amount -> charged[0] = amount;
> new Cashier().checkout(menu, "美式", 2, recorder);
> System.out.println("付款: ¥" + charged[0]);          // 30.0
> System.out.println("剩余库存: " + menu.find("美式").stock()); // 8
> 
> // 测试2: 库存不足
> try {
>     new Cashier().checkout(menu, "美式", 100, recorder);
> } catch (IllegalStateException e) {
>     System.out.println(e.getMessage());                // 库存不足
>     System.out.println("库存应不变: " + menu.find("美式").stock()); // 8（未扣减）
> }
> ```
> **举一反三**：测试中用 Lambda `amount -> charged[0] = amount` 模拟付款——这就是"面向接口编程"在测试中的直接好处。不需要真实的支付宝 SDK，一个 Lambda 就能验证整条结算链路。

---

*完整季次地图见 [/java](/java);世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`。*
