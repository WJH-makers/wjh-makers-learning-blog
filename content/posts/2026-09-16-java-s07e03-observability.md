---
title: "《从零开始学 Java》54 · 监控与日志"
date: 2026-09-16
summary: "上线全自动后,阿零却对线上「跑得好不好」两眼一抹黑,只能等顾客投诉。这一话给云端咖啡站装上眼睛:Spring Boot Actuator + Micrometer 暴露指标,Prometheus 主动抓取,Grafana 画成曲线,再用 Loki 把散落各处的容器日志聚合。一次真实事故里,他第一次靠数据而非猜测定位到「是缓存服务在拖后腿」。"
tags: [Java, Java漫画, 可观测性, Prometheus, Grafana, 阿零与豆豆]
---

# 《从零开始学 Java》54 · 监控与日志

> 连载特刊 · 第七季「云端世界」第 3 话 · 基线 Java 25(最新 LTS) · 章节类型:事故报告。
> 承接:上一话流水线让上线全自动了,可线上「跑得好不好」还是靠**顾客投诉**才知道——等于蒙着眼开车。

---

## 一、事故:下单转圈,但没人说得清哪儿慢

周三下午,客服转来零星抱怨:「下单一直转圈。」阿零 SSH 上去,`kubectl logs` 一个 Pod 一个 Pod 地翻,六个微服务 × 每个 3 副本 = 十八份日志,翻了四十分钟,只翻出一句心虚的结论:「大概……有点慢?」

豆豆:「你现在的排障方式,叫『考古』——事后去尸检日志。真正的线上得有**仪表盘**:每个服务此刻的 QPS、延迟、错误率,一眼看到。查故障靠**数据**,不靠**猜**。今天给咖啡站装三样东西:**能报数的指标、能画图的面板、能汇总的日志。**」

本话把咖啡站从「盲开」升级成「有仪表盘」:**Prometheus 抓指标 + Grafana 画曲线 + Loki 聚合日志**。

---

## 二、漫画 · 给咖啡站装上眼睛

> **〔1〕** 阿零趴在十八块屏幕前,每块滚动着一个 Pod 的日志,像十八条瀑布。他两眼发直:「它们都在说话,可我一个都听不清。」

> **〔2〕** 豆豆推来一个叫 **Prometheus** 的采集员,手里拿着小本子,每隔 15 秒挨个敲每个服务的门:「你现在处理了多少请求?最慢一笔多少毫秒?错了几个?」服务乖乖报数,它记进本子。
> 豆豆:「它不等你推送,它**主动来拉(pull)**。你的服务只要摆个摊 `/actuator/prometheus`,它自己来抄表。」

> **〔3〕** 一位叫 **Grafana** 的画师,把 Prometheus 的本子摊开,唰唰几笔画成彩色曲线墙:QPS 一条线、P99 延迟一条线、错误率一条红线。
> 阿零:「原来……『慢』是这个样子的!」他一眼看到某条延迟曲线在下午两点翘成了火箭。

> **〔4〕** 旁边 **Loki** 收纳员,把十八条日志瀑布全收进一个抽屉,贴上服务名和 TraceId 标签，阿零一搜就能按服务、按时间捞出相关的几行。
> 豆豆(叼着豆子叉腰):「指标告诉你『**哪儿**不对』,日志告诉你『**为什么**不对』。两个一起用,才叫会查线上。」

> **〔5〕** 阿零盯着那条翘起来的延迟曲线,顺着它标注的服务名点进去——问题指向了缓存服务。
> 阿零:「四十分钟的活,现在四十秒。」豆豆:「因为你终于**看得见**了。」

---

## 三、本话目标

- 理解**可观测性三支柱**:指标(Metrics)、日志(Logs)、追踪(Traces,下一话);
- 用 Actuator + Micrometer 让 Spring Boot 暴露 `/actuator/prometheus`;
- 让 **Prometheus 主动拉取(pull)** 指标,搞懂 pull 与 push 的区别;
- 用 **Grafana** 把指标画成一眼能看懂的曲线;
- 用 **Loki** 聚合多副本日志,按标签检索;
- 撞一次「指标端点没暴露、Prometheus target 掉线」的坑。

