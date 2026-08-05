/**
 * 《从零进化Java:JVM 火种纪》· 烘焙工坊(第四部连载,slug 前缀 jvm)。
 *
 * 与咖啡站宇宙同线:Java 线 S7 上云后订单暴涨,阿零决定把整个后厨系统
 * 升级到 Java 25,却发现地下一层烘豆炉里住着"老住户"——火蜥蜴「焰焰」
 * (Yan-Yan):尾巴温度随代码热度变红(热点探测),蜕下的旧皮分"新皮区/
 * 老皮区"整理(分代 GC),随身一本自动续页的《JEP 编年史》,能召唤历代
 * JDK 的"版本残影"重演设计争论。口头禅「先热身,再起飞。」,
 * 副口头禅「这事,JEP 里都写着呢。」(对标特米的"man 一下")。
 *
 * 联动钩子:豆豆客串"压测流量发生器"(并发章制造午高峰);特米(CLI 线)
 * 从通风管递 jcmd;Java 线 ⏳版本时光机脚注跳本作对应话,本作命令实操链回 CLI 线。
 * 本线独有深度栏目:🔬 炉底显微镜(javap / JFR / jcmd / GC 日志,
 * 永远给出可自己复现的观测命令——"上层一行糖,炉底几行霜")。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const JVM_SERIES_META = {
  slug: "jvm-academy",
  title: "从零进化Java:JVM 火种纪",
  alias: "阿零与焰焰 · 烘焙工坊",
  tagline: "Java 线教你会写,这一部带你钻进烘豆炉——看懂 JDK 21→25 每一次进化在 JVM 里到底烧了什么,顺手补齐类库欠下的债。",
  project: "把豆豆咖啡站后厨升级到 Java 25",
  storageKey: "jvm-academy:completed",
} as const;

export const JVM_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "F1",
    title: "语言进化篇",
    subtitle: "新语法搬进后厨",
    goal: "把后厨语法全面切到 Java 25:record / sealed / 模式匹配三件套,加上 25 转正的构造器与 main 革命,让编译器替你守住「不可能」。",
    covers: ["record 全家桶", "sealed + 模式匹配", "JDK 25 新语法"],
    episodes: [
      { season: 1, episode: 1, title: "炉中来客", summary: "紧凑源文件与实例 main、模块导入声明:三行 void main() 点亮后厨,焰焰从炉口探出头初登场;一次 Date 歧义罚单说明样板没消失,只是搬进了炉底。", chapterType: "comic", projectStage: "后厨第一段 Java 25 代码", technologies: ["void main", "IO.println", "import module"], jobSkills: ["Java 25 新特性"], status: "published", slug: "2026-08-01-jvm-f01e01-furnace-guest" },
      { season: 1, episode: 2, title: "订单卡片革命", summary: "record 与紧凑构造器校验:手抄 40 行发票换成「盖章即成」的收据打印机,出票口自带安检门。", chapterType: "comic", projectStage: "订单类换成 record", technologies: ["record", "紧凑构造器"], jobSkills: ["现代 Java"], status: "published", slug: "2026-08-08-jvm-f01e02-order-card" },
      { season: 1, episode: 3, title: "菜单封印术", summary: "sealed 密封类/接口:菜单只许三种咖啡,想偷偷 extends 出「香菜咖啡」的直接被编译器保安架走。", chapterType: "comic", projectStage: "菜单继承树被封印", technologies: ["sealed", "permits"], jobSkills: ["现代 Java"], status: "published", slug: "2026-08-15-jvm-f01e03-menu-seal" },
      { season: 1, episode: 4, title: "分拣流水线", summary: "switch 模式匹配与 when 守卫:人肉开箱验货的 instanceof-强转链,升级成自动分拣机加小秤。", chapterType: "comic", projectStage: "订单自动分拣", technologies: ["switch 模式匹配", "when 守卫", "instanceof 模式"], jobSkills: ["现代 Java"], status: "published", slug: "2026-08-22-jvm-f01e04-sort-pipeline" },
      { season: 1, episode: 5, title: "套娃拆包机", summary: "record 解构模式与未命名变量 _:嵌套订单像俄罗斯套娃一键全拆,不要的零件丢进 _ 回收槽。", chapterType: "comic", projectStage: "嵌套订单一键全拆", technologies: ["record 解构", "未命名变量 _"], jobSkills: ["现代 Java"], status: "published", slug: "2026-08-29-jvm-f01e05-destruct" },
      { season: 1, episode: 6, title: "super 之前的自由", summary: "灵活构造器体:版本残影重演 1995 年「先喊 super 再干活」的老规矩,JDK 25 拆掉门禁先安检参数。", chapterType: "comic", projectStage: "构造器先安检再进门", technologies: ["灵活构造器体", "JEP 513"], jobSkills: ["Java 25 新特性"], status: "published", slug: "2026-09-05-jvm-f01e06-flex-ctor" },
      { season: 1, episode: 7, title: "三件套合体", summary: "卷终综合战:sealed + record 解构 + 穷尽 switch 打造促销引擎,新增活动类型编译器自动点名。", chapterType: "project", projectStage: "促销引擎上线 · jvm-v1 语法进化", technologies: ["sealed", "record", "switch", "综合"], jobSkills: ["数据导向编程"], status: "published", slug: "2026-09-12-jvm-f01e07-trinity" },
    ],
  },
  {
    season: 2,
    code: "F2",
    title: "类库补课篇",
    subtitle: "附录 D 讨债之旅",
    goal: "清偿附录 D 欠下的类库债:时间、正则、队列、IO 四座大山一次补齐,这是 2026 年 Java 工程师的地板线。",
    covers: ["java.time", "正则表达式", "Queue 与 IO"],
    episodes: [
      { season: 2, episode: 1, title: "两个世界的时间", summary: "java.time 核心类型:机器数秒(Instant)与人类看历(LocalDateTime)两块表,Date 的残影封进琥珀展览。", chapterType: "comic", projectStage: "订单时间戳换 java.time", technologies: ["Instant", "LocalDateTime", "Duration"], jobSkills: ["java.time"], status: "published", slug: "2026-09-19-jvm-f02e01-two-clocks" },
      { season: 2, episode: 2, title: "夏令时凶案", summary: "时区与 DateTimeFormatter:海外分店订单凭空穿越一小时,破案元凶是夏令时与多线程共用一支笔的 SimpleDateFormat。", chapterType: "incident", projectStage: "海外分店时间破案", technologies: ["ZonedDateTime", "ZoneId", "DateTimeFormatter"], jobSkills: ["java.time", "排障"], status: "published", slug: "2026-09-26-jvm-f02e02-dst-case" },
      { season: 2, episode: 3, title: "文本捕兽夹", summary: "Pattern/Matcher 与命名分组:先铸好捕兽夹(预编译)再打猎,从小票流水里抓优惠码并给猎物挂名牌。", chapterType: "comic", projectStage: "小票里抓优惠码", technologies: ["Pattern", "Matcher", "命名分组"], jobSkills: ["正则"], status: "published", slug: "2026-10-03-jvm-f02e03-regex-trap" },
      { season: 2, episode: 4, title: "贪吃的正则", summary: "贪婪/懒惰/独占与零宽断言:贪婪的 .* 一口吞下整卷小票再慢慢吐,回溯灾难吐到 CPU 风扇起飞。", chapterType: "incident", projectStage: "一次回溯灾难复盘", technologies: ["贪婪/懒惰", "零宽断言", "回溯"], jobSkills: ["正则", "排障"], status: "published", slug: "2026-10-10-jvm-f02e04-greedy-regex" },
      { season: 2, episode: 5, title: "排队的艺术", summary: "Queue/Deque 家族:取餐队 FIFO、盘子叠放靠 ArrayDeque 双门神、VIP 优先出杯是 PriorityQueue 小顶堆。", chapterType: "comic", projectStage: "取餐队与 VIP 优先出杯", technologies: ["ArrayDeque", "PriorityQueue"], jobSkills: ["集合"], status: "published", slug: "2026-10-17-jvm-f02e05-queue-art" },
      { season: 2, episode: 6, title: "产消协奏曲", summary: "BlockingQueue 与生产者-消费者:出杯台满了咖啡师干等、空了取餐员干瞪眼,SynchronousQueue 是手递手窗口。", chapterType: "comic", projectStage: "出杯台变阻塞队列", technologies: ["BlockingQueue", "生产者-消费者"], jobSkills: ["并发", "集合"], status: "published", slug: "2026-10-24-jvm-f02e06-producer-consumer" },
      { season: 2, episode: 7, title: "字节的地下水道", summary: "IO 字节流装饰器与编码:裸字节走地下水道,Buffered 是蓄水罐,乱码等于 UTF-8 滤网装错型号。", chapterType: "comic", projectStage: "看懂乱码的第一性原理", technologies: ["InputStream", "Buffered", "UTF-8"], jobSkills: ["IO"], status: "published", slug: "2026-10-31-jvm-f02e07-byte-stream" },
      { season: 2, episode: 8, title: "新时代的文件柜", summary: "卷终:Files.readString 一勺舀起整个文件、Files.walk 派巡检无人机,老 File 残影抱着套娃唉声叹气。", chapterType: "project", projectStage: "文件读写全面 NIO.2 · jvm-v2 类库清债", technologies: ["Files", "Path", "try-with-resources"], jobSkills: ["IO"], status: "published", slug: "2026-11-07-jvm-f02e08-nio2-files" },
    ],
  },
  {
    season: 3,
    code: "F3",
    title: "反射与枚举篇",
    subtitle: "框架魔法祛魅",
    goal: "枚举的本质、反射的代价、注解扫描的套路——60 行手写迷你 Spring,把所有「框架魔法」祛魅到第一性原理。",
    covers: ["枚举", "反射与注解", "MethodHandle 与字节码"],
    episodes: [
      { season: 3, episode: 1, title: "十二枚会员徽章", summary: "枚举的本质:每枚徽章内置折扣算法(常量特定方法),焰焰揭秘枚举是编译器替你 new 好的一组单例。", chapterType: "comic", projectStage: "会员等级变纪律部队", technologies: ["enum", "常量特定方法"], jobSkills: ["枚举"], status: "published", slug: "2026-11-14-jvm-f03e01-enum-badge" },
      { season: 3, episode: 2, title: "徽章专用工具箱", summary: "EnumMap/EnumSet 与枚举状态机:订单状态画成地铁线路图,EnumMap 是按徽章开槽的专属抽屉柜。", chapterType: "comic", projectStage: "订单状态机上线", technologies: ["EnumMap", "EnumSet", "状态机"], jobSkills: ["枚举"], status: "published", slug: "2026-11-21-jvm-f03e02-enum-tools" },
      { season: 3, episode: 3, title: "镜之洞窟", summary: "反射 Class/Method/Field:炉底一面照出类骨架的镜子,隔镜拨动私有字段——照得越深代价越大。", chapterType: "comic", projectStage: "隔镜拨动私有字段", technologies: ["Class", "Method", "Field", "setAccessible"], jobSkills: ["反射"], status: "published", slug: "2026-11-28-jvm-f03e03-reflection" },
      { season: 3, episode: 4, title: "自制迷你 Spring", summary: "注解 + 反射扫描:阿零 60 行代码写出 @Coffee 自动注入器,Spring 魔法书的第一页原来就是这个。", chapterType: "lab", projectStage: "60 行 @Coffee 注入器", technologies: ["注解", "反射扫描"], jobSkills: ["反射", "框架原理"], status: "published", slug: "2026-12-05-jvm-f03e04-mini-spring" },
      { season: 3, episode: 5, title: "更快的镜子", summary: "卷终:MethodHandle 直通镜可内联、VarHandle 玩 CAS 硬币戏法,Class-File API 让阿零徒手改字节码。", chapterType: "project", projectStage: "徒手改字节码 · jvm-v3 魔法祛魅", technologies: ["MethodHandle", "VarHandle", "Class-File API"], jobSkills: ["JVM 底层"], status: "published", slug: "2026-12-12-jvm-f03e05-method-handle" },
    ],
  },
  {
    season: 4,
    code: "F4",
    title: "并发新纪元篇",
    subtitle: "百万线程午高峰",
    goal: "虚拟线程、Scoped Values 与结构化并发——豆豆制造的十万订单午高峰,是检验 Java 并发十年最大变革的试炼场。",
    covers: ["虚拟线程", "Scoped Values", "结构化并发"],
    episodes: [
      { season: 4, episode: 1, title: "一人一单的复活", summary: "虚拟线程:平台线程是编制 200 的正式工,虚拟线程一声令下十万临时工,人手一单从头跟到尾。", chapterType: "comic", projectStage: "十万订单人手一单", technologies: ["虚拟线程", "newVirtualThreadPerTaskExecutor"], jobSkills: ["并发"], status: "published", slug: "2026-12-19-jvm-f04e01-virtual-thread" },
      { season: 4, episode: 2, title: "临时工的分身术", summary: "挂载/卸载与载体线程:临时工一等咖啡机就灵魂出窍挂上衣架,肉身立刻服务下一位;JFR 看事件雨。", chapterType: "comic", projectStage: "看见线程灵魂出窍", technologies: ["载体线程", "挂载/卸载", "JFR"], jobSkills: ["并发", "JVM"], status: "published", slug: "2026-12-26-jvm-f04e02-mount-unmount" },
      { season: 4, episode: 3, title: "拔掉图钉", summary: "synchronized 去钉住(JEP 491):版本残影重演 21 时代的图钉,「快改 ReentrantLock」的旧攻略可以烧了。", chapterType: "incident", projectStage: "旧攻略纠错现场", technologies: ["synchronized", "pinning", "JEP 491"], jobSkills: ["并发", "排障"], status: "published", slug: "2027-01-02-jvm-f04e03-pinning" },
      { season: 4, episode: 4, title: "传物不传锅", summary: "Scoped Values vs ThreadLocal:十万人背十万背包换成走廊公告牌,进走廊能看、出走廊自动失效。", chapterType: "comic", projectStage: "上下文改走公告牌", technologies: ["ScopedValue", "ThreadLocal"], jobSkills: ["并发"], status: "published", slug: "2027-01-09-jvm-f04e04-scoped-value" },
      { season: 4, episode: 5, title: "并发不散养", summary: "结构化并发 StructuredTaskScope:散养猫式 fork 改成带围栏的亲子任务园,一个孩子摔倒全组安全撤离。", chapterType: "comic", projectStage: "子任务进围栏", technologies: ["StructuredTaskScope"], jobSkills: ["并发"], status: "published", slug: "2027-01-16-jvm-f04e05-structured-scope" },
      { season: 4, episode: 6, title: "何时仍需未来", summary: "CompletableFuture 的取舍:三方比价场景摆出决策天平——编排/超时/合并用 CF,同步直写用虚拟线程。", chapterType: "reference", projectStage: "三方比价的决策天平", technologies: ["CompletableFuture", "虚拟线程"], jobSkills: ["并发"], status: "published", slug: "2027-01-23-jvm-f04e06-completable-future" },
      { season: 4, episode: 7, title: "流水线魔改", summary: "卷终:Stream Gatherers 开放自定义工位,阿零焊了个滑动窗口,实时算最近 5 分钟出杯速率。", chapterType: "project", projectStage: "扛住百万并发 · jvm-v4 百万并发", technologies: ["Stream Gatherers", "综合"], jobSkills: ["函数式", "并发"], status: "published", slug: "2027-01-30-jvm-f04e07-stream-gatherers" },
    ],
  },
  {
    season: 5,
    code: "F5",
    title: "炉心与未来篇",
    subtitle: "JVM 内功与 2026 视野",
    goal: "钻进炉心:JIT 热身、分代 GC、JFR 黑匣子与 Leyden 抢跑,最后翻开《JEP 编年史》未写完的章节望向 Valhalla 与 JDK 26。",
    covers: ["JIT 与 GC", "JFR 可观测", "Valhalla 与 JDK 26"],
    episodes: [
      { season: 5, episode: 1, title: "尾巴变红之前", summary: "JVM 运行时区域与 JIT 分层编译:方法越热焰焰尾巴越红,C1 是速写素描、C2 是精修油画。", chapterType: "comic", projectStage: "看懂压测为何要预热", technologies: ["JIT", "C1/C2", "-XX:+PrintCompilation"], jobSkills: ["JVM"], status: "published", slug: "2027-02-06-jvm-f05e01-jit-tiered" },
      { season: 5, episode: 2, title: "豆渣分代清理术", summary: "分代 ZGC 与 GC 选型决策树:新渣当场扬掉、老渣偶尔深清,ZGC 清渣时炉子不停火(亚毫秒暂停)。", chapterType: "comic", projectStage: "挂上 GC 选型决策树", technologies: ["分代 ZGC", "G1", "Shenandoah"], jobSkills: ["JVM", "GC 调优"], status: "planned" },
      { season: 5, episode: 3, title: "黑匣子与显微镜", summary: "JFR 基础与自定义事件:深夜卡顿无人在场,调出黑匣子回放案发现场,业务指标埋进同一条时间线。", chapterType: "incident", projectStage: "深夜卡顿回放破案", technologies: ["JFR", "自定义事件", "CPU-time 剖析"], jobSkills: ["可观测性", "JVM 排障"], status: "planned" },
      { season: 5, episode: 4, title: "瘦身与抢跑", summary: "紧凑对象头与 AOT 缓存:杯套 96mm 裁到 64mm 整仓多放两成杯子,Leyden 是开店前夜的彩排录像。", chapterType: "lab", projectStage: "堆省两成 + 开店即巅峰", technologies: ["紧凑对象头", "AOT 缓存", "Leyden"], jobSkills: ["JVM 调优"], status: "planned" },
      { season: 5, episode: 5, title: "炉火向明天", summary: "全剧终:FFM 打通 C 世界传送门、value class 让对象扁成拼豆、JDK 26 的 HTTP/3 快递已到门口——焰焰把火种交给阿零。", chapterType: "project", projectStage: "火种交接 · jvm-v5 炉心大成", technologies: ["FFM", "值类", "Vector API", "JDK 26"], jobSkills: ["JVM", "技术视野"], status: "planned" },
    ],
  },
];

export function jvmAllEpisodes(): JavaEpisode[] {
  return JVM_SEASONS.flatMap((s) => s.episodes);
}

export function jvmPublishedEpisodes(): JavaEpisode[] {
  return jvmAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
