---
title: "《从零开始学 Java》15 · 继承家族"
date: 2026-08-08
summary: "高级咖啡机要复用普通机的全部功能再加奶泡。用 extends 继承、super 复用父类构造、@Override 改写行为——还要认清『组合优于继承』这条护身符。"
tags: [Java, Java漫画, 继承, extends, 阿零与豆豆]
---

# 《从零开始学 Java》15 · 继承家族

> 第二季「对象大陆」第 3 话 · 基线 JDK 25 · 承接:上一话已封装、守着不变量的 Coffee 对象。

---

## 一、需求:别把父类代码抄一遍

「高级咖啡机」要有普通 `Coffee` 的全部字段和方法(名字、价格、库存、`describe`),只多一个「奶泡等级」。复制粘贴当然能跑,但你会立刻拥有**两份要同步维护**的代码——改一处忘了改另一处,就是 Bug 的温床。

豆豆:「同一段逻辑在两个地方存在,就是债。继承让你**只写差异**,父类那部分白拿。」

---

## 二、漫画 · 父亲那半个身体

![《从零开始学 Java》15 · 继承家族 —— 阿零与豆豆六格漫画](/comics/java/s02e03-inheritance.png)


> [!文字版]
> **〔1〕** 家谱图:`Coffee` 端坐上方当父亲,`PremiumCoffee` 是儿子,一条线把父亲的字段和方法全继承下来。
> 豆豆:「`extends` = 我拥有父类的全部,再加自己的新东西。」
>
> **〔2〕** 儿子想改写父亲的 `describe`,豆豆递上 `@Override` 印章:「盖了章,编译官才帮你确认——你是在**改写**父类方法,而不是手滑拼错名字新造了一个。」
>
> **〔3〕** 阿零嫌 `super(...)` 那行碍事,一把删了,想直接给奶泡赋值。
> **编译官**(拍工牌那位)脸一沉,拎起儿子对象反问:「你只顾着装奶泡——那**父亲那半个身体**,名字、价格、库存,谁替你造出来?」
>
> **〔4〕** 阿零一愣:「啊……我以为儿子自动就有了?」
> 豆豆(叉腰):「有个屁。子类对象是**先造父亲那半个、再装自己这半个**。你不喊 `super(...)` 把父亲那半个先建好,编译官凭什么放行一个『半拉子』对象?」
>
> **〔5〕** 阿零老老实实补回 `super(name, price, stock)`,对象这才咔哒拼装完整。
> 豆豆:「记住这个顺序:**父在前,子在后**。构造子类,永远先把父类那部分构造好。」
---

## 三、本话目标

- 用 `extends` 继承字段与方法;
- 用 `super(...)` 调用父类构造器,先把父类那半个身体造好;
- 用 `@Override` 改写(覆盖)父类方法;
- 知道「组合优于继承」,别把继承当万能锤;
- 踩一次「子类构造器没调 super」的编译错误。

---

## 四、原理图

```text
class PremiumCoffee extends Coffee {   继承 Coffee 的全部
    private int foam;                   自己新增的字段
    PremiumCoffee(...) {
        super(name, price, stock);      先构造父类的部分(父在前)
        this.foam = foam;               再装自己的部分(子在后)
    }
    @Override String describe() { ... } 改写父类行为
}
```

---

## 五、代码:高级咖啡机

```java
public class PremiumCoffee extends Coffee {
    private int foam;   // 奶泡等级 1~3

    PremiumCoffee(String name, double price, int stock, int foam) {
        super(name, price, stock);   // 先构造父类:super() 调用前不能访问 this 的成员
        this.foam = foam;
    }

    int getFoam() { return foam; }   // 供下一话「多态」按类型取奶泡用

    @Override
    String describe() {
        return super.describe() + " · 奶泡 " + foam + " 级";   // super. 调父类版本再加料
    }

    public static void main(String[] args) {
        PremiumCoffee p = new PremiumCoffee("燕麦拿铁", 22.0, 8, 3);
        System.out.println(p.describe());
    }
}
```

输出:

```text
燕麦拿铁 ¥22.0(库存 8) · 奶泡 3 级
```

