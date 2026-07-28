---
title: "《从零开始学 Java》16 · 多态调度中心"
date: 2026-08-09
summary: "一个数组里混着普通杯和高级杯,却希望每杯各自描述自己。父类引用指向子类对象,运行时自动派发——阿零嘴硬『都是咖啡怕什么』,被强转当场打脸。"
tags: [Java, Java漫画, 多态, 动态派发, 阿零与豆豆]
---

# 《从零开始学 Java》16 · 多态调度中心

> 第二季「对象大陆」第 4 话 · 基线 JDK 25 · 承接:上一话有了 Coffee 与 PremiumCoffee 家族(PremiumCoffee 已暴露 `getFoam()`)。

---

## 一、需求:一视同仁,又各显其能

菜单里既有 `Coffee` 也有 `PremiumCoffee`。想用**同一种类型**装下它们、用**同一个调用** `describe()`,却让每杯输出自己的描述。第一季刚学过数组,正好拿它把这一排咖啡串起来。

> 说明:统一装载这一步,本话继续用**数组** `Coffee[]`——集合 `List` 要到本季稍后才登场,先不越界。

---

## 二、漫画 · 都是咖啡怕什么

![《从零开始学 Java》16 · 多态调度中心 —— 阿零与豆豆六格漫画](/comics/java/s02e04-polymorphism.png)


> [!文字版]
> **〔1〕** 调度中心一排相同的传送口,全标着 `Coffee`,里面滚出的却有普通杯、也有带奶泡的高级杯。
> 豆豆:「用父类 `Coffee` 接住所有子类,这叫**向上转型**——安全,子类天生就是一种父类。」
>
> **〔2〕** 阿零喊一声 `describe()`,每杯自动报出自己的版本:美式报美式,拿铁多报一句奶泡。
> 豆豆:「调用哪个版本,**运行时**看对象的真实类型决定 —— 这就是多态。」
>
> **〔3〕** 阿零得意忘形,想把每一杯都强行当高级杯处理:「都是咖啡,怕什么!」抬手就把美式那杯 `(PremiumCoffee)` 一转——
> **〔4〕** 「哐当!」美式那杯当场炸开,弹出 `ClassCastException`。阿零糊一脸咖啡渣。
> 豆豆(叼豆子看戏):「嘴硬。**向上转型**人人有份,**向下转型**得先验明正身。美式压根不是高级杯,你硬塞,它当然翻脸。」
>
> **〔5〕** 阿零抹脸:「那我咋知道哪杯是高级杯?」
> 豆豆:「转之前先用 `instanceof` 问一句『你到底是不是』,是了再转。**先判类型,再向下转**——这条能救你无数次。」
---

## 三、本话目标

- 理解「父类引用指向子类对象」(向上转型);
- 理解运行时**动态派发**(调用子类覆盖后的方法);
- 用一个 `Coffee[]` 数组统一管理不同子类;
- 认清「字段无多态、静态方法无多态,多态只对实例方法成立」;
- 学会「向下转型前先 `instanceof` 判类型」。

---

## 四、原理图

```text
Coffee c = new PremiumCoffee(...);   引用类型是 Coffee,真实对象是 PremiumCoffee
c.describe();                         调用的是 PremiumCoffee 覆盖后的版本(运行时决定)

现代 instanceof(判类型 + 转型一步到位):
if (c instanceof PremiumCoffee p) {  匹配成功就直接得到已转型的 p
    ... p.getFoam() ...
}
```

---

## 五、代码:统一调度不同咖啡

```java
public class Menu {
    public static void main(String[] args) {
        // 父类引用装子类对象,一个数组混装(数组第一季已学)
        Coffee[] menu = {
            new Coffee("美式", 15.0, 20),
            new PremiumCoffee("燕麦拿铁", 22.0, 8, 3)
        };

        for (Coffee c : menu) {
            System.out.println(c.describe());   // 各自派发到正确版本
        }
    }
}
```

输出:

```text
美式 ¥15.0(库存 20)
燕麦拿铁 ¥22.0(库存 8) · 奶泡 3 级
```

同一句 `c.describe()`,两种行为 —— 新增一种咖啡子类,这段调度代码**一个字都不用改**。这就是多态的杀伤力:对扩展开放,对修改关闭。

