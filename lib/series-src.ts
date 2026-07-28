/**
 * 《从零开始读源码:调用链纪》· 拆壳工坊(咖啡站宇宙又一条主线,slug 前缀 src)。
 *
 * 与咖啡站宇宙同线:JVM 线阿零把后厨升级到 Java 25、CLI 线学会了部署之后,
 * 一个诡异的依赖 bug 在生产环境反复出现——文档查不到、Issue 没答案。阿零终于
 * 意识到:光会用库不够了,得会「读库」。这时咖啡站书库最深处的地板缝里,钻出
 * 一只穿山甲「挖姐」(Wa):爪子能剥开任何封装的硬壳,顺着调用链一层层往里挖;
 * 身上的鳞片是一片片折叠起来的调用栈,展开就是一条完整的方法调用路径。
 * 口头禅「别问它做什么,看它怎么做的。」,副口头禅「读不懂的源码,是还没找到
 * 那个入口。」——治的正是"抄 API、背结论、不敢下潜"的通病。
 *
 * 联动钩子:焰焰(JVM 线)从炉底递 `javap` 反编译当佐证,挖姐读到字节码层就交棒;
 * 特米(CLI 线)从通风管递 `git clone` / `git blame` 教怎么把源码拉到本地翻;
 * 豆豆客串"造 bug 的人"(生产事故触发下潜)。本线独有深度栏目两个:
 * 🔦 入口探照灯(每读一个框架,先教怎么找到"从哪开始读")+ 🗺️ 调用链地图
 * (把一次调用画成从入口到底层的路线图,标出每层的职责与折返点)。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const SRC_SERIES_META = {
  slug: "src-academy",
  title: "从零开始读源码:调用链纪",
  alias: "阿零与挖姐 · 拆壳工坊",
  tagline: "大多数人只会用库,这一条线教你「读库」——从会用,到看懂,再到能改。跟着穿山甲挖姐,爪子剥开封装的硬壳,顺着调用链一层层往里挖,遇到 bug 能直接下潜到源码定位。",
  project: "把咖啡站依赖的核心库逐个读透,遇到 bug 能下潜到源码",
  storageKey: "src-academy:completed",
} as const;

export const SRC_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "R1",
    title: "读源码的方法论",
    subtitle: "先学会怎么挖",
    goal: "读源码不是从第一行读到最后一行:先建立方法论——怎么找入口、读哪一层、用调试器当显微镜、把调用链画出来、以及最难的一课「知道什么时候停下」。",
    covers: ["为什么读源码", "找入口的三种姿势", "调试器与调用链"],
    episodes: [
      { season: 1, episode: 1, title: "地板缝里的穿山甲", summary: "为什么要读源码:一个文档查不到的诡异 bug 把阿零逼到墙角,挖姐从书库地板缝钻出——「别问它做什么,看它怎么做的」,爪子一划剥开第一层封装。", chapterType: "comic", projectStage: "立起「读库」这条新主线", technologies: ["源码阅读动机", "封装的代价"], jobSkills: ["源码阅读"], status: "planned" },
      { season: 1, episode: 2, title: "从哪开始读", summary: "找入口的三种姿势:main 方法、自动配置类、SPI 服务发现——挖姐点亮🔦入口探照灯,教阿零别在几十万行里乱翻,先照到那个真正的起点。", chapterType: "comic", projectStage: "学会给任何库定位入口", technologies: ["main 入口", "自动配置", "SPI/ServiceLoader"], jobSkills: ["源码阅读"], status: "planned" },
      { season: 1, episode: 3, title: "潜多深合适", summary: "读的三种深度:先看接口(它承诺了什么)→ 再看骨架(主流程怎么串)→ 最后抠细节(某个分支为什么这么写)。挖姐说潜太深会缺氧,分层下潜才不迷路。", chapterType: "comic", projectStage: "确立接口→骨架→细节三段读法", technologies: ["接口契约", "主干骨架", "细节抠读"], jobSkills: ["源码阅读"], status: "planned" },
      { season: 1, episode: 4, title: "调试器是显微镜", summary: "调试器就是显微镜:条件断点、表达式求值、把 step into/over/out 当潜水调速阀——挖姐现场演示,一次运行胜过盯着静态代码干瞪眼半小时。", chapterType: "lab", projectStage: "调试器成为读源码主力工具", technologies: ["条件断点", "step into/over/out", "表达式求值"], jobSkills: ["调试", "源码阅读"], status: "planned" },
      { season: 1, episode: 5, title: "把调用画成地图", summary: "画调用链:一次方法调用像地铁换乘,挖姐把鳞片一片片展开成🗺️调用链地图,标出每层职责、参数怎么变形、在哪里折返——读源码从此有导航。", chapterType: "comic", projectStage: "产出第一张调用链地图", technologies: ["调用栈", "调用链地图", "分层职责"], jobSkills: ["源码阅读", "系统设计"], status: "planned" },
      { season: 1, episode: 6, title: "别掉进兔子洞", summary: "别陷进去的纪律:阿零顺着一个 getter 挖了三小时挖到 native 方法差点缺氧,挖姐拽住尾巴——带着问题读、读够回答问题就上浮,不为读而读。", chapterType: "incident", projectStage: "立下「带问题下潜」的读码纪律", technologies: ["目标驱动阅读", "上浮时机", "抽象泄漏"], jobSkills: ["源码阅读", "工程判断"], status: "planned" },
      { season: 1, episode: 7, title: "第一次挖到底", summary: "卷终实战:挑一个足够小的库(如 SLF4J 门面或一个 JSON 小工具),用整套方法论从入口读到底,产出一张完整调用链地图,阿零第一次「读透」一个库。", chapterType: "project", projectStage: "读透第一个小库 · src-v1 方法论成型", technologies: ["综合", "调用链地图", "接口→骨架→细节"], jobSkills: ["源码阅读"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "R2",
    title: "集合框架源码",
    subtitle: "天天用的最该读透",
    goal: "从每天都在 new 的集合读起:ArrayList 怎么扩容、HashMap 的 hash 为什么要扰动、ConcurrentHashMap 从分段锁进化到 CAS、LinkedHashMap 怎么变身 LRU——最熟的东西,炉底全是学问。",
    covers: ["List/Map 扩容与树化", "并发容器", "红黑树与门面"],
    episodes: [
      { season: 2, episode: 1, title: "会自己长大的数组", summary: "ArrayList 扩容与 fail-fast:挖姐剥开 add 的壳,看 elementData 如何 1.5 倍扩容、modCount 如何在遍历时突然翻脸抛 ConcurrentModificationException。", chapterType: "comic", projectStage: "读懂 ArrayList 扩容与快速失败", technologies: ["ArrayList", "grow 扩容", "modCount/fail-fast"], jobSkills: ["集合源码"], status: "planned" },
      { season: 2, episode: 2, title: "哈希桶的扰动魔法", summary: "HashMap 的 hash 扰动与树化:为什么要把高 16 位异或下来?为什么链表长到 8 就变红黑树?挖姐顺着 putVal 一路挖到 treeifyBin,揭开经典八股的源码真身。", chapterType: "comic", projectStage: "读懂 HashMap 扰动函数与树化阈值", technologies: ["HashMap", "hash 扰动", "treeifyBin"], jobSkills: ["集合源码", "面试高频"], status: "planned" },
      { season: 2, episode: 3, title: "锁越拆越细", summary: "ConcurrentHashMap 的分段到 CAS:版本对照读——JDK 7 的 Segment 分段锁,到 JDK 8 的 synchronized 锁桶头 + CAS。挖姐说这是一部「把锁拆碎」的进化史。", chapterType: "comic", projectStage: "读懂并发 Map 的锁粒度演进", technologies: ["ConcurrentHashMap", "分段锁", "CAS/synchronized 桶头"], jobSkills: ["并发容器源码"], status: "planned" },
      { season: 2, episode: 4, title: "记得来过的顺序", summary: "LinkedHashMap 的 LRU:一个 accessOrder 开关 + 重写 removeEldestEntry,就把哈希表变成淘汰缓存。挖姐画出双向链表如何穿针引线记录访问顺序。", chapterType: "lab", projectStage: "用 LinkedHashMap 手搓一个 LRU 缓存", technologies: ["LinkedHashMap", "accessOrder", "removeEldestEntry"], jobSkills: ["集合源码", "缓存设计"], status: "planned" },
      { season: 2, episode: 5, title: "最难啃的那块壳", summary: "红黑树为什么难:五条规则、左旋右旋、变色——挖姐坦白这是集合源码里最硬的鳞片,教怎么「读懂意图而不背旋转」,知道它保证的是最坏 O(log n)。", chapterType: "comic", projectStage: "读懂红黑树在容器里扮演的角色", technologies: ["红黑树", "旋转与变色", "平衡不变式"], jobSkills: ["数据结构源码"], status: "planned" },
      { season: 2, episode: 6, title: "门面背后的空壳", summary: "Collections 的门面:unmodifiableList、synchronizedList、emptyList 到底包了什么?挖姐剥开发现全是装饰器与静态单例——门面模式的教科书现场。", chapterType: "reference", projectStage: "读懂 Collections 工具类的包装套路", technologies: ["Collections", "装饰器模式", "不可变视图"], jobSkills: ["集合源码", "设计模式"], status: "planned" },
      { season: 2, episode: 7, title: "自己造一个哈希表", summary: "卷终实战:阿零仿着读过的源码手写一个够用的 HashMap——数组 + 链表 + 扩容 + 简化树化,和 JDK 版跑同一批用例对比,理解「读懂」与「能写」的距离。", chapterType: "project", projectStage: "手写够用的 HashMap · src-v2 集合读透", technologies: ["综合", "手写 HashMap", "扩容/hash"], jobSkills: ["集合源码", "数据结构"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "R3",
    title: "JDK 并发源码",
    subtitle: "锁与线程池的地基",
    goal: "下潜到并发工具的地基:AQS 的模板方法撑起半个 java.util.concurrent,ReentrantLock、线程池、ThreadLocal、CompletableFuture、虚拟线程调度全在这一层做文章——读懂它们,死锁现场也能顺着源码破案。",
    covers: ["AQS 与锁", "线程池与 ThreadLocal", "异步与虚拟线程"],
    episodes: [
      { season: 3, episode: 1, title: "半个并发包的地基", summary: "AQS 的模板方法:一个 volatile 的 state + CLH 队列,tryAcquire 留给子类填空——挖姐点破 AbstractQueuedSynchronizer 是「把排队逻辑写死、把语义留白」的模板方法典范。", chapterType: "comic", projectStage: "读懂 AQS 的 state 与等待队列", technologies: ["AQS", "模板方法", "CLH 队列/state"], jobSkills: ["并发源码"], status: "planned" },
      { season: 3, episode: 2, title: "公平与插队之间", summary: "ReentrantLock 公平非公平:两个 Sync 子类只差一次「排队检查」。挖姐顺着 lock() 挖进去,看非公平锁怎么靠一次抢跑换来吞吐,以及重入计数藏在哪。", chapterType: "comic", projectStage: "读懂 ReentrantLock 两种模式差异", technologies: ["ReentrantLock", "公平/非公平", "重入计数"], jobSkills: ["并发源码", "面试高频"], status: "planned" },
      { season: 3, episode: 3, title: "任务进池的四道关", summary: "线程池 execute 的四步:核心线程→队列→非核心线程→拒绝策略。挖姐把 ThreadPoolExecutor.execute 的四个分支画成分诊台,揭开 ctl 一个 int 塞两种状态的巧劲。", chapterType: "comic", projectStage: "读懂线程池提交任务的决策流程", technologies: ["ThreadPoolExecutor", "execute 四步", "ctl 位运算"], jobSkills: ["并发源码"], status: "planned" },
      { season: 3, episode: 4, title: "线性探测的暗格", summary: "ThreadLocalMap 的探测法:为什么用开放寻址而不是链表?弱引用的 key 又怎么埋下内存泄漏隐患?挖姐挖进 ThreadLocal 的私有 Map,连 set/get 的探测都摊开看。", chapterType: "incident", projectStage: "读懂 ThreadLocal 与其泄漏根因", technologies: ["ThreadLocalMap", "开放寻址探测", "弱引用泄漏"], jobSkills: ["并发源码", "排障"], status: "planned" },
      { season: 3, episode: 5, title: "回调排成的多米诺", summary: "CompletableFuture 的观察者:thenApply/thenCompose 背后是一条 Completion 依赖链。挖姐把异步编排还原成观察者模式,谁完成了就推倒下一张多米诺。", chapterType: "comic", projectStage: "读懂 CompletableFuture 的依赖栈", technologies: ["CompletableFuture", "Completion 栈", "观察者模式"], jobSkills: ["并发源码", "异步编程"], status: "planned" },
      { season: 3, episode: 6, title: "轻装线程去哪了", summary: "虚拟线程调度:挂载/卸载、载体线程、ForkJoinPool 当调度器——挖姐接住焰焰从 JVM 线递来的火种,读 Continuation 怎么让一根线程「灵魂出窍」。", chapterType: "comic", projectStage: "读懂虚拟线程的调度与卸载", technologies: ["虚拟线程", "Continuation", "载体线程/调度器"], jobSkills: ["并发源码", "JVM"], status: "planned" },
      { season: 3, episode: 7, title: "死锁现场的勘验", summary: "卷终实战:豆豆造出一次真实死锁,阿零从线程 dump 顺着 AQS 等待队列反查两把锁的持有环,把这一卷读过的源码全用上,给死锁现场出勘验报告。", chapterType: "project", projectStage: "读懂一次死锁的源码现场 · src-v3 并发读透", technologies: ["综合", "线程 dump", "死锁环/AQS 队列"], jobSkills: ["并发源码", "排障"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "R4",
    title: "Spring 源码骨架",
    subtitle: "祛魅那本魔法书",
    goal: "读 Spring 只读骨架不迷路:refresh 十二步是主干,BeanDefinition 是原料,三级缓存解循环依赖是巧劲,后置处理器是所有扩展的接口——把「框架魔法」还原成一条能跟踪的调用链。",
    covers: ["容器刷新主干", "Bean 生命周期", "AOP 与事务"],
    episodes: [
      { season: 4, episode: 1, title: "十二步点亮容器", summary: "refresh 十二步:AbstractApplicationContext.refresh 是整个 Spring 的主干骨架。挖姐用🗺️调用链地图把十二个方法排成流水线,先看全貌再挑重点下潜。", chapterType: "comic", projectStage: "读懂 Spring 容器启动主干", technologies: ["refresh 十二步", "ApplicationContext", "容器生命周期"], jobSkills: ["Spring 源码"], status: "planned" },
      { season: 4, episode: 2, title: "一张张 Bean 图纸", summary: "BeanDefinition 加载:类还没变对象前,先变成一张「图纸」。挖姐顺着扫描→解析→注册,看 @Component 怎么落成 BeanDefinition 存进 registry,入口探照灯照到起点。", chapterType: "comic", projectStage: "读懂 BeanDefinition 的注册流程", technologies: ["BeanDefinition", "包扫描", "BeanDefinitionRegistry"], jobSkills: ["Spring 源码"], status: "planned" },
      { season: 4, episode: 3, title: "三个缓存解开死结", summary: "三级缓存解循环依赖:A 要 B、B 要 A,Spring 靠 singletonObjects / earlySingletonObjects / singletonFactories 三级缓存拆环。挖姐画出「提前曝光半成品」的巧妙时序。", chapterType: "comic", projectStage: "读懂循环依赖的三级缓存解法", technologies: ["三级缓存", "循环依赖", "提前曝光"], jobSkills: ["Spring 源码", "面试高频"], status: "planned" },
      { season: 4, episode: 4, title: "留给你的那些插口", summary: "后置处理器扩展点:BeanPostProcessor、BeanFactoryPostProcessor 是 Spring 递给你的插口。挖姐说读懂这两个接口的调用时机,就握住了扩展 Spring 的总开关。", chapterType: "reference", projectStage: "读懂 BeanPostProcessor 扩展机制", technologies: ["BeanPostProcessor", "BeanFactoryPostProcessor", "扩展点时机"], jobSkills: ["Spring 源码"], status: "planned" },
      { season: 4, episode: 5, title: "代理是什么时候换上的", summary: "AOP 代理创建时机:普通 Bean 什么时候被悄悄换成代理对象?挖姐挖到 AbstractAutoProxyCreator 的 postProcessAfterInitialization,揭开 JDK 动态代理与 CGLIB 的分岔口。", chapterType: "comic", projectStage: "读懂 AOP 代理的织入时机", technologies: ["AOP", "AutoProxyCreator", "JDK 代理/CGLIB"], jobSkills: ["Spring 源码"], status: "planned" },
      { season: 4, episode: 6, title: "一层层拦下的事务", summary: "事务拦截器链:@Transactional 不是魔法而是一圈拦截器。挖姐顺着 TransactionInterceptor 读进去,看事务如何在方法前后开启、提交、回滚,以及传播行为在哪判定。", chapterType: "comic", projectStage: "读懂声明式事务的拦截链", technologies: ["TransactionInterceptor", "事务传播", "拦截器链"], jobSkills: ["Spring 源码"], status: "planned" },
      { season: 4, episode: 7, title: "在源码里堵住那个 bug", summary: "卷终实战:回到第 01 话逼阿零下潜的那个诡异 bug,这次他从 Spring 源码里精确定位——是某个后置处理器时机 + 代理没生效。读源码第一次直接救了生产。", chapterType: "project", projectStage: "在源码里找到自己那个 bug · src-v4 Spring 祛魅", technologies: ["综合", "源码定位", "代理/事务失效排查"], jobSkills: ["Spring 源码", "排障"], status: "planned" },
    ],
  },
  {
    season: 5,
    code: "R5",
    title: "读框架的通法",
    subtitle: "从读懂到能改",
    goal: "把方法论迁移到任意框架:Netty 的 Reactor、MyBatis 的动态代理 Mapper、Tomcat 的容器分层、SLF4J 的绑定机制——都用同一套入口探照灯 + 调用链地图拿下,最后学会给开源库提一个真正被合并的 PR。",
    covers: ["Netty/Tomcat 架构", "MyBatis/SLF4J 机制", "给开源提 PR"],
    episodes: [
      { season: 5, episode: 1, title: "一个线程转多少路", summary: "Netty 的 Reactor:EventLoop 一根线程如何轮询千百个连接?挖姐用调用链地图拆 Reactor 模型,看 selector、pipeline、handler 如何把事件一站站传下去。", chapterType: "comic", projectStage: "读懂 Netty 的 Reactor 线程模型", technologies: ["Netty", "Reactor 模型", "EventLoop/pipeline"], jobSkills: ["框架源码", "网络编程"], status: "planned" },
      { season: 5, episode: 2, title: "接口凭空变实现", summary: "MyBatis 的动态代理 Mapper:一个只有接口没有实现的 Mapper 怎么就能查数据库?挖姐顺着 MapperProxy 挖,看 JDK 动态代理如何把方法调用翻译成 SQL 执行。", chapterType: "comic", projectStage: "读懂 MyBatis Mapper 的代理机制", technologies: ["MyBatis", "MapperProxy", "动态代理"], jobSkills: ["框架源码"], status: "planned" },
      { season: 5, episode: 3, title: "一层套一层的容器", summary: "Tomcat 的容器分层:Server→Service→Engine→Host→Context→Wrapper 像俄罗斯套娃。挖姐用入口探照灯从 Bootstrap 照到 Servlet,看一个请求穿过几层管道阀门。", chapterType: "comic", projectStage: "读懂 Tomcat 的容器分层结构", technologies: ["Tomcat", "容器分层", "Pipeline/Valve"], jobSkills: ["框架源码", "Servlet"], status: "planned" },
      { season: 5, episode: 4, title: "门面认哪个实现", summary: "日志门面 SLF4J 的绑定:同一行 logger.info 为什么能接 Logback 也能接 Log4j2?挖姐读 SLF4J 的绑定机制,揭开「门面 + SPI 找实现」这套解耦经典。", chapterType: "reference", projectStage: "读懂 SLF4J 门面绑定机制", technologies: ["SLF4J", "日志门面", "SPI 绑定"], jobSkills: ["框架源码", "设计模式"], status: "planned" },
      { season: 5, episode: 5, title: "从读者到贡献者", summary: "如何给开源库提 PR:定位 bug 只是开始——挖姐教怎么读贡献指南、复现、写测试、发起 issue 讨论、按 review 迭代,把「我读懂了」变成「我改好了」。", chapterType: "lab", projectStage: "掌握开源贡献的完整流程", technologies: ["开源贡献", "PR/Issue 流程", "复现与测试"], jobSkills: ["开源协作", "工程实践"], status: "planned" },
      { season: 5, episode: 6, title: "把补丁交出去", summary: "全线终章:阿零挑一个咖啡站真在用的开源项目,用整套通法定位一个真实缺陷、提交修复 PR 并被合并——从「会用库」到「读懂库」再到「改动库」,挖姐把爪子上的鳞片递给他。", chapterType: "project", projectStage: "给真实开源项目提交修复 · src-v5 源码大成", technologies: ["综合", "真实 PR", "缺陷定位与修复"], jobSkills: ["源码阅读", "开源协作"], status: "planned" },
    ],
  },
];

export function srcAllEpisodes(): JavaEpisode[] {
  return SRC_SEASONS.flatMap((s) => s.episodes);
}

export function srcPublishedEpisodes(): JavaEpisode[] {
  return srcAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
