---
title: "《从零开始学 Java》88 · Spring 内幕(上):Bean 的一生"
date: 2026-11-14
summary: "@Autowired 拿到的对象,到底是谁在什么时候 new 的?跟豆豆下到 Spring 管家的地下车间:从 BeanDefinition 图纸到 AOP 换包的完整流水线、三级缓存怎么解循环依赖,以及构造器互注为什么启动即爆炸。"
tags: [Java, Java漫画, Spring, Bean生命周期, 循环依赖, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》88 · Spring 内幕(上):Bean 的一生

> 连载特刊 · 番外卷三「引擎室」第 9 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——存储层全部看透,豆豆交出了 Spring 管家地下室的钥匙:最后一层迷雾,从 Bean 的出生看起。

---

## 一、事故:一句「自动」露了馅

模拟面试第一题,豆豆一开口就是面试官腔:「简历上写熟悉 Spring Boot?那 `OrderService` 这个对象,是谁 new 的?什么时候 new 的?new 完就直接给你用了吗?」

阿零:「Spring……自动……」

豆豆:「『自动』翻译成面试黑话,就是『我不知道』。第 40、41 话你只见过管家端上来的菜,今晚下地下室看菜怎么做。现役基线:Spring Boot 4.x,`jakarta.*` 命名空间。」

---

## 二、漫画 · 地下车间的流水线

> **〔1〕** 地下室大门开启,一整面墙的蓝图。Spring 管家推了推单片眼镜。
> 管家:「扫描进来的每个 `@Component`,先登记成图纸——**BeanDefinition**。我不凭感觉造对象,照图施工。」

> **〔2〕** 流水线起点:机械臂用「反射钥匙」拧开构造器,铸出一个空壳对象。
> 阿零:「这不是第 80 话那把反射钥匙吗!」
> 管家:「**实例化**。此刻它只是毛坯,字段全是默认值。」

> **〔3〕** 后续工位流水而过:往毛坯里插零件(属性填充)、贴铭牌(Aware)、质检员盖「BPP 前置」的章。
> 豆豆:「`@Autowired` 先**按类型**找零件;`@Resource` 反过来,先**按名字**。」

> **〔4〕** 【特写格】初始化完成的 Bean 刚喊「我好了」,「BPP 后置」工位把它整个塞进一件代理西装——出来的是另一个对象。
> 豆豆(叼着豆子叉腰):「第 81 话你手写的迷你 AOP,管家在这儿开的正版店。**你拿到的经常不是本尊,是穿西装的替身。**」

> **〔5〕** 成品放进「单例池」恒温仓库。阿零在蓝图墙前把两张图纸的箭头互相指向对方,墙角警报灯闪了一下红光。
> 管家(背对着):「入池之后,全站共享这一个……嗯?谁动了我的图纸?」

---

## 三、本话目标

- 讲清 Bean 的完整一生:图纸 → 实例化 → 填充 → Aware → BPP 前置 → 初始化 → BPP 后置(换包)→ 单例池 → 销毁;
- 看懂三级缓存如何解 setter 循环依赖,以及**为什么二级不够**;
- 亲手撞一次构造器循环依赖 `BeanCurrentlyInCreationException`;
- 用设计手段拆环,而不是绕过报警。

---

## 四、原理图:Bean 的一生 + 三级缓存

```text
BeanDefinition(图纸:类名/作用域/依赖)
  ↓ ① 实例化 —— 反射调构造器(#80 的钥匙),得到毛坯
  ↓ ② 属性填充 —— @Autowired 按类型注入(@Resource 先按名)
  ↓ ③ Aware 回调 —— BeanNameAware / ApplicationContextAware…
  ↓ ④ BeanPostProcessor 前置
  ↓ ⑤ 初始化 —— @PostConstruct → afterPropertiesSet → init-method
  ↓ ⑥ BeanPostProcessor 后置 —— AOP 代理就在这一步换的包(#81)
  ↓ ⑦ 入单例池 singletonObjects,就绪服役
  容器关闭 → ⑧ 销毁 —— @PreDestroy → destroy()
```

setter 循环依赖(A、B 的字段互要对方)框架层有救:A 走完①先把「半成品的获取方式」挂进三级缓存;B 填充时拿到 A 的**早期引用**先用着,B 造完入池,A 再把 B 注满——环解开。

> **🎯 面试直击**:三级缓存分别存什么?为什么二级不够?
>
> | 层级 | 名字 | 存的东西 |
> |---|---|---|
> | 一级 | singletonObjects | **成品**:走完全流程的 Bean |
> | 二级 | earlySingletonObjects | **早期引用**:提前曝光的半成品(可能已是代理) |
> | 三级 | singletonFactories | **工厂** ObjectFactory:被要时才决定曝光原对象还是早期代理 |
>
> 只有两级,想保证「提前拿走的 A」与「最终入池的 A」是同一个,就得在实例化时**无条件提前生成代理**——可 AOP 本该初始化后(⑥)才换包。三级的工厂把「要不要提前代理」推迟到**真发生循环**才做,没循环零成本;工厂产物放进二级,多方拿到同一个早期引用。追问点:较新版本的 Boot **默认连 setter 循环也禁了**(`spring.main.allow-circular-references` 可开回,别开)。

---

## 五、从上一话继续改代码:给咖啡站装生命周期探针

在 #41 的三层骨架上加一个探针 Bean,启动一次,流水线自己报站:

```java
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.*;
import org.springframework.stereotype.Component;

@Component
public class LifecycleProbe implements BeanNameAware, InitializingBean {

    public LifecycleProbe() {
        IO.println("① 实例化:构造器被反射调用,字段还全是默认值");
    }

    @Override
    public void setBeanName(String name) {
        IO.println("③ Aware:管家说我在图纸上叫 " + name);
    }

    @PostConstruct
    void warmUp() {
        IO.println("⑤ @PostConstruct:依赖已注满,预热咖啡机");
    }

    @Override
    public void afterPropertiesSet() {
        IO.println("⑤' afterPropertiesSet:排在 @PostConstruct 之后");
    }
}
```

启动日志按 ①③⑤⑤' 顺序报站;容器打烊还有 ⑧:`@PreDestroy` → `destroy()`,收摊。

---

## 六、故意制造一个 Bug:构造器互相注入

阿零嫌「下单扣库存、库存又要通知订单」绕,干脆让两个 Service 构造器互注:

```java
@Service
public class OrderService {
    private final StockService stockService;
    public OrderService(StockService stockService) { this.stockService = stockService; }
}

@Service
public class StockService {
    private final OrderService orderService;
    public StockService(OrderService orderService) { this.orderService = orderService; }
}
```

---

## 七、观察真实错误信息

启动即倒,Boot 的失败分析器把环画给你看:

```text
***************************
APPLICATION FAILED TO START
***************************

Description:

The dependencies of some of the beans in the application context form a cycle:

┌─────┐
|  orderService defined in file [.../classes/cafe/OrderService.class]
↑     ↓
|  stockService defined in file [.../classes/cafe/StockService.class]
└─────┘

Action:

Relying upon circular references is discouraged and they are prohibited by
default. Update your application to remove the dependency cycle between beans.
```

往上翻异常链,最里层是:

```text
Caused by: org.springframework.beans.factory.BeanCurrentlyInCreationException:
Error creating bean with name 'orderService': Requested bean is currently
in creation: Is there an unresolvable circular reference?
```

根因:构造器注入在**①实例化**就要拿到对方,而 Bean 要走完①才能进三级缓存曝光半成品——两人堵在产房门口等对方先出生。setter 环有半成品可救,**构造器环连半成品都没有,无解**。

> **豆豆锐评**:循环依赖报错是**架构在报警**,别只想着绕过去。两个 Service 互相掏对方口袋,说明有块共同的职责没人认领——报警器响了该找火源,不是拆报警器。

---

## 八、修复,并用测试证明

**止痛药**:`public OrderService(@Lazy StockService s)`——注入代理占位符,第一次真调用才取真身。代价:启动期检查失效,问题推迟到运行时;环还在,只是看不见了。

**手术**:把共同职责抽成第三个类,两边都依赖它,环自然消失:

```java
@Component
public class StockLedger {          // 库存台账:被两家抢的那块职责
    private final Map<String, Integer> stock = new ConcurrentHashMap<>();  // 回看 #74
    public void put(String name, int n)    { stock.put(name, n); }
    public void deduct(String name, int n) { stock.merge(name, -n, Integer::sum); }
    public int remaining(String name)      { return stock.getOrDefault(name, 0); }
}

@Service
public class OrderService {
    private final StockLedger ledger;
    public OrderService(StockLedger ledger) { this.ledger = ledger; }
    public void placeOrder(String coffee)   { ledger.deduct(coffee, 1); }
}

@Service
public class StockService {
    private final StockLedger ledger;
    public StockService(StockLedger ledger) { this.ledger = ledger; }
    public int remaining(String coffee)     { return ledger.remaining(coffee); }
}
```

JUnit 质检员:「证据呢?」

```java
@SpringBootTest
class BeanLifecycleTest {

    @Autowired ApplicationContext ctx;
    @Autowired StockLedger ledger;

    @Test
    void cycle_is_gone_and_singleton_pool_works() {
        assertNotNull(ctx.getBean(OrderService.class));      // 环已拆,容器起得来
        assertSame(ledger, ctx.getBean(StockLedger.class));  // 单例池:两次拿的是同一个
    }

    @Test
    void order_deducts_stock_through_ledger() {
        ledger.put("拿铁", 10);
        ctx.getBean(OrderService.class).placeOrder("拿铁");
        assertEquals(9, ctx.getBean(StockService.class).remaining("拿铁"));
    }
}
```

两条全绿;第二条顺手证明单例池——全站共用同一本账。

---

## 九、项目检查点 · 豆豆咖啡站 v10.9

```text
咖啡站形态:引擎室之旅第九站,Spring 管家的地下车间全程看穿
已具备  :Bean 全生命周期十一道工序;三级缓存解 setter 环与「二级为何不够」;
          构造器环当场识别,拆类解环
还没有  :@Transactional 挪个位置就「静默失效」——管家代理的最后一张底牌还没掀
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| Bean 生命周期 + BeanPostProcessor | Spring 八股第一题,「AOP 在 BPP 后置换包」是分水岭 |
| 三级缓存与循环依赖 | 追问链:存什么→为何三级→构造器环为何无解 |
| 拆环的设计手段(抽类 vs @Lazy) | 资深味儿:把报错当架构信号而非配置问题 |

---

## 十一、下一话悬念

Bean 生得明明白白了。阿零信心爆棚,顺手重构:把带 `@Transactional` 的扣库存方法挪了个位置,改成同类里 `this.` 调用——测试全绿,可异常发生时库存只回滚了一半。**没有报错,没有日志,事务静默失效。**

> 下一话《Spring 内幕(下):代理与事务失效》:@Transactional 的真身是代理环绕,`this.` 一出手,替身就被绕过。管家的最后一张底牌,连同 Boot 自动配置的机关,一起摊开。

---

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. Spring Bean 完整生命周期中,「实例化」阶段的核心动作是?
- A) 从单例池中取出已创建的对象
- B) 反射调用构造器创建对象(此时字段还是默认值)
- C) 通过 `@Autowired` 注入依赖
- D) 调用 `@PostConstruct` 方法

2. `@Autowired` 和 `@Resource` 的注入策略区别是?
- A) `@Autowired` 按名称注入,`@Resource` 按类型注入
- B) `@Autowired` 按类型注入(配合 `@Qualifier` 按名),`@Resource` 默认按名称注入
- C) 两者完全一致
- D) `@Autowired` 只能注入接口,`@Resource` 只能注入实现类

3. Spring 三级缓存中,`singletonObjects`(一级缓存)存储的是?
- A) Bean 的半成品(未完成属性填充)
- B) 提前曝光的早期引用
- C) 走完全部生命周期工序的成品 Bean
- D) ObjectFactory 工厂对象

4. AOP 代理是在 Bean 生命周期的哪个阶段「换的包」?
- A) 实例化
- B) 属性填充
- C) 初始化(`@PostConstruct` 之后)
- D) BeanPostProcessor 后置处理

5. setter 循环依赖(A 需要 B,B 需要 A)能被 Spring 解决的原理是?
- A) Spring 会自动将 setter 注入改为构造器注入
- B) 三级缓存:先暴露「半成品的获取方式」(三级 ObjectFactory),B 需要 A 时拿到 A 的早期引用,B 造完入池后 A 再完成填充
- C) Spring 禁止 setter 循环依赖,必须手动拆
- D) Spring 将两个 Bean 合并成一个

6. 构造器循环依赖无解的根本原因是?
- A) 构造器注入性能太差
- B) 实例化(①)阶段就需要对方,而半成品要等实例化完成才能曝光——两人堵在产房门口等对方先出生
- C) Spring 不支持构造器注入
- D) Java 不支持构造器

7. 第三级缓存(`singletonFactories`)存在的必要性是?
- A) 纯粹为了代码对称
- B) 把「要不要提前生成代理」的决定推迟到**真发生循环**时才做——没循环零成本
- C) 支持多例(prototype)Bean
- D) 替代一级缓存

8. 以下关于 `@Lazy` 解决循环依赖的描述,**正确**的是?
- A) `@Lazy` 真正拆解了循环依赖
- B) `@Lazy` 注入的是一个代理占位符,首次真调用时才取真身——环还在,只是被推迟和隐藏了
- C) `@Lazy` 让构造器注入变得和 setter 注入一样
- D) `@Lazy` 是解决循环依赖的首选方案

9. `orderService` 和 `stockService` 构成循环依赖,最佳的设计解法是?
- A) 加 `@Lazy` 注解
- B) 相互调用的职责抽成第三个类(如 `StockLedger`),两边都依赖它,环自然消失
- C) 启用 `allow-circular-references`
- D) 把 setter 注入改成构造器注入

10. Spring Boot 较新版本对循环依赖的默认态度是?
- A) 完全允许,不做任何限制
- B) **默认禁止**(包括 setter 循环),需 `spring.main.allow-circular-references=true` 手动打开(不推荐)
- C) 允许 setter 但不允许构造器
- D) 自动拆解所有循环依赖

### 解答题(5 道)

**Q1(概念)** 画出 Bean 从 BeanDefinition 到单例池(再到销毁)的完整生命周期流程图,标注每道工序的名称和职责。

**Q2(解释)** 为什么三级缓存中只有二级不够?三级缓存的 `ObjectFactory` 解决了什么问题?

**Q3(场景)** 你的项目中 `OrderService` 和 `StockService` 互相通过 setter 注入,启动正常。某天团队要求改为构造器注入以提高不可变性——启动即报 `BeanCurrentlyInCreationException`。请解释原因,并给出至少两种解决方案。

**Q4(分析)** 分析以下代码的启动日志输出顺序,并解释每一步对应 Bean 生命周期的哪个阶段:
```java
@Component
public class LifecycleProbe implements BeanNameAware, InitializingBean {
    public LifecycleProbe() { System.out.println("①"); }
    @Override public void setBeanName(String name) { System.out.println("③ " + name); }
    @PostConstruct void warmUp() { System.out.println("⑤"); }
    @Override public void afterPropertiesSet() { System.out.println("⑤'"); }
}
```

**Q5(设计)** 你需要设计一个轻量级 IoC 容器的核心模块:支持 `@Component` 扫描、`@Autowired` 按类型注入、AOP 代理替换。请给出核心类设计和流程,并说明如何处理 setter 循环依赖。

> [!答案]
> **选择题**
> 1-B。实例化本质是反射调 `constructor.newInstance()`,此时字段全是默认值(引用=null,int=0)。★举一反三:实例化和属性填充是两个独立阶段,中间间隔不能用于业务逻辑。
>
> 2-B。`@Autowired` 是 Spring 的,按类型(byType)注入,配合 `@Qualifier` 按名限定;`@Resource` 是 JSR-250 标准,默认按名称(byName),找不到再回退按类型。★举一反三:日常开发首选 `@Autowired`,避免混用导致维护困惑。
>
> 3-C。一级缓存存的是完全初始化好的 Bean(走完 BPP 后置的成品)。★举一反三:一级=成品仓库,二级=半成品柜台,三级=延迟加工厂。
>
> 4-D。BPP 后置(`postProcessAfterInitialization`)是 AOP 代理的织入点——此时 Bean 已初始化完成,如果有需要代理的切面,在这里用 CGLIB/JDK 代理包装后返回代理对象。★举一反三:这就是为什么同一类中 `this.` 调用不走代理——`this` 指的是原始 Bean,不是包装后的代理。
>
> 5-B。三级缓存机制:A 实例化后把 `ObjectFactory` 放入三级缓存→B 填充时发现需要 A→从三级取出工厂→工厂决定返回 A 本尊还是早期代理→放入二级缓存→B 拿到 A 的早期引用,完成填充→B 入一级缓存→A 拿到完整的 B,完成填充→A 入一级缓存。★举一反三:只有 setter 注入能走这条路径,因为构造器注在实例化阶段就要完整的 B。
>
> 6-B。构造器注入在步骤①(实例化)就要拿到依赖参数,但 Bean 要等实例化完成后才会被放入三级缓存曝光半成品。构造器互注=两人同时等对方先出生,死锁。★举一反三:这也是为什么 Spring 推荐「构造器注入 + setter 注入混用」——必须的依赖用构造器,可选的用 setter,但避免两个构造器互注。
>
> 7-B。只有两级的话,要保证「提前拿走的 A」和「最终入池的 A」是同一个代理对象,就得在实例化时无条件提前生成代理——而 AOP 本该在初始化后才换包。三级工厂的妙处:把「要不要提前生成代理」推迟到**真正发生循环引用时才做**——没循环的话,工厂连调都不被调,零开销。★举一反三:这就是「延迟计算 + 缓存」在 Spring 内部的精妙应用。
>
> 8-B。`@Lazy` 不为所注入的 Bean 注入真身,而注入一个**代理占位符**(第一次调用时从容器取真身)。循环依赖的箭头仍在,只是启动期不再报错——问题推迟到首次调用。★举一反三:架构的警铃被按掉,不代表火灾解除。
>
> 9-B。循环依赖通常是两个类职责重叠的信号——把共同的数据或逻辑抽成第三类(如 `StockLedger`),让两边都依赖它,职责更清晰,环也自然消失。★举一反三:所有绕过循环依赖的技术手段(@Lazy/三级缓存/allow-circular-references)都是止痛药,拆类是手术。
>
> 10-B。Spring Boot 较新版本(2.6+)默认 `spring.main.allow-circular-references=false`,连 setter 循环也禁。★举一反三:框架主动收紧默认值是在告诉你——循环依赖是设计问题,不是配置问题。
>
> **解答题**
>
> **Q1** 流程:①BeanDefinition(图纸:扫描到的 `@Component` 类)→②实例化(反射构造器,毛坯对象)→③属性填充(`@Autowired` 按类型注入依赖)→④Aware 回调(BeanNameAware/ApplicationContextAware)→⑤BPP 前置(`postProcessBeforeInitialization`)→⑥初始化(`@PostConstruct`→`afterPropertiesSet`→`init-method`)→⑦BPP 后置(`postProcessAfterInitialization`,**AOP 代理在此换包**)→⑧入单例池(`singletonObjects`,就绪)→⑨销毁(容器关闭,`@PreDestroy`→`destroy()`)。★举一反三:记住「①②③④⑤⑥⑦⑧⑨」九个编号,面试时从头背到尾就是满分回答。
>
> **Q2** 问题:如果 A 需要提前曝光(因为 B 要引用它),如何保证「提前曝光的 A」和「最终入池的 A」是同一个对象——包括代理?只有两级的话:①一级存成品(但 A 还没走完初始化,不能放);②二级存半成品(但 A 需要 AOP 代理,半成品只是原始对象)。矛盾:在实例化阶段就生成代理(为放进二级)违反「AOP 应在初始化后织入」的时序。三级缓存的解:单例工厂(`ObjectFactory`)可以延迟调用——当 B 真的需要 A 时,才从工厂取;工厂内部可以检查「A 是否需要代理→需要就提前生成→放进二级」;如果 A 不需要代理,直接返回原始半成品。关键:**延迟决策**,把「要不要代理」推迟到必须的时刻。★举一反三:这是「懒加载 + 缓存」的经典模式——工厂只生产一次,后续从二级拿。
>
> **Q3** 原因:setter 注入在步骤③(属性填充),此时 A 实例化已完成且放入三级缓存,B 可以从缓存拿 A 的半成品;构造器注入在步骤②(实例化),此时 A 还没实例化完成,三级缓存里没有 A——两个构造器互相等对方先出生,最终 `BeanCurrentlyInCreationException`。方案一(推荐):抽第三个类 `StockLedger`(库存台账),`OrderService` 和 `StockService` 都不直接依赖对方,只依赖 `StockLedger`——环消失。方案二(止痛):将其中一方的构造器注入改为 `@Lazy` 注入代理——`public OrderService(@Lazy StockService stockService)`。方案三(不推荐):保持 setter 注入+`allow-circular-references=true`。★举一反三:团队在推行「构造器注入替代 setter 注入」时,最容易踩的坑就是循环依赖——应先拆类,再改注入方式。
>
> **Q4** 启动日志顺序:①→③→⑤→⑤'。①:构造器打印,对应生命周期第②步(实例化)的构造器调用。③:setBeanName 打印,对应第④步(Aware 回调)——Spring 通过 Aware 接口把容器信息(此处是 Bean 的名字)注入给 Bean。⑤:PostConstruct 打印,对应第⑥步(初始化)的第一个回调,表示依赖已注满,Bean 可以开始自己的初始化工作。⑤':afterPropertiesSet 打印,对应第⑥步的第二个回调(`InitializingBean` 接口),在 `@PostConstruct` 之后执行。★举一反三:②(属性填充)和⑤(BPP 前置)没有打印是因为没在代码中体现——但它们确实在③和⑤之间执行了。注意:没有⑤就没有⑤',顺序是固化的。
>
> **Q5** 核心类:①`ApplicationContext`:入口,触发 `scan()`→`refresh()`;②`BeanDefinition`:存储类名/作用域/依赖信息;③`BeanFactory`:核心——`getBean()`→若一级缓存有直接返回;否则创建:实例化(reflect)→放入三级缓存(`ObjectFactory`)→填充(遍历 Field,有 `@Autowired` 的递归 `getBean`)→BPP 前置→初始化(`@PostConstruct`)→BPP 后置(检查是否有 AOP 切面,有则生成代理替换原对象)→放入一级缓存,清理二三级。④`BeanPostProcessor` 接口:前置和后置钩子。AOP 处理:在 BPP 后置中,检查 Bean 是否匹配切点表达式,匹配则创建 CGLIB/JDK 代理。循环依赖处理:setter 循环通过三级缓存——A 实例化后三级存工厂,B 取 A 时工厂返回 A(若需代理则提前生成)→B 完成→A 拿到 B 完成填充。构造器循环检测:若 `getBean` 递归中又回到同样的 `getBean(同 name)`,直接抛异常。★举一反三:这就是一个迷你 Spring 的心脏——只差 XML/注解解析、事件机制、环境抽象等外围模块。
>
> ---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
