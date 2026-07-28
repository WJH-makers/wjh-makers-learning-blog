---
title: "《从零开始学 Java》57 · 值传递的真相与对象拷贝"
date: 2026-10-14
summary: "复制订单功能上线第一天就闯祸:给新单加燕麦奶,原单也跟着多了一份。豆豆翻开技术债账本第一页,从「Java 只有值传递」讲到浅拷贝的雷、Cloneable 的历史包袱,最后用防御性拷贝加 wither,把复制修成真正的复制。"
tags: [Java, Java漫画, 值传递, 对象拷贝, 深拷贝, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》57 · 值传递的真相与对象拷贝

> 连载特刊 · 番外卷一「语言宝库」第 1 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——双十一大促打赢,咖啡站进入冬歇期;豆豆掏出「技术债账本」翻开第一页,而导火索已经点着:阿零新写的「复制订单」功能,把原单改坏了。

---

## 一、事故:复制订单,改坏了原单

冬歇第一天,卷帘门只升到一半,豆豆把《技术债账本》拍在吧台上,翻开第一页**「语言宝库」**——主线里那些「先这么写,细节见番外」的地方,这个冬天逐笔清账。目标只有一个:春天的社招面试,阿零要从「能干活」升级成「能讲透」。

话音未落,收银台先出了事。常客老范说「照昨天那单再来一份,换燕麦奶」,阿零演示他刚写的「复制订单」:复制、加料、下单,一气呵成。三分钟后老范举着小票回来——昨天那张**原单**上也凭空多了一份燕麦奶,会员账单对不上了。

阿零:「我明明 new 了一张新订单,怎么会改到旧的?」
豆豆:「面试官视角,第一问:**Java 传参,传的到底是什么?**这一问答歪,后面全歪。」

---

## 二、漫画 · 堆城区的门牌号

> **〔1〕** 阿零不服,当场写 `swap(a, b)` 想证明自己懂传参——运行完,a 和 b 纹丝不动。
> 阿零:「我以为参数传进去的就是它本人……」
> 豆豆(面试官脸):「那再解释一下:swap 换不动,`order.addons().add(...)` 却改得动,同一套规则怎么长出两副面孔?」

> **〔2〕** JVM 城主把两人领进堆内存城区:一栋栋房子(对象)立在堆里,变量手里攥着的只是一块**门牌号牌子**。
> JVM 城主:「传参那一刻,我只做一件事——**把牌子复印一份**递给方法。房子,从来不搬。」

> **〔3〕** 【分镜对比格】左:方法里把复印牌上的号码涂改成别栋(重新赋值),门外原来的牌子毫无变化;右:方法顺着复印牌走进房子挪家具(改属性),门外的人从窗户看得一清二楚。
> 豆豆:「换牌子,外面无感;进屋动家具,人人有份。你今天两次翻车,是同一条真相的两面。」

> **〔4〕** 收银台警报大作:老范的原单凭空多出燕麦奶,Logic Bug 怪趴在配料表上偷笑——两张订单的「配料表」引线,拧在堆里同一个 ArrayList 上。
> 阿零:「可我真的 new 了新订单!」
> 豆豆(叼着豆子叉腰):「你 new 了订单,没 new 配料表——**复印了牌子,合租了房**。」

> **〔5〕** JUnit 质检员抱臂堵在门口,举起验收单。
> JUnit 质检员:「口说无凭。改完新单,原单纹丝不动——**证据呢?**」

---

## 三、本话目标

- 说清 Java **只有值传递**:引用类型传的是「地址值的副本」;
- 讲透两面性:swap 换不动,改属性却能生效;
- 分清浅拷贝与深拷贝,认出「共享可变引用」这颗雷;
- 看清 Cloneable 的历史包袱,改用拷贝构造器 / 静态工厂 / wither;
- 用 JUnit 证明:改新单,原单纹丝不动。

---

## 四、原理图:变量攥着的是门牌号

```text
栈(方法的工作台)                     堆(对象的城区)
main.original ──┐
                ├── 同为门牌 @7a1 ──> Order#1 房
方法参数 o(副本)┘                      └─ addons 门牌 @9c3 ──> ArrayList 房
                                                                ["双份浓缩"]
传参 = 把变量格子里的值复印一份:
  基本类型:格子里是数字本身 → 方法里改的只是复印件(swap 换不动)
  引用类型:格子里是地址值   → 换地址,外面无感;顺着地址改对象,两边都看见
```

> **🎯 面试直击**:Java 是值传递还是引用传递?
> **只有值传递。**基本类型复印数值;引用类型复印的也是值——只不过那个值是对象的地址。所以给参数重新赋值影响不了外面,顺着地址改对象属性外面却看得见。追问点:「既然是值传递,为什么方法里能改动我的 List?」——因为改的是**堆里同一个对象**,而不是那份复印的地址。

---

## 五、代码:阿零的第一版「复制订单」

在第 56 话大促版订单模块之上动刀(与本话无关的字段从略),阿零加了 `copyWithId`:

```java
import java.util.ArrayList;
import java.util.List;

// 沿用主线的订单模型(record 回看第 19 话):配料表用可变 List,方便加料
record Order(int id, String coffee, List<String> addons) {

    // 阿零的第一版复制:new 了订单,配料表却原样递了过去(雷已埋好)
    Order copyWithId(int newId) {
        return new Order(newId, coffee, addons);
    }
}

public class OrderCopyDemo {
    public static void main(String[] args) {
        int a = 1, b = 2;
        swap(a, b);
        System.out.println("a=" + a + ", b=" + b);   // a=1, b=2 —— 换不动

        var order = new Order(1, "拿铁", new ArrayList<>(List.of("双份浓缩")));
        rename(order);
        System.out.println(order.coffee());          // 拿铁 —— 换牌子,外面无感
        addOat(order);
        System.out.println(order.addons());          // [双份浓缩, 燕麦奶] —— 改属性,生效
    }

    static void swap(int x, int y) { int t = x; x = y; y = t; }               // 改的是数值副本
    static void rename(Order o)    { o = new Order(99, "幽灵单", List.of()); } // 换的是复印牌
    static void addOat(Order o)    { o.addons().add("燕麦奶"); }               // 改的是同一栋房
}
```

同一套「复印牌子」规则,三种结局全解释通了。但真正的雷,埋在 `copyWithId` 里。

---

## 六、故意制造一个 Bug:改新单,原单跟着变

```java
var original = new Order(1, "拿铁", new ArrayList<>(List.of("双份浓缩")));
var copy = original.copyWithId(2);

copy.addons().add("燕麦奶");                      // 只想给新单加料
System.out.println("原单配料:" + original.addons());
System.out.println("新单配料:" + copy.addons());
```

---

## 七、读懂真实现象:不报错,静默改坏

```text
原单配料:[双份浓缩, 燕麦奶]
新单配料:[双份浓缩, 燕麦奶]
```

比崩溃更可怕——**一行异常都没有**,账悄悄错了。JUnit 质检员按验收单跑第一版,红灯:

```text
org.opentest4j.AssertionFailedError: 原单不该被动过 ==> expected: <[双份浓缩]> but was: <[双份浓缩, 燕麦奶]>
	at OrderCopyTest.copy_must_not_touch_original(OrderCopyTest.java:12)
```

根因:构造新 Order 时只复制了 `addons` 这枚**地址值**——两张订单的配料表,是堆里**同一个** ArrayList。这就是浅拷贝与深拷贝的分界:

| | 复制了什么 | 结果 |
|---|---|---|
| 浅拷贝 | 对象本身;字段里的引用**照抄** | 新旧对象**合租**同一批可变内脏 |
| 深拷贝 | 连引用指向的可变对象也**一并复制** | 新旧对象彻底**分家**,互不牵连 |

---

## 八、修复,并用测试证明

分家两步:**进门防御性拷贝**(存下的配料表与外界断开),**要改就造新单**(record 的 wither 思路):

```java
import java.util.ArrayList;
import java.util.List;

record Order(int id, String coffee, List<String> addons) {

    Order {                                   // 紧凑构造器:进门先复印
        addons = List.copyOf(addons);         // 存不可变快照;本就不可变时直接复用,不花冤枉钱
    }

    Order withAddon(String addon) {           // wither:改 = 造新单,原单永不动
        var next = new ArrayList<>(addons);
        next.add(addon);
        return new Order(id, coffee, next);
    }

    static Order copyFrom(Order src, int newId) {   // 静态拷贝工厂,取代第一版 copyWithId
        return new Order(newId, src.coffee(), src.addons());
    }
}
```

顺手多赚一层保险:现在谁再对 `addons()` 直接 `add`,当场 `UnsupportedOperationException`——「静默改坏」变成「当场翻脸」,错不过夜。

> **豆豆锐评**:有人抢答「用 `clone()` 啊」。别。Cloneable 一身历史包袱:它是个**空标记接口**,`clone` 方法却长在 `Object` 上、还是 `protected`;没实现接口就调用,运行时抛受检的 `CloneNotSupportedException`;默认实现恰恰是**浅拷贝**,雷一颗不少;还绕过构造器,你写的防御性拷贝全部失效。新代码的共识:**拷贝构造器 / 静态拷贝工厂**,别碰 `clone()`。

> **🔀 豆豆的多解台 · 深拷贝怎么做?**

| 解法 | 代码要点 | 适合什么时候 | 坑 |
|---|---|---|---|
| 拷贝构造器 / 静态工厂 | `Order.copyFrom(src, id)`,逐字段决定拷多深 | **默认首选**:字段可控、层次不深 | 字段多时手写啰嗦;新增字段要记得同步 |
| 序列化往返 | 对象 → JSON/字节流 → 读回新对象 | 层次很深、字段常变、恰好已有序列化设施 | 慢一个量级;字段须可序列化;transient 会丢 |
| 手工逐层复制 | 对每个可变字段递归 new 一份 | 只有一两处可变引用的小对象 | 漏一层就退化成浅拷贝;循环引用会递归到栈溢出 |

豆豆锐评:默认**拷贝构造器 / 静态工厂**——拷贝深度自己拿捏,编译器帮你盯字段;再配合「字段尽量不可变」,大部分字段根本不需要深拷,`List.copyOf` 一行收工。

JUnit 质检员复检:

```java
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class OrderCopyTest {

    @Test
    void copy_must_not_touch_original() {
        var original = new Order(1, "拿铁", List.of("双份浓缩"));
        var copy = Order.copyFrom(original, 2).withAddon("燕麦奶");

        assertEquals(List.of("双份浓缩"), original.addons(), "原单不该被动过");
        assertEquals(List.of("双份浓缩", "燕麦奶"), copy.addons());
    }

    @Test
    void addons_cannot_be_mutated_from_outside() {
        var order = new Order(1, "拿铁", List.of("双份浓缩"));
        assertThrows(UnsupportedOperationException.class,
                () -> order.addons().add("香草糖浆"));
    }
}
```

两条全绿。老范的原单,从此没人能隔空动它。

---

## 九、项目检查点 · 豆豆咖啡站 v8.1

```text
咖啡站形态:冬歇精装修 v8.1 —— 复制订单不再殃及原单
已具备  :吃透「只有值传递」;订单防御性拷贝 + wither 复制;浅/深拷贝分得清;告别 clone()
还没有  :Order 完整版里躺着七八个 boolean 口味开关,又乱又占地 —— 下一话收编
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| Java 只有值传递(地址值的副本) | 一面口头题常客,答「引用传递」直接扣分 |
| 浅拷贝 vs 深拷贝、防御性拷贝 | 「你的接口会被调用方改坏吗」——API 设计基本功 |
| 拷贝构造器 / 静态工厂 / wither,弃用 clone() | 代码评审里的风格加分项 |

---

## 十一、下一话悬念

修完拷贝,阿零盯着 Order 完整版发呆:`oatMilk`、`extraShot`、`lessSugar`、`decaf`……七八个 boolean 口味字段排成一列纵队,复制一次就得抄写一遍。

豆豆合上账本第一笔:「这排开关别抄了——**一个 int 就能装下全部开关**。」

> 下一话《位运算与口味开关》:& | ^ ~ 与移位,把七八个 boolean 收编进一枚 int 位图;顺路回看第 22 话,揭开 HashMap 容量必须是 2 的幂的真正原因。

---

## 🎯 随堂练习

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. Java 中传参的规则是什么?
   - A) 基本类型传值,引用类型传引用　B) 只有值传递　C) 只有引用传递　D) 取决于参数类型
2. 方法 `swap(int a, int b)` 交换了两个 int,回到调用方后 a 和 b 的值?
   - A) 已交换　B) 完全不变　C) 一个变一个不变　D) 取决于 JVM 流派
3. 把一个 `Order` 引用传给方法,方法里 `o = new Order(99, ...)`,调用方的引用?
   - A) 也指向新 Order　B) 依然指向旧 Order　C) 变成 null　D) 编译错误
4. 把一个 `Order` 引用传给方法,方法里 `o.addons().add("燕麦奶")`,调用方的订单?
   - A) 不变　B) 配料表被改了　C) 编译错误　D) 抛异常
5. 上面 3 和 4 的现象用同一套规则能同时解释吗?
   - A) 矛盾,说不通　B) 能:换牌子无感,进屋动家具人人有份　C) JVM 有 bug　D) 是两套不同机制
6. 浅拷贝和深拷贝的根本分界线是?
   - A) 字段数量多少　B) 是否复制了可变引用指向的子对象　C) 是否用了 clone()　D) 是否跨包
7. `Cloneable` 接口的正确评价是?
   - A) 现代 Java 首选的拷贝方案　B) 空标记接口,默认浅拷贝,一身历史包袱　C) 线程安全的深拷贝工具　D) JDK 25 新增
8. 在 record 紧凑构造器里写 `addons = List.copyOf(addons)` 的真实意图是?
   - A) 提升性能　B) 防御性拷贝:存的配料表与外界断开　C) 给序列化做准备　D) 没实际作用
9. 对可变对象做防御性拷贝,最推荐的方式是?
   - A) clone()　B) 拷贝构造器 / 静态拷贝工厂 配合不可变集合　C) 直接引用原对象　D) 序列化往返
10. 如果 `copy.addons().add("燕麦奶")` 后原单配料也变了,根因是?
    - A) Java 传参机制有 bug　B) 新旧订单共享同一个 ArrayList(浅拷贝)　C) String 不可变导致　D) 编译器的优化

> [!答案]
> **1-B**　Java 只有值传递:基本类型复印数值,引用类型复印地址值。**举一反三**:把「Java 是值传递还是引用传递」说清是面试第一题的及格线——引用的值是地址,所以是值。
> **2-B**　swap 没效果,因为 x 和 y 是 a、b 的复印版,换的是复印件。**举一反三**:C 语言在这方面和 Java 一样;Python/Go 的"swap"能生效是因为语言内置了元组解包。
> **3-B**　`o = new Order(...)` 只是把复印件上的地址擦掉重写,主调方手里的引向不变。**举一反三**:面试官追问「为什么 swap 换不动、集合却能变」,就用这题和下一题一起解释。
> **4-B**　`o.addons().add(...)` 没有改地址,是顺着地址走进堆里同一栋房子挪了家具。**举一反三**:这就是「不可变对象」(String/LocalDate)和「可变对象」(ArrayList/HashMap)在传参里的终极区别。
> **5-B**　同一套规则:传参 = 复印地址值;换地址(重新赋值)外面无感,顺着地址改对象属性两边都看得见。**举一反三**:能同时说清这两种情况,证明你不是在背答案,而是在理解模型。
> **6-B**　浅拷贝只复制对象自身字段里的引用值,指向的可变子对象还是同一个;深拷贝连子对象也递归复制。**举一反三**:Java 没有内置「一键深拷贝」,都得自己逐层写;把字段尽量设计成不可变,大部分就不用深拷。
> **7-B**　Cloneable 是空标记接口,`clone` 在 Object 上还是 protected,默认浅拷贝且绕过构造器。**举一反三**:现代 Java 推荐拷贝构造器/静态工厂;clone 只在维护老代码时认得就行。
> **8-B**　`List.copyOf` 返回不可变快照——存进去的配料表不怕被调用方事后修改。**举一反三**:进出 record 的可变容器最好走一次防御性拷贝,这是 API 设计基本功。
> **9-B**　拷贝构造器/静态工厂逐字段拷,编译器帮你盯新增字段;配合不可变集合,大部分字段根本不需要深拷。**举一反三**:序列化往返深拷虽一行解决,但慢一个量级,只适合层次很深时做懒人方案。
> **10-B**　new 了订单、照抄了 addons 地址,指向堆里同一个 ArrayList。**举一反三**:这是生产上最阴的 bug——不报错、静默错账;写好防御性拷贝 + JUnit,diff 跑一次才知道有没有共享引用。

### 解答题(5 道)

1. 用自己的话解释:既然 Java 只有值传递,为什么方法里能修改传进来的 ArrayList 内容?
2. `swap(a, b)` 换不动,`o.addons().add(...)` 却改得动——这两件事是不是矛盾的?为什么?
3. 浅拷贝和深拷贝的区别,用订单复制的例子说明。为什么 `clone()` 不是推荐的解法?
4. 写一段 JUnit 测试,证明复制新订单并给新单加燕麦奶后,原单的配料表纹丝不动。
5. 在 record 紧凑构造器里写防御性拷贝(`addons = List.copyOf(addons)`)的好处是什么?copyFrom 工厂方法又在防什么?

> [!答案]
> **1**　Java 值传递的意思是:传参时把变量格子里存的值复制一份递给方法。引用类型的变量格子里存的是对象的地址值,所以方法拿到的是地址值的副本——但顺着这个副本地址走进去,就是堆里同一个对象,改属性当然生效。**举一反三**:Python/JavaScript 的传参行为跟 Java 一模一样;说「引用传递」等于说「传的是变量本身」,那 swap 就该生效才对,但它不生效。
> **2**　不矛盾。重新赋值改的是局部变量的值(复印件),对外面的变量没影响;`.add()` 是顺着复印的地址值进去改堆里的对象,对象只有一份,自然谁都看得见。两根线:换牌子 vs 进屋挪家具,规则完全一致。**举一反三**:这就是为什么 `String`(不可变)当参数永远不会被方法「改坏」,`ArrayList`(可变)就会——不是规则变了,是对象能不能改。
> **3**　浅拷贝只复制对象自身的字段,可变引用字段彼此共享同一个子对象(如 ArrayList);深拷贝连子对象也新建,新旧彻底分家。clone() 是空标记接口 + protected 方法,默认浅拷贝且绕过构造器,新代码不推荐。**举一反三**:Java record 配合 `List.copyOf` 已经消灭了大部分浅拷贝风险;你还知道拷贝构造器/静态工厂替代 clone,就是合格评级的信号。
> **4**　```java
@Test void copy_must_not_touch_original() {
    var orig = new Order("拿铁", List.of("双份浓缩"));
    var copy = Order.copyFrom(orig, 2).withAddon("燕麦奶");
    assertEquals(List.of("双份浓缩"), orig.addons()); // 原单纹丝不动
    assertEquals(List.of("双份浓缩", "燕麦奶"), copy.addons());
}
```　**举一反三**:凡是涉及「复制 → 修改」的操作,都要写这种双向断言;没测试的拷贝 = 埋雷。
> **5**　防御性拷贝让存进去的集合与外部传入的引用彻底断开——传入者之后改集合,我手里的不受影响;copyFrom 工厂则是给已存在的订单做安全复制,同样避免共享引用。**举一反三**:Effective Java 第 50 条就是「必要时做防御性拷贝」,API 安全设计的基本功;List.copyOf 比 new ArrayList(src) 更干净,因为 null 值和空集合处理都帮你考虑好了。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
