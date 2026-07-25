/**
 * Java 漫画生态 · 单一事实源(方案 B:系列元数据独立维护,不侵入 Post/Mongo)。
 *
 * 这里只放"地图":连载定位、六季主线、每话在咖啡站项目里的阶段、对应招聘技能。
 * 正文仍走现有文章系统(content/posts + Mongo),已发布的话用 slug 指向 /posts/<slug>。
 * 番外(平行宇宙)单独列 SIDE_QUESTS,不塞进主线。
 *
 * 设计原则:主线只教"一条能就业、能把咖啡站建成真实后端"的路径;
 * 其余生态做成支线,不强迫零基础一次学完。改这里不影响任何已发布文章。
 */

export type ChapterType =
  | "comic" // 漫画:讲心智模型、冲突、错误
  | "lab" // 实验手册:命令/SQL/配置,可复制
  | "reference" // 速查卡:API 与参数
  | "incident" // 事故报告:线上排障复盘
  | "project"; // 项目检查点:一话结束时系统的真实状态

export type Level = "intro" | "beginner" | "core" | "backend" | "production" | "distributed";

export type EpisodeStatus = "published" | "draft" | "planned";

export type JavaEpisode = {
  season: number;
  episode: number;
  title: string;
  summary: string;
  chapterType: ChapterType;
  /** 本话结束时"豆豆咖啡站"长成什么样 */
  projectStage: string;
  technologies: string[];
  /** 与招聘瞭望台联动的技能节点 */
  jobSkills: string[];
  status: EpisodeStatus;
  /** 仅 published/draft:指向 /posts/<slug> */
  slug?: string;
};

export type JavaSeason = {
  season: number;
  code: string; // "S1"
  title: string;
  subtitle: string;
  goal: string;
  /** 覆盖的"Java 宇宙"章节,便于和知识树对照 */
  covers: string[];
  episodes: JavaEpisode[];
};

export type SideQuest = {
  slug: string;
  title: string;
  positioning: string;
  reason: string;
  technologies: string[];
};

/** 咖啡站从一行输出到 K8s 集群的成长时间线,是贯穿全系列的第二条主线。 */
export const PROJECT_STAGES: { stage: string; season: number; desc: string }[] = [
  { stage: "控制台咖啡机", season: 1, desc: "一个 main 方法,能打印、能算价、能接收顾客输入" },
  { stage: "面向对象咖啡站", season: 2, desc: "Coffee / Order / 支付接口,用集合管理菜单与订单" },
  { stage: "可维护订单系统", season: 3, desc: "异常兜底、文件持久化、Maven 多模块、JUnit 覆盖" },
  { stage: "Spring Boot 咖啡店 API", season: 4, desc: "REST + MySQL + 登录鉴权的单体后端" },
  { stage: "上线并可排障的服务", season: 5, desc: "Docker 部署、监控日志、JVM 事故复盘" },
  { stage: "分布式咖啡平台", season: 6, desc: "Redis/MQ/Spring Cloud,Docker 打包,微服务化" },
  { stage: "云端咖啡平台", season: 7, desc: "K8s 集群、CI/CD、监控与链路追踪,大促演练扛得住" },
];

