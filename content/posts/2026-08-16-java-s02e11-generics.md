---
title: "《从零开始学 Java》23 · 泛型包装箱"
date: 2026-08-16
summary: "List<Coffee> 那对尖括号是什么?泛型让容器只装指定类型,把类型错误从运行时提前到编译时——尽管它运行时其实被『擦除』得一干二净。"
tags: [Java, Java漫画, 泛型, generics, 阿零与豆豆]
---

# 《从零开始学 Java》23 · 泛型包装箱

> 连载特刊 · 第二季「对象大陆」第 11 话 · 主线基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——一路用着 `List<Coffee>`、`Map<String,Coffee>`,今天终于搞清那对尖括号到底是什么。

---

## 一、需求:让容器「只装指定的货」

阿零翻出第一季一个「什么都能塞」的老式容器,取东西时得先强转:`(Coffee) box.get()`。一转错就运行时崩。豆豆:「不带类型的老容器,编译官帮不上忙——它不知道你箱子里装的是咖啡还是袜子。**泛型**让你在声明时就写死『这个箱子只装 `Coffee`』,装错的编译期就被当场拦下。」

---

## 二、漫画 · 什么都收的老仓库

> **〔1〕** 两个仓库并排:左边门口刷着「**什么都收**」,里面咖啡、螺丝、袜子混作一团;右边门口挂着牌子 `<Coffee>`,只收咖啡,整整齐齐。
> 豆豆:「泛型 `<T>` 就是给箱子贴上『只装某种货』的标签,让编译官替你把门。」

> **〔2〕** 阿零偏爱左边那间:「什么都收多灵活!一个仓库走天下。」他从里面随手抓一包,当成咖啡就往机器里冲。
> 豆豆:「你抓的是**袜子**……」

> **〔3〕** 机器「砰」地爆开一团黑烟,吐出 `ClassCastException`。阿零满脸黑灰。
> 豆豆(叼着豆子叉腰):「运行时才翻车,顾客都在看。泛型能把这一脚**提前到编译期**,让编译官在你打包前就拦下。」

> **〔4〕** 阿零不服:「那尖括号是不是运行时一直盯着箱子?」豆豆掀开运行时的箱子——**标签没了**,里面只是一个写着 `Object` 的素箱。
> 豆豆:「反转来了——泛型**只活在编译期**。编译完,尖括号被『擦掉』,运行时它就是个装 `Object` 的普通箱子。它是编译官的活,不是 JVM 的活。」

---

## 三、本话目标

- 理解泛型 `<T>` 带来的编译期类型安全;
- 写一个自己的泛型类 `Box<T>`;
- 搞懂**类型擦除**:泛型为何运行时「不存在」,原始类型为何能编译过;
- 踩一次原始类型导致的运行时 `ClassCastException`。

---

## 四、原理图:尖括号只活在编译期

```text
List<Coffee> 只能装 Coffee,取出即 Coffee,无需强转 —— 编译官全程盯着
List(原始类型)什么都能装,取出是 Object,强转那一刻才暴雷

自定义:class Box<T> { T item; T get(){...} void put(T t){...} }
        Box<Coffee> 装咖啡,Box<Member> 装会员,一套代码复用

类型擦除:编译后,Box<Coffee> 和 Box<Member> 变成同一个 Box(内部 T→Object),
         尖括号信息被擦掉,编译器在取值处替你偷偷插入强转(checkcast)。
```

---

## 五、代码:泛型包装箱

```java
class Box<T> {                 // T 是类型参数,用时再指定
    private T item;
    void put(T item) { this.item = item; }
    T get() { return item; }
}

// 全季统一:Coffee 固定三字段(含 stock),沿用第 19 话升级的 record
record Coffee(String name, double price, int stock) {}

public class Warehouse {
    public static void main(String[] args) {
        Box<Coffee> box = new Box<>();          // 声明:这个箱子只装 Coffee
        box.put(new Coffee("美式", 15.0, 20));
        Coffee c = box.get();                    // 直接是 Coffee,不用强转
        System.out.println(c.name() + " ¥" + c.price() + " 库存 " + c.stock());
    }
}
```