---

## 四、原理图:数据怎么从服务流到你眼睛

```text
  咖啡站各服务(每个都内嵌 Micrometer)
        │  暴露 HTTP 端点 /actuator/prometheus(一堆文本指标)
        ▼
  Prometheus ── 每 15s 主动 pull 抄表 ──▶ 存进时序数据库(TSDB)
        │                                        │ PromQL 查询
        │                                        ▼
        │                                    Grafana 面板(QPS/延迟/错误率曲线)
        │
  各服务的容器日志 stdout ──▶ 采集器(Promtail)──▶ Loki(按标签存)──▶ Grafana 检索

  三支柱:  指标 Metrics = 现在整体健不健康(便宜、可告警)
            日志 Logs    = 某条请求具体发生了什么(详细、贵)
            追踪 Traces  = 一次请求跨了哪些服务(下一话)
```

一个关键设计:**Prometheus 是 pull(拉)模型**——它主动去抄每个服务的表,而不是让服务往它这儿推。好处是:服务不用关心监控在哪、挂没挂;Prometheus 抄不到表,本身就成了一个信号(「这个 target down 了」)。这跟很多人默认的「日志往中心推」的直觉相反,是本话最容易被面试追问的点。

---

## 五、代码:让服务开口报数

第五季就引入了 Actuator,现在给它接上 Micrometer 的 Prometheus 出口。加依赖:

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

`application.yml` 里**显式放行**这个端点(Actuator 默认只开 `health`,别的要手动暴露):

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,prometheus     # 显式暴露 prometheus 端点
  metrics:
    tags:
      application: coffee-order         # 给所有指标打上服务名标签,便于区分
```

启动后访问 `/actuator/prometheus`,能看到一大片纯文本指标——Micrometer 已经**自动**帮你统计了 HTTP 请求量、耗时、JVM 内存、GC:

```text
# HELP http_server_requests_seconds  Duration of HTTP server request handling
# TYPE http_server_requests_seconds summary
http_server_requests_seconds_count{application="coffee-order",method="POST",uri="/api/orders",status="200"} 1428.0
http_server_requests_seconds_sum{application="coffee-order",method="POST",uri="/api/orders",status="200"} 91.4
jvm_memory_used_bytes{application="coffee-order",area="heap"} 2.68435456E8
```

再配 Prometheus,告诉它去哪儿抄表(`prometheus.yml`):

```yaml
scrape_configs:
  - job_name: 'coffee-order'
    metrics_path: '/actuator/prometheus'    # ← 抄表地址,不是默认的 /metrics
    scrape_interval: 15s
    static_configs:
      - targets: ['coffee-order-svc:80']     # 走上一话的 Service,自动负载均衡到各 Pod
```

Grafana 里加 Prometheus 数据源,用一句 **PromQL** 就能画出「下单接口 P99 延迟」:

```text
histogram_quantile(0.99,
  sum(rate(http_server_requests_seconds_bucket{uri="/api/orders"}[5m])) by (le))
