/**
 * 《从零开始扛大数据》· 蚁群数据台(咖啡站宇宙数据方向线,slug 前缀 bigdata)。
 *
 * 与咖啡站宇宙同线:Java 线把咖啡站建成系统、JVM 线钻进炉底之后,十年订单
 * 堆到单机再也扛不动。阿零下决心把「一个人算」升级成「一群人搬」,却在数据
 * 机房的地砖缝里遇到本线导师——蚂蚁「群姐」(Qun):个头小得不起眼,一声
 * 令下却能召来千万只工蚁协同搬运比自己重千倍的东西;背上永远驮着一小块发亮
 * 的「数据分片」,走到哪把哪块地图补全。她信奉的第一性原理只有一句——把不可
 * 分的大问题拆成可并行的小问题。口头禅「一个人搬不动,就让一万个人一起搬。」,
 * 副口头禅「数据太大,就把计算搬到数据那儿去。」(移动计算而非移动数据)。
 *
 * 联动钩子:豆豆客串「压测/造数发生器」,把午高峰十年订单一次性砸下来当试炼;
 * 特米(CLI 线)从机房通风管递 `hdfs dfs`/`kafka-console-consumer` 命令;焰焰
 * (JVM 线)在 shuffle/GC 卡顿话探头一句「先热身,再起飞」;Java 线 ⏳版本时光机
 * 遇到批流一体时脚注跳本作对应话。本线独有深度栏目两个:🐜 分而治之台(每个
 * 大数据概念先还原成「一群人怎么分工」,把术语翻译成蚁群协作)+ 📦 数据搬运账
 * (算清一次 shuffle / 一次 join / 一次全量捞到底搬了多少字节、走了多少网络)。
 *
 * 定位:给读完 Java / JVM 线、想转数据方向的工程师搭的桥——讲清「批处理与流
 * 处理的本质」,不堆术语。基线 Java 25 LTS / Spark 与 Flink 生态 / 现代湖仓表格式。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const BIGDATA_SERIES_META = {
  slug: "bigdata-academy",
  title: "从零开始扛大数据",
  alias: "阿零与群姐 · 蚁群数据台",
  tagline: "Java 教你把咖啡站建成系统,JVM 带你钻进炉底,这一部让一万只蚂蚁替你扛起十年订单——把批处理与流处理的本质讲清,不堆术语。",
  project: "咖啡站十年订单数据的离线分析与实时看板",
  storageKey: "bigdata-academy:completed",
} as const;

export const BIGDATA_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "D1",
    title: "数据变大之后",
    subtitle: "单机扛不动的那一天",
    goal: "先想清楚「数据大了到底难在哪」:单机的天花板、分而治之的思想、存储与计算分离、数据倾斜与 CAP,最后把十年订单第一次搬进数据湖。",
    covers: ["分而治之", "存算分离", "列存与 CAP"],
    episodes: [
      { season: 1, episode: 1, title: "一个人扛不动的麻袋", summary: "单机 CPU/内存/磁盘的天花板:午高峰把十年订单一次性 load 进内存,阿零的电脑像被一整麻袋咖啡豆压垮的搬运工,群姐从地砖缝里第一次现身。", chapterType: "comic", projectStage: "认清单机极限,立下扛大数据的 flag", technologies: ["单机瓶颈", "OOM", "垂直扩展"], jobSkills: ["大数据认知"], status: "planned" },
      { season: 1, episode: 2, title: "把大山分给一万只蚂蚁", summary: "分而治之与水平扩展:一个人搬不动就叫一万只蚂蚁各扛一粒,群姐现场演示 divide-and-conquer——大问题拆成可并行小问题,是全书第一性原理。", chapterType: "comic", projectStage: "确立分而治之的心智模型", technologies: ["分而治之", "水平扩展", "并行度"], jobSkills: ["分布式思想"], status: "planned" },
      { season: 1, episode: 3, title: "仓库和工人分家", summary: "存储与计算分离:把豆仓和搬运工队伍拆成两栋楼,谁忙谁单独扩容,HDFS/对象存储当共享大仓库,计算集群按需增援。", chapterType: "comic", projectStage: "选定存算分离的架构底座", technologies: ["存算分离", "HDFS", "对象存储"], jobSkills: ["大数据架构"], status: "planned" },
      { season: 1, episode: 4, title: "全压在一只蚂蚁背上", summary: "数据倾斜初体验:爆款拿铁的订单全落到同一只蚂蚁头上,它累瘫而其余工蚁闲站,群姐带阿零第一次翻开📦数据搬运账,算清倾斜的代价。", chapterType: "incident", projectStage: "第一次识别并量化数据倾斜", technologies: ["数据倾斜", "热点 key", "负载均衡"], jobSkills: ["性能排查"], status: "planned" },
      { season: 1, episode: 5, title: "三选二的分店难题", summary: "CAP 在数据系统里的取舍:分店断网时到底保一致还是保可用,群姐用连锁门店对账场景把 Consistency/Availability/Partition 三选二讲透。", chapterType: "comic", projectStage: "理解数据系统的一致性权衡", technologies: ["CAP", "一致性", "分区容错"], jobSkills: ["分布式理论"], status: "planned" },
      { season: 1, episode: 6, title: "竖着放还是横着放", summary: "行存 vs 列存:整单取货要行存、只数某一列要列存,群姐把货架横竖两种码法并排摆出来,列存加压缩后扫一列快十倍还省空间。", chapterType: "comic", projectStage: "选定列式存储与压缩格式", technologies: ["行存", "列存", "Parquet/ORC"], jobSkills: ["存储格式"], status: "planned" },
      { season: 1, episode: 7, title: "十年豆账住进大湖", summary: "卷终整合:把十年订单从单机 CSV 搬进分布式数据湖,按日期分区+列存落地,阿零第一次亲眼看见一万只蚂蚁同时开工把大账扛起来。", chapterType: "project", projectStage: "bigdata-v1 数据入湖 · 十年订单落分区列存", technologies: ["数据湖", "分区", "Parquet", "综合"], jobSkills: ["数据入湖"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "D2",
    title: "批处理:MapReduce 到 Spark",
    subtitle: "一群人怎么算一遍",
    goal: "从 MapReduce 的两段式心智模型出发,看清 shuffle 为何最贵,再进 Spark 的 RDD/DAG、宽窄依赖与 Catalyst,最后离线跑通十年销量报表。",
    covers: ["MapReduce", "Spark RDD/DAG", "shuffle 与倾斜"],
    episodes: [
      { season: 2, episode: 1, title: "先各扫一段,再汇总", summary: "MapReduce 心智模型:一万只蚂蚁各扫一段小票(map),再按品类归堆合计(reduce),群姐用分拣糖纸讲清「先局部、后汇总」的两段式。", chapterType: "comic", projectStage: "掌握 map/reduce 两段式思维", technologies: ["MapReduce", "map", "reduce"], jobSkills: ["批处理原理"], status: "planned" },
      { season: 2, episode: 2, title: "搬运账上最贵一笔", summary: "shuffle 的本质与代价:map 到 reduce 之间那次全网大搬家最烧钱,📦数据搬运账正式开张,算清一次 shuffle 到底搬了多少字节、跨了多少机器。", chapterType: "comic", projectStage: "量化 shuffle 的网络与磁盘代价", technologies: ["shuffle", "分区", "网络 IO"], jobSkills: ["性能优化"], status: "planned" },
      { season: 2, episode: 3, title: "先画流程图再动手", summary: "Spark 的 RDD 与 DAG:不急着搬,先把整套步骤画成有向无环图,群姐说想好全程再开工——中间结果在内存里接力,能不落地就不落地。", chapterType: "comic", projectStage: "用 RDD/DAG 描述计算而非过程", technologies: ["Spark", "RDD", "DAG", "惰性求值"], jobSkills: ["Spark 核心"], status: "planned" },
      { season: 2, episode: 4, title: "能接力的和要重排的", summary: "宽依赖与窄依赖、stage 划分:窄依赖像流水线一棒接一棒,宽依赖要全体重新排队(触发 shuffle),群姐正是按宽依赖处切出一个个 stage。", chapterType: "comic", projectStage: "看懂 DAG 如何切成 stage", technologies: ["宽依赖", "窄依赖", "stage"], jobSkills: ["Spark 调优"], status: "planned" },
      { season: 2, episode: 5, title: "报出需求,让军师排兵", summary: "DataFrame 与 Catalyst 优化器:阿零只写「要什么」,Catalyst 军师自动把搬运路线改到最省,群姐当场对比手写 RDD 与优化后的执行计划。", chapterType: "comic", projectStage: "从 RDD 升级到 DataFrame API", technologies: ["DataFrame", "Catalyst", "执行计划"], jobSkills: ["Spark SQL"], status: "planned" },
      { season: 2, episode: 6, title: "给累瘫的蚂蚁加把盐", summary: "数据倾斜的解法实战:热门 key 加盐打散、两阶段聚合、广播小表 join,群姐把 D1 里那只累瘫的蚂蚁救活,并用📦搬运账算清优化前后的差距。", chapterType: "incident", projectStage: "系统化解决一次生产级倾斜", technologies: ["加盐", "两阶段聚合", "broadcast join"], jobSkills: ["数据倾斜调优"], status: "planned" },
      { season: 2, episode: 7, title: "一夜跑出十年销量榜", summary: "卷终:用 Spark 离线批处理跑通十年销量报表,宽窄依赖、分区调优、倾斜处理全上,阿零第一次独立交付一张真跑得动、当夜出结果的报表。", chapterType: "project", projectStage: "bigdata-v2 离线报表 · Spark 跑通十年销量", technologies: ["Spark", "批处理", "调优", "综合"], jobSkills: ["离线开发"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "D3",
    title: "数仓与建模",
    subtitle: "把大账整理成能查的形状",
    goal: "数据能算之后要能「好查、可复用」:维度建模、事实表与维表、ODS/DWD/DWS 分层、拉链表、SQL on 大数据与数据质量血缘,最后建成咖啡站数仓。",
    covers: ["维度建模", "数仓分层", "拉链表与血缘"],
    episodes: [
      { season: 3, episode: 1, title: "把账本拆成一颗星", summary: "维度建模与星型模型:把一坨大宽表拆成中间事实表+四周维度表的星图,群姐说建模的核心就是先想清楚「你打算按什么维度看数」。", chapterType: "comic", projectStage: "确立维度建模方法论", technologies: ["维度建模", "星型模型", "事实/维度"], jobSkills: ["数仓建模"], status: "planned" },
      { season: 3, episode: 2, title: "流水账配户口本", summary: "事实表 vs 维表:事实表逐笔记录交易度量,维表存商品/门店/会员的「户口」,群姐用流水账搭配户口本讲清主外键与粒度的关系。", chapterType: "comic", projectStage: "拆分事实表与维表的职责", technologies: ["事实表", "维表", "粒度"], jobSkills: ["数仓建模"], status: "planned" },
      { season: 3, episode: 3, title: "从毛豆到成品四道工序", summary: "数仓分层 ODS/DWD/DWS/ADS:原始豆→洗净→半成品→出杯,群姐把数据加工比作咖啡产线,每一层只干一件事、层层复用不重算。", chapterType: "comic", projectStage: "落地分层加工的骨架", technologies: ["ODS", "DWD/DWS", "ADS"], jobSkills: ["数仓分层"], status: "planned" },
      { season: 3, episode: 4, title: "会员卡的历史都留痕", summary: "拉链表与缓慢变化维:会员等级每变一次就拉一条带生效/失效日期的链,群姐演示如何既省空间又能回查任意一天的历史状态。", chapterType: "comic", projectStage: "用拉链表保存维度历史", technologies: ["拉链表", "缓慢变化维", "SCD"], jobSkills: ["数仓建模"], status: "planned" },
      { season: 3, episode: 5, title: "一句 SQL 指挥万只蚂蚁", summary: "SQL on 大数据:熟悉的 SQL 被翻译成分布式搬运任务,群姐把 Hive 老黄牛与 Spark SQL 快马并排放,同一句 SQL 两种引擎各跑一遍看差别。", chapterType: "lab", projectStage: "用 SQL 驱动分布式计算", technologies: ["Hive", "Spark SQL", "查询引擎"], jobSkills: ["大数据 SQL"], status: "planned" },
      { season: 3, episode: 6, title: "给每粒豆子查户口", summary: "数据质量与血缘:空值/重复/口径漂移的体检,再加一张「这列数据从哪来、流到哪去」的血缘地图,群姐说错数比没数更可怕,得能追溯。", chapterType: "comic", projectStage: "接入质量校验与血缘追踪", technologies: ["数据质量", "血缘", "口径一致性"], jobSkills: ["数据治理"], status: "planned" },
      { season: 3, episode: 7, title: "咖啡站数仓四层通车", summary: "卷终:把咖啡站十年数据按 ODS/DWD/DWS/ADS 建成星型数仓,拉链维表+质量校验一起落地,阿零第一次给出一套可复用、口径统一的指标。", chapterType: "project", projectStage: "bigdata-v3 数仓分层 · 星型数仓四层落地", technologies: ["数仓", "分层建模", "拉链表", "综合"], jobSkills: ["数仓开发"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "D4",
    title: "实时流处理",
    subtitle: "来一单算一单",
    goal: "把「攒一堆再算」升级成「来一单算一单」:流批一体、Flink 的时间与窗口、水位线、状态与 checkpoint、Exactly-Once、CDC 入流,最后点亮实时大屏。",
    covers: ["流批一体", "Flink 时间/窗口", "状态与一致性"],
    episodes: [
      { season: 4, episode: 1, title: "从一夜一算到实时接力", summary: "流处理登场与流批一体:批是「攒一堆再算」,流是「来一单算一单」,群姐把 D2 的离线报表升级成一条永不打烊、订单一进就动的传送带。", chapterType: "comic", projectStage: "建立流处理的心智模型", technologies: ["流处理", "流批一体", "Flink"], jobSkills: ["实时计算"], status: "planned" },
      { season: 4, episode: 2, title: "按整点打烊结账", summary: "Flink 的时间与窗口:滚动/滑动/会话窗口就是三种不同的「打烊结账口径」,群姐用整点小时窗口实时统计每小时出杯量,兼谈事件时间。", chapterType: "comic", projectStage: "用窗口切分无界数据流", technologies: ["事件时间", "滚动/滑动窗口", "会话窗口"], jobSkills: ["Flink 开发"], status: "planned" },
      { season: 4, episode: 3, title: "迟到的订单等多久", summary: "水位线与乱序处理:网络延迟让订单迟到乱序,水位线是「再等 X 秒就关窗结账」的决断线,群姐权衡等太久(高延迟)vs 漏太多(丢数据)。", chapterType: "comic", projectStage: "用水位线容忍乱序", technologies: ["水位线", "乱序", "allowedLateness"], jobSkills: ["Flink 进阶"], status: "planned" },
      { season: 4, episode: 4, title: "搬到一半断电别慌", summary: "Flink 状态与 checkpoint:实时累计的中间账要定期存档,断电重启就从最近存档点接着搬,群姐演示有状态计算如何做到不丢账、可恢复。", chapterType: "comic", projectStage: "为实时任务加上状态与容错", technologies: ["状态", "checkpoint", "状态后端"], jobSkills: ["Flink 容错"], status: "planned" },
      { season: 4, episode: 5, title: "这一单绝不算两遍", summary: "Exactly-Once 语义:靠 checkpoint + 两阶段提交,让故障重放也不重不漏,群姐对比 at-least-once/at-most-once/exactly-once 三种搬运承诺。", chapterType: "comic", projectStage: "保证端到端精确一次", technologies: ["Exactly-Once", "两阶段提交", "幂等"], jobSkills: ["一致性保证"], status: "planned" },
      { season: 4, episode: 6, title: "订单库的一举一动都上传送带", summary: "CDC 变更数据捕获:直接订阅业务库 binlog,增删改实时流进大屏,群姐说别再定时全量捞了,让数据库自己把每次变化吐出来。", chapterType: "lab", projectStage: "用 CDC 把业务库变更接入流", technologies: ["CDC", "binlog", "Kafka"], jobSkills: ["实时数据集成"], status: "planned" },
      { season: 4, episode: 7, title: "大屏上的销量在跳动", summary: "卷终:用 Flink 打通 CDC→窗口→状态→大屏,咖啡站销量秒级跳动刷新,阿零第一次交付一块断电不丢账、来单即更新的实时看板。", chapterType: "project", projectStage: "bigdata-v4 实时大屏 · Flink 打通实时链路", technologies: ["Flink", "CDC", "实时大屏", "综合"], jobSkills: ["实时开发"], status: "planned" },
    ],
  },
  {
    season: 5,
    code: "D5",
    title: "湖仓与治理",
    subtitle: "把大数据管起来",
    goal: "收官:辨清湖/仓/湖仓、上开放表格式 Iceberg/Hudi、做 OLAP 引擎选型与冷热分层、补上治理与权限,最后把批流统一进湖仓一体,完成大数据大成。",
    covers: ["湖仓一体", "表格式与 OLAP", "成本与治理"],
    episodes: [
      { season: 5, episode: 1, title: "散养、圈养与两全", summary: "数据湖 vs 数仓 vs 湖仓:数据湖啥都堆但乱、数仓规整但死板、湖仓要两全,群姐用散养场/牧场/智能牧场三个比喻讲清各自的取舍。", chapterType: "comic", projectStage: "厘清湖仓一体的定位", technologies: ["数据湖", "数仓", "湖仓一体"], jobSkills: ["架构选型"], status: "planned" },
      { season: 5, episode: 2, title: "给大湖装上台账目录", summary: "开放表格式 Iceberg/Hudi:给散堆在湖里的文件加一层带事务与时间旅行的台账,群姐演示 ACID 与「回到上周版本」这类能力到底从哪来。", chapterType: "comic", projectStage: "为数据湖引入开放表格式", technologies: ["Iceberg", "Hudi", "ACID/时间旅行"], jobSkills: ["湖仓表格式"], status: "planned" },
      { season: 5, episode: 3, title: "查得快的那匹马选哪匹", summary: "OLAP 引擎选型:ClickHouse/Doris/StarRocks/Presto 各擅其场,群姐摆出「即席探查 vs 固定报表 vs 高并发」的决策台,一句「没有银弹」不吹某一家。", chapterType: "reference", projectStage: "为查询层选定 OLAP 引擎", technologies: ["OLAP", "ClickHouse/Doris", "Presto/Trino"], jobSkills: ["引擎选型"], status: "planned" },
      { season: 5, episode: 4, title: "热豆放手边,冷豆进地窖", summary: "存储成本与冷热分层:常查的热数据放快盘、老数据沉进廉价冷存,群姐算一笔十年数据的「电费账」,省钱与压缩也是硬本事。", chapterType: "comic", projectStage: "落地冷热分层与成本优化", technologies: ["冷热分层", "生命周期", "压缩"], jobSkills: ["成本治理"], status: "planned" },
      { season: 5, episode: 5, title: "谁能翻哪本账", summary: "数据治理与权限:元数据管理、数据分级、脱敏、库表行列级权限,群姐说数据越大越要管好「谁能看什么」,不然大湖会烂成数据沼泽。", chapterType: "comic", projectStage: "补齐治理、分级与权限", technologies: ["数据治理", "权限", "脱敏/分级"], jobSkills: ["数据治理"], status: "planned" },
      { season: 5, episode: 6, title: "湖仓合流,大账封顶", summary: "全剧终:批流统一进湖仓,Iceberg 表格式+分层建模+治理+OLAP 加速一体上线,群姐把背上那块数据分片交给阿零——他终于能自己扛起大数据。", chapterType: "project", projectStage: "bigdata-v5 湖仓大成 · 湖仓一体上线", technologies: ["湖仓一体", "Iceberg", "治理", "综合"], jobSkills: ["大数据架构"], status: "planned" },
    ],
  },
];

export function bigdataAllEpisodes(): JavaEpisode[] {
  return BIGDATA_SEASONS.flatMap((s) => s.episodes);
}

export function bigdataPublishedEpisodes(): JavaEpisode[] {
  return bigdataAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
