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

**Boot 自动配置的真相**:`@SpringBootApplication` 三合一 = `@SpringBootConfiguration` + `@EnableAutoConfiguration` + `@ComponentScan`。其中 `@EnableAutoConfiguration` 读各 jar 里 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 清单(`spring.factories` 的自动配置用途已废),逐条过 `@ConditionalOnClass` / `@ConditionalOnMissingBean`——classpath 有货才配,你配了它就让位,不要的 `exclude` 排除。魔法=**清单+条件+你优先**。

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

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. `@Transactional` 的真身是?
- A) 一个修改字节码的编译器插件
- B) 代理环绕:代理对象在方法调用前后开事务、提交/回滚
- C) 数据库层面的触发器
- D) JDK 内置的事务管理器

2. Spring Boot 中 `@Transactional` 默认在什么异常类型上触发回滚?
- A) 所有异常(包括 Checked Exception)
- B) RuntimeException 和 Error
- C) 只回滚 RuntimeException
- D) 不回滚任何异常

3. 传播行为 `REQUIRED`(默认)的含义是?
- A) 总是新建一个事务
- B) 当前有事务就加入,没有就新建
- C) 必须在已有事务中运行
- D) 挂起当前事务,另开新事务

4. `@SpringBootApplication` 三合一包含哪三个注解?
- A) `@Configuration` + `@ComponentScan` + `@EnableTransactionManagement`
- B) `@SpringBootConfiguration` + `@EnableAutoConfiguration` + `@ComponentScan`
- C) `@SpringBootConfiguration` + `@Component` + `@Transactional`
- D) `@Configuration` + `@Bean` + `@ComponentScan`

5. 以下哪种情况 `@Transactional` **不会**失效?
- A) 在同一个 Service 类中,非事务方法 `this.` 调用带 `@Transactional` 的方法
- B) 方法被 `final` 修饰
- C) 从 Controller 注入 Service,调用 Service 的 public 事务方法
- D) 方法抛出 `IOException`(受检异常),未设置 `rollbackFor`

6. 传播行为 `REQUIRES_NEW` 的典型使用场景是?
- A) 下单和扣库存必须在同一个事务中
- B) 操作日志:主事务回滚了,日志也必须保留(不受主事务回滚影响)
- C) 只读查询
- D) 嵌套保存点

7. `TransactionSynchronizationManager.isActualTransactionActive()` 返回 false 说明?
- A) 事务已提交
- B) 当前线程没有激活的事务——通常是事务代理被绕过(自调用等)
- C) 数据库连接已关闭
- D) 事务管理器未配置

8. 修复「自调用绕过代理」的最佳实践是?
- A) 启用 `exposeProxy=true`,用 `AopContext.currentProxy()` 调用
- B) 通过 `@Lazy` 自注入代理
- C) 将事务方法**拆到独立的 Service 类**中,从外部注入调用——调用必过代理
- D) 去掉 `@Transactional`,手动管理事务

9. 以下关于 Spring Boot 自动配置原理的描述,**正确**的是?
- A) Spring Boot 自动扫描所有类并自动注册 Bean
- B) 读各 jar 中 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 清单,逐条过 `@ConditionalOn*` 条件,用户自定义 Bean 优先
- C) 自动配置等同于 `@ComponentScan`
- D) 所有自动配置一定生效,无法排除

10. DispatcherServlet 在 Spring MVC 中的角色是?
- A) 处理数据库事务
- B) 前端控制器:所有 HTTP 请求的**唯一入口**,将请求分发给对应的 Controller
- C) 配置 Spring Bean
- D) 渲染 JSP 页面

### 解答题(5 道)

**Q1(概念)** `@Transactional` 失效的三大场景分别是什么?请说明各自的原理和排查方法。

**Q2(解释)** 传播行为 REQUIRED / REQUIRES_NEW / NESTED 三者的区别是什么?请用「下单(主事务)+ 记录操作日志(辅助)」的场景举例说明。

**Q3(场景)** 你的 `CheckoutService` 中 `checkout()` 调用 `this.deduct()`,`deduct()` 贴了 `@Transactional`,压测发现异常后没有回滚。请写出栈帧的差异(正常走代理 vs 自调用),并给出修复方案。

