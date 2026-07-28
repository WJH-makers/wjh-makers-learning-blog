/**
 * 《从零开始考质量》· 阿零的测试工程手记(路由 /qa,slug 前缀 qa)。
 *
 * 与咖啡站宇宙同线:Java 线 v7 上云、CLI 线部署大闭环、JVM 线后厨换代之后,
 * 豆豆咖啡站第一次栽的跟头不是“不会写”,而是“不敢改”——祖传定价函数没人敢碰,
 * 一改就得全站手工回归两小时。新导师啄木鸟「叩叩」(Kou)从窗外飞进来:
 * 喙尖敲三下,就能听出木头里空心的位置(缺陷探测的具象化);爪子上挂着一串
 * “虫标本”,每一只都是曾经真上过线的 bug,按品种钉牌分类(空指针、边界、时序、
 * 并发、编码);写任何一段代码之前,他先写一句“这段会怎么坏”。
 * 口头禅「**敲一敲,虫自现。**」;副口头禅「没被测过的代码,只是恰好还没坏。」
 *
 * 本线立场(与“补覆盖率”划清界限):测试工程的产出不是绿灯,是**修改代码的胆量**。
 * 每一话都必须回答同一个问题——这条测试买回了什么自由,又值不值这份维护成本。
 *
 * 联动钩子:豆豆客串“混乱制造机”(专造脏数据、重复下单与午高峰并发),
 * 毒舌照旧但不当导师;特米(CLI 线)从流水线日志里 grep 出 flaky 用例,
 * 甩一句“man 一下”;焰焰(JVM 线)在“性能进 CI”一话递 JFR 观测口径,
 * 与叩叩互相拆台(“先热身再起飞” vs “先敲一敲”);卷终的质量门禁挂到
 * build 线格叔的流水线上,两条线共用一份检查点版本链。
 * 本线独有深度栏目:🐛 缺陷解剖台(把一个真实 bug 剖到根因层,绝不停在“改好了”)
 * + 🎯 测什么不测什么(每话明确画出投入产出边界,防止全量测试式的自我感动)。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const QA_SERIES_META = {
  slug: "qa-academy",
  title: "从零开始考质量",
  alias: "阿零与叩叩 · 质量防线",
  tagline: "别的连载教你把功能写出来,这一部教你把它敲一遍——测试不是为了覆盖率好看,是为了你敢动那行没人敢动的代码。",
  project: "给豆豆咖啡站建一条挡得住事故的质量防线",
  storageKey: "qa-academy:completed",
} as const;

export const QA_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "Q1",
    title: "测试基本功",
    subtitle: "把红灯变成胆量",
    goal: "先搞清测试到底在换什么,再把 JUnit 5、AssertJ、参数化、Given-When-Then 一次性练成肌肉记忆,最后回头改设计——让代码本身变得可测。",
    covers: ["JUnit 5 与生命周期", "AssertJ 与参数化", "可测性设计"],
    episodes: [
      { season: 1, episode: 1, title: "没人敢动的那行代码", summary: "测试换回来的是改代码的胆量:阿零盯着祖传定价函数一个字符都不敢改,叩叩敲了三下,整块木头传出空心的回声。", chapterType: "comic", projectStage: "认清咖啡站的第一处空心", technologies: ["回归测试", "变更成本"], jobSkills: ["测试思维"], status: "planned" },
      { season: 1, episode: 2, title: "质检台的四个抽屉", summary: "JUnit 5 生命周期:@BeforeEach 是每杯咖啡前擦一次台,@BeforeAll 是开店前烧一次锅炉,顺序摆错整批出品串味。", chapterType: "comic", projectStage: "第一个 JUnit 5 测试类落地", technologies: ["JUnit 5", "@Test", "@BeforeEach", "@AfterAll"], jobSkills: ["单元测试"], status: "planned" },
      { season: 1, episode: 3, title: "会说人话的断言", summary: "AssertJ 链式断言:assertTrue 失败只吐 false,像质检报告只写“不合格”;assertThat 把期望与实际摆上台。", chapterType: "comic", projectStage: "断言全面换成 AssertJ", technologies: ["AssertJ", "assertThat", "软断言"], jobSkills: ["单元测试"], status: "planned" },
      { season: 1, episode: 4, title: "一张豆单喂饱二十个用例", summary: "参数化与数据驱动:复制粘贴出的二十个用例改一次规则全作废,@ParameterizedTest 把用例做成可换的豆单,边界值排排坐。", chapterType: "comic", projectStage: "价格规则用例参数化", technologies: ["@ParameterizedTest", "@CsvSource", "@MethodSource"], jobSkills: ["数据驱动测试"], status: "planned" },
      { season: 1, episode: 5, title: "用例名就是事故报告", summary: "Given-When-Then 与 @DisplayName:用例名叫 test1,红灯亮了还得翻源码猜案情;好名字让报告自己交代现场。", chapterType: "comic", projectStage: "测试命名与结构统一", technologies: ["Given-When-Then", "@DisplayName", "@Nested"], jobSkills: ["测试可维护性"], status: "planned" },
      { season: 1, episode: 6, title: "金字塔倒过来会压死谁", summary: "测试金字塔与倒金字塔的代价:反馈时长、维护成本、定位精度三根柱子摆成决策表,叩叩掏出被 UI 测试拖垮的虫标本。", chapterType: "reference", projectStage: "定下各层用例配比", technologies: ["测试金字塔", "测试分层"], jobSkills: ["测试策略"], status: "planned" },
      { season: 1, episode: 7, title: "焊死的咖啡机", summary: "可测性设计:把 now()、new Random()、静态单例直接焊进方法里,机器就永远拆不开;依赖注入的真正理由是留一个能换零件的接口。", chapterType: "comic", projectStage: "核心域拆出可替换接缝", technologies: ["依赖注入", "接缝设计", "构造器注入"], jobSkills: ["可测性设计"], status: "planned" },
      { season: 1, episode: 8, title: "第一道防线亮灯", summary: "卷终:点单、定价、库存三个核心域补齐单元测试基线,墙上第一次挂起绿灯板,阿零敢改那行祖传代码了。", chapterType: "project", projectStage: "核心域测试基线上线 · qa-v1 单元测试基线", technologies: ["JUnit 5", "AssertJ", "综合"], jobSkills: ["单元测试", "测试策略"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "Q2",
    title: "隔离的艺术",
    subtitle: "替身、真容器与可控世界",
    goal: "把不可控的世界一件件按住:五种测试替身各就各位,Mockito 用到刚好、不用过头,真数据库靠 Testcontainers 请进测试,时间与随机数交出遥控器。",
    covers: ["测试替身与 Mockito", "Testcontainers", "契约与集成的分界"],
    episodes: [
      { season: 2, episode: 1, title: "五个替身演员", summary: "Dummy/Stub/Spy/Fake/Mock 五种替身站成一排试镜:有的只是凑人数,有的照本念台词,有的偷偷记账,叩叩逐个钉上名牌。", chapterType: "comic", projectStage: "外部依赖第一次被替身接管", technologies: ["测试替身", "Stub", "Fake", "Spy"], jobSkills: ["测试隔离"], status: "planned" },
      { season: 2, episode: 2, title: "叩叩的提线木偶", summary: "Mockito:when/thenReturn 教木偶念台词,verify 查它干没干活;@MockitoBean 换掉容器里的真零件。", chapterType: "lab", projectStage: "支付网关换成受控替身", technologies: ["Mockito", "when/thenReturn", "verify", "@MockitoBean"], jobSkills: ["Mock 框架"], status: "planned" },
      { season: 2, episode: 3, title: "全绿的谎言", summary: "过度 mock 的反噬:一套 100% 通过的测试护送必然 NPE 的版本上线——mock 把“我以为的接口契约”固化成了测试里的既成事实。", chapterType: "incident", projectStage: "拆掉一层假的安全感", technologies: ["过度 mock", "契约漂移", "根因分析"], jobSkills: ["测试隔离", "排障"], status: "planned" },
      { season: 2, episode: 4, title: "把真数据库搬进测试", summary: "Testcontainers:内存库冒充 PostgreSQL 的方言差异专挑上线当天现形,不如一次性起个真容器,测完即焚。", chapterType: "lab", projectStage: "集成测试连上真容器数据库", technologies: ["Testcontainers", "PostgreSQL", "@DynamicPropertySource"], jobSkills: ["集成测试"], status: "planned" },
      { season: 2, episode: 5, title: "冻住时钟,拔掉网线", summary: "时间、随机、网络的可控化:Clock 注入让“月底最后一秒”随叫随到,固定种子的随机数不再抽风,外部 HTTP 交给可编程的假服务器。", chapterType: "comic", projectStage: "不确定性全部接上遥控器", technologies: ["Clock", "固定种子", "HTTP 打桩"], jobSkills: ["测试隔离"], status: "planned" },
      { season: 2, episode: 6, title: "哪一层该握手", summary: "契约与集成的分界:同一次调用测两遍是浪费,一遍不测是裸奔;一张决策表说清谁验协议、谁验行为、谁验连通。", chapterType: "reference", projectStage: "画出测试职责边界图", technologies: ["集成测试", "契约边界", "测试范围"], jobSkills: ["测试策略"], status: "planned" },
      { season: 2, episode: 7, title: "跑在真依赖上的那趟车", summary: "卷终:订单主链路的集成测试全部跑在真容器依赖上,叩叩把三只“只有真库才抓得到”的虫钉进标本串。", chapterType: "project", projectStage: "集成测试跑在真依赖上 · qa-v2 真依赖集成", technologies: ["Testcontainers", "Mockito", "综合"], jobSkills: ["集成测试", "测试隔离"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "Q3",
    title: "流水线上的质量",
    subtitle: "把关口修在路上",
    goal: "测试从本地搬进 CI 就换了一套物理规律:耗时是预算、flaky 是慢性病、覆盖率是一把会骗人的尺子;这一卷把关口修在路上,最后立起真能拦车的门禁。",
    covers: ["CI 分层与 flaky 治理", "覆盖率与静态分析", "契约测试与发布门禁"],
    episodes: [
      { season: 3, episode: 1, title: "十二分钟的耐心", summary: "CI 里的测试分层与耗时预算:开发者只等得起十分钟,超过就没人再看红灯;快慢分道、按变更范围选择性触发。", chapterType: "comic", projectStage: "流水线拆出快慢两条测试道", technologies: ["CI 分层", "耗时预算", "并行执行"], jobSkills: ["CI/CD"], status: "planned" },
      { season: 3, episode: 2, title: "薛定谔的红灯", summary: "flaky 治理:同一个 commit 重跑三次三种结果,元凶是共享状态、时序假设、随机端口;叩叩定下“三次重试仍绿也算病”的铁律。", chapterType: "incident", projectStage: "flaky 用例隔离与归零", technologies: ["flaky 测试", "测试隔离性", "重试策略"], jobSkills: ["CI/CD", "排障"], status: "planned" },
      { season: 3, episode: 3, title: "覆盖率 92% 的裸奔", summary: "行覆盖只证明代码被执行过,没证明被验证过:把所有断言删光,覆盖率一分不掉——叩叩当场演示这场骗局,再讲它真正的用法。", chapterType: "comic", projectStage: "覆盖率从考核指标降为体检项", technologies: ["JaCoCo", "行/分支覆盖", "断言缺失"], jobSkills: ["质量度量"], status: "planned" },
      { season: 3, episode: 4, title: "让架构自己站岗", summary: "静态分析与架构测试:分层依赖倒挂、包引用越界这类问题人眼永远看不完,写成可执行规则让它每次提交自己敲自己。", chapterType: "lab", projectStage: "架构约束变成会亮红灯的测试", technologies: ["ArchUnit", "静态分析", "分层约束"], jobSkills: ["架构治理"], status: "planned" },
      { season: 3, episode: 5, title: "两张对不上的菜单", summary: "契约测试(Pact 思想):消费者写下“我需要这几个字段”,提供方拿契约自测,双方各跑各的一半,不必凑齐全套系统。", chapterType: "comic", projectStage: "前后端之间立下可执行契约", technologies: ["消费者驱动契约", "Pact 思想", "契约验证"], jobSkills: ["契约测试"], status: "planned" },
      { season: 3, episode: 6, title: "E2E 的配额", summary: "E2E 该有多少:每条端到端用例都是要按月缴费的资产,一张配额表定下“只留能覆盖钱路径的那几条”。", chapterType: "reference", projectStage: "E2E 用例削到配额之内", technologies: ["E2E 测试", "关键路径", "维护成本"], jobSkills: ["测试策略"], status: "planned" },
      { season: 3, episode: 7, title: "门禁不是刹车是护栏", summary: "发布门禁与质量卡点:阈值怎么定、谁能豁免、豁免如何留痕——门禁一旦人人绕行,就退化成流水线上的装饰灯。", chapterType: "lab", projectStage: "质量卡点与豁免留痕机制", technologies: ["质量门禁", "阈值设计", "流水线卡点"], jobSkills: ["CI/CD", "质量治理"], status: "planned" },
      { season: 3, episode: 8, title: "红灯拦下的那次发布", summary: "卷终:门禁上线第一周就拦下一次带着契约破坏的发布,豆豆气急败坏,叩叩把这只虫钉在最显眼的位置。", chapterType: "project", projectStage: "质量门禁上线并首次拦车 · qa-v3 质量门禁", technologies: ["CI 门禁", "契约测试", "综合"], jobSkills: ["CI/CD", "质量治理"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "Q4",
    title: "更高阶的把握",
    subtitle: "从被动验证到主动逼问",
    goal: "测试从“验证已写的代码”翻转成“逼问系统的底线”:TDD 改造设计、变异测试审判测试、属性与模糊测试穷举意外,最后把性能、安全、混沌与度量一起焊进流水线。",
    covers: ["TDD 与变异测试", "属性测试与模糊测试", "混沌工程与质量度量"],
    episodes: [
      { season: 4, episode: 1, title: "先写一台不存在的咖啡机", summary: "TDD 真正解决的不是“补测试”,是设计反馈与“何时算写完”:红-绿-重构三步走一遍,接口被测试倒逼着变干净。", chapterType: "lab", projectStage: "新功能用 TDD 从零长出来", technologies: ["TDD", "红绿重构", "测试先行设计"], jobSkills: ["TDD"], status: "planned" },
      { season: 4, episode: 2, title: "谁来测你的测试", summary: "变异测试:偷偷把 > 改成 >=、把 return 换成 null,测试若依旧全绿,说明这套测试只是在陪跑而不是在把关。", chapterType: "comic", projectStage: "核心域测试自身被审判一次", technologies: ["变异测试", "变异分数", "PIT 思想"], jobSkills: ["测试有效性"], status: "planned" },
      { season: 4, episode: 3, title: "一万种奇怪的订单", summary: "属性测试与模糊测试:不再一条条举例子,而是声明“对任意输入,这条不变量都得成立”,让框架自己造出你没想过的输入。", chapterType: "lab", projectStage: "关键算法挂上不变量守卫", technologies: ["属性测试", "不变量", "模糊测试", "收缩反例"], jobSkills: ["高级测试技术"], status: "planned" },
      { season: 4, episode: 4, title: "把秒表和门锁焊进流水线", summary: "性能与安全进 CI:性能只看趋势不看绝对值(CI 机器本来就抖),依赖漏洞扫描按严重级卡门,焰焰从 JVM 线递来观测口径。", chapterType: "comic", projectStage: "性能基线与依赖扫描进门禁", technologies: ["性能基线", "依赖漏洞扫描", "趋势对比"], jobSkills: ["CI/CD", "安全左移"], status: "planned" },
      { season: 4, episode: 5, title: "故意拔掉的那根线", summary: "混沌工程入门:计划内注入 300ms 延迟做演习,结果先炸出一个真实缺陷——稳态假设、爆炸半径、随时中止三条纪律缺一不可。", chapterType: "incident", projectStage: "第一次受控故障演习", technologies: ["混沌工程", "稳态假设", "爆炸半径"], jobSkills: ["韧性工程"], status: "planned" },
      { season: 4, episode: 6, title: "记分牌上写什么", summary: "质量度量:逃逸缺陷率、平均恢复时长(MTTR)、变更失败率各自能回答什么、又会诱发什么样的作弊,一张表定下记分规则。", chapterType: "reference", projectStage: "质量记分牌上墙", technologies: ["逃逸缺陷率", "MTTR", "变更失败率"], jobSkills: ["质量度量"], status: "planned" },
      { season: 4, episode: 7, title: "一次没人屏住呼吸的发布", summary: "全线终章:发版按钮按下去,没人守夜、没人回滚;叩叩把整串虫标本挂到墙上,把喙上的第一下敲击交给阿零。", chapterType: "project", projectStage: "零回滚发布 · qa-v4 质量大成", technologies: ["综合", "质量防线", "发布流程"], jobSkills: ["质量工程", "测试策略"], status: "planned" },
    ],
  },
];

export function qaAllEpisodes(): JavaEpisode[] {
  return QA_SEASONS.flatMap((s) => s.episodes);
}

export function qaPublishedEpisodes(): JavaEpisode[] {
  return qaAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
