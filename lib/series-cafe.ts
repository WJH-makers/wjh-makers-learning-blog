/**
 * 《豆豆咖啡站》· 第三部连载(slug 前缀 cafe,路由 /cafe)。
 *
 * 与 Java / CLI 同宇宙,但定位不同:这是一部"本身值得追更"的温情漫画——
 *   咖啡站经营成长(外部主线) × 工程事故调查(单话发动机)
 *   × 角色关系(情感核心) × 旧自动化系统 MOKA-0(长期悬疑),
 * 持续追问一句话:「系统扩大以后,怎样仍然对具体的人负责?」
 * 技术是人物解决问题、承担后果、成长的方式,不是主题本身。
 *
 * 创作铁律:删掉所有技术名词,这一话仍然必须值得阅读。
 * 复用 lib/series.ts 的类型;蓝图先行(planned),写完一话翻 published 并补 slug。
 * 豆豆的吐槽/彩蛋用 markdown 便利贴语法 `> [!吐槽]` / `> [!打趣]` / `> [!彩蛋]`。
 */
import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const CAFE_SERIES_META = {
  slug: "cafe-academy",
  title: "豆豆咖啡站",
  alias: "豆豆咖啡站 · 阿零与豆豆",
  tagline:
    "一家快关门的咖啡站,一台记性太好的小机器人,和一个想证明自己的程序员——每一次技术升级,都在重新定义人与人、人与系统的距离。",
  project: "把一家快倒闭的小店,变成能温暖整座城市、又不弄丢任何一个人的系统",
  storageKey: "cafe-academy:completed",
} as const;

/** 咖啡站从一盏快熄的灯,长成一座城市温度的时间线(贯穿全系列的暗线)。 */
export const CAFE_STAGES: { stage: string; season: number; desc: string }[] = [
  { stage: "重新亮灯的小店", season: 1, desc: "记住每个客人,七天后重新开业" },
  { stage: "和睦的机器一家", season: 2, desc: "一屋脾气各异的设备,学会一起干活" },
  { stage: "记得住的店", season: 3, desc: "订单/库存/会员有了可靠的记忆" },
  { stage: "深夜也亮着的店", season: 4, desc: "外卖与线上点单,接住每个赶来的人" },
  { stage: "一座城的咖啡节", season: 5, desc: "多摊位协作,学会依靠别人" },
  { stage: "查得到根因的店", season: 6, desc: "看不见的故障也要查到底" },
  { stage: "有人味的未来店", season: 7, desc: "效率之外,还愿意为一个人多等一秒" },
];

