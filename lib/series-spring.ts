/**
 * 《从零开始驯 Spring》· 依赖藤(slug 前缀 spring)。
 *
 * 与咖啡站宇宙同线:Java 线把咖啡站送上了 Spring Boot,阿零"会用"了,却
 * 说不出一行 @Autowired 背后究竟发生了什么。后院那株会自己长枝的"依赖藤"
 * 上住着树蛙「跃跃」(Yue):弹跳一次就能把一个对象送到它该在的位置(依赖
 * 注入的具象化);背上的吸盘能贴住任何接口(代理与切面的具象化);藤蔓每
 * 长一节就自动结出一颗 Bean,枝条走向即依赖图。口头禅「容器里,万物皆
 * Bean。」,副口头禅「你以为的魔法,都是别人写好的 if。」(对标特米的
 * "man 一下"、焰焰的"这事,JEP 里都写着呢")。
 *
 * 联动钩子:焰焰(JVM 线)从地下一层递上反射与字节码的家底,代理章直接
 * 接住 JVM 线卷三"魔法祛魅"的结论;特米(CLI 线)从藤下探头递 curl / ss /
 * jcmd,负责所有终端实操;豆豆客串"需求发起人 + 毒舌验收员",每卷终出面
 * 掐着可控性验收。本线独有深度栏目:🔍 源码放大镜(每个"魔法"必须落到
 * 具体的类与方法,只给类名 + 方法名 + 一句职责,不贴整段源码)+ 🪄 祛魅
 * 实验(用 ≤50 行手写复现该特性,跑通即祛魅)。
 *
 * 定位:主线只教了会用,这条线把"框架魔法"全部祛魅到第一性原理——可控性
 * 优先于便利性,能说出"谁创建了它、它从哪来、出事去哪查"才算学会。
 * 基线 Spring Boot 4.x / Spring Framework 7 / jakarta 命名空间 / Java 25。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const SPRING_SERIES_META = {
  slug: "spring-academy",
  title: "从零开始驯 Spring",
  alias: "阿零与跃跃 · 依赖藤",
  tagline: "@Autowired 一写就能跑,可它到底替你做了什么?跟着阿零和跃跃把容器、切面、自动装配、Web 与持久化逐层拆开——所有魔法都要落到具体的类与方法。",
  project: "咖啡站后端全面 Spring 化并守住可控性",
  storageKey: "spring-academy:completed",
} as const;

export const SPRING_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "P1",
    title: "容器的本质",
    subtitle: "谁把 new 偷走了",
    goal: "把 IoC 容器从「魔法」降级为「一张对象花名册 + 一段装配流程」:看懂 BeanDefinition 怎么来、依赖怎么塞进去、Bean 从生到死经过哪些扩展点,并亲手写一个跑得起来的迷你容器。",
    covers: ["IoC 与 DI", "BeanDefinition 与注册", "Bean 生命周期"],
    episodes: [
      { season: 1, episode: 1, title: "谁把 new 偷走了", summary: "IoC 与 DI 的本质:阿零翻遍后厨找不到一个 new,跃跃一弹跳把对象送到手边——反转的从来不是控制,是「装配权」的归属。", chapterType: "comic", projectStage: "看懂后厨对象由谁创建", technologies: ["IoC", "依赖注入", "ApplicationContext"], jobSkills: ["Spring 核心"], status: "planned" },
      { season: 1, episode: 2, title: "五十行的藤蔓", summary: "🪄 祛魅实验开栏:一个 Map + 反射 + 递归解析,50 行手写迷你容器跑通,Spring 魔法书的第一页原来只是一本对象花名册。", chapterType: "lab", projectStage: "手写迷你容器跑通", technologies: ["反射", "递归装配", "迷你容器"], jobSkills: ["Spring 原理", "框架原理"], status: "planned" },
      { season: 1, episode: 3, title: "Bean 的户口本", summary: "BeanDefinition 与注册流程:扫描像一次人口普查,注解只是户口本上的一行字,真正的对象要等有人来「提货」才诞生。", chapterType: "comic", projectStage: "画出咖啡站 Bean 注册链路", technologies: ["BeanDefinition", "组件扫描", "BeanFactory"], jobSkills: ["Spring 核心"], status: "planned" },
      { season: 1, episode: 4, title: "三条藤,一个死结", summary: "构造器/Setter/字段注入三种姿势与循环依赖:两只树蛙互相抱着对方的腿往上跳,三级缓存就是那根解开死结的绳。", chapterType: "comic", projectStage: "依赖注入方式统一为构造器", technologies: ["构造器注入", "循环依赖", "三级缓存"], jobSkills: ["Spring 核心"], status: "planned" },
      { season: 1, episode: 5, title: "一只 Bean 的一生", summary: "实例化→属性填充→初始化→销毁,以及 BeanPostProcessor 扩展点:从豆子进厂到出杯的流水线,扩展点是流水线上预留好的插槽。", chapterType: "comic", projectStage: "在生命周期插槽上挂第一个扩展", technologies: ["Bean 生命周期", "BeanPostProcessor", "Aware 接口"], jobSkills: ["Spring 核心"], status: "planned" },
      { season: 1, episode: 6, title: "后厨全员上藤", summary: "卷终:点单、烘豆、出杯三个模块的对象全部交给容器,阿零画出自己的依赖图,并能对每个对象回答「谁造的、什么时候造的」。", chapterType: "project", projectStage: "咖啡站对象全部交给容器 · spring-v1 容器接管", technologies: ["ApplicationContext", "组件扫描", "综合"], jobSkills: ["Spring 核心", "架构设计"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "P2",
    title: "切面与事务",
    subtitle: "看不见的第三只手",
    goal: "把 AOP 与声明式事务拆到底:代理是谁生成的、织入发生在哪一步、@Transactional 为什么会「明明加了却不回滚」,并手写一个跑得通的迷你 AOP。",
    covers: ["AOP 与动态代理", "声明式事务", "事务失效排查"],
    episodes: [
      { season: 2, episode: 1, title: "日志长在每个方法头上", summary: "AOP 的动机与术语表:同一段日志被复制进四十多个方法,跃跃用吸盘贴住接口——切点、通知、织入三个词一次讲清横切关注点。", chapterType: "comic", projectStage: "识别出后厨的横切关注点", technologies: ["AOP", "切点", "通知", "织入"], jobSkills: ["Spring AOP"], status: "planned" },
      { season: 2, episode: 2, title: "两副面具", summary: "JDK 动态代理 vs CGLIB 实测:接口派戴纸面具,子类派直接整容;打印一次 getClass() 就知道今天站在你面前的到底是谁。", chapterType: "lab", projectStage: "看清后厨里每个代理的真身", technologies: ["JDK 动态代理", "CGLIB", "Proxy"], jobSkills: ["Spring AOP", "框架原理"], status: "planned" },
      { season: 2, episode: 3, title: "手搓一只切面", summary: "🪄 祛魅实验:50 行 InvocationHandler 责任链,手写迷你 AOP 跑通前置/后置/环绕,「织入」不过是一层套一层的调用。", chapterType: "lab", projectStage: "手写迷你 AOP 跑通", technologies: ["InvocationHandler", "拦截器链", "环绕通知"], jobSkills: ["Spring AOP", "框架原理"], status: "planned" },
      { season: 2, episode: 4, title: "@Transactional 的真身", summary: "声明式事务原理:注解不是咒语,是代理在方法前后偷偷开事务与提交;🔍 源码放大镜照到事务拦截器与事务管理器这两块牌子。", chapterType: "comic", projectStage: "事务边界第一次画在图上", technologies: ["@Transactional", "事务拦截器", "PlatformTransactionManager"], jobSkills: ["Spring 事务"], status: "planned" },
      { season: 2, episode: 5, title: "事务失效的八种死法", summary: "自调用、非 public、异常被吞、传播用错、多线程越界……八起「明明加了注解却没回滚」的事故连环复盘,收尾附一张自查清单。", chapterType: "incident", projectStage: "事务失效自查清单上墙", technologies: ["自调用", "异常回滚规则", "代理失效"], jobSkills: ["Spring 事务", "排障"], status: "planned" },
      { season: 2, episode: 6, title: "一张网罩住后厨", summary: "卷终:统一日志/耗时切面与声明式事务同时上线,阿零能指着日志说出每一次回滚由哪个代理、在哪个方法上触发。", chapterType: "project", projectStage: "事务与日志切面上线 · spring-v2 切面接管", technologies: ["AOP", "@Transactional", "综合"], jobSkills: ["Spring AOP", "Spring 事务"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "P3",
    title: "自动装配的秘密",
    subtitle: "starter 拆箱现场",
    goal: "把「开箱即用」拆成可复述的四步:导入清单从哪读、条件注解怎么判、配置怎么绑成对象、优先级谁说了算——最后亲手造一个自己的 starter。",
    covers: ["自动配置机制", "条件装配", "外部化配置"],
    episodes: [
      { season: 3, episode: 1, title: "开箱即用的谎言", summary: "starter 到底做了什么:一行依赖点亮整个 Web 服务,拆开箱子只有一份自动配置导入清单和一堆 if——魔法当场落地成文件。", chapterType: "comic", projectStage: "拆开一个官方 starter 看清结构", technologies: ["starter", "自动配置", "AutoConfiguration.imports"], jobSkills: ["Spring Boot"], status: "planned" },
      { season: 3, episode: 2, title: "装配的守门人", summary: "@Conditional 家族:类路径上有没有这个类、容器里缺不缺这个 Bean、配置项开没开——一排守门树蛙轮流点头,配置才被放行。", chapterType: "comic", projectStage: "读懂自动配置为何没生效", technologies: ["@Conditional", "@ConditionalOnClass", "@ConditionalOnMissingBean"], jobSkills: ["Spring Boot"], status: "planned" },
      { season: 3, episode: 3, title: "配置文件的分身", summary: "类型安全的配置绑定与 Profile:一套代码三张脸,开发/预发/生产各读各的那份 yml,松散绑定规则一次讲透不再猜键名。", chapterType: "comic", projectStage: "咖啡站配置按环境分身", technologies: ["@ConfigurationProperties", "Profile", "松散绑定"], jobSkills: ["Spring Boot"], status: "planned" },
      { season: 3, episode: 4, title: "配置从哪来,谁说了算", summary: "外部化配置优先级链速查:命令行、环境变量、配置中心、jar 内默认值排成一张梯子,附「同名键谁赢」与配置刷新的决策表。", chapterType: "reference", projectStage: "配置优先级速查表上墙", technologies: ["外部化配置", "Environment", "配置中心"], jobSkills: ["Spring Boot", "配置管理"], status: "planned" },
      { season: 3, episode: 5, title: "造一只自己的 starter", summary: "🪄 祛魅实验:自动配置类 + 导入清单文件 + 条件注解 + 配置属性四件套齐活,亲手打包 starter 并在另一个工程里一行依赖点亮。", chapterType: "lab", projectStage: "自研 starter 在第二个工程点亮", technologies: ["自动配置类", "AutoConfiguration.imports", "@ConfigurationProperties"], jobSkills: ["Spring Boot", "框架原理"], status: "planned" },
      { season: 3, episode: 6, title: "咖啡站的开箱魔法", summary: "卷终:把点单、计价、出票能力封成自研 starter,新门店一行依赖即开张——阿零第一次从「魔法的受害者」变成「魔法的作者」。", chapterType: "project", projectStage: "咖啡站自研 starter 发布 · spring-v3 装配自持", technologies: ["自研 starter", "条件装配", "综合"], jobSkills: ["Spring Boot", "架构设计"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "P4",
    title: "Web 层内幕",
    subtitle: "一个请求的一生",
    goal: "跟着一个请求从网卡走到 Controller 再走回去:分发、参数解析、消息转换、异常兜底、各类拦截的执行顺序,全部落到具体组件名,并给出响应式栈的取舍答案。",
    covers: ["请求分发链路", "参数与消息转换", "全局异常与顺序"],
    episodes: [
      { season: 4, episode: 1, title: "请求穿过九道门", summary: "从 Servlet 容器线程到 Controller 方法:接客、分诊、查台号、调用、渲染五步走完,🔍 源码放大镜按门牌把每个组件点名一遍。", chapterType: "comic", projectStage: "画出请求全链路时序图", technologies: ["DispatcherServlet", "HandlerMapping", "HandlerAdapter"], jobSkills: ["Spring MVC"], status: "planned" },
      { season: 4, episode: 2, title: "参数是怎么变出来的", summary: "参数解析器与消息转换器:一串 JSON 文本如何长成对象,注解背后是一排各管一段的解析工,顺手解决日期与枚举的老大难。", chapterType: "comic", projectStage: "统一入参与序列化规则", technologies: ["参数解析器", "HttpMessageConverter", "@RequestBody"], jobSkills: ["Spring MVC"], status: "planned" },
      { season: 4, episode: 3, title: "别再返回裸 Map", summary: "全局异常处理与统一响应体:异常四散奔逃时一张兜底网把它们翻译成人话,错误码从此有户口,前端不用再猜字段。", chapterType: "comic", projectStage: "统一响应体与错误码上线", technologies: ["@RestControllerAdvice", "统一响应", "参数校验"], jobSkills: ["Spring MVC", "接口设计"], status: "planned" },
      { season: 4, episode: 4, title: "谁先谁后", summary: "过滤器/拦截器/切面执行顺序实测:三层同心圆各打一行日志,跑一次就看清 Filter 在最外圈、AOP 在最里圈,再也不靠猜。", chapterType: "lab", projectStage: "三层拦截顺序实测结论", technologies: ["Filter", "HandlerInterceptor", "AOP 顺序"], jobSkills: ["Spring MVC", "排障"], status: "planned" },
      { season: 4, episode: 5, title: "响应式值不值", summary: "WebFlux 与 Servlet 栈取舍决策表:线程模型、调试成本、生态完整度三栏对比,并给出「大多数业务先别上」的默认答案与例外条件。", chapterType: "reference", projectStage: "响应式选型结论归档", technologies: ["WebFlux", "Reactor", "虚拟线程"], jobSkills: ["技术选型", "Spring Web"], status: "planned" },
      { season: 4, episode: 6, title: "Web 层立规矩", summary: "卷终:统一响应、全局异常、参数校验、接口文档四件套一起落地,咖啡站对外接口第一次有了写下来的契约。", chapterType: "project", projectStage: "Web 层标准化 · spring-v4 契约成型", technologies: ["Spring MVC", "参数校验", "综合"], jobSkills: ["Spring MVC", "接口设计"], status: "planned" },
    ],
  },
  {
    season: 5,
    code: "P5",
    title: "持久化",
    subtitle: "数据落地那一刻",
    goal: "把 ORM 的黑箱打开:方法名怎么变成 SQL、持久化上下文在替你缓存什么、慢在哪、事务边界画在哪,以及多数据源该在哪一层收口。",
    covers: ["Spring Data 演进", "JPA 状态与缓存", "事务传播与多数据源"],
    episodes: [
      { season: 5, episode: 1, title: "从手写 SQL 到一行方法名", summary: "JdbcTemplate 到 Spring Data 的演进:方法名自动变 SQL 像读心术,🔍 放大镜一照,是一台规规矩矩的语法分析器。", chapterType: "comic", projectStage: "持久层接口化改造起步", technologies: ["JdbcTemplate", "Spring Data", "方法名查询"], jobSkills: ["持久化"], status: "planned" },
      { season: 5, episode: 2, title: "托管态的秘密", summary: "JPA 实体四种状态与一级缓存:同一个订单查两次却只发一条 SQL,持久化上下文像一块挂在事务上的便签板,脏检查在闭店时统一结账。", chapterType: "comic", projectStage: "看懂实体何时真正落库", technologies: ["实体状态", "持久化上下文", "脏检查"], jobSkills: ["持久化", "JPA"], status: "planned" },
      { season: 5, episode: 3, title: "一百零一条 SQL", summary: "N+1 查询事故复盘:订单列表页慢到超时,日志里一条主查询后面跟着一百条小查询;抓取策略与实体图两条解法当场对照。", chapterType: "incident", projectStage: "列表页慢查询清零", technologies: ["N+1 查询", "JOIN FETCH", "EntityGraph"], jobSkills: ["持久化", "性能排障"], status: "planned" },
      { season: 5, episode: 4, title: "加入,还是另起一桌", summary: "七种事务传播行为速查:嵌套调用该新开还是加入、只读事务省了什么、批量写入怎么分段提交,一张表定选型不再背八股。", chapterType: "reference", projectStage: "事务传播选型表归档", technologies: ["事务传播", "只读事务", "批量提交"], jobSkills: ["Spring 事务", "性能优化"], status: "planned" },
      { season: 5, episode: 5, title: "两口井与一只水泵", summary: "多数据源与分库路由:按线程上下文里的钥匙切换井口,读写分离与分库在同一处收口,顺手踩一次「事务里切库切不动」的坑。", chapterType: "lab", projectStage: "读写分离与分库路由落地", technologies: ["多数据源", "动态数据源路由", "读写分离"], jobSkills: ["持久化", "架构设计"], status: "planned" },
      { season: 5, episode: 6, title: "订单层大手术", summary: "卷终:订单持久层重构上线,慢查询清零、事务边界画清,阿零能指着每条 SQL 说出它由哪行代码生出来。", chapterType: "project", projectStage: "订单持久层重构 · spring-v5 数据可控", technologies: ["Spring Data", "事务", "综合"], jobSkills: ["持久化", "性能优化"], status: "planned" },
    ],
  },
  {
    season: 6,
    code: "P6",
    title: "安全与云",
    subtitle: "把站开到云上",
    goal: "补齐最后两块:安全过滤器链与认证授权模型必须能画出来,分布式组件必须知道「什么规模才需要」——结局是可控性交接,不是技术堆料。",
    covers: ["Spring Security", "JWT 与 OAuth2", "Spring Cloud 全景"],
    episodes: [
      { season: 6, episode: 1, title: "门口的十几道闸机", summary: "Spring Security 过滤器链:一个请求要连过十几道闸机才见得到 Controller,🔍 放大镜逐个点名并把顺序画成一张闸机图。", chapterType: "comic", projectStage: "安全过滤器链可视化", technologies: ["SecurityFilterChain", "过滤器顺序", "SecurityContext"], jobSkills: ["Spring Security"], status: "planned" },
      { season: 6, episode: 2, title: "你是谁,你能干什么", summary: "认证与授权模型:身份凭证是一张证件、权限是盖在证上的通行章,方法级鉴权把规则直接贴在业务门框上,越权当场被拦。", chapterType: "comic", projectStage: "咖啡站角色与权限落地", technologies: ["认证", "授权", "方法级鉴权"], jobSkills: ["Spring Security"], status: "planned" },
      { season: 6, episode: 3, title: "无状态的通行证", summary: "JWT 与 OAuth2 接入实战:令牌怎么签、怎么验、怎么撤,资源服务器接第三方登录,顺手踩一次时钟偏移与令牌过期的坑。", chapterType: "lab", projectStage: "无状态登录与第三方接入", technologies: ["JWT", "OAuth2", "资源服务器"], jobSkills: ["Spring Security", "认证授权"], status: "planned" },
      { season: 6, episode: 4, title: "云上的零件图", summary: "Spring Cloud 核心组件全景表:注册发现、配置中心、网关、负载均衡、链路追踪各解决什么问题,以及到多大规模才真的需要。", chapterType: "reference", projectStage: "分布式组件选型全景归档", technologies: ["注册发现", "网关", "链路追踪"], jobSkills: ["Spring Cloud", "技术选型"], status: "planned" },
      { season: 6, episode: 5, title: "打不通的那一格", summary: "服务间调用与熔断:声明式 HTTP 客户端加上超时、重试、熔断三件套,下游挂掉时不能让整条依赖藤跟着一起枯死。", chapterType: "comic", projectStage: "服务间调用具备韧性", technologies: ["HTTP Interface", "超时与重试", "熔断"], jobSkills: ["Spring Cloud", "高可用"], status: "planned" },
      { season: 6, episode: 6, title: "藤蔓通天", summary: "全线终章:咖啡站带着安全与可观测能力上云,跃跃把最后一根藤交给阿零——至此每一处魔法都已落到具体的类与方法。", chapterType: "project", projectStage: "咖啡站安全上云 · spring-v6 全线收束", technologies: ["Spring Security", "Spring Cloud", "综合"], jobSkills: ["Spring 全栈", "架构设计"], status: "planned" },
    ],
  },
];

export function springAllEpisodes(): JavaEpisode[] {
  return SPRING_SEASONS.flatMap((s) => s.episodes);
}

export function springPublishedEpisodes(): JavaEpisode[] {
  return springAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
