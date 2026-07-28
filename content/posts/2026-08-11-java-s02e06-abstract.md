---
title: "《从零开始学 Java》18 · 抽象类 vs 接口"
date: 2026-08-11
summary: "都能定义未完成的方法,到底用哪个?一张对照表 + 一台咖啡设备,讲清共享状态用抽象类、能力契约用接口,并给一条能当场拍板的选型法则。"
tags: [Java, Java漫画, 抽象类, 接口, 阿零与豆豆]
---

# 《从零开始学 Java》18 · 抽象类 vs 接口

> 第二季「对象大陆」第 6 话 · 基线 JDK 25 · 承接:上一话刚学会接口、却分不清它和抽象类的阿零。

---

## 一、需求:选对工具

所有咖啡设备都共享「预热 → 制作」的固定流程,只有「制作」这一步各不相同。这种「**共享状态 + 固定骨架 + 个别步骤留空**」,该用抽象类还是接口?阿零昨天刚被接口的开闭原则惊艳,今天就想给一切都上接口——结果一到「设备之间要共用同一台电机、同一段预热逻辑」就卡壳了。

---

## 二、漫画 · 该用哪个

![《从零开始学 Java》18 · 抽象类 vs 接口 —— 阿零与豆豆六格漫画](/comics/java/s02e06-abstract.png)


> [!文字版]
> **〔1〕** 阿零抱着头在两块牌子中间来回横跳:一块 `abstract class`,一块 `interface`。
> 阿零:「都能写没实现的方法……到底用哪个啊?我全用接口行不行?」
>
> **〔2〕** 豆豆举起两样东西对比。左手一台**半成品咖啡机**:自带电机、外壳、预热程序,只差一个「萃取核心」的插槽。右手一张**能力清单合同**:只写「必须能萃取」,别的什么都没有。
> 豆豆:「要**共享字段和已经写好的逻辑**,用抽象类——它能存状态、有构造器。只想约定**能做什么**、还要能多头签约,用接口。」
>
> **〔3〕** 阿零指着接口不服:「可你上话说接口现在也能写 `default`、`static` 方法了呀?」
> 豆豆(叼豆子):「能,但接口**存不了实例状态**——没有实例字段、没有构造器。你那台机器的电机型号、预热温度存哪?接口存不下。要**共享的是状态**,接口就退场。」
>
> **〔4〕** 豆豆把「萃取核心」啪地插进半成品机器,机器嗡地转起来,吐出一杯咖啡。
> 豆豆:「看——抽象类 = 半成品机器,骨架我搭好,你只填最后那个零件(`brew`)。骨架复用,差异下放。」
>
> **〔5〕** 阿零恍然:「所以……先想用接口,除非要共享状态和骨架?」
> 豆豆(叉腰,难得点头):「孺子可教。**先接口,确需共享状态 + 骨架流程,才上抽象类。** 记住这一句,面试和干活都够用。」
---

## 三、本话目标

- 用 `abstract class` 定义「半成品」:部分实现 + 部分抽象方法;
- 理解抽象类能有字段、构造器、已实现方法;接口能有 `default`/`static`/`private` 方法却存不了实例状态;
- 掌握选型法则:**先接口,确需共享状态 + 骨架才抽象类**;
- 用模板方法固定流程、把差异留给子类。

---

## 四、原理图

```text
                       抽象类 abstract class        接口 interface
能有实例字段/构造器            能(可存共享状态)         不能(字段只是 public static final 常量)
方法实现                 可有已实现方法 + 抽象方法    default/static/private 方法(JDK 8/9 起)
继承/实现数量             单继承(只能 extends 一个)   可 implements 多个
适合                    共享状态 + 骨架流程          纯能力契约、需多头实现

选型法则:先接口;确需「共享状态 + 通用骨架」要复用时,才用抽象类。
```

> **豆豆锐评**:别被「接口现在也能写 `default`/`static` 方法」骗了,以为它俩没区别。**分水岭是状态**:抽象类能有实例字段和构造器,能承载「所有设备共用的电机、预热参数」;接口的字段全是常量,存不了每个实例各自的状态。要共享**行为**,接口够;要共享**状态**,只能抽象类。

---

## 五、代码:抽象的咖啡设备(模板方法)

