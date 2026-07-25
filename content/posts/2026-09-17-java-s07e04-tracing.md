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

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
