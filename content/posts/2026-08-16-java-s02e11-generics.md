---
title: "《从零开始学 Java》23 · 泛型包装箱"
date: 2026-08-16
summary: "List<Coffee> 那对尖括号是什么?泛型让容器只装指定类型,把类型错误从运行时提前到编译时。"
tags: [Java, Java漫画, 泛型, generics, 阿零与豆豆]
---

# 《从零开始学 Java》23 · 泛型包装箱

> 第二季「对象大陆」第 11 话 · 基线 JDK 25 · 承接:一路用着 `List<Coffee>`、`Map<String,Coffee>` 的咖啡站。

---

## 一、需求:让容器「只装指定的货」

不带类型的老式容器什么都能塞,取出来还得强转,一转错就运行时崩。泛型让你在声明时就写死「这个箱子只装 Coffee」,装错的编译期就被拦。

---

## 二、漫画

> **〔1〕** 两个仓库:一个门口写「什么都收」,里面咖啡、螺丝、袜子混作一团;另一个写 `<Coffee>`,只收咖啡。
> 豆豆:「泛型 `<T>` 就是给箱子贴上『只装某种货』的标签。」

> **〔2〕** 阿零从「什么都收」的仓库取货,把袜子当咖啡冲了,当场翻车(运行时异常)。
> 豆豆:「泛型把这种错**提前到编译期**,让编译官替你挡下。」

---

## 三、本话目标

- 理解泛型 `<T>` 带来的类型安全;
- 写一个自己的泛型类 `Box<T>`;
- 明白「原始类型(raw type)」为什么危险;
- 踩一次原始类型导致的运行时 `ClassCastException`。

---

## 四、原理图

```text
List<Coffee> 只能装 Coffee,取出即 Coffee,无需强转
List(原始类型)什么都能装,取出是 Object,强转时才暴雷

自定义:class Box<T> { T item; T get(){...} void put(T t){...} }
        Box<Coffee> 装咖啡,Box<Member> 装会员,一套代码复用
```

---

## 五、代码:泛型包装箱

```java
class Box<T> {                 // T 是类型参数,用时再指定
    private T item;
    void put(T item) { this.item = item; }
    T get() { return item; }
}

record Coffee(String name, double price) {}

public class Warehouse {
    public static void main(String[] args) {
        Box<Coffee> box = new Box<>();
        box.put(new Coffee("美式", 15.0));
        Coffee c = box.get();          // 直接是 Coffee,不用强转
        System.out.println(c.name() + " ¥" + c.price());
    }
}
```

---

## 六、故意制造一个 Bug

用原始类型(去掉泛型),往「咖啡箱」塞进字符串:

```java
Box raw = new Box();          // ← 故意:原始类型,丢失类型信息
raw.put("我不是咖啡");         // 编译只给警告,不拦
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

`ClassCastException` —— 原始类型让编译官睁一只眼闭一只眼(只给警告),错误一直拖到**运行时**强转那一刻才爆。用 `Box<Coffee>`,这行 `put("...")` 在**编译期**就通不过。这正是泛型的价值:**把错误提前**。

---

## 八、修复,并用测试证明

始终带上泛型参数:

```java
@Test
void generic_box_is_type_safe() {
    Box<Coffee> box = new Box<>();
    box.put(new Coffee("拿铁", 18.0));
    assertEquals("拿铁", box.get().name());
    // box.put("字符串");  // 这行若取消注释,编译期直接报错
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v1.11

```text
新增:理解并用好泛型,容器类型安全,取值不再强转
第二季只差临门一脚:把对象 + 集合 + 接口整合成面向对象版咖啡站
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 泛型 / 类型安全 | 集合、框架的基础;面试问「类型擦除」 |
| 原始类型的风险 | 代码审查常见告警 |

---

## 十一、下一话悬念

对象、封装、继承、多态、接口、集合、泛型 —— 第二季的武器齐了。

> 下一话《面向对象版咖啡站》:第二季大结局,把第一季那台「数组 + 静态方法」的咖啡机,重构成一套干净的对象模型 v2。
