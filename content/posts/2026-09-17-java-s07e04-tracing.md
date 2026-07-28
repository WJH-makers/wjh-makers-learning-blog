---
title: "《从零开始学 Java》55 · 链路追踪"
date: 2026-09-17
summary: "监控能看出「订单服务慢」,却精确不到「这一笔请求卡在哪一跳」。这一话给每笔请求发一张通行证 TraceId,让它穿过网关→订单→库存→缓存→MQ 每一环都盖章,用 Micrometer Tracing + OpenTelemetry 接入 SkyWalking/Jaeger,把一杯咖啡的完整旅程画成瀑布图;并撞上「异步线程里 TraceId 丢失、链路断成两截」的经典坑。"
tags: [Java, Java漫画, 链路追踪, OpenTelemetry, SkyWalking, 阿零与豆豆]
---

# 《从零开始学 Java》55 · 链路追踪

> 连载特刊 · 第七季「云端世界」第 4 话 · 基线 Java 25(最新 LTS) · 章节类型:漫画。
> 承接:上一话仪表盘能告诉阿零「下单接口 P99 涨到 2 秒」,可一笔下单要穿过五个服务,**指标只到「服务」粒度,定位不到「哪一跳」**。

---

## 一、需求:那 2 秒,到底花在了哪一跳

Grafana 上「下单 P99 = 2 秒」的红线还挂着。阿零盯着它发愁:一笔下单要依次经过**网关 → 订单 → 库存 → 缓存 → MQ**,五个服务各有各的 Grafana 面板,单看每个都「还行」,合起来就是慢 2 秒。他挨个翻,愣是拼不出这一笔请求的完整路线。

豆豆:「你缺的不是更多面板,是**把这一笔请求串起来**的能力。给每笔请求发一张**通行证——TraceId**,它走到哪个服务,就在通行证上盖一个带时间戳的章。走完一圈,通行证摊开就是一张**行程单**:哪一跳花了多久,一目了然。这套东西叫**分布式链路追踪**。」

本话给咖啡站接上追踪:**一笔请求 = 一个 TraceId,穿过所有服务,画成一张瀑布图。**

---

## 二、漫画 · 一杯咖啡的通行证

> **〔1〕** 一笔下单请求刚进网关,门口的追踪员"啪"地给它别上一枚编号徽章:`TraceId: a1b2c3…`。
> 追踪员:「拿好通行证。你接下来经过的每一站,都要盖章。」

> **〔2〕** 请求带着徽章一路走:网关盖章(3ms)、订单服务盖章(12ms)、库存服务盖章……到库存查询这一站,时钟"滴答滴答"走了整整 1800ms 才盖上章。
> 阿零(盯着章):「库存……你在这儿磨蹭了 1.8 秒?!」

> **〔3〕** 请求走完全程,把通行证交回。SkyWalking 把一路的章按时间排开,拼成一张**瀑布图**:每一段是一个 Span,长短就是耗时,库存那条明晃晃地最长。
> 阿零:「原来 2 秒里,1.8 秒全耗在库存查询!其它四跳加起来才 200 毫秒。」

> **〔4〕** 阿零想偷懒,把库存查询扔进一个新线程异步跑,结果那条 Span 从瀑布图上**消失了**——通行证没跟着进新线程,章盖了个寂寞。
> 豆豆(叼着豆子皱眉):「TraceId 存在**当前线程**的上下文里。你另起一个线程,它可不会自己跟过去——链路当场断成两截。」

> **〔5〕** 补上上下文传播,断掉的那截接了回来,瀑布图重新完整。
> 豆豆:「记住:**TraceId 串起一次请求,SpanId 标出每一跳,parentId 记住谁调了谁。** 三个 ID,就能还原整棵调用树。」

---

## 三、本话目标

- 理解 **Trace / Span / TraceId / SpanId / parentSpanId** 的关系;
- 用 **Micrometer Tracing + OpenTelemetry** 给咖啡站接入追踪;
- 让 TraceId 跨服务(HTTP 头)**自动传播**,画出瀑布图;
- 把 TraceId 打进日志,实现**指标 → 追踪 → 日志**三级下钻;
- 撞一次「异步线程丢失 TraceId、链路断裂」的坑并修好。

