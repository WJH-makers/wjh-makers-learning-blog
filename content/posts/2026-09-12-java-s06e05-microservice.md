---
title: "《从零开始学 Java》50 · 服务注册 · 网关 · 限流熔断(微服务基座)"
date: 2026-09-12
summary: "服务越拆越多,却还在硬编码 IP 互调,一台换址整链断;一个下游卡死,上游线程被拖光引发雪崩。这一话搭起微服务三件套:Nacos 做通讯录(注册发现)、Gateway 做统一前台、Sentinel 做保险丝(限流熔断降级),Spring 管家摊开地下机械图。"
tags: [Java, Java漫画, 微服务, SpringCloud, Nacos, Sentinel, 阿零与豆豆]
---

# 《从零开始学 Java》50 · 服务注册 · 网关 · 限流熔断(微服务基座)

> 连载特刊 · 第六季「分布式时代」第 5 话 · 基线 Java 25 · Spring Boot 4.x · Spring Cloud · 项目检查点:异步制作 → 微服务化。
> 承接:上一话拆出下单/制作/菜单多个服务,但它们互相调用还在硬编码 IP,一处慢就拖垮全站。

---

## 一、需求:让一堆服务能互相找到、且不被彼此拖垮

咖啡站现在有下单服务、菜单服务、制作服务好几个进程。阿零的调用代码里写满了 `http://192.168.1.10:8081`。运维一句"那台机器扩容换 IP 了",半条链路当场瘫。更糟的是:菜单服务某次卡了 5 秒,下单服务里等它的线程越堆越多,把 Tomcat 线程池占满,**连不依赖菜单的接口也一起挂了**——这就是**服务雪崩**。

豆豆:「微服务不是把代码拆开就完事,得配三样基础设施:**通讯录**(谁在哪,Nacos)、**统一大门**(所有请求先过网关)、**保险丝**(下游出事及时断,别连累自己,Sentinel)。」

---

## 二、漫画 · 通讯录、前台与保险丝

> **〔1〕** 阿零抱着一本写满 IP 的破本子挨个打电话,打到一半发现号码全变了,急得跳脚。
> 豆豆(叼豆子):「别背电话号码了。让每个服务开张时都去**注册中心**登记'我叫下单服务、我在这个地址';要找谁,查名字就行——这是 **Nacos**,服务的通讯录。」

> **〔2〕** 一堆顾客直接冲进后厨、财务室乱窜。豆豆在门口支起一个**总前台(网关)**:「所有人先到这儿,我按你要办的事(路由)领你去对应窗口,顺便查证件(鉴权)、拦黄牛(限流)。」
> 阿零:「所以外部只认网关一个地址?」豆豆:「对,内部服务藏在后面。」

> **〔3〕** 菜单服务突然卡死,下单服务里等它的线程排成长龙,眼看要把整栋楼拖垮。Timeout 迷雾越聚越浓。
> 豆豆猛地拉下一个**保险丝(熔断器)**:「菜单这条线跳闸!暂时不打它了,直接给个'菜单开小差,请稍后'的兜底(降级),**保住下单主流程**。」

> **〔4〕** 楼稳住了。阿零:「所以熔断是'我主动不调它,先保自己'?」豆豆:「对。**限流**是'进来的人太多我先拦一部分',**熔断**是'下游坏了我先断开',**降级**是'断开后给个兜底'。三件套,缺一不可。」

---

## 三、本话目标

- 用 **Nacos** 做服务注册与发现,告别硬编码 IP;
- 用 **OpenFeign** 声明式地按"服务名"调用别的服务;
- 用 **Spring Cloud Gateway** 做统一入口(路由 + 鉴权 + 限流);
- 用 **Sentinel** 实现**限流 / 熔断 / 降级**,阻断雪崩;
- 分清限流、熔断、降级三者到底在防什么。

---

## 四、原理图:微服务基座三件套

```text
                外部请求
                   │
          ┌────────▼─────────┐
          │  Gateway 网关     │  统一入口:路由 / 鉴权 / 全局限流
          └───┬─────────┬────┘
              │按服务名路由 │
      ┌───────▼──┐  ┌───▼──────┐   都去 Nacos 查地址
      │ 下单服务  │  │ 菜单服务  │        ▲
      └────┬─────┘  └──────────┘        │ 注册/心跳/发现
           │ Feign 调用(按名字,不写IP)   │
           └──────────────┐       ┌─────┴──────┐
                          ▼       │ Nacos 注册中心│← 服务通讯录
                     [ 制作服务 ]   └────────────┘

Sentinel 保险丝挂在每个调用点:QPS 超阈值→限流;下游错误率高→熔断→走 fallback 降级
```

