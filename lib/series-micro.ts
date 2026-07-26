/**
 * 《从零开始拆微服务》· 豆豆咖啡站连锁化实录(第四部连载,slug 前缀 micro)。
 *
 * 与 Java 线同宇宙:S7 大结局咖啡站单体 v7 又稳又香,可生意火了 —— 要开三家
 * 分店、上外卖平台、接会员体系,一套单体扛不住"三家店同时点单+外卖洪峰"。
 * 新导师「奥朵」(Octo,戴圆框眼镜、八条腕足各戴不同颜色袖章的章鱼架构师)
 * 登场:章鱼三分之二的神经元长在腕足上,腕足自治、大脑只管协调 —— 微服务的
 * 活体教科书。口头禅:"能不拆就不拆,要拆就拆干净。"豆豆升任总店店长成为
 * 需求方,特米(CLI 线)在注册中心排障与监控室值班两话客串。
 *
 * 长期项目:开连锁 = 拆微服务 —— 单体咖啡站 → 中央厨房(领域服务)+ 门店
 * (实例)+ 传菜系统(消息)+ 总店大门(网关);每卷卷终延续检查点版本链
 * (v8.1 迁移完成 → v8.6 连锁网稳态),与 Java 线 v7 无缝衔接。
 * 本线独有深度栏目:🚨 事故复盘室(深夜告警群聊排版的 Postmortem:现象 →
 * 根因 → 止血 → 长期修复 → 一句血泪教训)—— 这条线教的是"别人流过的血"。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const MICRO_SERIES_META = {
  slug: "micro-academy",
  title: "从零开始拆微服务",
  alias: "阿零与奥朵 · 豆豆咖啡站连锁化实录",
  tagline: "咖啡站要开连锁了。跟着阿零和章鱼架构师奥朵,把单体咖啡站拆成一张会呼吸的服务网——每一话都是一次拆店手术,和一场别人流过血的生产事故。",
  project: "把单体咖啡站拆成连锁微服务网",
  storageKey: "micro-academy:completed",
} as const;

export const MICRO_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "M1",
    title: "升级季",
    subtitle: "单体先站稳",
    goal: "开连锁之前先把总店的地基换成新混凝土:单体 v7 全面升级到 Spring Boot 4 / Framework 7,吃透虚拟线程与新一代 HTTP 客户端。",
    covers: ["Spring Boot 4", "Spring Framework 7", "虚拟线程", "RestClient"],
    episodes: [
      { season: 1, episode: 1, title: "章鱼来信", summary: "奥朵初登场,八条腕足同时试吃八杯咖啡;墙上贴出 Boot 4 / Framework 7 / Java 25 的「食材保质期表」——升级从认清版本地图开始。", chapterType: "comic", projectStage: "认清版本地图", technologies: ["Spring Boot 4", "Spring Framework 7", "Java 25"], jobSkills: ["Spring Boot"], status: "planned" },
      { season: 1, episode: 2, title: "大搬家", summary: "Boot 3→4 迁移大扫除:整箱「全家桶原料」(胖 starter)拆成一格格调料盒(模块化 jar),过期调料(废弃 API)贴红标扔掉。", chapterType: "lab", projectStage: "迁移到 Boot 4", technologies: ["starter 模块化", "properties 迁移", "@MockitoBean"], jobSkills: ["Spring Boot", "工程化"], status: "planned" },
      { season: 1, episode: 3, title: "空杯警告", summary: "JSpecify 空安全给每个杯子印上「可能为空/绝不为空」标签,菜单印上 v1/v2 版本角标(Framework 7 原生 API 版本化),豆豆再没端出过空杯。", chapterType: "comic", projectStage: "空安全 + API 版本化", technologies: ["JSpecify", "API versioning"], jobSkills: ["Spring Framework"], status: "planned" },
      { season: 1, episode: 4, title: "一人一线", summary: "虚拟线程一行开启:高峰期凭空影分身出上千个纸片服务员,每人只服务一桌;隔壁响应式流水线餐厅(WebFlux)退守真正的流式场景。", chapterType: "comic", projectStage: "虚拟线程扛高峰", technologies: ["虚拟线程", "Spring MVC", "WebFlux"], jobSkills: ["并发", "技术选型"], status: "planned" },
      { season: 1, episode: 5, title: "新话务台", summary: "老式摇把电话(RestTemplate)光荣退休进橱窗,RestClient 与 @HttpExchange 声明式话务台上岗——升级季验收,检查点 v8.1。", chapterType: "project", projectStage: "单体 v8.1 · 新地基就绪", technologies: ["RestClient", "@HttpExchange"], jobSkills: ["Spring Boot"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "M2",
    title: "拆店季",
    subtitle: "微服务拆分与网关",
    goal: "在地上画粉笔圈而不是画二十个服务:限界上下文定刀口、Modulith 先分房间、第一刀抽出订单服务,再修总店大门与点名册。",
    covers: ["DDD 拆分", "Spring Modulith", "Spring Cloud Gateway", "Nacos"],
    episodes: [
      { season: 2, episode: 1, title: "拆,还是不拆", summary: "阿零画出 20 个服务的宏伟蓝图被一条腕足卷走:DDD 限界上下文先画三个粉笔圈(点单/制作/会员)——能不拆就不拆,要拆就拆干净。", chapterType: "comic", projectStage: "拆分蓝图定稿", technologies: ["DDD", "限界上下文", "康威定律"], jobSkills: ["微服务", "架构"], status: "planned" },
      { season: 2, episode: 2, title: "先分房间", summary: "Spring Modulith 不砸墙先立屏风:一栋房子隔出三个房间,房门(模块 API)才能过人、严禁翻窗(跨模块直调),模块测试像验房师逐间敲墙。", chapterType: "comic", projectStage: "模块化单体", technologies: ["Spring Modulith"], jobSkills: ["微服务", "架构"], status: "planned" },
      { season: 2, episode: 3, title: "第一刀", summary: "「点单柜台」整体吊装搬进新门面:抽出订单服务、数据先行拆库,双写并行期像新旧柜台同时营业对账,切换瞬间全店屏息。", chapterType: "lab", projectStage: "订单服务独立", technologies: ["服务拆分", "拆库", "双写并行"], jobSkills: ["微服务"], status: "planned" },
      { season: 2, episode: 4, title: "总店大门", summary: "Spring Cloud Gateway 修起唯一大门:迎宾章鱼按暗号分流(Predicate),大衣寄存处统一收伞收包(Filter 做鉴权与日志)。", chapterType: "comic", projectStage: "统一入口网关", technologies: ["Spring Cloud Gateway", "Route", "Predicate", "Filter"], jobSkills: ["微服务", "网关"], status: "planned" },
      { season: 2, episode: 5, title: "点名册", summary: "Nacos 注册中心:分店开业到总部挂牌、心跳每 5 秒摇一次店铃,铃停自动划名,推空保护防一场地震撕光整本名册;特米客串排障。", chapterType: "comic", projectStage: "服务注册发现", technologies: ["Nacos", "健康检查", "推空保护"], jobSkills: ["微服务", "注册中心"], status: "planned" },
      { season: 2, episode: 6, title: "一纸调令", summary: "配置中心公告栏一贴新价目表,百家分店菜单同时翻页;灰度先只给一家店试水,翻车只翻一家——拆店季验收,检查点 v8.2。", chapterType: "project", projectStage: "连锁骨架 v8.2", technologies: ["Nacos Config", "@RefreshScope", "配置灰度"], jobSkills: ["微服务", "配置中心"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "M3",
    title: "账本季",
    subtitle: "ORM 与数据",
    goal: "把账本交给会自己誊写的柜子,也要看穿柜子的幽灵:JPA/Hibernate 7、MyBatis 选型、事务失效与乐观锁,再给账本刻上年轮。",
    covers: ["JPA / Hibernate 7", "MyBatis", "事务", "Flyway / 连接池"],
    episodes: [
      { season: 3, episode: 1, title: "会记账的柜子", summary: "JPA/Hibernate 7 持久化上下文:账本柜里的账页会自己誊写到总账(flush),游离态账页是离家出走的纸——改了也没人誊。", chapterType: "comic", projectStage: "领域账本上线", technologies: ["JPA", "Hibernate 7", "实体状态机"], jobSkills: ["ORM"], status: "planned" },
      { season: 3, episode: 2, title: "幽灵查询", summary: "查 1 张订单账页,身后跟着 100 个小幽灵各自跑一趟仓库(N+1);下单前声明「连配料单一起拿」(fetch join / @EntityGraph)驱鬼。", chapterType: "incident", projectStage: "查询不再带幽灵", technologies: ["懒加载", "N+1", "@EntityGraph"], jobSkills: ["ORM", "性能优化"], status: "planned" },
      { season: 3, episode: 3, title: "两本账法", summary: "店里并存两位会计:JPA 会计按领域规矩自动记账,MyBatis 会计手写每一笔复杂报表 SQL——自动挡跑城市,手动挡跑山路。", chapterType: "comic", projectStage: "双 ORM 分工", technologies: ["MyBatis", "MyBatis-Plus", "动态 SQL"], jobSkills: ["ORM", "技术选型"], status: "planned" },
      { season: 3, episode: 4, title: "抢单风波", summary: "最后一份限定豆被两单同时扣:@Transactional 自调用失效像自己给自己打电话铃不会响,乐观锁 @Version 印章对不上就重打小票。", chapterType: "incident", projectStage: "扣减不再超卖", technologies: ["@Transactional", "@Version", "乐观锁"], jobSkills: ["事务", "并发"], status: "planned" },
      { season: 3, episode: 5, title: "账本的年轮", summary: "Flyway 火漆页码让新店自动长出同款账本,HikariCP 水管不是越多越好,Testcontainers 集装箱厨房真火实测——账本季验收,检查点 v8.3。", chapterType: "project", projectStage: "数据底座 v8.3", technologies: ["Flyway", "HikariCP", "Testcontainers"], jobSkills: ["数据库", "测试"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "M4",
    title: "传菜季",
    subtitle: "消息系统",
    goal: "装上不等人却记得每盘进度的环形传菜带:Kafka 模型与 KRaft、可靠性三件套、RocketMQ 三大规矩,最后用 Outbox 终结双写惊魂。",
    covers: ["Kafka", "RocketMQ", "消息可靠性", "Outbox + CDC"],
    episodes: [
      { season: 4, episode: 1, title: "传菜带", summary: "Kafka 环形传菜带:topic 分成多条并行轨道(partition),后厨小队(consumer group)分轨认领,进度夹记着吃到第几盘(offset)。", chapterType: "comic", projectStage: "异步传菜带装好", technologies: ["Kafka", "topic", "partition", "offset"], jobSkills: ["消息队列"], status: "planned" },
      { season: 4, episode: 2, title: "动物园关门了", summary: "管钥匙的动物园管理员(ZooKeeper)正式退休:Kafka 4.x KRaft-only,传菜带管理员内部选举带班——最好的团队不再需要外聘裁判。", chapterType: "comic", projectStage: "集群自治", technologies: ["Kafka 4", "KRaft"], jobSkills: ["消息队列"], status: "planned" },
      { season: 4, episode: 3, title: "一单都不能丢", summary: "传菜带三重保险:出菜口盖章回执(acks)、每盘贴唯一流水号防重复上桌(幂等)、三次没人接的菜进疑难陈列柜(死信队列)人工会诊。", chapterType: "comic", projectStage: "消息不丢不重", technologies: ["acks", "幂等消费", "死信队列"], jobSkills: ["消息队列", "可靠性"], status: "planned" },
      { season: 4, episode: 4, title: "火锅店的规矩", summary: "隔壁火锅店(RocketMQ)串场:先立字据再动锅铲(事务消息+回查)、沙漏架 30 分钟提醒续锅(延迟消息)、同桌的菜按顺序上(顺序消息)。", chapterType: "comic", projectStage: "多队列见世面", technologies: ["RocketMQ", "事务消息", "延迟消息", "顺序消息"], jobSkills: ["消息队列"], status: "planned" },
      { season: 4, episode: 5, title: "同键同道", summary: "同一桌的菜必须走同一条轨道(同 key 同分区);网红 3 号桌点爆一条轨道(热点 key)要拆桌分流,高峰期先改「一次端十盘」(批量拉取)。", chapterType: "comic", projectStage: "有序又抗热点", technologies: ["分区键", "热点倾斜", "批量消费", "重试 topic"], jobSkills: ["消息队列", "性能优化"], status: "planned" },
      { season: 4, episode: 6, title: "双写惊魂", summary: "改了账本忘了喊传菜,会员积分凭空消失;Outbox 账本边栏同事务一笔落纸,抄写员(Debezium)盯着边栏自动喊单——传菜季验收,检查点 v8.4。", chapterType: "project", projectStage: "事件与账本同生死 v8.4", technologies: ["Outbox", "CDC", "Debezium", "本地消息表"], jobSkills: ["消息队列", "一致性"], status: "planned" },
    ],
  },
  {
    season: 5,
    code: "M5",
    title: "快取季",
    subtitle: "缓存与限流",
    goal: "吧台装保温柜、大门装水闸:Redis 缓存模式与三大灾难、分布式锁与多级缓存,最后学会拒绝一部分客人来保住全店。",
    covers: ["Redis 缓存", "分布式锁", "多级缓存", "限流熔断"],
    episodes: [
      { season: 5, episode: 1, title: "保温柜", summary: "吧台装 Redis 保温柜(Cache-Aside):常点的咖啡预先温着,柜里没有再进后厨现做、顺手放一杯进柜,每杯贴最佳赏味期(TTL)。", chapterType: "comic", projectStage: "热门单品秒出", technologies: ["Redis", "Cache-Aside", "TTL"], jobSkills: ["Redis", "缓存"], status: "planned" },
      { season: 5, episode: 2, title: "三场灾难", summary: "灾难三连:狂点不存在的左旋咖啡(穿透→布隆名册)、招牌款到期千人冲后厨(击穿→互斥重建)、全柜同时过期(雪崩→赏味期打散)。", chapterType: "incident", projectStage: "三大事故免疫", technologies: ["布隆过滤器", "互斥重建", "过期打散"], jobSkills: ["Redis", "缓存"], status: "planned" },
      { season: 5, episode: 3, title: "一把钥匙", summary: "三家分店抢同一本限量配额簿:Redisson 看门狗自动续借;钥匙丢了店员还在往下写(锁过期业务未完)酿成超卖,幂等流水号兜底救场。", chapterType: "incident", projectStage: "跨店抢购不超卖", technologies: ["Redisson", "分布式锁", "看门狗"], jobSkills: ["Redis", "分布式"], status: "planned" },
      { season: 5, episode: 4, title: "玄关与保温柜", summary: "分店小玄关柜(Caffeine L1)+ 总部大保温柜(Redis L2);换配方「先改账本、再清柜子、隔口气再清一遍」(延迟双删);巨无霸家庭装(大 key)卡死取餐口。", chapterType: "comic", projectStage: "多级缓存就位", technologies: ["Caffeine", "多级缓存", "延迟双删", "大 key 治理"], jobSkills: ["Redis", "缓存"], status: "planned" },
      { season: 5, episode: 5, title: "门口的水闸", summary: "大门装水闸:匀速滴水的漏壶 vs 攒币投币的令牌箱;外卖平台故障拉下熔断闸,堂食外卖各用各的服务员编制(舱壁)——快取季验收,检查点 v8.5。", chapterType: "project", projectStage: "洪峰不倒 v8.5", technologies: ["限流算法", "Resilience4j", "Sentinel", "熔断降级"], jobSkills: ["高可用", "限流"], status: "planned" },
    ],
  },
  {
    season: 6,
    code: "M6",
    title: "观星季",
    subtitle: "稳态运营与前沿",
    goal: "监控室点灯、大账拆账,再在深夜迎来 AI 新客人——连锁网进入稳态,也抬头望向 2026 的星空。",
    covers: ["可观测性", "分库分表", "分布式事务", "Spring AI 与前沿"],
    episodes: [
      { season: 6, episode: 1, title: "全店监控室", summary: "监控室三块屏:体温计墙(指标)、每杯咖啡的旅行护照(链路追踪)、值班日志(结构化日志);打烊仪式先摘门帘再熄灯(优雅停机);特米客串值班。", chapterType: "comic", projectStage: "全店可观测", technologies: ["Micrometer", "OpenTelemetry", "Actuator", "优雅停机"], jobSkills: ["可观测性"], status: "planned" },
      { season: 6, episode: 2, title: "大账拆账", summary: "会员账本厚到桌子塌了:按尾号拆成 16 本(ShardingSphere 分片键),雪花印章机统一喷码(分布式 ID),跨店退款走逐步冲正(Saga/Seata)。", chapterType: "comic", projectStage: "大账可拆可查", technologies: ["ShardingSphere", "雪花 ID", "Seata", "Saga"], jobSkills: ["分布式", "数据库"], status: "planned" },
      { season: 6, episode: 3, title: "深夜的新客人", summary: "完结篇群像:AI 品鉴师自然语言查遍全店(Spring AI/MCP),传菜带逐盘签收(share groups),冻干咖啡店秒级复水(CRaC/Leyden),影子服务员编队飞行(结构化并发)——三线角色齐聚,检查点 v8.6。", chapterType: "project", projectStage: "连锁网稳态 v8.6 · 完结", technologies: ["Spring AI", "MCP", "Kafka Queues", "CRaC", "结构化并发"], jobSkills: ["前沿视野", "架构"], status: "planned" },
    ],
  },
];

export function microAllEpisodes(): JavaEpisode[] {
  return MICRO_SEASONS.flatMap((s) => s.episodes);
}

export function microPublishedEpisodes(): JavaEpisode[] {
  return microAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
