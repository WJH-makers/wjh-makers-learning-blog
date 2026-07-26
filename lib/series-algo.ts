/**
 * 《从零开始扛流量》· 蜂巢架构课(第三部连载,slug 前缀 algo)。
 *
 * 与咖啡站宇宙同源:《豆豆咖啡站》温情线一支纪念视频意外上热搜,
 * 订单洪峰当晚冲垮 Java 线 v7 建成的咖啡站系统。废墟中飞来新导师
 * 「蜂十六」(Hex)——蜂巢架构师老蜜蜂,名字来自 HashMap 默认十六格,
 * 口头禅"先算量级,再动手!";特米(CLI 线)客串用 wrk 压测放洪水,
 * 蜂十六教阿零把堤坝建起来,一攻一守。
 *
 * 长期项目:把咖啡站从崩溃重建成扛住百万订单的系统(v7.1 → v8)。
 * 本线独有深度栏目:📏 量级天平(每话末尾一次信封背面估算,
 * 算法话称三档 n 的耗时、系统话速算 QPS/存储/带宽,口号"蜂巢从不白建一格")。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const ALGO_SERIES_META = {
  slug: "algo-academy",
  title: "从零开始扛流量",
  alias: "阿零与蜂十六 · 蜂巢架构课",
  tagline: "咖啡站一夜爆红被流量冲垮。跟着阿零和蜂十六,从「一杯咖啡怎么排队」练起数据结构内功,一路打到「百万订单怎么不宕机」——算法不是刷题,是保命。",
  project: "把咖啡站重建成扛住百万订单的系统",
  storageKey: "algo-academy:completed",
} as const;

export const ALGO_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "A1",
    title: "复杂度内功",
    subtitle: "先算量级,再动手",
    goal: "建立 Big-O 与均摊的量级直觉,吃透数组、链表、哈希表、堆这四大基本结构在 Java 集合里的真身。",
    covers: ["复杂度与均摊分析", "数组与链表", "哈希表", "堆与优先队列"],
    episodes: [
      { season: 1, episode: 1, title: "崩溃之夜与不速之蜂", summary: "热搜洪峰冲垮咖啡站,蜂十六从吊灯降落,用三种「找订单」演示 O(n)/O(1)/O(log n)——量级不对,努力白费。", chapterType: "incident", projectStage: "系统崩了,复盘开始", technologies: ["Big-O", "复杂度分析"], jobSkills: ["算法基础"], status: "planned" },
      { season: 1, episode: 2, title: "豆豆的储物柜", summary: "ArrayList 扩容 = 储物柜装满就搬进两倍大的新柜,搬家费摊进每次存包——偶尔很贵,均摊便宜。", chapterType: "comic", projectStage: "看懂订单列表的底细", technologies: ["数组", "ArrayList", "均摊分析"], jobSkills: ["数据结构"], status: "planned" },
      { season: 1, episode: 3, title: "会牵手的咖啡杯", summary: "外卖单用回形针串成链、托盘叠成栈、取餐口先来先取——插队 O(1) 点名 O(n),Java 里请用 ArrayDeque。", chapterType: "comic", projectStage: "排队模型选对容器", technologies: ["链表", "栈", "队列", "ArrayDeque"], jobSkills: ["数据结构"], status: "planned" },
      { season: 1, episode: 4, title: "六边形的魔法", summary: "订单按哈希分进老家蜂巢十六格,某格链表长到八,就地起一栋「红黑树小楼」——HashMap 拉链与树化。", chapterType: "comic", projectStage: "订单索引 O(1) 直达", technologies: ["HashMap", "哈希函数", "拉链法", "树化"], jobSkills: ["数据结构", "八股"], status: "planned" },
      { season: 1, episode: 5, title: "会长大的蜂巢", summary: "巢满 0.75 连夜扩建两倍新巢、高低位分家搬迁;两只蜂同时搬导致丢件,分格上锁引出 ConcurrentHashMap。", chapterType: "comic", projectStage: "并发下单不再丢件", technologies: ["负载因子", "rehash", "ConcurrentHashMap"], jobSkills: ["数据结构", "并发"], status: "planned" },
      { season: 1, episode: 6, title: "谁最急,谁先出", summary: "订单不排队而是堆成小山、山顶永远最急,豆豆用堆秒出今日销量 Top10——只关心最值就别全排序。", chapterType: "comic", projectStage: "急单调度与销量榜", technologies: ["堆", "PriorityQueue", "TopK"], jobSkills: ["数据结构"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "A2",
    title: "奇门结构",
    subtitle: "为特定问题而生的兵器",
    goal: "跳出通用容器,掌握树、跳表、Trie、概率结构、并查集与 LRU 这些「一招鲜」结构各自的杀手锏场景。",
    covers: ["树与 BST", "跳表", "Trie", "概率结构", "并查集", "缓存淘汰"],
    episodes: [
      { season: 2, episode: 1, title: "树的家谱", summary: "加盟店组织树三种巡店顺序讲透前/中/后序;BST 中序一走店名自动排开——中序一遍,天下有序。", chapterType: "comic", projectStage: "加盟店树状管理", technologies: ["二叉树", "BST", "红黑树"], jobSkills: ["数据结构"], status: "planned" },
      { season: 2, episode: 2, title: "楼梯与电梯", summary: "百层公寓送咖啡,每十层修一部快线电梯再修快线的快线——跳表让链表长出 log 的翅膀,Redis ZSet 的骨架。", chapterType: "comic", projectStage: "有序结构提速", technologies: ["跳表", "Redis ZSet"], jobSkills: ["数据结构", "Redis"], status: "planned" },
      { season: 2, episode: 3, title: "单词接龙树", summary: "菜单搜索框输「拿」字,Trie 顺藤摸瓜吐出拿铁全家桶——共享前缀,就是共享房租。", chapterType: "comic", projectStage: "菜单搜索补全", technologies: ["Trie", "前缀匹配"], jobSkills: ["数据结构"], status: "planned" },
      { season: 2, episode: 4, title: "门口的保安蜂", summary: "保安蜂说「没来过」绝对准、说「来过」可能冤枉——布隆过滤器与可删除的布谷鸟,为缓存穿透埋下钩子。", chapterType: "comic", projectStage: "门口第一道滤网", technologies: ["布隆过滤器", "布谷鸟过滤器"], jobSkills: ["数据结构", "系统设计"], status: "planned" },
      { season: 2, episode: 5, title: "认亲大会", summary: "拼团亲戚各认族长、一握手两族合并;路径压缩 = 别记你舅的舅,直接记族长——并查集近 O(1)。", chapterType: "comic", projectStage: "拼团连通性判定", technologies: ["并查集", "路径压缩"], jobSkills: ["数据结构"], status: "planned" },
      { season: 2, episode: 6, title: "点人头的神器", summary: "数到店 UV:精确点名用亿位打卡墙 Bitmap,只要大概用 12KB 魔法罐 HLL——「差不多一百万」便宜一万倍。", chapterType: "comic", projectStage: "UV 统计上线", technologies: ["Bitmap", "HyperLogLog", "Count-Min Sketch"], jobSkills: ["数据结构", "系统设计"], status: "planned" },
      { season: 2, episode: 7, title: "健忘的吧台", summary: "吧台只留最近用过的糖浆,最久没碰的下架——哈希表+双向链表缝合 LRU,LinkedHashMap 三行,Caffeine 量产。", chapterType: "comic", projectStage: "热点数据留吧台", technologies: ["LRU", "LinkedHashMap", "Caffeine"], jobSkills: ["数据结构", "缓存"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "A3",
    title: "算法招式",
    subtitle: "把 O(n²) 打成 O(n log n)",
    goal: "掌握二分、双指针、搜索、回溯、贪心、DP、单调栈这七套通用招式,能独立把暴力解一步步优化到位。",
    covers: ["二分查找", "双指针与滑动窗口", "BFS/DFS/拓扑", "回溯", "贪心", "动态规划", "单调栈/队列"],
    episodes: [
      { season: 3, episode: 1, title: "红蓝猜价", summary: "新品盲猜定价只听贵/便宜,红蓝染色摸边界;再玩二分答案:最少几台咖啡机扛住早高峰——答案本身也能二分。", chapterType: "comic", projectStage: "定价与容量估算", technologies: ["二分查找", "二分答案"], jobSkills: ["算法"], status: "planned" },
      { season: 3, episode: 2, title: "双人舞", summary: "阿零与豆豆从货架两端相向盘点;滑动窗口找「含全部三种豆子的最短货架段」——右手贪心,左手收敛。", chapterType: "comic", projectStage: "盘点从 O(n²) 到 O(n)", technologies: ["双指针", "滑动窗口"], jobSkills: ["算法"], status: "planned" },
      { season: 3, episode: 3, title: "迷宫送咖啡", summary: "商场迷宫送单 BFS 一圈圈涟漪找最短路;做一杯咖啡的工序图用拓扑排序排课——涟漪碰到你就是最短距离。", chapterType: "comic", projectStage: "配送路径与工序编排", technologies: ["BFS", "DFS", "拓扑排序"], jobSkills: ["算法"], status: "planned" },
      { season: 3, episode: 4, title: "悔棋的艺术", summary: "排下周班表:选择—深入—不行就擦掉重排;蜂十六一剪刀剪掉「周一连开三班」的整棵子树——敢试,更要敢擦。", chapterType: "comic", projectStage: "自动排班原型", technologies: ["回溯", "剪枝"], jobSkills: ["算法"], status: "planned" },
      { season: 3, episode: 5, title: "抠门的智慧", summary: "找零每次拿最大面额顺风顺水,换一套奇葩纪念币面额当场翻车——贪心不是策略,是需要证明的运气。", chapterType: "comic", projectStage: "找零策略学会自证", technologies: ["贪心", "反例构造"], jobSkills: ["算法"], status: "planned" },
      { season: 3, episode: 6, title: "记住走过的路", summary: "外卖小哥爬楼梯同一层被问八百遍,先在墙上记答案再干脆从一楼推到顶楼——DP 就是把「问过的」变成「查表的」。", chapterType: "comic", projectStage: "重复子问题只算一次", technologies: ["动态规划", "记忆化", "递推"], jobSkills: ["算法"], status: "planned" },
      { season: 3, episode: 7, title: "背包里的乾坤", summary: "进货预算 500 元每种豆子选或不选;销量曲线里找最长上升子序列证明生意在变好——人生处处是背包。", chapterType: "comic", projectStage: "进货预算最优化", technologies: ["0-1 背包", "完全背包", "LIS", "区间 DP"], jobSkills: ["算法"], status: "planned" },
      { season: 3, episode: 8, title: "站队的学问", summary: "接漏咖啡=接雨水,比我高的柱子才留着;滑窗最大值让「被新人全面碾压的老将」提前退场——单调栈/队列,KMP 彩蛋带过。", chapterType: "comic", projectStage: "算法内功出师", technologies: ["单调栈", "单调队列"], jobSkills: ["算法"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "A4",
    title: "架构外功",
    subtitle: "从一家店到三家店",
    goal: "以崩溃之夜复盘开场,掌握估算方法论与缓存、消息队列、分片、限流、分布式 ID/锁六件扛流量兵器。",
    covers: ["系统设计方法论", "缓存三劫", "消息队列", "分库分表与一致性哈希", "限流", "分布式 ID 与锁"],
    episodes: [
      { season: 4, episode: 1, title: "信封背面的战争", summary: "复盘崩溃之夜:四步法+信封速算(100 万粉丝×1% 转化÷10^5 秒),单店变三店门口加引导蜂——先画框框不丢人。", chapterType: "comic", projectStage: "v7.1:三实例 + 负载均衡", technologies: ["系统设计四步法", "信封估算", "负载均衡"], jobSkills: ["系统设计"], status: "planned" },
      { season: 4, episode: 2, title: "缓存三劫", summary: "幽灵咖啡穿透(保安蜂上岗)、招牌款过期万人踩踏(击穿)、全体缓存同秒失忆(雪崩,过期加随机盐)——三场劫难连环画。", chapterType: "incident", projectStage: "缓存层扛住三劫", technologies: ["缓存穿透", "缓存击穿", "缓存雪崩", "布隆过滤器"], jobSkills: ["系统设计", "Redis"], status: "planned" },
      { season: 4, episode: 3, title: "削峰的水库", summary: "洪峰不再直灌后厨,先进「叫号水库」匀速放水;彩蛋:动物园管理员递交退休信,蜂群自治 KRaft 上位。", chapterType: "comic", projectStage: "下单异步化削峰", technologies: ["消息队列", "Kafka", "KRaft"], jobSkills: ["消息队列", "系统设计"], status: "planned" },
      { season: 4, episode: 4, title: "切蛋糕与哈希环", summary: "订单库按店垂直切、按单号水平切;新店加入时哈希环上只搬走一小弧,虚拟节点解决蛋糕切不匀。", chapterType: "comic", projectStage: "订单库分片", technologies: ["分库分表", "一致性哈希", "虚拟节点"], jobSkills: ["系统设计", "MySQL"], status: "planned" },
      { season: 4, episode: 5, title: "龙头与闸门", summary: "咖啡机水路三闸:令牌桶攒水放突发、漏桶恒速滴滤、滑窗计数当水表;Redis+Lua 全店统一水闸——拒绝一部分人,是为了不辜负所有人。", chapterType: "comic", projectStage: "入口装上限流闸", technologies: ["令牌桶", "漏桶", "滑动窗口", "Redis+Lua"], jobSkills: ["系统设计"], status: "planned" },
      { season: 4, episode: 6, title: "全球唯一的小票号", summary: "三家店小票撞号大乌龙,雪花算法=时间戳+店号+流水;店里挂钟被拨慢,小票时光倒流事故——时钟回拨必被追问。", chapterType: "incident", projectStage: "全局 ID 发号器", technologies: ["分布式 ID", "雪花算法", "号段模式"], jobSkills: ["系统设计"], status: "planned" },
      { season: 4, episode: 7, title: "最后一包豆子", summary: "三家店同抢稀有豆:SET NX 上锁、烘豆太久看门狗续命;蜂十六与特米就 Redlock 靠不靠谱当场辩论——锁得住自己的超时才难。", chapterType: "comic", projectStage: "跨店互斥不超卖", technologies: ["分布式锁", "Redis SET NX", "看门狗", "Redlock"], jobSkills: ["系统设计", "Redis"], status: "planned" },
    ],
  },
  {
    season: 5,
    code: "A5",
    title: "经典战役",
    subtitle: "五大名局与终局评审",
    goal: "短链、秒杀、Feed、IM、排行榜五大经典设计逐一实战,终局架构评审夜串起全链路——面试白板从此不慌。",
    covers: ["短链系统", "秒杀系统", "Feed 流", "IM 系统", "LSM vs B+Tree", "CAP 与 Raft"],
    episodes: [
      { season: 5, episode: 1, title: "短链之战", summary: "优惠券长链没人扫,自建短链:雪花发号→62 进制→跳转;301 省流量但统计全丢,302 才知道谁扫了码。", chapterType: "comic", projectStage: "咖啡站短链服务", technologies: ["短链设计", "62 进制", "301/302"], jobSkills: ["系统设计"], status: "planned" },
      { season: 5, episode: 2, title: "秒杀之夜", summary: "限量 100 只纪念杯开抢:页面静态化、库存进 Redis+Lua 原子扣、抢到的进水库异步落单,黄牛蜂群被验证码+限流双杀——让 99% 的请求死在离数据库最远的地方。", chapterType: "comic", projectStage: "秒杀链路扛住开抢", technologies: ["秒杀设计", "静态化", "预扣库存", "Redis+Lua"], jobSkills: ["系统设计"], status: "planned" },
      { season: 5, episode: 3, title: "朋友圈的咖啡香", summary: "会员动态上线:小店发帖挨个塞信箱(推),豆豆成百万粉大 V 改粉丝自取(拉),最终大 V 拉、素人推——顶流的烦恼是给谁先看。", chapterType: "comic", projectStage: "会员动态 Feed 流", technologies: ["Feed 流", "写扩散", "读扩散"], jobSkills: ["系统设计"], status: "planned" },
      { season: 5, episode: 4, title: "已读不回", summary: "骑手客服 IM:长连接常年不挂、消息编号防乱序、没收到 ack 就重发收两遍靠去重——「已读」很轻,背后的 ack 很重。", chapterType: "comic", projectStage: "骑手客服 IM 上线", technologies: ["长连接", "seq", "ack", "离线消息"], jobSkills: ["系统设计"], status: "planned" },
      { season: 5, episode: 5, title: "排行榜风云", summary: "打赏榜用 ZSet,A2 的电梯楼再度登场;写爆的流水账改投 LSM 先记小本再定期整理——读多 B+Tree 翻账本,写多 LSM 记流水。", chapterType: "comic", projectStage: "打赏榜 + 流水存储选型", technologies: ["Redis ZSet", "LSM-Tree", "B+Tree"], jobSkills: ["系统设计", "存储"], status: "planned" },
      { season: 5, episode: 6, title: "终局 · 架构评审夜", summary: "三只蜂后投票选主演示 Raft 多数派与 CAP 取舍;蜂十六化身面试官,阿零对着白板从一杯咖啡讲到百万订单——卷终,留下一沓写满估算的信封。", chapterType: "project", projectStage: "扛流量咖啡平台 v8", technologies: ["CAP", "Raft", "全链路复盘"], jobSkills: ["系统设计", "架构", "面试"], status: "planned" },
    ],
  },
];

export function algoAllEpisodes(): JavaEpisode[] {
  return ALGO_SEASONS.flatMap((s) => s.episodes);
}

export function algoPublishedEpisodes(): JavaEpisode[] {
  return algoAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