> **🎯 面试直击**:什么是类型擦除?为什么面试反复问?
> Java 泛型是**编译期**的把戏:编译器用尖括号做类型检查、并在取值处替你插入强转,**检查通过后就把类型信息「擦掉」**——`List<Coffee>` 和 `List<Member>` 在运行时是**同一个** `List`,内部 `T` 一律变成 `Object`(有上界则擦成上界)。这解释了三件事:① 为什么**原始类型 `List` 能编译过**(运行时它俩本就是一个类型);② 为什么 `list instanceof List<Coffee>` 不允许(运行时没有 `<Coffee>` 可判);③ 为什么不能 `new T[]`(运行时不知道 T 是啥)。附带机制:重写泛型方法时编译器还会自动生成**桥接方法**保证多态正确。

> **⏳ 版本时光机 · 尖括号这一路怎么来的**

| JDK 版本 | 写法 | 关键变化 |
|---|---|---|
| Java 1.4 及以前 | `List list = new ArrayList(); Coffee c = (Coffee) list.get(0);` | 无泛型,全靠手动强转,类型错误一律拖到运行时 |
| Java 5 | `List<Coffee> list = new ArrayList<Coffee>();` | 引入泛型,类型检查提前到编译期(用擦除实现,兼容老代码) |
| Java 7 | `List<Coffee> list = new ArrayList<>();` | 菱形运算符 `<>`,右边类型可省略,少打一遍 |
| Java 10+ | `var list = new ArrayList<Coffee>();` | `var` 推断,左边也省;主线默认这么写 |

一句演进小结:从「满屏强转、运行时暴雷」到「编译期把关、一个 `<>` 搞定」——泛型把类型错误从最贵的运行时,拉回到最便宜的编译期。

---

## 六、故意制造一个 Bug:用原始类型

去掉泛型,往「咖啡箱」里塞进一个字符串:

```java
Box raw = new Box();            // ← 故意:原始类型,丢失类型信息
raw.put("我不是咖啡");           // 编译只给一条 unchecked 警告,不拦
Coffee c = (Coffee) raw.get();  // 取出时强转
System.out.println(c.name());
```

---

## 七、读懂真实报错

```text
Exception in thread "main" java.lang.ClassCastException:
        class java.lang.String cannot be cast to class Coffee
        at Warehouse.main(Warehouse.java:12)
```

`ClassCastException` —— 原始类型让编译官睁一只眼闭一只眼(只给一条 `unchecked` 警告),错误一路拖到**运行时**强转那一刻才爆。而这个强转,平时你用 `Box<Coffee>` 时是**编译器偷偷替你插的**(类型擦除的一部分);现在类型信息丢了,插进去的强转就成了定时炸弹。用 `Box<Coffee>`,那行 `put("...")` 在**编译期**就通不过——**这正是泛型的价值:把错误提前**。

> **豆豆锐评**:看到 IDE 里那条黄色的 `unchecked` 警告别无视,它就是原始类型在向你招手。「能编译过」不等于「安全」——编译官只是碍于向后兼容不得不放行老式写法,不代表它认可。

---

## 八、修复,并用测试证明

始终带上泛型参数,让编译官全程把关:

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class WarehouseTest {
    @Test
    void generic_box_is_type_safe() {
        Box<Coffee> box = new Box<>();
        box.put(new Coffee("拿铁", 18.0, 10));
        assertEquals("拿铁", box.get().name());   // 取出即 Coffee,不用强转
        // box.put("字符串");  // 这行若取消注释,编译期直接报错 —— 错误被挡在门外
    }
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v1.11

```text
咖啡站形态:容器类型安全,取值不再强转
已具备  :理解并用好泛型,弄懂类型擦除为何让原始类型能编译却不安全
还差临门一脚:把对象 + 集合 + 接口 + 泛型,整合成一套面向对象版咖啡站 —— 下一话第二季大结局
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 泛型 / 编译期类型安全 | 集合、框架的地基;几乎所有 Java 岗默认要求 |
| **类型擦除** | 面试必问,能说清「原始类型为何能编译」直接拉开层次 |
| 原始类型的风险 / unchecked 警告 | 代码审查里的常见告警 |

---

## 十一、下一话悬念

对象、封装、继承、多态、接口、集合、泛型——第二季的武器,全齐了。阿零摩拳擦掌,豆豆却把他领回了第一季那台缠满电线的老咖啡机前。

> 下一话《面向对象版咖啡站》**第二季大结局**:把第一季那台「数组 + 静态方法」硬撑的咖啡机,重构成一套干净的对象模型 v2——`Coffee` 值对象、`Menu` 索引、`PaymentMethod` 接口、订单集合各司其职。阿零还会回头看自己第一季写的 v1 代码,连他自己都嫌乱。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 `/java`。*
