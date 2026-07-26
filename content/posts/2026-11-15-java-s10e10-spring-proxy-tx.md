---
title: "《从零开始学 Java》89 · Spring 内幕(下):代理与事务失效"
date: 2026-11-15
summary: "扣减方法贴着 @Transactional,异常后账却只回滚一半——自调用根本没走代理。拆穿事务失效三大场景与传播行为,再掀开 Boot 自动配置清单与 MVC 请求流程这最后一层底牌。"
tags: [Java, Java漫画, Spring, 事务, AOP, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》89 · Spring 内幕(下):代理与事务失效

> 连载特刊 · 番外卷三「引擎室」第 10 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——Bean 生得明白了;可注解一挪位置,事务居然「静默失效」——管家的代理还有最后一张底牌。

---

## 一、事故:注解还在,事务没了

冬歇复盘演练,阿零重构优惠结算:「扣库存+记流水」收进同一个类,方法上贴着 `@Transactional`。压测中「库存不足」异常抛出——按剧本该整体回滚,可数据库里**库存扣了,流水没记**:账,只回滚了一半。

阿零:「注解我一个字母没打错啊?!」豆豆:「注解没错,是你叫错了人。`@Transactional` 不是魔法,是**代理环绕**——今天翻完这张底牌。」

---

## 二、漫画 · 替身演员的门禁

> **〔1〕** 管家地下室一排「替身演员」,制服与本体 Bean 一模一样,胸牌写着 `CheckoutService$$SpringCGLIB$$0`。
> 豆豆:「#88 里 BeanPostProcessor 后置阶段『换的包』就是它——注入出去的不是本体,是 CGLIB 造的**子类替身**。」

> **〔2〕** 墙上挂着替身工作流程:进替身的门 → 开事务 → 喊本体干活 → 成功盖「提交」,失败盖「回滚」。
> 豆豆:「**从门外进来,才有事务。**」

> **〔3〕** 阿零站在本体屋子**里面**,扭头喊自己:「`this.deduct()`!」——本体应声干活,门口替身毫无察觉。
> 阿零:「同一个类里调用,总归是同一个人吧?」

> **〔4〕** JUnit 质检员举着打印纸:「证据呢?`isActualTransactionActive()=false`——这一路,压根没有事务。」
> 豆豆(叼着豆子叉腰):「`this` 是本体的自称,代理拦不到自称。**自调用,事务失效头号案发现场。**」

---

## 三、本话目标

- 讲透 `@Transactional` 真身:代理环绕(开事务→invoke→提交/回滚);
- 背下并讲透失效三场景:自调用 / 非 public 与 final / 受检异常不回滚;
- 用三个传播行为看懂「事务套事务」;
- 拆掉自动配置魔法:三合一 + imports 清单 + 条件装配;
- 一张图走完 MVC 请求流程。

---

## 四、原理图:代理环绕与失效三场景

```text
调用方(门外)
   ▼
CGLIB 代理(本体子类;Boot 默认 proxyTargetClass=true)
   ① TransactionInterceptor:getTransaction 开事务
   ② invoke 本体;无异常 → commit,RuntimeException/Error → rollback
   ▼
本体 Bean(#88 被「换包」的那个)—— this 永远指它自己
```

**失效三场景:**

1. **同类自调用 `this.xxx()`**:`this` 是本体,不过代理的门,环绕逻辑整段跳过;
2. **非 public / final 方法**:CGLIB 靠「生成子类 + 覆盖方法」织入,`final` 覆盖不了,非 public 默认不织入;
3. **受检异常默认不回滚**:默认只认 `RuntimeException` / `Error`;`throws Exception` 的必须 `@Transactional(rollbackFor=Exception.class)`。

**传播行为讲三个够用:**

| 传播行为 | 一句话 | 咖啡站小剧场 |
|---|---|---|
| REQUIRED(默认) | 有事务就加入,没有就新开 | 下单+扣库存一张账单,同成同退 |
| REQUIRES_NEW | 挂起外层,自己新开一个 | 操作日志:主单回滚,日志也得留下 |
| NESTED | 外层里打个保存点 | 赠品失败只退这一步;主单崩全退 |

**Boot 自动配置的真相**:`@SpringBootApplication` 三合一 = `@SpringBootConfiguration` + `@EnableAutoConfiguration` + `@ComponentScan`。后者读各 jar 里 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 清单(`spring.factories` 的自动配置用途已废),逐条过 `@ConditionalOnClass` / `@ConditionalOnMissingBean`——classpath 有货才配,你配了它就让位,不要的 `exclude` 排除。魔法=**清单+条件+你优先**。

**MVC 请求流程速览:**

```text
HTTP 请求 → DispatcherServlet(唯一前门,jakarta.servlet.Servlet)
 → HandlerMapping(URL→哪个 Controller 方法)→ HandlerAdapter
 → ArgumentResolver(请求→入参)→ @Controller 方法(可能是代理!)
 → ReturnValueHandler → HttpMessageConverter(对象⇆JSON)→ 响应
```

> **🎯 面试直击**:事务失效场景说三个?自动配置怎么按条件生效?
> 失效:①同类自调用绕过代理;②非 public 或 final,CGLIB 子类覆盖不了;③受检异常默认不回滚,需 rollbackFor。自动配置:读 `AutoConfiguration.imports` 清单,逐条过 `@ConditionalOn*`,用户 Bean 优先。追问点:Boot 为何默认 CGLIB?——不强迫业务类实现接口,代理行为一致。

---

## 五、从上一话继续改代码

#88 拆环之后,结算逻辑落在 `CheckoutService`(基线 Spring Boot 4.x / jakarta):

```java
@Service
public class CheckoutService {

    private final JdbcClient db;
    public CheckoutService(JdbcClient db) { this.db = db; }

    public void checkout(long orderId) {
        applyCoupon(orderId);  // 核销优惠券(落库)
        deduct(orderId);       // 扣库存+记流水
    }

    @Transactional
    public void deduct(long orderId) {
        db.sql("UPDATE stock SET qty=qty-1 WHERE name='拿铁'").update();
        int qty = db.sql("SELECT qty FROM stock WHERE name='拿铁'").query(Integer.class).single();
        if (qty < 0) throw new IllegalStateException("库存不足:拿铁 已被扣成 " + qty);
        db.sql("INSERT INTO stock_log(order_id,item) VALUES (?,'拿铁')").param(orderId).update();
    }
}
```

---

## 六、故意制造一个 Bug:自调用绕过代理

`checkout` 里那句 `deduct(orderId)`,展开就是 `this.deduct(orderId)`——**从屋里喊自己,不过替身的门**。压一笔库存不足的订单,期望整体回滚。

---

## 七、观察真实现象

异常照常抛,栈却露了马脚:

```text
java.lang.IllegalStateException: 库存不足:拿铁 已被扣成 -1
    at com.doudou.cafe.CheckoutService.deduct(CheckoutService.java:21)
    at com.doudou.cafe.CheckoutService.checkout(CheckoutService.java:13)
```

`deduct` 直接叠在 `checkout` 上,**没有一帧 `TransactionInterceptor.invoke`**——正常走代理时它一定在栈里。再在 `deduct` 里打印 `TransactionSynchronizationManager.isActualTransactionActive()`——**false**。

没有事务,`UPDATE` 在自动提交下当场落库:库存扣了、流水没记——**半截账**。静默失效最毒:不报错,只错账。

---

## 八、修复,并用测试证明

设计问题设计解:事务方法**拆出去**,调用从门外进来。

```java
@Service
public class StockDeductService {   // 独立成类:调它必过代理
    private final JdbcClient db;
    public StockDeductService(JdbcClient db) { this.db = db; }

    @Transactional
    public void deduct(long orderId) { /* 扣库存+记流水,同上 */ }
}
```

```java
@SpringBootTest
class StockDeductServiceTest {
    @Autowired StockDeductService stock;
    @Autowired JdbcClient db;

    @Test
    void deduct_rolls_back_all_or_nothing() {
        assertThrows(IllegalStateException.class, () -> stock.deduct(9527L)); // 库存不足单
        int qty = db.sql("SELECT qty FROM stock WHERE name='拿铁'").query(Integer.class).single();
        assertEquals(0, qty);   // 一格没少:UPDATE 随事务整体回滚
    }
}
```

> **🔀 豆豆的多解台 · 自调用怎么拿到代理?**

| 解法 | 代码要点 | 适合什么时候 | 坑 |
|---|---|---|---|
| 拆 Service(推荐) | 事务方法独立成类,注入调用 | 几乎所有场景 | 无;顺手改善职责划分 |
| 自注入 | `@Lazy` 注入自身拿代理,调 `self.deduct()` | 不想拆类的小改动 | 绕圈依赖别扭;`this`/`self` 混用易再翻车 |
| AopContext | `(CheckoutService) AopContext.currentProxy()` | 临时救急 | 须开 `exposeProxy=true`;强绑 AOP 内部 API |

豆豆锐评:**默认拆类**——自调用失效本质是一个类干了两层事,架构在报警,别只想着绕过去。

---

## 九、项目检查点 · 豆豆咖啡站 v10.10

```text
咖啡站形态:Spring 地下室全图点亮,最后一张底牌(代理)翻明
已具备  :@Transactional=代理环绕;失效三场景;传播行为三件套;
          自动配置=清单+条件+你优先;MVC 流程走通
还没有  :账本三页全勾——只剩证明自己能考别人
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 事务失效三场景 + 传播行为 | Spring 头号高频,讲得出「为什么」是分水岭 |
| CGLIB 代理(Boot 默认 proxyTargetClass=true) | 「JDK 代理 vs CGLIB」必问,#81 手写 AOP 是底气 |
| 自动配置原理 / MVC 请求流程 | 「Boot 启动了什么」「请求怎么到 Controller」标配题 |

---

## 十一、下一话悬念

账本第三页最后一栏画上勾——**三页,全清了**。次日清晨,咖啡站门口贴出一张纸:「**招聘 · 后端店员**」。豆豆没说话,把面试官的椅子推到了阿零面前。

> 下一话《终章:阿零的面试之夜》:从读不懂报错的那行 Hello,到坐上这把椅子。三位候选人,三条考线——这一次,提问的是阿零。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
