/**
 * 《从零开始通网络》· 快递之城(第三部连载,slug 前缀 net)。
 *
 * 与 Java/CLI 线同宇宙:豆豆咖啡站要上线「线上点单」小程序,第一天就遭遇
 * 三连击 —— 外卖员找不到店(DNS 炸了)、订单重复下了三杯(重传+非幂等)、
 * 隔壁桌能看到你点了啥(明文 HTTP)。阿零意识到:不懂网络,咖啡站永远走不出这条街。
 * 新导师「帕特」(Pat)登场:一只退役的 RFC 1149 载波信鸽,自称「活体数据报」,
 * 腿环刻着序列号,翅膀下夹着微型 Wireshark;每根羽毛是一层报文头(最外层以太网帧,
 * 往里 IP、TCP、TLS、HTTP,讲到哪层竖起哪根);说话必须收到对方 ACK(点头)才继续,
 * 超时就原话重传。口头禅:「先抓包,再开口。」副口头禅:「丢包不丢鸽,重传就是了。」
 *
 * 长期项目:点单小程序从 v0.1(能问路)一路建到 v1.0(全链路 H3+ECH 上线)——
 * 每个知识点都在博主真实链路(浏览器 → Cloudflare → nginx → 云服务器)上抓包验证。
 * 本线独有深度栏目:📡 真链路实验室(每话末尾一份可复制的 dig / curl -v / ss / 抓包命令)。
 * 联动钩子:豆豆客串「服务端视角」(它就是被三次握手的那台咖啡机);特米在话 05/29
 * 客串抓包;话 22 gRPC 桥段指向 Java 线微服务卷;完结后番外《阿零面试记 · 网络专场》。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const NET_SERIES_META = {
  slug: "net-academy",
  title: "从零开始通网络",
  alias: "阿零与帕特 · 快递之城",
  tagline: "跟着一只退役载波信鸽,从三次握手一路飞到 QUIC 与 ECH——每一话都在真实的 Cloudflare + nginx + 云服务器链路上抓包验证,拒绝纸上谈兵。",
  project: "给豆豆咖啡站上线「线上点单」小程序",
  storageKey: "net-academy:completed",
} as const;

export const NET_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "N1",
    title: "快递之城",
    subtitle: "网络地基",
    goal: "认识分层、寻址、NAT 与 UDP,拿到排障工具箱 —— 遇事先问「挂在第几层」,并第一次抓到自己网站的包。",
    covers: ["OSI / TCP-IP 分层", "IP 与 NAT", "UDP", "排障工具箱"],
    episodes: [
      { season: 1, episode: 1, title: "鸽子落在咖啡机上", summary: "OSI 七层 vs TCP/IP 四层:点单小程序上线即瘫,帕特把外卖流程拆成五层——先问「挂在第几层」。", chapterType: "comic", projectStage: "知道锅在哪一层", technologies: ["OSI", "TCP/IP", "分层模型"], jobSkills: ["网络基础"], status: "planned" },
      { season: 1, episode: 2, title: "门牌号的秘密", summary: "IP 地址 / 子网掩码 / CIDR:/24 就是「这条街 254 户」,阿零把咖啡站内网画成一张街区地图。", chapterType: "comic", projectStage: "画出内网街区图", technologies: ["IP", "子网掩码", "CIDR"], jobSkills: ["网络基础"], status: "planned" },
      { season: 1, episode: 3, title: "全城共用一个收发室", summary: "NAT 与私网地址:全店共用一个对外号码,前台记着分机映射表——外面永远打不进后厨。", chapterType: "comic", projectStage: "明白外网为何 ping 不进", technologies: ["NAT", "私网地址", "端口映射"], jobSkills: ["网络基础"], status: "planned" },
      { season: 1, episode: 4, title: "明信片派送员", summary: "UDP 无连接不保序不重传:发传单(DNS)用它极快,送咖啡(交易)用它必翻车。", chapterType: "comic", projectStage: "会挑信使了", technologies: ["UDP", "DNS", "QUIC"], jobSkills: ["网络基础"], status: "planned" },
      { season: 1, episode: 5, title: "工具间开箱", summary: "排障工具箱卷终开箱:ping 喊一嗓子、traceroute 沿路打卡、curl -v 逐字念快递单,阿零第一次抓到自己博客的包。", chapterType: "lab", projectStage: "小程序 v0.1:能问路能抓包", technologies: ["ping", "traceroute", "dig", "curl", "ss", "tcpdump"], jobSkills: ["网络排障"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "N2",
    title: "握手协议",
    subtitle: "TCP 深水区",
    goal: "吃透握手挥手、可靠传输与拥塞控制,再用一场端口耗尽事故收尾 —— 面试与生产双高频的一整卷。",
    covers: ["三次握手 / 四次挥手", "可靠传输", "拥塞控制", "TIME_WAIT 事故"],
    episodes: [
      { season: 2, episode: 1, title: "三次握手,一次都不能少", summary: "TCP 三次握手:客人喊单(SYN)→豆豆复述确认(SYN+ACK)→客人点头(ACK),少一步就做出幽灵咖啡。", chapterType: "comic", projectStage: "下单先建可靠连接", technologies: ["TCP", "SYN", "ACK"], jobSkills: ["网络", "面试八股"], status: "planned" },
      { season: 2, episode: 2, title: "优雅的告别要挥四次手", summary: "四次挥手与 TIME_WAIT:打烊不等于立刻关门,帕特在门口罚站 2MSL——「万一他折回来拿伞呢」。", chapterType: "comic", projectStage: "连接优雅退场", technologies: ["FIN", "TIME_WAIT", "2MSL"], jobSkills: ["网络", "面试八股"], status: "planned" },
      { season: 2, episode: 3, title: "编号、回执与重发", summary: "序号 / ACK / 超时重传 / 滑动窗口:帕特送百页手稿,每页编号、丢页只补丢的那页。", chapterType: "comic", projectStage: "订单不丢不重", technologies: ["序号", "ACK", "重传", "滑动窗口"], jobSkills: ["网络"], status: "planned" },
      { season: 2, episode: 4, title: "别把网络喂撑了", summary: "流量控制 vs 拥塞控制:rwnd 心疼对方、cwnd 心疼路上所有人,慢启动像新店试营业客流每天翻倍。", chapterType: "comic", projectStage: "高峰不压垮链路", technologies: ["rwnd", "cwnd", "慢启动", "快重传"], jobSkills: ["网络", "面试八股"], status: "planned" },
      { season: 2, episode: 5, title: "两位调度师的流派之争", summary: "CUBIC vs BBR:一个凭疼痛驾驶、一个凭地图驾驶,在跨境链路上实测对比、数字说话。", chapterType: "lab", projectStage: "跨境链路提速", technologies: ["CUBIC", "BBR"], jobSkills: ["网络", "性能调优"], status: "planned" },
      { season: 2, episode: 6, title: "端口耗尽之夜", summary: "大促夜 TIME_WAIT「罚站幽灵」占光桌号,Nagle 与延迟 ACK 两个节俭店员互等 40ms——端口耗尽事故复盘。", chapterType: "incident", projectStage: "小程序 v0.5:能可靠下单", technologies: ["TIME_WAIT", "Nagle", "延迟 ACK", "backlog"], jobSkills: ["网络排障"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "N3",
    title: "寻址之翼",
    subtitle: "DNS 全城问路",
    goal: "从逐级问路到 Anycast:搞懂域名解析、TTL 缓存与现代加密 DNS,让咖啡站搬家换址不再有人扑空。",
    covers: ["DNS 解析流程", "TTL 与缓存", "DoH / GeoDNS", "Anycast / BGP"],
    episodes: [
      { season: 3, episode: 1, title: "全城问路指南", summary: "DNS 解析全流程:问自己笔记(缓存)→问街道办(递归)→根/顶级/权威三连问,A/CNAME/MX 是问路的不同问法。", chapterType: "comic", projectStage: "外卖员找得到店", technologies: ["DNS", "A/AAAA", "CNAME", "权威服务器"], jobSkills: ["DNS"], status: "planned" },
      { season: 3, episode: 2, title: "迟到的新地址", summary: "TTL 与缓存层级:咖啡站搬家,老客照着旧名片扑空——搬家前先把名片保质期(TTL)调小。", chapterType: "incident", projectStage: "搬家不丢客", technologies: ["TTL", "DNS 缓存"], jobSkills: ["DNS", "运维部署"], status: "planned" },
      { season: 3, episode: 3, title: "加密的问路声", summary: "DoH/DoT 与 GeoDNS:把问路写进密封信,别在广场上大喊要去哪;同一店名,北京客人被指去北京分店。", chapterType: "comic", projectStage: "问路不再裸奔", technologies: ["DoH", "DoT", "EDNS", "GeoDNS"], jobSkills: ["DNS"], status: "planned" },
      { season: 3, episode: 4, title: "一个门牌,遍布全球", summary: "Anycast 与 BGP:1.1.1.1 是「全球连锁共用一个门牌」——不是它跑得快,是它到处都在。", chapterType: "comic", projectStage: "小程序 v0.6:换址不扑空", technologies: ["Anycast", "BGP"], jobSkills: ["DNS", "网络"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "N4",
    title: "协议进化史",
    subtitle: "HTTP 一路到 H3",
    goal: "沿着 HTTP/1.1 → 缓存 → H2 → H3/QUIC 的进化线,理解每一代都在解决上一代的排队问题,最后落到 2026 双栈现状。",
    covers: ["HTTP/1.1", "HTTP 缓存", "HTTP/2", "HTTP/3 与 QUIC"],
    episodes: [
      { season: 4, episode: 1, title: "一问一答的老规矩", summary: "HTTP/1.1 方法 / 状态码 / 头:GET 看菜单、POST 下新单,状态码墙上 404 缺货、503 后厨罢工。", chapterType: "comic", projectStage: "点单窗口开张", technologies: ["HTTP/1.1", "方法语义", "状态码"], jobSkills: ["HTTP"], status: "planned" },
      { season: 4, episode: 2, title: "排队排到天荒地老", summary: "keep-alive 与队头阻塞:一个窗口一次只服务一单,浏览器开 6 个窗口硬抗——雪碧图都是替排队谢罪的求生技巧。", chapterType: "comic", projectStage: "看清排队瓶颈", technologies: ["keep-alive", "队头阻塞", "6 连接限制"], jobSkills: ["HTTP"], status: "planned" },
      { season: 4, episode: 3, title: "新鲜度管理学", summary: "强缓存与协商缓存:保质期内直接卖(Cache-Control),过期先问配方变没变(ETag/304)——最快的请求是没发出去的那个。", chapterType: "comic", projectStage: "菜单秒开", technologies: ["Cache-Control", "ETag", "304"], jobSkills: ["HTTP", "性能调优"], status: "planned" },
      { season: 4, episode: 4, title: "一条路,许多车道", summary: "HTTP/2 分帧 / 多路复用 / HPACK:订单切块混流、各带流号重组;热情店员 Push 强塞赠品,被 Chrome 请出场。", chapterType: "comic", projectStage: "单连接跑满", technologies: ["HTTP/2", "多路复用", "HPACK"], jobSkills: ["HTTP"], status: "planned" },
      { season: 4, episode: 5, title: "拆掉传输层重来", summary: "HTTP/3 与 QUIC:每单独立真空管道,阿零从店内 WiFi 走到街上切 5G 通话不断——TCP 认地址,QUIC 认你。", chapterType: "comic", projectStage: "换网不断线", technologies: ["HTTP/3", "QUIC", "连接 ID"], jobSkills: ["HTTP", "网络"], status: "planned" },
      { season: 4, episode: 6, title: "管道里的小字条", summary: "QUIC 流控 / QPACK / 0-RTT:老客进门喊「老样子」极快,但坏人录音重放也能刷单——0-RTT 只准带幂等请求。", chapterType: "comic", projectStage: "快而不被重放", technologies: ["QUIC 流控", "QPACK", "0-RTT"], jobSkills: ["HTTP", "安全"], status: "planned" },
      { season: 4, episode: 7, title: "双栈时代", summary: "2026 现状卷终:边缘 H3 近全覆盖、裸源站仅 2.3%,博主站=前门 H3 后厨 H1.1;gRPC 客串「后厨内部对讲机」。", chapterType: "project", projectStage: "小程序 v0.8:前门换上 H3", technologies: ["H2/H3 双栈", "Early Hints", "gRPC"], jobSkills: ["HTTP", "架构"], status: "planned" },
    ],
  },
  {
    season: 5,
    code: "N5",
    title: "加密航线",
    subtitle: "TLS 与信任链",
    goal: "从一封挂号信讲透 TLS 1.3:密钥交换、证书信任链与自动续期,再补上 ECH、mTLS 与后量子这三块 2026 拼图。",
    covers: ["加密原理", "TLS 1.3 握手", "证书与 ACME", "ECH / mTLS / 后量子"],
    episodes: [
      { season: 5, episode: 1, title: "明信片改挂号信", summary: "对称 / 非对称加密与前向保密:ECDHE 每天现配一把「阅后即焚」的钥匙,私钥泄露也解不开历史流量。", chapterType: "comic", projectStage: "隔壁桌看不到点单", technologies: ["对称加密", "非对称加密", "ECDHE", "前向保密"], jobSkills: ["HTTPS/TLS"], status: "planned" },
      { season: 5, episode: 2, title: "一趟就把暗号对齐", summary: "TLS 1.3 握手:1-RTT 直接押注暗号套件、钥匙材料先带来,比 1.2 少一个来回,顺手清空老式锁具仓库。", chapterType: "comic", projectStage: "握手快人一步", technologies: ["TLS 1.3", "1-RTT", "0-RTT"], jobSkills: ["HTTPS/TLS", "面试八股"], status: "planned" },
      { season: 5, episode: 3, title: "谁来担保你是你", summary: "证书链 / CA / ACME:居委会盖章、市政厅背书,Let's Encrypt 90 天一续——帕特实操 certbot 定时任务。", chapterType: "lab", projectStage: "证书自动续期", technologies: ["证书链", "CA", "SNI", "ACME", "certbot"], jobSkills: ["HTTPS/TLS", "运维部署"], status: "planned" },
      { season: 5, episode: 4, title: "最后一句明文", summary: "SNI 泄露与 ECH:信封上最后一行明文店名,RFC 9849(2026-03 定稿)终于把它也装进信封——CF 边缘白捡的隐私升级。", chapterType: "comic", projectStage: "店名也进信封", technologies: ["SNI", "ECH", "RFC 9849"], jobSkills: ["HTTPS/TLS"], status: "planned" },
      { season: 5, episode: 5, title: "双向验明正身", summary: "mTLS / 零信任 / 后量子卷终:连自己人也请出示证件;量子怪兽先偷录后破解,X25519+ML-KEM 两把锁得都砸开。", chapterType: "comic", projectStage: "小程序 v0.9:全程加密", technologies: ["mTLS", "零信任", "X25519+ML-KEM"], jobSkills: ["HTTPS/TLS", "安全"], status: "planned" },
    ],
  },
  {
    season: 6,
    code: "N6",
    title: "边缘之城",
    subtitle: "CDN · 实战 · 前沿",
    goal: "把咖啡站真正推到边缘:实时推送、反向代理与 CDN、Tunnel 与容器网络,最后用 eBPF 透视全站,小程序 v1.0 全链路上线。",
    covers: ["WebSocket / SSE", "反向代理与 CDN", "Tunnel 与容器网络", "eBPF 与前沿"],
    episodes: [
      { season: 6, episode: 1, title: "常驻热线", summary: "轮询 / SSE / WebSocket 选型:喊「好了吗」、广播喇叭、专线对讲机各就各位——别用对讲机干喇叭的活。", chapterType: "comic", projectStage: "订单状态实时推送", technologies: ["WebSocket", "SSE", "心跳保活"], jobSkills: ["网络", "实时通信"], status: "planned" },
      { season: 6, episode: 2, title: "门口的分诊台", summary: "反向代理与 nginx 缓存陷阱:前台把带客人姓名的小票当传单群发——Monitor 登录串号 bug 真实还原。", chapterType: "incident", projectStage: "前台不再发错房卡", technologies: ["nginx", "upstream", "proxy_cache", "Set-Cookie"], jobSkills: ["运维部署", "网络排障"], status: "planned" },
      { season: 6, episode: 3, title: "把豆子预存到每个街角", summary: "CDN 回源与缓存键:街角小亭预存熟豆、没货才回总店,缓存键按「品名+杯型」存、别把客人姓名算进去。", chapterType: "comic", projectStage: "街角都有热豆子", technologies: ["CDN", "回源", "缓存键", "s-maxage"], jobSkills: ["CDN", "性能调优"], status: "planned" },
      { season: 6, episode: 4, title: "不开门也能营业", summary: "Cloudflare Tunnel 与容器网络:后厨一扇门都不开,伙计主动拉一条外卖专线到边缘;Docker bridge 是后厨内线电话。", chapterType: "lab", projectStage: "源站零暴露", technologies: ["Cloudflare Tunnel", "Docker 网络", "iptables"], jobSkills: ["运维部署", "Docker"], status: "planned" },
      { season: 6, episode: 5, title: "帕特的下一程", summary: "大结局:eBPF 透视眼镜看清每条连接,MASQUE / WebTransport 与 Java QUIC 现状巡礼——帕特把 Wireshark 传给阿零。", chapterType: "project", projectStage: "小程序 v1.0:全链路上线", technologies: ["eBPF", "MASQUE", "WebTransport", "综合"], jobSkills: ["可观测性", "架构"], status: "planned" },
    ],
  },
];

export function netAllEpisodes(): JavaEpisode[] {
  return NET_SEASONS.flatMap((s) => s.episodes);
}

export function netPublishedEpisodes(): JavaEpisode[] {
  return netAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
