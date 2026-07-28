/**
 * 《从零开始画架构》· 咖啡站规划院(slug 前缀 arch)。
 *
 * 与咖啡站宇宙同线:《拆微服务》教会阿零"怎么拆",可连锁开到第五家时,一次
 * "为拆而拆"把订单域切成两半,赔进去整整一个月的账。豆豆把阿零赶到上游河湾,
 * 那里住着海狸「筑叔」(Zhu):嘴里永远叼着一根刻度磨平的标尺,建坝前先画
 * 三张图(约束图 / 边界图 / 取舍图)才肯动第一根树枝;随身一架"取舍天平",
 * 左盘放收益、右盘放代价,称不平就不许开工;每做一个决定都刻一块石板压在
 * 坝体里(ADR),十年后还能翻出来问一句"当年为什么"。口头禅「**先问:拆了,
 * 谁受益?**」,副口头禅「架构不是画出来的,是被约束逼出来的。」
 *
 * 定位:与《从零开始拆微服务》互为镜像——那条线教怎么拆干净,这条线教
 * **该不该拆**;奥朵拿手术刀,筑叔按住手术刀。奥朵在卷三客串"急着开刀的
 * 外科医生",两人在拆分决策上正面对撞;豆豆升格为出题的甲方(需求与账本
 * 都归她);特米(CLI 线)在架构守护一话从流水线里递依赖检查命令。
 * 本线独有深度栏目:⚖️ 取舍天平(每个决策必须写清"放弃了什么",只写收益
 * 不写代价的一律打回)+ 📐 ADR 存档(每话产出一份可归档的架构决策记录:
 * 背景 / 备选 / 决定 / 后果 / 复审触发条件)。
 * 长期项目:豆豆咖啡站从一家店到连锁的架构演进(arch-v1 → arch-v5)。
 * 基线 Java 25 LTS / Spring Boot 4.x / jakarta。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const ARCH_SERIES_META = {
  slug: "arch-academy",
  title: "从零开始画架构",
  alias: "阿零与筑叔 · 咖啡站规划院",
  tagline: "《拆微服务》教你把咖啡站拆干净,这一部先按住你的手:跟着海狸筑叔从需求画到大图,每个决策都上一次取舍天平、留一份 ADR——架构不是画出来的,是被约束逼出来的。",
  project: "豆豆咖啡站从一家店到连锁的架构演进",
  storageKey: "arch-academy:completed",
} as const;

export const ARCH_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "A1",
    title: "从需求到模型",
    subtitle: "先画三张图",
    goal: "不写一行业务代码的一卷:把「顾客想要什么」翻译成约束、质量属性与领域模型——统一语言、限界上下文、聚合边界,先让所有人对同一个词说同一件事。",
    covers: ["约束与质量属性", "统一语言与限界上下文", "聚合与事件风暴"],
    episodes: [
      { season: 1, episode: 1, title: "坝上来客", summary: "架构的第一性:需求列不出架构,约束才能。筑叔用标尺量出延迟、成本、团队人数三根硬杆,再把「要快要稳还要便宜」摆上取舍天平称给阿零看。", chapterType: "comic", projectStage: "写下咖啡站的三条硬约束", technologies: ["质量属性", "约束驱动设计", "ATAM"], jobSkills: ["架构思维"], status: "planned" },
      { season: 1, episode: 2, title: "一杯咖啡的九个名字", summary: "统一语言:店员喊「大杯」、代码写 LARGE、财务记「473ml」,促销结算当场对不上账;筑叔把三本词典钉成一本,术语从此只许有一个户口。", chapterType: "comic", projectStage: "统一语言词典 v0", technologies: ["Ubiquitous Language", "领域词典", "DDD"], jobSkills: ["领域建模"], status: "planned" },
      { season: 1, episode: 3, title: "地板上的粉笔线", summary: "限界上下文:筑叔在店里划粉笔线,同一个「订单」在点单区是购物车、在配送区是运单——同名不同物,才是一切拆分讨论的真起点。", chapterType: "comic", projectStage: "画出四个限界上下文", technologies: ["Bounded Context", "上下文映射", "防腐层"], jobSkills: ["领域建模"], status: "planned" },
      { season: 1, episode: 4, title: "必须一口气改完的那一堆", summary: "聚合与一致性边界:扣库存和出杯必须同一笔事务落地,积分可以慢半拍;筑叔用一根绳圈出聚合根,绳外的东西一律只准记 ID。", chapterType: "comic", projectStage: "圈定订单聚合边界", technologies: ["聚合根", "一致性边界", "业务不变式"], jobSkills: ["领域建模"], status: "planned" },
      { season: 1, episode: 5, title: "贴满墙的橙色便利贴", summary: "事件风暴实操:三色贴纸两小时铺满后墙,橙色事件排成时间线、蓝色命令找出发起人、粉色热点专收吵架的地方——边界不是想出来的,是贴出来的。", chapterType: "lab", projectStage: "一场完整事件风暴的产出物", technologies: ["EventStorming", "领域事件", "热点标记"], jobSkills: ["领域建模", "需求分析"], status: "planned" },
      { season: 1, episode: 6, title: "只有 getter 的空壳", summary: "贫血模型的代价:会员折扣规则散在六个 Service 里,改价那天漏改三处,同一杯拿铁卖出三个价;筑叔顺着调用链把规则一条条搬回对象内部。", chapterType: "incident", projectStage: "折扣规则收归领域对象", technologies: ["贫血模型", "充血模型", "领域服务"], jobSkills: ["领域建模", "重构"], status: "planned" },
      { season: 1, episode: 7, title: "立起第一根柱子", summary: "卷终:四个上下文 + 三个聚合 + 一本词典拼出咖啡站领域模型,墙上挂起第一批 ADR 石板,天平留下本线第一条记录——「先不拆,先建模」。", chapterType: "project", projectStage: "咖啡站领域模型定稿 · arch-v1 领域地基", technologies: ["领域模型", "上下文映射图", "ADR"], jobSkills: ["领域建模", "架构设计"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "A2",
    title: "接口的契约",
    subtitle: "菜单即承诺",
    goal: "接口一旦对外就是承诺:资源建模、REST 的正解、风格选型、版本兼容与契约先行,让咖啡站的菜单三年后还认得出老顾客手里的旧小票。",
    covers: ["资源建模与 REST", "gRPC / GraphQL 选型", "版本化与契约测试"],
    episodes: [
      { season: 2, episode: 1, title: "菜单就是接口", summary: "API 设计原则与资源建模:菜单是顾客唯一看得见的契约;筑叔把「后厨怎么做」和「顾客怎么点」拆成两张纸——接口暴露能力,绝不暴露表结构。", chapterType: "comic", projectStage: "订单资源模型第一版", technologies: ["资源建模", "REST", "OpenAPI"], jobSkills: ["API 设计"], status: "planned" },
      { season: 2, episode: 2, title: "藏在路径里的动词", summary: "REST 的误用与正解:/getOrderById、/doPayNow 把状态机压成一堆远程函数;筑叔用状态迁移表重画路径,顺手讲清幂等性与状态码该怎么挑。", chapterType: "comic", projectStage: "接口从动词改回资源", technologies: ["REST", "幂等性", "HTTP 状态码"], jobSkills: ["API 设计"], status: "planned" },
      { season: 2, episode: 3, title: "三个传菜口", summary: "风格决策表:对外点单口要可读、后厨内网要低延迟、App 首页要一次取全;筑叔把三种传菜口按调用方、载荷、演进成本三栏称上天平,给出默认推荐。", chapterType: "reference", projectStage: "接口风格决策表上墙", technologies: ["gRPC", "GraphQL", "Protobuf"], jobSkills: ["API 设计", "技术选型"], status: "planned" },
      { season: 2, episode: 4, title: "老顾客的旧小票", summary: "版本化与向后兼容:三年前的旧 App 还在按老字段下单;筑叔立下「只加不改、只扩不删」的加法规矩,并给那次不得不破坏的改动排出弃用时刻表。", chapterType: "comic", projectStage: "API 版本策略与弃用时刻表", technologies: ["向后兼容", "API 版本化", "弃用策略"], jobSkills: ["API 设计"], status: "planned" },
      { season: 2, episode: 5, title: "先签合同再开工", summary: "契约先行与文档即代码:契约文件当唯一事实源,前后端各照契约写桩,消费者驱动契约测试挂进流水线——谁改坏了合同,CI 当场亮红灯。", chapterType: "lab", projectStage: "契约测试进流水线", technologies: ["OpenAPI 3.1", "消费者驱动契约测试", "Spring Boot 4"], jobSkills: ["API 设计", "测试"], status: "planned" },
      { season: 2, episode: 6, title: "钉在门口的契约", summary: "卷终:资源模型、错误码表、版本策略、契约测试四件套齐活,对外 API 契约挂上店门;ADR 记下这一卷最贵的一句——「为什么这次没上 GraphQL」。", chapterType: "project", projectStage: "对外 API 契约定稿 · arch-v2 契约成型", technologies: ["OpenAPI", "错误码规范", "ADR"], jobSkills: ["API 设计", "架构设计"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "A3",
    title: "该不该拆",
    subtitle: "本线的正面战场",
    goal: "全线核心一问:拆了谁受益?先量疼痛、再找纹理、算清分布式的隐藏税单,最后只切一刀——并且随时能原路退回来。",
    covers: ["模块化单体", "拆分触发条件与维度", "绞杀者与回退"],
    episodes: [
      { season: 3, episode: 1, title: "被冤枉的大屋", summary: "单体不是原罪:筑叔翻出咖啡站老单体,一屋子房间其实隔得挺好;真正让人喘不过气的是耦合与部署粒度,而不是「它只有一个 jar」。", chapterType: "comic", projectStage: "给单体做一次模块体检", technologies: ["模块化单体", "Spring Modulith", "耦合度量"], jobSkills: ["架构思维"], status: "planned" },
      { season: 3, episode: 2, title: "到底哪里疼", summary: "拆分的真实触发条件:部署排队、故障连坐、团队互相踩脚、伸缩比例失衡;筑叔列出四条可测量的疼痛指标,没量到数就不许提「我们要微服务」。", chapterType: "comic", projectStage: "拆分触发条件清单", technologies: ["部署频率", "变更失败率", "伸缩单元"], jobSkills: ["架构决策"], status: "planned" },
      { season: 3, episode: 3, title: "顺着木纹下斧", summary: "按什么维度拆:团队边界、数据所有权、变更频率三条纹理;筑叔当场演示逆纹劈柴的下场——一条需求要改五个服务,拆完比拆前还慢。", chapterType: "comic", projectStage: "选定拆分维度", technologies: ["康威定律", "变更耦合分析", "数据所有权"], jobSkills: ["架构决策"], status: "planned" },
      { season: 3, episode: 4, title: "月底寄来的账单", summary: "分布式的隐藏税单:网络会断、时钟会歪、调用链要追踪、数据要对账;筑叔把这些「拆完才开始交」的费用逐项列进取舍天平的右盘。", chapterType: "reference", projectStage: "分布式成本清单", technologies: ["网络分区", "分布式追踪", "运维成本"], jobSkills: ["架构决策", "分布式"], status: "planned" },
      { season: 3, episode: 5, title: "缠住老树的藤", summary: "绞杀者模式与演进式迁移:新服务像藤蔓一根根爬上老单体,流量按功能一片片切走,老树掏空了再砍——关键是中途任何一天都能停下来。", chapterType: "comic", projectStage: "第一根绞杀藤上线", technologies: ["Strangler Fig", "流量切换", "灰度发布"], jobSkills: ["迁移策略"], status: "planned" },
      { season: 3, episode: 6, title: "拆到一半的桥", summary: "拆错了怎么退回来:库存服务独立两周,跨服务事务补不上、对账天天差;筑叔按回退预案把它塞回单体,复盘「哪一步本该设检查点」。", chapterType: "incident", projectStage: "一次有序回退", technologies: ["回滚预案", "特性开关", "数据回迁"], jobSkills: ["迁移策略", "排障"], status: "planned" },
      { season: 3, episode: 7, title: "第一刀落下", summary: "卷终:有量化依据的第一次拆分——只切出订单履约一个服务,附拆分前后疼痛指标对照表与回退开关,ADR 写清「其余六个模块为什么不拆」。", chapterType: "project", projectStage: "首个服务独立部署 · arch-v3 首次拆分", technologies: ["服务边界", "特性开关", "ADR"], jobSkills: ["架构决策", "微服务"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "A4",
    title: "数据的架构",
    subtitle: "最难退回的那一层",
    goal: "代码可以重写,数据不能:一致性谱系、事务边界与 Saga、CQRS 的门槛、事件溯源的甜与苦,最后拆掉那个谁都有钥匙的共享库。",
    covers: ["一致性谱系与 Saga", "CQRS 与事件溯源", "数据所有权"],
    episodes: [
      { season: 4, episode: 1, title: "三种等得起", summary: "一致性谱系:找零要强一致、先下单后取消要因果一致、积分到账最终一致就行;筑叔逼阿零给咖啡站每条数据标一个「最多等多久」。", chapterType: "comic", projectStage: "给每条数据标一致性等级", technologies: ["强一致", "因果一致", "最终一致"], jobSkills: ["分布式", "架构决策"], status: "planned" },
      { season: 4, episode: 2, title: "一步三回头的搬运队", summary: "事务边界与 Saga:一笔跨服务下单切成扣券、扣库存、出杯三段,每段配一份反手就能撤的补偿;编排式与协同式两种队形上天平比可观测性。", chapterType: "comic", projectStage: "下单流程改 Saga", technologies: ["Saga", "补偿事务", "Outbox"], jobSkills: ["分布式", "架构设计"], status: "planned" },
      { season: 4, episode: 3, title: "点单口与查账口", summary: "CQRS 何时值得:写侧守不变式、读侧要一次取全;筑叔先立「读写比悬殊 + 两侧模型确实打架」两条门槛,达不到就别拆——多一套读模型多一路故障。", chapterType: "comic", projectStage: "报表读模型独立", technologies: ["CQRS", "读模型", "物化视图"], jobSkills: ["架构决策"], status: "planned" },
      { season: 4, episode: 4, title: "账房先生的流水", summary: "事件溯源的甜与苦:只记流水不记余额,任何时刻都能回放到昨天下午三点;代价是快照、事件版本演进和「删不掉的隐私数据」——苦也得上天平。", chapterType: "comic", projectStage: "订单状态改事件流水", technologies: ["Event Sourcing", "快照", "事件版本演进"], jobSkills: ["架构决策", "分布式"], status: "planned" },
      { season: 4, episode: 5, title: "谁都有钥匙的仓库", summary: "共享库反模式:三个服务共用一张订单表,一次加索引锁表连坐全站;筑叔立下新规矩——库归一个服务所有,别人只准从接口走前门。", chapterType: "incident", projectStage: "拆掉共享数据库", technologies: ["共享数据库反模式", "数据所有权", "视图迁移"], jobSkills: ["数据架构", "排障"], status: "planned" },
      { season: 4, episode: 6, title: "自己管账的订单域", summary: "卷终:订单域拿到独立数据库与 Outbox 出口,一致性等级、Saga 补偿链、回放能力收进同一张数据流图;ADR 记下「为什么最终没上事件溯源」。", chapterType: "project", projectStage: "订单域数据自治 · arch-v4 数据自治", technologies: ["数据自治", "Outbox", "ADR"], jobSkills: ["数据架构", "分布式"], status: "planned" },
    ],
  },
  {
    season: 5,
    code: "A5",
    title: "决策与落地",
    subtitle: "让图纸活下来",
    goal: "把架构从「一个人的想法」变成「组织能执行的约定」:可证伪选型、康威定律、评审规则、遗留迁移,以及会失败的架构测试。",
    covers: ["选型与康威定律", "架构评审与迁移", "架构守护与大图"],
    episodes: [
      { season: 5, episode: 1, title: "三天赛马", summary: "技术选型的可证伪流程:先写下「若 X 成立就选它」的判据,再用限时 spike 去证伪;筑叔最恨先选好再补理由——那不叫选型,叫辩护。", chapterType: "lab", projectStage: "一次可证伪的选型实验", technologies: ["技术选型", "Spike / PoC", "可证伪判据"], jobSkills: ["技术选型", "架构决策"], status: "planned" },
      { season: 5, episode: 2, title: "图纸里的人事表", summary: "康威定律与组织耦合:两个团队跨时区共管一个服务,接口天天吵;筑叔把组织图和架构图叠在灯箱上,不重合的地方全是未来的故障点。", chapterType: "comic", projectStage: "团队与服务边界对齐", technologies: ["康威定律", "逆康威操作", "团队拓扑"], jobSkills: ["架构决策", "协作"], status: "planned" },
      { season: 5, episode: 3, title: "不打架的评审会", summary: "架构评审怎么开:先亮约束和取舍天平再谈方案;三条会规——攻击方案不攻击人、反对必须给替代、决议当场落成 ADR,一小时准时散会。", chapterType: "comic", projectStage: "评审流程与 ADR 模板落地", technologies: ["架构评审", "ADR", "决策记录"], jobSkills: ["架构决策", "协作"], status: "planned" },
      { season: 5, episode: 4, title: "拆迁前先修便桥", summary: "遗留系统的迁移策略:大爆炸重写、绞杀者渐进、并行双跑三条路上天平;筑叔选了双跑对账,老系统连续三十天对得上账之前一天都不许下线。", chapterType: "comic", projectStage: "老系统双跑对账", technologies: ["双跑对账", "Strangler Fig", "迁移回退"], jobSkills: ["迁移策略"], status: "planned" },
      { season: 5, episode: 5, title: "给图纸装护栏", summary: "架构守护:把「domain 不许 import web」这类规则写成会失败的测试挂进 CI;筑叔原话——没被测试守住的架构图,三个月后就是一张壁纸。", chapterType: "lab", projectStage: "架构测试进 CI", technologies: ["ArchUnit", "模块依赖规则", "Spring Modulith"], jobSkills: ["架构守护", "工程化"], status: "planned" },
      { season: 5, episode: 6, title: "挂上大图", summary: "全线收束:C4 四层大图 + 32 份 ADR 索引 + 取舍天平总账挂进规划院;筑叔把标尺递给阿零——往后每一个「拆不拆」,他自己就能称出来。", chapterType: "project", projectStage: "咖啡站架构大图 · arch-v5 架构大图", technologies: ["C4 模型", "ADR 索引", "架构看板"], jobSkills: ["架构设计", "技术领导力"], status: "planned" },
    ],
  },
];

export function archAllEpisodes(): JavaEpisode[] {
  return ARCH_SEASONS.flatMap((s) => s.episodes);
}

export function archPublishedEpisodes(): JavaEpisode[] {
  return archAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
