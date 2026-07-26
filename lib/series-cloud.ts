/**
 * 《从零开始上云原生》· 云原生舰队(第三部连载,slug 前缀 cloud)。
 *
 * 与 Java/CLI 线同宇宙:CLI 线 C5「上线日」咖啡站入住真实服务器之后,
 * 咖啡站火了要开连锁 —— 开分店(多实例)、任何一家断电顾客无感(自愈与弹性)、
 * 新品全城同步上架(CI/CD)、知道哪家店排队最长(可观测)。连锁化 = 云原生化。
 * 新导师「库舵」(Kubo)登场:戴船长帽的领航鲸,背驮微型集装箱码头,
 * 信奉"不描述过程,只宣告终态",口头禅「对不齐?Reconcile 一下」,
 * 生气时喷水柱(OOMKill 具象化);特米在卷四客串流水线脚本顾问,豆豆是被编排的对象。
 *
 * 长期项目:把豆豆咖啡站从单店(v0)开成全城连锁舰队,检查点版本链与 Java 线互认。
 * 本线独有深度栏目:⚓ 真机靠港(教科书 K8s 姿势 ↔ 博主 2C 小水管 compose 单机的务实姿势)。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const CLOUD_SERIES_META = {
  slug: "cloud-academy",
  title: "从零开始上云原生",
  alias: "阿零与库舵 · 云原生舰队",
  tagline: "豆豆咖啡站要开连锁了——从一台咖啡机到一支舰队,跟着阿零和库舵,把单机部署的手艺炼成声明式运维的道法。",
  project: "把咖啡站从单店开成全城连锁舰队",
  storageKey: "cloud-academy:completed",
} as const;

export const CLOUD_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "Y1",
    title: "集装箱革命",
    subtitle: "一台咖啡机的秘密",
    goal: "吃透 Docker 原理与构建:容器本质、镜像分层、Dockerfile、网络与持久化,把单店(v0)变成能被一个文件描述、异地一键复刻的店。",
    covers: ["容器本质", "镜像与 Dockerfile", "网络与 Volume", "Compose"],
    episodes: [
      { season: 1, episode: 1, title: "鲸落咖啡站", summary: "容器 = namespace + cgroup 隔出来的普通进程:库舵初登场给豆豆罩上「隔间」,隔间外其实是热闹后厨。", chapterType: "comic", projectStage: "豆豆住进隔间", technologies: ["namespace", "cgroup", "docker run"], jobSkills: ["Docker", "容器原理"], status: "planned" },
      { season: 1, episode: 2, title: "千层酥镜像", summary: "镜像分层与 OCI 规范:招牌千层酥每层烤好冷冻定型(只读层),点单只在最上面现挤一层奶油(可写层),两款酥共用底层饼皮。", chapterType: "comic", projectStage: "看懂千层酥", technologies: ["镜像分层", "OCI"], jobSkills: ["Docker", "容器原理"], status: "planned" },
      { season: 1, episode: 3, title: "配方即代码", summary: "Dockerfile 与层缓存:手冲步骤写成配方卡逐行执行,「备豆」写在「磨豆」后面导致每单重新备豆,库舵调序后一杯 3 秒。", chapterType: "lab", projectStage: "配方卡 3 秒一杯", technologies: ["Dockerfile", "层缓存"], jobSkills: ["Docker", "镜像构建"], status: "planned" },
      { season: 1, episode: 4, title: "后厨与吧台分离", summary: "多阶段构建:占半条街的烘焙工坊(JDK builder)只交一袋熟豆给巴掌大的吧台车(JRE/distroless)——交付的是咖啡,不是烘焙机。", chapterType: "comic", projectStage: "吧台车瘦身上路", technologies: ["multi-stage", "distroless", "JRE"], jobSkills: ["Docker", "镜像构建"], status: "planned" },
      { season: 1, episode: 5, title: "店内暗号", summary: "Docker 网络与端口映射:自定义网络 = 店内对讲频道,喊名字不喊工位号(内置 DNS);-p 是临街取餐窗口。", chapterType: "comic", projectStage: "店内对讲频道", technologies: ["bridge", "端口映射", "内置 DNS"], jobSkills: ["Docker", "网络"], status: "planned" },
      { season: 1, episode: 6, title: "断电惊魂", summary: "Volume 与数据持久化:停电重启会员积分册(容器内数据)清零,库舵把账本挪进店外墙里的保险柜(volume)。", chapterType: "incident", projectStage: "账本进保险柜", technologies: ["volume", "bind mount"], jobSkills: ["Docker"], status: "planned" },
      { season: 1, episode: 7, title: "一纸开店令", summary: "Compose 与 Registry/tag 策略:整店写成一页开店令异地一键复刻;latest 咖啡豆导致两家店风味不同,从此按批次号(digest)进货。", chapterType: "project", projectStage: "单店 v0 可一键复刻", technologies: ["Compose", "Registry", "tag", "digest"], jobSkills: ["Docker", "Compose"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "Y2",
    title: "舰队入港",
    subtitle: "三家分店与总调度室",
    goal: "掌握 K8s 基石:声明式模型、Pod / Deployment / Service、配置与探针、资源申报——把咖啡站从单店开成有总调度室的三家分店(v1→v2)。",
    covers: ["K8s 架构与声明式模型", "Pod / Deployment / Service", "ConfigMap / Secret", "探针与资源"],
    episodes: [
      { season: 2, episode: 1, title: "舵手的海图", summary: "K8s 架构与声明式模型:阿零想指挥每艘船,库舵只让他在海图(etcd)上写「我要三家店」,夜里风浪掀翻一家,清晨自动派船补上。", chapterType: "comic", projectStage: "海图上画下三家店", technologies: ["apiserver", "etcd", "声明式模型"], jobSkills: ["Kubernetes"], status: "planned" },
      { season: 2, episode: 2, title: "双人吧台", summary: "Pod 是共享网络与存储的最小搭伙单位:咖啡机器人与洗杯机器人必须共用一个吧台——洗杯机就是为这台咖啡机而生。", chapterType: "comic", projectStage: "双人吧台成型", technologies: ["Pod"], jobSkills: ["Kubernetes"], status: "planned" },
      { season: 2, episode: 3, title: "三胞胎与换装秀", summary: "Deployment 滚动更新与回滚:三胞胎店员一个一个换新制服,永远有人在岗(maxUnavailable);新制服过敏立刻整队换回。", chapterType: "comic", projectStage: "换装不打烊", technologies: ["Deployment", "ReplicaSet", "滚动更新"], jobSkills: ["Kubernetes"], status: "planned" },
      { season: 2, episode: 4, title: "总机小姐", summary: "Service 与集群内 DNS:店员轮班换人(Pod IP 会变),顾客只拨总机号,花名册(Endpoints)实时更新——找人靠名字不靠 IP。", chapterType: "comic", projectStage: "总机号开通", technologies: ["Service", "ClusterIP", "DNS"], jobSkills: ["Kubernetes"], status: "planned" },
      { season: 2, episode: 5, title: "配方保险箱", summary: "ConfigMap 公开贴墙、Secret 锁抽屉;豆豆发现抽屉钥匙就插在锁上——base64 不是加密,库舵喷了一记水柱。", chapterType: "comic", projectStage: "秘方进抽屉", technologies: ["ConfigMap", "Secret"], jobSkills: ["Kubernetes"], status: "planned" },
      { season: 2, episode: 6, title: "三道体检", summary: "liveness / readiness / startup 三探针:活着不等于能接单,新人培训期别催;Spring Boot 店员自带 Actuator 体检报告。", chapterType: "comic", projectStage: "三道体检上岗", technologies: ["探针", "Actuator"], jobSkills: ["Kubernetes", "Spring Boot"], status: "planned" },
      { season: 2, episode: 7, title: "饭量申报", summary: "requests/limits 与 QoS:虚报小饭量的被塞进挤爆的船舱,超限狂吃的被水柱 OOM 冲走;JVM 店员学会看餐盘大小吃饭(MaxRAMPercentage)。", chapterType: "project", projectStage: "连锁 v2 饭量有度", technologies: ["requests", "limits", "QoS", "MaxRAMPercentage"], jobSkills: ["Kubernetes", "JVM"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "Y3",
    title: "调度的艺术",
    subtitle: "全城十二家店",
    goal: "编排进阶:调度器、弹性伸缩、四种工作负载、存储声明、Gateway API 与网络隔离——把三家店开成全城十二家(v3),扩缩与流量入口不再靠人肉。",
    covers: ["调度器与亲和", "HPA", "工作负载类型", "PV/PVC", "Gateway API", "CNI 与 NetworkPolicy"],
    episodes: [
      { season: 3, episode: 1, title: "派船两步棋", summary: "调度器过滤 + 打分两阶段,affinity 与 taint/toleration 控制去向;Pending 不是拒绝,是所有港口都说了不。", chapterType: "comic", projectStage: "派船有章法", technologies: ["调度器", "affinity", "taint"], jobSkills: ["Kubernetes"], status: "planned" },
      { season: 3, episode: 2, title: "早高峰军团", summary: "HPA 弹性伸缩:排队长度(metric)超线,库舵从海里连吊三个集装箱吧台落地;十点人散自动收回——店随人流呼吸。", chapterType: "comic", projectStage: "吧台随人流呼吸", technologies: ["HPA", "metrics"], jobSkills: ["Kubernetes"], status: "planned" },
      { season: 3, episode: 3, title: "四种店员编制", summary: "StatefulSet / DaemonSet / Job / CronJob 速查:账房先生按序上岗且记得工号、每个码头一名保安、盘点做完就走、每晚十点烘豆。", chapterType: "reference", projectStage: "四种编制各就位", technologies: ["StatefulSet", "DaemonSet", "Job", "CronJob"], jobSkills: ["Kubernetes"], status: "planned" },
      { season: 3, episode: 4, title: "仓库券", summary: "PV / PVC / StorageClass:店员只递一张「要 10 箱位冷藏」的仓库券,码头仓储公司自动划位(动态供给)——声明要多少,别声明在哪。", chapterType: "comic", projectStage: "仓库券制度", technologies: ["PV", "PVC", "StorageClass"], jobSkills: ["Kubernetes"], status: "planned" },
      { season: 3, episode: 5, title: "换城门", summary: "Ingress NGINX 贴出退役告示(2026 停补),Gateway API 接班:市政(GatewayClass)、城门官(Gateway)、指路牌(HTTPRoute)三层分工。", chapterType: "comic", projectStage: "新城门开张", technologies: ["Ingress", "Gateway API", "HTTPRoute"], jobSkills: ["Kubernetes"], status: "planned" },
      { season: 3, episode: 6, title: "全城一张水路", summary: "每 Pod 一 IP 的扁平网络由 CNI(Cilium/Calico)实现;后厨与收银之间加「只许传菜口通行」的门禁(NetworkPolicy)。", chapterType: "comic", projectStage: "水路装上门禁", technologies: ["CNI", "NetworkPolicy"], jobSkills: ["Kubernetes", "网络"], status: "planned" },
      { season: 3, episode: 7, title: "不打烊改灶", summary: "In-Place Pod Resize(K8s 1.35 GA):豆豆锅炉加压不再熄火重启,当场拧阀门——重启是上个时代的道歉方式。", chapterType: "project", projectStage: "全城 v3 不打烊改灶", technologies: ["In-Place Resize", "Kubernetes 1.35"], jobSkills: ["Kubernetes"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "Y4",
    title: "流水线时代",
    subtitle: "新品全城同步上架",
    goal: "CI/CD 与 GitOps:GitHub Actions、镜像发布、OIDC 免密、发布策略、Argo CD 与 Helm/Kustomize——新配方合并即验证、打 tag 即全城上架(v4)。",
    covers: ["GitHub Actions", "镜像发布与 Secrets", "OIDC", "发布策略", "GitOps 与 Helm/Kustomize"],
    episodes: [
      { season: 4, episode: 1, title: "配方评审流水线", summary: "GitHub Actions 模型:新配方一 push 传送带自动开动,试做(build)、试喝(test)、三种豆子并行试(matrix);特米客串流水线脚本顾问。", chapterType: "lab", projectStage: "传送带开动", technologies: ["GitHub Actions", "workflow", "matrix"], jobSkills: ["CI/CD"], status: "planned" },
      { season: 4, episode: 2, title: "装罐发货", summary: "build-push-action 自动装罐贴批次号发往中央仓(GHCR);仓库钥匙(Secrets)锁进环境保险柜,权限只够开自己那格。", chapterType: "lab", projectStage: "装罐自动化", technologies: ["build-push-action", "GHCR", "Secrets"], jobSkills: ["CI/CD"], status: "planned" },
      { season: 4, episode: 3, title: "无钥匙进仓", summary: "OIDC 免密发布:送货员不再揣长期钥匙(AK/SK),每次到仓门口刷脸领一张 10 分钟通行证——最安全的钥匙是不存在的钥匙。", chapterType: "comic", projectStage: "钥匙消失", technologies: ["OIDC", "短时凭证"], jobSkills: ["CI/CD", "安全"], status: "planned" },
      { season: 4, episode: 4, title: "并行传送带", summary: "Actions 2026 新语法:background/wait/parallel 开出多轨道,试喝与装罐同时跑;case 表达式当分拣口——流水线的尽头是不排队。", chapterType: "lab", projectStage: "多轨道同跑", technologies: ["parallel", "background", "case"], jobSkills: ["CI/CD"], status: "planned" },
      { season: 4, episode: 5, title: "一杯先尝", summary: "蓝绿 / 金丝雀 / 灰度:新配方先只给 5% 顾客的杯子里掺一口,差评率不涨再全城铺开;蓝绿双吧台一秒切换。", chapterType: "comic", projectStage: "5% 先尝", technologies: ["金丝雀", "蓝绿", "灰度"], jobSkills: ["CI/CD", "发布策略"], status: "planned" },
      { season: 4, episode: 6, title: "圣旨在 Git", summary: "GitOps:全城菜单以总部圣旨仓库(Git)为准,巡查鸟 Argo 把私改的价格当场改回(漂移纠正);Helm 模板 + Kustomize 贴片管各城口味。", chapterType: "project", projectStage: "连锁 v4 圣旨在 Git", technologies: ["Argo CD", "Helm", "Kustomize"], jobSkills: ["GitOps", "CI/CD"], status: "planned" },
    ],
  },
  {
    season: 5,
    code: "Y5",
    title: "千里眼与顺风耳",
    subtitle: "总部监控大屏点亮",
    goal: "可观测三支柱与运维收官:结构化日志、Prometheus、分布式追踪、OpenTelemetry、SLO 与 IaC——总部大屏点亮(v5),告警一年只响三次、三次都真有事。",
    covers: ["三支柱与结构化日志", "Prometheus", "分布式追踪", "OpenTelemetry", "SLO 与 IaC"],
    episodes: [
      { season: 5, episode: 1, title: "三件神器", summary: "log / metric / trace 三支柱 + 结构化日志:豆豆的日记从散文改成表格(JSON),从此能按单号检索——写给机器看的才叫日志。", chapterType: "comic", projectStage: "三件神器点亮", technologies: ["三支柱", "JSON 日志", "trace_id"], jobSkills: ["可观测性"], status: "planned" },
      { season: 5, episode: 2, title: "仪表盘方法论", summary: "Prometheus pull 模型与 PromQL,库舵教 RED 三问:多少单(Rate)、几单错(Errors)、等多久(Duration)——仪表盘说了才算。", chapterType: "lab", projectStage: "仪表盘会说话", technologies: ["Prometheus", "PromQL", "Grafana"], jobSkills: ["可观测性"], status: "planned" },
      { season: 5, episode: 3, title: "一杯咖啡的足迹", summary: "分布式追踪与上下文传播:订单穿过点单→磨豆→萃取→打奶四个档口各盖一个时间戳章(span),章上同印一个单号(traceparent),慢在打奶一目了然。", chapterType: "comic", projectStage: "足迹图上墙", technologies: ["trace", "span", "traceparent"], jobSkills: ["可观测性"], status: "planned" },
      { season: 5, episode: 4, title: "统一巡查协议", summary: "OpenTelemetry 落地:三信号全部 stable、CNCF 毕业;统一 OTLP 制式 + Collector 管道,Java 店员戴上智能工牌(agent)零改造自动上报。", chapterType: "lab", projectStage: "统一制服", technologies: ["OpenTelemetry", "OTLP", "Collector", "Java agent"], jobSkills: ["可观测性"], status: "planned" },
      { season: 5, episode: 5, title: "狼来了条约", summary: "SLO 错误预算条约:月度差评额度花超才叫醒人;终章彩蛋:阿零把「开一座城的店」写成声明文件(IaC),tofu 平地起连锁,每罐豆子附身份证(SBOM + 签名)。", chapterType: "project", projectStage: "大屏 v5 一年只响三次", technologies: ["SLO", "错误预算", "OpenTofu", "SBOM"], jobSkills: ["可观测性", "SRE"], status: "planned" },
    ],
  },
];

export function cloudAllEpisodes(): JavaEpisode[] {
  return CLOUD_SEASONS.flatMap((s) => s.episodes);
}

export function cloudPublishedEpisodes(): JavaEpisode[] {
  return cloudAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