```java
abstract class CoffeeMaker {
    private final String model;         // 共享字段(接口给不了)
    CoffeeMaker(String model) { this.model = model; }   // 构造器(接口也给不了)

    // 已实现的通用流程(模板),固定骨架
    final String run() {
        return model + ":预热完成 → " + brew();   // brew 留给子类
    }

    protected abstract String brew();   // 抽象方法:每种设备自己实现
}

class DripMaker extends CoffeeMaker {
    DripMaker() { super("滴滤机"); }
    protected String brew() { return "滴滤出美式"; }
}
class SteamMaker extends CoffeeMaker {
    SteamMaker() { super("蒸汽机"); }
    protected String brew() { return "高压萃取 + 打奶泡"; }
}

public class Devices {
    public static void main(String[] args) {
        for (CoffeeMaker m : new CoffeeMaker[]{new DripMaker(), new SteamMaker()}) {
            System.out.println(m.run());
        }
    }
}
```

`run()` 是写死的骨架(`final`,子类不许乱改流程),`brew()` 是留空的插槽——这正是漫画里那台「半成品机器」:骨架复用,差异下放。

---

## 六、故意制造一个 Bug

想直接 `new` 一个抽象类:

```java
CoffeeMaker m = new CoffeeMaker("通用机");   // ← 故意:实例化抽象类
```

---

## 七、读懂真实报错

```text
Devices.java: error: CoffeeMaker is abstract; cannot be instantiated
        CoffeeMaker m = new CoffeeMaker("通用机");
                        ^
```

`abstract; cannot be instantiated` —— 抽象类是「半成品」,`brew()` 还没实现,不能直接造实物。只能 `new` 它的具体子类。

> **🎯 面试直击**:抽象类和接口有什么区别?怎么选?
> 核心区别是**状态**:抽象类能有实例字段和构造器(可承载共享状态),接口不能(字段只是常量);抽象类**单继承**,接口**可多实现**。JDK 8/9 后接口也能有 `default`/`static`/`private` 方法,行为上差距缩小,但**存不了实例状态**这条没变。选型法则:**先接口**(耦合低、可多实现),**确需共享状态 + 通用骨架**再上抽象类。追问点:两者能配合——常见做法是「接口定契约 + 抽象类提供骨架实现」,如 JDK 里的 `List` / `AbstractList`。

---

## 八、修复,并用测试证明

`new` 具体子类:

```java
@Test
void template_method_fixes_skeleton() {
    assertEquals("滴滤机:预热完成 → 滴滤出美式", new DripMaker().run());
    assertEquals("蒸汽机:预热完成 → 高压萃取 + 打奶泡", new SteamMaker().run());
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v1.6

```text
新增:CoffeeMaker 抽象类固定「预热→制作」骨架,子类只填 brew
已具备:OOP 四件套(类/封装/继承/多态 + 接口/抽象)集齐,且能判断「该用哪个」
还没有:两杯"美式"该算同一种吗?对象怎么判等 —— 下一话进 Object 神殿
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 抽象类 vs 接口的取舍 | 面试高频「区别与选型」 |
| 抽象类的状态/构造器 vs 接口的 default/static | 进阶追问:JDK 8/9 后两者的边界 |
| 模板方法模式 | 设计模式入门;Spring 里随处可见 |

---

## 十一、下一话悬念

咖啡站想去掉重复的会员,却发现两个「张三」对象被当成不同的人。

> 下一话《Object 神殿》:所有类的祖先 `Object`,以及 `equals` / `hashCode` / `toString` 的契约 —— 顺便认识自动生成它们的 `record`。

---

## 🎯 随堂练习
先自己做，再对答案。选择难度递进，解答从概念到综合，代码含边界验证。

### 一、选择题（10 道）

