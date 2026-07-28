/**
 * 《从零开始压性能》· 风洞计时场(第五部连载,slug 前缀 perf)。
 *
 * 与咖啡站宇宙同线:JVM 线大结局后,咖啡站后厨已经是一台干净的 Java 25 机器,
 * 却在第一次真正的午高峰上被 200 QPS 顶穿——曲线不是慢,是"忽然全体一起慢"。
 * 阿零在后巷的旧风洞里遇见猎豹「秒秒」(Miao):爪垫里埋着传感器,起跑前一定
 * 先蹲下来测一次风速与地面摩擦(先取基线,再谈提速);能把时间"掰开"给阿零看
 * ——一帧栈就是一层被扑倒的草,一百层草压在一起,就是一张火焰图。
 * 口头禅「先量,再改。」,副口头禅「你猜的那个热点,从来都不是热点。」
 * (对标特米的"man 一下"、焰焰的"这事 JEP 里都写着呢")。
 *
 * 联动钩子:豆豆继续当"流量发生器",但本线升级成会造假的甲方(它要的是好看的
 * 平均值,秒秒要的是 P99);特米(CLI 线)从风洞通风口递 perf / ss / pidstat;
 * 焰焰(JVM 线)在卷三炉心调优里回场,负责 GC 与 JIT 的事实校对,和秒秒互怼
 * "先热身,再起飞" vs "先量,再改"。
 * 本线独有深度栏目:📊 火焰图台(每话给出可自己复现的观测命令与读图方法)与
 * ⏱️ 基准红线(讲清这个优化在什么量级/什么负载下才成立,以及什么时候是负收益)。
 * 基线:Java 25 LTS / Spring Boot 4.x(jakarta 命名空间)。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const PERF_SERIES_META = {
  slug: "perf-academy",
  title: "从零开始压性能",
  alias: "阿零与秒秒 · 风洞计时场",
  tagline: "JVM 线带你看懂炉底烧了什么,这一部教你先量后改——从指标口径、火焰图到全链路压测,把「我觉得变快了」换成一条能被证伪的曲线。",
  project: "把豆豆咖啡站从 200 QPS 扛到 5000 QPS,且 P99 不破 200ms",
  storageKey: "perf-academy:completed",
} as const;

export const PERF_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "P1",
    title: "先量后改",
    subtitle: "把「快」变成能证伪的数字",
    goal: "在动任何一行代码之前先把尺子立起来:吞吐/延迟/P99 的口径、不会自欺的压测模型、JMH 的正确姿势、从目标反推容量,最后封出一份可重跑的性能基线。",
    covers: ["性能指标与口径", "压测方法论", "JMH 与基线"],
    episodes: [
      { season: 1, episode: 1, title: "平均值的骗局", summary: "吞吐/延迟/P99 第一次分家:平均值说「30ms 一切安好」,秒秒把一百位顾客排成一排,第 99 个还端着空杯子干等。", chapterType: "comic", projectStage: "咖啡站有了统一的性能口径卡", technologies: ["QPS", "P50/P95/P99", "延迟分布"], jobSkills: ["性能指标"], status: "planned" },
      { season: 1, episode: 2, title: "跑道上的假成绩", summary: "压测方法论与常见造假:单线程刷屏的漂亮数字、忘了预热的冷启动、被压测工具自己吞掉的排队时间(coordinated omission)。", chapterType: "comic", projectStage: "第一版压测脚本与递增加压模型", technologies: ["递增加压", "闭环/开环模型", "coordinated omission"], jobSkills: ["压测方法论"], status: "planned" },
      { season: 1, episode: 3, title: "黑洞与热身圈", summary: "JMH 正确姿势:不跑热身圈就冲刺等于拉伤,Blackhole 是防止 JIT 把结果当垃圾扔掉的黑箱,死码消除专吃「没人要的计算」。", chapterType: "lab", projectStage: "咖啡站有了第一组 JMH 微基准", technologies: ["JMH", "Blackhole", "预热", "死码消除"], jobSkills: ["微基准"], status: "planned" },
      { season: 1, episode: 4, title: "十亿次的空气", summary: "微基准的谎言复盘:一个空方法跑出十亿 ops/s 写进周报,线上却更慢;秒秒把数据规模改回真实值重跑,数字当场缩水两个数量级。", chapterType: "incident", projectStage: "废掉一份假基准,留下可证伪流程", technologies: ["微基准陷阱", "JIT 优化", "数据规模"], jobSkills: ["微基准", "排障"], status: "planned" },
      { season: 1, episode: 5, title: "先立一面镜子", summary: "监控基线:没有基线的优化只是玄学;秒秒在店门口立起吞吐、延迟直方图、错误率三块表,以后每一次改动都要在表上留下前后印子。", chapterType: "comic", projectStage: "监控三板斧上线:吞吐/延迟直方图/错误率", technologies: ["延迟直方图", "监控基线", "SLO"], jobSkills: ["可观测性"], status: "planned" },
      { season: 1, episode: 6, title: "从 5000 倒着算", summary: "容量目标反推:5000 QPS × 200ms 到底意味着多少并发、多少连接、多少核?利特尔法则把一句口号掰成一张可验收的资源账单。", chapterType: "reference", projectStage: "容量规划表:目标 → 并发 → 资源", technologies: ["Little's Law", "容量规划", "并发度"], jobSkills: ["容量规划"], status: "planned" },
      { season: 1, episode: 7, title: "基线立碑", summary: "卷终:把口径卡、压测脚本、JMH 基准与监控看板封成一次可重跑的基线;从此每句「变快了」都必须能被这块碑证伪。", chapterType: "project", projectStage: "性能基线封版 · perf-v1 先量后改", technologies: ["性能基线", "压测脚本", "综合"], jobSkills: ["性能方法论"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "P2",
    title: "看见热点",
    subtitle: "火焰图里的真凶",
    goal: "学会让时间自己显形:读懂火焰图的宽与高、用 async-profiler 与 JFR 低开销取样、按症状选对 CPU/分配/锁三种图,最后拿证据消灭前三热点。",
    covers: ["火焰图读法", "async-profiler 与 JFR", "热点定位"],
    episodes: [
      { season: 2, episode: 1, title: "草丛的一百层", summary: "火焰图读法:每一帧栈是一层被扑倒的草,宽度是时间占比而不是耗时,纵向只是调用深度——先学会看,再谈砍哪一刀。", chapterType: "comic", projectStage: "读懂第一张 CPU 火焰图", technologies: ["火焰图", "栈采样", "时间占比"], jobSkills: ["性能分析"], status: "planned" },
      { season: 2, episode: 2, title: "一秒一千次快照", summary: "async-profiler 实战:低开销采样把运行中的进程连拍成火焰图,线上也敢常开,CPU 与 wall clock 两种口径对读。", chapterType: "lab", projectStage: "线上可随时抓取火焰图", technologies: ["async-profiler", "采样剖析", "wall clock"], jobSkills: ["性能分析"], status: "planned" },
      { season: 2, episode: 3, title: "黑匣子连拍", summary: "JFR 采集与分析:开一段定长记录等于给运行时连拍,jfr 命令行与事件视图把 CPU、分配、锁三条时间线摆到同一把尺子上对时。", chapterType: "lab", projectStage: "常驻低开销 JFR 采集通道", technologies: ["JFR", "jcmd", "事件分析"], jobSkills: ["可观测性"], status: "planned" },
      { season: 2, episode: 4, title: "三种火焰,三种烧法", summary: "CPU / 分配 / 锁竞争三张火焰图的选择表:CPU 图抓算得多的,分配图抓造垃圾的,锁图抓排队的——症状对图,别拿错尺子量错人。", chapterType: "reference", projectStage: "热点分诊决策表上墙", technologies: ["CPU 剖析", "分配剖析", "锁竞争"], jobSkills: ["性能分析"], status: "planned" },
      { season: 2, episode: 5, title: "一行正则烧了四成", summary: "事故复盘:优惠码校验的回溯灾难在火焰图上烧成一根通天火柱,独吞 40% CPU;全店都猜是数据库,没有一个人猜到那行正则。", chapterType: "incident", projectStage: "干掉第一个真凶,吞吐抬一档", technologies: ["正则回溯", "火焰图定位", "热点"], jobSkills: ["排障", "性能分析"], status: "planned" },
      { season: 2, episode: 6, title: "给指标接上业务", summary: "可观测埋点与业务指标关联:技术曲线只会喊「慢」,把出杯数与优惠活动打进同一条时间线,尖峰才说得清「为什么这一分钟慢」。", chapterType: "comic", projectStage: "业务事件与性能指标同轴", technologies: ["埋点", "指标关联", "链路追踪"], jobSkills: ["可观测性"], status: "planned" },
      { season: 2, episode: 7, title: "三根火柱倒下", summary: "卷终:按火焰图排出前三热点,一次只改一个变量再重跑基线,用同一份脚本证明每一刀砍在哪、砍掉了多少毫秒。", chapterType: "project", projectStage: "定位并消灭前三热点 · perf-v2 看见热点", technologies: ["热点治理", "火焰图", "回归验证"], jobSkills: ["性能优化"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "P3",
    title: "炉心调优",
    subtitle: "内存与 GC 的静音工程",
    goal: "钻回焰焰的炉心,但这次只带尺子:算清对象的真实体重、读懂 GC 日志、用实测而不是网帖做 G1/ZGC 选型、堵住泄漏,把最长暂停压进两位数毫秒。",
    covers: ["对象开销与内存布局", "GC 日志与选型", "泄漏排查与 JIT 边界"],
    episodes: [
      { season: 3, episode: 1, title: "一个对象要几粒糖", summary: "JVM 内存布局与对象开销:对象头、引用、对齐填充三笔账,秒秒把一个订单对象放上秤——包装类与嵌套集合的赘肉当场现形。", chapterType: "comic", projectStage: "算得清每个核心对象的真实体重", technologies: ["对象头", "对齐填充", "自动装箱", "对象布局"], jobSkills: ["JVM 内存"], status: "planned" },
      { season: 3, episode: 2, title: "炉膛日志夜读", summary: "GC 日志读法:把统一日志打开,读每次回收的暂停时长、晋升量与堆变化,把顾客口中的「偶尔卡一下」翻译成一条能对上时间的曲线。", chapterType: "lab", projectStage: "GC 日志常开且可解析", technologies: ["GC 日志", "暂停时间", "对象晋升"], jobSkills: ["GC 调优"], status: "planned" },
      { season: 3, episode: 3, title: "两台清洁车的赛跑", summary: "G1 vs ZGC 选型:吞吐优先还是暂停优先、堆多大才划算、要额外交多少 CPU 学费——一张对照表配同机实测,而不是抄网上的参数咒语。", chapterType: "reference", projectStage: "GC 选型有实测证据可依", technologies: ["G1", "ZGC", "暂停时间", "吞吐"], jobSkills: ["GC 调优"], status: "planned" },
      { season: 3, episode: 4, title: "堆外的仓库", summary: "堆外内存与直接缓冲:把货堆到 GC 管不着的后院,省下一次拷贝,却换来自己扫地的责任——以及一种监控看不见的新漏法。", chapterType: "comic", projectStage: "IO 路径改用直接缓冲并纳入监控", technologies: ["直接缓冲区", "堆外内存", "零拷贝"], jobSkills: ["JVM 内存"], status: "planned" },
      { season: 3, episode: 5, title: "越攒越多的杯子", summary: "内存泄漏复盘:一张静态 Map 悄悄攒了三天的会话,heap dump 拉进 MAT,支配树一路指向那个当初说「临时用一下」的缓存。", chapterType: "incident", projectStage: "堵住第一处泄漏,老年代回落", technologies: ["heap dump", "MAT", "支配树", "内存泄漏"], jobSkills: ["排障", "JVM 内存"], status: "planned" },
      { season: 3, episode: 6, title: "被抹掉的那次分配", summary: "逃逸分析与内联的边界:对象没跑出方法就可能被拆散在栈上,方法一胖就挤不进内联——用编译日志加基准看清优化在哪一步失效。", chapterType: "lab", projectStage: "热路径方法瘦身到可被内联", technologies: ["逃逸分析", "标量替换", "方法内联", "JIT"], jobSkills: ["JIT", "JVM 调优"], status: "planned" },
      { season: 3, episode: 7, title: "八百毫秒的静音", summary: "卷终:堆规划、GC 选型、对象瘦身三件事一起落地,最长暂停从 800ms 压到 10ms,并用同一段压测证明吞吐没有被偷偷换走。", chapterType: "project", projectStage: "GC 暂停 800ms → 10ms · perf-v3 炉心调优", technologies: ["GC 调优", "堆规划", "暂停时间"], jobSkills: ["GC 调优"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "P4",
    title: "全链路提速",
    subtitle: "从一条 SQL 到一个 TCP 包",
    goal: "把视线从 JVM 挪到整条链路:数据库与连接池、缓存命中率工程、序列化与网络开销、线程模型与批处理,逐段收益串起来打到端到端 P99 达标。",
    covers: ["数据库与连接池", "缓存与序列化", "线程模型与批处理"],
    episodes: [
      { season: 4, episode: 1, title: "排队等一口井", summary: "数据库慢查询与连接池:N+1 把一次点单拆成一百次跑腿;池子不是越大越好——超过数据库能同时挖的井数,只是把队伍换个地方排。", chapterType: "comic", projectStage: "慢查询清零,连接池按公式定档", technologies: ["慢查询日志", "索引", "连接池", "N+1"], jobSkills: ["数据库性能"], status: "planned" },
      { season: 4, episode: 2, title: "同一秒钟全体过期", summary: "缓存事故复盘:一批优惠券在同一秒到期,五千个请求同时扑向数据库;穿透、击穿、雪崩三种死法各留一具现场,命中率才是真体检表。", chapterType: "incident", projectStage: "随机 TTL + 单飞回源,命中率纳入看板", technologies: ["缓存雪崩", "缓存击穿", "缓存穿透", "命中率"], jobSkills: ["缓存工程"], status: "planned" },
      { season: 4, episode: 3, title: "一杯咖啡的打包费", summary: "序列化开销实测:同一份订单用 JSON 与 Protobuf 各跑一轮基准,把体积、CPU、分配三列摆开,再决定值不值得拿可读性去换。", chapterType: "lab", projectStage: "热接口序列化换档并留对照数据", technologies: ["JSON", "Protobuf", "序列化基准"], jobSkills: ["序列化"], status: "planned" },
      { season: 4, episode: 4, title: "电话线上的礼节", summary: "网络与 TCP 参数速查:半连接队列、Nagle 与延迟确认的恶性组合、长连接复用与超时——每个参数标清生效层与观测命令,拒绝当咒语背。", chapterType: "reference", projectStage: "网络参数逐项配上观测证据", technologies: ["TCP backlog", "Nagle", "keep-alive", "连接复用"], jobSkills: ["网络性能"], status: "planned" },
      { season: 4, episode: 5, title: "两拨服务员的对赌", summary: "线程池与虚拟线程实测对比:阻塞型请求下虚拟线程一骑绝尘,纯 CPU 密集时优势归零——同一份压测跑两遍,让数字自己上台说话。", chapterType: "lab", projectStage: "IO 路径切换虚拟线程并复测", technologies: ["线程池", "虚拟线程", "阻塞 IO"], jobSkills: ["并发", "性能优化"], status: "planned" },
      { season: 4, episode: 6, title: "一次端一整盘", summary: "批处理与异步化:一次一杯的往返合并成一整盘端出,写入攒批、非关键路径下沉异步,延迟曲线立刻矮一截——代价是复杂度与一致性账。", chapterType: "comic", projectStage: "写入攒批 + 非关键路径异步化", technologies: ["批处理", "异步化", "消息队列"], jobSkills: ["架构优化"], status: "planned" },
      { season: 4, episode: 7, title: "两百毫秒的承诺", summary: "卷终:数据库、缓存、序列化、线程模型四段收益串成一条端到端链路,压到 5000 QPS 时 P99 第一次稳稳站在 200ms 以内。", chapterType: "project", projectStage: "端到端 P99 达标 · perf-v4 全链路提速", technologies: ["全链路优化", "P99", "压测验收"], jobSkills: ["性能优化"], status: "planned" },
    ],
  },
  {
    season: 5,
    code: "P5",
    title: "扛住与省钱",
    subtitle: "大促前夜的最后一公里",
    goal: "从「跑得快」升级到「扛得住、还便宜」:全链路压测彩排、限流降级熔断的实测效果、CI 里的性能门禁、成本与容量水位的取舍,最后打赢大促。",
    covers: ["全链路压测与稳定性", "性能回归门禁", "成本与容量水位"],
    episodes: [
      { season: 5, episode: 1, title: "彩排一场大促", summary: "全链路压测:录制真实流量回放到影子库,压测标记贯穿每一跳——不敢在生产彩排的人,最后都得在生产首演。", chapterType: "lab", projectStage: "全链路压测通道与影子链路打通", technologies: ["流量录制回放", "影子库", "压测标记"], jobSkills: ["压测工程"], status: "planned" },
      { season: 5, episode: 2, title: "闸门与保险丝", summary: "限流降级熔断的实测效果:令牌桶按住入口、熔断切开坏邻居、降级保住主流程——三道闸门各压一轮,看曲线从悬崖塌陷变成平台。", chapterType: "comic", projectStage: "限流降级熔断三件套并压测验证", technologies: ["令牌桶", "熔断", "降级"], jobSkills: ["稳定性"], status: "planned" },
      { season: 5, episode: 3, title: "守门的机器人", summary: "性能回归门禁:关键基准搬进 CI,设阈值与波动带,谁的提交让 P99 抬头就当场被拦在门外——性能从此有回归测试,不再靠人记得。", chapterType: "lab", projectStage: "CI 性能门禁上线并拦下第一次回归", technologies: ["CI 基准", "回归门禁", "阈值与波动带"], jobSkills: ["工程效能", "性能工程"], status: "planned" },
      { season: 5, episode: 4, title: "账单上的每一毫秒", summary: "成本与性能的取舍:同样压到 P99 200ms,加机器、换 GC、改代码三条路各要花多少钱?一张云账单视角的决策表,把优化换算成月度支出。", chapterType: "reference", projectStage: "性能预算与成本对照表", technologies: ["成本模型", "资源水位", "云账单"], jobSkills: ["成本优化"], status: "planned" },
      { season: 5, episode: 5, title: "水位线上的演习", summary: "故障演练复盘:拔掉一个节点、给依赖注入延迟,水位从 60% 一路窜顶;秒秒要的从来不是不出事,而是出事时曲线怎么走、多久回得来。", chapterType: "incident", projectStage: "容量水位与故障预案经过实演", technologies: ["混沌工程", "故障注入", "容量水位"], jobSkills: ["稳定性", "容量规划"], status: "planned" },
      { season: 5, episode: 6, title: "零事故的那一夜", summary: "全剧终:5000 QPS、P99 不破 200ms、账单没有翻倍,大促当晚的曲线平得像一张桌子——秒秒摘下爪垫上的传感器,交到阿零手里。", chapterType: "project", projectStage: "大促零事故 · perf-v5 性能大成", technologies: ["综合", "容量", "稳定性"], jobSkills: ["性能工程"], status: "planned" },
    ],
  },
];

export function perfAllEpisodes(): JavaEpisode[] {
  return PERF_SEASONS.flatMap((s) => s.episodes);
}

export function perfPublishedEpisodes(): JavaEpisode[] {
  return perfAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
