/**
 * 《从零开始看得见》· 夜视观测台(第三部连载,slug 前缀 obs)。
 *
 * 与咖啡站宇宙同线:云原生线把咖啡站送上了云、微服务线把它拆成了一片灯火,
 * 于是最要命的问题登场——**部署之后,你怎么知道它还活着?**深夜大屏一片绿,
 * 顾客却在群里说下不了单;日志翻到天亮也说不清那消失的 800 毫秒去了哪。
 * 新导师猫头鹰「瞭瞭」(Liao)在这一夜落到咖啡站屋檐上:脖子能转 270 度
 * (视角盲区极小),夜里比白天看得清(别人熄灯时她才上班);左眼看指标、
 * 右眼看日志,两只眼各看一半世界,爪子里始终攥着一根把两边串起来的线
 * ——那根线就是 TraceID。口头禅「**看不见的,才最贵。**」,
 * 副口头禅「先问自己:这个问题,数据答得了吗?」(对标特米的"man 一下"、
 * 焰焰的"JEP 里都写着呢")。她从不直接回答"为什么慢",只反问"你打算用哪条
 * 数据证明它慢"——本线全部方法论都长在这一句上。
 *
 * 联动钩子:云原生线导师库舵负责"把它部署上去",瞭瞭负责"部署之后看得见",
 * 两线在卷三追踪章互认同一条 TraceID;微服务线的🚨事故复盘室提供事故素材,
 * 本线卷四教怎么把那种事故在三分钟内说清;特米(CLI 线)在日志与剖析话从
 * 通风管递 journalctl / jcmd;JVM 线的 JFR 黑匣子是本线持续剖析话的前置;
 * 豆豆客串"第一报警人"(顾客投诉先到它这儿),并全程当那个被观测的对象。
 * 本线独有深度栏目:🔭 夜视仪(每话必给一段可复现的查询语句或看板配置——
 * PromQL / 日志检索 / trace 过滤,照抄能跑,"看不见的,才最贵")
 * + ❓ 三问自检(能发现吗?能定位吗?能证明修好了吗?——三问全绿才算收工)。
 * 基线 Java 25 LTS / Spring Boot 4.x / jakarta。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const OBS_SERIES_META = {
  slug: "obs-academy",
  title: "从零开始看得见",
  alias: "阿零与瞭瞭 · 夜视观测台",
  tagline: "云原生线教你把系统送上去,这一部教你部署之后怎么知道它还活着——日志、指标、追踪三条线拧成一根,让咖啡站的每一次异常都在三分钟内说得清。",
  project: "给豆豆咖啡站建起一座看得见的夜视观测台",
  storageKey: "obs-academy:completed",
} as const;

export const OBS_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "O1",
    title: "日志不是打印",
    subtitle: "从 println 到证据链",
    goal: "把日志从「写给此刻的自己看」改造成「机器能检索、半年后还能当证据」的资产:结构化、有上下文、分得清级别、脱得掉敏感、付得起账单。",
    covers: ["结构化日志与字段规范", "上下文透传与 MDC", "脱敏、采样与成本"],
    episodes: [
      { season: 1, episode: 1, title: "三双眼睛", summary: "日志的三种读者(半夜排障的人、负责检索的机器、半年后的自己):阿零满屏 println 只写给此刻的自己,瞭瞭当场把它撕成三张需求单。", chapterType: "comic", projectStage: "认清日志写给谁看", technologies: ["SLF4J", "日志门面", "println 反模式"], jobSkills: ["日志治理"], status: "planned" },
      { season: 1, episode: 2, title: "把日记改成表格", summary: "结构化日志与字段字典:散文体日志人读着顺、机器一查就瞎;瞭瞭发下一张字段登记表,每条日志出门前必须先填表。", chapterType: "lab", projectStage: "日志改成 JSON 可检索", technologies: ["JSON 结构化日志", "Logback encoder", "字段字典"], jobSkills: ["日志治理", "可观测性"], status: "planned" },
      { season: 1, episode: 3, title: "五个音量旋钮", summary: "日志级别的真实含义:ERROR 是「有人得起床」、WARN 是「明早再看」、DEBUG 只给开发;阿零把一切写成 INFO,等于全静音。", chapterType: "comic", projectStage: "级别约定与动态调级", technologies: ["日志级别", "ERROR/WARN/INFO", "运行时调级"], jobSkills: ["日志治理"], status: "planned" },
      { season: 1, episode: 4, title: "给每句话别上工牌", summary: "上下文透传与 MDC:同一笔订单的日志散落在四个线程里各说各话,瞭瞭给每句话别上写着 requestId 的工牌,一搜就能拼回全程。", chapterType: "comic", projectStage: "日志带上请求上下文", technologies: ["MDC", "requestId", "上下文透传"], jobSkills: ["可观测性"], status: "planned" },
      { season: 1, episode: 5, title: "小票上的手机号", summary: "脱敏、采样与合规:顾客手机号原样落进日志被截图外传,瞭瞭在日志出口装上马赛克机,又给刷屏的噪音日志加了一道采样阀。", chapterType: "incident", projectStage: "日志出口装上脱敏与采样", technologies: ["字段脱敏", "日志采样", "合规留存"], jobSkills: ["数据合规", "日志治理"], status: "planned" },
      { season: 1, episode: 6, title: "日志也要交房租", summary: "成本与保留策略:一天几十 GB 的房租谁来付?瞭瞭画出热/温/冷三层货架,按级别与采样率算清每条日志该住多久、住哪层。", chapterType: "reference", projectStage: "分层保留与成本账本", technologies: ["分层存储", "保留期", "索引成本"], jobSkills: ["成本治理"], status: "planned" },
      { season: 1, episode: 7, title: "日志宪法诞生", summary: "卷终:字段字典、级别约定、脱敏清单、保留期合成一页可执行的规范,新服务接入前先过瞭瞭的三问自检才准上线。", chapterType: "project", projectStage: "咖啡站日志规范上线 · obs-v1 日志可检索", technologies: ["日志规范", "接入检查表", "综合"], jobSkills: ["可观测性", "工程规范"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "O2",
    title: "指标与告警",
    subtitle: "让数字替你值班",
    goal: "把「感觉有点慢」换成一条能画出来的曲线:选对指标类型、按 RED/USE 布点、用查询语言问出答案,再把告警从一晚七响收敛成一年三响、三次都真有事。",
    covers: ["指标类型与 RED/USE", "Prometheus 与查询", "SLO 与告警设计"],
    episodes: [
      { season: 2, episode: 1, title: "柜台上的三块表", summary: "指标三型:计数器只增不减(累计出杯)、量规上下浮动(排队人数)、直方图记录分布(等待时长);表型选错,后面所有结论都是编的。", chapterType: "comic", projectStage: "第一批业务指标上线", technologies: ["Counter", "Gauge", "Histogram", "Micrometer"], jobSkills: ["监控指标"], status: "planned" },
      { season: 2, episode: 2, title: "两张问诊单", summary: "RED 与 USE 方法:问服务三句(请求量/错误数/耗时),问资源三句(使用率/饱和度/错误);瞭瞭按这两张单子把咖啡站挂满温度计。", chapterType: "comic", projectStage: "服务与资源全覆盖布点", technologies: ["RED", "USE", "饱和度"], jobSkills: ["可观测性", "SRE"], status: "planned" },
      { season: 2, episode: 3, title: "上门抄表的人", summary: "Prometheus 数据模型与查询:指标名加一组标签就是一条时间线,抄表员按时上门拉数;rate、sum by、直方图分位三板斧现敲现看。", chapterType: "lab", projectStage: "指标查得出、画得出", technologies: ["Prometheus", "PromQL", "标签", "rate"], jobSkills: ["Prometheus", "可观测性"], status: "planned" },
      { season: 2, episode: 4, title: "被平均掉的那位顾客", summary: "直方图与分位数的陷阱:平均等待两秒一片祥和,p99 却是四十秒;分位数不能再求平均,桶边界选歪了,分位数全是估出来的。", chapterType: "incident", projectStage: "换掉会骗人的平均值", technologies: ["直方图桶", "分位数", "p99"], jobSkills: ["监控指标", "排障"], status: "planned" },
      { season: 2, episode: 5, title: "狼来了的第七夜", summary: "告警设计:少而准。告症状不告原因、每条告警绑一个人会疼的目标、分组抑制去抖动——一晚响七次的告警,等于一次都没响。", chapterType: "comic", projectStage: "告警规则大清洗", technologies: ["告警规则", "分组与抑制", "症状告警"], jobSkills: ["告警治理", "SRE"], status: "planned" },
      { season: 2, episode: 6, title: "一个月的犯错额度", summary: "SLI/SLO 与错误预算:先挑一个顾客真会疼的指标,定住目标线,把剩余额度画成燃尽图;预算烧光就冻结发布,不吵架靠数字说话。", chapterType: "reference", projectStage: "SLO 与错误预算上墙", technologies: ["SLI", "SLO", "错误预算"], jobSkills: ["SRE", "SLO"], status: "planned" },
      { season: 2, episode: 7, title: "值班室的安静之夜", summary: "卷终:告警收敛到一屏,每条都绑着一条 SLO 和一份处置手册;值班室第一次整夜只响一次——而那一次,真的有事。", chapterType: "project", projectStage: "告警收敛与 SLO 落地 · obs-v2 告警可信", technologies: ["告警收敛", "处置手册", "综合"], jobSkills: ["监控告警", "SRE"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "O3",
    title: "一条线串起来",
    subtitle: "TraceID 的旅行",
    goal: "把散落在各个服务里的证据用一根线穿起来:理解 trace 与 span、统一到 OpenTelemetry、跨异步边界不断线、把业务字段挂上去——从「哪个服务慢」直接问到「哪一单慢」。",
    covers: ["分布式追踪与上下文传播", "OpenTelemetry 与 OTLP", "采样策略与业务属性"],
    episodes: [
      { season: 3, episode: 1, title: "谁也不认这笔订单", summary: "分布式追踪解决什么:一笔订单穿过六个服务后慢了下来,日志各说各话、指标只报总账,消失的 800 毫秒没有一个服务肯认领。", chapterType: "comic", projectStage: "看清跨服务的黑洞", technologies: ["分布式追踪", "跨服务定位"], jobSkills: ["分布式追踪"], status: "planned" },
      { season: 3, episode: 2, title: "装一条总管道", summary: "OpenTelemetry 三件套:API、SDK、Collector 一套制式,三信号并进同一根 OTLP 总管道,自动埋点零改造起步。", chapterType: "lab", projectStage: "三信号并入统一管道", technologies: ["OpenTelemetry", "OTLP", "Collector", "自动埋点"], jobSkills: ["OpenTelemetry", "可观测性"], status: "planned" },
      { season: 3, episode: 3, title: "绳子上的结", summary: "Trace、Span 与上下文传播:每次调用打一个结,父子结串成一条绳;跨进程靠请求头把绳头递过去,谁手一松,后半程就成了黑箱。", chapterType: "comic", projectStage: "全站链路打通第一版", technologies: ["Trace", "Span", "traceparent", "上下文传播"], jobSkills: ["分布式追踪"], status: "planned" },
      { season: 3, episode: 4, title: "只留下值得留的那条", summary: "采样策略与尾部采样:头部采样便宜却总漏掉出事的那条,尾部采样等结果出来再决定留谁;一张按流量与预算选边的决策表。", chapterType: "reference", projectStage: "采样策略定案", technologies: ["头部采样", "尾部采样", "采样率"], jobSkills: ["分布式追踪", "成本治理"], status: "planned" },
      { season: 3, episode: 5, title: "断在传送带上的线", summary: "跨异步边界的追踪:订单一进消息队列和线程池,绳子就断成两截,后半程成了无主孤儿;上下文得有人亲手搬过边界去。", chapterType: "incident", projectStage: "异步链路不再断线", technologies: ["异步边界", "消息队列", "线程池", "上下文搬运"], jobSkills: ["分布式追踪", "排障"], status: "planned" },
      { season: 3, episode: 6, title: "挂在结上的名牌", summary: "把业务字段挂进 span:订单号、门店、会员等级作为属性挂上去,排查从「哪个服务慢」跳到「哪一单慢」;高基数字段只进属性,绝不进指标标签。", chapterType: "comic", projectStage: "链路带上业务维度", technologies: ["Span 属性", "业务维度", "高基数"], jobSkills: ["分布式追踪", "可观测性"], status: "planned" },
      { season: 3, episode: 7, title: "一笔订单的一生", summary: "卷终:从顾客按下按钮到咖啡出杯,整条链路摊在一张瀑布图上,慢在哪一格能用手指出来,并顺着那格跳到当时那几行日志。", chapterType: "project", projectStage: "全链路追踪贯通 · obs-v3 一单可追", technologies: ["瀑布图", "日志与链路互跳", "综合"], jobSkills: ["分布式追踪", "可观测性"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "O4",
    title: "从数据到决策",
    subtitle: "从看得见到说得清",
    goal: "数据齐了不等于事情说得清:看板给对人、根因按三段式收敛、值班有流程、复盘不设被告席、账单守得住,最后用一次真事故验收——三分钟说清全过程。",
    covers: ["看板与根因分析", "On-call 与无指责复盘", "成本治理与持续剖析"],
    episodes: [
      { season: 4, episode: 1, title: "三块屏幕的三种人", summary: "看板设计原则:老板看结果、值班看健康、排查看细节;一屏只回答一个问题,先写下要回答的问题,再决定画哪张图。", chapterType: "comic", projectStage: "三层看板成型", technologies: ["看板分层", "一屏一问题", "Grafana"], jobSkills: ["看板设计", "可观测性"], status: "planned" },
      { season: 4, episode: 2, title: "从一条告警往下挖", summary: "根因分析实操:指标圈范围、追踪定服务、日志定到那一行,瞭瞭示范一次三段式收敛,顺手拆穿两个长得很像凶手的巧合。", chapterType: "incident", projectStage: "跑通三段式收敛路径", technologies: ["根因分析", "指标→追踪→日志", "相关性陷阱"], jobSkills: ["根因分析", "排障"], status: "planned" },
      { season: 4, episode: 3, title: "凌晨三点的第一分钟", summary: "On-call 与事故响应:值班交接、指挥/操作/沟通三角色分工,止血永远排在找根因前面——第一分钟做什么,决定这一夜有多长。", chapterType: "comic", projectStage: "值班与响应流程上线", technologies: ["On-call", "事故分级", "事故指挥官"], jobSkills: ["SRE", "On-call"], status: "planned" },
      { season: 4, episode: 4, title: "复盘会不设被告席", summary: "无指责复盘怎么开:先拉时间线,再找贡献因素,人只是系统的一部分;行动项必须带负责人和期限,否则复盘只是一场集体叹气。", chapterType: "comic", projectStage: "复盘模板与行动项闭环", technologies: ["无指责复盘", "时间线", "行动项"], jobSkills: ["事故管理", "团队协作"], status: "planned" },
      { season: 4, episode: 5, title: "一张会自己长大的账单", summary: "可观测性成本治理:指标基数悄悄爆炸、日志按天翻倍、追踪还想全量留;一张「先砍哪一刀」的决策表,在省钱和看得见之间划线。", chapterType: "reference", projectStage: "观测成本回到预算内", technologies: ["指标基数", "采样与保留", "成本核算"], jobSkills: ["成本治理", "SRE"], status: "planned" },
      { season: 4, episode: 6, title: "永远开着的火焰图", summary: "持续剖析进生产:低开销采样把 CPU 与内存火焰图常年开着,再和链路对上号——从「这个接口慢」一路落到「慢在哪一行」。", chapterType: "lab", projectStage: "生产持续剖析常开", technologies: ["持续剖析", "火焰图", "JFR", "低开销采样"], jobSkills: ["性能剖析", "可观测性"], status: "planned" },
      { season: 4, episode: 7, title: "三分钟", summary: "全线收束:一次真事故,从告警响起到定位、到拿出「已修复」的证据,全程三分钟说清;瞭瞭把那根串起指标与日志的线交到阿零手里。", chapterType: "project", projectStage: "三分钟说清一次事故 · obs-v4 全线收束", technologies: ["三分钟定位", "可观测闭环", "综合"], jobSkills: ["可观测性", "SRE"], status: "planned" },
    ],
  },
];

export function obsAllEpisodes(): JavaEpisode[] {
  return OBS_SEASONS.flatMap((s) => s.episodes);
}

export function obsPublishedEpisodes(): JavaEpisode[] {
  return obsAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