1. [基础] 用什么关键字声明抽象类？- A) `interface`　B) `abstract class`　C) `final class`　D) `static class`
2. [基础] 抽象方法的方法体是？- A) `{}`　B) `{ return null; }`　C) 没有方法体，以 `;` 结尾　D) 必须有方法体
3. [基础] 抽象类能不能被 `new` 实例化？- A) 可以　B) 不可以　C) 只有无参时可以　D) 取决于 JDK 版本
4. [进阶] 抽象类可以有构造器吗？- A) 不能　B) 可以，且子类通过 `super()` 调用它　C) 可以但不能被子类调用　D) 只有 Java 11+ 才支持
5. [进阶] 一个类继承了抽象类但不覆写所有抽象方法，会发生什么？- A) 编译通过　B) 该子类也必须声明为 `abstract`　C) 运行时异常　D) 自动生成空实现
6. [进阶] 抽象类中的 `abstract` 方法可以有哪些修饰符？- A) `private`　B) `static`　C) `final`　D) 只能是 `public` 或 `protected`（不能和 `private`/`static`/`final` 同时出现）
7. [进阶] 模板方法模式中，模板方法（骨架方法）应该用什么修饰符防止子类覆写？- A) `abstract`　B) `default`　C) `final`　D) `static`
8. [综合] 抽象类和接口的核心选型法则是什么？- A) 随便用　B) 有共享状态/字段 → 抽象类；纯行为契约 → 接口　C) 总是优先用抽象类　D) 总是优先用接口
9. [综合] `abstract` 能和哪些关键字同时修饰一个方法？- A) `private`　B) `final`　C) `static`　D) 都不行——`abstract` 要求子类覆写，而 `private`/`final`/`static` 都阻止覆写，互斥
10. [综合] 下面代码的输出是什么？```java abstract class A { A() { print(); } abstract void print(); } class B extends A { int x = 5; void print() { System.out.println(x); } } new B();```- A) `0`　B) `5`　C) `null`　D) 编译错误

> [!答案] **1-B**　`abstract class` 声明抽象类。**2-C**　抽象方法只有签名和 `;`，没有 `{}`——方法体留给子类实现。**3-B**　抽象类是不完整的，不能直接实例化——只能通过具体的子类实例化。**4-B**　抽象类可以有构造器，子类用 `super()` 调用它初始化父类字段。**5-B**　规则：不完成所有抽象方法的子类也必须是抽象类——直到某个具体子类覆写完所有抽象方法。**6-D**　`abstract` 方法必须能被覆写，所以不能和 `private`（不可见）、`static`（属于类）、`final`（不可覆写）共存。**7-C**　`final` 方法不可覆写——模板方法的骨架是固定流程，只允许子类重写内部步骤（抽象钩子方法）。**8-B**　"is-a + 共享状态" → 抽象类；"can-do 契约" → 接口。有字段要继承用抽象类，纯行为用接口。**9-D**　`abstract` 语义是"留给子类覆写"，而 `private`/`final`/`static` 都阻止覆写——互斥关系。**10-A**　输出 `0` 而非 `5`——因为父类构造器先执行，此时 `B` 的字段 `x` 还没初始化（默认值 0），父类构造器调了子类的 `print()` 读到的是未初始化的 `x`。这是经典的"构造器里调可覆写方法"陷阱。
**举一反三**：第 10 题是面试高级陷阱——"构造器调用可覆写方法的隐式问题"，几乎所有框架（Spring、MyBatis）都遇到过由此引发的 bug。

### 二、解答题（3 道）

1. [概念] 抽象类的核心作用是什么？为什么不让所有类都可实例化、非要搞个"不能 new"的类型？
2. [场景] 咖啡站有滴滤机和蒸汽机两种咖啡机：制作步骤都是"预热 → 制作 → 倒杯"，但中间"制作"环节不同（滴滤 vs 高压萃取 + 奶泡）。用模板方法模式设计，写出抽象类和两个子类的框架，说明哪些方法是 `final` 的、哪些是 `abstract` 的。
3. [综合] 抽象类和接口都能定义"未完成的方法"，都能被多态调用。在什么场景下**只能**用抽象类而不能用接口？反过来什么场景下**只能**用接口？列出 3 条硬性判断标准。

