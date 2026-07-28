---
title: "《从零开始学 Java》14 · 封装保险柜"
date: 2026-08-07
summary: "coffee.price = -100 竟然合法。把字段设成 private、用 getter/setter 上锁,更本质的收益是——对象一出生就守住『价格永不为负』这条不变量。"
tags: [Java, Java漫画, 封装, private, 阿零与豆豆]
---

# 《从零开始学 Java》14 · 封装保险柜

> 第二季「对象大陆」第 2 话 · 基线 JDK 25 · 承接:上一话字段全公开的 Coffee 对象。

---

## 一、需求:别让外人乱改内部数据

上一话末尾埋了个雷:`coffee.price = -100;`、`coffee.stock = -5;` 全都合法。字段公开,意味着**任何人、在任何地方、都能把对象改成一个根本不该存在的状态**——价格是负数的咖啡,一旦流进结账逻辑,后面全乱套。

豆豆:「你以为封装是『把字段藏起来』?那只是手段。**真正的收益是不变量(invariant)**——让『价格永远 ≥ 0』这条规矩,从对象**出生的那一刻起**就成立,而且**这辈子都破不了**。藏字段只是为了没人能绕过这条规矩。」

---

## 二、漫画 · 走后门被逮

![《从零开始学 Java》14 · 封装保险柜 —— 阿零与豆豆六格漫画](/comics/java/s02e02-encapsulation.png)


> [!文字版]
> **〔1〕** Coffee 对象敞着大门,一个路人大摇大摆走进去,把价格牌改成 `-100`。
> 豆豆:「字段公开 = 保险柜不上锁,谁都能进去翻。」
>
> **〔2〕** 豆豆咔哒给三个字段挂上 `private` 锁,只在墙上留一个 `setPrice` 的小窗口,窗口里站着门卫:「负价格?不收。」
>
> **〔3〕** 阿零不服,想抄近路:「我直接 `c.price = -100` 从后门塞进去不就行了?」他一伸手——
> **编译官**(还是第一话拍工牌那位)一把按住:「站住。`price` 是 `private`,类外的手伸不进来。这是**编译期**的第二道守卫,配合门卫那道**运行期**校验,双保险。」
>
> **〔4〕** 阿零讪讪缩手:「合着我连门都摸不到……」
> 豆豆(叼豆子):「对。摸不到,才叫封装。你只能走 `setPrice` 那扇窗——而窗里的门卫,永远替对象守着『价格非负』这条命。」
---

## 三、本话目标

- 用 `private` 隐藏字段,把「能不能改」的权力收回对象自己手里;
- 用 getter/setter 提供**受控**访问;
- 在 setter 里做校验,守住**不变量**:非法数据一律拒之门外;
- 踩一次「private 字段类外直接访问」的编译错误。

---

## 四、原理图

```text
private double price;        字段上锁,类外不可直接访问(编译期守卫)
double getPrice() { ... }    读:getter
void setPrice(double p) {    写:setter,在这里守不变量(运行期守卫)
    if (p < 0) throw ...;    ← 非法数据挡在门外,对象状态永远合法
    this.price = p;
}
```

封装 = 隐藏内部细节 + 只暴露安全入口,**目的是让对象无论被谁调用,内部状态始终满足它自己定的规矩**。

---

## 五、代码:给 Coffee 上锁

```java
public class Coffee {
    private String name;
    private double price;
    private int stock;

    Coffee(String name, double price, int stock) {
        this.name = name;
        setPrice(price);     // 关键:构造时也走校验,保证「一出生就合法」
        setStock(stock);
    }

    double getPrice() { return price; }

    void setPrice(double price) {
        if (price < 0) throw new IllegalArgumentException("价格不能为负:" + price);
        this.price = price;
    }

    int getStock() { return stock; }

    void setStock(int stock) {
        if (stock < 0) throw new IllegalArgumentException("库存不能为负:" + stock);
        this.stock = stock;
    }

    String getName() { return name; }

    public static void main(String[] args) {
        Coffee c = new Coffee("美式", 15.0, 20);
        c.setPrice(16.0);          // 合法,走门卫
        System.out.println(c.getName() + " 现价 ¥" + c.getPrice());
    }
}
```

