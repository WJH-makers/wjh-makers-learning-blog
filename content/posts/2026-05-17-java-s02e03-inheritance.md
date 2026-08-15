---
title: "《从零开始学 Java》15 · 继承家族"
date: 2026-05-17
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
>
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

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. `class PremiumCoffee extends Coffee` 意味着?
   - A) 复制了一份 Coffee 的代码　B) 拥有父类的全部字段与方法,再加自己的新东西　C) 只继承方法不继承字段　D) 两个类互相引用
2. 子类构造器里删掉 `super(name, price, stock);` 后编译报错,根本原因是?
   - A) 语法必须写 super　B) 父类 `Coffee` 没有无参构造器,编译器自动插入的 `super()` 找不到匹配　C) 子类字段未初始化　D) `@Override` 缺失
3. 子类对象的构造顺序是?
   - A) 先造子类那半个,再补父类　B) 先把父类那部分构造好,再装子类自己的部分　C) 同时构造　D) 由 JVM 随机决定
4. `@Override` 注解的价值是?
   - A) 提高性能　B) 让编译官帮你确认「确实在改写父类方法」,而不是手滑拼错名字新造了一个　C) 强制子类实现　D) 生成文档
5. `super.describe()` 的作用是?
   - A) 调用子类自己的版本　B) 调用父类的实现,再在后面加料,实现零复制　C) 创建父类对象　D) 跳过父类方法
6. 「组合优于继承」的理由是?
   - A) 组合写起来更短　B) 继承是最强耦合,子类被父类实现细节绑死,父类一改所有子类跟着抖(脆弱基类)　C) 继承会变慢　D) Java 不推荐继承
7. 判断该不该用继承的经验法则是?
   - A) 只要能复用代码就继承　B) 只有真正的 **is-a** 关系才继承;仅想复用功能就用 **has-a** 持有为字段　C) 字段多就继承　D) 看类名像不像
8. Java 25(JEP 513 转正)对 `super()` 松了什么绑?
   - A) 可以不调用 `super()`　B) 允许在 `super()` **之前**写不访问 `this` 的语句(如参数校验),但仍必须调用　C) 允许调用两次　D) 允许 super 放在方法里
9. 松绑后仍然没变的铁律是?
   - A) `super()` 必须是字面第一行　B) 父类那部分必须先于子类字段被构造好,且 `super()` 前不能碰实例成员　C) 子类不能有字段　D) 必须写 `@Override`
10. 同一段逻辑在两个类里各存一份,豆豆的评价是?
    - A) 冗余但安全　B) 那是债 —— 改一处忘了另一处就是 Bug 温床　C) 有利于解耦　D) 性能更好

> [!答案]
> **1-B**　`extends` = 父类全部白拿,只写差异。**举一反三**:Java 是单继承 —— 一个类只能 `extends` 一个父类,但可以 `implements` 多个接口。
> **2-B**　编译器会替你插一个无参 `super()`,父类没有它就报错。**举一反三**:所以给基类留一个无参构造器,能省掉很多子类的麻烦 —— 但也要想清楚这样是否破坏了不变量。
> **3-B**　父在前,子在后。**举一反三**:正因如此,在父类构造器里调用被子类重写的方法是个经典陷阱 —— 那时子类字段还没初始化。
> **4-B**　它是给编译器看的确认书。**举一反三**:方法名拼错、参数类型写偏,没有 `@Override` 时会静默变成「新方法」,加上它立刻报错。
> **5-B**　复用父类实现再加自己的部分。**举一反三**:`super.` 只能在子类里用,而且只能上溯一层 —— 没有 `super.super.`。
> **6-B**　脆弱基类问题是继承最大的代价。**举一反三**:这也是为什么很多库把类设计成 `final` —— 不给你继承,就不用背向后兼容的包袱。
> **7-B**　is-a 才继承,has-a 就持有。**举一反三**:「高级咖啡**是一种**咖啡」成立,「订单**有一个**咖啡」就该用字段而不是继承。
> **8-B**　可以先校验参数再 `super()`,构造更安全。**举一反三**:这个变化的意义是「参数校验不用再塞进静态方法绕一圈」,代码可读性明显变好。
> **9-B**　顺序铁律没变,只是允许前面做点不碰 `this` 的事。**举一反三**:记住松绑的边界比记住松绑本身更重要 —— 面试常在这里追问。
> **10-B**　重复即债务。**举一反三**:但也别为了消除重复而滥用继承 —— 第 6、7 题给的正是另一半答案。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*
