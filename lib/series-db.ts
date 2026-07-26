/**
 * 《从零开始存数据》· 万象图书馆(第三部连载,slug 前缀 db)。
 *
 * 与咖啡站宇宙同源:豆豆咖啡站的订单/会员/菜单数据就是本线的全部库表,
 * 一张巨型 Excel 撑不住之后,阿零(已是技术合伙人)遇见图书馆海豚馆长
 * 「琪拉」(Sakila,鳍上夹目录卡片、痛恨"凭感觉优化",口头禅"先 EXPLAIN 一下!"),
 * 后期两位馆员登场:速取架松鼠「红枣」(Redis)与自由书舍绿叶精灵「阿檬」(MongoDB)。
 *
 * 本线独有深度栏目:🔬 显微镜下(每话一格)—— EXPLAIN 逐列解读、
 * SHOW ENGINE INNODB STATUS、OBJECT ENCODING、Mongo explain(),"证据,不是感觉"。
 * 联动钩子:第 19 话与《豆豆咖啡站》"会员日卡死"同一事件双视角;连接池一话
 * 复用 Java 线 Spring Boot 服务;第 34 话特米客串备份;卷末检查点 = 图书馆 v0→v6。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const DB_SERIES_META = {
  slug: "db-academy",
  title: "从零开始存数据",
  alias: "阿零与琪拉 · 万象图书馆",
  tagline: "订单越来越多,一张 Excel 撑不住了。跟着阿零和琪拉馆长,从建库建表一路修到向量检索,把咖啡站的数据经营成一座万象图书馆。",
  project: "把咖啡站数据从 Excel 记账升级为智慧图书馆(v0 → v6)",
  storageKey: "db-academy:completed",
} as const;

export const DB_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "D1",
    title: "建馆篇",
    subtitle: "从记事本到关系库",
    goal: "认识关系模型与 MySQL 的五脏六腑,选对引擎与数据类型,把咖啡站从 Excel 记账迁进第一座正经数据库(图书馆 v1)。",
    covers: ["关系模型与 SQL", "范式与建模", "MySQL 体系结构", "存储引擎", "数据类型"],
    episodes: [
      { season: 1, episode: 1, title: "Excel 之死", summary: "两人同时改一格 Excel 直接撕裂,琪拉现身:表/行/列与 DDL/DML/DQL,数据不是记下来就完了,是要能被问出来。", chapterType: "comic", projectStage: "告别 Excel,建第一张订单表", technologies: ["SQL", "DDL", "DML", "JOIN"], jobSkills: ["SQL"], status: "planned" },
      { season: 1, episode: 2, title: "书架设计学", summary: "每本书夹着作者简介复印件,作者改名要撕一万张:1NF/2NF/3NF 消冗余,反范式换读性能——抄十遍不如指一次。", chapterType: "comic", projectStage: "订单/会员/菜单拆表建模", technologies: ["范式", "反范式", "外键引用"], jobSkills: ["数据建模"], status: "planned" },
      { season: 1, episode: 3, title: "图书馆的五脏", summary: "一张借书单穿过前台(连接器)、翻译窗口(解析器)、路线规划室(优化器)、书库(引擎):一条 SQL 的完整旅程。", chapterType: "comic", projectStage: "看懂一条 SQL 的一生", technologies: ["MySQL", "Server 层", "存储引擎"], jobSkills: ["MySQL", "八股"], status: "planned" },
      { season: 1, episode: 4, title: "两位老馆长", summary: "MyISAM 手脚快但火灾后书全乱,InnoDB 每笔登记、可回滚:事务/行锁/崩溃恢复,为什么它是唯一现实选择。", chapterType: "comic", projectStage: "引擎定为 InnoDB", technologies: ["InnoDB", "MyISAM"], jobSkills: ["MySQL", "八股"], status: "planned" },
      { season: 1, episode: 5, title: "一格一书位", summary: "金额用 FLOAT 找零少一分顾客暴怒:INT/BIGINT、VARCHAR/TEXT、DATETIME/TIMESTAMP 的选型,钱永远用 DECIMAL。", chapterType: "comic", projectStage: "图书馆 v1:关系库建成", technologies: ["数据类型", "DECIMAL"], jobSkills: ["MySQL", "数据建模"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "D2",
    title: "目录篇",
    subtitle: "索引让查找从遍历到直达",
    goal: "吃透 B+树与索引设计:聚簇/二级/联合/覆盖,会读 EXPLAIN、背熟失效清单,查询从全馆大搜捕变成直达书位(图书馆 v2)。",
    covers: ["B+树原理", "聚簇与二级索引", "联合索引", "覆盖索引", "EXPLAIN", "索引失效"],
    episodes: [
      { season: 2, episode: 1, title: "全馆大搜捕", summary: "找一本书翻遍全馆累瘫,琪拉搬出三层直达、底层手拉手串成链的矮胖目录柜:B+树为什么不是二叉树/哈希/跳表。", chapterType: "comic", projectStage: "第一个索引建成", technologies: ["B+树", "索引"], jobSkills: ["MySQL 索引", "八股"], status: "planned" },
      { season: 2, episode: 2, title: "正本与卡片", summary: "主目录柜直接放书,作者卡片柜只写编号还得回主柜取书:聚簇/二级索引与回表,主键为何要自增且短。", chapterType: "comic", projectStage: "主键与二级索引就位", technologies: ["聚簇索引", "回表", "自增主键"], jobSkills: ["MySQL 索引", "八股"], status: "planned" },
      { season: 2, episode: 3, title: "卡片的排序法", summary: "卡片按作者→年份→书名排,直接问「2020 年的书」柜子当场懵掉:最左前缀与范围列截断后续列。", chapterType: "comic", projectStage: "联合索引设计入门", technologies: ["联合索引", "最左前缀"], jobSkills: ["MySQL 索引"], status: "planned" },
      { season: 2, episode: 4, title: "不用取书的查询", summary: "顾客只问「这作者有几本书」,答案就在卡片上何必惊动书库:覆盖索引免回表,慢查询优化性价比之王。", chapterType: "comic", projectStage: "热点查询免回表", technologies: ["覆盖索引"], jobSkills: ["MySQL 索引", "性能优化"], status: "planned" },
      { season: 2, episode: 5, title: "馆长的显微镜", summary: "祖传显微镜照出 type/key/rows/Extra 光幕,阿零第一次看见自己的查询打算扫 20 万行:逐列读懂 EXPLAIN。", chapterType: "reference", projectStage: "会自己看执行计划", technologies: ["EXPLAIN"], jobSkills: ["性能优化", "八股"], status: "planned" },
      { season: 2, episode: 6, title: "目录失灵事件簿", summary: "函数加工、隐式转换、前导模糊、OR……单元剧连播「卡片柜罢工」名场面:索引失效事故清单一次背熟。", chapterType: "incident", projectStage: "图书馆 v2:查询直达", technologies: ["索引失效", "隐式转换"], jobSkills: ["MySQL 索引", "排障"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "D3",
    title: "借阅规程篇",
    subtitle: "事务、MVCC 与锁",
    goal: "积分换咖啡不再丢一半:ACID、隔离级别、MVCC、锁体系与双日志,再给前台配上连接池(图书馆 v3)。",
    covers: ["事务 ACID", "隔离级别", "MVCC", "InnoDB 锁", "redo/binlog", "连接池"],
    episodes: [
      { season: 3, episode: 1, title: "转账借书协议", summary: "扣积分成功、出咖啡失败,顾客举杯维权:ACID 各由 undo/redo/锁+MVCC 什么机制保证——一半的成功比失败更可怕。", chapterType: "comic", projectStage: "积分兑换进事务", technologies: ["事务", "ACID", "undo log"], jobSkills: ["事务", "八股"], status: "planned" },
      { season: 3, episode: 2, title: "四重结界", summary: "同一笔借阅在 RU/RC/RR/串行化四个平行宇宙的四种结局:脏读/不可重复读/幻读,以及大厂为何常用 RC。", chapterType: "comic", projectStage: "选定隔离级别", technologies: ["隔离级别", "RR", "RC"], jobSkills: ["事务", "八股"], status: "planned" },
      { season: 3, episode: 3, title: "时光底片", summary: "每本书背后挂一串历史底片,读者进馆领时间眼镜只见进馆前的世界:undo 版本链 + ReadView,读不加锁的秘密。", chapterType: "comic", projectStage: "看懂快照读", technologies: ["MVCC", "ReadView"], jobSkills: ["事务", "八股"], status: "planned" },
      { season: 3, episode: 4, title: "锁链与间隙", summary: "连两本书之间的空位也拉上警戒线防插书:行锁/间隙锁/临键锁/意向锁,锁其实加在索引上。", chapterType: "comic", projectStage: "库存扣减不超卖", technologies: ["行锁", "间隙锁", "临键锁"], jobSkills: ["事务", "并发"], status: "planned" },
      { season: 3, episode: 5, title: "死锁罗生门", summary: "阿零锁 A 等 B、豆豆锁 B 等 A,书架间僵持成表情包:死锁成因与 SHOW ENGINE INNODB STATUS 破案。", chapterType: "incident", projectStage: "第一次死锁复盘", technologies: ["死锁", "SHOW ENGINE INNODB STATUS"], jobSkills: ["排障", "事务"], status: "planned" },
      { season: 3, episode: 6, title: "双日志密卷", summary: "馆内速记板(redo)与对外《馆务日报》(binlog)红头文件互相盖章:WAL、崩溃恢复与两阶段提交。", chapterType: "comic", projectStage: "断电也不丢账", technologies: ["redo log", "binlog", "两阶段提交"], jobSkills: ["MySQL", "八股"], status: "planned" },
      { season: 3, episode: 7, title: "前台守门人", summary: "读者揣着通行牌回家、全馆无牌可用:HikariCP 参数与连接泄漏,Java 线的 Spring Boot 借书人直接接入。", chapterType: "comic", projectStage: "图书馆 v3:借阅规程完备", technologies: ["HikariCP", "连接池"], jobSkills: ["Spring Boot", "排障"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "D4",
    title: "提速改造篇",
    subtitle: "慢查询优化与架构扩展",
    goal: "从会员日卡死破案开始:slow log、Buffer Pool、JOIN 与深分页,一路扩展到读写分离与分库分表(图书馆 v4)。",
    covers: ["慢查询定位", "Buffer Pool", "JOIN 算法", "深分页", "主从复制", "分库分表"],
    episodes: [
      { season: 4, episode: 1, title: "会员日惨案", summary: "《豆豆咖啡站》会员日排队卡死的幕后真相:超时借阅登记簿(slow log)揪出无索引大查询——不测量,你优化的只是心情。", chapterType: "incident", projectStage: "慢查询有账可查", technologies: ["slow log", "long_query_time"], jobSkills: ["性能优化", "排障"], status: "planned" },
      { season: 4, episode: 2, title: "记忆大厅", summary: "一次全馆盘点差点把恒温大厅塞满旧书,幸好分了新客区/常客区:Buffer Pool 改良 LRU 与脏页刷盘。", chapterType: "comic", projectStage: "命中率看得见", technologies: ["Buffer Pool", "LRU"], jobSkills: ["MySQL", "八股"], status: "planned" },
      { season: 4, episode: 3, title: "攒一波再上架", summary: "还书先堆小推车攒够顺路上架、常问书位馆员直接背下、卡片柜学会先筛再放行:change buffer、自适应哈希与索引下推。", chapterType: "comic", projectStage: "写入与回表双提速", technologies: ["change buffer", "自适应哈希", "ICP"], jobSkills: ["MySQL", "性能优化"], status: "planned" },
      { season: 4, episode: 4, title: "联谊查询", summary: "图书架与作者架配对:挨个牵手(NLJ)、整车相亲(BNL)、按暗号分桶速配(hash join)——小表驱动大表的礼貌。", chapterType: "comic", projectStage: "多表查询不再玄学", technologies: ["JOIN", "hash join"], jobSkills: ["性能优化", "八股"], status: "planned" },
      { season: 4, episode: 5, title: "翻到一百万页", summary: "顾客要第 100 万本起的 10 本,馆员真从第 1 本数起:深分页游标翻页、filesort 消除术与 count(*) 的真相。", chapterType: "comic", projectStage: "列表页丝滑翻页", technologies: ["深分页", "ORDER BY", "count"], jobSkills: ["性能优化"], status: "planned" },
      { season: 4, episode: 6, title: "分馆时代", summary: "总馆管进书、分馆抄《馆务日报》供阅览,馆藏爆炸后按书号取模开连锁:主从延迟、分库分表与 gh-ost 营业中换书架。", chapterType: "comic", projectStage: "图书馆 v4:连锁分馆", technologies: ["主从复制", "分库分表", "Online DDL"], jobSkills: ["架构", "MySQL"], status: "planned" },
    ],
  },
  {
    season: 5,
    code: "D5",
    title: "速取架篇",
    subtitle: "Redis 与缓存",
    goal: "松鼠红枣登场:五大类型、持久化、穿透/击穿/雪崩与缓存一致性,点单延迟从 200ms 掉到 2ms(图书馆 v5)。",
    covers: ["Redis 数据类型", "持久化", "缓存三大问题", "缓存一致性", "高可用", "分布式锁"],
    episodes: [
      { season: 5, episode: 1, title: "门口的松鼠", summary: "红枣把热门书直接摆前台伸手就到,咖啡站点单延迟 200ms 掉到 2ms:Redis 内存定位与 String/Hash 场景。", chapterType: "comic", projectStage: "菜单进缓存", technologies: ["Redis", "String", "Hash"], jobSkills: ["Redis"], status: "planned" },
      { season: 5, episode: 2, title: "五种坚果罐", summary: "排队罐、去重罐、排行榜罐:List/Set/ZSet 典型场景,咖啡销量榜实时刷新(显微镜下看 OBJECT ENCODING)。", chapterType: "comic", projectStage: "排行榜与抽奖上线", technologies: ["List", "Set", "ZSet"], jobSkills: ["Redis", "八股"], status: "planned" },
      { season: 5, episode: 3, title: "松鼠的过冬账本", summary: "午睡前派分身拍全景照(RDB fork+COW)、小本子记每次挪动(AOF 三种 fsync):停电后照片加小本完整复原。", chapterType: "comic", projectStage: "缓存宕机不失忆", technologies: ["RDB", "AOF", "混合持久化"], jobSkills: ["Redis", "八股"], status: "planned" },
      { season: 5, episode: 4, title: "三大灵异事件", summary: "问不存在的书直冲书库、镇馆之宝过期瞬间万人挤入、全架同秒过期书库被踏平:穿透/击穿/雪崩与三套解法。", chapterType: "incident", projectStage: "秒杀活动扛住了", technologies: ["布隆过滤器", "互斥锁", "过期打散"], jobSkills: ["Redis", "高并发"], status: "planned" },
      { season: 5, episode: 5, title: "两处书,一个真相", summary: "书库改了定价、速取架还是旧价,顾客拿旧价单维权:Cache-Aside、先更库再删缓存与延迟双删。", chapterType: "comic", projectStage: "价格永远一致", technologies: ["Cache-Aside", "延迟双删"], jobSkills: ["Redis", "架构"], status: "planned" },
      { season: 5, episode: 6, title: "松鼠军团", summary: "带徒弟(主从)、猫头鹰哨兵盯梢换班、16384 个格子分给军团,采购单插带过期的红旗(SET NX EX):高可用、分布式锁与大 key 治理。", chapterType: "comic", projectStage: "图书馆 v5:速取架军团", technologies: ["Sentinel", "Cluster", "分布式锁"], jobSkills: ["Redis", "分布式"], status: "planned" },
    ],
  },
  {
    season: 6,
    code: "D6",
    title: "新馆区篇",
    subtitle: "文档、向量与前沿",
    goal: "阿檬的自由书舍与语义检索厅:MongoDB、向量检索,加上备份恢复演练与版本年鉴——智慧图书馆 v6 落成。",
    covers: ["MongoDB 文档模型", "聚合管道", "向量数据库", "备份与恢复", "版本前沿"],
    episodes: [
      { season: 6, episode: 1, title: "自由书舍", summary: "阿檬的书舍里每本书想多厚多厚、章节随意生长(BSON),顾客留言墙正好入住:内嵌 vs 引用,规矩与自由各有胜场。", chapterType: "comic", projectStage: "留言墙进 MongoDB", technologies: ["MongoDB", "BSON"], jobSkills: ["MongoDB"], status: "planned" },
      { season: 6, episode: 2, title: "书舍的目录与流水线", summary: "复合索引按等值→排序→范围摆(ESR),留言经传送带 $match→$group→$lookup 层层加工,三胞胎互为备份(副本集)。", chapterType: "lab", projectStage: "留言统计上线", technologies: ["复合索引", "聚合管道", "副本集"], jobSkills: ["MongoDB"], status: "planned" },
      { season: 6, episode: 3, title: "语义检索厅", summary: "「想要雨天窝沙发喝的咖啡」关键词检索全灭,每本书发一枚气味坐标(嵌入向量):HNSW 电梯步道与向量库选型光谱。", chapterType: "comic", projectStage: "语义搜菜单可用", technologies: ["向量检索", "HNSW", "嵌入向量"], jobSkills: ["向量数据库", "AI 工程"], status: "planned" },
      { season: 6, episode: 4, title: "典藏库与新纪元", summary: "特米客串 cron+mysqldump+binlog 演练「回到删库前一分钟」,卷终合影宣读版本年鉴(MySQL 9.7 LTS、Redis 8 与 Valkey、Mongo 8)。", chapterType: "project", projectStage: "智慧图书馆 v6 落成", technologies: ["mysqldump", "binlog PITR", "综合"], jobSkills: ["备份恢复", "架构"], status: "planned" },
    ],
  },
];

export function dbAllEpisodes(): JavaEpisode[] {
  return DB_SEASONS.flatMap((s) => s.episodes);
}

export function dbPublishedEpisodes(): JavaEpisode[] {
  return dbAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
