---
title: "《从零开始学 Java》18 · 抽象类 vs 接口"
date: 2026-08-11
summary: "都能定义未完成的方法,到底用哪个?一张对照表 + 一台咖啡设备,讲清共享状态用抽象类、能力契约用接口。"
tags: [Java, Java漫画, 抽象类, 接口, 阿零与豆豆]
---

# 《从零开始学 Java》18 · 抽象类 vs 接口

> 第二季「对象大陆」第 6 话 · 基线 JDK 25 · 承接:刚学会接口的阿零。

---

## 一、需求:选对工具

所有咖啡设备都共享「预热 → 制作」的固定流程,只有「制作」这一步各不相同。这种「共享状态 + 固定骨架 + 个别步骤留空」,该用抽象类还是接口?

---

## 二、漫画

> **〔1〕** 豆豆举起两块牌子。`abstract class`:一台半成品机器,自带电机和外壳,只差一个核心零件。`interface`:一张只写能力清单的合同。
> 豆豆:「要**共享字段和已实现的逻辑**,用抽象类;只想约定**能做什么**,用接口。」

---

## 三、本话目标

- 用 `abstract class` 定义「半成品」:部分实现 + 部分抽象方法;
- 理解抽象类能有字段、构造器、已实现方法,接口(通常)只约定行为;
- 掌握选择原则:is-a 且共享实现 → 抽象类;能力契约、可多实现 → 接口;
- 用模板方法固定流程、把差异留给子类。

---

## 四、原理图

```text
                 抽象类 abstract class      接口 interface
能有字段/构造器        能                       (常量除外)基本不能
方法实现          可以有已实现的方法        默认只声明(可 default,少用)
继承数量           单继承(只能一个)         可实现多个
适合            共享状态 + 骨架流程         纯能力契约

原则:优先接口;确有共享状态和通用实现要复用时,才用抽象类。
```

---

## 五、代码:抽象的咖啡设备(模板方法)

```java
abstract class CoffeeMaker {
    private final String model;         // 共享字段
    CoffeeMaker(String model) { this.model = model; }

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
OOP 四件套(类/封装/继承/多态 + 接口/抽象)集齐,下面进标准库
还没有:两杯"美式"该算同一种吗?对象怎么判等 —— 下一话进 Object 神殿
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 抽象类 vs 接口的取舍 | 面试高频「区别与选型」 |
| 模板方法模式 | 设计模式入门;Spring 里随处可见 |

---

## 十一、下一话悬念

咖啡站想去掉重复的会员,却发现两个「张三」对象被当成不同的人。

> 下一话《Object 神殿》:所有类的祖先 `Object`,以及 `equals` / `hashCode` / `toString` 的契约 —— 顺便认识自动生成它们的 `record`。