注意构造器里没有直接写 `this.price = price`,而是**转手交给 `setPrice`**——这样「非负」这条规矩在**创建时**就被强制执行,不给非法对象留一秒钟的存在空间。

---

## 六、故意制造一个 Bug

在 `main` 里学阿零走后门,直接改私有字段:

```java
c.price = -100;   // ← 故意:类外访问 private 字段
```

---

## 七、读懂真实报错

编译官当场拦下:

```text
Coffee.java:33: error: price has private access in Coffee
        c.price = -100;
         ^
1 error
```

`price has private access` —— 私有字段类外碰不到,**编译期**就报错,连 JVM 的门都进不去。想改价只能走 `setPrice`,而它会拦住负数(抛 `IllegalArgumentException`)。两道守卫合起来,负价格无论从哪条路都进不来。

> **🎯 面试直击**:封装的意义只是「隐藏字段、加 getter/setter」吗?
> 不止。隐藏字段是**手段**,守住**不变量**才是**目的**——通过把修改收进受控入口,保证对象**任何时刻**的状态都合法(如价格非负、库存非负)。追问点:那种「字段私有、却机械地配一对空 getter/setter 直接暴露」的写法,等于没封装——因为它没有守任何不变量,外部照样能把对象改到非法状态。

---

## 八、修复,并用测试证明

把非法赋值改成走门卫 `c.setPrice(16.0);`,并验证非法值确实被拒:

```java
@Test
void rejects_negative_price() {
    Coffee c = new Coffee("美式", 15.0, 20);
    assertThrows(IllegalArgumentException.class, () -> c.setPrice(-1));
}

@Test
void invariant_holds_from_birth() {
    // 连构造时都挡住非法值:对象根本无法以负价诞生
    assertThrows(IllegalArgumentException.class, () -> new Coffee("坏账", -5, 10));
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v1.2

```text
新增:Coffee 字段私有化;价格/库存的每一次改动(含构造)都必过校验
已具备:private 隐藏 / getter-setter 受控访问 / 不变量守卫(双保险)
还没有:高级咖啡机想复用普通咖啡机的逻辑,又要加新功能 —— 下一话进继承
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 封装 / private / getter-setter | OOP 三大特征之一,必问 |
| 不变量(invariant)守卫 | 区分「真封装」与「机械 getter/setter」的分水岭 |
| setter 校验 | 后端「参数校验」的对象内版本 |

---

## 十一、下一话悬念

咖啡站要上「高级咖啡机」:普通机的功能全都要,还要多一个奶泡功能。总不能把封装好的 Coffee 代码抄一遍。

> 下一话《继承家族》:用 `extends` 让高级咖啡机继承普通咖啡机,`super` 复用父类构造,`@Override` 改写行为——顺便见识 Java 25 给 `super()` 松的一道绑。

---

## 🎯 随堂练习
先自己做，再对答案。选择难度递进，解答从概念到综合，代码含边界验证。

### 一、选择题（10 道）