export const SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "S1",
    title: "点火篇",
    subtitle: "程序开始运转",
    goal: "掌握语法,让程序自己跑起来,完成一个几百行以内的控制台咖啡机。",
    covers: ["0. 编程基础世界", "1. Java 语言大陆"],
    episodes: [
      {
        season: 1,
        episode: 1,
        title: "第一次让程序开口",
        summary: "写下第一个 Java 类,理解编译与运行各自做了什么,让 Hello, Java! 出现。",
        chapterType: "comic",
        projectStage: "空终端 → 第一行输出",
        technologies: ["JDK", "javac", "java", "main", "System.out"],
        jobSkills: ["Java 基础"],
        status: "published",
        slug: "2026-07-25-java-s01e01-hello",
      },
      { season: 1, episode: 2, title: "变量仓库", summary: "8 种基本类型:不同盒子只能装不同东西。", chapterType: "comic", projectStage: "记住咖啡价格与库存", technologies: ["int", "double", "boolean", "char"], jobSkills: ["Java 基础"], status: "published", slug: "2026-07-26-java-s01e02-variables" },
      { season: 1, episode: 3, title: "咖啡价格计算器", summary: "算术 / 比较 / 逻辑运算符,以及整数除法的坑。", chapterType: "comic", projectStage: "总价 = 单价 × 杯数", technologies: ["运算符"], jobSkills: ["Java 基础"], status: "published", slug: "2026-07-27-java-s01e03-operators" },
      { season: 1, episode: 4, title: "余额不足:if", summary: "分支判断,以及 = 和 == 写错的经典 Bug。", chapterType: "comic", projectStage: "付款前先判断余额", technologies: ["if", "else"], jobSkills: ["Java 基础"], status: "published", slug: "2026-07-28-java-s01e04-if" },
      { season: 1, episode: 5, title: "菜单选择:switch", summary: "现代箭头 switch,以及老式 switch 的穿透事故。", chapterType: "comic", projectStage: "按编号点单", technologies: ["switch"], jobSkills: ["Java 基础"], status: "published", slug: "2026-07-29-java-s01e05-switch" },
      { season: 1, episode: 6, title: "批量制作:循环", summary: "for / while / do-while 一次做很多杯,以及死循环。", chapterType: "comic", projectStage: "自动制作 N 杯", technologies: ["for", "while"], jobSkills: ["Java 基础"], status: "published", slug: "2026-07-30-java-s01e06-loops" },
      { season: 1, episode: 7, title: "多杯订单:数组", summary: "一维数组、遍历、Arrays 工具类,以及数组越界。", chapterType: "comic", projectStage: "一单多杯", technologies: ["array", "Arrays"], jobSkills: ["Java 基础"], status: "published", slug: "2026-07-31-java-s01e07-arrays" },
      { season: 1, episode: 8, title: "制作步骤:方法", summary: "把重复步骤封装成方法,参数与返回值。", chapterType: "comic", projectStage: "makeCoffee() 复用", technologies: ["method"], jobSkills: ["Java 基础"], status: "published", slug: "2026-08-01-java-s01e08-methods" },
      { season: 1, episode: 9, title: "顾客输入:Scanner", summary: "读取控制台输入,把程序变成交互式。", chapterType: "comic", projectStage: "顾客自己点单", technologies: ["Scanner"], jobSkills: ["Java 基础"], status: "published", slug: "2026-08-02-java-s01e09-scanner" },
      { season: 1, episode: 10, title: "名称与备注:String", summary: "String 不可变、== vs equals、StringBuilder 与文本块。", chapterType: "comic", projectStage: "带备注的订单", technologies: ["String", "StringBuilder"], jobSkills: ["Java 基础"], status: "published", slug: "2026-08-03-java-s01e10-string" },
      { season: 1, episode: 11, title: "Bug 第一次入侵", summary: "读懂真实报错:语法 / 逻辑 / Null 三种 Bug 怪。", chapterType: "comic", projectStage: "第一次自己修好一个报错", technologies: ["调试", "报错阅读"], jobSkills: ["排障"], status: "published", slug: "2026-08-04-java-s01e11-bugs" },
      { season: 1, episode: 12, title: "控制台咖啡机", summary: "第一季大结局:整合成一个可运行、带测试的点单程序。", chapterType: "project", projectStage: "控制台咖啡机 v1", technologies: ["综合"], jobSkills: ["Java 基础", "工程习惯"], status: "published", slug: "2026-08-05-java-s01e12-coffee-machine" },
    ],
  },
  {
    season: 2,
    code: "S2",
    title: "对象大陆",
    subtitle: "面向对象与标准库",
    goal: "真正理解为什么要造对象,而不是把所有代码塞进 main;掌握集合与泛型。",
    covers: ["2. 面向对象大陆", "3. 核心类库城市", "5. 集合大陆", "6. 泛型世界"],
    episodes: [
      { season: 2, episode: 1, title: "Coffee 设计图:类与对象", summary: "class 的属性/方法/构造器,new 出实例。", chapterType: "comic", projectStage: "Coffee 类替代散装变量", technologies: ["class", "new"], jobSkills: ["面向对象"], status: "published", slug: "2026-08-06-java-s02e01-class" },
      { season: 2, episode: 2, title: "封装保险柜", summary: "private + getter/setter,在 setter 里挡住非法数据。", chapterType: "comic", projectStage: "价格不能被随意改", technologies: ["private", "封装"], jobSkills: ["面向对象"], status: "published", slug: "2026-08-07-java-s02e02-encapsulation" },
      { season: 2, episode: 3, title: "继承家族", summary: "extends / super / @Override,复用父类零复制。", chapterType: "comic", projectStage: "普通机 → 高级咖啡机", technologies: ["继承"], jobSkills: ["面向对象"], status: "published", slug: "2026-08-08-java-s02e03-inheritance" },
      { season: 2, episode: 4, title: "多态调度中心", summary: "父类引用指向子类,运行时决定行为,instanceof 模式匹配。", chapterType: "comic", projectStage: "统一调用不同咖啡机", technologies: ["多态"], jobSkills: ["面向对象"], status: "published", slug: "2026-08-09-java-s02e04-polymorphism" },
      { season: 2, episode: 5, title: "接口合同", summary: "interface / implements:多种付款方式统一 pay()。", chapterType: "comic", projectStage: "多种付款方式", technologies: ["interface"], jobSkills: ["面向对象"], status: "published", slug: "2026-08-10-java-s02e05-interface" },
      { season: 2, episode: 6, title: "抽象类 vs 接口", summary: "共享状态用抽象类,能力契约用接口;模板方法。", chapterType: "comic", projectStage: "抽象一台「咖啡设备」", technologies: ["abstract"], jobSkills: ["面向对象"], status: "published", slug: "2026-08-11-java-s02e06-abstract" },
      { season: 2, episode: 7, title: "Object 神殿", summary: "equals / hashCode / toString 的契约,以及 record 自动生成。", chapterType: "comic", projectStage: "订单去重靠 equals", technologies: ["Object", "equals", "hashCode", "record"], jobSkills: ["面向对象", "集合"], status: "published", slug: "2026-08-12-java-s02e07-object" },
      { season: 2, episode: 8, title: "List 订单队列", summary: "ArrayList vs LinkedList,以及遍历中删除的异常。", chapterType: "comic", projectStage: "List<Order> 管订单", technologies: ["List", "ArrayList"], jobSkills: ["集合"], status: "published", slug: "2026-08-13-java-s02e08-list" },
      { season: 2, episode: 9, title: "Set 会员去重", summary: "HashSet 去重依赖 equals + hashCode。", chapterType: "comic", projectStage: "会员不重复", technologies: ["Set", "HashSet"], jobSkills: ["集合"], status: "published", slug: "2026-08-14-java-s02e09-set" },
      { season: 2, episode: 10, title: "Map 菜单索引", summary: "HashMap 底层:数组 + 链表 + 红黑树;空安全取值。", chapterType: "comic", projectStage: "按名字查菜单", technologies: ["Map", "HashMap"], jobSkills: ["集合", "八股"], status: "published", slug: "2026-08-15-java-s02e10-map" },
      { season: 2, episode: 11, title: "泛型包装箱", summary: "泛型把类型错误从运行时提前到编译时。", chapterType: "comic", projectStage: "类型安全的仓库", technologies: ["泛型"], jobSkills: ["集合"], status: "published", slug: "2026-08-16-java-s02e11-generics" },
      { season: 2, episode: 12, title: "面向对象版咖啡站", summary: "第二季大结局:重构成对象模型 v2,带测试。", chapterType: "project", projectStage: "OOP 咖啡站 v2", technologies: ["综合"], jobSkills: ["面向对象", "集合"], status: "published", slug: "2026-08-17-java-s02e12-oop-cafe" },
    ],
  },
  {
    season: 3,
    code: "S3",
    title: "工程时代",
    subtitle: "从「能运行」到「可维护」",
    goal: "异常、IO、函数式、构建、版本控制、测试——很多人跳过这一段,结果只会写 Controller。",
    covers: ["7. 异常帝国", "8. IO 大陆", "9. 函数式大陆", "14. 工程大陆"],
    episodes: [
      { season: 3, episode: 1, title: "异常警报系统", summary: "Throwable 体系,checked vs unchecked。", chapterType: "comic", projectStage: "库存不足不再崩溃", technologies: ["Exception", "try/catch"], jobSkills: ["异常处理"], status: "published", slug: "2026-08-18-java-s03e01-exception" },
      { season: 3, episode: 2, title: "自定义业务异常", summary: "把业务错误变成清晰的异常类型。", chapterType: "comic", projectStage: "OutOfStockException", technologies: ["自定义异常"], jobSkills: ["异常处理"], status: "published", slug: "2026-08-19-java-s03e02-custom-exception" },
      { season: 3, episode: 3, title: "文件与 Path API", summary: "Files / Path 持久化,关掉程序菜单还在。", chapterType: "comic", projectStage: "菜单存文件", technologies: ["Files", "Path", "NIO"], jobSkills: ["IO"], status: "published", slug: "2026-08-20-java-s03e03-files" },
      { season: 3, episode: 4, title: "Lambda 与 Stream 流水线", summary: "filter / map / reduce 处理订单流水。", chapterType: "comic", projectStage: "统计当日销量", technologies: ["Lambda", "Stream"], jobSkills: ["函数式"], status: "published", slug: "2026-08-21-java-s03e04-stream" },
      { season: 3, episode: 5, title: "Maven 装备仓库", summary: "pom.xml / 依赖 / 生命周期 / 插件。", chapterType: "lab", projectStage: "项目由 Maven 管理", technologies: ["Maven", "pom.xml"], jobSkills: ["构建工具"], status: "published", slug: "2026-08-22-java-s03e05-maven" },
      { season: 3, episode: 6, title: "JUnit 质检员", summary: "「证据呢?」——用测试证明程序真的对。", chapterType: "comic", projectStage: "核心逻辑有测试", technologies: ["JUnit", "Mock"], jobSkills: ["测试"], status: "published", slug: "2026-08-23-java-s03e06-junit" },
      { season: 3, episode: 7, title: "Git 版本时间机", summary: "branch / merge / rebase。", chapterType: "lab", projectStage: "代码进 Git", technologies: ["Git"], jobSkills: ["版本控制"], status: "published", slug: "2026-08-24-java-s03e07-git" },
      { season: 3, episode: 8, title: "多模块订单系统", summary: "第三季项目检查点。", chapterType: "project", projectStage: "多模块工程 v3", technologies: ["综合"], jobSkills: ["工程化"], status: "published", slug: "2026-08-25-java-s03e08-multimodule" },
    ],
  },
  {
    season: 4,
    code: "S4",
    title: "咖啡帝国",
    subtitle: "Spring Boot 单体后端",
    goal: "完成一个手机前端能调用的、带登录鉴权的 REST 咖啡店 API。",
    covers: ["12. 网络世界", "13. 数据库大陆", "15. Spring 帝国"],
    episodes: [
      { season: 4, episode: 1, title: "HTTP 快递员", summary: "TCP/HTTP 基础:订单如何从手机到服务器。", chapterType: "comic", projectStage: "理解请求/响应", technologies: ["HTTP", "TCP"], jobSkills: ["网络"], status: "published", slug: "2026-08-26-java-s04e01-http" },
      { season: 4, episode: 2, title: "第一个 Spring Boot 服务", summary: "内嵌服务器、自动配置的「地下机械图」。", chapterType: "comic", projectStage: "服务能启动", technologies: ["Spring Boot"], jobSkills: ["Spring Boot"], status: "published", slug: "2026-08-27-java-s04e02-springboot" },
      { season: 4, episode: 3, title: "Controller / Service / Repository", summary: "分层与 IoC/DI:谁创建了对象。", chapterType: "comic", projectStage: "三层架构", technologies: ["Spring MVC", "IoC", "DI"], jobSkills: ["Spring Boot"], status: "published", slug: "2026-08-28-java-s04e03-layers" },
      { season: 4, episode: 4, title: "JDBC / MyBatis 连 MySQL", summary: "多台机器共享订单,数据落库。", chapterType: "comic", projectStage: "订单进 MySQL", technologies: ["JDBC", "MyBatis", "MySQL"], jobSkills: ["MySQL", "持久层"], status: "published", slug: "2026-08-29-java-s04e04-mysql" },
      { season: 4, episode: 5, title: "参数校验与统一异常处理", summary: "把脏输入挡在门外,错误统一返回。", chapterType: "comic", projectStage: "健壮的 API", technologies: ["Validation", "@ControllerAdvice"], jobSkills: ["Spring Boot"], status: "published", slug: "2026-08-30-java-s04e05-validation" },
      { season: 4, episode: 6, title: "注册登录与 Spring Security", summary: "认证授权门。", chapterType: "comic", projectStage: "带权限的咖啡店", technologies: ["Spring Security"], jobSkills: ["Spring Security"], status: "published", slug: "2026-08-31-java-s04e06-security" },
      { season: 4, episode: 7, title: "完整咖啡店 API", summary: "第四季项目检查点。", chapterType: "project", projectStage: "Spring Boot 单体 v4", technologies: ["综合"], jobSkills: ["Spring Boot", "MySQL"], status: "published", slug: "2026-09-01-java-s04e07-api" },
    ],
  },
  {
    season: 5,
    code: "S5",
    title: "服务器战争",
    subtitle: "生产事故现场",
    goal: "网络、并发与 JVM 排障——把 JVM 速查变成事故剧情,让阿零第一次自己定位线上故障。",
    covers: ["8. 网络世界", "7. 并发王国", "6. JVM 地下世界"],
    episodes: [
      { season: 5, episode: 1, title: "网络世界:订单如何穿过网线", summary: "TCP/HTTP/Socket:数据从手机到服务器的旅程。", chapterType: "comic", projectStage: "理解底层通信", technologies: ["TCP", "HTTP", "Socket"], jobSkills: ["网络"], status: "planned" },
      { season: 5, episode: 2, title: "线程与线程池", summary: "Thread/Runnable/ExecutorService,高峰并发。", chapterType: "comic", projectStage: "并发制作咖啡", technologies: ["Thread", "线程池"], jobSkills: ["并发"], status: "planned" },
      { season: 5, episode: 3, title: "锁与 synchronized", summary: "Race 双胞胎:并发竞争与可见性。", chapterType: "comic", projectStage: "库存扣减不超卖", technologies: ["synchronized", "Lock"], jobSkills: ["并发"], status: "planned" },
      { season: 5, episode: 4, title: "CPU 突然 100%", summary: "jstack 抓栈,定位热点线程。", chapterType: "incident", projectStage: "第一次线上事故", technologies: ["jstack", "top"], jobSkills: ["JVM 排障"], status: "planned" },
      { season: 5, episode: 5, title: "OOM 内存事故", summary: "jmap + 堆分析,揪出泄漏藤蔓。", chapterType: "incident", projectStage: "内存事故复盘", technologies: ["jmap", "MAT", "GC"], jobSkills: ["JVM 排障"], status: "planned" },
      { season: 5, episode: 6, title: "GC 停顿与 JFR 复盘", summary: "监控、日志与黑匣子。", chapterType: "incident", projectStage: "可观测的服务", technologies: ["GC", "JFR"], jobSkills: ["JVM 排障", "可观测性"], status: "planned" },
    ],
  },
  {
    season: 6,
    code: "S6",
    title: "分布式时代",
    subtitle: "分布式咖啡帝国",
    goal: "缓存、消息队列、微服务与容器化——但不鼓励一上来就拆微服务。",
    covers: ["9. 数据库世界(Redis)", "11. 分布式大陆", "12. 云原生(Docker)"],
    episodes: [
      { season: 6, episode: 1, title: "单体为什么开始吃力", summary: "先讲清楚问题,再谈拆分。", chapterType: "comic", projectStage: "识别瓶颈", technologies: ["架构演进"], jobSkills: ["分布式"], status: "planned" },
      { season: 6, episode: 2, title: "Redis 高速取餐柜", summary: "缓存热门菜单,穿透/击穿/雪崩。", chapterType: "comic", projectStage: "加缓存层", technologies: ["Redis"], jobSkills: ["Redis"], status: "planned" },
      { season: 6, episode: 3, title: "分布式锁", summary: "多实例下的库存扣减一致性。", chapterType: "comic", projectStage: "分布式扣减", technologies: ["Redis", "分布式锁"], jobSkills: ["分布式"], status: "planned" },
      { season: 6, episode: 4, title: "MQ 派单站", summary: "下单不再干等咖啡制作,异步解耦。", chapterType: "comic", projectStage: "异步制作", technologies: ["Kafka", "RocketMQ"], jobSkills: ["消息队列"], status: "planned" },
      { season: 6, episode: 5, title: "服务注册、网关、限流熔断", summary: "Spring Cloud / Nacos 微服务基座。", chapterType: "comic", projectStage: "微服务化", technologies: ["Spring Cloud", "Nacos", "Sentinel"], jobSkills: ["微服务"], status: "planned" },
      { season: 6, episode: 6, title: "Docker 集装箱", summary: "多阶段构建 + Compose,换电脑也能一键运行。", chapterType: "lab", projectStage: "容器镜像", technologies: ["Docker", "Compose"], jobSkills: ["Docker"], status: "planned" },
    ],
  },
  {
    season: 7,
    code: "S7",
    title: "云端世界",
    subtitle: "云原生天空城",
    goal: "K8s、CI/CD、监控与链路追踪——让咖啡站在大促里也扛得住。",
    covers: ["12. 云原生天空城"],
    episodes: [
      { season: 7, episode: 1, title: "Kubernetes 调度舰队", summary: "多实例部署,Pod/Service/Deployment。", chapterType: "lab", projectStage: "K8s 集群", technologies: ["Kubernetes"], jobSkills: ["Kubernetes", "云原生"], status: "planned" },
      { season: 7, episode: 2, title: "CI/CD 自动质检与发布", summary: "推代码即自动测试、构建、上线。", chapterType: "lab", projectStage: "流水线", technologies: ["GitHub Actions", "CI/CD"], jobSkills: ["CI/CD"], status: "planned" },
      { season: 7, episode: 3, title: "监控与日志", summary: "Prometheus + Grafana + 日志聚合。", chapterType: "incident", projectStage: "可观测平台", technologies: ["Prometheus", "Grafana"], jobSkills: ["可观测性"], status: "planned" },
      { season: 7, episode: 4, title: "链路追踪", summary: "一杯咖啡的请求走过了哪些服务。", chapterType: "comic", projectStage: "全链路追踪", technologies: ["SkyWalking", "Jaeger"], jobSkills: ["可观测性"], status: "planned" },
      { season: 7, episode: 5, title: "灰度发布与大促演练", summary: "第七卷项目检查点:云端咖啡平台。", chapterType: "project", projectStage: "云端咖啡平台 v7", technologies: ["灰度", "压测"], jobSkills: ["云原生", "架构"], status: "planned" },
    ],
  },
];

