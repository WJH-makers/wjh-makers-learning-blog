/**
 * 《从零开始写前端》· 浏览器大陆(第三部连载,slug 前缀 web)。
 *
 * 与前两线同宇宙:咖啡站生意火了,顾客抱怨"没有官网、点单靠喊"。
 * 阿零决定给豆豆咖啡站做官网 + 在线点单站——用的正是本博客同款技术栈
 * (Next.js 16 + React 19 + 纯手写 CSS),一个"作品即教材"的自指梗。
 * 版本链 v0(静态菜单页)→ v6(全栈点单站上线),每卷卷终打一个 tag。
 *
 * 新导师「薇塔」(Vita,取自 Web Vitals):常驻咖啡站窗台喂食器的蜂鸟,
 * 每秒振翅恰好 60 次("掉到 59 我就浑身难受"),羽毛颜色随页面主题色
 * 实时变化(体内流着 CSS 变量),脖挂毫秒怀表,看一眼页面就报出
 * LCP/INP/CLS 三个数。口头禅:"别猜,量一下。"(看到卡顿则炸毛:"掉帧了!")
 *
 * 本线独有深度栏目:🧭 渲染罗盘——每话结尾把代码钉在
 * 构建期/服务器/边缘/浏览器 四象限地图上,并对照一句
 * "如果是 Spring Boot 会在哪层做";38 话连起来是一张现代 Web 渲染位置总图。
 * 联动钩子:豆豆全程担任产品经理 + 后端(点单请求打到 Java 线的
 * Spring Boot 服务上);特米在模块体系(话 6)与 Edge/部署(话 32)客串。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const WEB_SERIES_META = {
  slug: "web-academy",
  title: "从零开始写前端",
  alias: "阿零与薇塔 · 浏览器大陆",
  tagline: "从一个 <div> 到豆豆咖啡站官网上线——用 Java 工程师的第一性原理,把 TS / React 19 / Next 16 的「魔法」逐层拆成看得见的机器。",
  project: "给豆豆咖啡站做官网与在线点单站",
  storageKey: "web-academy:completed",
} as const;

export const WEB_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "W1",
    title: "类型的骨架",
    subtitle: "TS 类型系统",
    goal: "从 Java 的名义类型转弯到 TS 的结构化类型,吃透收窄、判别联合与泛型,给 v0 静态菜单页全量上类型。",
    covers: ["TS 类型系统", "tsconfig", "模块体系"],
    episodes: [
      { season: 1, episode: 1, title: "蜂鸟落在窗台上", summary: "TS 是什么、strict 模式与 unknown vs any:顾客喊「官网呢?」,薇塔登场报出草稿页三项体检分,any 画成什么都能装的无盖垃圾桶。", chapterType: "comic", projectStage: "官网立项,草稿页第一次体检", technologies: ["TypeScript", "strict", "unknown", "any"], jobSkills: ["TypeScript"], status: "planned" },
      { season: 1, episode: 2, title: "看形状,不看出身", summary: "结构化类型系统与 Java 名义类型对比:咖啡站会员卡,Java 查「是不是 Member 实例」,TS 只看「卡上有没有姓名和积分」。", chapterType: "comic", projectStage: "菜单数据有了第一批类型", technologies: ["结构化类型", "类型兼容"], jobSkills: ["TypeScript"], status: "planned" },
      { season: 1, episode: 3, title: "收窄的艺术", summary: "类型收窄与守卫(typeof/in/is):薇塔当点单口安检员,typeof 问「杯装还是袋装」,自定义 is 谓词发「已验明正身」胸牌。", chapterType: "comic", projectStage: "输入处理不再靠 as 硬转", technologies: ["typeof", "in", "is 谓词", "类型收窄"], jobSkills: ["TypeScript"], status: "planned" },
      { season: 1, episode: 4, title: "一杯订单的 N 种状态", summary: "判别联合 + 穷尽检查:订单小票的 kind 字段(待付/制作中/已完成),switch 少写一种状态编译器当场拉响警报,对照 Java sealed interface。", chapterType: "comic", projectStage: "订单状态机类型化", technologies: ["判别联合", "联合类型", "穷尽检查"], jobSkills: ["TypeScript"], status: "planned" },
      { season: 1, episode: 5, title: "万能杯型的秘密", summary: "泛型约束与内置工具类型:泛型是可套任何杯子的杯套机 <T extends 杯子>,Pick/Omit 是菜单裁剪剪刀,给外卖平台裁出精简版类型。", chapterType: "comic", projectStage: "通用工具函数类型安全复用", technologies: ["泛型", "Partial", "Pick", "Omit", "Record"], jobSkills: ["TypeScript"], status: "planned" },
      { season: 1, episode: 6, title: "配置即契约", summary: "第一卷卷终:tsconfig 核心项、ESM vs CJS 与 satisfies/as const——特米客串,两套插头接错就冒烟,satisfies 是「验货不改标签」的质检章,v0 类型全绿打 tag。", chapterType: "project", projectStage: "v0 静态菜单页,类型全绿", technologies: ["tsconfig", "ESM", "CJS", "satisfies", "as const"], jobSkills: ["TypeScript", "工程化"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "W2",
    title: "浏览器的后厨",
    subtitle: "渲染原理与事件循环",
    goal: "看懂浏览器这台机器:渲染管线、事件循环、重排重绘与 Core Web Vitals,给菜单页装上性能监控。",
    covers: ["渲染管线", "事件循环", "Web Vitals", "HTTP 缓存"],
    episodes: [
      { season: 2, episode: 7, title: "一张网页的出餐流程", summary: "渲染管线 DOM/CSSOM→渲染树→Layout→Paint→Composite:薇塔带阿零参观浏览器后厨的五工位流水线——你写的不是页面,是给后厨的菜谱。", chapterType: "comic", projectStage: "看懂页面怎么被画出来", technologies: ["DOM", "CSSOM", "Layout", "Paint", "Composite"], jobSkills: ["浏览器原理"], status: "planned" },
      { season: 2, episode: 8, title: "主线程只有一个厨师", summary: "事件循环与宏/微任务、rAF:独苗厨师「主线程」被同步大单堵死顾客点击没人理,微任务是插队的 VIP 便签,rAF 是下一帧出菜前的固定巡台。", chapterType: "comic", projectStage: "解释得清「为什么卡」", technologies: ["事件循环", "宏任务", "微任务", "requestAnimationFrame"], jobSkills: ["浏览器原理"], status: "planned" },
      { season: 2, episode: 9, title: "动了什么,重做什么", summary: "重排 vs 重绘 vs 合成:挪桌子(Layout)全店重排、换桌布(Paint)只刷一桌、投影灯打光(Composite)零成本,薇塔演示两版招牌动画帧率对比。", chapterType: "comic", projectStage: "招牌动画稳定 60fps", technologies: ["重排", "重绘", "transform", "opacity"], jobSkills: ["浏览器原理", "性能优化"], status: "planned" },
      { season: 2, episode: 10, title: "毫秒怀表的三根针", summary: "Core Web Vitals(INP 已取代 FID):LCP=第一杯主打咖啡上桌时间,INP=喊服务员到应答的延迟,CLS=餐没上桌子突然被挪——用户只看这三根针。", chapterType: "comic", projectStage: "菜单页有了性能基线", technologies: ["LCP", "INP", "CLS"], jobSkills: ["性能优化"], status: "planned" },
      { season: 2, episode: 11, title: "网络与缓存的补给线", summary: "HTTP 缓存:immutable 是保质期一年的密封豆,ETag 是先问一句「豆子换了吗」没换就不重运,CDN 是各城市前置仓——最快的请求是没发出去的那个。", chapterType: "comic", projectStage: "静态资源命中缓存", technologies: ["Cache-Control", "ETag", "immutable", "CDN"], jobSkills: ["HTTP", "性能优化"], status: "planned" },
      { season: 2, episode: 12, title: "开发者工具巡店", summary: "第二卷卷终:DevTools Performance/Network 面板与 web-vitals 上报——给菜单页录「监控录像」揪出 800ms 长任务,怀表数据进了豆豆的仪表盘。", chapterType: "project", projectStage: "菜单页接入 RUM 监控", technologies: ["DevTools", "Performance 面板", "web-vitals"], jobSkills: ["性能优化", "可观测性"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "W3",
    title: "像素的排版间",
    subtitle: "CSS 现代布局",
    goal: "盒模型、Flex、Grid、容器查询与 CSS 变量——纯手写 CSS 排出「工程报纸」风官网 v1,不靠任何框架也井然有序。",
    covers: ["盒模型", "Flexbox", "Grid", "响应式", "CSS 变量", "级联层"],
    episodes: [
      { season: 3, episode: 13, title: "盒子里的宇宙", summary: "盒模型、box-sizing 与 BFC:每个元素是一个咖啡杯,content 是咖啡、padding 是杯壁、margin 是社交距离,两个 margin 相遇只留大的——社恐合并定律。", chapterType: "comic", projectStage: "布局不再玄学", technologies: ["盒模型", "box-sizing", "BFC", "外边距折叠"], jobSkills: ["CSS"], status: "planned" },
      { season: 3, episode: 14, title: "一维流水线", summary: "Flexbox 主轴/交叉轴与 grow/shrink/basis:吧台传送带上,grow 有空位就多占、shrink 挤了就收腹、basis 出厂占位,导航栏三兄弟争位大战。", chapterType: "comic", projectStage: "官网导航栏成型", technologies: ["Flexbox", "flex-grow", "flex-shrink", "flex-basis"], jobSkills: ["CSS"], status: "planned" },
      { season: 3, episode: 15, title: "报纸排版术", summary: "CSS Grid(template-areas/fr/minmax/subgrid):把首页画成真报纸,头版头条侧栏通栏用 grid-template-areas 直接「写字排版」,subgrid 对齐外页铅字线。", chapterType: "comic", projectStage: "首页报纸骨架排出", technologies: ["Grid", "grid-template-areas", "fr", "minmax", "subgrid"], jobSkills: ["CSS"], status: "planned" },
      { season: 3, episode: 16, title: "谁看谁的脸色", summary: "媒体查询 vs 容器查询:前者看整条街的宽度换招牌,后者每张桌子看自己大小换摆盘,菜单卡片进侧栏自动变紧凑版——组件该看父容器的脸色。", chapterType: "comic", projectStage: "官网全尺寸自适应", technologies: ["@media", "@container", "响应式"], jobSkills: ["CSS"], status: "planned" },
      { season: 3, episode: 17, title: "会流动的颜色", summary: "CSS 自定义属性与 calc():薇塔羽毛的秘密公开——全站色板就是一组 --var,换主题=换一层变量,暗色模式一夜上线,豆豆感动落泪(漏油)。", chapterType: "comic", projectStage: "主题系统与暗色模式上线", technologies: ["CSS 变量", "var()", "calc()", "暗色模式"], jobSkills: ["CSS"], status: "planned" },
      { season: 3, episode: 18, title: "层叠有法", summary: "第三卷卷终::has()/原生嵌套/@layer——样式打架现场三条规则抢一个按钮,@layer 是排版间的楼层制度谁在高层谁说了算,v1 官网上线打 tag。", chapterType: "project", projectStage: "v1 工程报纸风官网上线", technologies: [":has()", "CSS 嵌套", "@layer"], jobSkills: ["CSS", "工程化"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "W4",
    title: "组件的流水线",
    subtitle: "React 19",
    goal: "从「UI 是状态的函数」到 Actions 与 React Compiler,把菜单页组件化(v2)并做出真正能交互的点单表单(v3)。",
    covers: ["React 心智模型", "Hooks", "表单与 Actions", "React Compiler"],
    episodes: [
      { season: 4, episode: 19, title: "UI 是状态的函数", summary: "React 心智模型与 JSX 单向数据流:豆豆的出饮口同样配方(state)进永远出同一杯(UI),阿零伸手想改成品被薇塔拍开——改配方,别改成品。", chapterType: "comic", projectStage: "第一个 React 组件", technologies: ["React", "JSX", "单向数据流"], jobSkills: ["React"], status: "planned" },
      { season: 4, episode: 20, title: "状态与记忆", summary: "useState/useRef 与「渲染即重新执行」:每次重渲染=整个吧台推倒重摆,但 useState 的小保险箱内容不丢,useRef 是不触发重摆的便签贴。", chapterType: "comic", projectStage: "菜单组件有了状态", technologies: ["useState", "useRef", "重渲染"], jobSkills: ["React"], status: "planned" },
      { season: 4, episode: 21, title: "副作用隔离间", summary: "useEffect 依赖数组与闭包过期陷阱:依赖漏写一项,阿零拿着上一轮的旧菜单价格收钱,顾客暴怒——React 事故高发区的经典复盘。", chapterType: "incident", projectStage: "副作用被关进隔离间", technologies: ["useEffect", "依赖数组", "闭包"], jobSkills: ["React", "排障"], status: "planned" },
      { season: 4, episode: 22, title: "身份牌之战", summary: "列表 key 与协调:用序号当 key,第一位顾客一插队后面所有人的订单全串杯,换成订单号天下太平——key 是身份证,不是排队号。", chapterType: "incident", projectStage: "订单列表不再串杯", technologies: ["key", "reconciliation", "diff"], jobSkills: ["React", "排障"], status: "planned" },
      { season: 4, episode: 23, title: "表单的两种性格", summary: "受控/非受控与状态提升:受控=每敲一个字都报备店长,非受控=写完小票一次性交,两个组件抢购物车状态,薇塔裁决——提升到最近公共祖先。", chapterType: "comic", projectStage: "v2 菜单页组件化完成", technologies: ["受控组件", "状态提升", "Context"], jobSkills: ["React"], status: "planned" },
      { season: 4, episode: 24, title: "Action:表单的自动流水线", summary: "React 19 Actions(useActionState/useFormStatus):点单表单接上传送带,提交、pending 转圈的豆豆、成败结果一条龙,不再手写 loading/error 三件套。", chapterType: "comic", projectStage: "点单表单接上 Action", technologies: ["Actions", "useActionState", "useFormStatus"], jobSkills: ["React"], status: "planned" },
      { season: 4, episode: 25, title: "先斩后奏的乐观", summary: "useOptimistic 与 useTransition:顾客点「加一杯」界面立刻 +1、后厨失败再回滚道歉,useTransition 把重排序大活标记为「不着急,先响应点击」。", chapterType: "comic", projectStage: "点单交互丝滑不阻塞", technologies: ["useOptimistic", "useTransition"], jobSkills: ["React"], status: "planned" },
      { season: 4, episode: 26, title: "编译器接管记忆", summary: "第四卷卷终:React Compiler 1.0 自动记忆化——阿零满屏手写 useMemo 像贴满便利贴的墙,开启 Compiler 便利贴自动飞走归档,v3 打 tag。", chapterType: "project", projectStage: "v3 可交互点单表单", technologies: ["React Compiler", "useMemo", "useCallback"], jobSkills: ["React", "性能优化"], status: "planned" },
    ],
  },
  {
    season: 5,
    code: "W5",
    title: "全栈的传送带",
    subtitle: "Next.js 16",
    goal: "App Router、RSC 边界、Server Actions 与四层缓存模型——点单站全栈化(v4→v5),接上 Java 线的 Spring Boot 后端。",
    covers: ["App Router", "RSC", "Server Actions", "缓存模型", "渲染策略"],
    episodes: [
      { season: 5, episode: 27, title: "文件夹即路由", summary: "App Router 约定式文件(layout/page/loading/error):咖啡站平面图=目录树,大堂(根 layout)永远不拆、包间各自装修,loading.tsx 是上菜前的骨架餐垫。", chapterType: "comic", projectStage: "点单站路由骨架", technologies: ["App Router", "layout", "page", "loading", "error"], jobSkills: ["Next.js"], status: "planned" },
      { season: 5, episode: 28, title: "组件的国界线", summary: "Server/Client Components 与 RSC 序列化边界:后厨组件能直接开冰箱(查库)但碰不到顾客,前厅('use client')能握手但进不了后厨,跨界只能递可序列化的托盘。", chapterType: "comic", projectStage: "组件树按国界切分", technologies: ["RSC", "'use client'", "序列化边界"], jobSkills: ["Next.js"], status: "planned" },
      { season: 5, episode: 29, title: "在后厨直接拿数据", summary: "async 服务端组件与请求记忆化:旧世界前厅隔窗喊三轮才拿齐配料(useEffect 瀑布流),新世界后厨伸手就拿,同一请求多处要只跑一次。", chapterType: "comic", projectStage: "菜单数据服务端直取", technologies: ["async 组件", "fetch", "请求记忆化"], jobSkills: ["Next.js"], status: "planned" },
      { season: 5, episode: 30, title: "'use server':函数即接口", summary: "Server Actions 与渐进增强:阿零照 Java 惯例要写 Controller+DTO 三件套,薇塔按住——表单直接 POST 进 'use server' 函数,断网 JS 失效照样能交。", chapterType: "comic", projectStage: "点单直连服务端函数", technologies: ["Server Actions", "'use server'", "渐进增强"], jobSkills: ["Next.js"], status: "planned" },
      { season: 5, episode: 31, title: "四层冷藏柜", summary: "Next 缓存模型四层与 'use cache':本单备料台(请求记忆化)、食材冷柜(Data Cache)、成品柜(Full Route Cache)、随身保温杯(Router Cache),各有各的钥匙。", chapterType: "reference", projectStage: "缓存策略显式声明", technologies: ["'use cache'", "Data Cache", "Full Route Cache", "Router Cache"], jobSkills: ["Next.js"], status: "planned" },
      { season: 5, episode: 32, title: "渲染策略点菜单", summary: "第五卷卷终:SSG/ISR/SSR/CSR/PPR 逐页点套餐,PPR=静态外壳先上桌动态洞现做现补,特米客串在边缘节点站岗(middleware),v5 打 tag。", chapterType: "project", projectStage: "v5 点单站全栈化上线", technologies: ["SSG", "ISR", "SSR", "PPR", "Suspense", "middleware"], jobSkills: ["Next.js", "架构"], status: "planned" },
    ],
  },
  {
    season: 6,
    code: "W6",
    title: "毫秒必争",
    subtitle: "性能、上线与前沿",
    goal: "LCP/INP/CLS 三大实战 + 前端安全 + 新一代工具链,点单站 v6 正式营业,薇塔的三根针全部指绿。",
    covers: ["性能实战", "前端安全", "TS 7 工具链", "前沿特性"],
    episodes: [
      { season: 6, episode: 33, title: "最大的那张图", summary: "LCP 优化实战:首页 4MB 原图海报把 LCP 顶到 6 秒薇塔当场炸毛,next/image 自动裁剪 + AVIF + 预加载,针回 1.8 秒。", chapterType: "incident", projectStage: "首屏 LCP 达标", technologies: ["LCP", "next/image", "AVIF", "srcset", "预加载"], jobSkills: ["性能优化"], status: "planned" },
      { season: 6, episode: 34, title: "卡住的 300 毫秒", summary: "INP 实战与长任务拆分:点「下单」后同步算满减+画动画,主线程厨师连做 400ms 大活,拆成小步、scheduler.yield 每步让位,点击秒被应答。", chapterType: "lab", projectStage: "交互延迟压进 200ms", technologies: ["INP", "长任务", "scheduler.yield"], jobSkills: ["性能优化"], status: "planned" },
      { season: 6, episode: 35, title: "不许挪我的桌子", summary: "CLS 与字体加载:Web 字体迟到菜单文字集体变宽,「下单」按钮被挤跑顾客点到了「清空购物车」——size-adjust 让替补字体先按同样身材站位。", chapterType: "incident", projectStage: "版面零位移", technologies: ["CLS", "font-display", "字体子集化", "size-adjust"], jobSkills: ["性能优化"], status: "planned" },
      { season: 6, episode: 36, title: "看不见的防线", summary: "前端安全面:有人在昵称里写 <script> 想偷会员积分被 React 默认转义挡下,dangerouslySetInnerHTML 是亲手拆防爆门,CSP 是店门口的白名单保安。", chapterType: "comic", projectStage: "安全防线布防完成", technologies: ["XSS", "CSRF", "CSP", "httpOnly"], jobSkills: ["前端安全"], status: "planned" },
      { season: 6, episode: 37, title: "十倍速的编译器", summary: "TypeScript 7 原生编译器与构建产物:CI 里 tsc 老牛车换成 tsgo 磁悬浮类型检查 40s→4s,bundle 分析仪照出整包引入的日期库巨无霸,动态 import 拆走。", chapterType: "lab", projectStage: "构建与 CI 提速十倍", technologies: ["TypeScript 7", "tsgo", "Turbopack", "code splitting"], jobSkills: ["工程化", "性能优化"], status: "planned" },
      { season: 6, episode: 38, title: "蜂鸟起飞", summary: "大结局:v6 发布会换页如翻报纸(View Transitions)、悬停即预渲染(Speculation Rules),薇塔展望群岛哲学与 AI 流式 UI,三线角色齐聚咖啡站合影。", chapterType: "project", projectStage: "v6 点单站正式营业", technologies: ["View Transitions", "Speculation Rules", "Baseline", "Islands"], jobSkills: ["前端架构"], status: "planned" },
    ],
  },
];

export function webAllEpisodes(): JavaEpisode[] {
  return WEB_SEASONS.flatMap((s) => s.episodes);
}

export function webPublishedEpisodes(): JavaEpisode[] {
  return webAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
