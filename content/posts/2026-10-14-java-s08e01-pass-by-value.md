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

话音未落,收银台先出了事。常客老周说「照昨天那单再来一份,换燕麦奶」,阿零演示他刚写的「复制订单」:复制、加料、下单,一气呵成。三分钟后老周举着小票回来——昨天那张**原单**上也凭空多了一份燕麦奶,会员账单对不上了。

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

> **〔4〕** 收银台警报大作:老周的原单凭空多出燕麦奶,Logic Bug 怪趴在配料表上偷笑——两张订单的「配料表」引线,拧在堆里同一个 ArrayList 上。
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

两条全绿。老周的原单,从此没人能隔空动它。

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

1. Java 的参数传递机制是?
   - A) 基本类型值传递,引用类型引用传递　B) **只有值传递** —— 引用类型传的是「地址值的副本」　C) 由 JVM 决定　D) 只有引用传递
2. `static void swap(int x, int y)` 为什么换不动外面的 `a`、`b`?
   - A) 参数是 final　B) 方法里改的只是数值的复印件　C) int 不可变　D) 需要加返回值
3. `static void rename(Order o) { o = new Order(...); }` 调用后,外面的 `order`?
   - A) 变成新对象　B) 纹丝不动 —— 换的只是那份复印的地址值　C) 变成 null　D) 抛异常
4. `static void addOat(Order o) { o.addons().add("燕麦奶"); }` 为什么外面看得见?
   - A) 因为 List 是特殊类型　B) 因为顺着地址改的是**堆里同一个对象**　C) 因为参数没加 final　D) 因为发生了引用传递
5. 浅拷贝和深拷贝的区别是?
   - A) 浅拷贝更快　B) **浅拷贝照抄字段里的引用(新旧对象合租同一批可变内脏);深拷贝把引用指向的可变对象也复制一份**　C) 深拷贝只复制基本类型　D) 两者等价
6. 「改新单,原单也跟着变」的根因是?
   - A) record 的 bug　B) 构造新 Order 时只复制了 `addons` 的地址值,两张订单共用同一个 ArrayList　C) 线程安全问题　D) 缓存导致
7. 为什么新代码不推荐用 `clone()`?
   - A) 性能差　B) **Cloneable 是空标记接口、`clone` 在 Object 上且是 protected、默认浅拷贝、还绕过构造器让防御性拷贝失效**　C) 已被移除　D) 不支持泛型
8. 紧凑构造器里写 `addons = List.copyOf(addons)` 属于?
   - A) 类型转换　B) **防御性拷贝** —— 存下的集合与外界断开　C) 性能优化　D) 空值检查
9. 加上防御性拷贝后,外部对 `order.addons()` 调 `add` 会?
   - A) 成功添加　B) 抛 `UnsupportedOperationException` —— 「静默改坏」变成「当场翻脸」　C) 静默忽略　D) 抛 NPE
10. 深拷贝的默认首选方案是?
    - A) 序列化往返　B) **拷贝构造器 / 静态拷贝工厂** —— 拷贝深度自己拿捏,编译器帮你盯字段　C) `clone()`　D) 反射复制

> [!答案]
> **1-B**　复印的是值,只不过引用类型的值是地址。**举一反三**:答「引用传递」在面试里直接扣分,这是最经典的送分/送命题。
> **2-B**　改的是副本。**举一反三**:所以 Java 里想「交换两个值」只能靠返回值或包装成对象。
> **3-B**　重新赋值只动了复印牌。**举一反三**:这也是「值传递」最有说服力的证明 —— 换不动外面的引用。
> **4-B**　同一栋房,两把钥匙。**举一反三**:所以方法能「就地修改」传进来的集合 —— 这既是能力也是风险,API 设计时要想清楚。
> **5-B**　合租 vs 分家。**举一反三**:判断需不需要深拷贝,只看一个问题:「字段里有没有**可变**的引用」。
> **6-B**　共享可变引用。**举一反三**:这类 Bug 一行异常都没有,账悄悄错了 —— 比崩溃更可怕。
> **7-B**　一身历史包袱。**举一反三**:「绕过构造器」这一条尤其致命 —— 你所有的校验和防御性拷贝都会被跳过。
> **8-B**　进门先复印。**举一反三**:对称的还有「出门也复印」—— getter 返回可变集合前也要包一层不可变。
> **9-B**　错不过夜。**举一反三**:让错误尽早、尽响地暴露,是 fail-fast 思想的又一次应用。
> **10-B**　默认首选拷贝构造器。**举一反三**:再配合「字段尽量不可变」,大部分字段根本不需要深拷,`List.copyOf` 一行收工。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