---

## 四、原理图:一次请求是一棵调用树

```text
Trace(整棵树,共享一个 TraceId = a1b2c3)
│
├─ Span A  网关 route            [ 0 ─ 3ms ]      spanId=01  parent=—
│   └─ Span B  订单 createOrder  [ 3 ─ 2000ms ]   spanId=02  parent=01
│       ├─ Span C  库存 checkStock [ 20 ─ 1820ms ] spanId=03  parent=02  ← 元凶
│       ├─ Span D  缓存 get       [ 1821 ─ 1824ms ] spanId=04  parent=02
│       └─ Span E  MQ  send       [ 1990 ─ 2000ms ] spanId=05  parent=02

跨服务怎么串起来:
  上游发请求时,把 traceId + 自己的 spanId 塞进 HTTP 头
  (W3C 标准头:traceparent: 00-a1b2c3...-02-01)
  下游收到,读出来 → 自己的 span 认这个 traceId、把 parent 指向上游 spanId
```

三个 ID 各司其职:**TraceId** 认「这是同一笔请求」(全链路唯一);**SpanId** 标「这是哪一跳」;**parentSpanId** 记「谁调用了我」——有了 parent,散落各服务的 Span 才能重新拼成一棵树。跨进程传递靠的是 HTTP 请求头(现在的事实标准是 W3C 的 `traceparent` 头),这就是「上下文传播(context propagation)」。

---

## 五、代码:给咖啡站接上追踪

Spring Boot 用 Micrometer Tracing 门面 + OpenTelemetry 桥接。加依赖:

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-otlp</artifactId>   <!-- 把 span 发给 SkyWalking/Jaeger -->
</dependency>
```

`application.yml`:开发期先全采样,并把 TraceId 打进每行日志:

```yaml
management:
  tracing:
    sampling:
      probability: 1.0            # 采样率 1.0 = 全采;生产通常 0.1,别把追踪系统自己压垮
  otlp:
    tracing:
      endpoint: http://jaeger:4318/v1/traces   # span 上报地址

logging:
  pattern:
    # 把 traceId/spanId 塞进日志前缀 —— 从 Grafana 拿到 traceId,直接去 Loki 搜这行
    level: "%5p [%X{traceId:-},%X{spanId:-}]"
```

**关键:跨服务调用要用「被追踪包裹过」的客户端**,TraceId 才会自动写进请求头。订单服务调库存服务,用 Spring 注入的 `RestClient`(它已被自动埋点):

```java
@Service
public class OrderService {
    private final RestClient stockClient;   // 由 RestClient.Builder 构建,自动带上 traceparent 头
    public OrderService(RestClient.Builder builder) {
        this.stockClient = builder.baseUrl("http://coffee-stock-svc").build();
    }