```

这条曲线,就是漫画里那根下午两点翘成火箭的线。

---

## 六、故意制造一个 Bug:忘了放行端点

阿零复制配置时,漏掉了 `include: health,prometheus` 那行,只留了默认。服务照常启动、下单照常,但 Grafana 面板**一片空白**。

---

## 七、读懂现象:Prometheus 说这个 target「down」

打开 Prometheus 的 `Status → Targets` 页,`coffee-order` 赫然是红色 `DOWN`:

```text
Endpoint                                   State   Error
http://coffee-order-svc:80/actuator/prometheus   DOWN    server returned HTTP status 404 Not Found
```

`404`——Prometheus 去抄表,发现**这个门根本没开**。因为 Actuator 默认只暴露 `/actuator/health`,`prometheus` 端点没被 `include` 放行,访问它就是 404。指标压根没出门,Grafana 自然无米下锅。

这正是 **pull 模型的好处**:服务出问题(或没配好),Prometheus 抄不到表,`Targets` 页立刻标红——**「监控本身掉线」这件事,监控系统自己就能告诉你**。换成 push 模型,服务不推数据,中心只会看到一片安静,分不清是「真没流量」还是「推送坏了」。补上那行配置,`Targets` 转绿,曲线立刻长出来。

> **豆豆锐评 · 指标定位「哪儿」,日志回答「为什么」**
> 别指望一种数据包打天下。**指标**便宜、可长期存、适合告警和看趋势(「错误率破 1% 就报警」),但它只告诉你「订单服务 P99 涨到 2 秒」;**要知道具体是哪笔请求、卡在哪行代码,得翻日志**。这次事故的正确姿势:先看 Grafana 定位到「缓存服务延迟异常」(指标),再去 Loki 按 `app=coffee-cache` 捞那段时间的日志(日志),发现是一次缓存击穿——第六季讲过的老朋友。**先用指标缩小范围,再用日志钻进细节。**

> **🎯 面试直击**:Prometheus 为什么用 pull 而不是 push?
> **pull(Prometheus 主动抓)** 的好处:① 服务无需知道监控在哪、也不依赖它,解耦;② 抓不到 = target down,监控系统自己就发现了监控盲区;③ 便于按需抓、控制频率、临时手动抓一次调试。**push** 更适合**生命周期短**的场景——比如批处理任务、Serverless 函数,它们可能还没被抓一次就结束了,这时用 Prometheus 的 **Pushgateway** 让任务主动推。追问点:pull 也有短板——被抓方必须网络可达,大规模、跨网络时要配服务发现(K8s 里 Prometheus 用 `kubernetes_sd` 自动发现 Pod)。

---

## 八、验证:用测试钉死「指标端点必须开着」

监控端点被误关是复发率极高的事故。与其靠人记得,不如写个测试**钉死**它——每次 CI 都自动校验端点还在:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class MetricsEndpointTest {
    @Autowired TestRestTemplate rest;

    @Test
    void prometheus_endpoint_must_be_exposed() {
        var resp = rest.getForEntity("/actuator/prometheus", String.class);
        assertEquals(200, resp.getStatusCode().value());               // 端点必须开着(防第六节的坑)
        assertTrue(resp.getBody().contains("http_server_requests_seconds"));  // 且真的在报 HTTP 指标
    }
}
```

这个测试进了上一话的 CI 门禁后,**谁再手滑关掉 prometheus 端点,流水线当场变红**,坏配置根本上不了线。可观测性本身,也需要被守护。

---

## 九、项目检查点 · 咖啡站有了仪表盘

