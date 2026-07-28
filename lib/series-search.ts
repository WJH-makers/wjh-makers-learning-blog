/**
 * 《从零开始搞搜索》· 咖啡站情报室(咖啡站宇宙搜索线,slug 前缀 search-academy,路由 /search-engine)。
 *
 * 与咖啡站宇宙同线:菜单越加越长、订单越攒越多、评论越堆越乱,阿零那句
 * `LIKE '%咖啡%'` 在午高峰彻底跑瘫——于是二楼档案室的天窗被推开,跳下来
 * 一只狐狸「寻寻」(Xun):鼻子极灵,能从一整座图书馆里瞬间嗅到你要的那一页;
 * 尾巴扫过一排书脊,身后就凭空建好一张倒排索引(词 → 文档号的糖葫芦串)。
 * 她厌恶一切"全表扫一遍"的蛮力,口头禅「**不是遍历,是查表。**」;每当阿零
 * 张口就要"搜得更准",她先按住:「**先想清楚『相关』到底是什么意思。**」
 *
 * 联动钩子:豆豆客串"查询流量发生器"(制造午高峰的搜索风暴与刁钻 query);
 * 特米(CLI 线)从档案室通风管递 `curl`/`jq` 直接打 ES 的 `_search`;焰焰(JVM 线)
 * 在深分页 OOM 那话探头递一句 GC 观测。本线独有深度栏目两块:🔍 倒排台
 * (每话把检索还原成"怎么建表、怎么查表"——建索引与查索引两栏对照)+
 * 🎯 相关性台(排序为什么这么排——把打分公式摊开、把信号逐条称重)。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const SEARCH_SERIES_META = {
  slug: "search-academy",
  title: "从零开始搞搜索",
  alias: "阿零与寻寻 · 咖啡站情报室",
  tagline:
    "「不是遍历,是查表」——从倒排索引、TF-IDF/BM25 的第一性,到 Elasticsearch 分片与相关性调优,再到向量检索与 RAG 会师,带阿零给咖啡站搓一套又快又准的搜索。",
  project: "给咖啡站的菜单、订单、评论做一套又快又准的搜索",
  storageKey: "search-academy:completed",
} as const;

export const SEARCH_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "X1",
    title: "搜索的第一性",
    subtitle: "从 LIKE 到倒排",
    goal: "拆穿“模糊查询就是搜索”的错觉,从倒排索引、分词、TF-IDF/BM25 到评价指标,亲手搓出一个能用的迷你搜索引擎,让菜单第一次真正“可搜”。",
    covers: ["倒排索引", "TF-IDF/BM25", "准确率与召回率"],
    episodes: [
      { season: 1, episode: 1, title: "「%咖啡%」的三宗罪", summary: "LIKE 模糊查询为什么不算搜索:全表扫描慢、不分词、不排序,寻寻从档案室天窗跳下,一句「不是遍历,是查表」掀翻阿零的 SQL。", chapterType: "comic", projectStage: "先看清 LIKE 的天花板", technologies: ["LIKE", "全表扫描", "B+ 树前缀"], jobSkills: ["搜索基础"], status: "planned" },
      { season: 1, episode: 2, title: "尾巴一扫,索引成型", summary: "倒排索引原理:把「文档→词」翻转成「词→文档」,寻寻尾巴扫过整本菜单,每个词后面都挂上一串订单号的糖葫芦(posting list)。", chapterType: "comic", projectStage: "菜单建起第一张倒排表", technologies: ["倒排索引", "posting list", "词典 term dictionary"], jobSkills: ["倒排索引"], status: "planned" },
      { season: 1, episode: 3, title: "把句子剁成词", summary: "分词的门道:中英文切分、停用词、大小写与词干归一,「拿铁不加糖」被寻寻的鼻子拆成一把能查表的碎片,切错一刀就永远搜不到。", chapterType: "comic", projectStage: "给倒排表配上分词器", technologies: ["分词 tokenization", "停用词", "normalization"], jobSkills: ["文本分析"], status: "planned" },
      { season: 1, episode: 4, title: "谁更「相关」谁靠前", summary: "从 TF-IDF 到 BM25:词频越高就越重要?寻寻用饱和曲线按住暴涨的词频,再让罕见词加权——原来“相关”是能算出来的分数。", chapterType: "comic", projectStage: "给命中结果算相关性分", technologies: ["TF-IDF", "BM25", "词频饱和"], jobSkills: ["相关性打分"], status: "planned" },
      { season: 1, episode: 5, title: "与、或、非,连在一起", summary: "布尔检索与短语查询:AND/OR/NOT 在 posting list 上求交并差,短语查询靠位置信息锁死「冰美式」不被拆开也不许中间插字。", chapterType: "comic", projectStage: "支持布尔与短语查询", technologies: ["布尔检索", "短语查询", "position index"], jobSkills: ["查询解析"], status: "planned" },
      { season: 1, episode: 6, title: "三百行手搓搜索引擎", summary: "亲手把前五话拼成迷你倒排引擎:切词、建表、算 BM25、返回 topN,寻寻盯着阿零把“原理”跑成一段真能查的代码。", chapterType: "lab", projectStage: "跑通手写迷你搜索引擎", technologies: ["倒排构建", "BM25 打分", "topN 归并"], jobSkills: ["搜索引擎实现"], status: "planned" },
      { season: 1, episode: 7, title: "搜得准不准,得有尺子", summary: "评价指标速查卡:准确率、召回率、F1 与 P@K,搜索好坏不能拍脑袋,寻寻掏出一把量“相关”的尺子,顺手埋下 A/B 的伏笔。", chapterType: "reference", projectStage: "建立搜索评测基线", technologies: ["准确率", "召回率", "F1", "P@K"], jobSkills: ["搜索评测"], status: "planned" },
      { season: 1, episode: 8, title: "菜单能搜了 v1", summary: "卷终检查点:手写倒排接进咖啡站菜单,分词、BM25、布尔短语与评测基线全就位,「拿铁」终于能秒出结果——虽然还怕错别字。", chapterType: "project", projectStage: "菜单搜索能用了 · search-v1 第一性打底", technologies: ["倒排索引", "BM25", "评测基线", "综合"], jobSkills: ["搜索基础"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "X2",
    title: "Elasticsearch 工程",
    subtitle: "分片与检索引擎",
    goal: "把手写玩具换成工业级引擎:吃透 ES 的分片副本、mapping 与 analyzer、query/filter、聚合、深分页与刷新机制,直到集群不再脑裂、订单搜索稳稳上线。",
    covers: ["分片与副本", "mapping/analyzer", "聚合与深分页"],
    episodes: [
      { season: 2, episode: 1, title: "一张大表拆成几摞", summary: "ES 分片与副本:索引为什么要切成 shard、副本怎么扛节点宕机,寻寻把一柜子卡片分箱存放又各留一份备份,查询时并行捞再归并。", chapterType: "comic", projectStage: "搭起 ES 集群与索引", technologies: ["shard", "replica", "路由 routing"], jobSkills: ["Elasticsearch"], status: "planned" },
      { season: 2, episode: 2, title: "字段的户口本", summary: "mapping 与 analyzer:text 还是 keyword、分词器配在建索引还是查询侧,写错一次「拿铁」就搜不到,先定户口再上户。", chapterType: "comic", projectStage: "给订单字段定好 mapping", technologies: ["mapping", "text/keyword", "analyzer"], jobSkills: ["Elasticsearch"], status: "planned" },
      { season: 2, episode: 3, title: "要打分还是要缓存", summary: "query 与 filter:query 算相关性分,后者只判是非且可缓存,寻寻把“价格<30、只看在售”全塞进 filter 省算力。", chapterType: "comic", projectStage: "查询拆成 query + filter", technologies: ["query context", "filter context", "查询缓存"], jobSkills: ["Elasticsearch"], status: "planned" },
      { season: 2, episode: 4, title: "一边搜一边统计", summary: "聚合分析 aggregation:桶聚合分组、指标聚合求值,搜「美式」的同时顺手数出每家分店卖了多少杯、平均评分几颗星,一次请求两件事。", chapterType: "comic", projectStage: "搜索页挂上聚合看板", technologies: ["bucket 聚合", "metric 聚合", "aggregation"], jobSkills: ["Elasticsearch"], status: "planned" },
      { season: 2, episode: 5, title: "翻到第一千页翻车了", summary: "深分页事故:from+size 翻到深页,每个分片都要捞回海量文档到协调节点合并,内存爆掉;寻寻换 search_after 用游标往下翻。", chapterType: "incident", projectStage: "深分页改 search_after", technologies: ["from/size", "search_after", "scroll"], jobSkills: ["Elasticsearch", "排障"], status: "planned" },
      { season: 2, episode: 6, title: "写进去为什么搜不到", summary: "写入与刷新:refresh_interval 与近实时(NRT),订单等一次 refresh 才可见,寻寻拆开 translog 与段合并。", chapterType: "comic", projectStage: "调好写入与刷新节奏", technologies: ["refresh", "translog", "segment merge"], jobSkills: ["Elasticsearch"], status: "planned" },
      { season: 2, episode: 7, title: "集群裂成两半", summary: "脑裂事故:网络分区下两节点都自封 master、各写各的,数据打架;寻寻用多数派选举与 quorum 缝上裂缝,焰焰递一句 GC 停顿观测。", chapterType: "incident", projectStage: "集群选主与脑裂防护", technologies: ["脑裂 split-brain", "quorum", "master 选举"], jobSkills: ["Elasticsearch", "分布式"], status: "planned" },
      { season: 2, episode: 8, title: "订单搜索上线 v2", summary: "卷终检查点:订单搜索迁到 ES,分片副本、mapping、query/filter、聚合与 search_after 全配齐,大促也扛得住。", chapterType: "project", projectStage: "订单搜索上线 · search-v2 工程化", technologies: ["shard/replica", "mapping", "search_after", "综合"], jobSkills: ["Elasticsearch"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "X3",
    title: "相关性调优",
    subtitle: "让结果真正懂用户",
    goal: "直面“搜出来却答非所问”:先想清“相关”到底是什么,再用 function_score、同义词、纠错联想、个性化加权与 A/B 评估,把搜索结果从“匹配”调到“懂你”。",
    covers: ["function_score", "中文分词/同义词", "个性化与 A/B"],
    episodes: [
      { season: 3, episode: 1, title: "为什么老是答非所问", summary: "相关性为什么难:同一个「热」有人要温度有人要销量,寻寻先按住阿零反问「先想清楚『相关』到底是什么意思」,把需求翻译成可打分的信号。", chapterType: "comic", projectStage: "拆解相关性的目标信号", technologies: ["相关性建模", "查询意图", "打分信号"], jobSkills: ["相关性工程"], status: "planned" },
      { season: 3, episode: 2, title: "给分数加点私货", summary: "function_score 与 boosting:在 BM25 上按销量、新鲜度、距离重排,把业务信号焊进打分——每项都要能解释、能回滚。", chapterType: "comic", projectStage: "接入业务加权打分", technologies: ["function_score", "boosting", "field_value_factor"], jobSkills: ["相关性工程"], status: "planned" },
      { season: 3, episode: 3, title: "「拿铁」也是「拿铁咖啡」", summary: "中文分词与同义词:自定义词典收住「冰美式」不被切碎,同义词表让“拿铁/latte/牛奶咖啡”互相召回,寻寻的鼻子把说法不同的同一杯认成一杯。", chapterType: "comic", projectStage: "上中文词典与同义词", technologies: ["中文分词器", "同义词 synonym", "自定义词典"], jobSkills: ["文本分析"], status: "planned" },
      { season: 3, episode: 4, title: "你还没打完我就猜到了", summary: "拼写纠错与联想:编辑距离把「拿体」纠成「拿铁」,前缀树(FST)做 suggest 边打边补全,寻寻用鼻子在你敲完之前就闻出你要什么。", chapterType: "comic", projectStage: "加纠错与搜索联想", technologies: ["编辑距离", "suggest", "前缀树 FST"], jobSkills: ["搜索体验"], status: "planned" },
      { season: 3, episode: 5, title: "每个人的搜索都不同", summary: "个性化与业务加权:结合用户口味画像与实时库存做重排,常点燕麦奶的人搜「拿铁」先出燕麦款,寻寻提醒个性化别把探索性需求也锁死。", chapterType: "comic", projectStage: "搜索结果按人重排", technologies: ["个性化重排", "用户画像", "业务加权"], jobSkills: ["相关性工程"], status: "planned" },
      { season: 3, episode: 6, title: "到底哪版更好,让数据说", summary: "A/B 评估搜索效果:分流量对比两版排序,离线看 nDCG、线上看点击与转化,寻寻用离线指标 + 线上实验双保险,呼应 S1 那把评测尺子。", chapterType: "lab", projectStage: "搭起搜索 A/B 评估", technologies: ["A/B 实验", "点击率/转化", "离线 nDCG"], jobSkills: ["搜索评测"], status: "planned" },
      { season: 3, episode: 7, title: "不再答非所问 v3", summary: "卷终检查点:function_score、同义词、纠错联想、个性化与 A/B 评估全套上线,搜索结果终于“懂”用户,答非所问的投诉归零。", chapterType: "project", projectStage: "搜索结果不再答非所问 · search-v3 相关性达标", technologies: ["function_score", "同义词", "个性化", "综合"], jobSkills: ["相关性工程"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "X4",
    title: "向量检索与 RAG 会师",
    subtitle: "从关键词到语义",
    goal: "越过关键词检索的天花板:理解 Embedding 与 ANN,把向量检索与关键词检索融成混合检索,接进 RAG 的检索环节并评估检索质量,让咖啡站的搜索长出“语义”。",
    covers: ["Embedding", "ANN/向量库", "混合检索与 RAG"],
    episodes: [
      { season: 4, episode: 1, title: "词对不上,意思对得上", summary: "从关键词到语义:关键词检索的天花板是“换个说法就搜不到”,找「提神的」却漏掉「浓缩」,寻寻引出用向量表达含义、按意思而非字面查表。", chapterType: "comic", projectStage: "认清关键词检索的边界", technologies: ["语义鸿沟", "同义改写", "向量表示"], jobSkills: ["语义检索"], status: "planned" },
      { season: 4, episode: 2, title: "把一句话变成一串数", summary: "Embedding 是什么:文本被模型压成一串向量,语义相近的点在高维空间里彼此挨着,寻寻用鼻子闻“余弦距离”,近义的挨得近、无关的散得远。", chapterType: "comic", projectStage: "给菜单评论生成向量", technologies: ["Embedding", "余弦相似度", "向量空间"], jobSkills: ["语义检索"], status: "planned" },
      { season: 4, episode: 3, title: "千万向量里秒找邻居", summary: "向量数据库与 ANN:逐个算距离在千万级向量上太慢,HNSW 等近似最近邻建成分层跳表,把“查表”搬进高维空间,牺牲一点点精度换百倍速度。", chapterType: "comic", projectStage: "接入向量库做 ANN 检索", technologies: ["ANN", "HNSW", "向量数据库"], jobSkills: ["向量检索"], status: "planned" },
      { season: 4, episode: 4, title: "关键词和向量一起上", summary: "混合检索:BM25 抓精确关键词、向量抓语义近似,寻寻用 RRF 把两路结果按名次融合成一份榜单,精确与语义各补对方的短板。", chapterType: "comic", projectStage: "上线关键词+向量混合检索", technologies: ["混合检索 hybrid", "RRF 融合", "向量召回"], jobSkills: ["向量检索"], status: "planned" },
      { season: 4, episode: 5, title: "喂给大模型之前那一步", summary: "RAG 检索环节:回答质量八成压在“召回对不对”上,寻寻强调检索才是地基——切块、召回、重排、拼 prompt,错一步大模型就一本正经胡说。", chapterType: "comic", projectStage: "把混合检索接进 RAG", technologies: ["RAG", "chunking", "rerank"], jobSkills: ["RAG"], status: "planned" },
      { season: 4, episode: 6, title: "检索到底行不行,量给你看", summary: "评估检索质量:recall@K、MRR、nDCG 一起上,寻寻用新尺子量语义检索,回扣 S1 评价指标——从关键词到语义,评测方法一脉相承。", chapterType: "lab", projectStage: "评估语义检索质量", technologies: ["recall@K", "MRR", "nDCG"], jobSkills: ["搜索评测", "RAG"], status: "planned" },
      { season: 4, episode: 7, title: "语义搜索 + RAG 落地 · 搜索大成", summary: "大结局:关键词与向量混合检索接进 RAG,咖啡站智能问答上线,评测全绿;寻寻尾巴一扫留下最后一张倒排表,把索引钥匙交到阿零手里。", chapterType: "project", projectStage: "语义搜索 + RAG 落地 · search-v4 搜索大成", technologies: ["混合检索", "RAG", "向量库", "综合"], jobSkills: ["语义检索", "RAG"], status: "planned" },
    ],
  },
];

export function searchAllEpisodes(): JavaEpisode[] {
  return SEARCH_SEASONS.flatMap((s) => s.episodes);
}

export function searchPublishedEpisodes(): JavaEpisode[] {
  return searchAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