    public Order create(OrderRequest req) {
        // 这一跳会自动产生一个子 Span,并把 traceId 通过 HTTP 头传给库存服务
        var stock = stockClient.get().uri("/api/stock/{name}", req.name())
                               .retrieve().body(Stock.class);
        // ...业务...
    }
}
```

启动后下一单,打开 Jaeger UI 按 TraceId 一搜,漫画里那张瀑布图就出来了——库存那条 Span 明晃晃 1.8 秒。日志里也能看到 TraceId 串场:

```text
INFO [a1b2c3d4e5f6,02] c.c.order.OrderService : 创建订单 name=拿铁 qty=2
INFO [a1b2c3d4e5f6,03] c.c.stock.StockService : 查询库存 —— 慢查询命中全表扫描
```

---

## 六、故意制造一个 Bug:把库存查询扔进新线程

阿零想让下单更快,把库存查询丢进一个**自己 new 的线程**里异步跑:

```java
public Order create(OrderRequest req) {
    new Thread(() -> {                        // ← 埋雷:裸线程,不带任何上下文
        var stock = stockClient.get().uri("/api/stock/{name}", req.name())
                               .retrieve().body(Stock.class);
        // ...
    }).start();
    // ...
}
```

编译通过,下单也成功。可回 Jaeger 一看,瀑布图上**库存那条 Span 不见了**。

---

## 七、读懂现象:链路断成了两截

Jaeger 里这笔 Trace 只剩网关、订单两条 Span,库存/缓存的调用**凭空消失**;更怪的是,那几个异步请求在库存服务侧**各自生成了一个全新的、孤零零的 TraceId**,和主链对不上号。

根因:**TraceId 存在当前线程的上下文里**(底层是 `ThreadLocal` / Context)。阿零 `new Thread` 起的是一个**干净的裸线程**,主线程的追踪上下文**不会自动跟过去**——子线程里发的 HTTP 请求,头上没有 `traceparent`,库存服务收到一看「没通行证啊」,只好当成一笔全新请求,另发一张 TraceId。链路就此断成两截。

这是异步 + 追踪的头号坑:**上下文是「跟着线程走」的,你换线程,它不跟。** 正确做法是让线程池被追踪框架**包装**过,或显式把上下文捕获后带进新线程。最省心的是用 Spring 托管的、已被追踪感知的执行器,而不是裸 `new Thread`:

```java
private final Executor tracedExecutor;   // 注入被追踪包装过的线程池
public OrderService(RestClient.Builder b,
                    @Qualifier("applicationTaskExecutor") Executor executor) {
    this.stockClient = b.baseUrl("http://coffee-stock-svc").build();
    this.tracedExecutor = executor;
}

public Order create(OrderRequest req) {
    tracedExecutor.execute(() -> {          // 上下文会被自动传播到这个任务
        var stock = stockClient.get().uri("/api/stock/{name}", req.name())
                               .retrieve().body(Stock.class);
    });
}
```

换掉裸线程后,断掉的 Span 重新接回主链,瀑布图恢复完整。

> **豆豆锐评 · 别用裸 new Thread,尤其在有上下文的系统里**
> 追踪上下文、安全上下文(第四季 Spring Security 的登录信息)、MDC 日志上下文——它们**全都绑在线程上**。你一个 `new Thread` 甩出去,这些全断:链路断、日志的 traceId 没了、`SecurityContext` 里的当前用户也丢了(异步里一取就是空)。**记住:生产代码里的异步,一律走被框架管理、会传播上下文的线程池,别自己裸起线程。** 这不只是追踪的事,是分布式系统的通用纪律。

> **🎯 面试直击**:分布式链路追踪的原理是什么?TraceId 怎么跨服务传的?
> 一次请求进入系统时生成一个全局唯一的 **TraceId**;每经过一个服务/方法产生一个 **Span**(带 spanId 和 parentSpanId),记录开始/结束时间。**跨进程靠「上下文传播」**:上游把 traceId+spanId 塞进传输载体(HTTP 用请求头,现在标准是 W3C `traceparent`;MQ 用消息头),下游读出来接着往下传。各服务把 Span 异步上报到追踪后端(Jaeger/SkyWalking),后端按 parentSpanId 拼成调用树。追问点:① **采样**——全采样成本高,生产按比例采(如 1%),但要保证「同一条 trace 要么全采要么全不采」;② **埋点方式**——SkyWalking 用 Java Agent **字节码增强**(无侵入),OpenTelemetry 既支持 Agent 也支持 SDK 手动埋点。

> **🔀 豆豆的多解台 · 追踪怎么埋点?**
>
> | 方案 | 怎么做 | 适合什么时候 | 坑 |
> |---|---|---|---|
> | Java Agent 字节码增强 | 启动加 `-javaagent`,SkyWalking/OTel Agent 自动织入常见框架 | 存量服务多、不想改代码,一键接入 | 只能覆盖 Agent 认识的框架;自定义逻辑追不到 |
> | SDK 手动埋点 | 代码里显式开 Span、打 tag | 想追踪具体业务方法、加业务标签(如订单号) | 侵入代码,埋点散落各处要维护 |
> | 框架自动配置(本话) | Micrometer Tracing + Spring 自动埋 Web/RestClient/MQ | Spring Boot 项目,主流调用开箱即追 | 非标准的调用(裸线程、第三方 SDK)追不到,要手动补 |
>
> 豆豆锐评:Spring Boot 项目**默认走自动配置**(本话方案),覆盖 90% 的标准调用;剩下的关键业务方法用 SDK **手动补几个 Span**、打上订单号做标签。存量非 Spring 老服务想快速接入,才上 Agent。三者常常**混着用**,不是二选一。

---

## 八、验证:测试证明 TraceId 真的跨服务传了

追踪断没断,不能靠肉眼刷 Jaeger。写个测试**钉死「TraceId 会写进出站请求头」**:

```java
@Test
void traceId_should_propagate_via_http_header() {
    // 在一个 Span 里发起对下游的调用,用测试拦截器捕获出站请求头
    Span span = tracer.nextSpan().name("test");
    try (var ws = tracer.withSpan(span.start())) {
        var captured = captureOutgoingRequest(() ->
            stockClient.get().uri("/api/stock/latte").retrieve().toBodilessEntity());
        // 出站请求头里必须带着 W3C traceparent,且包含当前 traceId
        assertThat(captured.getHeaders().getFirst("traceparent"))
            .isNotNull()
            .contains(span.context().traceId());
    } finally {
        span.end();
    }
}
```

绿了,就证明:只要用被追踪包裹的客户端,TraceId 一定会随请求头出门——链路不会在服务边界断掉。这个测试进 CI 后,谁把标准客户端换成裸 HTTP 调用,门禁就会拦下。

---

## 九、项目检查点 · 咖啡站能看清每一跳

```text
新增能力:每笔请求一个 TraceId,跨五个服务自动传播;Jaeger 瀑布图定位到「哪一跳慢」;
         日志带 TraceId,可从指标→追踪→日志三级下钻