`super.describe()` 复用了父类的描述,子类只在后面加自己的部分 —— 零复制。

> **豆豆锐评**:继承虽好,别见坑就跳。真实项目里更常听到的是「**组合优于继承**」——继承是最强耦合,子类被父类的实现细节死死绑住;父类一改,所有子类跟着抖,这就是臭名昭著的**脆弱基类问题**。经验法则:只有真正的 **is-a**(高级咖啡**是一种**咖啡)才用继承;若只是想复用某段功能,优先把它**当成字段持有(has-a)**。本话教你用好继承,也是为了让你日后有资格判断「这里到底该不该继承」。

---

## 六、故意制造一个 Bug

把 `super(...)` 那一行删掉(就是阿零在漫画里干的事):

```java
PremiumCoffee(String name, double price, int stock, int foam) {
    this.foam = foam;    // ← 故意:没有先调 super
}
```

---

## 七、读懂真实报错

```text
PremiumCoffee.java:6: error: constructor Coffee in class Coffee cannot be applied to given types;
  required: String,double,int
  found:    no arguments
```

父类 `Coffee` 没有无参构造器,子类构造器又没显式 `super(...)`,编译器试图自动插入 `super()`(无参)却找不到 —— 于是报错。**子类必须先把父类那部分构造好**,正是编译官在漫画里追问的「父亲那半个身体」。

> **⏳ 版本时光机 · `super()` 的位置规矩,Java 25 松绑了**

| JDK 版本 | `super()` / `this()` 的位置规矩 |
|---|---|
| Java ≤ 21 | **必须是构造器里字面意义的第一条语句**,前面一行代码都不能有 |
| Java 25(JEP 513 转正) | 允许在 `super()` **之前**写不访问 `this` 的语句(参数校验、预计算等),但仍**必须调用** `super()`、且调用前不能碰实例成员 |

于是 Java 25 里可以「**先校验参数、再** `super()`」,构造更安全:

```java
PremiumCoffee(String name, double price, int stock, int foam) {
    if (foam < 1 || foam > 3)                 // Java 25 起:合法!校验在 super 之前
        throw new IllegalArgumentException("奶泡等级 1~3");
    super(name, price, stock);
    this.foam = foam;
}
```

铁律没变的那半句:**父类那部分,必须先于子类字段被构造好。**

---

## 八、修复,并用测试证明

补回 `super(name, price, stock);`:

```java
@Test
void premium_extends_description() {
    PremiumCoffee p = new PremiumCoffee("燕麦拿铁", 22.0, 8, 3);
    assertEquals("燕麦拿铁 ¥22.0(库存 8) · 奶泡 3 级", p.describe());
}

@Test
void premium_exposes_foam() {
    assertEquals(3, new PremiumCoffee("燕麦拿铁", 22.0, 8, 3).getFoam());
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v1.3

```text
新增:PremiumCoffee 继承 Coffee,复用+扩展,零复制;并暴露 getFoam()
已具备:extends 继承 / super 构造链 / @Override 覆盖 / 「组合优于继承」的判断意识
还没有:想用一个容器统一管理普通杯和高级杯,并各自表现 —— 下一话进多态
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 继承 / super / @Override | OOP 必问 |
| 组合优于继承 / 脆弱基类 | 进阶追问:「什么时候不该用继承」 |
| 构造器链 | 面试:子类实例化顺序 |

---

## 十一、下一话悬念

菜单里现在混着普通杯和高级杯,想「遍历菜单,每杯各自描述自己」。

> 下一话《多态调度中心》:父类引用指向子类对象,`describe()` 在运行时自动派发到正确的版本——阿零还会因为一句「都是咖啡怕什么」被强制转型狠狠打一次脸。

---

## 🎯 随堂练习
先自己做，再对答案。选择难度递进，解答从概念到综合，代码含边界验证。

### 一、选择题（10 道）