/** 番外 / 平行宇宙:主线完成后的"职业转职",不塞进主线。 */
export const SIDE_QUESTS: SideQuest[] = [
  { slug: "jakarta-ee", title: "标准议会篇 · Jakarta EE", positioning: "企业标准路线", reason: "CDI / JPA / Jakarta REST,理解 javax → jakarta 迁移", technologies: ["Jakarta EE", "CDI", "JPA"] },
  { slug: "cloud-native-java", title: "轻量引擎竞速篇 · Quarkus / Micronaut", positioning: "云原生路线", reason: "构建期处理、启动速度、Native Image", technologies: ["Quarkus", "Micronaut", "GraalVM"] },
  { slug: "javafx-desktop", title: "桌面收银台 · JavaFX", positioning: "桌面路线", reason: "给咖啡站做一个桌面收银端", technologies: ["JavaFX"] },
  { slug: "android-java", title: "Android 番外", positioning: "移动路线", reason: "只讲 Java 与 Android 构建体系的关系,不硬塞进后端主线", technologies: ["Android"] },
  { slug: "big-data-java", title: "全国订单洪流 · 大数据", positioning: "数据路线", reason: "掌握数据库/并发/MQ 之后再学 Kafka/Spark/Flink", technologies: ["Kafka", "Spark", "Flink", "Hadoop"] },
];