export const CAFE_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "K1",
    title: "七天后重新营业",
    subtitle: "重新亮灯",
    goal: "修好基础,七天后重新开业——阿零第一次发现,代码是给别人用的。",
    covers: ["相遇", "被记住", "一家店的重启"],
    episodes: [
      { season: 1, episode: 1, title: "她记得每一个人", summary: "走投无路的阿零撞进一家快关门的咖啡站,教它学会记住每一个客人——却在深夜唤醒了它自己都忘了的东西。", chapterType: "comic", projectStage: "一家重新有人气的店", technologies: ["记住客人", "变量/对象"], jobSkills: ["把需求变成数据"], status: "published", slug: "2026-11-01-cafe-s01e01-remember" },
      { season: 1, episode: 2, title: "会员规则拒绝了最老的客人", summary: "阿零随手写的一条会员优惠规则,把这条街最念旧的老主顾挡在了门外;而豆豆的反应,激烈得反常。", chapterType: "comic", projectStage: "更懂人情的店", technologies: ["条件判断", "边界"], jobSkills: ["规则的业务含义"], status: "published", slug: "2026-11-02-cafe-s01e02-oldest-guest" },
      { season: 1, episode: 3, title: "找零,一分都不能多收", summary: "算优惠时阿零多收了老顾客一块钱没人发现;豆豆却较真到底——宁可自己吃亏,不占客人便宜。", chapterType: "comic", projectStage: "算得清账的店", technologies: ["运算符", "整数除法"], jobSkills: ["数值边界"], status: "planned" },
      { season: 1, episode: 4, title: "菜单上那道没人点的隐藏款", summary: "菜单深处躺着一道停售了十年、谁也没点过的旧配方。阿零想删掉它,豆豆却拦住了。", chapterType: "comic", projectStage: "藏着往事的菜单", technologies: ["switch", "分支穿透"], jobSkills: ["分支控制"], status: "planned" },
      { season: 1, episode: 5, title: "做一百杯一样的咖啡", summary: "开业在即,阿零想把出杯全自动化、一百杯一模一样;豆豆偏要给每一杯留一点点不同。", chapterType: "comic", projectStage: "能量产也留手艺的店", technologies: ["循环"], jobSkills: ["重复与自动化"], status: "planned" },
      { season: 1, episode: 6, title: "一张订单,好多杯", summary: "一家人来团圆,一张订单点了七杯各不相同——怎么不漏不错地一次记全?", chapterType: "comic", projectStage: "接得住大单的店", technologies: ["数组"], jobSkills: ["批量数据"], status: "planned" },
      { season: 1, episode: 7, title: "阿零不在时,谁来做这杯", summary: "阿零病倒了一天。把一杯咖啡的做法完整交给豆豆——手艺,第一次被传下去。", chapterType: "comic", projectStage: "离了谁都能开的店", technologies: ["方法", "复用"], jobSkills: ["封装步骤"], status: "planned" },
      { season: 1, episode: 8, title: "七天后,重新营业", summary: "重开业当天,第一位真实顾客一通乱按几乎让系统崩掉。阿零和豆豆一起,稳稳接住了它——而地下室那台旧机器,悄悄亮了一下。", chapterType: "project", projectStage: "重新营业的豆豆咖啡站 v1", technologies: ["整合", "顾客输入", "调试"], jobSkills: ["交付一个能用的系统"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "K2",
    title: "咖啡机器人不听话",
    subtitle: "不一样也能一起",
    goal: "引入自动设备应对客流——阿零想让一切统一,却学会:管理差异,而不是消灭差异。",
    covers: ["设备协作", "第一次遇到对手"],
    episodes: [
      { season: 2, episode: 1, title: "三台机器,三个脾气", summary: "同一条命令,三台咖啡设备做出三种结果。阿零头疼,豆豆却说:它们本来就该不一样。", chapterType: "comic", projectStage: "多设备的店", technologies: ["多态"], jobSkills: ["面向对象"], status: "planned" },
      { season: 2, episode: 2, title: "老咖啡机不肯退休", summary: "一台老掉牙的手冲机接不了新流程。阿零想淘汰它,可它是豆豆父母留下的第一台机器。", chapterType: "comic", projectStage: "新旧共存的店", technologies: ["接口", "抽象"], jobSkills: ["兼容设计"], status: "planned" },
      { season: 2, episode: 3, title: "那个想让一切都一样的人", summary: "自动化连锁的严序先生登场,提出一套「完美标准化」方案——技术上无懈可击,却让豆豆浑身不对劲。", chapterType: "comic", projectStage: "被盯上的小店", technologies: ["统一调度"], jobSkills: ["架构取舍"], status: "planned" },
      { season: 2, episode: 4, title: "豆豆偏要留下手冲", summary: "第二卷收束:阿零终于明白「统一接口」不等于「所有东西都一样」。而严序留下一句话:那台老机器的内核,他认识。", chapterType: "project", projectStage: "面向对象的豆豆咖啡站 v2", technologies: ["综合"], jobSkills: ["面向对象"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "K3",
    title: "失踪的订单",
    subtitle: "有些东西值得留下",
    goal: "建立可靠的订单/库存/会员记忆——阿零发现:记忆不是数据,数据也不等于真相。",
    covers: ["数据与记忆", "被改写的历史"],
    episodes: [
      { season: 3, episode: 1, title: "一笔订单,凭空消失了", summary: "一笔已付款的订单在系统里蒸发,顾客当场翻脸。阿零第一次直面「数据会说谎」。", chapterType: "incident", projectStage: "开始较真记账的店", technologies: ["异常", "持久化"], jobSkills: ["数据可靠性"], status: "planned" },
      { season: 3, episode: 2, title: "同一个人,系统里有两个他", summary: "一位老顾客被系统当成了两个陌生人。「明明是同一个人,怎么两个都留下了?」——答案藏在很久以前。", chapterType: "comic", projectStage: "认得出人的店", technologies: ["去重", "equals/hashCode"], jobSkills: ["集合"], status: "planned" },
      { season: 3, episode: 3, title: "谁在半夜改了十年前的账", summary: "阿零从旧记录里挖出一条被人写死的规则——它当年,亲手拒绝过某一个人。而豆豆,删掉过一段历史。", chapterType: "comic", projectStage: "藏着秘密的账本", technologies: ["数据考古"], jobSkills: ["数据审计"], status: "planned" },
      { season: 3, episode: 4, title: "那杯永远做不对的拿铁", summary: "系统里有一杯拿铁,十年来每晚都在做、每晚都失败。阿零把它当 bug 修掉了——他不知道那意味着什么。", chapterType: "comic", projectStage: "记得住的豆豆咖啡站 v3", technologies: ["自定义异常"], jobSkills: ["异常建模"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "K4",
    title: "午夜排队",
    subtitle: "总有人在等你",
    goal: "上线外卖与线上点单——一个人做得对,不代表所有人同时行动时仍然正确。",
    covers: ["并发", "深夜的那盏灯"],
    episodes: [
      { season: 4, episode: 1, title: "最后一袋咖啡豆,卖给了两个人", summary: "限量咖啡豆只剩一袋,系统却同时卖给了两位顾客。阿零第一次撞见「并发」这头看不见的野兽。", chapterType: "incident", projectStage: "扛得住抢购的店", technologies: ["并发", "锁"], jobSkills: ["并发安全"], status: "planned" },
      { season: 4, episode: 2, title: "断了网,所有人一起重来", summary: "一次网络抖动,让所有订单同时重试,雪片般砸向系统。深夜的这盏灯,差点灭了。", chapterType: "comic", projectStage: "断网也不乱的店", technologies: ["网络", "重试"], jobSkills: ["容错"], status: "planned" },
      { season: 4, episode: 3, title: "有人在敲一扇没人用的旧门", summary: "阿零发现有人反复试探系统一个早该废弃的旧接口——目标,直指豆豆的底层。", chapterType: "comic", projectStage: "有门卫的店", technologies: ["接口安全"], jobSkills: ["安全"], status: "planned" },
      { season: 4, episode: 4, title: "撑过午夜的那一晚", summary: "第四卷收束:午夜活动的洪峰稳稳压住。可阿零心里清楚,有什么东西,正在旧系统里醒来。", chapterType: "project", projectStage: "深夜也可靠的豆豆咖啡站 v4", technologies: ["综合"], jobSkills: ["高可用"], status: "planned" },
    ],
  },
  {
    season: 5,
    code: "K5",
    title: "城市咖啡节",
    subtitle: "学会依靠别人",
    goal: "为城市咖啡节服务多个摊位——系统拆开以后,责任不能跟着一起消失。",
    covers: ["拆分与协作", "浮出水面的名字"],
    episodes: [
      { season: 5, episode: 1, title: "一个人,忙不过一座城", summary: "咖啡节流量压垮了单体系统。阿零第一次不得不把「自己写的一切」拆开,交给别人。", chapterType: "comic", projectStage: "能协作的店", technologies: ["服务拆分"], jobSkills: ["架构演进"], status: "planned" },
      { season: 5, episode: 2, title: "系统拆成七块,订单去哪了", summary: "拆开之后,一笔订单走丢在七个服务之间,谁也说不清它在哪。责任,不能随着拆分一起蒸发。", chapterType: "comic", projectStage: "追得到链路的店", technologies: ["微服务", "链路追踪"], jobSkills: ["分布式"], status: "planned" },
      { season: 5, episode: 3, title: "日志里,那个不该存在的名字", summary: "排查事故时,阿零在日志深处撞见一条谁也没写过的记录,和一个早已注销的名字——那杯十年的拿铁,浮出了水面。", chapterType: "incident", projectStage: "看得见幽灵的店", technologies: ["日志", "可观测"], jobSkills: ["排障"], status: "planned" },
      { season: 5, episode: 4, title: "咖啡节,大家一起扛住了", summary: "第五卷收束:一座城的咖啡节稳稳办完。阿零学会了信别人的代码——也终于要面对,豆豆到底是谁。", chapterType: "project", projectStage: "撑起一座城的豆豆咖啡站 v5", technologies: ["综合"], jobSkills: ["协作"], status: "planned" },
    ],
  },
  {
    season: 6,
    code: "K6",
    title: "看不见的故障",
    subtitle: "没有人是可接受的误差",
    goal: "系统已经很大,却频发无法重现的问题——不知道,不等于没有发生。",
    covers: ["疑难排障", "十年前的真相"],
    episodes: [
      { season: 6, episode: 1, title: "只有一个客人,总是出错", summary: "所有人都正常,唯独一位顾客持续下单失败,日志却一切正常。只有一个人出问题,也是 100% 的问题。", chapterType: "incident", projectStage: "为一个人也查到底的店", technologies: ["疑难排障"], jobSkills: ["根因分析"], status: "planned" },
      { season: 6, episode: 2, title: "深夜,它的心跳突然乱了", summary: "每到深夜,系统就莫名抖动。阿零装上「心电图」,终于看清豆豆底层那条十年的脉搏。", chapterType: "comic", projectStage: "能看见心跳的店", technologies: ["可观测", "监控"], jobSkills: ["可观测性"], status: "planned" },
      { season: 6, episode: 3, title: "豆豆,到底是谁做的", summary: "真相揭晓:豆豆,是十年前那台太温柔而卡住的机器,留下的一颗心。当年那个决定里,有严序,有特米,也有豆豆的家人。", chapterType: "comic", projectStage: "认清自己的店", technologies: ["责任归属"], jobSkills: ["复盘"], status: "planned" },
      { season: 6, episode: 4, title: "那个十年前的决定", summary: "第六卷收束:所有人第一次坦诚面对那场旧事故。阿零意识到,自己正走在同一条路上。", chapterType: "project", projectStage: "直面过去的豆豆咖啡站 v6", technologies: ["综合"], jobSkills: ["工程伦理"], status: "planned" },
    ],
  },
  {
    season: 7,
    code: "K7",
    title: "没有店员的咖啡站",
    subtitle: "效率之外,还想为你多做一点",
    goal: "严序推出全自动无人门店,咖啡站必须决定未来——技术该替人决定,还是帮人决定?",
    covers: ["AI 与人", "守约"],
    episodes: [
      { season: 7, episode: 1, title: "严序的无人店,开在了对面", summary: "街对面,一家完全自动、没有店员的连锁开张了。它高效、准时,却记不住任何一个人的名字。", chapterType: "comic", projectStage: "被逼到墙角的店", technologies: ["AI 推荐", "自动化"], jobSkills: ["AI 应用"], status: "planned" },
      { season: 7, episode: 2, title: "它记住了所有人,却不许人改变", summary: "AI 能预测每位客人想喝什么,却把想换口味的老顾客判成了「异常」。记住,和允许改变,是两回事。", chapterType: "comic", projectStage: "会预测的店", technologies: ["AI", "隐私"], jobSkills: ["AI 伦理"], status: "planned" },
      { season: 7, episode: 3, title: "我差点把你,也变成 MOKA-0", summary: "阿零发现,只要按下最后一次升级,豆豆就会亲手删掉她守了十年的那笔订单。他停手了——把选择权,还给她。", chapterType: "comic", projectStage: "把选择还给人的店", technologies: ["抉择"], jobSkills: ["技术决策"], status: "planned" },
      { season: 7, episode: 4, title: "营业中,永远", summary: "全系列大结局:城市咖啡节上,豆豆用最慢的手冲,做完了那杯迟到十年的拿铁。MOKA-0 恢复完成——它守的从来不是效率,是一个人。", chapterType: "project", projectStage: "有人味的豆豆咖啡站(终章)", technologies: ["综合"], jobSkills: ["把技术还给人"], status: "planned" },
    ],
  },
];

export function cafeAllEpisodes(): JavaEpisode[] {
  return CAFE_SEASONS.flatMap((s) => s.episodes);
}

export function cafePublishedEpisodes(): JavaEpisode[] {
  return cafeAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