---

## 五、代码:注册、发现、调用、限流

**① 每个服务注册到 Nacos**(依赖铁律:引 `spring-cloud-starter-alibaba-nacos-discovery`):

```yaml
spring:
  application:
    name: order-service        # 注册中心里的"名字",别人按这个找我
  cloud:
    nacos:
      discovery:
        server-addr: localhost:8848
```

**② 用 OpenFeign 按名字调用菜单服务**——注意:写的是**服务名**,不是 IP。Spring 管家会去 Nacos 查地址、做负载均衡:

```java
@FeignClient(name = "menu-service",              // ← 按名字找,而非 http://ip:port
             fallback = MenuFallback.class)       // ← 下游挂了走这个兜底(降级)
public interface MenuClient {
    @GetMapping("/api/menu/{id}")
    Coffee getCoffee(@PathVariable Long id);
}

@Component
class MenuFallback implements MenuClient {         // 熔断后的兜底实现
    public Coffee getCoffee(Long id) {
        return Coffee.placeholder("菜单开小差,请稍后");  // 不抛异常,保住主流程
    }
}
```

> **豆豆旁白 · 地下机械图**(Spring 铁律):`@FeignClient` 不是魔法。启动时 Spring 管家为这个接口生成一个**代理对象**放进容器;你调 `getCoffee`,代理就去 Nacos 拿 `menu-service` 的实例列表、按负载均衡挑一台、发 HTTP、把响应反序列化回来。Nacos 靠**心跳**知道谁还活着,掉线的自动从名单剔除。

**③ Sentinel 给热点接口限流**(超过阈值直接拒绝,保护自己):

```java
@GetMapping("/api/menu/{id}")
@SentinelResource(value = "getMenu", blockHandler = "onBlock")   // 被限流时走 onBlock
public Coffee menu(@PathVariable Long id) { return service.get(id); }

public Coffee onBlock(Long id, BlockException ex) {
    return Coffee.placeholder("人太多了,请稍候再试");   // 限流兜底,不是报 500
}
```

---

## 六、故意制造一个 Bug:没有熔断,一个慢拖垮一片

菜单服务人为卡 6 秒,下单服务的 Feign **没配熔断/超时**,同步等它。高峰并发一上来,下单服务的线程全卡在"等菜单",线程池耗尽。

```java
Coffee c = menuClient.getCoffee(id);   // ← 菜单卡 6 秒,这里就干等 6 秒,线程被占住
```

---

## 七、读懂现象:雪崩是怎么烧起来的

监控与日志:

```text
[menu-service]  响应 RT 从 20ms 飙到 6000ms(下游故障)
[order-service] Tomcat busy threads: 20 → 200(全卡在 menuClient.getCoffee)
[order-service] http-nio-8080-exec-* 线程池耗尽,新请求排队 / 拒绝
                → 连 /api/order 这种不依赖菜单的接口也开始超时  ← 雪崩!
```

**根因:下游一个服务变慢,上游用同步调用死等,线程被占光,故障沿调用链层层放大。** 菜单只是"开小差",却烧穿了整个下单。解法就是给调用点装保险丝:**设超时 + 熔断**——错误率/慢调用超阈值时**快速失败**并走降级,不再傻等。

> **🎯 面试直击**:限流、熔断、降级有什么区别?
> **限流**:入口处主动拦,进来的量超过承载就拒掉一部分,保护**自己**不被冲垮;**熔断**:面向**下游**,它错误率/慢调用高了就**主动断开一段时间**不再调,给它喘息也不拖累自己(半开态再试探恢复);**降级**:限流/熔断触发后**给个兜底**(默认值、缓存、友好提示)而非直接 500。三者常配合:限流拦洪峰、熔断防雪崩、降级保体验。

> **🔀 豆豆的多解台 · 微服务基座组件怎么选?**

| 能力 | 主流选型 | 说明 / 取舍 |
|---|---|---|
| 注册发现 | **Nacos**(推荐) / Eureka / Consul | Nacos 同时管注册 + 配置中心,一套搞定;Eureka 已停更 |
| 熔断限流 | **Sentinel**(推荐) / Resilience4j | Sentinel 带控制台、规则可动态下发;Resilience4j 轻量、纯代码;Hystrix 已停更 |
| 网关 | **Spring Cloud Gateway** / Nginx | Gateway 与 Spring 生态无缝、可编程路由;Nginx 更偏运维层 |

豆豆锐评:国内技术栈 **Nacos + Sentinel + Gateway** 是最省心的默认组合(Spring Cloud Alibaba 一条龙);别再上停更的 Eureka/Hystrix。

