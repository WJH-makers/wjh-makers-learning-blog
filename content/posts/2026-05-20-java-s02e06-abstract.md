---
title: "《从零开始学 Java》18 · 抽象类 vs 接口"
date: 2026-05-20
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
>
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

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. 抽象类和接口最本质的分水岭是?
   - A) 语法关键字不同　B) **状态** —— 抽象类能有实例字段和构造器,接口存不了实例状态　C) 性能　D) 能不能写方法实现
2. 接口里的字段本质上是?
   - A) 每个实现类各存一份的实例字段　B) `public static final` 常量　C) 私有字段　D) 可变的静态变量
3. 本话给出的选型法则是?
   - A) 一律用接口　B) 一律用抽象类　C) **先接口**;确需「共享状态 + 通用骨架」才上抽象类　D) 看哪个写得快
4. `new CoffeeMaker("通用机")` 会?
   - A) 正常创建　B) 编译报错 `CoffeeMaker is abstract; cannot be instantiated`　C) 运行期抛异常　D) 返回 null
5. `final String run()` 里的 `final` 是为了?
   - A) 提高性能　B) 固定骨架流程,不许子类乱改　C) 让方法可被内联　D) 语法要求
6. `protected abstract String brew();` 在模板方法模式里扮演?
   - A) 骨架　B) 留给子类填的插槽(差异下放)　C) 构造器　D) 工具方法
7. 关于继承/实现的数量限制,正确的是?
   - A) 单继承 + 可多实现　B) 多继承 + 单实现　C) 都只能一个　D) 都不限
8. JDK 8/9 之后接口获得了什么能力?
   - A) 实例字段　B) 构造器　C) `default` / `static` / `private` 方法　D) 多继承状态
9. 「接口定契约 + 抽象类提供骨架实现」这种配合,JDK 里的典型例子是?
   - A) `String` / `StringBuilder`　B) `List` / `AbstractList`　C) `Object` / `Class`　D) `Thread` / `Runnable`
10. 阿零想「给一切都上接口」,在什么场景下会卡壳?
    - A) 需要多实现时　B) 设备之间要共用同一段预热逻辑和同一批状态字段时　C) 需要 Lambda 时　D) 需要泛型时

> [!答案]
> **1-B**　行为可以共享,状态只有抽象类扛得住。**举一反三**:别被「接口也能写 default 方法」骗了以为两者没区别 —— 分水岭一直是状态。
> **2-B**　接口字段全是公有常量。**举一反三**:所以接口天然「无状态」,这也是它能被多实现而不产生菱形冲突的原因。
> **3-C**　先接口,耦合低、可多实现。**举一反三**:这条法则同时是面试答案和干活准则,能当场拍板。
> **4-B**　半成品不能直接造实物。**举一反三**:抽象类可以有构造器,但那是给子类 `super()` 用的,不是给你 `new` 的。
> **5-B**　`final` 锁住流程,子类只能填空不能改结构。**举一反三**:这正是模板方法模式的关键 —— 骨架不可变,步骤可替换。
> **6-B**　它就是那个「萃取核心」插槽。**举一反三**:Spring 里 `AbstractApplicationContext`、JDK 里 `AbstractList` 用的都是这套路。
> **7-A**　`extends` 只能一个,`implements` 可以多个。**举一反三**:Java 用「单继承状态 + 多实现行为」的组合,绕开了 C++ 多继承的菱形难题。
> **8-C**　JDK 8 给了 `default`/`static`,JDK 9 又给了 `private` 辅助方法。**举一反三**:`default` 方法的真正动机是**接口演进** —— 给老接口加方法而不破坏已有实现。
> **9-B**　`List` 定契约,`AbstractList` 给骨架。**举一反三**:两者是配合关系不是二选一,这是面试进阶追问的标准答案。
> **10-B**　共享状态是接口的能力边界。**举一反三**:遇到「几个类要共用一批字段和一段初始化逻辑」,就是抽象类该出场的信号。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*