用到    :上一话 Micrometer/可观测性、第四季 RestClient、第五季线程/线程池、Spring Security 上下文
还没有  :三支柱(指标/日志/追踪)齐了,平台也稳了 —— 可下周就是双十一大促,
         这套云端咖啡平台真到了几十倍流量,扛得住吗?没人敢拍胸脯。下一话,大结局
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 分布式链路追踪 | 微服务/可观测性岗核心,面试高频「一次请求怎么追」 |
| TraceId 上下文传播 | 区分「会配」和「懂原理」的关键题 |
| OpenTelemetry / SkyWalking | 云原生监控事实标准,JD 常点名 |
| 异步上下文丢失排查 | 真实高级排障能力 |
| 指标→追踪→日志下钻 | 完整可观测性闭环思维 |

---

## 十一、下一话悬念

三支柱齐了,平台看着很稳。可运营部门甩来一张海报:**下周双十一,预估流量是平日的 40 倍。** 阿零第一次感到手心冒汗——新版本敢不敢一把全量上线?流量真上来了,哪个服务会先崩?崩了有没有预案?

> 下一话(全系列大结局)《灰度发布与大促演练》:阿零把新版本先放给 5% 的顾客试水(灰度/金丝雀),用压测把大促流量**提前打一遍**,备好限流、扩容、回滚三套预案,最终交付**云端咖啡平台 v7**。而这一话的结尾,我们会一起回到 S1E1 那行 `Hello`——看看阿零,是怎么从一个连报错都看不懂的新手,走到今天能主导一场大促的。

---

## 随堂练习
先独立作答，再展开参考要点核对思路。

### 一、选择题（10 道）

**1.** 在分布式链路追踪中，一个 Trace 由一个或多个什么组成？
- A) Log　B) Span　C) Metric　D) Event

**2.** TraceId 在分布式追踪中的作用是？
- A) 标识单个服务实例　B) 标识一次跨服务的完整请求链　C) 记录日志级别　D) 标识部署版本