> **🎯 面试直击**:多态对字段和静态方法也生效吗?
> **不**。多态(动态派发)**只对实例方法**成立。**字段**看引用的**编译期类型**——父类引用访问同名字段拿到的是父类那份;**静态方法**绑定在类上、由编译期类型决定,子类同名静态方法只是「隐藏」而非「覆盖」。一句话记牢:**只有实例方法会在运行时按真实类型派发**。追问点:所以别用父类引用去读子类「覆盖」的字段,也别指望 `静态方法` 有多态——它们在编译期就被钉死了。

---

## 六、故意制造一个 Bug

学阿零嘴硬,想对每一杯都按高级杯处理,直接强转所有元素:

```java
for (Coffee c : menu) {
    PremiumCoffee p = (PremiumCoffee) c;   // ← 故意:把普通美式也强转成高级杯
    System.out.println(p.describe());
}
```

---

## 七、读懂真实报错

```text
Exception in thread "main" java.lang.ClassCastException:
        class Coffee cannot be cast to class PremiumCoffee
        at Menu.main(Menu.java:12)
```

`ClassCastException` —— 美式的**真实类型**是 `Coffee`,硬转成子类 `PremiumCoffee` 会在**运行时**崩掉(编译期看着是 `Coffee` 转子类,语法上放行,所以这类坑往往躲过编译、跑起来才炸)。向上转型总是安全,**向下转型必须先验明正身**。

> **豆豆锐评**:向上转型是「儿子当爹用」,天然成立、不用检查;向下转型是「把爹硬认成某个儿子」,得先问清楚「你到底是不是这个儿子」。别信「都是咖啡怕什么」——运行时的 `ClassCastException` 可不跟你讲人情。`instanceof` 那一问,就是你的安全带。

---

## 八、修复,并用测试证明

用现代 `instanceof` 模式匹配,先判类型、匹配成功再拿到已转型的 `p`,只对真的高级杯操作:

```java
static int foamLevel(Coffee c) {
    return c instanceof PremiumCoffee p ? p.getFoam() : 0;   // 不是高级杯就当 0
}
```

```java
@Test
void polymorphic_foam() {
    assertEquals(0, Menu.foamLevel(new Coffee("美式", 15, 20)));
    assertEquals(3, Menu.foamLevel(new PremiumCoffee("拿铁", 22, 8, 3)));
}
```

> `getFoam()` 上一话已经加到 `PremiumCoffee` 里,这里直接用。

---

## 九、项目检查点 · 豆豆咖啡站 v1.4

