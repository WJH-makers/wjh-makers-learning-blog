/**
 * 《从零开始玩响应式》· 数据流台(咖啡站宇宙新连载,slug 前缀 reactive)。
 *
 * 与咖啡站宇宙同线:JVM 线把后厨升级到 Java 25、扛过百万并发午高峰后,阿零
 * 发现下单链路仍是一层层"取了再等"的阻塞调用——线程池一满就雪崩。他决定把
 * 整条高并发下单链路改造成全异步非阻塞,却在咖啡站的循环水景池里遇到新导师:
 * 水母「漾漾」(Yang)——身体随水流的每一次扰动而波动,一个事件的涟漪能瞬间
 * 传遍全身(事件传播的具象化);触手是一条条数据流,能把 request(n) 的暗号沿
 * 触手逆流传回源头。她慢条斯理,从不主动伸手去够食物。口头禅「别去取,等它来。」,
 * 副口头禅「阻塞是一种浪费,等待不是。」(对标特米的"man 一下"、焰焰的"先热身")。
 *
 * 联动钩子:JVM 线焰焰从烘豆炉通风口递来虚拟线程视角(卷四正面对照"响应式 vs
 * 虚拟线程还值不值");特米(CLI 线)递 wrk/ab 压测命令与 traceId;豆豆(主线)
 * 继续当"午高峰十万订单"的流量发生器,专门制造背压事故。
 * 本线独有深度栏目:🌊 数据流台(把每个操作符画成流的弹珠图 marble diagram,
 * 时间从左到右、每颗弹珠是一个信号)+ ⚡ 背压演练(生产快消费慢时到底会怎样,
 * 给可复现的 request(n) 观测)。
 * 立场:讲清响应式到底解决什么、什么时候坚决别用它——不吹不黑。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const REACTIVE_SERIES_META = {
  slug: "reactive-academy",
  title: "从零开始玩响应式",
  alias: "阿零与漾漾 · 数据流台",
  tagline:
    "命令式教你一步步「取了再等」,这一部带阿零钻进数据流——用 Project Reactor / Spring WebFlux 把咖啡站高并发下单链路改成全异步非阻塞,看懂响应式到底解决什么、什么时候坚决别用它,并和 Java 25 虚拟线程正面对照。不吹不黑。",
  project: "把咖啡站高并发下单链路改造成全异步非阻塞",
  storageKey: "reactive-academy:completed",
} as const;

export const REACTIVE_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "RX1",
    title: "为什么要响应式",
    subtitle: "阻塞天花板下的觉醒",
    goal: "先讲清「没有它会怎样」:看穿 thread-per-request 的线程天花板,从命令式的「取」转向声明式的「等它来」,认识 Reactive Streams 四接口与 Mono/Flux,亲手点亮第一条响应式管道。",
    covers: ["阻塞模型与声明式", "Reactive Streams 规范", "Mono 与 Flux"],
    episodes: [
      { season: 1, episode: 1, title: "排队排到关门", summary: "thread-per-request 的线程天花板:每位顾客占一个咖啡师从头等到尾,200 个咖啡师伺候不了十万人,漾漾从水景池里浮出来。", chapterType: "comic", projectStage: "看懂下单链路为何一压就雪崩", technologies: ["thread-per-request", "线程池", "阻塞 I/O"], jobSkills: ["并发模型"], status: "planned" },
      { season: 1, episode: 2, title: "别去取,等它来", summary: "命令式到声明式的转变:阿零习惯挨个下命令取结果,漾漾教他改成「描述一条流水线,数据自己流过来」,主动权反转。", chapterType: "comic", projectStage: "第一段声明式伪代码", technologies: ["命令式 vs 声明式", "数据流", "订阅"], jobSkills: ["响应式思维"], status: "planned" },
      { season: 1, episode: 3, title: "回调套回调的套娃", summary: "第一次遇到回调地狱:为不阻塞而层层嵌套回调,五层缩进缩成金字塔,错误处理散落各层,异步的第一口苦头。", chapterType: "comic", projectStage: "回调版异步链路(反面教材)", technologies: ["callback", "回调地狱", "CompletableFuture 对照"], jobSkills: ["异步编程"], status: "planned" },
      { season: 1, episode: 4, title: "四张契约卡", summary: "Reactive Streams 规范四接口定义「你要多少我给多少」的拉取契约,漾漾把 request(n) 画成触手逆流传回源头的暗号。", chapterType: "reference", projectStage: "看懂标准背后的四张契约", technologies: ["Publisher", "Subscriber", "Subscription", "request(n)"], jobSkills: ["Reactive Streams 规范"], status: "planned" },
      { season: 1, episode: 5, title: "一滴水与一整条河", summary: "Mono 与 Flux 的区别:Mono 最多一滴(0/1),Flux 是奔流(0..N),漾漾一条触手滴水、一条触手喷泉,信号只有三种。", chapterType: "comic", projectStage: "订单查询返回 Mono/Flux", technologies: ["Mono", "Flux", "onNext/onError/onComplete"], jobSkills: ["Project Reactor"], status: "planned" },
      { season: 1, episode: 6, title: "按下才播的录像带", summary: "冷热流的区别:冷流每个订阅者从头放一遍录像带,热流是直播不等人,错过就错过——share/publish 决定水龙头共不共用。", chapterType: "comic", projectStage: "分清查询流与事件流", technologies: ["冷流/热流", "ConnectableFlux", "share"], jobSkills: ["Project Reactor"], status: "planned" },
      { season: 1, episode: 7, title: "点亮第一条管道", summary: "卷终综合战:把菜单查询串成一条 Mono/Flux 管道,直到 subscribe 才真正流动,漾漾演示「装配」与「执行」两阶段。", chapterType: "project", projectStage: "第一条响应式管道 · reactive-v1 管道点亮", technologies: ["subscribe", "装配阶段", "综合"], jobSkills: ["Project Reactor"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "RX2",
    title: "操作符与组合",
    subtitle: "把流拧成想要的形状",
    goal: "流的塑形术:辨清 map/flatMap/concatMap 的坑,掌握过滤聚合、错误处理三件套、重试超时、多流组合与调度器切换,最后用 StepVerifier 给异步流做体检,把整条下单链路改成全响应式。",
    covers: ["变换与组合操作符", "错误处理与重试", "调度器与测试"],
    episodes: [
      { season: 2, episode: 1, title: "flatMap 打乱了出杯顺序", summary: "map/flatMap/concatMap 的坑:map 一对一变形、flatMap 并发但乱序、concatMap 保序却慢,阿零因顺序翻车。", chapterType: "comic", projectStage: "下单步骤用对变换操作符", technologies: ["map", "flatMap", "concatMap"], jobSkills: ["响应式操作符"], status: "planned" },
      { season: 2, episode: 2, title: "筛豆子与堆报表", summary: "过滤与聚合:filter/take/distinct 给流做减法,reduce/collectList 把流收成一个结果,漾漾用滤网和量杯演示。", chapterType: "comic", projectStage: "订单流的筛选与汇总", technologies: ["filter", "collectList", "reduce"], jobSkills: ["响应式操作符"], status: "planned" },
      { season: 2, episode: 3, title: "一杯坏咖啡怎么办", summary: "错误处理三件套:onErrorReturn 给替代品、onErrorResume 换备用线、onErrorMap 翻译成业务异常,错误也是信号。", chapterType: "comic", projectStage: "下单链路的错误兜底", technologies: ["onErrorReturn", "onErrorResume", "onErrorMap"], jobSkills: ["响应式错误处理"], status: "planned" },
      { season: 2, episode: 4, title: "重试三次还是等到超时", summary: "重试与超时:retryWhen 带退避地重试,timeout 到点放弃,漾漾演示「等待有度,别死等」,阻塞是浪费、等待不是。", chapterType: "comic", projectStage: "外部调用加重试与超时", technologies: ["retryWhen", "timeout", "backoff"], jobSkills: ["弹性与容错"], status: "planned" },
      { season: 2, episode: 5, title: "三条触手拧成一股", summary: "zip/merge 组合多流:zip 等齐配对、merge 谁快谁先、combineLatest 各取最新,漾漾三条触手汇成一股演示多流拼合。", chapterType: "comic", projectStage: "并行取库存与价格再合并", technologies: ["zip", "merge", "combineLatest"], jobSkills: ["响应式组合"], status: "planned" },
      { season: 2, episode: 6, title: "换条水道再干活", summary: "调度器与线程切换:subscribeOn 定源头线程、publishOn 中途换道,漾漾拆穿「响应式默认不换线程」这件反直觉的事。", chapterType: "lab", projectStage: "阻塞调用挪到弹性调度器", technologies: ["Schedulers", "subscribeOn", "publishOn"], jobSkills: ["响应式调度"], status: "planned" },
      { season: 2, episode: 7, title: "给流做体检", summary: "测试响应式:StepVerifier 逐拍断言信号序列,withVirtualTime 把定时器快进,不靠 sleep 也能测异步。", chapterType: "lab", projectStage: "为响应式链路补测试", technologies: ["StepVerifier", "VirtualTimeScheduler", "expectNext"], jobSkills: ["响应式测试"], status: "planned" },
      { season: 2, episode: 8, title: "下单链路全响应式", summary: "卷终:校验→库存→扣款→出票整条下单链用操作符串成一条不阻塞的流,漾漾核对每一处都不再有 block()。", chapterType: "project", projectStage: "下单链路全响应式 · reactive-v2 链路贯通", technologies: ["flatMap", "zip", "StepVerifier", "综合"], jobSkills: ["Spring WebFlux"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "RX3",
    title: "背压与真相",
    subtitle: "生产快、消费慢会怎样",
    goal: "响应式最硬的一课:讲透背压的本质与四种策略、缓冲与丢弃的取舍,复盘一次失衡事故,直面「响应式为什么难 debug」,学会用 Context 逆流传参,最后削峰不再打爆下游。",
    covers: ["背压机制与策略", "失衡事故与排障", "Context 传递"],
    episodes: [
      { season: 3, episode: 1, title: "下游被灌到吐水", summary: "背压是什么:生产快、消费慢,数据在管道里堆成堰塞湖,漾漾第一次讲 request(n) 反向拉取——需求由下游说了算。", chapterType: "comic", projectStage: "看懂下游为何被压垮", technologies: ["背压", "request(n)", "需求驱动"], jobSkills: ["背压机制"], status: "planned" },
      { season: 3, episode: 2, title: "四种泄洪闸", summary: "四种背压策略:BUFFER 蓄洪、DROP 弃新、LATEST 只留最新、ERROR 直接掀桌,漾漾把 onBackpressure 画成四道泄洪闸。", chapterType: "comic", projectStage: "给事件流选背压策略", technologies: ["onBackpressureBuffer", "onBackpressureDrop", "onBackpressureLatest"], jobSkills: ["背压策略"], status: "planned" },
      { season: 3, episode: 3, title: "蓄水池多大才不溢", summary: "缓冲与丢弃的取舍:缓冲保数据但吃内存、丢弃保命但丢单,漾漾用水位线画出临界点,没有免费的午餐。", chapterType: "comic", projectStage: "为缓冲区定容量与告警", technologies: ["缓冲区容量", "有界队列", "丢弃回调"], jobSkills: ["容量规划"], status: "planned" },
      { season: 3, episode: 4, title: "午高峰灌爆下游", summary: "生产者消费者失衡事故:上游秒推十万单、下游每秒千条,无界缓冲吃光内存 OOM——豆豆制造流量,一次真实事故复盘。", chapterType: "incident", projectStage: "复盘一次 OOM 背压事故", technologies: ["无界缓冲", "OOM", "限流"], jobSkills: ["排障", "背压"], status: "planned" },
      { season: 3, episode: 5, title: "涟漪太快看不清", summary: "debug 响应式为什么难:栈帧不连续、断点抓不住流,漾漾教 log()/checkpoint() 给每圈涟漪贴标签。", chapterType: "comic", projectStage: "给链路装上可追踪的标签", technologies: ["log", "checkpoint", "onOperatorDebug"], jobSkills: ["响应式排障"], status: "planned" },
      { season: 3, episode: 6, title: "顺流传下去的暗号", summary: "Context 传递:没有 ThreadLocal 怎么传 traceId?Reactor Context 顺订阅链逆流注入,漾漾画成触手密信。", chapterType: "comic", projectStage: "traceId 顺链路透传", technologies: ["Context", "contextWrite", "traceId"], jobSkills: ["可观测性"], status: "planned" },
      { season: 3, episode: 7, title: "削峰不打爆下游", summary: "卷终:用背压策略 + limitRate + 有界缓冲,把午高峰的洪流削成下游扛得住的细水,漾漾复核 request(n) 全程可控。", chapterType: "project", projectStage: "削峰不再打爆下游 · reactive-v3 削峰稳流", technologies: ["limitRate", "onBackpressureBuffer", "综合"], jobSkills: ["高并发削峰"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "RX4",
    title: "响应式的边界",
    subtitle: "什么时候坚决别用它",
    goal: "最诚实的一卷:WebFlux vs MVC 实测、R2DBC 让数据库也不阻塞、算清调试与观测的隐形成本、在虚拟线程时代重估响应式的价值,讲清何时坚决别用、怎么迁移、心智负担几何,最后做一次不吹不黑的选型复盘。",
    covers: ["WebFlux 与 R2DBC 实测", "虚拟线程对照", "选型与迁移边界"],
    episodes: [
      { season: 4, episode: 1, title: "同一杯咖啡两条产线", summary: "WebFlux vs MVC 实测:同一接口一条 MVC、一条 WebFlux,压测数据摆上台——高并发省线程,低并发它没有优势。", chapterType: "comic", projectStage: "拿到两种模型的压测底账", technologies: ["Spring WebFlux", "Spring MVC", "压测对照"], jobSkills: ["性能评估"], status: "planned" },
      { season: 4, episode: 2, title: "连数据库也不许阻塞", summary: "R2DBC 与响应式数据库:JDBC 一阻塞就前功尽弃,换 R2DBC 让查询也变成 Flux,漾漾警告——一处阻塞,全链皆输。", chapterType: "lab", projectStage: "数据访问层换 R2DBC", technologies: ["R2DBC", "响应式仓储", "非阻塞驱动"], jobSkills: ["响应式数据访问"], status: "planned" },
      { season: 4, episode: 3, title: "看不见的涟漪最贵", summary: "响应式的调试与观测成本:Micrometer 与 tracing 在响应式里怎么埋点、上下文怎么串,漾漾算一笔可观测性的隐形账单。", chapterType: "comic", projectStage: "给链路补齐指标与链路追踪", technologies: ["Micrometer", "tracing", "可观测性成本"], jobSkills: ["可观测性"], status: "planned" },
      { season: 4, episode: 4, title: "虚拟线程来了还值不值", summary: "虚拟线程出现后响应式还值不值:Java 25 虚拟线程让阻塞写法也能扛高并发,焰焰隔通风口对照,一张诚实的决策表。", chapterType: "reference", projectStage: "响应式 vs 虚拟线程决策表", technologies: ["虚拟线程", "结构化并发", "选型对照"], jobSkills: ["技术选型"], status: "planned" },
      { season: 4, episode: 5, title: "坚决别用的那些场景", summary: "什么时候坚决别用:简单 CRUD、团队不熟、强事务与调用少——漾漾罕见地劝退,「响应式不是银弹」。", chapterType: "comic", projectStage: "画出不该上响应式的红线", technologies: ["适用边界", "反模式", "简单 CRUD"], jobSkills: ["工程判断"], status: "planned" },
      { season: 4, episode: 6, title: "一半阻塞一半流", summary: "迁移的中间态:老系统不可能一夜全响应式,漾漾教在边界处用 block()/fromCallable 收口,而不污染整条链。", chapterType: "comic", projectStage: "老链路的渐进式迁移", technologies: ["block", "fromCallable", "边界隔离"], jobSkills: ["架构演进"], status: "planned" },
      { season: 4, episode: 7, title: "脑子里的隐形账单", summary: "心智负担的真实成本:学习曲线、调试难度、招人门槛,漾漾把团队的心智负担折成真金白银摆上台面。", chapterType: "comic", projectStage: "把心智成本纳入选型账", technologies: ["心智负担", "团队成本", "维护性"], jobSkills: ["技术管理"], status: "planned" },
      { season: 4, episode: 8, title: "一次诚实的选型复盘", summary: "全卷终:回看整条改造,列出该用与不该用的边界与证据,漾漾把「水种」交给阿零——学会自己判断,而非跟风。", chapterType: "project", projectStage: "一次诚实的选型复盘 · reactive-v4 响应式大成", technologies: ["选型复盘", "决策表", "综合"], jobSkills: ["技术决策"], status: "planned" },
    ],
  },
];

export function reactiveAllEpisodes(): JavaEpisode[] {
  return REACTIVE_SEASONS.flatMap((s) => s.episodes);
}

export function reactivePublishedEpisodes(): JavaEpisode[] {
  return reactiveAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