---

## 八、修复:配超时 + 熔断,并测试限流生效

给 Feign 配**连接/读超时**,并让 Sentinel 对 `getCoffee` 设**熔断规则**(慢调用比例超阈值即熔断,一段时间内直接走 `fallback`)。修好后再压:菜单卡死时,下单服务**快速降级**返回占位菜单,主流程不再被拖垮,线程池平稳。

用测试证明"限流阈值一过就被拦、走兜底"(而不是把请求硬灌给下游):

```java
@Test
void requests_over_threshold_are_blocked() {
    // 给资源 getMenu 配 QPS=1 的限流规则
    FlowRuleManager.loadRules(List.of(rule("getMenu", 1)));
    Coffee first  = controller.menu(1L);      // 第 1 次:放行,正常返回
    Coffee second = controller.menu(1L);      // 第 2 次:同一窗口超阈值 → 被限流
    assertEquals("美式", first.name());
    assertTrue(second.name().contains("请稍候"));   // 走了 onBlock 兜底,而非打爆下游
}
```

---

## 九、项目检查点 · 豆豆咖啡站(微服务化)

```text
新增:Nacos 注册发现(告别硬编码 IP)· Gateway 统一入口 · Sentinel 限流熔断降级
调用:OpenFeign 按服务名调用 + 负载均衡(Spring 管家生成代理)
防住:服务雪崩(超时 + 熔断 + 降级);洪峰(限流)
形态:下单/菜单/制作 独立服务,注册中心 + 网关 + 保险丝俱全
还差:一堆服务 + Redis + Kafka + MySQL + Nacos,换台机器怎么一键跑起来? —— 收官
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 服务注册与发现(Nacos) | "熟悉 Spring Cloud 微服务",后端进阶必备 |
| 网关路由 / 鉴权 / 限流 | 统一入口设计,面试常问其职责 |
| 限流 / 熔断 / 降级 | 高并发系统"防雪崩"标准三件套 |
| OpenFeign 声明式调用 | 微服务间通信的日常写法 |

---

## 十一、下一话悬念(第六季收官在望)

微服务基座搭齐了,可它也变成了一头怪兽:下单、菜单、制作、Nacos、Redis、Kafka、MySQL……七八个组件,版本、端口、环境各不相同。阿零想在同事电脑上演示,结果"我这明明能跑",对方那儿一堆 `ClassNotFound`、端口冲突、连不上 Redis。

> 下一话(第六季大结局)《Docker 集装箱》:阿零学会把每个服务连同运行时一起装进"集装箱"(镜像),再用一份 `docker-compose.yml` 把全家桶一键拉起——换任何一台机器,一条命令,整个分布式咖啡平台原地复活。**咖啡站 v6 正式交付**。

---

## 随堂练习
先独立作答，再展开参考要点核对思路。

### 一、选择题（10 道）

**1.** Nacos 在微服务架构中的核心角色是什么？
- A) 消息队列　B) 服务注册与发现 + 配置中心　C) API 网关　D) 分布式缓存

**2.** `@FeignClient(name = "menu-service")` 中 `name` 属性的含义是什么？
- A) 被调用服务的 IP 地址　B) 被调用服务在注册中心的名字　C) Feign 接口的 Bean 名称　D) 请求的 URL 路径

**3.** "服务雪崩"是怎么发生的？
- A) 所有服务同时宕机　B) 一个下游服务变慢，上游同步调用死等，线程被占满，故障沿调用链层层放大　C) 数据库被误删　D) 网络交换机故障

**4.** Sentinel 中"限流"和"熔断"的区别是什么？
- A) 限流控制入口流量保护自己，熔断监控下游状态保护自己不被下游拖垮　B) 限流和熔断是同一功能不同叫法　C) 限流只对网关生效，熔断只对服务生效　D) 限流是熔断的特殊情况

**5.** Spring Cloud Gateway 在微服务中的核心职责**不包括**以下哪项？
- A) 统一入口路由　B) 统一鉴权　C) 执行复杂的业务逻辑（如订单计算）　D) 全局限流

**6.** 以下关于"降级"的描述，哪个是正确的？
- A) 降级就是让整个服务下线　B) 降级是在限流或熔断触发后，提供兜底方案（如返回默认值/缓存数据），而非直接 500　C) 降级只能通过删除代码实现　D) 降级只发生在数据库故障时

**7.** 豆豆为什么说"别再上停更的 Eureka/Hystrix"？
- A) Eureka 和 Hystrix 有安全漏洞　B) Eureka 已进入维护模式（停更），Hystrix 已停止开发，Nacos+Sentinel 是推荐替代品　C) 它们是 Python 生态的组件　D) 它们不支持 Docker

**8.** `@FeignClient` 的 `fallback` 属性指定的类有什么作用？
- A) 提高 Feign 调用性能　B) 当远程调用失败时，执行 fallback 类中的降级逻辑　C) 作为默认实现，正常情况也调用它　D) 替换注册中心地址

**9.** 微服务中 `lb://order-service` 的 `lb://` 前缀表示什么？
- A) 使用本地缓存　B) 走负载均衡，从注册中心获取实例列表后选择一个发送请求　C) 低带宽模式　D) 使用 Linux Bridge 网络

