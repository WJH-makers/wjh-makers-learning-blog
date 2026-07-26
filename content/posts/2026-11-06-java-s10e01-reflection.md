---
title: "《从零开始学 Java》80 · 反射:程序照镜子"
date: 2026-11-06
summary: "并发考试通关,技术债账本翻到最后一页《引擎室》。下舱先领钥匙:反射——程序在运行时照镜子,看见自己的类、方法、字段,还能撬开 private 的门。JUnit、Jackson、Spring 的魔法,全从这面镜子开始。"
tags: [Java, Java漫画, 反射, Class对象, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》80 · 反射:程序照镜子

> 连载特刊 · 番外卷三「引擎室」第 1 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——并发考试通关当晚,阿零盯着 synchronized 发呆:"锁、GC、Spring 的魔法,引擎室里到底长什么样?"豆豆翻开技术债账本最后一页。

---

## 一、需求:引擎室的钥匙

账本最后一页——**第三页·引擎室**:原理债,JVM/数据库/Spring 的底舱。

豆豆:「下舱先领钥匙。JUnit 质检员怎么认出 `@Test`?Jackson 怎么知道 JSON 塞进哪个字段?Spring 管家怎么凭类名造 Bean?靠的都是**反射**——程序在运行时照镜子,看见并操作自己的类、方法、字段。」

阿零:「程序还能看见自己?」豆豆:「走,类加载站档案馆。」

---

## 二、漫画 · 档案馆里的镜子

> **〔1〕** 「引擎室」铁门开启,第一站类加载站档案馆:JVM 城主拉开一整墙档案柜——每类一张档案卡,列着全部方法、字段、构造器。
> JVM 城主:「类装进来时,我顺手建一张**档案卡——`Class` 对象**。一个类,全 JVM 只此一张。」

> **〔2〕** 阿零拿着写有「applyDiscount」的条子到**公开名录**窗口(getMethod)查询,档案员翻遍名录把条子退回:查无此人。
> 阿零:「不可能!这方法我天天在用!」

> **〔3〕** 换**全量名录**窗口(getDeclaredMethod),查到了——档案卡刚递出,门卫「哐」地拦下:**private,谢绝外借**。阿零抱头蹲下。
> 门卫:「invoke 之前要过访问检查。」

> **〔4〕** 豆豆晃着「setAccessible 特批条」;远处 JUnit 质检员抱着一摞档案卡,边走边圈出带 @Test 的方法。
> 豆豆(叼着豆子叉腰):「特批条只关这一次检查——JUnit、Jackson、Spring 全是常客。但这是框架的特权,不是你写业务的日常。」

---

## 三、本话目标

- 掌握拿到 `Class` 对象的三种方式,理解「一个类只有一份 Class」;
- 分清 `getMethods` 与 `getDeclaredMethods`,会用 `invoke` 调方法、`Field` 读写字段;
- 用 `getDeclaredConstructor().newInstance()` 凭档案造对象;
- 讲清反射为什么慢、框架为什么仍离不开;
- 踩一次「反射取私有方法」的两连坑并修好。

---

## 四、原理图:类加载站的档案馆

```text
拿档案卡三法(类加载站装载 .class 时顺手建卡,每类仅一份):
  OrderService.class               编译期已知,最安全(不触发类初始化)
  svc.getClass()                   手里已有实例
  Class.forName("OrderService")    只有字符串——配置驱动,框架最爱

查档案两本名录:
  getMethods()          公开名录:public,含继承
  getDeclaredMethods()  全量名录:本类全部,含 private,不含继承
```

> **豆豆旁白**:`getXxx` = 公开的 + 继承的;`getDeclaredXxx` = 本类全部(含私有)——方法/字段/构造器通用,一句顶六个 API。老的 `Class.newInstance()` 已弃用(受检异常会原样漏出),用上面的写法。

---

## 五、从上一话继续:给 OrderService 配一面镜子

上一话(#79)刚把 `OrderService` 修好,本话一行不改,只「照」它(计价沿用 #60 的 `record Coffee(String name, BigDecimal price, int stock)`):

```java
import java.math.BigDecimal;
import java.math.RoundingMode;

public class OrderService {
    private BigDecimal memberRate = new BigDecimal("0.88");   // 会员 88 折

    public BigDecimal quote(Coffee coffee, boolean member) {
        return member ? applyDiscount(coffee.price()) : coffee.price();
    }

    private BigDecimal applyDiscount(BigDecimal price) {
        return price.multiply(memberRate).setScale(2, RoundingMode.HALF_UP);
    }
}
```

照镜子四连:

```java
// Mirror.java —— JEP 512 紧凑源文件(Java 25),隐式导入 java.base
void main() throws Exception {
    // ① 三种方式,拿到同一张档案卡
    Class<OrderService> c1 = OrderService.class;
    Class<?> c2 = new OrderService().getClass();
    Class<?> c3 = Class.forName("OrderService");
    IO.println(c1 == c2 && c2 == c3);        // true

    // ② 全量名录:私有方法也在列
    for (var m : c1.getDeclaredMethods())
        IO.println(m.getName());             // quote、applyDiscount

    // ③ 不写 new,凭档案造对象
    OrderService svc = c1.getDeclaredConstructor().newInstance();

    // ④ Field 读写:私有折扣率改成对折
    var f = c1.getDeclaredField("memberRate");
    f.setAccessible(true);
    f.set(svc, new BigDecimal("0.50"));
    IO.println(f.get(svc));                  // 0.50
}
```

---

## 六、故意制造一个 Bug:隔空调私有方法

阿零想直接验证折扣算法,拿公开名录去查私有方法:

```java
var m = OrderService.class.getMethod("applyDiscount", BigDecimal.class);   // ← 坑一
IO.println(m.invoke(svc, new BigDecimal("18.00")));
```

---

## 七、读懂真实报错(两连)

```text
Exception in thread "main" java.lang.NoSuchMethodException:
        OrderService.applyDiscount(java.math.BigDecimal)
        at Mirror.main(Mirror.java:9)
```

`getMethod` 只翻**公开名录**,私有方法查无此人。改用 `getDeclaredMethod`,找到了——`invoke` 时又撞第二堵墙:

```text
Exception in thread "main" java.lang.IllegalAccessException:
        class Mirror cannot access a member of class OrderService with modifiers "private"
        at java.base/java.lang.reflect.Method.invoke(Method.java:571)
        at Mirror.main(Mirror.java:11)
```

**找得到 ≠ 调得动**:`invoke` 前有访问检查,`private` 直接拦下。

> **🎯 面试直击**:反射为什么慢?为什么框架还大量用?
> 慢在三处:每次调用要**校验**访问与参数;参数装进 `Object[]`,基本类型要**装箱**;对 JIT 是黑盒,**无法内联**。框架只在**启动期**扫描一次并缓存 `Method`,热路径不走反射,成本一次付清。追问点:热路径动态调用可换 `MethodHandle` 或生成字节码。

---

## 八、修复,并用测试证明

给门卫递特批条——`setAccessible(true)` 关掉**这一处**的访问检查:

```java
var m = OrderService.class.getDeclaredMethod("applyDiscount", BigDecimal.class);
m.setAccessible(true);                              // 特批:跳过访问检查
IO.println(m.invoke(svc, new BigDecimal("18.00"))); // 15.84
```

模块化时代的边界:目标类在**未 `opens` 的模块**里,`setAccessible` 直接抛 `InaccessibleObjectException`——框架要求 `--add-opens` 的原因在此。

```java
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.assertEquals;

class ReflectionTest {
    @Test
    void private_discount_reachable_via_reflection() throws Exception {
        var svc = OrderService.class.getDeclaredConstructor().newInstance();
        var m = OrderService.class.getDeclaredMethod("applyDiscount", BigDecimal.class);
        m.setAccessible(true);
        var price = (BigDecimal) m.invoke(svc, new BigDecimal("18.00"));
        assertEquals(0, price.compareTo(new BigDecimal("15.84")));   // 判等用 compareTo(回看 #60)
    }
}
```

> **豆豆锐评**:**反射是框架的特权,业务代码少用。**它绕过编译期检查——方法改名,编译官 Javac 一声不吭,线上直接 `NoSuchMethodException`;`setAccessible` 更是拆封装的墙。业务里想用,多半是设计出了问题。

---

## 九、项目检查点 · 豆豆咖啡站 v10.1

```text
咖啡站形态:代码没动一行,升级的是工程师——能在运行时「看见」任何类的内部
已具备  :Class 三种获取;两本名录;invoke 私有方法;Field 改写;反射慢在校验/装箱/不可内联
还没有  :只会「看」,不会「认标签办事」——@Test 那样的标签怎么造、程序怎么认
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 反射 API(Class/Method/Field/Constructor) | 读框架源码的入场券;「Spring 怎么造 Bean」的地基 |
| 反射性能与取舍 | 「反射为什么慢」高频八股;答出「启动期扫描 + 缓存」是加分项 |
| setAccessible 与封装边界 | 排查 `InaccessibleObjectException` / `--add-opens` 报错的底气 |

---

## 十一、下一话悬念

阿零把玩着钥匙:程序能在运行时**看见**方法了。豆豆:「再进一步——给方法贴张『会员打折』的标签,让程序自己**认标签办事**呢?」

> 下一话《注解与动态代理:手写迷你 AOP》:自定义注解 + 动态代理,几十行代码手拆 Spring 管家的魔法底牌。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