**3.** OpenTelemetry 在可观测性生态中的定位是什么？
- A) 一个日志聚合系统　B) 一个 Java 框架　C) 一个容器编排平台　D) CNCF 的可观测性标准——提供统一 API、SDK 和采集协议，解耦埋点与后端存储

**4.** SkyWalking 的埋点方式主要依靠什么技术？
- A) 开发者手动每行加埋点　B) Java Agent 字节码增强——挂载 `-javaagent` 自动织入常见框架埋点　C) 通过 AOP 注解手动标注　D) 修改 JVM 源码

**5.** TraceId 从一个服务传递到另一个服务，主要依靠什么机制？
- A) 数据库共享表　B) Kubernetes ConfigMap　C) HTTP 请求头（W3C `traceparent`）或消息头携带上下文　D) 服务间通过环境变量传递

**6.** 阿零把库存查询丢进 `new Thread()` 异步执行后，该 Span 从瀑布图上消失——根本原因是什么？
- A) 异步操作比同步快来不及记录　B) TraceId 存储在 ThreadLocal 中，新线程不继承当前线程上下文　C) 新线程日志级别太低　D) Jaeger 不支持异步 Span

**7.** Span 之间的父子关系通过什么字段建立？
- A) Span 的名称　B) Span 的开始时间　C) Span 的标签（Tags）　D) parentSpanId——子 Span 记录父 Span 的 SpanId

**8.** 服务拓扑图（Service Topology）在追踪系统中展示的是什么？
- A) 服务的 CPU 和内存使用　B) 服务器机房物理位置　C) 服务间的调用关系、依赖方向和调用量/延迟等指标　D) Kubernetes 集群节点分布

**9.** 生产环境分布式追踪的采样率通常设为多少？为什么不全量采样？
- A) 100%（全量采样）　B) 1%~10%（按比例采样），降低追踪系统的存储和网络开销　C) 0%（不开追踪以省资源）　D) 50%

**10.** 以下哪个不是链路追踪能提供的价值？
- A) 精确找到一次请求卡在哪个服务、哪个方法　B) 查看调用链中每一跳的耗时　C) 自动修复性能瓶颈　D) 发现不合理的调用链

