---
title: "《从零开始学 Java》81 · 注解与动态代理:手写迷你 AOP"
date: 2026-11-07
summary: "打折代码被复制进每个结账方法,阿零忍无可忍。豆豆亮出底牌:@Discount 注解 + JDK 动态代理,60 行手写迷你 AOP,Spring 管家魔法拆穿一半。一个漏写的 @Retention,却让折扣无声蒸发。"
tags: [Java, Java漫画, 注解, 动态代理, AOP, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》81 · 注解与动态代理:手写迷你 AOP

> 连载特刊 · 番外卷三「引擎室」第 2 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——反射照出了类的五脏六腑,可镜子只会看不会动;今晚给镜中方法贴标签,让程序照标签自动办事。

---

## 一、需求:打折逻辑长进了每个结账方法里

冬歇期上新「会员八八折」。阿零打开订单代码倒吸凉气:打折 + 记日志两句,已被复制进三个结账方法,漏改一处就是资损。

阿零:「我想要 @Transactional 的待遇(回看第 41 话)——贴个 `@Discount`,折扣自动打,行不行?」

豆豆:「行,但不许喊魔法——**Spring 管家的袖子,今天掀开一半**。」

---

## 二、漫画 · 前台的冒牌收银员

> **〔1〕** 阿零在方法上郑重贴上 `@Discount`,盯着屏幕等折扣生效——毫无反应。
> 豆豆(叼着豆子叉腰):「注解只是**结构化的标签**,自己不干活——价签不会收钱,得有人**读**它再照着办。」

> **〔2〕** Spring 管家优雅路过,袖口滑出一张印着 `$Proxy…` 的工牌。
> 豆豆:「第 41 话你贴 @Transactional 时,管家递给你的从来不是类**本人**,是替身。」

> **〔3〕** JVM 城主当场捏出新雇员 `$Proxy0` 站上前台:单子先经他的手,照标签打折、记账,再递给里屋的真收银员。
> 豆豆:「这就是 **JDK 动态代理**:运行时现造一个实现同接口的类,每次调用先进它的 `invoke`。」

> **〔4〕** 阿零:「那我的类没有接口呢?」
> 豆豆:「换 **CGLIB**——生成你的**子类**字节码冒充你;但 `final` 类和方法覆写不了,它就没辙。」

---

## 三、本话目标

- 定义注解,讲清元注解 `@Retention` / `@Target`,并在运行时反射读取;
- 手写不到 60 行的迷你 AOP:`Proxy.newProxyInstance` + `InvocationHandler`;
- 对比 JDK 动态代理与 CGLIB;
- 踩一次「忘写 @Retention(RUNTIME),折扣静默失效」。

---

## 四、原理图:标签保质期 + 替身调用链

```text
@Retention 保质期:SOURCE 只活在源码(@Override)
           CLASS  进 class 文件但 JVM 不载入(默认!)
           RUNTIME 运行时可反射读取(想让代理看见,必选)
@Target 贴哪儿:METHOD/TYPE/FIELD…贴错编译官拒收

调用方 ─> $Proxy0(运行时生成,实现同一接口)
  └─ invoke(proxy, method, args)
       ├─ getAnnotation(...) 读标签
       ├─ method.invoke(target, args) 放行真身
       └─ 有标签 → 打折 + 记日志
```

> **豆豆锐评**:AOP 就一句话——**横切逻辑(打折/日志/事务)抽出业务方法,塞进替身的 invoke**。业务类干净,替身统一动手。

---

## 五、从上一话继续改代码:60 行迷你 AOP

上一话的 `Method` 手电,今天加两步:读注解、造替身。

```java
import java.lang.annotation.*;
import java.lang.reflect.Proxy;
import java.math.*;
import java.util.List;

@Retention(RetentionPolicy.RUNTIME)   // 保质期:活到运行时
@Target(ElementType.METHOD)
@interface Discount {
    double rate();                    // 0.88 = 八八折
}

interface OrderService {
    @Discount(rate = 0.88)
    BigDecimal checkout(List<BigDecimal> prices);   // 会员价
    BigDecimal total(List<BigDecimal> prices);      // 原价
}

class OrderImpl implements OrderService {
    public BigDecimal checkout(List<BigDecimal> prices) { return total(prices); }
    public BigDecimal total(List<BigDecimal> prices) {
        return prices.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}

class MiniAop {
    @SuppressWarnings("unchecked")
    static <T> T proxy(T target, Class<T> iface) {
        return (T) Proxy.newProxyInstance(
            iface.getClassLoader(), new Class<?>[]{iface},
            (p, method, args) -> {
                Object result = method.invoke(target, args);   // 先放行真身
                Discount d = method.getAnnotation(Discount.class);
                if (d != null && result instanceof BigDecimal money) {
                    var after = money.multiply(BigDecimal.valueOf(d.rate()))
                        .setScale(2, RoundingMode.HALF_UP);
                    IO.println("[AOP] " + method.getName() + " 打折 " + money + " → " + after);
                    return after;
                }
                return result;
            });
    }
}
```

业务类里**一行折扣代码都没有**,打折靠贴标签——这正是 Spring 管家每天干的事,只是替身工厂更豪华。

> **🔀 豆豆的多解台 · 代理三式怎么选?**

| 解法 | 代码要点 | 适合什么时候 | 坑 |
|---|---|---|---|
| 静态代理 | 手写同接口包装类,构造器收 target | 只包一两个类、增强固定 | 每个接口手写一份,复制地狱 |
| JDK 动态代理 | `Proxy.newProxyInstance` + `InvocationHandler` | 目标有接口(本话选它) | **只能代理接口**;`this.` 自调用不经替身 |
| CGLIB | 生成目标**子类**字节码,覆写插增强 | 目标没有接口 | `final` 类/方法覆写不了;需额外库 |

豆豆锐评:业务项目交给框架;真要手写,**有接口就用 JDK 动态代理**——零依赖、六十行搞定,足够看穿底牌。

---

## 六、故意制造一个 Bug:忘写 @Retention

阿零觉得元注解是仪式感,「精简」了一版:

```java
@Target(ElementType.METHOD)
@interface Discount { double rate(); }   // ← 故意:没写 @Retention
```

编译通过,运行无声,订单照出。

---

## 七、观察现象:最可怕的是无声

会员结账 50 元,一分没折。没有异常没有堆栈,只有 JUnit 质检员一声「证据呢?」戳穿它:

```text
org.opentest4j.AssertionFailedError: expected: <44.00> but was: <50.00>
	at MiniAopTest.discount_only_on_annotated_method(MiniAopTest.java:9)
```

探针一打,`method.getAnnotation(Discount.class)` 输出 `null`。

根因:`@Retention` 不写,默认 **CLASS**——标签进了 class 文件,但 JVM 不带进运行时内存,`getAnnotation` 读到 `null`,替身以为不用打折。**折扣静默失效,资损无声发生**——比崩溃可怕一百倍。

> **🎯 面试直击**:JDK 动态代理与 CGLIB 的区别?Spring 默认用哪个?
> JDK 代理**基于接口**,生成同接口的 `$Proxy` 类;CGLIB 生成**子类**字节码,无需接口,但 `final` 类/方法覆写不了。Spring Boot 事务与 AOP **默认 CGLIB**(`proxyTargetClass=true`),有接口也走子类代理。追问:`this.` 自调用为何失效?没经过替身,直接进真身。

---

## 八、修复,并用测试证明

补回保质期,再立一张自查清单:

```java
@Retention(RetentionPolicy.RUNTIME)   // ← 修复:活到运行时
@Target(ElementType.METHOD)
@interface Discount { double rate(); }
```

```text
注解三件套自查:
1. @Retention 是 RUNTIME 吗?不是,反射永远读到 null;
2. @Target 盖住贴的位置吗?贴错编译期拒收;
3. 读的和贴的是同一个 Method 吗?JDK 代理递给 invoke 的
   是接口的 Method,标签贴在实现类上白贴,须贴接口方法。
```

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class MiniAopTest {
    OrderService svc = MiniAop.proxy(new OrderImpl(), OrderService.class);

    @Test
    void discount_only_on_annotated_method() {
        var prices = List.of(new BigDecimal("18.00"), new BigDecimal("32.00"));
        assertEquals(new BigDecimal("44.00"), svc.checkout(prices)); // 50 × 0.88
        assertEquals(new BigDecimal("50.00"), svc.total(prices));    // 没贴标签,原价
    }
}
```

绿灯。两个断言钉死:贴标签的自动打折,没贴的分文不动。

---

## 九、项目检查点 · 豆豆咖啡站 v10.2

```text
咖啡站形态:打折/日志抽离业务方法,贴 @Discount 自动生效
已具备  :自定义注解与元注解;运行时读注解;60 行迷你 AOP
          (JDK 动态代理);Spring 管家代理底牌拆穿一半
还没有  :$Proxy0 这种凭空出现的类怎么被"装进"JVM?入口没下去过
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 自定义注解 / @Retention / @Target | 「熟悉注解与反射」硬指标,三种保质期必问 |
| JDK 动态代理 vs CGLIB | Spring 面试前置题,答不出等于没读过 AOP |
| 手写迷你 AOP | 原理落地加分项:能写替身才算真懂框架 |

---

## 十一、下一话悬念

魔法拆穿一半,阿零却盯着日志里的 `$Proxy0` 发呆:这个类源码里不存在,是运行时凭空造的——那它和每个普通类,到底是怎么被「装进」JVM 的?

> 下一话《类加载与双亲委派》:装货入口在**类加载站**。谁来搬、按什么次序、为什么儿子搬货前必须先问过爹——双亲委派的规矩,下一话立正站好。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