**Q4(分析)** 分析 Spring Boot 如何通过 `@ConditionalOnClass` / `@ConditionalOnMissingBean` 做到「classpath 有货才配,你配了它就让位」。请以 `DataSourceAutoConfiguration` 为例说明。

**Q5(设计)** 你需要设计一个「分布式事务」方案:订单服务(MySQL)和库存服务(MySQL)跨库,要求最终一致性。请对比 Seata AT 模式、TCC 模式、本地消息表三种方案,并给出你的推荐。

> [!答案]
> **选择题**
> 1-B。`@Transactional` 本质上是在代理对象的方法调用前后织入 `TransactionInterceptor`:①开事务(`getTransaction`)→②`invoke` 本体→③成功 commit/异常 rollback。★举一反三:把 `@Transactional` 理解为「代理环绕」而非「魔法」,就理解了一切失效场景。
>
> 2-B。默认只对 `RuntimeException` 和 `Error` 回滚。受检异常(如 `IOException`、`SQLException`)默认**不回滚**,需 `@Transactional(rollbackFor = Exception.class)`。★举一反三:这是 Spring 的设计选择——受检异常通常被视为「可恢复」的,回滚由开发者显式声明意图。
>
> 3-B。REQUIRED:当前有事务则加入,无则新建。★举一反三:这是默认值,99% 的场景够用——调用方有事务时共用,没有时自动开。
>
> 4-B。`@SpringBootApplication` = `@SpringBootConfiguration`(`@Configuration` 的 Spring Boot 版本)+`@EnableAutoConfiguration`(自动配置引擎)+`@ComponentScan`(扫描当前包及子包的组件)。★举一反三:你可以把 `@SpringBootApplication` 拆成三个分别写——效果一样,只是没必要。
>
> 5-C。从外部(Controller)注入 Service 并调用 public 方法时,调用到达的是代理对象→代理拦截→开事务→调本体。A:自调用绕过代理;B:final 方法 CGLIB 覆盖不了;D:受检异常需显式 `rollbackFor`。★举一反三:判断事务是否生效的最快方法——看调用路径上有没有 `TransactionInterceptor.invoke` 在栈里。
>
> 6-B。REQUIRES_NEW:挂起当前事务,新开一个独立事务。操作日志的典型场景——即使主业务回滚了,日志事务已经独立提交,不受影响。★举一反三:这是「写操作的最终一致性兜底」的常用手段——至少记录了什么被尝试过。
>
> 7-B。事务代理通过 `TransactionInterceptor` 在调用链上绑定事务同步管理器。如果该静态方法返回 false,说明当前线程没有事务上下文——最可能:调用没经过代理(自调用/直接 new)。★举一反三:把 `isActualTransactionActive()` 打印在可疑方法入口,事务失效秒确诊。
>
> 8-C。拆类是最干净的解法——把事务方法独立为单独的 Service,外部通过注入调用时必然经过代理。A 和 B 是绕过手段,能把失效修好但设计上绕了一圈还裸着。★举一反三:#88 拆环考的是「抽类消除循环」,#89 自调用失效考的还是「拆类解决自调用」——设计的归设计,别用配置硬绕。
>
> 9-B。自动配置不是扫描,是按「清单文件」逐条过条件:`@ConditionalOnClass`(classpath 有相关库才配)、`@ConditionalOnMissingBean`(用户自己配了就不覆盖)。用户 Bean 优先。★举一反三:要排除某个自动配置,用 `@SpringBootApplication(exclude = ...)` 或 `spring.autoconfigure.exclude`。
>
> 10-B。DispatcherServlet 是 Spring MVC 的前端控制器,所有 HTTP 请求统一入口:接收请求→`HandlerMapping` 找匹配的 Controller→`HandlerAdapter` 调方法→`ViewResolver` 渲染。★举一反三:一个 Spring Boot Web 应用可以有多个 Servlet,但 DispatcherServlet 只应有一个(默认 / 映射)。
>
> **解答题**
>
> **Q1** 失效三场景:①**同类自调用 `this.xxx()`**:`this` 是本体引用,不经过代理,`TransactionInterceptor` 不在调用链上→排查:打印 `isActualTransactionActive()` 或检查栈帧中有无 `TransactionInterceptor`。②**非 public 或 final 方法**:CGLIB 代理是生成子类覆盖 public 方法;非 public 不覆盖(部分版本),final 无法覆盖→排查:检查方法修饰符。③**受检异常默认不回滚**:Spring 默认只认 RuntimeException/Error,受检异常如 IOException 抛出不回滚→排查:检查异常类型 + `@Transactional` 的 `rollbackFor` 属性。★举一反三:这三个场景背后是同一个原理——「没有经过代理」或「代理的规则不匹配」。
>
> **Q2** REQUIRED(默认):有事务加入,无则新建。下单+扣库存用此——同一张账单,同成同退。REQUIRES_NEW:挂起外层,新开独立事务。记录操作日志用此——主单回滚了,日志也得留下(证明「曾经尝试过」)。两事务独立提交,互不影响。NESTED:外层里设保存点(SAVEPOINT)。赠品发放失败只需回退到保存点——主单继续;主单崩则全退。★举一反三:三个行为的核心区别是「对已存在事务的态度」:加入/独立/嵌套保存点。
>
> **Q3** 栈帧差异:正常走代理:`checkout(代理)→TransactionInterceptor.invoke→TransactionAspectSupport→本体.checkout→本体.deduct`(deduct 也在代理中→再进 TransactionInterceptor)。自调用:`checkout(代理)→TransactionInterceptor.invoke→本体.checkout→this.deduct(直接本体调用,无代理)`——deduct 上方的 TransactionInterceptor 消失了。修复方案:①(推荐)将 `deduct` 拆到独立的 `StockDeductService` 类中,注入到 `CheckoutService`,外部调用;②自注入:`@Autowired @Lazy private CheckoutService self`,用 `self.deduct()` 而非 `this.deduct()`;③`AopContext.currentProxy()`。★举一反三:所有「代理不生效」的问题本质都一样——调用没从代理对象入口进入。
>
> **Q4** `DataSourceAutoConfiguration` 为例:①清单文件声明了该类会在启动时被加载;②类上有 `@ConditionalOnClass({DataSource.class, EmbeddedDatabaseType.class})`→ 只有在 classpath 有 DataSource 相关类(如 HikariCP 或 DBCP2)时才生效;③类上有 `@ConditionalOnMissingBean(DataSource.class)`→ 如果用户自己定义了 `DataSource` Bean(如手动配置了多数据源),这个自动配置就自动让位。④如果没有自己配,它按配置前缀 `spring.datasource.*` 创建默认的 HikariCP DataSource。★举一反三:条件装配的总原则是「约定优于配置,但配置优于约定」——能满足 80% 的默认场景,又绝不覆盖用户的定制。
>
> **Q5** 三种方案对比:①**Seata AT 模式**:对业务代码零侵入,通过代理 SQL 自动生成 undo log(前镜像/后镜像),第一阶段执行 SQL+记录 undo,第二阶段提交(删 undo)或回滚(按 undo 补偿)。优:接入简单;缺:性能损耗(SQL 被代理+undo 写入),依赖 Seata Server。②**TCC(Try-Confirm-Cancel)**:业务自己实现三个方法——Try(预留资源)、Confirm(确认执行)、Cancel(释放资源)。优:性能好(无 undo 日志);缺:代码侵入大,每个业务都要实现三方法,复杂。③**本地消息表**:订单库事务中同时写「消息表」,定时任务扫描未发送消息,调用库存服务接口;库存服务保证幂等(按消息 ID 去重)。优:无分布式事务框架依赖,阿里/美团常用;缺:最终一致性(有秒级延迟)。推荐:金融/支付类用 TCC(强模型),通用业务用本地消息表(简单可控),如果有 Seata 基础设施用 AT(省代码)。★举一反三:分布式事务没有银弹——CAP 定理决定了你必须选 AP(可用+分区容忍,最终一致)还是 CP(一致+分区容忍,可能牺牲可用)。
>
> ---

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