> [!答案]
> **1-B**　Trace 代表一次完整请求链路（如用户下单），由多个 Span 组成。每个 Span 记录一次操作（HTTP 调用、DB 查询）的开始/结束时间和元数据。　举一反三：Trace 和 Span = 树和节点的关系。根 Span 是入口，叶 Span 是最终操作，中间 Span 是层层调用。
> 
> **2-B**　TraceId 全局唯一，在整个分布式链路中保持不变——网关→订单→库存→缓存→MQ，所有 Span 共享同一 TraceId，散落各服务的 Span 借此拼回完整调用树。　举一反三：TraceId 在入口生成（如网关），后续服务只传递不重新生成。同一业务出现多个 TraceId 说明链路在某个环节断了——常见断点是异步线程、MQ 中间跳。
> 
> **3-D**　OpenTelemetry（OTel）是 CNCF 孵化的开放标准——"一次埋点、导出到哪由配置决定"。定义统一 API/SDK 生成 Trace/Metrics/Logs，OTLP 协议传输，后端 Collector 可路由到 Jaeger、SkyWalking 等。　举一反三：OTel 解决"厂商锁定"——从 Zipkin 切到 Jaeger 只需改 Collector 导出配置。但 OTel 是标准/协议层，实际存储分析靠后端。
> 
> **4-B**　SkyWalking 核心特色是 Java Agent 字节码增强——JVM 加载类时动态修改字节码，给 Spring MVC、HttpClient、JDBC、Redis、MQ 等常见框架自动注入追踪代码，对业务零侵入。　举一反三：Agent 缺点——只能覆盖 Agent 认识的标准框架，自定义 RPC 协议、裸线程中的调用追不到，需用 OTel SDK 手动补 Span。
> 
> **5-C**　跨进程上下文传播靠传输载体携带 TraceId 和 SpanId——HTTP 调用通过请求头（W3C 标准 `traceparent: 00-{traceId}-{spanId}-01`），MQ 消息通过消息属性头。　举一反三：W3C `traceparent` 是跨语言推荐标准头（取代各家私有头如 `X-B3-TraceId`）。格式：`version-traceId-parentSpanId-traceFlags`。
> 
> **6-B**　追踪上下文（TraceId、SpanId）底层存储在 `ThreadLocal` 中，`new Thread()` 创建的是干净裸线程，不会自动继承上下文。子线程发 HTTP 时没带 `traceparent`，下游当成新请求另发一个 TraceId——链路断裂。　举一反三：不仅是追踪——Spring Security 登录信息、MDC 日志上下文也全绑在 ThreadLocal 上。生产异步必须走框架管理的、会传播上下文的线程池。
> 
> **7-D**　每个 Span 除了自己的 spanId，还记录 parentSpanId（父 Span ID）。只有根 Span 的 parentSpanId 为空。追踪后端依此把散落各服务的 Span 重新拼成调用树。　举一反三：跨进程传播——A 调 B 时 A 把自己的 spanId 塞进 HTTP 头，B 收到后把它作为自己 Span 的 parentSpanId。如此递归整棵树就串起来了。
> 
> **8-C**　服务拓扑图通过分析所有 Trace 数据自动绘制出服务间调用关系——谁调了谁、调用量多少、平均延迟多少、错误率如何。是微服务治理核心可视化工具。　举一反三：拓扑图是「意料之外依赖」的发现器——文档里可能没写 A→C，但运行时数据不会撒谎。
> 
> **9-B**　全量追踪在高 QPS 下产生海量数据——一个 QPS 10000 的系统一秒就有 10000 条 Trace。生产采样 1%~10%，且必须保证「同一条 Trace 要么全采要么全不采」。　举一反三：Head-based 采样（入口决定）简单但可能漏慢/错误请求；Tail-based（等 Trace 完整后按延迟/错误决定）更精准但实现复杂。折中：正常请求低采样，错误/慢请求强制采样。
> 
> **10-C**　追踪是观测工具不是修复工具——能精确告诉你"卡在哪、卡了多久"，但不会自动优化代码或 SQL。核心价值：(A) 定位瓶颈、(B) 量化耗时、(D) 发现异常调用模式。　举一反三：追踪最强场景是定位长尾延迟——平均延迟正常但 P99=2s，钻进那 1% 的慢 Trace 看到底是哪一步在拖后腿。

### 二、解答题（3 道）

**11.** 描述一个 TraceId 从网关到数据库的完整跨服务传播过程：在哪生成？如何从一个服务传递到下一个？Span 如何被拼回一棵树？

**12.** OpenTelemetry 如何解决「厂商锁定」问题？它的 Collector 扮演什么角色？

**13.** 异步场景下（如 `@Async`、`CompletableFuture`、MQ 消费），如何保证 TraceId 不丢失？列出至少两种方案。

