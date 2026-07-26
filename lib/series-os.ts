/**
 * 《从零开始拆内核》· 内核地下世界(第三部连载,slug 前缀 os)。
 *
 * 与 Java / CLI 线同宇宙:点单系统 v7 用户暴涨,阿零把服务迁进自建机房,
 * 第一次发现代码之下还有一整个地下世界 —— CPU、内存、磁盘、网卡的调度分配,
 * 全由一位从不露面的"地下管理员"打理。一楼是用户态(特米的地盘,shell 是
 * 通往地下的对讲机),地下室是内核态。新导师「摩尔」(Mole,戴矿工头灯的老鼹鼠,
 * 腰间钥匙圈每把钥匙是一个系统调用)登场,口头禅:"别猜——strace 一下!";
 * 摩尔与特米是隔着 syscall 地板斗嘴多年的老相识,CLI 线特米不定期客串。
 *
 * 主题:把操作系统拆成咖啡站的水电煤地下管网 —— 每一杯咖啡(每一次请求)
 * 背后都有一根看不见的管子在响;Java 线教"怎么写",CLI 线教"怎么敲",
 * OS 线教"怎么看穿"。
 * 本线独有深度栏目:🩺 内核听诊器(每话结尾一条可当场复现的观测命令,
 * strace/perf/bpftrace//proc,附"你会看到什么 + 每个字段说明什么")。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const OS_SERIES_META = {
  slug: "os-academy",
  title: "从零开始拆内核",
  alias: "阿零与摩尔 · 内核地下世界",
  tagline: "你看得见的每一杯咖啡,背后都有一整层看不见的地下管网。跟着阿零和鼹鼠摩尔下到地下室,亲手摸一摸操作系统的水电煤管道。",
  project: "拆开咖啡站脚下的内核地下管网",
  storageKey: "os-academy:completed",
} as const;

export const OS_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "O1",
    title: "地下室的钥匙圈",
    subtitle: "进程与调度",
    goal: "撬开用户态的地板,看清系统调用、进程创建、状态机与 CPU 调度 —— 理解'一个程序在跑'背后内核做了什么。",
    covers: ["系统调用", "进程与线程", "CPU 调度"],
    episodes: [
      { season: 1, episode: 1, title: "地板下有人", summary: "用户态/内核态与系统调用:点单系统卡死,阿零顺着 strace 的脚印第一次撬开地板,发现每次读文件都要按地下室的门铃排队。", chapterType: "comic", projectStage: "第一次看见 syscall", technologies: ["用户态/内核态", "syscall", "strace"], jobSkills: ["OS 基础"], status: "planned" },
      { season: 1, episode: 2, title: "一分为二的影分身", summary: "fork/exec/wait 进程创建模型:复印机吐出一个一模一样的阿零,exec 一喷漆就变成别人,wait 是父母在门口等孩子放学。", chapterType: "comic", projectStage: "看懂进程的诞生", technologies: ["fork", "exec", "wait"], jobSkills: ["OS 基础"], status: "planned" },
      { season: 1, episode: 3, title: "僵尸不可怕,没人收尸才可怕", summary: "进程状态机 R/S/D/Z 与僵尸/孤儿:地下堆满 defunct 幽灵(死了但工牌没注销),孤儿被 1 号老爷爷收养,D 状态是潜水中勿扰。", chapterType: "incident", projectStage: "能给僵尸验尸", technologies: ["进程状态", "zombie", "ps"], jobSkills: ["OS 基础", "排障"], status: "planned" },
      { season: 1, episode: 4, title: "千手咖啡师", summary: "线程与 pthread、Java 平台线程 1:1 内核线程:一个进程长出多只手共用一个钱包,阿零开一万只手结果全在互相递杯子没人做咖啡。", chapterType: "comic", projectStage: "明白线程池的上限", technologies: ["pthread", "clone", "线程"], jobSkills: ["OS 基础", "并发"], status: "planned" },
      { season: 1, episode: 5, title: "排班表之战", summary: "CPU 调度 CFS→EEVDF 与 nice:摩尔的排班板从'记账平分工时'换成'谁最亏欠谁先上',nice 值高的员工总礼让。", chapterType: "comic", projectStage: "看懂谁先上 CPU", technologies: ["CFS", "EEVDF", "nice"], jobSkills: ["OS 基础", "性能调优"], status: "planned" },
      { season: 1, episode: 6, title: "换人的代价", summary: "上下文切换成本与 IPC 总览:换班要交接钱包钥匙记忆(寄存器/页表/缓存),部门传消息选传纸条(pipe)还是共用白板(shm)。", chapterType: "project", projectStage: "咖啡站基础设施 v1:进程账本清晰", technologies: ["上下文切换", "pipe", "共享内存", "Unix socket"], jobSkills: ["OS 基础"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "O2",
    title: "记忆的魔术",
    subtitle: "内存管理与虚拟内存",
    goal: "看穿虚拟内存的幻觉:地址翻译、缺页、写时复制、mmap 与 OOM Killer —— 理解 Java 进程 VIRT 为什么那么大、为什么会莫名消失。",
    covers: ["虚拟内存", "页表与缺页", "OOM 与内存分配器"],
    episodes: [
      { season: 2, episode: 1, title: "每人一栋幻觉大楼", summary: "虚拟地址空间布局:每个进程都以为独占整栋大楼,其实是摩尔发的 VR 眼镜,pmap 一照,大楼分层代码/堆/栈/mmap 区。", chapterType: "comic", projectStage: "看懂 pmap 输出", technologies: ["虚拟地址空间", "pmap"], jobSkills: ["内存管理"], status: "planned" },
      { season: 2, episode: 2, title: "地址翻译官", summary: "页表、MMU 与 TLB:MMU 是戴四层老花镜的翻译官(四级页表),TLB 是手边小抄,小抄失效就得重新翻字典。", chapterType: "comic", projectStage: "明白地址翻译的成本", technologies: ["页表", "MMU", "TLB"], jobSkills: ["内存管理"], status: "planned" },
      { season: 2, episode: 3, title: "空头支票与先斩后奏", summary: "缺页中断与按需分页:malloc 拿到的是支票不是现金,真去花钱才触发银行兑付,摩尔管这叫过度承诺 overcommit。", chapterType: "comic", projectStage: "看懂缺页统计", technologies: ["缺页中断", "demand paging", "overcommit"], jobSkills: ["内存管理"], status: "planned" },
      { season: 2, episode: 4, title: "分家分得最慢的双胞胎", summary: "写时复制 COW 与 Redis bgsave:fork 出的双胞胎共用全部家当,谁先动哪件才复制哪件,写流量一大家当哗哗复制。", chapterType: "comic", projectStage: "看懂 Redis 快照原理", technologies: ["COW", "fork", "Redis bgsave"], jobSkills: ["内存管理", "Redis"], status: "planned" },
      { season: 2, episode: 5, title: "把文件穿在身上", summary: "mmap 内存映射:摩尔把整个账本文件'纹'进阿零的地址空间,翻身就是翻页,Kafka 索引与 MappedByteBuffer 就这么穿的。", chapterType: "comic", projectStage: "会用内存读文件", technologies: ["mmap", "MappedByteBuffer"], jobSkills: ["内存管理", "IO"], status: "planned" },
      { season: 2, episode: 6, title: "深夜杀手 OOM", summary: "swap、OOM Killer 与 RSS/VIRT 之辨:冷员工先被请去地下仓库,还不够就由蒙面杀手按罪恶分数行刑,Java 进程一夜消失,dmesg 验尸。", chapterType: "incident", projectStage: "会给消失的进程验尸", technologies: ["swap", "OOM Killer", "oom_score", "dmesg"], jobSkills: ["内存管理", "排障"], status: "planned" },
      { season: 2, episode: 7, title: "仓库管理学", summary: "buddy/slab 与 ptmalloc/jemalloc、NUMA 与大页:对半切的伙伴货架加同规格零件盒,跨车间取货慢一倍,2MB 大箱子省小抄。", chapterType: "project", projectStage: "咖啡站基础设施 v2:内存账本清晰", technologies: ["buddy", "slab", "jemalloc", "NUMA", "HugePages"], jobSkills: ["内存管理", "性能调优"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "O3",
    title: "文件之国",
    subtitle: "文件系统",
    goal: "从文件描述符到磁盘 IO 栈走通一滴写请求的全程:fd、inode、VFS、page cache 与日志文件系统 —— 搞清'写完了'和'落盘了'的距离。",
    covers: ["文件描述符", "inode 与 VFS", "page cache 与 IO 栈"],
    episodes: [
      { season: 3, episode: 1, title: "号码牌的世界", summary: "文件描述符与'一切皆文件':进程手里只有号码牌 0/1/2,牌子背后可能是文件、管道、socket,2>&1 就是把两块牌子指向同一扇窗。", chapterType: "comic", projectStage: "看懂 fd 与重定向", technologies: ["文件描述符", "重定向", "lsof"], jobSkills: ["文件系统"], status: "planned" },
      { season: 3, episode: 2, title: "名字只是艺名", summary: "inode、目录项与硬/软链接:文件本体是保险柜,文件名是柜门上贴的艺名,硬链接是同柜配两把钥匙,软链接是'钥匙在隔壁'的纸条。", chapterType: "comic", projectStage: "会查 inode 耗尽", technologies: ["inode", "硬链接", "软链接"], jobSkills: ["文件系统"], status: "planned" },
      { season: 3, episode: 3, title: "万国插座", summary: "VFS 与挂载、overlayfs:万国转换插头让 ext4/NFS/tmpfs 插上都长一个样,容器镜像是一摞透明胶片叠出来的画。", chapterType: "comic", projectStage: "看懂 mount 与镜像分层", technologies: ["VFS", "mount", "overlayfs"], jobSkills: ["文件系统", "容器"], status: "planned" },
      { season: 3, episode: 4, title: "你以为写进磁盘了", summary: "page cache 与 fsync/O_DIRECT:阿零'保存成功'后拔电数据没了,原来交给的是前台小妹,fsync 是逼她立刻跑金库的军令。", chapterType: "incident", projectStage: "知道数据何时真正落盘", technologies: ["page cache", "fsync", "O_DIRECT"], jobSkills: ["文件系统", "数据库"], status: "planned" },
      { season: 3, episode: 5, title: "先记账,再干活", summary: "ext4 journal 与 Btrfs/ZFS CoW:装修前先在日记本写计划,断电重来照日记补作业;CoW 一派从不改原件,永远写新页再换目录。", chapterType: "comic", projectStage: "选得对文件系统", technologies: ["ext4", "journal", "Btrfs", "ZFS"], jobSkills: ["文件系统"], status: "planned" },
      { season: 3, episode: 6, title: "下水道巡礼", summary: "磁盘 IO 栈与调度器:一滴写请求从 page cache 流过块层、排队闸直达 NVMe 泵房,SSD 时代排队闸干脆常开(none),iostat 读 await/util。", chapterType: "project", projectStage: "咖啡站基础设施 v3:IO 管道透明", technologies: ["块层", "mq-deadline", "NVMe", "iostat"], jobSkills: ["文件系统", "性能调优"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "O4",
    title: "一个人伺候一万桌",
    subtitle: "IO 模型",
    goal: "从 C10K 到 io_uring 走完 IO 模型进化史:阻塞、select/poll、epoll、Reactor、零拷贝 —— 理解 Netty 和 Nginx 存在的理由。",
    covers: ["C10K", "epoll 与 Reactor", "零拷贝与 io_uring"],
    episodes: [
      { season: 4, episode: 1, title: "一万张桌子的难题", summary: "阻塞/非阻塞 IO 与 C10K:一个服务员死守一桌等客人开口,一万桌就雇一万人?工资(内存)和换班(切换)先压垮咖啡站。", chapterType: "comic", projectStage: "理解 C10K 困境", technologies: ["阻塞 IO", "非阻塞 IO", "C10K"], jobSkills: ["IO 模型"], status: "planned" },
      { season: 4, episode: 2, title: "逐桌巡查的班长", summary: "select/poll:班长拿名单每次挨桌问'你要点单吗'(O(n) 轮询),名单还限 1024 桌,摩尔冷笑这是上个时代的答案。", chapterType: "comic", projectStage: "看懂轮询的代价", technologies: ["select", "poll"], jobSkills: ["IO 模型"], status: "planned" },
      { season: 4, episode: 3, title: "前台呼叫器革命", summary: "epoll 与 LT/ET:每桌装呼叫器谁按谁上(事件驱动),LT 没处理完一直响,ET 只响一声、菜必须一次上完(读干净)。", chapterType: "comic", projectStage: "看懂事件驱动", technologies: ["epoll", "LT/ET"], jobSkills: ["IO 模型", "八股"], status: "planned" },
      { season: 4, episode: 4, title: "呼叫器背后的指挥部", summary: "Reactor 模式与 Java NIO/Netty:一个接待员(主 Reactor)只管迎客,分给多个楼层管家(从 Reactor),EventLoop 原来就是这套排班。", chapterType: "comic", projectStage: "看穿 Netty 骨架", technologies: ["Reactor", "Java NIO", "Netty"], jobSkills: ["IO 模型", "Netty"], status: "planned" },
      { season: 4, episode: 5, title: "咖啡不过手", summary: "零拷贝 sendfile/splice:传统上菜后厨到客人搬四次,sendfile 直接修一条从后厨到餐桌的滑轨,Kafka 吞吐神话的一半来自它。", chapterType: "comic", projectStage: "看懂 Kafka 吞吐来源", technologies: ["sendfile", "splice", "零拷贝"], jobSkills: ["IO 模型", "性能调优"], status: "planned" },
      { season: 4, episode: 6, title: "双环传送带", summary: "io_uring 与 BPF 过滤前沿:点单环+出餐环两条传送带下单不用按铃,保安(容器 seccomp)默认封了它——直到 7.0 的 BPF 白名单发牌。", chapterType: "project", projectStage: "咖啡站基础设施 v4:IO 模型现代化", technologies: ["io_uring", "SQ/CQ", "BPF 过滤"], jobSkills: ["IO 模型", "前沿"], status: "planned" },
    ],
  },
  {
    season: 5,
    code: "O5",
    title: "门铃、门禁与大管家",
    subtitle: "信号 · 权限 · systemd",
    goal: "掌握进程世界的门铃(信号)、门禁(权限)与大管家(systemd):优雅停机、最小权限、把服务托付给 1 号老爷爷。",
    covers: ["信号机制", "权限与 capabilities", "systemd"],
    episodes: [
      { season: 5, episode: 1, title: "十五号门铃与九号闸刀", summary: "信号机制与 SIGTERM/SIGKILL:SIGTERM 是敲门'请收拾一下再走',SIGKILL 是直接拉闸遗言都不留,阿零被罚抄优雅停机一百遍。", chapterType: "comic", projectStage: "戒掉 kill -9", technologies: ["signal", "SIGTERM", "SIGKILL", "trap"], jobSkills: ["信号", "运维"], status: "planned" },
      { season: 5, episode: 2, title: "病危通知的妙用", summary: "多线程信号与 JVM 妙用:JVM 天天故意'触电'(SIGSEGV)再自我抢救,空指针检查竟是内核代发的病危通知,Spring Boot 优雅停机全链路走一遍。", chapterType: "comic", projectStage: "咖啡站会优雅停机", technologies: ["SIGSEGV", "safepoint", "graceful shutdown"], jobSkills: ["信号", "JVM"], status: "planned" },
      { season: 5, episode: 3, title: "三把锁与一枚金印", summary: "uid/gid、rwx、sudo 与 capabilities:每扇门三排锁,sudo 是借摩尔的万能金印一盖全开,capabilities 把金印拆成 41 枚小印章要哪枚借哪枚。", chapterType: "comic", projectStage: "服务按最小权限跑", technologies: ["uid/gid", "rwx", "sudo", "capabilities"], jobSkills: ["权限", "安全"], status: "planned" },
      { season: 5, episode: 4, title: "一号老爷爷", summary: "systemd unit/service/target 与 journalctl:收养所有孤儿的 1 号老爷爷胸前挂满 unit 卡片,阿零把点单系统写成 .service,崩了自动扶起。", chapterType: "lab", projectStage: "点单系统成为 service", technologies: ["systemd", "unit", "journalctl"], jobSkills: ["systemd", "运维"], status: "planned" },
      { season: 5, episode: 5, title: "老爷爷的百宝箱", summary: "systemd timer、socket activation 与 MemoryMax:timer 替掉 cron 的老怀表,客人先按铃店员才上班,每个服务戴上紧箍,v261 都会装系统了。", chapterType: "project", projectStage: "咖啡站基础设施 v5:服务全面托管", technologies: ["timer", "socket activation", "MemoryMax", "systemd v261"], jobSkills: ["systemd", "运维"], status: "planned" },
    ],
  },
  {
    season: 6,
    code: "O6",
    title: "头灯照进黑暗",
    subtitle: "性能观测",
    goal: "接过摩尔的矿工头灯:从仪表盘到 strace、perf 火焰图、eBPF 针灸 —— 让任何'卡住不吭声'的程序当场交代口供。",
    covers: ["观测三板斧", "strace 与 perf", "eBPF 与容器"],
    episodes: [
      { season: 6, episode: 1, title: "仪表盘扫盲夜", summary: "top/free/vmstat 与 load average:load 是排队人数不是忙碌度,free 的 available 才是真余粮,%wa 高是 CPU 在等磁盘发呆。", chapterType: "reference", projectStage: "看懂指挥室仪表墙", technologies: ["top", "free", "vmstat", "load average"], jobSkills: ["性能观测"], status: "planned" },
      { season: 6, episode: 2, title: "跟踪狂摩尔", summary: "strace/ltrace 实战:点单系统卡住不吭声,摩尔头灯一开,strace 显示它 8 万次重复 open 同一个配置文件,热路径没缓存当场人赃并获。", chapterType: "incident", projectStage: "第一次独立破案", technologies: ["strace", "ltrace"], jobSkills: ["性能观测", "排障"], status: "planned" },
      { season: 6, episode: 3, title: "火焰山寻宝", summary: "perf 与火焰图:每毫秒给全员拍快照叠成火焰山,最宽的山头住着吃 CPU 的罪犯,Java 栈加 native 栈拼图,凶手竟在 JNI 里。", chapterType: "lab", projectStage: "会画火焰图定位热点", technologies: ["perf", "火焰图", "async-profiler"], jobSkills: ["性能观测", "JVM"], status: "planned" },
      { season: 6, episode: 4, title: "给内核扎针灸", summary: "eBPF/bpftrace 与 sched_ext 前瞻:不开刀(不重启不改码)往内核任意穴位扎探针,延迟分布当场浮现;彩蛋:年轻鼹鼠用 eBPF 自己写调度器。", chapterType: "project", projectStage: "咖啡站基础设施 v6:全面可观测", technologies: ["eBPF", "bpftrace", "sched_ext"], jobSkills: ["性能观测", "前沿"], status: "planned" },
      { season: 6, episode: 5, title: "番外 · 楼中楼的秘密", summary: "namespace + cgroup v2 + overlayfs = 容器:摩尔在大楼里隔出楼中楼,住户以为独占天下、水电限量供应,老 JVM 隔窗看错整栋楼内存当场 OOM。", chapterType: "comic", projectStage: "看穿 Docker 本质", technologies: ["namespace", "cgroup v2", "overlayfs", "UseContainerSupport"], jobSkills: ["容器", "JVM"], status: "planned" },
    ],
  },
  {
    season: 7,
    code: "O7",
    title: "把线程抢回来",
    subtitle: "并发底座与未来",
    goal: "下到并发的最底层再抬头看未来:futex、内存屏障、伪共享,以及虚拟线程如何把'线程'从内核抢回用户态 —— 与 Java 线大闭环。",
    covers: ["futex 与内存屏障", "虚拟线程", "Linux 7.x 展望"],
    episodes: [
      { season: 7, episode: 1, title: "等锁的最高境界是不惊动地下", summary: "futex、内存屏障与伪共享:抢锁先在地面自己转三圈,真抢不到才下楼登记睡觉;两员工工位太近共用一张桌,互相干扰效率减半。", chapterType: "comic", projectStage: "看穿 synchronized 底层", technologies: ["futex", "内存屏障", "缓存行", "false sharing"], jobSkills: ["并发", "八股"], status: "planned" },
      { season: 7, episode: 2, title: "百万服务员与新纪元", summary: "大结局:虚拟线程百万服务员轻若便签,等餐时把工位让给别人,却因一句 synchronized 把工位焊死全场瘫痪;终幕摩尔带阿零登顶看内核 7.x 与 Rust 新管道的日出。", chapterType: "project", projectStage: "咖啡站基础设施 v7:现代咖啡站大闭环", technologies: ["虚拟线程", "Loom", "pin", "Linux 7.x", "Rust for Linux"], jobSkills: ["并发", "前沿"], status: "planned" },
    ],
  },
];

export function osAllEpisodes(): JavaEpisode[] {
  return OS_SEASONS.flatMap((s) => s.episodes);
}

export function osPublishedEpisodes(): JavaEpisode[] {
  return osAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
