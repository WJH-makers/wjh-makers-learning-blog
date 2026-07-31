import type { Route } from "next";
import { SERIES_LIST, seriesProgress } from "@/lib/series-registry";

/**
 * 区域/路径是否已点亮 —— 唯一事实源是 series-registry,这里只做推导。
 *
 * 原先每条都手写 `availability: "open" | "horizon"`,于是同一件事在两处各写一遍,
 * 必然脱节:《从零开始玩命令行》25 话早已全部开更,宇宙地图却一直把「终端码头」
 * 画成雾区,起步页更是直接把「把项目运行到服务器」整条路径过滤掉了。
 * 现在改成问注册表要答案,任何一条线开更,这些页面自动跟上。
 */
export function availabilityOf(route: Route): "open" | "horizon" {
  const series = SERIES_LIST.find((s) => s.route === route);
  return series && seriesProgress(series).done > 0 ? "open" : "horizon";
}

export type UniverseDistrict = {
  title: string;
  route: Route;
  role: string;
  description: string;
  projectStage: string;
};

export const UNIVERSE_DISTRICTS: UniverseDistrict[] = [
  {
    title: "起点街区",
    route: "/java",
    role: "Java 主线",
    description: "从第一行输出、对象和集合出发，跟着阿零与豆豆把咖啡站从程序做成系统。",
    projectStage: "命令行咖啡计算器 → 菜单与订单管理",
  },
  {
    title: "终端码头",
    route: "/cli",
    role: "命令行主线",
    description: "文件、Git、远程服务器和部署的入口；每一项都保留 Linux 与 PowerShell 的边界。",
    projectStage: "本机工具链 → 服务器上线日",
  },
  {
    title: "咖啡站本传",
    route: "/cafe",
    role: "故事主线",
    description: "一间小店、一台记性太好的机器人与一套逐渐长大的系统；技术服务于人，而不是反过来。",
    projectStage: "重新亮灯的小店 → 城市里的未来店",
  },
  {
    title: "后端帝国",
    route: "/spring",
    role: "工程分支",
    description: "HTTP、Spring、数据库与接口设计。读者从这里看见一条请求怎样真正穿过服务。",
    projectStage: "REST API → 可维护的业务服务",
  },
  {
    title: "数据与并发夜市",
    route: "/db",
    role: "工程分支",
    description: "MySQL、Redis、事务、缓存和并发问题在同一张订单桌上相遇。",
    projectStage: "正确落库 → 库存、缓存与一致性",
  },
  {
    title: "引擎室与云端",
    route: "/jvm",
    role: "工程分支",
    description: "JVM、构建、部署、观测与性能排查，让咖啡站能持续稳定地营业。",
    projectStage: "本机运行 → 可观测的线上系统",
  },
  {
    title: "工程师航线",
    route: "/career",
    role: "现实世界",
    description: "把项目、代码、运行记录与取舍变成可被陌生人验证的工程证据。",
    projectStage: "项目证据包 → 五分钟项目叙事",
  },
  {
    title: "AI 观测站",
    route: "/ai",
    role: "专题世界",
    description: "遥感 VQA、模型调用与 AI 工程实践；它是差异化番外，不替代后端基本功。",
    projectStage: "RSVQA 可复现链路",
  },
];

export const READING_PATHS = [
  {
    title: "从零写出第一个 Java 程序",
    audience: "刚开始学编程，或需要重建 Java 基础的人",
    route: "/java" as Route,
    steps: ["Java 主线第一季", "对象与集合", "Maven、JUnit 与 Git"],
  },
  {
    title: "走向 Java 后端工程",
    audience: "已有语法基础，想理解 Web、数据与项目主链路的人",
    route: "/career" as Route,
    steps: ["项目证据包", "Spring 与数据库", "秒杀与并发边界"],
  },
  {
    title: "把项目运行到服务器",
    audience: "想把代码、容器、服务器和排障串成一条线的人",
    route: "/cli" as Route,
    steps: ["终端与 Git", "SSH、Nginx、Docker", "部署后的验证与回滚"],
  },
] as const;

export const CHARACTERS = [
  {
    name: "阿零",
    role: "成长视角 · 亲手做与亲自犯错",
    description: "从不敢读报错到能解释系统取舍。读者通过他进入每一个技术世界，也看见错误如何被验证和修复。",
    route: "/java" as Route,
  },
  {
    name: "豆豆",
    role: "边界与证据 · 咖啡站的记忆",
    description: "她不接受“应该没问题”。每个看似正确的方案，都要经过测试、账本、异常路径和具体人的检验。",
    route: "/cafe" as Route,
  },
  {
    name: "特米",
    role: "终端与部署 · 让系统真的跑起来",
    description: "把命令行、远程机器、日志和发布日的紧张感带进故事；能执行的命令必须先交代边界与回滚。",
    route: "/cli" as Route,
  },
  {
    name: "领姐",
    role: "工程表达 · 把能力变成证据",
    description: "不把成长讲成鸡汤，而是帮助阿零把项目、文档、取舍与复盘整理成陌生人也能验证的成果。",
    route: "/career" as Route,
  },
] as const;

export const COFFEE_PROJECT_STAGES = [
  { title: "一行问候", route: "/java" as Route, summary: "输入、输出、变量与控制流，让咖啡站先能开口。" },
  { title: "菜单与订单", route: "/java" as Route, summary: "对象、集合、异常和测试，让业务规则可维护。" },
  { title: "能被访问的服务", route: "/spring" as Route, summary: "HTTP、Spring Boot、MySQL 与 API，让顾客能下单。" },
  { title: "大促不超卖", route: "/career" as Route, summary: "事务、并发、缓存和幂等，让库存与订单经得起请求同时到来。" },
  { title: "持续营业的系统", route: "/cli" as Route, summary: "Docker、Nginx、日志和健康检查，让系统能部署、能观察、能回滚。" },
] as const;
