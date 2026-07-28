/**
 * 《从零开始当工程师》· 职业与软技能线(slug 前缀 career)。
 *
 * 与咖啡站宇宙同世界观:阿零早已能独立交付系统,却在一次"代码没错、事却没做成"
 * 的复盘里第一次意识到——纯技术之外,工程师真正拉开差距的,是沟通、协作、影响力
 * 与选择。此时天上飞来一支雁阵,领头的大雁「领姐」(Ling)落在咖啡站屋檐上:她飞在
 * 雁阵最前面替全队破风,累了就换到队尾跟飞,懂得什么时候领飞、什么时候跟随;翅膀上
 * 驮着一张会不断更新的《成长路线图》,风一吹就翻页。口头禅「技术是船,方向是舵。」,
 * 副口头禅「一个人飞得快,一群人飞得远。」——前者点破"方向比油门重要",后者点破
 * "协作的复利"。
 *
 * 与既有连载的联动钩子:焰焰(JVM 线)负责"把技术钻到底",领姐负责"把技术用对方向",
 * 两者互为船与舵;特米(CLI 线)客串"异步沟通反面教材"(只发'在吗'就消失);豆豆
 * 全程做阿零的第一位"团队成员"与毒舌镜子。本线不与技术线抢知识点:凡涉及具体技术
 * 一律一句话带过并链回对应技术线。
 * 本线独有深度栏目:🧭 路线台(每话给一个可执行的成长动作,不是鸡汤)+ 💬 沟通拆解
 * (把一次真实技术沟通拆成可复用的套路)。铁律:每一话都要落到可执行动作,绝不写空洞鸡汤。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const CAREER_SERIES_META = {
  slug: "career-academy",
  title: "从零开始当工程师",
  alias: "阿零与领姐 · 职场航线",
  tagline: "纯技术之外,工程师真正拉开差距的部分——沟通、协作、影响力、成长与选择。领姐飞在最前面破风,带阿零从'只会写代码'长成'能带着团队把事做成'。每一话都给可执行动作,绝不喂鸡汤。",
  project: "阿零从只会写代码,到带着咖啡站团队把事做成",
  storageKey: "career-academy:completed",
} as const;

export const CAREER_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "C1",
    title: "写给别人看的工程",
    subtitle: "把代码写给人读",
    goal: "把'代码是写给人看的'落到实处:命名、注释、提交、文档、表达、评审六件事,让阿零的产出第一次变得'别人愿意读、乐意合'。",
    covers: ["可读性与命名", "提交与 PR", "文档与表达"],
    episodes: [
      { season: 1, episode: 1, title: "半年后的陌生人", summary: "代码首先写给人读、其次才给机器跑:阿零翻半年前自己写的旧代码像看甲骨文,领姐点破——编译器只是第二读者,真正的甲方是六个月后的你。", chapterType: "comic", projectStage: "把可读性立为团队第一准则", technologies: ["代码可读性", "命名"], jobSkills: ["工程素养"], status: "planned" },
      { season: 1, episode: 2, title: "变量叫 tmp2 的那天", summary: "好命名让代码自解释、注释只补'为什么':满屏 data/tmp/flag 让阿零自己都认不出,领姐教他把注释从'翻译代码'改成'交代意图'。", chapterType: "comic", projectStage: "订单模块命名与注释重构", technologies: ["命名规范", "注释意图"], jobSkills: ["可维护性"], status: "planned" },
      { season: 1, episode: 3, title: "一句 fix bug 引发的血案", summary: "提交信息与 PR 描述是留给未来的考古证据:线上要回滚,一整排'fix bug'让人无从下手,领姐带他把每次提交写成可追溯的线索。", chapterType: "incident", projectStage: "提交历史变成可追溯线索", technologies: ["commit message", "PR 描述"], jobSkills: ["协作规范"], status: "planned" },
      { season: 1, episode: 4, title: "没人看的 README", summary: "技术文档写给'明天要接手的人':阿零的 README 只有一行安装命令,新人照着跑全是坑,领姐给出'读者→目的→最短路径'的文档骨架。", chapterType: "lab", projectStage: "咖啡站有了第一份能用的文档", technologies: ["技术文档", "README 骨架"], jobSkills: ["文档能力"], status: "planned" },
      { season: 1, episode: 5, title: "电梯里的三十秒", summary: "把复杂问题讲简单是真懂的证据:阿零对着老板讲十分钟没人听懂,领姐教他用'一句话结论+一个比喻+一层展开'的电梯讲法收束。", chapterType: "comic", projectStage: "学会向非技术方讲清方案", technologies: ["结论先行", "类比表达"], jobSkills: ["表达力"], status: "planned" },
      { season: 1, episode: 6, title: "评审区的火药味", summary: "代码评审是对事不对人的协作:阿零把'这里能不能改'听成'你写得烂'当场炸毛,领姐拆解评审里'给'与'收'各自的礼貌与分寸。", chapterType: "comic", projectStage: "团队评审有了基本礼仪", technologies: ["code review", "对事不对人"], jobSkills: ["协作沟通"], status: "planned" },
      { season: 1, episode: 7, title: "一次让人愿意合并的 PR", summary: "卷终综合:把命名/注释/提交/自审串成完整的 PR,reviewer 十分钟就愿意点 Approve,阿零第一次收到'这 PR 真舒服'。", chapterType: "project", projectStage: "career-v1 让人愿意合并的 PR", technologies: ["PR 工作流", "综合"], jobSkills: ["工程素养", "协作"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "C2",
    title: "协作与沟通",
    subtitle: "把话说清把事说成",
    goal: "从'一个人闷头写'升级到'一群人把事说清楚':搞懂需求为何变、怎么问出真需求、怎么估时、怎么向上向下同步、异步礼仪与如何吵架不伤人。",
    covers: ["需求与估时", "向上向下同步", "冲突与共识"],
    episodes: [
      { season: 2, episode: 1, title: "会变的才叫需求", summary: "需求天生会变,与其对抗不如设计得可改:产品第三次改字段让阿零掀桌,领姐说需求像天气不是敌人,教他把'抗变'换成'留接口'。", chapterType: "comic", projectStage: "把可变点隔离成设计习惯", technologies: ["需求变更", "可扩展设计"], jobSkills: ["需求管理"], status: "planned" },
      { season: 2, episode: 2, title: "他要的不是钻头", summary: "用户要的是墙上的洞不是钻头:阿零照一句话需求做完被打回,领姐带他用'为什么/给谁/不做什么'三连问,挖出话背后的真目标。", chapterType: "comic", projectStage: "接需求先问出真目标", technologies: ["需求澄清", "五问法"], jobSkills: ["需求分析"], status: "planned" },
      { season: 2, episode: 3, title: "「两天」的诅咒", summary: "估时错在只算顺利路径:阿零随口一句'两天搞定'拖成两周,领姐教他把任务拆到能估的粒度,给区间和不确定性,而不是拍脑袋一个数。", chapterType: "comic", projectStage: "学会给带区间的估时", technologies: ["任务拆解", "估时区间"], jobSkills: ["项目估算"], status: "planned" },
      { season: 2, episode: 4, title: "老板不是不关心", summary: "向上同步给结论与风险、向下同步给背景与边界:阿零埋头干三周老板全程不知情,领姐给出'进展/风险/需要什么'的三段式同步模板。", chapterType: "comic", projectStage: "建立向上向下的同步节奏", technologies: ["向上管理", "信息同步"], jobSkills: ["沟通协作"], status: "planned" },
      { season: 2, episode: 5, title: "一句「在吗」的代价", summary: "异步沟通要把上下文一次给全:阿零发完'在吗'就消失把同事阻塞半天,领姐立下异步礼仪——一条消息说清背景、问题、已试过什么、期望回复时限。", chapterType: "reference", projectStage: "团队约定异步沟通礼仪", technologies: ["异步沟通", "上下文自足"], jobSkills: ["远程协作"], status: "planned" },
      { season: 2, episode: 6, title: "为一个括号吵三天", summary: "技术争论要先对齐目标再谈方案:阿零和同事为大括号换行吵到面红,领姐把争论拉回'我们到底想优化什么',用可验证判据代替嗓门。", chapterType: "comic", projectStage: "技术争论回到目标与判据", technologies: ["技术争论", "共识收敛"], jobSkills: ["冲突处理"], status: "planned" },
      { season: 2, episode: 7, title: "一次没有火药味的方案评审", summary: "卷终综合:阿零第一次主持方案评审,把需求澄清/估时/同步/异步/冲突处理全用上,让一屋子不同意见的人心平气和地收敛到一个决定。", chapterType: "project", projectStage: "career-v2 没有火药味的方案评审", technologies: ["方案评审", "综合"], jobSkills: ["协作", "主持会议"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "C3",
    title: "成长与影响力",
    subtitle: "从能干活到有影响力",
    goal: "从'能干活'长成'有影响力':搭一专多能的 T 型能力,学会读陌生系统、从执行跳到设计、做技术分享与写作、带新人沉淀知识,并建立自己的技术判断力。",
    covers: ["T 型能力与读系统", "设计与分享", "判断力与带人"],
    episodes: [
      { season: 3, episode: 1, title: "又宽又深的那一竖", summary: "T 型能力是一专多能:阿零想什么都学结果什么都浅,领姐画出 T 字——先扎透一竖立身、再横向铺开当桥梁,并给出选'竖'的判断法。", chapterType: "comic", projectStage: "定下自己的一专多能路径", technologies: ["T 型能力", "能力规划"], jobSkills: ["职业规划"], status: "planned" },
      { season: 3, episode: 2, title: "接手一座黑箱", summary: "读陌生系统要从'入口和数据流'切入而非逐行读:阿零接手前人代码不知从哪下嘴,领姐教他先找入口、追一条主链路、画出模块地图再动手。", chapterType: "lab", projectStage: "掌握读陌生系统的套路", technologies: ["系统阅读", "主链路追踪"], jobSkills: ["系统理解"], status: "planned" },
      { season: 3, episode: 3, title: "从「怎么做」到「做什么」", summary: "执行是把事做对、设计是选对要做的事:阿零总等着被派活,领姐推他往上半步——接需求先问'为什么/有没有更省的路',开始为方案负责。", chapterType: "comic", projectStage: "开始为方案而不只为实现负责", technologies: ["设计思维", "方案权衡"], jobSkills: ["技术设计"], status: "planned" },
      { season: 3, episode: 4, title: "第一次站上讲台", summary: "分享与写作是把个人经验变成团队资产:阿零一开口就照着代码念,领姐教他用'一个问题-一条主线-一个可带走的收获'重构分享,写作同理。", chapterType: "comic", projectStage: "完成第一次团队技术分享", technologies: ["技术分享", "技术写作"], jobSkills: ["影响力"], status: "planned" },
      { season: 3, episode: 5, title: "别让踩过的坑再埋一次", summary: "带新人是放大自己、沉淀是给未来省时间:阿零第一次带人忍不住全代做,领姐教他给方向不给答案,把重复问题一次写进文档而非答十遍。", chapterType: "comic", projectStage: "把重复经验沉淀成文档", technologies: ["带新人", "知识沉淀"], jobSkills: ["团队建设"], status: "planned" },
      { season: 3, episode: 6, title: "别人说好就好吗", summary: "技术判断力=不被热词带走、回到场景与权衡:阿零看到新框架就想上,领姐教他用'解决什么问题/代价是什么/我们需要吗'三问替代跟风。", chapterType: "comic", projectStage: "建立自己的技术判断标准", technologies: ["技术判断", "权衡取舍"], jobSkills: ["技术判断力"], status: "planned" },
      { season: 3, episode: 7, title: "第一次主导一个项目", summary: "卷终综合:阿零第一次牵头咖啡站小项目,把读系统/设计/分享/带人/判断全用上,从'完成分配的任务'变成'对一件事的结果负责'。", chapterType: "project", projectStage: "career-v3 第一次主导项目", technologies: ["项目主导", "综合"], jobSkills: ["技术领导力"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "C4",
    title: "选择与长期主义",
    subtitle: "把职业当长期主义",
    goal: "把职业当长期主义来经营:学会取舍技术、判断造轮子与用轮子、双向看待面试、算清跳槽与深耕的账、识别与应对倦怠,最终想清楚自己要成为哪种工程师。",
    covers: ["技术取舍", "面试与跳槽", "倦怠与长期主义"],
    episodes: [
      { season: 4, episode: 1, title: "学不完的新框架", summary: "评估要不要学一门技术,看'迁移价值+需求半衰期':阿零被层出不穷的新词追着跑,领姐给出一张取舍表——底层原理保值,易变 API 按需即用。", chapterType: "reference", projectStage: "建立技术学习的取舍标准", technologies: ["技术选型", "学习取舍"], jobSkills: ["技术判断力"], status: "planned" },
      { season: 4, episode: 2, title: "手搓一个还是装一个", summary: "造轮子为理解、用轮子为交付,别搞反场合:阿零非要自己写一套日志库耽误上线,领姐拆解'什么时候该造(学习/核心竞争力)、什么时候该用'。", chapterType: "comic", projectStage: "学会造轮子与用轮子的边界", technologies: ["造轮子取舍", "依赖管理"], jobSkills: ["工程决策"], status: "planned" },
      { season: 4, episode: 3, title: "被面的也在面人", summary: "面试是双向筛选不是单向审判:阿零把面试当考试怕答错,领姐提醒他也在面对方的团队与成长空间,教他反问出真信息而非一味讨好。", chapterType: "comic", projectStage: "学会把面试当双向选择", technologies: ["面试策略", "反向提问"], jobSkills: ["职业发展"], status: "planned" },
      { season: 4, episode: 4, title: "这山望着那山高", summary: "跳槽与深耕各有复利,算的是成长账不只是薪资账:阿零一遇不顺就想走,领姐带他把'留下能拿到什么/走能拿到什么'摊开算,而非情绪驱动。", chapterType: "comic", projectStage: "会算跳槽与深耕的成长账", technologies: ["职业选择", "成长复利"], jobSkills: ["职业规划"], status: "planned" },
      { season: 4, episode: 5, title: "熄火的引擎", summary: "倦怠是需要复盘的信号不是意志力问题:阿零连续加班后对什么都提不起劲,领姐像排查线上故障一样陪他定位根因——负荷、意义还是掌控感出了问题。", chapterType: "incident", projectStage: "学会识别与应对职业倦怠", technologies: ["职业倦怠", "根因复盘"], jobSkills: ["自我管理"], status: "planned" },
      { season: 4, episode: 6, title: "写给十年后的自己", summary: "用长期主义反推当下选择:领姐摊开翅膀上那张路线图,让阿零想象十年后想成为谁,再倒推现在该积累什么、放弃什么,给方向装上舵。", chapterType: "comic", projectStage: "用长期视角校准当下取舍", technologies: ["长期主义", "路线图反推"], jobSkills: ["职业规划"], status: "planned" },
      { season: 4, episode: 7, title: "想清楚要成为哪种工程师", summary: "全线终章:阿零带着咖啡站团队把一件事做成,回望四卷终于想清自己要成为哪种工程师;领姐飞到队尾,把领飞的位置让给他。", chapterType: "project", projectStage: "career-v4 职业大成 · 想清楚要成为哪种工程师", technologies: ["职业定位", "综合"], jobSkills: ["职业规划", "技术领导力"], status: "planned" },
    ],
  },
];

export function careerAllEpisodes(): JavaEpisode[] {
  return CAREER_SEASONS.flatMap((s) => s.episodes);
}

export function careerPublishedEpisodes(): JavaEpisode[] {
  return careerAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
