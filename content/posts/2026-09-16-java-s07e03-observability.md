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

> **〔4〕** 旁边 **Loki** 收纳员,把十八条日志瀑布全收进一个抽屉,贴上服务名和 TraceId 标签,阿零一搜就能按服务、按时间捞出相关的几行。
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

## 🎯 随堂练习

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. 可观测性三支柱是?
   - A) CPU、内存、磁盘　B) **指标(Metrics)、日志(Logs)、追踪(Traces)**　C) 监控、告警、大盘　D) 采集、存储、展示
2. 三支柱各自回答什么问题?
   - A) 都回答同一个问题　B) **指标 = 现在整体健不健康;日志 = 某条请求具体发生了什么;追踪 = 一次请求跨了哪些服务**　C) 指标最详细　D) 日志最便宜
3. Prometheus 采用的是哪种数据获取模型?
   - A) push(服务主动推)　B) **pull(Prometheus 主动去抓)**　C) 双向同步　D) 事件订阅
4. pull 模型的关键好处是?
   - A) 数据更实时　B) 服务无需知道监控在哪;**抓不到 = target down,监控盲区本身能被发现**　C) 存储更省　D) 配置更少
5. 什么场景更适合 push(用 Pushgateway)?
   - A) 长期运行的 Web 服务　B) **生命周期短的批处理任务 / Serverless 函数** —— 可能还没被抓一次就结束了　C) 数据库　D) 所有场景
6. Actuator 默认只暴露 `health`,要开 prometheus 端点必须?
   - A) 升级版本　B) 在 `management.endpoints.web.exposure.include` 里显式放行　C) 加注解　D) 关闭安全配置
7. Prometheus Targets 页显示 `DOWN` + `404 Not Found`,说明?
   - A) 服务挂了　B) 服务活着,但指标端点没开(门没开),Prometheus 抄不到表　C) 网络不通　D) 认证失败
8. `histogram_quantile(0.99, sum(rate(http_server_requests_seconds_bucket[5m])) by (le))` 算的是?
   - A) 平均延迟　B) P99 延迟　C) QPS　D) 错误率
9. 定位线上问题的正确顺序是?
   - A) 先翻日志,再看指标　B) **先用指标缩小范围(哪个服务异常),再用日志钻进细节(具体哪笔、哪行)**　C) 只看指标　D) 只看日志
10. 给「指标端点必须开着」写一个测试并放进 CI,目的是?
    - A) 提高覆盖率　B) 谁再手滑关掉端点,流水线当场变红 —— **可观测性本身也需要被守护**　C) 检测性能　D) 生成文档

> [!答案]
> **1-B**　指标、日志、追踪。**举一反三**:三者互补而非替代,缺任何一支,排障都会在某一步卡住。
> **2-B**　各自的粒度和成本不同。**举一反三**:指标便宜可长期存、适合告警;日志详细但贵;追踪回答「跨服务」的问题。
> **3-B**　Prometheus 主动抄表。**举一反三**:这跟很多人「数据往中心推」的直觉相反,是面试最爱追问的点。
> **4-B**　监控系统能发现自己的盲区。**举一反三**:push 模型下,服务不推数据时中心只看到一片安静 —— 分不清「真没流量」还是「推送坏了」。
> **5-B**　短命任务抓不着。**举一反三**:所以 Pushgateway 是 pull 模型的补充而非替代,别拿它当通用方案。
> **6-B**　默认最小暴露面是安全设计。**举一反三**:同理生产环境不该把所有 Actuator 端点都开出去,`env`、`heapdump` 这类尤其危险。
> **7-B**　门根本没开。**举一反三**:404 和连接超时要分清 —— 前者是服务活着但路径不对,后者才是服务或网络的问题。
> **8-B**　这是 PromQL 求分位数的标准写法。**举一反三**:注意必须 `by (le)`,因为 histogram 的桶边界在 `le` 标签上。
> **9-B**　先缩小范围再钻细节。**举一反三**:本话事故就是这么破的 —— 指标指向缓存服务,日志里发现是第六季学过的缓存击穿。
> **10-B**　监控自己也会坏。**举一反三**:凡是「靠人记得」的约束,都该变成一条能自动跑的断言。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*