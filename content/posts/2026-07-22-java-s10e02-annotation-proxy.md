---
title: "《从零开始学 Java》81 · 注解与动态代理:手写迷你 AOP"
date: 2026-07-22
summary: "打折代码被复制进每个结账方法,阿零忍无可忍。豆豆亮出底牌:@Discount 注解 + JDK 动态代理,60 行手写迷你 AOP,Spring 管家魔法拆穿一半。一个漏写的 @Retention,却让折扣无声蒸发。"
tags: [Java, Java漫画, 注解, 动态代理, AOP, 番外, 阿零与豆豆]
---

![Java漫画：s10e02-annotation-proxy](/comics/java/s10e02-annotation-proxy.png)

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

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. 要使自定义注解在运行时能通过反射读取,`@Retention` 必须设为?
   - A) `RetentionPolicy.SOURCE`
   - B) `RetentionPolicy.CLASS`
   - C) `RetentionPolicy.RUNTIME`
   - D) 不需要,注解默认即可运行时读取

2. `@Target(ElementType.METHOD)` 的作用是?
   - A) 限定该注解只能贴在方法上,贴错位置编译器拒收
   - B) 让注解在运行时生效
   - C) 指定注解在编译后保留
   - D) 定义注解的处理逻辑

3. `Proxy.newProxyInstance` 的三个参数分别是?
   - A) 类加载器、目标类、InvocationHandler
   - B) 类加载器、接口数组、InvocationHandler
   - C) 接口数组、目标实例、类加载器
   - D) InvocationHandler、接口数组、类加载器

4. JDK 动态代理中,每次调用代理对象的方法时,实际执行的是?
   - A) 目标对象的原方法直接执行
   - B) `InvocationHandler` 的 `invoke` 方法
   - C) 代理类自动生成的同名方法
   - D) `Proxy` 类的静态 `invoke` 方法

5. 以下关于 JDK 动态代理与 CGLIB 的对比,**正确的是**?
   - A) JDK 代理通过生成子类实现,CGLIB 通过接口实现
   - B) JDK 代理可以代理任意类,CGLIB 只能代理有接口的类
   - C) JDK 代理基于接口,CGLIB 通过生成子类字节码实现
   - D) JDK 代理和 CGLIB 都需要目标类实现接口

6. 阿零在实现类的方法上贴了 `@Discount`,但通过 JDK 代理调用时 `getAnnotation` 返回 null,原因是?
   - A) `@Retention` 没设为 RUNTIME
   - B) 标签贴在**实现类**方法上,而代理的 `invoke` 拿到的是**接口**的 Method 对象
   - C) 代理类不支持注解
   - D) 调用链太深,注解丢失

7. 以下代码中,`svc.checkout(prices)` 虽然调了 `total`,但打折逻辑**不会**对 `total` 生效,根本原因是?
```java
class OrderImpl implements OrderService {
    @Discount(rate=0.88) public BigDecimal checkout(List<BigDecimal> prices) {
        return this.total(prices);  // 自调用
    }
    public BigDecimal total(List<BigDecimal> prices) { ... }
}
```
- A) `@Discount` 的 rate 太小
- B) `this.total()` 是自调用,不经过代理对象
- C) `checkout` 方法是 final 的
- D) JDK 代理不支持多层调用

8. 以下哪个场景最适合用静态代理而非动态代理?
   - A) 需要为 100 个 Service 接口统一记录日志
   - B) 需要为目标类(无接口)的所有方法做权限校验
   - C) 只需要为某个特定类的特定方法添加缓存,且需求稳定不变
   - D) 运行时根据配置文件决定是否开启代理

9. 以下关于 CGLIB 代理的限制,描述**错误**的是?
   - A) 无法代理 `final` 类
   - B) 无法代理 `final` 方法
   - C) 无法代理没有实现接口的类
   - D) 需要额外引入 CGLIB 依赖(或 Spring 内置的版本)

10. Spring Boot 中 AOP 和事务默认使用 CGLIB 代理(而非 JDK 动态代理),最重要的原因是?
   - A) CGLIB 性能比 JDK 代理高很多
   - B) 避免强制所有业务类实现接口,提供一致的代理行为
   - C) CGLIB 是 JDK 内置的,不需要额外依赖
   - D) JDK 代理已废弃

### 解答题(5 道)

**Q1(概念)** 简述 `@Retention` 三种取值(SOURCE / CLASS / RUNTIME)的区别,并说明框架注解(如 `@Transactional`)为什么必须用 RUNTIME。

**Q2(解释)** 本话指出 `@Retention` 默认值是 CLASS,且不写时 `getAnnotation` 读到 null。请解释:为什么标签能进 class 文件,但反射读不到?

**Q3(场景)** 你需要为咖啡站的订单系统设计一个「操作日志」功能:对特定方法自动记录入参、返回值和耗时。请用 JDK 动态代理写出核心代码,说明如何判断一个方法是否需要记录日志。

**Q4(分析)** 分析 `this.` 自调用在 JDK 动态代理中失效的根本原因,并结合代理对象的创建过程画出调用链。

**Q5(设计)** 你需要实现一个简单的「重试注解」`@Retry(times=3, delay=100)`——贴了该注解的方法失败后自动重试指定次数。请设计注解定义 + InvocationHandler 核心逻辑,并说明对幂等性的考量。