> [!答案] **1**　抽象类的作用是**扛下共性、留下变点**——把多个子类的共同数据和逻辑上提到父类（`preheat()`、`pour()`），把不同的部分声明为 `abstract` 强制子类必须实现（`brew()`）。不让实例化是因为它本身不完整——一台"没有制作方法"的咖啡机不该存在。**举一反三**：这和现实世界的"标准件"逻辑一样——设计图（抽象类）定义了框架，实际成品（具体子类）补齐剩余部分。**2**　
> ```java
> abstract class CoffeeMaker {
>     String model;
>     CoffeeMaker(String model) { this.model = model; }
>     final void preheat() { System.out.println(model + ": 预热完成"); }  // final——子类不能改
>     abstract String brew();                     // abstract——强制子类实现
>     final void pour() { System.out.println("倒入杯中"); }
>     final void make() {                        // final——骨架不可改
>         preheat();
>         System.out.println(brew());
>         pour();
>     }
> }
> class DripMaker extends CoffeeMaker {
>     DripMaker() { super("滴滤机"); }
>     String brew() { return "滴滤出美式"; }
> }
> class SteamMaker extends CoffeeMaker {
>     SteamMaker() { super("蒸汽机"); }
>     String brew() { return "高压萃取 + 打奶泡"; }
> }
> ```
> `make()` 和 `preheat()`/`pour()` 用 `final` 定死骨架，`brew()` 用 `abstract` 留空——这就是模板方法模式。**举一反三**：如果子类覆写了 `make()`，模板方法的"固定流程"就被破坏了——所以要用 `final` 锁住。**3**　只能抽象类：①需要共享实例字段（所有咖啡机都有 `model` 和 `powerOn` 状态）；②需要构造器初始化公共状态；③需要 `protected` 方法暴露给子类但不给外部。只能接口：①需要多"继承"行为契约（一个类可以实现多个接口）；②完全无状态的纯行为约定（如 `Comparator`、`Runnable`）；③预期跨越不同的类层次——一个 `Payable` 接口可以被 `Coffee`、`Order`、`Member` 等完全无关的类实现。**举一反三**：Java 8+ 后接口也有 `default` 方法和 `static` 方法，但它仍然没有实例字段——"有没有状态"仍是第一条硬边界。

### 三、代码题（2 道）

1. [基础] 定义抽象类 `Shape`（抽象方法 `double area()`），`Circle`（字段 `double radius`）和 `Rectangle`（字段 `double width, height`）分别实现 `area()`。用 `Shape[]` 多态遍历打印面积，验证模板方法框架。
2. [综合] 设计抽象类 `Coffee`（字段 `String name, double price`；抽象方法 `String origin()` 返回产地；`final String label()` 返回 `name + " " + price`）。`Arabica` 子类覆写 `origin()` 返回 `"埃塞俄比亚"`，`Robusta` 子类覆写返回 `"越南"`。关键验证：`label()` 是 `final`，子类无法覆写。写测试确认多态调用 `origin()` 正确派发，且尝试覆写 `label()` 会产生编译错误。

> [!答案] **1 验收**：
> ```java
> abstract class Shape {
>     abstract double area();
> }
> class Circle extends Shape {
>     double radius;
>     Circle(double r) { radius = r; }
>     double area() { return Math.PI * radius * radius; }
> }
> class Rectangle extends Shape {
>     double width, height;
>     Rectangle(double w, double h) { width = w; height = h; }
>     double area() { return width * height; }
> }
> Shape[] shapes = {new Circle(2), new Rectangle(3, 4)};
> for (Shape s : shapes) System.out.println(s.area());
> // 输出: 12.566... / 12.0
> ```
> **举一反三**：`Shape[]` 声明为抽象类型但存具体子类——这是多态的标准用法。加新形状只需新增子类。**2 验收**：
> ```java
> abstract class Coffee {
>     String name;
>     double price;
>     Coffee(String name, double price) { this.name = name; this.price = price; }
>     abstract String origin();            // abstract: 强制子类实现
>     final String label() {               // final: 禁止子类覆写
>         return name + " ¥" + price;
>     }
> }
> class Arabica extends Coffee {
>     Arabica() { super("阿拉比卡", 18.0); }
>     String origin() { return "埃塞俄比亚"; }
> }
> class Robusta extends Coffee {
>     Robusta() { super("罗布斯塔", 12.0); }
>     String origin() { return "越南"; }
> }
> // 测试:
> Coffee c1 = new Arabica();
> Coffee c2 = new Robusta();
> System.out.println(c1.label() + " 产地:" + c1.origin()); // 阿拉比卡 ¥18.0 产地:埃塞俄比亚
> System.out.println(c2.label() + " 产地:" + c2.origin()); // 罗布斯塔 ¥12.0 产地:越南
> // 尝试在子类中写 @Override String label() → 编译错误: final method cannot be overridden
> ```
> **举一反三**：`abstract` 和 `final` 是一对绝配——`abstract` 强制子类实现（`origin()`），`final` 禁止子类覆写（`label()`）。一个类可以同时有"必须填的坑"和"不准动的梁"。

---

*本话属于连载《从零开始学 Java》。世界观见 `docs/java-comic-academy/handbook.md`;季次地图见 `/java`。*
