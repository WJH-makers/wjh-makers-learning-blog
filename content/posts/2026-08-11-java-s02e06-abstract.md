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

![《从零开始学 Java》s02e06 漫画：阿零与豆豆的本话知识点场景](/comics/java/s02e06-abstract.png)

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

*本话属于连载《从零开始学 Java》。世界观见 `docs/java-comic-academy/handbook.md`;季次地图见 `/java`。*