> [!答案]
> **选择题**
> 1-C。SOURCE 只活在源码中(@Override 典型),CLASS 进 class 但 JVM 不载入(默认!),RUNTIME 运行时可反射读取。★举一反三:面试中「你写的注解为什么不生效」十有八九是 Retention 写错或忘写。
>
> 2-A。`@Target` 限定贴的位置:METHOD/TYPE/FIELD/PARAMETER 等。★举一反三:组合使用 `@Target({METHOD, TYPE})` 可以让注解同时贴在方法和类上。
>
> 3-B。`Proxy.newProxyInstance(ClassLoader loader, Class<?>[] interfaces, InvocationHandler h)`。★举一反三:第一个参数通常传目标类的 ClassLoader,保证代理类的加载器一致。
>
> 4-B。每次对代理对象的方法调用都会进入 `InvocationHandler.invoke(proxy, method, args)`。★举一反三:invoke 的三个参数分别是代理对象本身、被调用的 Method、方法参数——可以在此处做任意增强(日志、事务、缓存)。
>
> 5-C。JDK 代理必须目标有接口,生成同接口的 `$Proxy` 类;CGLIB 生成目标类的子类,不需要接口但 final 受限。★举一反三:Spring Boot 默认 CGLIB 就是为了不强迫业务类实现接口。
>
> 6-B。JDK 代理的 `invoke` 中拿到的 `method` 是**接口**声明的方法。注解贴在实现类上的话,`method.getAnnotation()` 找不到。★举一反三:用 JDK 代理时,注解必须贴在接口方法上;或者改用 CGLIB(子类代理,注解贴实现类即可)。
>
> 7-B。`this.total()` 是对象内部的自调用,`this` 指向本体而非代理,所以直接进本体方法,不经过代理的 invoke。★举一反三:这是 Spring 事务失效的经典场景之一(#89 详细讲)。
>
> 8-C。静态代理手写包装类,适合增强逻辑固定、类数量少的情况。★举一反三:AOP 的横切逻辑(日志/事务)是「到处都要」型,必须动态代理;单点增强可用静态代理。
>
> 9-C。CGLIB **不需要**目标类有接口,这正是它相对于 JDK 代理的最大优势。★举一反三:CGLIB 的突破口是:避开 final,其余都能代理。
>
> 10-B。Spring Boot 默认 `proxyTargetClass=true`,不强迫业务类实现接口,行为统一。★举一反三:其实 JDK 代理更轻量(零依赖),Spring 选 CGLIB 是品味取舍而非性能取舍。
>
> **解答题**
>
> **Q1** SOURCE:只在源码中存在,编译后丢弃(如 `@Override`),编译器用后即扔。CLASS:编译后留在 class 文件,但类加载时 JVM 不载入内存(默认值),反射读不到。RUNTIME:类加载时载入内存,运行时可反射读取,框架注解必须用此级。★举一反三:框架注解之所以能「贴标签办事」,本质上就是 Retention=RUNTIME + 反射扫描两个能力的组合。
>
> **Q2** 注解的保留策略分两个阶段:①编译期——决定是否写进 class 文件(SOURCE 在此截断);②类加载期——决定是否载入 JVM 运行时内存(CLASS 在此截断)。默认 CLASS 意味着标签确实在 class 文件里(javap 能看到),但在类加载的「加载」阶段后被丢弃,不进入方法区。`getAnnotation` 查询的是运行时内存中的数据结构,所以读到 null。★举一反三:这解释了为什么编译通过、运行无报错、但逻辑静默失效——没有异常的 bug 最可怕。
>
> **Q3** 核心设计:定义 `@Log` 注解标识需要记录的方法;InvocationHandler 中通过 `method.isAnnotationPresent(Log.class)` 判断;记录前后时间戳计算耗时。关键代码:
> ```java
> Object result;
> if (method.isAnnotationPresent(Log.class)) {
>     long start = System.nanoTime();
>     result = method.invoke(target, args);
>     System.out.printf("[LOG] %s(%s) = %s (%dns)%n", method.getName(), Arrays.toString(args), result, System.nanoTime() - start);
> } else {
>     result = method.invoke(target, args);
> }
> return result;
> ```
> ★举一反三:所有「装饰」型逻辑(日志、度量、限流)都是这种模式——检查标记→做事情→放行本体。
>
> **Q4** 代理的本质是「替身站在门口」。调用方持有的是代理对象引用,调用 `proxy.method()` 时:①进入代理对象的 invoke →②拦截器处理(打标签、记日志)→③`method.invoke(target, args)` 放行本体。但 `this` 永远是本体自己的引用,本体内部 `this.method()` 直接从本体栈帧开始,不过代理的门。调用链:`外部 → 代理.invoke() → 拦截器 → 本体.method()` 中,自调用短路了代理,直接 `本体 → 本体.method2()`。★举一反三:Spring 事务失效(同类自调用)、AOP 切面不生效,根源都在这里。
>
> **Q5** 注解定义:
> ```java
> @Retention(RUNTIME) @Target(METHOD)
> @interface Retry { int times() default 3; long delay() default 100; }
> ```
> Handler 核心:
> ```java
> Retry r = method.getAnnotation(Retry.class);
> if (r != null) {
>     for (int i = 0; i <= r.times(); i++) {
>         try { return method.invoke(target, args); }
>         catch (InvocationTargetException e) {
>             if (i == r.times()) throw e.getCause();
>             Thread.sleep(r.delay());
>         }
>     }
> }
> ```
> 幂等性考量:重试意味着方法可能被执行多次。必须要求:①被重试的方法是幂等的(相同的输入,重复执行结果一致——如查询/幂等写入);②非幂等方法(如扣库存)用重试必须配合幂等号或唯一约束,SELECT 确认是否已执行。★举一反三:这就是 Spring Retry 和 Resilience4j 的底层原理——注解 + AOP 代理 + 重试循环。
>
> ---

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*
