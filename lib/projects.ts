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
    name: "咖啡站技术志",
    lead: "一个把技术教程写成漫画连载的学习站。",
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
  {
    name: "遥感视觉问答(VQA)",
    lead: "让模型看懂遥感影像并回答关于它的问题。",
    detail:
      "围绕遥感场景下的多模态理解:影像与文本的对齐、地物要素的指代消解、以及在小样本条件下的迁移。关注点在于遥感影像与自然图像的分布差异——尺度跨度大、目标小、类别长尾,通用视觉语言模型直接迁移会明显退化。",
    stack: ["PyTorch", "多模态", "遥感"],
    status: "research",
  },
  {
    name: "MoE 稀疏专家模型",
    lead: "在有限算力下,用稀疏激活换更大的有效模型容量。",
    detail:
      "研究混合专家架构的路由策略与负载均衡:专家坍缩、路由抖动、训练与推理阶段的容量因子差异,都是实践里真正卡人的问题。目标是搞清楚「什么时候 MoE 真的划算」,而不是把它当成默认选项。",
    stack: ["PyTorch", "MoE", "分布式训练"],
    status: "research",
  },
  {
    name: "自托管监控栈",
    lead: "一台轻量云服务器上的可观测性:知道它什么时候要挂,而不是挂了才知道。",
    detail:
      "Netdata 采指标、Uptime Kuma 做外部探活、Cloudflare Analytics 看边缘流量,前面用鉴权网关收口,不对公网裸奔。踩过的坑都写进了站内文章:反向代理缓存吃掉登录 Cookie、指标接口忘了加鉴权、以及容器重启后历史数据落在临时目录里丢掉。",
    stack: ["Netdata", "Uptime Kuma", "Nginx", "Cloudflare Tunnel"],
    status: "shipped",
    highlights: ["指标接口全部走鉴权网关", "外部探活与内部指标双通道"],
  },
  {
    name: "Windows 开发主机工程化",
    lead: "把一台 Windows 开发机当生产环境来管:可复现、可审计、可回滚。",
    detail:
      "多版本工具链统一走版本管理器(Node/Python/Java 各行其道容易互相污染),全盘加密与自动解锁,攻击面缩减规则成组落地,以及一套只读审计流程 —— 升级前先出报告,确认过期项与风险清单再执行,而不是无脑 upgrade --all。",
    stack: ["PowerShell 7", "mise", "WSL2", "Windows 安全基线"],
    status: "active",
    highlights: ["工具链版本全部可复现", "升级走「只读审计 → 确认 → 执行」三步"],
  },
];