1. [基础] Java 中用什么关键字实现继承？- A) `implements`　B) `extends`　C) `inherit`　D) `super`
2. [基础] 子类构造器中调用父类构造器使用哪个关键字？- A) `this`　B) `parent`　C) `super`　D) `base`
3. [基础] `super()` 调用在子类构造器中必须放在？- A) 最后一行　B) 任意位置　C) 第一行　D) 方法体中间
4. [进阶] 如果子类构造器第一行不写 `super(...)`，会发生什么？- A) 编译报错　B) 编译器自动插入 `super()`（调用父类无参构造）　C) 跳过父类初始化　D) 运行时异常
5. [进阶] `@Override` 注解的作用是？- A) 提高运行性能　B) 编译器检查该方法是否真的覆写了父类方法　C) 必须写否则编译失败　D) 改变方法可见性
6. [进阶] 以下哪行代码正确覆写了 `toString()` 方法？- A) `public String ToString()`　B) `public String toString(Object o)`　C) `@Override public String toString()`　D) `@Override public string toString()`
7. [进阶] 向上转型（Upcasting）的特点是什么？- A) 需要显式 `(子类型)` 强转　B) 子类对象自动当成父类类型使用　C) 会丢失对象数据　D) 编译不通过
8. [综合] Java 不支持多继承（一个类只能继承一个父类），原因是什么？- A) JVM 性能限制　B) 避免"菱形问题"——两个父类有同名方法时产生歧义　C) 历史原因无实际理由　D) 语法太难实现
9. [综合] 关于 `super.方法名()` 和 `this.方法名()`，描述正确的是？- A) 两者永远调用同一个方法　B) `super.` 调用父类版本，即使子类覆写了该方法　C) `super.` 调用子类版本　D) 不能同时使用
10. [综合] 子类实例化的完整顺序是？- A) 子类字段 → 父类构造器 → 子类构造器　B) 父类静态块 → 子类静态块 → 父类构造器 → 子类字段初始化 → 子类构造器　C) 父类字段 → 父类构造器 → 子类字段 → 子类构造器　D) 随机顺序

> [!答案] **1-B**　`extends` 是 Java 唯一的继承关键字。**2-C**　`super(参数)` 调用父类构造器。**3-C**　`super()` 或 `this()` 必须是构造器的第一条语句。**4-B**　编译器自动加 `super()`，但前提是父类有无参构造器——如果没有且子类不显式调有参的 `super(...)`，编译就失败。**5-B**　`@Override` 是编译期注解，只用来检测你是否真的在覆写——拼错名/参数写给被立刻抓出来。**6-C**　`toString()` 返回 `String`（大写 S），不能改签名。**7-B**　向上转型是安全的、自动的、不需要强转——子类对象天然是一个父类对象。**8-B**　多继承的菱形问题：`B extends A, C extends A` → `D extends B, C` 时，`D` 调用 `A` 的方法到底走 B 还是 C 的路径？Java 用"单继承 + 多接口"规避。**9-B**　`super.` 强制从父类开始找方法，跳过子类的覆写版本。**10-C**　经典顺序：父类 static→子类 static→父类字段→父类构造器→子类字段→子类构造器。
**举一反三**：第 10 题顺序是面试八股 Top 级——"实例化时 `this.x` 为什么可能是 `null`" 常考（字段初始化和构造器执行顺序决定）。

### 二、解答题（3 道）

1. [概念] 继承的"is-a"关系是什么意思？举一个合理的 is-a 继承例子和一个不该用继承的场景，说明"组合优于继承"的判断标准。
2. [场景] 父类 `Coffee` 的构造器需要 `(String name, double price)`。子类 `PremiumCoffee` 额外有 `int foamLevel`（奶泡等级）。写出 `PremiumCoffee` 的构造器，说明 `super(name, price)` 为什么必须写在第一行。
3. [综合] 子类覆写父类方法后，有没有办法在子类中"借用"父类原版的方法逻辑？写一个具体场景（如子类 `describe()` 在父类基础上追加内容），并说明 `super` 在这里的作用。