> [!答案]
> **11**　(1) 生成：请求到达第一个服务（如网关）时检查是否有 `traceparent` 头——没有则生成新 TraceId 和根 Span。(2) 传播：调下游时框架拦截出站 HTTP 调用，把当前 TraceId + spanId 写入出站头 `traceparent: 00-{traceId}-{spanId}-01`。(3) 接收：下游追踪库从入站头读出 traceId（保持不变）和 parentSpanId（上游 spanId），创建自己的 Span（新 spanId，parentSpanId 指向上游），挂在上游 Span 下面。(4) 拼树：各服务异步将 Span 上报后端，后端按 traceId 分组、按 parentSpanId 建树，还原完整调用树和瀑布图。　举一反三：传播不限于 HTTP——gRPC 用 Metadata、MQ 用消息属性头，本质都是把上下文塞进传输载体。任一中间件不传播链路就断在那里。
> 
> **12**　OTel 解决厂商锁定：(1) 统一 API/SDK——业务代码只依赖 OTel 的 `Tracer`、`@WithSpan` 等标准接口，不直接依赖 Jaeger 或 SkyWalking SDK；(2) 统一传输协议 OTLP——Span/Metric 数据以标准格式离开应用；(3) Collector 作为"数据路由器"——接收 OTLP 数据后根据配置转发到多个后端（如同时发给 Jaeger 存档和 Datadog 展示）。切换后端只需改 Collector 的 exporter 配置。　举一反三：Collector 还可做预处理——采样、过滤敏感字段（脱敏手机号）、富化（添加 `env=prod` 标签）、聚合（减少后端写入压力）。
> 
> **13**　方案一：使用托管线程池——Spring 的 `@Async` 配 `TaskExecutor` 时用 `LazyTraceableThreadPoolTaskExecutor`（Micrometer Tracing 提供），自动传播上下文。方案二：手动捕获+传播——`var snapshot = ContextSnapshot.captureAll();` → 异步任务开始时 `try (var scope = snapshot.setThreadLocals()) { ... }` 恢复上下文。方案三：MQ 消费端——生产者发消息时在消息头写入 `traceparent`，消费者收到后读取并恢复。　举一反三：方案一最简单（不改业务代码）但只覆盖 Spring 管理线程池；方案二最灵活但侵入代码；关键是团队要有规范禁止 `new Thread()`——所有线程须由框架管理。

### 三、代码题（2 道）

**14.** 用 OpenTelemetry SDK 写一段代码：在订单创建方法中手动创建 Span，并给 Span 打上 `order.id` 和 `order.amount` 两个自定义标签。

**15.** 写一个集成测试，验证 TraceId 确实通过 HTTP 头跨服务传播了。使用 Spring Boot Test 和 Micrometer Tracing。

> [!答案]
> **14 验收**　```java
> @Service
> public class OrderService {
>     private final Tracer tracer;
>     public OrderService(OpenTelemetry openTelemetry) {
>         this.tracer = openTelemetry.getTracer("coffee-order-service", "1.0.0");
>     }
>     public Order createOrder(OrderRequest req) {
>         Span span = tracer.spanBuilder("OrderService.createOrder")
>             .setSpanKind(SpanKind.INTERNAL).startSpan();
>         try (Scope scope = span.makeCurrent()) {
>             span.setAttribute("order.id", req.orderId());
>             span.setAttribute("order.amount", req.amount());
>             Order order = saveToDatabase(req);
>             span.setStatus(StatusCode.OK);
>             return order;
>         } catch (Exception e) {
>             span.recordException(e);
>             span.setStatus(StatusCode.ERROR, e.getMessage());
>             throw e;
>         } finally { span.end(); }
>     }
> }
> ```　举一反三：`SpanKind` 影响后端展示——`INTERNAL`（内部操作）、`CLIENT`（出站调用）、`SERVER`（入站请求）。手动埋点只用于关键业务方法（方便按订单号搜索 Trace），不要每个方法都埋。
> 
> **15 验收**　```java
> @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
> class TraceIdPropagationTest {
>     @Autowired Tracer tracer;
>     @Autowired TestRestTemplate restTemplate;
> 
>     @Test
>     void traceIdMustExistInCurrentSpan() {
>         Span testSpan = tracer.nextSpan().name("test-trace-propagation");
>         try (var ws = tracer.withSpan(testSpan.start())) {
>             ResponseEntity<String> resp = restTemplate.getForEntity("/api/orders/health", String.class);
>             Span current = tracer.currentSpan();
>             assertThat(current).isNotNull();
>             assertThat(current.context().traceId()).matches("[0-9a-f]{32}"); // 合法TraceId
>             assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
>         } finally { testSpan.end(); }
>     }
> }
> ```　举一反三：测试进 CI 有双重价值——(1) 验证追踪库配置正确；(2) 防止有人把 `RestTemplate` 换成裸 `HttpURLConnection`（不支持传播）导致链路断裂。

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