**10.** 以下哪项**不是**微服务拆分的原则？
- A) 按业务边界拆（订单、菜单、制作各自独立）　B) 每个服务有自己独立的数据表空间　C) 所有服务必须用同一种编程语言　D) 服务间通过 API 通信，不共享数据库事务

> [!答案]
> **1-B**　Nacos 是"服务的通讯录"——每个服务启动时注册"我是谁、我在哪"，调用方按名字查找，告别硬编码 IP。同时集成配置中心。　举一反三：Nacos 支持 AP 和 CP 模式切换——服务发现用 AP（优先可用），支付等强一致场景用 CP。与 S06E01 的 CAP 定理一脉相承。
> 
> **2-B**　`name` 指定目标服务在 Nacos 注册中心的名字（对应 `spring.application.name`）。Spring 管家据此去 Nacos 拉实例列表，经负载均衡选一台发 HTTP。　举一反三：`@FeignClient` 不是魔法——启动时 Spring 为接口生成代理对象，拦截方法调用→查注册中心→负载均衡→发 HTTP→反序列化返回。
> 
> **3-B**　雪崩全过程：菜单服务 RT 20ms→6000ms→下单服务所有线程卡在 `menuClient.getCoffee`→Tomcat 线程池耗尽→连不依赖菜单的接口也一起超时。　举一反三：雪崩关键特征——一个下游故障拖垮全站。同步调用没有隔离机制，下游感冒上游全跟着发烧。
> 
> **4-A**　限流面向入口——进来请求太多主动拦掉一部分，保护自己不被冲垮。熔断面向下游——下游出错率/慢调用超阈值主动断开一段时间，防被拖垮触发雪崩。　举一反三：降级是限流/熔断触发后的兜底——给默认值/缓存/友好提示而非 500。三者配合：限流拦洪峰、熔断防雪崩、降级保体验。
> 
> **5-C**　Gateway 是"门卫"不是"管家"——职责是路由、鉴权、限流、日志等横切关注点，不承载核心业务逻辑。塞业务逻辑会变性能瓶颈和单点故障。　举一反三：`lb://service-name` 前缀表示走负载均衡——网关从注册中心获取实例列表后 LoadBalancer 选一个转发。
> 
> **6-B**　降级是兜底——限流或熔断触发后不直接 500，而给有意义的默认响应。本话 `MenuFallback` 返回占位 Coffee 对象就是典型降级。　举一反三：降级策略有多种——返回缓存数据、返回默认值、返回静态占位、静默跳过。支付类不能给假数据，展示类可以给"稍后再试"提示。
> 
> **7-B**　Spring Cloud Netflix 的 Eureka 和 Hystrix 均已停更或进入维护模式。Nacos 同时提供注册发现和配置中心，Sentinel 提供限流熔断降级且有可视化控制台、规则可动态下发。　举一反三：技术选型需关注组件活跃状态——停更组件虽能暂时用，但不会有新特性、安全补丁和生态适配，长期维护风险高。
> 
> **8-B**　`fallback` 实现声明式降级——下游不可用/超时/熔断切断时，Feign 不抛异常，调用 fallback 同名方法返回兜底数据，不拖垮上游主流程。　举一反三：`fallbackFactory` 可拿到具体异常信息（超时/熔断/不可用），做更精细的降级处理。
> 
> **9-B**　`lb://` 是 Spring Cloud Gateway 和 OpenFeign 中"走负载均衡"的协议前缀。不需写 `http://ip:port`，写 `lb://order-service` 即可——注册中心告知实例列表，LoadBalancer 按策略选一个转发。　举一反三：注册中心+负载均衡+声明式调用，让服务之间彻底解耦地址——这就是"微服务基座"的精髓。
> 
> **10-C**　微服务核心理念是"各服务自治"——可用不同语言、不同数据库、独立部署。强制同一种语言违背了微服务"技术异构"优势。A（按业务边界拆）、B（数据独立）、D（API 通信）是正确原则。　举一反三：拆分过细会导致"分布式单体"——服务虽拆开但耦合太紧，一个需求改 N 个服务，调试和排障反而更慢。粒度要匹配团队规模（康威定律）。

