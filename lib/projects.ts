/**
 * 项目集数据源。手写常量而非 GitHub API:
 * 一是首屏零外部依赖,二是「这个项目解决了什么」只有人写得出来。
 * 新增项目 = 往下面数组加一条。
 */

export type ProjectStatus = "active" | "shipped" | "research" | "paused";

export type Project = {
  name: string;
  /** 一句话定位:说清它解决什么问题,不是它用了什么技术 */
  lead: string;
  /** 2-4 句展开:动机、做法、现在到哪一步 */
  detail: string;
  stack: string[];
  status: ProjectStatus;
  /** 可量化的关键结果,没有就留空数组 */
  highlights?: string[];
  repo?: string;
  live?: string;
  /** 站内相关文章 slug,把项目与写作串起来 */
  posts?: { title: string; slug: string }[];
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "在建",
  shipped: "已上线",
  research: "研究中",
  paused: "暂停",
};

export const PROJECTS: Project[] = [
  {
    name: "豆豆学习博客",
    lead: "你正在读的这个站:一个把技术教程写成漫画连载的单体博客。",
    detail:
      "Next.js App Router 单体,没有独立后端 —— 写入直接走 Server Action 打 MongoDB Atlas,内容由本地 Markdown 与数据库按 slug 合并(数据库优先,连不上就降级读 md,所以断网也能构建)。Markdown 渲染器是自己写的纯函数模块,零第三方依赖:代码高亮走 Shiki 构建期完成,客户端不背任何高亮 JS。全站手写 CSS,没有 Tailwind 也没有 UI 库。",
    stack: ["Next.js 16", "React 19", "TypeScript 6", "MongoDB Atlas", "Shiki", "Docker", "Nginx", "Cloudflare"],
    status: "active",
    highlights: [
      "自研 Markdown 渲染器 + 32 例原生测试,零运行时依赖",
      "构建期语法高亮,文章页不下发高亮 JS",
      "CDN → Nginx 缓存 → Node 三级链路,HTML 边缘缓存",
    ],
  },
  {
    name: "咖啡站宇宙 · 多线漫画连载",
    lead: "把 Java 工程师需要的整个知识面,写成同一个世界观下的十几条漫画连载。",
    detail:
      "主线《从零开始学 Java》56 话 + 番外三卷 34 话已完结,《从零开始玩命令行》25 话完结,《豆豆咖啡站》是纯故事线。之后按知识域扩出 JVM、构建、微服务、网络、操作系统、数据库、分布式、云原生、安全、算法、AI、前端等多条线,每条线一位导师、一个长期项目。所有蓝图先行:章节表、依赖铁律、检查点版本链全部写死在注册表里,再逐话开更。",
    stack: ["内容工程", "TypeScript 注册表", "Markdown"],
    status: "active",
    highlights: ["已上线 130+ 话", "多条线共用一套注册表与渲染管线,新开一条线只加一行"],
  },
];
