/**
 * 《从零开始搞分布式》· 分布式深海(第三部连载,slug 前缀 dist)。
 *
 * 咖啡站宇宙正统续作:Java 线 v7 结局的"第二天",豆豆咖啡站开出八家分店——
 * 豆豆分身出 8 台即 8 个节点,共享会员、同款优惠券、一套库存,
 * 单体时代的所有直觉在开业第一天集体阵亡,每一话都是一场连锁店事故复盘。
 * 新导师「帕克索」(Paxos 谐音,深海章鱼架构师)登场:8 条腕足各有独立小脑、
 * 各戴一块走时不准的手表,恰好对应 8 家分店;紧张时喷 append-only 的日志墨水,
 * 对"单点"有生理性恐惧,口头禅「过半,即真理。」(网络故障时:「腕足会失联,日志不说谎。」)
 * 特米(CLI 线企鹅)在"动物园企鹅下岗"(ZooKeeper 谢幕)与排障戏客串,
 * 帕克索 vs 特米的"分布式 vs 单机"斗嘴是固定彩蛋位;⏳版本时光机不定期跨线出演。
 *
 * 长期项目:把豆豆咖啡站从单店 v7 建成八店连锁的分布式平台(版本链 v8 起步)。
 * 本线独有深度栏目:🌩️断网演习——每话末尾帕克索亲手把本话方案"炸"一次
 * (拔网线、杀 leader、时钟回拨、消息重投),被弄坏过一次才算学会,混沌工程精神贯穿全线。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const DIST_SERIES_META = {
  slug: "dist-academy",
  title: "从零开始搞分布式",
  alias: "阿零与帕克索 · 分布式深海",
  tagline: "豆豆咖啡站开出八家分店的那天,阿零才发现——最难的不是写代码,是让八台收银机说同一句话。",
  project: "把豆豆咖啡站建成八店连锁的分布式平台",
  storageKey: "dist-academy:completed",
} as const;

export const DIST_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "R1",
    title: "分身之乱",
    subtitle: "分布式为什么难",
    goal: "承认网络会断、时钟会骗:用八店连锁第一周的事故,建立八大谬误、CAP/PACELC 与一致性光谱的第一性心智模型。",
    covers: ["八大谬误", "CAP / PACELC", "一致性模型", "时钟与顺序"],
    episodes: [
      { season: 1, episode: 1, title: "一家店变八家店", summary: "豆豆分身出 8 台开业十分钟订单互相打架:分布式的动机与八大谬误——一切设计从承认'网络不可靠'开始。", chapterType: "comic", projectStage: "单店 v7 → 连锁元年 v8.0", technologies: ["八大谬误", "分布式动机"], jobSkills: ["分布式基础"], status: "planned" },
      { season: 1, episode: 2, title: "时间是个骗子", summary: "两家店挂钟差 3 分钟判不出'先到先得':物理时钟不可信,Lamport / 向量时钟只问'谁先发生'。", chapterType: "comic", projectStage: "跨店事件能排序", technologies: ["NTP", "Lamport 时钟", "向量时钟"], jobSkills: ["分布式基础"], status: "planned" },
      { season: 1, episode: 3, title: "隧道塌方那天", summary: "连接两店的隧道塌方:分区不是选项而是现实,收银系统只剩'保账目'和'先卖再对账'两个按钮。", chapterType: "incident", projectStage: "第一次直面分区", technologies: ["CAP"], jobSkills: ["分布式基础"], status: "planned" },
      { season: 1, episode: 4, title: "没塌方的日子也要选", summary: "总部要求'每笔实时同步',点一杯咖啡转圈 3 秒:PACELC——无分区时还要在延迟与一致性间取舍。", chapterType: "comic", projectStage: "同步策略分级", technologies: ["PACELC"], jobSkills: ["分布式基础"], status: "planned" },
      { season: 1, episode: 5, title: "薛定谔的积分", summary: "刚充的 100 积分换台机器一查是 0:帕克索拉出一致性光谱横幅,逐档演示读己之写等会话保证。", chapterType: "comic", projectStage: "会员积分定级一致性", technologies: ["一致性模型", "会话保证"], jobSkills: ["分布式基础"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "R2",
    title: "谁说了算",
    subtitle: "共识与 Raft",
    goal: "分区之下谁说了算:从脑裂灾难到 Raft 选举与日志复制,再到 etcd 公证处与 fencing token——把共识讲成人话。",
    covers: ["复制与脑裂", "Raft 共识", "Paxos / ZAB / FLP", "etcd 与租约"],
    episodes: [
      { season: 2, episode: 1, title: "两个店长", summary: "网络一断东西区各自推举'代理总店长',促销规则各改各的:主从复制的取舍与脑裂'双主血案'。", chapterType: "incident", projectStage: "见识高可用第一道坎", technologies: ["主从复制", "脑裂"], jobSkills: ["高可用"], status: "planned" },
      { season: 2, episode: 2, title: "店长竞选", summary: "总店长心跳一停各分店倒计时抢跑竞选:任期 + 随机选举超时 + 过半投票——随机超时拯救世界。", chapterType: "comic", projectStage: "集群能自动选主", technologies: ["Raft", "领导者选举"], jobSkills: ["共识"], status: "planned" },
      { season: 2, episode: 3, title: "抄账本", summary: "总店长逐条广播、分店抄完签收,过半盖章才板上钉钉:Raft 日志复制与过半提交——'过半,即真理'。", chapterType: "comic", projectStage: "账目复制不丢不乱", technologies: ["Raft", "日志复制"], jobSkills: ["共识"], status: "planned" },
      { season: 2, episode: 4, title: "新店入伙", summary: "第 9 家店不能直接进群:两阶段成员变更的'入伙仪式',新店拿账本快照而非从开业第一天补抄,外加 PreVote 防扰动。", chapterType: "comic", projectStage: "集群能安全扩员", technologies: ["成员变更", "快照", "PreVote"], jobSkills: ["共识"], status: "planned" },
      { season: 2, episode: 5, title: "帕克索的祖谱", summary: "深海祖谱速查:严谨但没人看懂的祖师爷 Paxos、在动物园上班的表亲 ZAB,以及被画成'等不到的电梯'的 FLP。", chapterType: "reference", projectStage: "看懂共识谱系", technologies: ["Paxos", "ZAB", "FLP"], jobSkills: ["共识", "八股"], status: "planned" },
      { season: 2, episode: 6, title: "公证处开张", summary: "总部公证处 etcd 开张:租约到期、僵尸店长的过期公章被编号更大的 fencing token 当场压掉;彩蛋——动物园企鹅下岗(KRaft)。", chapterType: "lab", projectStage: "配置与选主有了公证处", technologies: ["etcd", "Lease", "fencing token", "KRaft"], jobSkills: ["共识", "微服务基建"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "R3",
    title: "一笔账跨八家店",
    subtitle: "分布式事务",
    goal: "让一笔账安全跨过八家店:2PC 的痛、TCC/Saga 的柔、Outbox 与事务消息的稳,最后学会按场景选型。",
    covers: ["2PC / XA", "TCC / Saga", "Outbox / 事务消息", "Seata 选型"],
    episodes: [
      { season: 3, episode: 1, title: "婚礼司仪", summary: "跨店转账像婚礼:司仪问两边'你愿意吗'都愿意才宣布成交;司仪晕倒全场僵住一整夜——2PC 的阻塞缺陷。", chapterType: "incident", projectStage: "懂了强一致的代价", technologies: ["2PC", "XA"], jobSkills: ["分布式事务"], status: "planned" },
      { season: 3, episode: 2, title: "预留一袋豆子", summary: "Try 贴'预留'封条、Confirm 才搬走、Cancel 撕封条:TCC 三段式,连库存被封死的超时释放与空回滚一起讲。", chapterType: "comic", projectStage: "跨店调豆不超卖", technologies: ["TCC"], jobSkills: ["分布式事务"], status: "planned" },
      { season: 3, episode: 3, title: "倒放的流水线", summary: "跨店联名咖啡 C 店翻车,镜头倒放逐步补偿:Saga 长事务链,编排=有导演,协同=接力暗号。", chapterType: "comic", projectStage: "跨店长流程能回退", technologies: ["Saga", "编排", "协同"], jobSkills: ["分布式事务"], status: "planned" },
      { season: 3, episode: 4, title: "账本旁的便签盒", summary: "'先扣库存再广播'偏偏中间断电:要广播的话与业务同事务写进账本便签栏,Debezium 快递员盯账代发——Outbox。", chapterType: "comic", projectStage: "改库发消息不再双写", technologies: ["Outbox", "本地消息表", "CDC"], jobSkills: ["分布式事务"], status: "planned" },
      { season: 3, episode: 5, title: "半张欠条", summary: "先押半张欠条(半消息)到消息站,本地账落定再放行;阿零失联时消息站上门回查——RocketMQ 事务消息。", chapterType: "comic", projectStage: "事务消息落地", technologies: ["RocketMQ", "事务消息"], jobSkills: ["分布式事务", "消息队列"], status: "planned" },
      { season: 3, episode: 6, title: "四件套选型会", summary: "帕克索 4 条腕足各举一块牌子摆擂台:Seata AT/TCC/Saga/XA 按侵入性、隔离性、性能三轴给业务连线配对。", chapterType: "reference", projectStage: "事务方案按场景选型", technologies: ["Seata", "AT", "TCC", "Saga", "XA"], jobSkills: ["分布式事务", "架构选型"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "R4",
    title: "传送带上的咖啡",
    subtitle: "消息队列",
    goal: "装上传送带:解耦削峰与投递语义,吃透 Kafka 核心模型与恰好一次的真实边界,给失败的消息安个家,选对自家的队列。",
    covers: ["解耦削峰", "投递语义", "Kafka 模型", "重试与 DLQ", "MQ 选型"],
    episodes: [
      { season: 4, episode: 1, title: "叫号器革命", summary: "早高峰冲垮收银台:装上传送带+叫号器,收银只管收单、吧台按自己节奏做——第一次体验'峰值被熨平'。", chapterType: "comic", projectStage: "下单制作解耦", technologies: ["消息队列", "削峰", "异步"], jobSkills: ["消息队列"], status: "planned" },
      { season: 4, episode: 2, title: "重复敲门的外卖员", summary: "没听到'收到'就再敲一次门,顾客收到两杯:至多/至少/恰好一次——恰好一次 = 至少一次 + 幂等,别信魔法。", chapterType: "comic", projectStage: "理解丢与重的根源", technologies: ["投递语义"], jobSkills: ["消息队列"], status: "planned" },
      { season: 4, episode: 3, title: "传送带解剖课", summary: "八条轨道、杯上刻度、店员小组认领轨道:Kafka partition/offset/consumer group,有人请假全组 rebalance 集体卡顿。", chapterType: "comic", projectStage: "吃透 Kafka 心智模型", technologies: ["Kafka", "partition", "offset", "rebalance"], jobSkills: ["Kafka"], status: "planned" },
      { season: 4, episode: 4, title: "盖着布的成品区", summary: "每杯咖啡贴序列号防重复上带,事务中的咖啡盖着布只对 read_committed 隐身:幂等 Producer 与 EOS 的真实边界。", chapterType: "comic", projectStage: "流水线精确一次", technologies: ["Kafka", "幂等 Producer", "EOS"], jobSkills: ["Kafka"], status: "planned" },
      { season: 4, episode: 5, title: "无人认领包裹柜", summary: "做失败的订单不许在传送带上无限转圈:退避重试三次仍失败送进死信包裹柜,每天人工开柜复盘。", chapterType: "comic", projectStage: "失败消息有了家", technologies: ["重试", "退避", "DLQ"], jobSkills: ["消息队列"], status: "planned" },
      { season: 4, episode: 6, title: "传送带博览会", summary: "Kafka/RocketMQ/Pulsar/RabbitMQ 四大展台;压轴新品:Kafka 4.2 共享轨道(Share Groups GA)——店员数终于能超过轨道数。", chapterType: "reference", projectStage: "选对自家的传送带", technologies: ["Kafka 4.x", "RocketMQ", "Pulsar", "RabbitMQ", "Share Groups"], jobSkills: ["消息队列", "架构选型"], status: "planned" },
    ],
  },
  {
    season: 5,
    code: "R5",
    title: "一把钥匙与一块黑板",
    subtitle: "锁、ID 与缓存",
    goal: "高并发连锁店的互斥、编号与防洪工事:分布式锁与 Redlock 论战、分布式 ID、缓存一致性三件套,收束超时-重试-幂等铁三角。",
    covers: ["分布式锁", "分布式 ID", "缓存一致性", "幂等", "一致性哈希"],
    episodes: [
      { season: 5, episode: 1, title: "烘豆房的钥匙", summary: "全连锁一间烘豆房、一把挂在 Redis 的钥匙:SET NX PX + 唯一值 + Lua 释放 + 看门狗——超时被拿走才知道要对暗号。", chapterType: "lab", projectStage: "烘豆房互斥上锁", technologies: ["Redis", "SET NX PX", "Lua", "看门狗"], jobSkills: ["Redis", "分布式锁"], status: "planned" },
      { season: 5, episode: 2, title: "锁界大论战", summary: "法庭戏重演 Kleppmann vs antirez:GC 停顿被画成'持锁人当庭睡着';判决——效率型锁从简,正确性型锁上共识 + fencing token。", chapterType: "comic", projectStage: "分清两种锁的底线", technologies: ["Redlock", "fencing token"], jobSkills: ["分布式锁", "八股"], status: "planned" },
      { season: 5, episode: 3, title: "取号机风云", summary: "订单号大赛:UUID 又长又乱、雪花机时钟回拨吐重号当场社死、号段像批发号码本——好 ID 要唯一、趋势有序、生成不求人。", chapterType: "incident", projectStage: "全连锁统一取号", technologies: ["UUID", "Snowflake", "号段"], jobSkills: ["分布式 ID"], status: "planned" },
      { season: 5, episode: 4, title: "黑板价和账本价", summary: "门口黑板价(缓存)和总账本价(DB)对不上:Cache-Aside 为主,'先改谁'四种顺序各翻一次车,最后请 binlog 快递员盯账擦黑板。", chapterType: "comic", projectStage: "黑板账本终于一致", technologies: ["Cache-Aside", "延迟双删", "binlog"], jobSkills: ["缓存"], status: "planned" },
      { season: 5, episode: 5, title: "防洪三件套", summary: "貂蝉拿铁狂问不存在(穿透)、招牌款到期千人挤后厨(击穿)、黑板集体被雨淋花(雪崩):布隆过滤器、空值缓存、singleflight 三件法宝。", chapterType: "incident", projectStage: "缓存层筑起防洪堤", technologies: ["布隆过滤器", "空值缓存", "singleflight"], jobSkills: ["缓存"], status: "planned" },
      { season: 5, episode: 6, title: "连点三次的优惠券", summary: "顾客手抖连点三次险被扣三次款:幂等键/去重表/状态机/版本号四保险逐层拦截,收束超时-重试-幂等铁三角。", chapterType: "comic", projectStage: "重复请求扣不了两次", technologies: ["幂等", "去重表", "状态机", "乐观锁"], jobSkills: ["幂等设计"], status: "planned" },
      { season: 5, episode: 7, title: "转盘分豆", summary: "新店加入,普通取模=全体搬家,一致性哈希=只有邻座挪窝:虚拟节点治'胖店',顺带分库分表与在线扩容。", chapterType: "comic", projectStage: "会员数据可平滑扩容", technologies: ["一致性哈希", "虚拟节点", "分库分表"], jobSkills: ["数据分片"], status: "planned" },
    ],
  },
  {
    season: 6,
    code: "R6",
    title: "深海尽头",
    subtitle: "工程收束与前沿",
    goal: "无主复制、全链路追踪与混沌演习收束全线,遥望 CRDT 与原子钟灯塔,上市答辩用一张总架构图串讲所有权衡。",
    covers: ["Quorum / Gossip", "全链路追踪", "混沌工程", "前沿风景"],
    episodes: [
      { season: 6, episode: 1, title: "三票之约", summary: "无主之地分店联盟写 2 读 2 总有一家知道真相:W+R>N 与 read repair,店员八卦(Gossip)传播谁家停电。", chapterType: "comic", projectStage: "见识 AP 存储流派", technologies: ["Quorum", "read repair", "Gossip"], jobSkills: ["分布式存储"], status: "planned" },
      { season: 6, episode: 2, title: "一根线索走到底", summary: "一杯咖啡投诉,阿零举着 traceId 像拉红线穿过八家店与传送带;暴走的推荐服务被熔断闸+舱壁隔离——特米客串查日志。", chapterType: "comic", projectStage: "连锁全链路可观测", technologies: ["OpenTelemetry", "traceId", "熔断", "舱壁"], jobSkills: ["可观测性"], status: "planned" },
      { season: 6, episode: 3, title: "演习日", summary: "全连锁故障演习日:帕克索亲手拔网线、拨时钟、杀店长,系统全部自愈;片尾遥望原子钟灯塔(TrueTime)与自动合并的账本(CRDT)。", chapterType: "incident", projectStage: "高可用不再纸面", technologies: ["混沌工程", "DST", "CRDT", "TrueTime"], jobSkills: ["混沌工程"], status: "planned" },
      { season: 6, episode: 4, title: "上市答辩", summary: "上市路演连环拷问 CAP→Raft→事务→MQ→锁→缓存:阿零一张总架构图作答,帕克索八条腕足同时鼓掌——全票通过。", chapterType: "project", projectStage: "分布式咖啡连锁 v8 完全体", technologies: ["综合"], jobSkills: ["分布式", "架构", "面试"], status: "planned" },
    ],
  },
];

export function distAllEpisodes(): JavaEpisode[] {
  return DIST_SEASONS.flatMap((s) => s.episodes);
}

export function distPublishedEpisodes(): JavaEpisode[] {
  return distAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
