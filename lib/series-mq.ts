/**
 * 《从零开始扛消息》· 消息驿站(slug 前缀 mq)。
 *
 * 咖啡站宇宙同线:分布式线只把「装上传送带」讲成了概念,这一部把消息中间件
 * 从「会发会收」一路推到「敢用在钱上」。舞台是豆豆咖啡站后巷新盖的**消息驿站**,
 * 新导师信鸽「咕哥」(Gu)入住:脚环上挂着一叠厚得垂到地上的回执单,再急的
 * 信也先盖收件章再上路(先落盘、后确认的具象化);能同时记住一万封信的先后
 * 顺序,但只保证「同一条巷子里的信不串序」(分区内有序);嘴上永远挂着那句
 * 让阿零听了心凉的实话——「我只保证送到,不保证只送一次」(至少一次是底线,
 * 恰好一次得拿幂等去换)。口头禅「**先收下,再慢慢送。**」,副口头禅
 * 「重复不可怕,可怕的是你没准备好被重复。」性格是急件也不慌的慢性子,
 * 最烦「没盖章就飞走」的莽撞,和「以为中间件能替你把业务擦干净」的幻想。
 *
 * 联动钩子:豆豆化身午高峰流量发生器,专职把驿站门口的队排到街对面;特米
 * (CLI 线)从驿站后窗递一句命令(消费组 lag 怎么看、日志段文件怎么翻);
 * 分布式线的帕克索在事务消息与积压治理两话隔空出场,「过半,即真理。」与
 * 「先收下,再慢慢送。」当场抬杠。反向出口:分布式线 R4、微服务线 M4 的传送带
 * 话次凡是「点到为止」的地方,脚注指向本线对应话深挖。
 *
 * 本线独有深度栏目:📮 投递回执台(每话末尾钉死这一步的投递语义——至多一次 /
 * 至少一次 / 恰好一次,以及它成立的前提和它先崩在哪)+ 🧯 重放演练(亲手把
 * 消息重投一遍、把消费者杀在半路,没被重复打过脸的方案不算学会)。
 * 长期项目:咖啡站订单全面异步化——削峰、解耦、不丢单。
 * 基线 Java 25 LTS / Spring Boot 4.x / jakarta。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const MQ_SERIES_META = {
  slug: "mq-academy",
  title: "从零开始扛消息",
  alias: "阿零与咕哥 · 消息驿站",
  tagline: "分布式线只讲了概念,这一部把消息中间件从「会发会收」讲到「敢用在钱上」——先收下,再慢慢送。",
  project: "把豆豆咖啡站的订单链路全面异步化",
  storageKey: "mq-academy:completed",
} as const;

export const MQ_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "Q1",
    title: "为什么要排队",
    subtitle: "同步调用的死结",
    goal: "先讲清没有队列会怎样:同步链路的三个死结、解耦削峰异步三种动机、两种消息模型与四家中间件的边界,最后用一张本地消息表跑通最小可用的可靠投递。",
    covers: ["同步的代价", "消息模型", "MQ 选型", "本地消息表"],
    episodes: [
      { season: 1, episode: 1, title: "窗台来了只鸽子", summary: "同步调用的三个死结:耗时叠加、故障连坐、峰值同生共死;阿零被三家下游串成一串蚂蚱时,窗台落下一只脚环挂满回执单的信鸽。", chapterType: "comic", projectStage: "看清同步链路的三个死结", technologies: ["同步调用", "超时", "级联故障"], jobSkills: ["系统设计"], status: "planned" },
      { season: 1, episode: 2, title: "先收下,再慢慢送", summary: "解耦、削峰、异步三种动机:咕哥当场演示——收件章一盖顾客就走人,后厨按自己的节奏慢慢送,门口那条长龙被熨成一条平直的线。", chapterType: "comic", projectStage: "说得出为什么要排队", technologies: ["解耦", "削峰填谷", "异步"], jobSkills: ["系统设计", "消息队列"], status: "planned" },
      { season: 1, episode: 3, title: "消失的 37 号单", summary: "第一次把队列塞进下单链路就翻车:信发出去了、单子却没做——异步化换来的不是清净,而是延迟可见、顺序错乱、悄悄丢单三张新账单。", chapterType: "incident", projectStage: "认识异步带来的三类新问题", technologies: ["异步", "最终一致性", "消息丢失"], jobSkills: ["排障", "消息队列"], status: "planned" },
      { season: 1, episode: 4, title: "一封信与一张告示", summary: "点对点队列 vs 发布订阅:一封信只许一个人拆(竞争消费),一张告示整栋楼都能看(广播);同一笔订单凭什么要走两种投递方式。", chapterType: "comic", projectStage: "订单事件区分单投与广播", technologies: ["队列模型", "发布订阅", "消费组"], jobSkills: ["消息队列"], status: "planned" },
      { season: 1, episode: 5, title: "四只鸽子的比武", summary: "Kafka/RocketMQ/RabbitMQ/Pulsar 四家摆开擂台:吞吐、延迟、事务、运维拉成决策表,咕哥只给默认推荐和失效边界。", chapterType: "reference", projectStage: "按场景选定自家的队列", technologies: ["Kafka", "RocketMQ", "RabbitMQ", "Pulsar"], jobSkills: ["消息队列", "架构选型"], status: "planned" },
      { season: 1, episode: 6, title: "账本边上的信箱", summary: "先别急着上中间件:一张本地消息表加一个定时投递器,同一个事务里落账又落信,亲手做出最小可用的可靠投递,再看清它的天花板在哪。", chapterType: "lab", projectStage: "本地消息表跑通可靠投递", technologies: ["本地消息表", "事务", "定时投递", "Spring Boot 4"], jobSkills: ["可靠投递", "方案设计"], status: "planned" },
      { season: 1, episode: 7, title: "下单与制作分家", summary: "卷终:下单链路只管收单盖章,制作链路自己按节奏取件;交出改造前后的高峰耗时对照,以及一份「哪些步骤永远不许异步」的名单。", chapterType: "project", projectStage: "下单与制作解耦 · mq-v1 异步第一步", technologies: ["异步化", "消息投递", "综合"], jobSkills: ["消息队列", "系统设计"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "Q2",
    title: "Kafka 内核",
    subtitle: "拆开传送带底板",
    goal: "把 Kafka 从「会用」拆到「敢改参数」:append-only 日志、分区与副本、生产与消费的每一个旋钮,都要能说出它在磁盘上和网络上究竟做了什么。",
    covers: ["append-only 日志", "分区与副本", "生产与消费参数", "存储与零拷贝"],
    episodes: [
      { season: 2, episode: 1, title: "只许往后写的账本", summary: "append-only 日志是 Kafka 的第一性原理:不许改、不许插,只许在末尾续写;一支笔一直往下划,凭什么比东翻西找快出一个数量级。", chapterType: "comic", projectStage: "看懂日志即一切", technologies: ["append-only", "commit log", "顺序写"], jobSkills: ["Kafka"], status: "planned" },
      { season: 2, episode: 2, title: "几条巷子几只鸽", summary: "分区(partition)决定并行度上限:巷子数是天花板,同 key 同巷才保序;人加得比巷子多,新来的只能站在门口干瞪眼。", chapterType: "comic", projectStage: "订单主题定下分区键", technologies: ["partition", "分区键", "并行度"], jobSkills: ["Kafka"], status: "planned" },
      { season: 2, episode: 3, title: "三份誊抄本", summary: "副本与 ISR:leader 写一份、follower 誊两份,跟不上的当场出局;几份算数,min.insync.replicas 说了算。", chapterType: "comic", projectStage: "订单主题定下副本策略", technologies: ["replica", "ISR", "min.insync.replicas"], jobSkills: ["Kafka", "高可用"], status: "planned" },
      { season: 2, episode: 4, title: "几声回答才算送到", summary: "acks 的 0/1/all 是三种投递胆量;linger.ms 与 batch.size 把散信攒成一沓再飞,吞吐与延迟在柜台上当面成交。", chapterType: "comic", projectStage: "生产端参数定稿", technologies: ["acks", "linger.ms", "batch.size", "压缩"], jobSkills: ["Kafka", "性能调优"], status: "planned" },
      { season: 2, episode: 5, title: "一人请假,全组罚站", summary: "一台消费者假死引发再平衡风暴,整组停摆两分钟:心跳、会话超时与分区分配策略轮番受审,顺带讲清「优雅退出」为什么值得多写十行。", chapterType: "incident", projectStage: "消费组稳住不再罚站", technologies: ["consumer group", "rebalance", "心跳", "分区分配"], jobSkills: ["Kafka", "排障"], status: "planned" },
      { season: 2, episode: 6, title: "章盖在哪一步", summary: "先提交后处理是至多一次,先处理后提交是至少一次,自动提交两头不靠;三种位移提交时机排成决策表,附默认推荐与它成立的前提。", chapterType: "reference", projectStage: "位移提交时机定案", technologies: ["offset commit", "自动提交", "手动提交"], jobSkills: ["Kafka", "投递语义"], status: "planned" },
      { season: 2, episode: 7, title: "掀开传送带底板", summary: "亲手翻开日志段与稀疏索引文件,看一条消息在磁盘上的真实排布;再顺着零拷贝走一遍,数清从磁盘到网卡到底少搬了几次家。", chapterType: "lab", projectStage: "能自己翻日志段定位一条消息", technologies: ["日志段", "稀疏索引", "零拷贝", "页缓存"], jobSkills: ["Kafka", "存储原理"], status: "planned" },
      { season: 2, episode: 8, title: "订单主题上线", summary: "卷终:咖啡站订单主题正式上线——分区数、副本数、保留策略、生产消费参数逐项定稿归档,配一份可自己复跑的压测数据当验收凭证。", chapterType: "project", projectStage: "订单主题上线 · mq-v2 Kafka 落地", technologies: ["topic 设计", "Kafka 4.x", "压测", "综合"], jobSkills: ["Kafka", "容量规划"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "Q3",
    title: "敢用在钱上",
    subtitle: "不丢不重可对账",
    goal: "把消息从「会发会收」推到「敢用在钱上」:不丢、不重、该有序时有序、失败有归宿、积压能追平、每天能对账,每一条都要有演练证据。",
    covers: ["丢失与幂等", "顺序与事务", "死信与积压", "可观测与对账"],
    episodes: [
      { season: 3, episode: 1, title: "信在哪一步丢的", summary: "发送端、Broker、消费端三个断点逐个验尸:没等回执就转身、页缓存还没落盘、位移提前盖了章——丢单从来不是玄学,是三选一。", chapterType: "comic", projectStage: "三个断点逐个堵死", technologies: ["消息丢失", "刷盘", "acks", "位移提交"], jobSkills: ["消息队列", "可靠性"], status: "planned" },
      { season: 3, episode: 2, title: "同一封信来了三次", summary: "至少一次注定会重复:唯一业务键、去重表、状态机流转、乐观锁版本号四道闸门依次拦截,把「重复」从事故降级成噪音。", chapterType: "comic", projectStage: "消费端全面幂等", technologies: ["幂等", "去重表", "唯一业务键", "状态机"], jobSkills: ["幂等设计"], status: "planned" },
      { season: 3, episode: 3, title: "先付款还是先出杯", summary: "顺序不是免费的:全局有序只剩一条巷子,分区有序要押上分区键,消费端并发一开顺序当场散架——它拿吞吐来换,你得算清值不值。", chapterType: "comic", projectStage: "只给该有序的链路上锁", technologies: ["顺序消息", "分区键", "单分区", "并发消费"], jobSkills: ["消息队列", "架构权衡"], status: "planned" },
      { season: 3, episode: 4, title: "先押半张欠条", summary: "动手落地两条路:半消息加回查的事务消息,与账本边栏同事务落信的 Outbox;各跑一次断电演练,看清哪条路在什么场景下真扛得住。", chapterType: "lab", projectStage: "改库与发信不再双写", technologies: ["事务消息", "回查", "Outbox", "本地事务表"], jobSkills: ["分布式事务", "消息队列"], status: "planned" },
      { season: 3, episode: 5, title: "无人认领的信", summary: "重试几次、退避多久、什么错该重试、什么错该直接进死信——一张策略表钉死边界,再给死信箱配一套人工开箱复活的流程。", chapterType: "reference", projectStage: "失败消息有了归宿", technologies: ["重试", "指数退避", "死信队列", "重试 topic"], jobSkills: ["消息队列", "可靠性"], status: "planned" },
      { season: 3, episode: 6, title: "堆到天花板的信", summary: "大促当晚积压八十万条,越重试越堵:先分清慢在拉取还是慢在处理,再谈扩分区、提并发、开临时旁路,顺手算清追平还要几分钟。", chapterType: "incident", projectStage: "积压能定位也能追平", technologies: ["consumer lag", "积压", "并发消费", "扩分区"], jobSkills: ["排障", "容量治理"], status: "planned" },
      { season: 3, episode: 7, title: "每天早上的对账单", summary: "投递成功不等于业务成功:端到端埋点把一封信的全程串成一条链路,再加一张按日对账表——发了多少、成了多少、差在哪,让数据自己开口。", chapterType: "comic", projectStage: "消息链路可观测可对账", technologies: ["lag 监控", "链路追踪", "对账", "告警"], jobSkills: ["可观测性", "消息队列"], status: "planned" },
      { season: 3, episode: 8, title: "钱上的零丢单", summary: "卷终:支付链路全线兑现——发送有回执、消费有幂等、失败有死信、每日有对账;一次拔电演练后交出零丢单与零重复扣款的证据。", chapterType: "project", projectStage: "支付链路零丢单 · mq-v3 敢用在钱上", technologies: ["幂等", "事务消息", "对账", "综合"], jobSkills: ["消息队列", "可靠性", "架构"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "Q4",
    title: "从消息到流",
    subtitle: "从一封信到一条河",
    goal: "把视角从「一封信」抬到「一条河」:流批分界、Flink 的时间与状态、端到端恰好一次的真实前提、CDC 打通库与流,最后用一块实时大屏收束全线。",
    covers: ["流批分界", "Flink 时间与状态", "Exactly-Once", "CDC 与实时看板"],
    episodes: [
      { season: 4, episode: 1, title: "昨天的账与此刻的河", summary: "批处理是每天早上盘一次账,流处理是让账一直流着;有界与无界、延迟与完整性——分界线其实只有一条,却决定了整套架构长什么样。", chapterType: "comic", projectStage: "分得清该批还是该流", technologies: ["批处理", "流处理", "有界/无界"], jobSkills: ["数据处理", "架构"], status: "planned" },
      { season: 4, episode: 2, title: "迟到的那封信", summary: "事件时间 vs 处理时间、滚动窗口与滑动窗口、水位线(watermark)如何替你宣布「不再等了」——迟到的信到底还收不收,按规矩来。", chapterType: "comic", projectStage: "按事件时间开窗统计", technologies: ["Flink", "事件时间", "窗口", "watermark"], jobSkills: ["流处理"], status: "planned" },
      { season: 4, episode: 3, title: "随身的记事本", summary: "算子里那本随身记事本就是状态;checkpoint 定时给它拍快照,崩了从快照原地复活——存在哪、多大、多久拍一次,三个问题必须交代清楚。", chapterType: "comic", projectStage: "崩溃能从快照原地复活", technologies: ["Flink state", "checkpoint", "状态后端", "故障恢复"], jobSkills: ["流处理", "容错"], status: "planned" },
      { season: 4, episode: 4, title: "恰好一次的真相", summary: "端到端恰好一次 = 可重放的源 + 快照对齐的状态 + 两阶段提交或幂等的 sink;三处缺一处就退回至少一次,一张表钉清每处的前提与代价。", chapterType: "reference", projectStage: "说得清恰好一次的边界", technologies: ["Exactly-Once", "两阶段提交", "可重放源", "幂等 sink"], jobSkills: ["流处理", "投递语义"], status: "planned" },
      { season: 4, episode: 5, title: "账本自己会说话", summary: "不再靠业务代码双写:抄写员盯着数据库变更日志逐行念出来;全量快照与增量的衔接、表结构变更、初始积压,三个坑一个都躲不掉。", chapterType: "comic", projectStage: "库变更自动流进消息", technologies: ["CDC", "Debezium", "变更日志", "全量+增量"], jobSkills: ["数据集成", "流处理"], status: "planned" },
      { season: 4, episode: 6, title: "墙上的那块屏", summary: "亲手串起全链:订单流入 → 按分钟窗口聚合 → 结果落库 → 前端每秒刷新,并给迟到数据留一条修正通道;先跑通,再谈好不好看。", chapterType: "lab", projectStage: "实时看板端到端跑通", technologies: ["Flink SQL", "窗口聚合", "实时看板", "迟到修正"], jobSkills: ["流处理", "端到端交付"], status: "planned" },
      { season: 4, episode: 7, title: "大屏亮起来那晚", summary: "全线终章:实时销量大屏点亮,咕哥把那叠回执单交到阿零手里——从一次同步调用到一条不丢单的河,三十话的投递语义在这一晚合账。", chapterType: "project", projectStage: "实时销量大屏 · mq-v4 全线收束", technologies: ["Flink", "Kafka", "端到端", "综合"], jobSkills: ["流处理", "架构", "技术视野"], status: "planned" },
    ],
  },
];

export function mqAllEpisodes(): JavaEpisode[] {
  return MQ_SEASONS.flatMap((s) => s.episodes);
}

export function mqPublishedEpisodes(): JavaEpisode[] {
  return mqAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