### 二、解答题（3 道）

**1.** 用自己的话解释"限流"、"熔断"、"降级"三者分别防什么，以及它们之间的配合关系。

**2.** 描述"服务雪崩"的完整形成过程，以及如何用超时 + 熔断机制来阻断雪崩。

**3.** API 网关（Gateway）在微服务中的三大核心价值是什么？为什么说"网关只是门卫，不是管家"？

> [!答案]
> **1**　① 限流：面向入口，保护自己——请求超承载能力时主动拒绝部分请求。② 熔断：面向下游，保护自己——下游错误率/慢调用超阈值时主动切断调用一段时间，防被拖垮（防雪崩），半开态试探下游恢复。③ 降级：兜底方案——限流或熔断触发后不直接 500，给有意义的默认响应。配合关系：限流拦洪峰→熔断防雪崩→降级保体验，三者常组合使用。　举一反三：本话豆豆漫画用"前台（限流）"、"保险丝（熔断）"、"兜底提示（降级）"三个比喻，面试中用这三个比喻解释最容易被记住。
> 
> **2**　雪崩形成过程：① 下游服务（菜单）变慢 RT 20ms→6000ms；② 上游（下单）同步调用死等，每个线程被卡住数秒；③ 高并发下上游线程池很快耗尽（Tomcat threads 20→200）；④ 连不依赖故障服务的接口也开始超时——故障沿调用链层层扩散。阻断方法：① 设超时——不给下游无限等待时间；② 熔断——下游错误率/慢调用超阈值时熔断器打开，后续请求直接走降级不调下游；③ 半开态定期试探下游是否恢复→恢复则关闭熔断。　举一反三：超时时间不是越短越好——太短正常慢请求也会误判超时导致熔断误触发。通常设为 P99 的 1.5~2 倍。
> 
> **3**　三大核心价值：① 统一鉴权——在网关层验证身份，不用每个微服务重复写认证逻辑；② 路由转发——根据 URL 路径转发到对应微服务，隐藏内部服务拓扑；③ 横切关注点统一处理——限流、日志、跨域、协议转换等都在网关一层搞定。为什么是"门卫"：网关职责是"检查、分发、保护"，不应承载业务逻辑。塞复杂计算、数据聚合、流程编排会导致网关变性能瓶颈和单点故障——网关崩了全站不可用。　举一反三：网关本身也需高可用——生产多实例+负载均衡。BFF（Backend for Frontend）是网关进阶用法，按前端类型定制不同网关层。

### 三、代码题（2 道）

**1.** 通过 OpenFeign 声明一个远程调用接口 `MenuClient`，调用 `menu-service` 的 `/api/menu/{id}` 接口获取咖啡信息，并配置 fallback 降级类。

**2.** 写一个 Spring Cloud Gateway 的全局过滤器 `AuthFilter`，校验每个请求是否携带 `Authorization` 请求头，没有则返回 HTTP 401。

> [!答案]
> **1 验收**　```java
> @FeignClient(name = "menu-service", path = "/api",
>              fallback = MenuClientFallback.class)
> public interface MenuClient {
>     @GetMapping("/menu/{id}")
>     Coffee getCoffee(@PathVariable("id") Long id);
> }
> 
> @Component
> public class MenuClientFallback implements MenuClient {
>     public Coffee getCoffee(Long id) {
>         return Coffee.placeholder("菜单开小差，请稍后"); // 降级不抛异常
>     }
> }
> ```　举一反三：`name` 对应目标服务的 `spring.application.name`；需要异常信息时用 `fallbackFactory` 替代 `fallback`，可区分超时/熔断/不可用。
> 
> **2 验收**　```java
> @Component
> public class AuthFilter implements GlobalFilter, Ordered {
>     public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
>         String path = exchange.getRequest().getURI().getPath();
>         if (path.startsWith("/api/auth/")) return chain.filter(exchange); // 放行登录
>         List<String> auth = exchange.getRequest().getHeaders().get("Authorization");
>         if (auth == null || auth.isEmpty()) {
>             exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
>             return exchange.getResponse().setComplete(); // 401，不继续转发
>         }
>         return chain.filter(exchange); // 有 token，放行
>     }
>     public int getOrder() { return -1; } // 鉴权靠前执行
> }
> ```　举一反三：`ServerWebExchange` 是 Gateway 的请求上下文（基于 WebFlux 非阻塞）。生产级网关鉴权通常不直接校验 header 本身，而是解析 JWT 或调用认证服务验证 token 有效性。

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