1. [基础] 封装的核心手段是什么？- A) `public` 字段直接访问　B) `private` 字段 + `getter`/`setter`　C) `static` 方法　D) 继承父类
2. [基础] `private` 关键字修饰的成员可以在哪里访问？- A) 任何类　B) 同包的类　C) 只在当前类内部　D) 子类
3. [基础] 以下哪个是正确的 getter 命名约定？- A) `getName()` 对应字段 `name`　B) `getname()` 对应字段 `name`　C) `Name()` 对应字段 `name`　D) `name()` 对应字段 `name`
4. [进阶] 某字段只需要读、不允许外部修改，应该怎么做？- A) 只写 getter、不写 setter　B) 用 `public` 字段　C) 只写 setter　D) 删除 getter
5. [进阶] setter 方法的核心价值是什么？- A) 让代码更长　B) 访问字段时增加一道可插入校验逻辑的门　C) 提高运行速度　D) 方便 IDE 生成
6. [进阶] 下面代码哪里有问题？```java class A { private int x; public int getX() { return x; } public void setX(int x) { this.x = x; } } class B { void test() { A a = new A(); a.x = 5; } }```- A) `getX` 命名错误　B) `B` 中不能直接访问 `a.x`（`x` 是 `private`）　C) 构造器缺失　D) `setX` 参数名与字段重名
7. [进阶] `this.price = price;` 中左边的 `this.price` 和右边的 `price` 分别指什么？- A) 都是字段　B) 都是参数　C) 左边是字段、右边是参数　D) 左边是参数、右边是字段
8. [综合] "不变量"（invariant）在封装中指什么？- A) 代码永远不运行　B) 对象在任何时刻都保持的合法性条件（如价格 ≥ 0）　C) 方法签名不变　D) 对象不能创建
9. [综合] 以下做法属于"假封装"的是？- A) 字段 `private` + setter 有校验　B) 字段 `private` + setter 无校验直接赋值，等同于 `public`　C) 只提供 getter　D) 字段 `final`
10. [综合] 构造器直接 `this.price = price;` 而 setter 里有 `if (price < 0) throw...`，会导致什么风险？- A) 没有风险　B) 非法值可以通过构造器绕过校验进入对象　C) 编译错误　D) GC 异常

> [!答案] **1-B**　封装 = `private` 字段 + 受控的公共方法入口。**2-C**　`private` 是最高封闭等级，只在类内部可见。**3-A**　`getXxx()` 返回 `xxx` 是 Java 命名惯例（Lombok 等工具也遵循此约定）。**4-A**　只给 getter 不给 setter + 字段 `final`，外部只能读不能写。**5-B**　setter 的本质是**关卡**——在赋值前插入校验逻辑，把非法数据挡在外部。**6-B**　`B` 试图直接访问 `a.x`，但 `x` 是 `private` 的，编译器直接拒绝。**7-C**　`this.price` 是对象的实例字段，`=` 右边的 `price` 是方法参数——`this` 用来消除歧义。**8-B**　不变量 = 对象永远满足的合法性条件（如"价格永远 ≥ 0""年龄永远 > 0"），封装的第一要务就是保护它。**9-B**　setter 不加校验等同于把 `private` 变成 `public`——这就是"只换了个马甲"。**10-B**　构造器绕过 setter 直接赋值，等价于开了一道后门——非法值可以被悄悄塞进对象。
**举一反三**：第 10 题是面试里区分"真懂封装"的分水岭——知道要在构造器里也调 setter（或统一校验方法）的，才算理解"不变量的单一守卫点"。

### 二、解答题（3 道）

1. [概念] 有人把封装理解成"给每个字段加 getter/setter"，这种理解有什么问题？封装真正的目的是什么？
2. [场景] `Coffee` 类有两个字段：`name`（名称不可变）和 `stock`（库存可变但不能为负）。请设计 getter/setter 策略，说明哪些字段该给 setter、哪些不该，以及如何保证库存不变量。
3. [综合] 一家咖啡站同时在会员端和管理员端展示 `Coffee` 对象。管理员可以改价格和库存，会员只能看。你怎么设计这个类的访问控制来同时满足两端需求？说明封装如何帮助代码复用而不破坏安全。

