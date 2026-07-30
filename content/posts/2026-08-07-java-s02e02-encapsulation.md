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

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. 封装真正的目的是?
   - A) 把字段藏起来　B) 守住**不变量**:让对象任何时刻的状态都合法,藏字段只是手段　C) 少写代码　D) 提高运行速度
2. 类外写 `c.price = -100;`(price 为 private)会?
   - A) 运行期抛异常　B) 编译报错 `price has private access in Coffee`　C) 悄悄成功　D) 赋值被忽略
3. 构造器里为什么写 `setPrice(price)` 而不是 `this.price = price`?
   - A) 代码更短　B) 让「非负」这条规矩在创建时就被强制执行,不给非法对象留一秒存在空间　C) 避免 this 关键字　D) 提高性能
4. 本话的「双保险」指的是?
   - A) 两个 setter　B) 编译期的 `private` 守卫 + 运行期的 setter 校验　C) 构造器和 getter　D) 测试和文档
5. 「字段私有、却机械地配一对空 getter/setter 直接暴露」的写法,问题在于?
   - A) 太啰嗦　B) 等于没封装 —— 没守任何不变量,外部照样能把对象改到非法状态　C) 性能差　D) 无法被继承
6. `c.setPrice(-1)` 会发生什么?
   - A) 价格变成 -1　B) 价格变成 0　C) 抛 `IllegalArgumentException`　D) 编译报错
7. `new Coffee("坏账", -5, 10)` 的结果是?
   - A) 创建出一个负价格对象　B) 构造器里的校验拦下,抛 `IllegalArgumentException`　C) 价格自动置 0　D) 返回 null
8. 「不变量(invariant)」指的是?
   - A) 用 final 修饰的常量　B) 对象在任何时刻都必须成立的规矩,比如「价格永远 ≥ 0」　C) 不可变对象　D) 静态字段
9. `private` 这道守卫在什么阶段生效?
   - A) 编译期 —— 类外的手根本伸不进来　B) 运行期　C) 类加载期　D) 打包期
10. 封装把「能不能改」的权力收回给了谁?
    - A) 调用方　B) 对象自己　C) 编译器　D) JVM

> [!答案]
> **1-B**　隐藏是手段,守不变量才是目的。**举一反三**:判断一段代码「有没有真封装」,就看它有没有守住某条规矩。
> **2-B**　编译期就被拦,连 JVM 的门都进不去。**举一反三**:能在编译期拦下的错误,永远比运行期便宜一个数量级。
> **3-B**　构造时也走校验,对象一出生就合法。**举一反三**:很多「脏数据」都是绕过 setter 直接在构造器里赋值放进来的。
> **4-B**　一道编译期、一道运行期,负价格从哪条路都进不来。**举一反三**:纵深防御是安全设计的通则,单点防守早晚被绕。
> **5-B**　没守任何规矩的 getter/setter 只是换了种方式公开字段。**举一反三**:所以「要不要加 setter」值得每次都问一遍 —— 很多字段压根不该允许改。
> **6-C**　门卫当场拒收。**举一反三**:抛异常比「悄悄修正成 0」好 —— 静默纠正会掩盖调用方的 Bug。
> **7-B**　构造器转手交给 setter,校验一样生效。**举一反三**:这就是第 3 题那句「一出生就合法」的直接兑现。
> **8-B**　它是对象自己给自己定的规矩。**举一反三**:不变量的概念一路延伸到并发(状态一致性)和数据库(约束),是同一种思想。
> **9-A**　访问修饰符是编译期规则。**举一反三**:所以反射能绕过它 —— 那是运行期的另一套故事,第十季会讲。
> **10-B**　权力从「任何人」收回到「对象自己」。**举一反三**:面向对象的核心就是「让数据和管数据的规矩住在一起」。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*