export const SERIES_META = {
  slug: "java-ecosystem",
  title: "从零开始学 Java",
  alias: "阿零与豆豆 · Java 生态学院",
  tagline: "跟着阿零和豆豆,亲手把一个 Java 程序从一行输出,建设成能在真实服务器运行的完整系统。",
  project: "豆豆咖啡站",
  javaVersion: "25",
  verifiedVersions: ["25"],
  seasons: SEASONS,
} as const;

/** 展平所有话,按季/话排序。 */
export function allEpisodes(): JavaEpisode[] {
  return SEASONS.flatMap((s) => s.episodes);
}

export function publishedEpisodes(): JavaEpisode[] {
  return allEpisodes().filter((e) => e.status === "published" && e.slug);
}

export function totalEpisodeCount(): number {
  return allEpisodes().length;
}

/** 按发布顺序返回上一话/下一话(仅在已发布集合内导航)。 */
export function neighborsOf(slug: string): { prev?: JavaEpisode; next?: JavaEpisode } {
  const list = publishedEpisodes();
  const i = list.findIndex((e) => e.slug === slug);
  if (i === -1) return {};
  return { prev: list[i - 1], next: list[i + 1] };
}

export function episodeBySlug(slug: string): JavaEpisode | undefined {
  return allEpisodes().find((e) => e.slug === slug);
}

export const CHAPTER_TYPE_LABEL: Record<ChapterType, string> = {
  comic: "漫画",
  lab: "实验",
  reference: "速查",
  incident: "事故",
  project: "项目",
};