> [!答案] **1**　"机械加 getter/setter"是把封装当成**格式**而非**防护**。封装的真正目的是**保护不变式**——确保对象从出生到消亡都不处于非法状态。比如 `Coffee` 的价格永远 ≥ 0，库存永远 ≥ 0，这个保证不在 getter/setter 的名字里，而在 setter 内部的校验逻辑里。**举一反三**：很多"贫血模型"就是 getter/setter 全放开、校验为零——对象沦为了数据容器而非自治实体。**2**　`name`：只提供 getter，不提供 setter（因为名称一旦设定不该被篡改）。可在构造器中赋值 + 声明 `final`。`stock`：提供 getter 和 setter，setter 内 `if (stock < 0) throw...` 拒绝负库存。构造器中 `this.stock` 可能绕过 setter，所以要确保构造器也走同一校验路径（调 setter 或调统一校验方法）。**举一反三**：这就是"单一守卫点"原则——校验逻辑只写一处，构造器和 setter 都走它。**3**　把字段全部 `private`，只提供 getter（会员端能看）；管理员端通过 setter 修改数据，setter 内带校验。两端共享同一个 `Coffee` 类，展示层不同但数据约束不变——封装让"数据安全"成为类的内置属性，无论谁来用都绕不过去。**举一反三**：Spring 常用 DTO/VO 分层处理不同端的数据展示，但核心领域对象的不变量校验只写一处。

### 三、代码题（2 道）

1. [基础] 改造 `Coffee` 类：字段 `name`（不可变）和 `price`（可变，≥ 0）。`price` setter 对负数直接抛 `IllegalArgumentException`。构造器复用 setter 以保证校验唯一入口。写测试：正常构造、负价构造看是否抛异常。
2. [综合] 设计 `OrderItem` 类：字段 `String name`、`int quantity`、`double unitPrice`。约束：①`quantity` 必须 ≥ 1；②`unitPrice` 必须 ≥ 0；③提供 `total()` 方法返回 `quantity * unitPrice`。关键在于——`quantity` 和 `unitPrice` 修改后 `total()` 自动更新，不需要额外字段存合计。写边界测试覆盖最小 quantity（1）、零价和负 quantity 被拒。

> [!答案] **1 验收**：
> ```java
> class Coffee {
>     private final String name;
>     private double price;
>     Coffee(String name, double price) {
>         this.name = name;
>         setPrice(price);          // 构造器走 setter，校验唯一入口
>     }
>     public String getName() { return name; }
>     public double getPrice() { return price; }
>     public void setPrice(double price) {
>         if (price < 0) throw new IllegalArgumentException("价格不能为负: " + price);
>         this.price = price;
>     }
> }
> // 测试: new Coffee("美式", -5) → 抛 IllegalArgumentException
> ```
> **举一反三**：`name` 声明 `final` 后构造器里必须赋值，且之后不能再改——编译器帮你防住了"名称被篡改"。**2 验收**：
> ```java
> class OrderItem {
>     private final String name;
>     private int quantity;
>     private double unitPrice;
>     OrderItem(String name, int quantity, double unitPrice) {
>         this.name = name;
>         setQuantity(quantity);
>         setUnitPrice(unitPrice);
>     }
>     public String getName() { return name; }
>     public int getQuantity() { return quantity; }
>     public void setQuantity(int q) {
>         if (q < 1) throw new IllegalArgumentException("数量必须 ≥ 1");
>         this.quantity = q;
>     }
>     public double getUnitPrice() { return unitPrice; }
>     public void setUnitPrice(double p) {
>         if (p < 0) throw new IllegalArgumentException("单价不能为负");
>         this.unitPrice = p;
>     }
>     public double total() { return quantity * unitPrice; }
> }
> // 边界:
> // new OrderItem("美式", 1, 0) → 合法，total()=0
> // new OrderItem("拿铁", 0, 15) → 抛异常
> // new OrderItem("摩卡", 2, -5) → 抛异常
> ```
> **举一反三**：`total()` 不存字段而是**实时计算**——这避免了"改了 quantity 却忘了更新 total"的经典 bug，也省了一个多余字段。

---

*本话属于连载《从零开始学 Java》。世界观见 `docs/java-comic-academy/handbook.md`;季次地图见 `/java`。*