```text
新增能力:每个服务暴露 /actuator/prometheus;Prometheus 15s 抓一次;
         Grafana 看 QPS/延迟/错误率;Loki 聚合十八份日志按标签检索
用到    :第五季 Actuator、第六季缓存击穿知识、上一话 K8s Service 与 CI 门禁
还没有  :仪表盘能看出「订单服务慢」,可一笔下单要穿过网关→订单→库存→缓存→MQ,
         到底卡在这条链的哪一环?指标只到「服务」粒度。下一话上链路追踪
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| Prometheus + Grafana | 可观测性岗核心,JD 高频「熟悉监控体系」 |
| Actuator + Micrometer | Spring Boot 服务上云的标配埋点 |
| PromQL 查询 | 会看板 vs 会建板的分水岭 |
| pull vs push 模型 | Prometheus 面试必问 |
| 日志聚合(Loki/ELK) | 分布式排障基本功 |

---

## 十一、下一话悬念

Grafana 告诉阿零「下单接口 P99 涨到 2 秒」,可一笔下单要依次穿过网关、订单、库存、缓存、MQ 五个服务——**指标只能精确到「哪个服务」,精确不到「这一笔请求在哪一跳卡住」**。他盯着那条 2 秒的曲线,还是不知道那 2 秒花在了哪一环。

> 下一话《链路追踪》:阿零给每一笔请求发一张**通行证 TraceId**,让它穿过每个服务都盖个章。于是一杯咖啡的完整旅程——在网关花了 3 毫秒、在库存查询卡了 1.8 秒——像 X 光片一样摊开在他面前。他将第一次看清:**分布式系统里,一次请求到底走过了哪些路。**

---

## 随堂练习
先独立作答，再展开参考要点核对思路。

### 一、选择题（10 道）

**1.** 可观测性三支柱不包括以下哪一项？
- A) 日志（Logs）　B) 指标（Metrics）　C) 告警（Alerting）　D) 链路追踪（Tracing）

**2.** Prometheus 的底层数据存储类型是？
- A) 关系型数据库　B) 文档型数据库　C) 时序数据库（TSDB）　D) 键值存储

**3.** Micrometer 在 Spring Boot 生态中的角色是？
- A) 一个日志框架　B) 一个 HTTP 客户端　C) 一个指标门面——提供统一 API，对接不同监控后端　D) 一个安全框架

**4.** Grafana 的主要功能是什么？
- A) 采集日志　B) 存储时序数据　C) 发送告警通知　D) 将多种数据源的数据可视化为仪表盘和图表

**5.** ELK 技术栈中，各组件分工正确的是？
- A) Elasticsearch 采集、Logstash 展示、Kibana 存储　B) Logstash/Filebeat 采集+处理、Elasticsearch 存储+搜索、Kibana 可视化　C) Kibana 采集、Elasticsearch 处理、Logstash 展示　D) 三者功能相同，互为备份

**6.** Prometheus 的数据采集模式是？
- A) 服务主动推送（Push）指标到 Prometheus　B) Prometheus 定时从服务端点拉取（Pull）指标　C) 通过消息队列异步传输　D) 通过数据库轮询

**7.** 默认情况下，Spring Boot Actuator 暴露了哪些端点？
- A) 全部端点　B) 仅 `health` 端点　C) 仅 `health` 和 `info` 端点　D) 不暴露任何端点

**8.** Loki 在可观测性体系中的定位是？
- A) 替代 Prometheus 存储指标　B) 存储和检索日志，按标签索引，可与 Grafana 直接对接　C) 分布式链路追踪后端　D) 告警规则引擎

**9.** PromQL 中 `rate(http_requests_total[5m])` 的含义是？
- A) 过去 5 分钟内 HTTP 请求总数　B) 过去 5 分钟内每秒平均请求增长率　C) HTTP 请求占 CPU 的比率　D) 未来 5 分钟预计的请求量

**10.** 以下哪个是 Prometheus 告警规则的典型要素？
- A) 数据库 SQL 查询　B) alert 名称、PromQL 条件表达式、持续时间（`for`）、告警级别标签　C) Java 异常堆栈　D) Docker 镜像名称

> [!答案]
> **1-C**　三支柱是日志（记录离散事件）、指标（聚合数值如 QPS/P99）、链路追踪（一次请求的完整路径）。告警是基于三者的上层能力，不是支柱本身。　举一反三：三支柱关系——指标告诉你「哪儿不对」、日志告诉你「为什么不对」、追踪告诉你「经过了哪」。三者打通才是真正的可观测性。
> 
> **2-C**　Prometheus 使用自研时序数据库（TSDB），专为带时间戳的数值序列优化——高效写入、按时间范围查询、自动压缩过期。不适合存大文本。　举一反三：时序数据库不适合存日志（大文本、高基数），所以 Loki 存日志、Prometheus 存指标，各司其职。
> 
> **3-C**　Micrometer 是 JVM 生态的指标门面（类似 SLF4J 对日志），同一套 API 可通过不同 Registry 导出到 Prometheus、Datadog 等，无需改代码。　举一反三：门面模式价值在于解耦——从 Prometheus 切到 Datadog 只换依赖和配置，业务代码不变。
> 
> **4-D**　Grafana 是可视化前端，通过数据源插件连接 Prometheus、Loki、Elasticsearch 等，把数据画成曲线图、柱状图、热力图等，支持告警规则定义。　举一反三：Dashboard 支持变量（如 `$service` 下拉），一个面板模板复用所有服务。好的 Dashboard 遵循「从左到右、从上到下 = 从宏观到微观」的信息层级。
> 
> **5-B**　ELK = Elasticsearch（存储+全文搜索）+ Logstash（采集+过滤+转换）+ Kibana（可视化+查询）。后扩展为 Elastic Stack，增加 Filebeat 轻量采集器。　举一反三：ELK 和 Loki 核心区别——ELK 对日志全文索引（搜索强但资源开销大），Loki 只索引标签不索引内容（便宜但大范围搜索慢）。
> 
> **6-B**　Prometheus 核心设计是 Pull 模型——按 `scrape_interval`（默认 15s）主动去 target 的 `/metrics` 端点抓取数据，服务不需要知道 Prometheus 在哪。　举一反三：Pull 好处——服务解耦、健康自显（抓不到=target down）、压测不因推送加剧负载。Push 适合短生命周期任务（用 Pushgateway 中转）。
> 
> **7-B**　Spring Boot Actuator 默认通过 Web 仅暴露 `health` 端点（安全考虑）。`prometheus`、`metrics` 等需通过 `management.endpoints.web.exposure.include` 显式放行。　举一反三：生产不要暴露 `env`、`beans`、`threaddump`——会泄露配置（含密码）和运行态信息。通常 `include: health,prometheus` 足够。
> 
> **8-B**　Loki 是 Grafana Labs 推出的日志聚合系统，核心设计是「标签索引 + 内容按需扫描」——只索引标签不索引日志内容，与 Grafana 无缝集成。　举一反三：Loki 使用模式——Grafana 看 QPS 异常→跳转到 Loki 日志拿 TraceId→跳到 Jaeger 看完整调用链。形成「指标→日志→追踪」三级下钻。
> 
> **9-B**　`rate()` 计算 Counter 类型指标在时间窗口内的每秒平均增长率。`rate(http_requests_total[5m])` = 过去 5 分钟平均每秒增加多少请求。　举一反三：`irate()` 只看窗口内最后两个样本点，对突刺更敏感适合告警。日常看板用 `rate()`（平滑），告警用 `irate()`（灵敏）。
> 
> **10-B**　Prometheus 告警规则至少包含：`alert`（名称）、`expr`（PromQL 条件）、`for`（持续时间防抖动）、`labels`（严重级别等）、`annotations`（描述和修复建议）。　举一反三：`for` 值很关键——太短频繁误报（警报疲劳），太长出事迟迟不报。P0/P1 用 1m~3m，P2/P3 用 5m~10m。

### 二、解答题（3 道）

**11.** Prometheus 的 Pull 模型与 Push 模型对比——各自的优缺点和适用场景是什么？

**12.** 在一次线上排障中，指标、日志、追踪三者如何协同？描述一个从 Grafana 面板到最终定位根因的实际工作流。

**13.** 一条有效的告警规则应该具备哪些要素？如何避免「告警疲劳」？

> [!答案]
> **11**　Pull（Prometheus 主动抓）优点：服务无需知道监控在哪完全解耦；抓不到=target down 自身暴露盲区；控制频率在中心端可随时调整；压测不因推送加重服务负载。缺点：被监控方必须网络可达（有防火墙/NAT 麻烦），需配服务发现。Push 优点：适合短生命周期（批处理/Serverless）、网络不可达场景。缺点：需知道推送地址、推送失败可能丢数据、系统沉默时分不清"没流量"还是"推送挂了"。　举一反三：批处理任务可用 Pushgateway（Push 到网关，Prometheus Pull 网关）。OpenTelemetry 的 OTLP 协议本身支持 Push 模式，适合 Span 上报。
> 
> **12**　典型工作流：(1) Grafana 仪表盘看到「下单接口 P99 延迟」曲线翘起（指标定位到服务异常）；(2) 切换到 Loki 面板按 `app=coffee-order` + 异常时间范围过滤，看到大量超时日志且带 TraceId（日志给出「为什么慢」）；(3) 复制 TraceId 跳转到 Jaeger 搜索，发现调用树中「库存查询」Span 耗时 1.8 秒（追踪给出「卡在哪一跳」）；(4) 深入库存服务 Loki 日志找 MySQL 慢查询。三层下钻前提：日志里打进 TraceId + Grafana 支持跨数据源跳转。　举一反三：指标告诉范围（「哪儿」）、日志给证据（「为什么」）、追踪画路径（「经过了哪」）。没有追踪的话从指标到日志需要手工翻多个服务拼调用顺序，效率低一个数量级。
> 
> **13**　好告警要素：(1) 明确告警对象；(2) 基于历史基线的合理阈值；(3) `for` 持续时间过滤瞬时抖动；(4) 清晰严重级别（P0~P3）；(5) 可操作通知内容（标题+排查方向+runbook 链接）；(6) 准确负责人标签。避免告警疲劳：(1) 必须有 `for` 条件；(2) 只对需要人类行动的事件告警——能自动修复的（HPA 扩容、Pod 自愈）不报警；(3) 定期 review 下线不再触发的告警；(4) 设置抑制规则（节点宕机时抑制其下所有 Pod 告警）；(5) 告警必须闭环——每条都应有结论。　举一反三：Google SRE 告警哲学——只对紧急、可操作、新出现的、影响用户的事件告警。不满足四个标准的用 Dashboard 曲线代替。

### 三、代码题（2 道）

**14.** 在 Spring Boot 中用 Micrometer 创建两个自定义指标：(1) Counter 计数订单创建量带 `status` 标签（success/fail）；(2) Timer 记录订单处理耗时。写出对应的 PromQL：(A) 过去 5 分钟每秒成功订单数，(B) 订单处理 P99 延迟。

**15.** 写一份 Prometheus 告警规则 YAML：当订单服务 5xx 错误率超过 1% 持续 3 分钟时触发严重告警（severity: critical），包含告警描述和修复建议。

> [!答案]
> **14 验收**　```java
> @Service
> public class OrderMetricsService {
>     private final Counter successCounter, failCounter;
>     private final Timer orderTimer;
> 
>     public OrderMetricsService(MeterRegistry registry) {
>         this.successCounter = Counter.builder("coffee.orders.created")
>             .tag("status", "success").register(registry);
>         this.failCounter = Counter.builder("coffee.orders.created")
>             .tag("status", "fail").register(registry);
>         this.orderTimer = Timer.builder("coffee.orders.duration")
>             .publishPercentiles(0.5, 0.95, 0.99).register(registry);
>     }
> 
>     public void recordOrder(boolean success, long durationMs) {
>         (success ? successCounter : failCounter).increment();
>         orderTimer.record(durationMs, TimeUnit.MILLISECONDS);
>     }
> }
> ```
> ```text
> // A: 过去 5 分钟每秒成功订单数
> rate(coffee_orders_created_total{status="success"}[5m])
> // B: 订单处理 P99 延迟（秒）
> histogram_quantile(0.99, rate(coffee_orders_duration_seconds_bucket[5m]))
> ```　举一反三：Counter 用 `_total` 后缀是 Prometheus 命名约定；Timer 暴露为 `_seconds_count`、`_seconds_sum` 和 `_seconds_bucket` 三者组合才能算百分位。平均延迟有欺骗性，生产应看 P95/P99。
> 
> **15 验收**　```yaml
> groups:
>   - name: coffee-order-alerts
>     rules:
>       - alert: CoffeeOrderHighErrorRate
>         expr: |
>           (sum(rate(http_server_requests_seconds_count{
>             application="coffee-order", status=~"5.."}[5m]))
>            / sum(rate(http_server_requests_seconds_count{
>             application="coffee-order"}[5m]))) > 0.01
>         for: 3m
>         labels: { severity: critical, service: coffee-order, team: backend }
>         annotations:
>           summary: "订单服务 5xx 错误率超过 1%"
>           runbook: "1. Grafana 确认影响范围 2. Loki 查 5xx 日志和 TraceId 3. 新版本引起则 kubectl rollout undo 4. 检查 DB/Redis/MQ 健康"
> ```　举一反三：告警用 `rate()` 而非直接除是因为 rate 能自动处理 Counter 重置（Pod 重启归零）。加一条反向告警 `CoffeeOrderNoTraffic` 检测零流量——可能是服务挂了但 Prometheus 没发现，或网关把流量断掉了。

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