> [!答案] **1**　"is-a" = 子类**是一种**父类：`PremiumCoffee` 是一种 `Coffee`，合理。反例：`Coffee` 继承 `Water`（咖啡**需要**水而不是**是**水），这是"has-a"关系，该用组合——在 `Coffee` 里持有 `Water water` 字段。判断标准：如果 B 能完全替代 A 使用（里氏替换），继承成立；否则用组合。**举一反三**：所有"is-a"继承都可以被组合替代，但复用父类提供的公共行为和类型多态时继承更省代码。**2**　
> ```java
> class PremiumCoffee extends Coffee {
>     private int foamLevel;
>     PremiumCoffee(String name, double price, int foamLevel) {
>         super(name, price);   // 必须第一行
>         this.foamLevel = foamLevel;
>     }
> }
> ```
> `super()` 必须第一行是因为 JVM 要求**先完成父类构造才能分配子类字段**——如果子类字段在父类构造完成前就能用，父类构造器可能访问到未初始化的子类字段，造成逻辑混乱。**举一反三**：Java 25 开始允许在 `super()` 之前写一些语句（JEP 草案），但目前主流仍是"第一行"约束。**3**　用 `super.方法名()` 可以调用父类版本。比如：
> ```java
> @Override String describe() {
>     return super.describe() + " · 奶泡等级: " + foamLevel;
> }
> ```
> 这样既复用了父类的描述逻辑（不复制代码），又在它基础上追加了子类的信息——这是继承优于复制粘贴的关键体现。**举一反三**：模板方法模式大量使用这个技巧——父类定骨架（`final` 方法），内部的钩子方法留给子类覆写，覆写时还可以通过 `super.` 调父类的默认逻辑。

### 三、代码题（2 道）

1. [基础] 定义 `Drink` 父类（字段 `String name`，`describe()` 返回 `"这是一杯饮品"`），`Coffee` 子类继承它并 `@Override describe()` 返回 `"这是一杯" + name`。测试向上转型：`Drink d = new Coffee("美式"); d.describe()` 输出什么？为什么？
2. [综合] 设计继承链：`Product`（字段 `String id`、`double price`；`getInfo()` 返回 `id + ":" + price`）→ `Coffee` extends `Product`（新字段 `String beanType`；`@Override getInfo()` 追加 `"[" + beanType + "]"`）。再写 `CoffeeWithShot` extends `Coffee`（新增 `int shots`；`@Override getInfo()` 继续追加 `" +" + shots + "shots"`）。测试三层链的 `getInfo()` 输出，确保每层只负责自己的追加逻辑。

> [!答案] **1 验收**：
> ```java
> class Drink {
>     String name;
>     Drink(String name) { this.name = name; }
>     String describe() { return "这是一杯饮品"; }
> }
> class Coffee extends Drink {
>     Coffee(String name) { super(name); }
>     @Override String describe() { return "这是一杯" + name; }
> }
> Drink d = new Coffee("美式");
> System.out.println(d.describe()); // "这是一杯美式"
> ```
> 输出子类版本因为**动态绑定**——`d` 声明为父类但实际指向子类对象，运行时找实际对象的 `describe()`。**举一反三**：动态绑定是下一话"多态"的基石。**2 验收**：
> ```java
> class Product {
>     String id; double price;
>     Product(String id, double price) { this.id = id; this.price = price; }
>     String getInfo() { return id + ":" + price; }
> }
> class Coffee extends Product {
>     String beanType;
>     Coffee(String id, double price, String beanType) { super(id, price); this.beanType = beanType; }
>     @Override String getInfo() { return super.getInfo() + "[" + beanType + "]"; }
> }
> class CoffeeWithShot extends Coffee {
>     int shots;
>     CoffeeWithShot(String id, double price, String beanType, int shots) { super(id, price, beanType); this.shots = shots; }
>     @Override String getInfo() { return super.getInfo() + " +" + shots + "shots"; }
> }
> // 测试:
> Product p = new CoffeeWithShot("C001", 18.0, "阿拉比卡", 2);
> System.out.println(p.getInfo()); // C001:18.0[阿拉比卡] +2shots
> ```
> **举一反三**：每层只调 `super.getInfo()` 并追加自己的内容——修改父类格式不影响子类追加逻辑，符合"对修改关闭、对扩展开放"的原则。

---

*本话属于连载《从零开始学 Java》。世界观见 `docs/java-comic-academy/handbook.md`;季次地图见 `/java`。*