```text
新增:用 Coffee[] 统一调度多种咖啡,靠多态各显其能
已具备:向上转型 / 动态派发 / instanceof 模式匹配安全向下转型
还没有:顾客要用支付宝/微信/现金付款,收银台不想为每种写一套 —— 下一话进接口
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 多态 / 动态派发 | OOP 三大特征之一,面试重头 |
| 字段/静态方法无多态 | 高频陷阱题,专坑「以为一切都多态」 |
| instanceof 模式匹配 | 「Java 新特性」高频 |
| ClassCastException | 向下转型的经典坑 |

---

## 十一、下一话悬念

收银台面对支付宝、微信、现金,总不能写三套 if-else。它需要的只是「一个能 `pay()` 的东西」。

> 下一话《接口合同》:用 `interface PaymentMethod` 定义统一契约,三种付款方式各自实现,收银台只认接口——「积分支付」还会临时插队,现场演示什么叫「加功能不动老代码」。

---

## 🎯 随堂练习
先自己做，再对答案。选择难度递进，解答从概念到综合，代码含边界验证。

### 一、选择题（10 道）

1. [基础] 多态的三个前提条件是什么？- A) 封装 + 继承 + 接口　B) 继承 + 方法覆写 + 父类引用指向子类对象　C) static + final + private　D) 只要 extends 就行
2. [基础] `Drink d = new Coffee(); d.describe();` 实际调用的是哪个 `describe()`？- A) `Drink` 的　B) `Coffee` 的　C) `Object` 的　D) 编译失败
3. [基础] `Object obj = "hello"; String s = (String) obj;` 这叫什么转换？- A) 向上转型　B) 向下转型　C) 自动装箱　D) 拆箱
4. [进阶] 向下转型前应该用什么来避免 `ClassCastException`？- A) `try-catch`　B) `instanceof`　C) `==`　D) `equals()`
5. [进阶] 以下哪一项**不走**动态绑定？- A) 实例方法　B) 覆写的方法　C) `static` 方法　D) `toString()`
6. [进阶] `java 17+` 中下面代码哪个写法是模式匹配的 `instanceof`？- A) `if (obj instanceof String s)`　B) `if (obj instanceof String(s))`　C) `if (obj instanceof String)`　D) `if (obj as String s)`
7. [进阶] 下面代码输出什么？```java class A { int x = 1; int getX() { return x; } } class B extends A { int x = 2; int getX() { return x; } } A a = new B(); System.out.println(a.x + "," + a.getX());```- A) `2,2`　B) `1,2`　C) `1,1`　D) `2,1`
8. [综合] `A a = new B(); B b = a;` 能编译通过吗？- A) 能　B) 不能，需要 `B b = (B) a;`　C) 能但运行时报错　D) 取决于 JVM 版本
9. [综合] Java 多态和 C++ 虚函数的主要区别是？- A) Java 所有实例方法默认就是"虚"的（可覆写的）　B) C++ 不需要 virtual 关键字　C) Java 不支持多态　D) 没有任何区别
10. [综合] 以下关于字段 vs 方法在多态中行为的描述，正确的是？- A) 字段和方法都走动态绑定　B) 字段看声明类型（无多态），方法看实际类型（动态绑定）　C) 字段看实际类型　D) 都不走动态绑定

> [!答案] **1-B**　三要素：父类引用 + 方法覆写 + 子类对象。**2-B**　动态绑定——编译看左边（`Drink`），运行找右边（`Coffee`）。**3-B**　父→子是向下转型，必须显式强转，不保证安全。**4-B**　`instanceof` 在转型前检查实际类型，是向下转型的安全带。**5-C**　`static` 方法属于类而不是实例，编译时根据引用类型决定——跟对象无关，不走多态。**6-A**　`if (obj instanceof String s)` 是 Java 16+ 模式匹配语法——判断 + 强转一步完成。**7-B**　`a.x` 看声明类型 `A`→取 `A.x=1`；`a.getX()` 走动态绑定→实际是 `B`→取 `B.getX()` 返回 2。这就是字段无多态、方法有多态的经典陷阱。**8-B**　从父类引用赋给子类引用是向下转型，必须显式写 `(B)` 强转——编译器检查引用声明类型。**9-A**　Java 实例方法默认可以被覆写（等效 C++ 的 `virtual`），除非加 `final`/`private`/`static`。**10-B**　字段的访问只看声明类型（编译期），方法的调用看实际类型（运行期）——这是多态最常见也是最重要的区分。
**举一反三**：第 7 题是面试高频陷阱——"字段隐藏 vs 方法覆写"，能讲清这点的，多态核心就打通了。

### 二、解答题（3 道）

1. [概念] 动态绑定的"编译看左边、运行看右边"具体什么意思？为什么编译时需要看左边？
2. [场景] 咖啡站菜单需要根据咖啡类型打折：普通咖啡 9 折，高级咖啡 85 折。用多态设计 `discount()` 方法，说明为什么不需要 `if (c instanceof Premium)` 这种类型判断。
3. [综合] 向下转型为什么危险？Java 16+ 的 `instanceof` 模式匹配如何安全地解决这个问题？写出用模式匹配处理混合咖啡数组（普通 + 高级）的代码框架。

> [!答案] **1**　"编译看左边"：编译器只认**引用的声明类型**——`Drink d` 只允许调用 `Drink` 类中声明的方法和字段。"运行看右边"：JVM 在执行方法时查找**对象的实际类型**的覆写版本。编译需要看左边是因为 Java 是静态类型语言——必须保证调用的方法在声明类型中存在（否则编译错误），但方法版本的选择推迟到运行时（多态）。**举一反三**：这就是为什么 `Object o = "hi"; o.length();` 编译失败——`Object` 没有 `length()`，虽然运行时实际对象 `String` 有。**2**　
> ```java
> class Coffee { double discount() { return 0.9; } }
> class PremiumCoffee extends Coffee { @Override double discount() { return 0.85; } }
> // 使用:
> Coffee[] menu = {new Coffee(...), new PremiumCoffee(...)};
> for (Coffee c : menu) { double price = c.price * c.discount(); }
> ```
> 不需要 `instanceof` 判断——每个子类覆写自己的 `discount()`，多态自动派发到正确的版本。当你发现自己在写 `if (x instanceof A)... else if (x instanceof B)...`，多半是没利用好多态。**举一反三**：消除 `instanceof` 分支是多态的核心价值——代码对扩展开放，加新类型只加新子类、不动老代码。**3**　向下转型的危险在于：父类引用指向的不一定是目标子类——`A a = new B(); C c = (C) a;` 在运行时抛 `ClassCastException`。Java 16+ 模式匹配解决：
> ```java
> Coffee[] menu = {new Coffee(...), new PremiumCoffee(...)};
> for (Coffee c : menu) {
>     if (c instanceof PremiumCoffee p) {
>         System.out.println("高级杯奶泡: " + p.getFoam());
>     } else {
>         System.out.println("普通杯: " + c.describe());
>     }
> }
> ```
> `c instanceof PremiumCoffee p` 判断 + 绑定一步到位，变量 `p` 只在 if 内部有效——安全且简洁。**举一反三**：模式匹配不光省一行强转，还消除了"先转型再用、中间因并发变成不同类型"的极低概率 bug。

### 三、代码题（2 道）

1. [基础] 定义 `Drink` 父类（`describe()` 返回 `"饮品"`），`Coffee` 和 `Tea` 子类各自覆写返回 `"美式咖啡"` 和 `"红茶"`。用 `Drink[]` 存三种饮品，for-each 遍历调用 `describe()`，验证多态派发。
2. [综合] 设计 `Coffee` 父类（字段 `name, price`），`PremiumCoffee` 子类（新增 `int foamLevel`，覆写 `describe()` 追加奶泡等级）。写一个工具方法 `printWithFoam(Coffee c)`：如果是高级杯就打印奶泡等级，否则打印 "无奶泡"。用 `instanceof` 模式匹配实现，并写测试覆盖普通杯和高级杯两种路径。

> [!答案] **1 验收**：
> ```java
> class Drink { String describe() { return "饮品"; } }
> class Coffee extends Drink { @Override String describe() { return "美式咖啡"; } }
> class Tea extends Drink { @Override String describe() { return "红茶"; } }
> Drink[] drinks = {new Drink(), new Coffee(), new Tea()};
> for (Drink d : drinks) {
>     System.out.println(d.describe());
> }
> // 输出: 饮品 / 美式咖啡 / 红茶
> ```
> **举一反三**：数组声明为 `Drink[]`，元素可以是任何子类——for-each 循环一行不动，加新饮品只要加新子类。**2 验收**：
> ```java
> class Coffee {
>     String name; double price;
>     Coffee(String name, double price) { this.name = name; this.price = price; }
>     String describe() { return name + " ¥" + price; }
> }
> class PremiumCoffee extends Coffee {
>     int foamLevel;
>     PremiumCoffee(String name, double price, int foamLevel) { super(name, price); this.foamLevel = foamLevel; }
>     @Override String describe() { return super.describe() + " · 奶泡" + foamLevel + "级"; }
>     int getFoam() { return foamLevel; }
> }
> // 工具方法:
> static void printWithFoam(Coffee c) {
>     if (c instanceof PremiumCoffee p) {
>         System.out.println(p.describe() + " → 奶泡" + p.getFoam() + "级");
>     } else {
>         System.out.println(c.describe() + " → 无奶泡");
>     }
> }
> // 测试:
> printWithFoam(new Coffee("美式", 15.0));        // 美式 ¥15.0 → 无奶泡
> printWithFoam(new PremiumCoffee("拿铁", 22.0, 3)); // 拿铁 ¥22.0 · 奶泡3级 → 奶泡3级
> ```
> **举一反三**：`instanceof` 模式匹配让判断和转型一步完成——比旧式"先 instanceof 再 (PremiumCoffee) c"少写一行强转，且变量 p 的 scope 被限制在 if 内，不会在外面误用。

---

*本话属于连载《从零开始学 Java》。世界观见 `docs/java-comic-academy/handbook.md`;季次地图见 `/java`。*
