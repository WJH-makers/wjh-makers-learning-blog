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

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
