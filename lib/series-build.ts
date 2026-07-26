/**
 * 《从零开始造流水线》· 阿零的构建工程手记(第三部连载,slug 前缀 build)。
 *
 * 与 Java/CLI 线同宇宙:咖啡站上云(Java S7)之后生意做大,要开三家分店,
 * 阿零发现最大的敌人不再是写代码,而是「在我机器上是好的」。新导师
 * 大象工头「格叔」(Gradle 的大象)登场:象鼻能同时抓好几件工具(并行任务),
 * 干过的活凭指纹绝不返工(增量构建/缓存),随身一本《施工任务图》(任务 DAG),
 * 口头禅「能不干的活,一步都不多干」。老派信鸽邮差「马阿姨」(Maven)按流程表
 * 一步不差,与格叔斗嘴但互相尊重,担当 Gradle↔Maven 对照;豆豆客串产品经理
 * 兼质检科长,特米(CLI 线企鹅)在 CI 一话客串写流水线脚本(「man 一下 gradlew」)。
 *
 * 长期项目:把豆豆咖啡站改造成可复现的连锁流水线,检查点版本链 build-v0 → build-v6,
 * 与 Java 线 v0→v7 平行编号。本线独有深度栏目:🏗️ 双厂对照 —— 每话末尾用同一件事
 * 的两种施工法对照:左栏 Gradle(Kotlin DSL)、右栏 Maven(POM),标注语义差异与坑。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const BUILD_SERIES_META = {
  slug: "build-academy",
  title: "从零开始造流水线",
  alias: "阿零与格叔 · 构建工程手记",
  tagline: "豆豆咖啡站要开连锁分店,最大的敌人不再是写代码,而是「在我机器上是好的」。跟着阿零和大象工头格叔,建一条任何门店、任何时刻都能出品同一杯咖啡的中央流水线。",
  project: "把咖啡站改造成可复现的连锁流水线",
  storageKey: "build-academy:completed",
} as const;

export const BUILD_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "B1",
    title: "开工篇",
    subtitle: "看懂一张施工图",
    goal: "认识构建的本质是一张任务依赖图,用 Wrapper 把工具版本锁进仓库,看懂依赖坐标与作用域 —— 先把施工图读明白。",
    covers: ["任务 DAG", "Gradle Wrapper", "构建 DSL", "依赖坐标与作用域"],
    episodes: [
      { season: 1, episode: 1, title: "在我机器上是好的", summary: "三家分店照口述菜谱做出三个味道:构建不是脚本顺序执行,而是一张带依赖的任务图,格叔摔出《施工任务图》登场。", chapterType: "comic", projectStage: "口述菜谱 → 施工任务图", technologies: ["构建", "任务 DAG"], jobSkills: ["构建工程"], status: "planned" },
      { season: 1, episode: 2, title: "随图纸附赠的卷尺", summary: "分店旧卷尺刻度不一量歪吧台:gradlew 把 Gradle 版本钉在图纸上,任何人 clone 即可复现同版本构建。", chapterType: "comic", projectStage: "谁施工都用同一把卷尺", technologies: ["Gradle Wrapper", "gradlew"], jobSkills: ["Gradle"], status: "planned" },
      { season: 1, episode: 3, title: "两种方言的图纸", summary: "马阿姨的草书旧图纸对比打印体新图纸:Kotlin DSL 有类型提示与 IDE 补全,新项目一律 .kts,旧项目的 Groovy 也要认得。", chapterType: "comic", projectStage: "图纸换成打印体", technologies: ["Kotlin DSL", "Groovy DSL"], jobSkills: ["Gradle"], status: "planned" },
      { season: 1, episode: 4, title: "进货单上的三段暗号", summary: "豆豆要「牛奶」被格叔追问哪个牧场哪个批次:group:artifact:version 三段坐标与 mavenCentral 解析顺序,是「依赖从哪来」的全部答案。", chapterType: "comic", projectStage: "进货一律走中央市场", technologies: ["GAV 坐标", "mavenCentral"], jobSkills: ["依赖管理"], status: "planned" },
      { season: 1, episode: 5, title: "后厨的门禁卡", summary: "供应商想直接进后厨推销被格叔拦下:implementation 隐藏传递依赖加速编译,api 才对下游可见,选错拖慢全仓库。", chapterType: "comic", projectStage: "后厨与柜台分清了", technologies: ["implementation", "api"], jobSkills: ["依赖管理", "Gradle"], status: "planned" },
      { season: 1, episode: 6, title: "一袋豆子拖来一卡车", summary: "订一袋咖啡豆到货一卡车赠品堵满仓库:看 dependencies 任务输出认清传递依赖,精准 exclude 退货。", chapterType: "comic", projectStage: "仓库不再爆仓", technologies: ["传递依赖", "exclude"], jobSkills: ["依赖管理"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "B2",
    title: "进货篇",
    subtitle: "依赖不打架",
    goal: "冲突解决、BOM 对齐、Version Catalogs 与多模块拆分,再用锁文件把今天的依赖树冻住 —— 三店出品同款,立起 build-v2。",
    covers: ["版本冲突", "BOM / platform", "Version Catalogs", "多模块", "依赖锁定"],
    episodes: [
      { season: 2, episode: 1, title: "两个供应商送了同一种糖", summary: "糖浆 1.2 与 2.0 同时到货:Gradle 最高版本胜出、Maven 最近路径优先,同一套依赖两个工具解出不同结果,诡异 NoSuchMethodError 的根源。", chapterType: "incident", projectStage: "看懂收货规则", technologies: ["版本冲突", "resolutionStrategy"], jobSkills: ["依赖管理", "排障"], status: "planned" },
      { season: 2, episode: 2, title: "总店统一定价表", summary: "每家分店自己谈价同款杯子三个价:挂出 Spring Boot BOM 平台协议价,一族物料版本一夜对齐。", chapterType: "comic", projectStage: "全站版本对齐", technologies: ["BOM", "platform"], jobSkills: ["依赖管理"], status: "planned" },
      { season: 2, episode: 3, title: "一本活页进货目录", summary: "各分店抄进货单抄出错别字:libs.versions.toml 集中声明名字、版本与捆绑包,全站只此一本原件。", chapterType: "lab", projectStage: "进货单只有一份原件", technologies: ["Version Catalogs", "libs.versions.toml"], jobSkills: ["Gradle"], status: "planned" },
      { season: 2, episode: 4, title: "中央厨房与分店", summary: "咖啡站拆成 core / api / app 三车间:settings.gradle.kts 组织子项目,车间之间凭 project 依赖调货 —— 拆的不是代码是责任。", chapterType: "comic", projectStage: "多模块中央厨房", technologies: ["多模块", "settings.gradle.kts"], jobSkills: ["工程化"], status: "planned" },
      { season: 2, episode: 5, title: "马阿姨的流程表", summary: "走进马阿姨的邮局:POM 模型与 validate→compile→test→package 生命周期绑插件 goal 一格不差;Maven 4 新图纸尚未 GA,3.9.x 仍是主流。", chapterType: "comic", projectStage: "会读会改 Maven 项目", technologies: ["Maven", "POM", "生命周期"], jobSkills: ["Maven"], status: "planned" },
      { season: 2, episode: 6, title: "把今天的市场价冻起来", summary: "「1.+」让周一和周五进到不同批次的奶:依赖锁定把动态解析冻成锁文件,SemVer 三段号讲清换大版本 = 换配方。", chapterType: "lab", projectStage: "依赖树被锁死", technologies: ["依赖锁定", "SemVer"], jobSkills: ["依赖管理"], status: "planned" },
      { season: 2, episode: 7, title: "三店同款", summary: "卷终检查点:三家分店首次用同一套图纸加锁定进货单出品,盲测三杯无差 —— 可复现是工程给味道的承诺。", chapterType: "project", projectStage: "三店同款 build-v2", technologies: ["综合"], jobSkills: ["构建工程", "依赖管理"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "B3",
    title: "提速篇",
    subtitle: "大象从不返工",
    goal: "增量、缓存、配置缓存、工具链与约定插件 —— 把「能不干的活,一步都不多干」落进构建,最终造出逐字节可复现的产物。",
    covers: ["增量构建", "Build Cache", "Configuration Cache", "Toolchains", "可复现构建"],
    episodes: [
      { season: 3, episode: 1, title: "指纹考勤机", summary: "格叔给每道工序录材料指纹,没变的直接盖 UP-TO-DATE 章下班:输入/输出指纹是「第二次构建为什么秒完」的原理。", chapterType: "comic", projectStage: "全量构建 3 秒收工", technologies: ["增量构建", "UP-TO-DATE"], jobSkills: ["Gradle"], status: "planned" },
      { season: 3, episode: 2, title: "中央成品冷库", summary: "换分支不再样样重做:任务输出按输入哈希进冷库,本地/远程 Build Cache 让新同事第一次构建也能 FROM-CACHE。", chapterType: "comic", projectStage: "接上成品冷库", technologies: ["Build Cache"], jobSkills: ["Gradle"], status: "planned" },
      { season: 3, episode: 3, title: "连开工会都省了", summary: "每天开工前 20 分钟读图纸会:Configuration Cache 把配置阶段拍成快照,图纸没改就跳过开会,但任务不许再碰 Project 对象。", chapterType: "comic", projectStage: "省掉配置阶段", technologies: ["Configuration Cache"], jobSkills: ["Gradle"], status: "planned" },
      { season: 3, episode: 4, title: "自带工具箱的施工队", summary: "分店师傅 JDK 五花八门:Toolchains 在图纸上写死「本工程用 21 号扳手」,没有就自动下载,师傅手里的一概不认。", chapterType: "lab", projectStage: "扳手由图纸说了算", technologies: ["Java Toolchains"], jobSkills: ["Gradle", "工程化"], status: "planned" },
      { season: 3, episode: 5, title: "把惯例钉成模板", summary: "每张图纸开头抄同样 30 行:Convention Plugin(build-logic)刻成钢印模板,自定义 Task 用 Property API 声明输入输出才能增量、进冷库。", chapterType: "lab", projectStage: "配置即代码", technologies: ["Convention Plugin", "build-logic", "Property API"], jobSkills: ["Gradle 插件"], status: "planned" },
      { season: 3, episode: 6, title: "隔壁工地直接并网", summary: "改自研库不再发版刷新来回跑:included build 源码级并网,顺手拉出 Build Scan 体检报告找最慢工序 —— 优化前先测量。", chapterType: "lab", projectStage: "隔壁工地并网", technologies: ["复合构建", "Build Scan"], jobSkills: ["Gradle"], status: "planned" },
      { season: 3, episode: 7, title: "逐字节一样的咖啡", summary: "卷终检查点:同一张图纸在笔记本与云机各造一批,去时间戳、固定文件顺序、对哈希逐字节相同 —— 可复现构建是供应链防伪的地基。", chapterType: "project", projectStage: "逐字节可复现 build-v3", technologies: ["可复现构建"], jobSkills: ["构建工程"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "B4",
    title: "品控篇",
    subtitle: "测试即质检",
    goal: "JUnit 6、参数化、Testcontainers、测试分层与覆盖率门禁 —— 质检科开张,让流水线不只是更快地出错。",
    covers: ["JUnit 6", "Testcontainers", "测试分层", "JaCoCo"],
    episodes: [
      { season: 4, episode: 1, title: "质检科开张", summary: "豆豆出任质检科长,每道工序配「尝一口」用例:JUnit 6(Jupiter)的 @Test 与生命周期,@BeforeEach 是漱口、@Nested 是分组品鉴。", chapterType: "comic", projectStage: "每道工序有质检", technologies: ["JUnit 6", "@Test"], jobSkills: ["测试"], status: "planned" },
      { season: 4, episode: 2, title: "一张表尝一百杯", summary: "30 个复制粘贴的尝甜度用例换成一张参数表:@ParameterizedTest 消灭重复,AssertJ 让失败信息直接说「甜度 7 应为 5」。", chapterType: "lab", projectStage: "用例少而输入多", technologies: ["@ParameterizedTest", "AssertJ"], jobSkills: ["测试"], status: "planned" },
      { season: 4, episode: 3, title: "租来的迷你牧场", summary: "本店测试要真牛奶:Testcontainers 当场变出一次性 Postgres 迷你牧场,检完即拆,终结「我本机是好的」。", chapterType: "comic", projectStage: "集成测试用真奶牛", technologies: ["Testcontainers", "Docker"], jobSkills: ["测试", "集成测试"], status: "planned" },
      { season: 4, episode: 4, title: "牧场复用与专线直连", summary: "每次起牧场太慢:单例容器与 reuse 加速本地反馈,@ServiceConnection 让 Spring Boot 自动接管连接,CI 里的 Docker 套娃另有讲究。", chapterType: "lab", projectStage: "牧场秒级就位", technologies: ["Testcontainers", "@ServiceConnection"], jobSkills: ["集成测试"], status: "planned" },
      { season: 4, episode: 5, title: "质检也要分车间", summary: "单测集测混在一筐一跑 20 分钟:拆出 integrationTest 车间,公共品鉴工具进 test-fixtures 共享 —— 快测试天天跑,慢测试守大门。", chapterType: "lab", projectStage: "快慢测试分车间", technologies: ["source set", "java-test-fixtures"], jobSkills: ["测试", "工程化"], status: "planned" },
      { season: 4, episode: 6, title: "温度计不是 KPI", summary: "卷终检查点:老板要 100% 覆盖率、豆豆连倒水都写用例 —— JaCoCo 报告当体温计看趋势,verification rule 只卡底线。", chapterType: "project", projectStage: "质检流水线 build-v4", technologies: ["JaCoCo"], jobSkills: ["测试"], status: "planned" },
    ],
  },
  {
    season: 5,
    code: "B5",
    title: "出品篇",
    subtitle: "从 jar 到原生",
    goal: "普通 jar、fat jar、分层镜像到 native-image 与 jpackage —— 搞清楚每种出品形态给谁拆包,最后把自研库堂堂正正上架 Maven Central。",
    covers: ["打包形态", "native-image", "jlink / jpackage", "Maven Central"],
    episodes: [
      { season: 5, episode: 1, title: "三种包装的咖啡", summary: "散装豆、自热罐、分层礼盒:普通 jar、可执行 fat jar 与 Docker 分层镜像各有拆包人,shadow 合并 service 文件要合并不要覆盖。", chapterType: "comic", projectStage: "出品打包间开张", technologies: ["jar", "shadow", "分层镜像"], jobSkills: ["打包部署"], status: "planned" },
      { season: 5, episode: 2, title: "速溶冻干工艺", summary: "现磨风味全但启动慢:native-image 冻干机毫秒启动、内存减半,封闭世界里反射要提前申报 reachability metadata,Spring AOT 提前刻好 bean 图纸。", chapterType: "comic", projectStage: "冻干速溶版上线", technologies: ["GraalVM", "native-image", "Spring AOT"], jobSkills: ["GraalVM", "云原生"], status: "planned" },
      { season: 5, episode: 3, title: "家用小咖啡机出厂", summary: "给顾客做家用版:jlink 裁出只含所需模块的私有运行时、jpackage 打平台安装包;格叔展望 JDK 自带的预热保温杯(Leyden AOT cache)。", chapterType: "lab", projectStage: "桌面安装包出厂", technologies: ["jlink", "jpackage", "Project Leyden"], jobSkills: ["打包部署"], status: "planned" },
      { season: 5, episode: 4, title: "上架中央市场", summary: "卷终检查点:拉花算法库开源上架,Central Portal 柜台前 PGP 签名、javadoc/sources 缺一不可,版本号按 SemVer 签字画押。", chapterType: "project", projectStage: "自研库上架 build-v5", technologies: ["Maven Central", "PGP"], jobSkills: ["开源发布"], status: "planned" },
    ],
  },
  {
    season: 6,
    code: "B6",
    title: "防伪篇",
    subtitle: "供应链保卫战",
    goal: "SBOM、依赖校验、自动升级机器人、构建溯源与私服海关 —— 供应链保卫战打满全场,让产物自己证明「我从哪来」。",
    covers: ["SBOM", "依赖校验", "自动升级", "SLSA / Sigstore", "私服与 CI"],
    episodes: [
      { season: 6, episode: 1, title: "全店物料清单", summary: "「某批次糖浆有毒」全城咖啡店连夜翻仓库:构建期自动生成的 SBOM 一秒回答「我们没进过这批」—— 出事时最贵的是不知道自己用了什么。", chapterType: "incident", projectStage: "一秒答出用料", technologies: ["SBOM", "CycloneDX"], jobSkills: ["供应链安全"], status: "planned" },
      { season: 6, episode: 2, title: "验货章与封条", summary: "有人往中央市场混投毒批次:verification-metadata 对每件到货验 checksum 与 PGP 签名,CI 门口扫描员按 CVSS 分级放行而不是全量 fail。", chapterType: "lab", projectStage: "到货必验封条", technologies: ["依赖校验", "漏洞扫描"], jobSkills: ["供应链安全"], status: "planned" },
      { season: 6, episode: 3, title: "不知疲倦的进货员", summary: "机器人小 R 每周提 PR「奶粉 2.3.1→2.3.2」:Renovate 分组调度小步快跑消化升级,顺带处理一次注解处理器换代式迁移。", chapterType: "comic", projectStage: "升级周周消化", technologies: ["Renovate", "Dependabot"], jobSkills: ["依赖管理", "工程效率"], status: "planned" },
      { season: 6, episode: 4, title: "出厂溯源证书", summary: "顾客问「这罐真是你们厂出的?」:SLSA 构建证明链上可查哪份图纸哪台流水线,Sigstore 用 OIDC 短命证书加透明日志取代祖传印章。", chapterType: "comic", projectStage: "产物自带溯源", technologies: ["SLSA", "Sigstore", "provenance"], jobSkills: ["供应链安全"], status: "planned" },
      { season: 6, episode: 5, title: "海关与保税仓", summary: "连锁化设保税仓:私服代理、内部发布与 exclusiveContent 白名单;特米客串写 GitHub Actions —— setup-java、依赖缓存、多 JDK 矩阵。", chapterType: "lab", projectStage: "依赖进出过海关", technologies: ["私服", "GitHub Actions", "CI"], jobSkills: ["CI/CD", "仓库治理"], status: "planned" },
      { season: 6, episode: 6, title: "十年后的图纸", summary: "大结局圆桌:马阿姨晒 Maven 4 双 POM 新图纸,格叔预告 Gradle 10 配置缓存默认化与声明式图纸,远处 Bazel 起重机轰鸣,mise 自动换扳手、AI 在改旧图纸。", chapterType: "project", projectStage: "可信流水线 build-v6", technologies: ["Maven 4", "Gradle 10", "Bazel", "mise"], jobSkills: ["技术视野", "构建工程"], status: "planned" },
    ],
  },
];

export function buildAllEpisodes(): JavaEpisode[] {
  return BUILD_SEASONS.flatMap((s) => s.episodes);
}

export function buildPublishedEpisodes(): JavaEpisode[] {
  return buildAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
