/**
 * 《从零开始玩命令行》· 终端大陆(第二部连载,slug 前缀 cli)。
 *
 * 与 Java 线同宇宙:S7 大结局咖啡站上云后,阿零第一次 ssh 进真实服务器,
 * 发现没有鼠标、没有图标 —— 只有一个闪烁的光标。新导师「特米」(Termi,
 * 住在终端里的企鹅机器人)登场,豆豆不定期客串。
 *
 * 长期项目:亲手把豆豆咖啡站部署到一台真实服务器 —— 每个指令都有真实用途。
 * 本线独有深度栏目:🪟 双系统对照(Linux 指令 ↔ PowerShell/cmd 等价写法)。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";
import { isPublicEpisode } from "@/lib/publication";

export const CLI_SERIES_META = {
  slug: "cli-academy",
  title: "从零开始玩命令行",
  alias: "阿零与特米 · 终端大陆",
  tagline: "没有鼠标、没有图标,只有一个闪烁的光标。跟着阿零和特米,把一台裸服务器驯服成豆豆咖啡站的家。",
  project: "把咖啡站部署上真实服务器",
  storageKey: "cli-academy:completed",
} as const;

export const CLI_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "C1",
    title: "终端点火篇",
    subtitle: "在黑屏里学会走路",
    goal: "认识 shell 与文件系统树,能在终端里自由走动、增删查看文件,并在危险指令面前活下来。",
    covers: ["shell 基础", "文件系统"],
    episodes: [
      { season: 1, episode: 1, title: "只有一个光标的世界", summary: "第一次 ssh 进真实服务器:shell 是什么,pwd / ls / cd 与文件系统树。", chapterType: "comic", projectStage: "能在服务器里走动", technologies: ["ssh", "pwd", "ls", "cd"], jobSkills: ["Linux 基础"], status: "published", slug: "2026-09-19-cli-s01e01-terminal" },
      { season: 1, episode: 2, title: "查看与创建", summary: "cat / less / head / tail 读文件,mkdir / touch 创建,echo 与 > 初见。", chapterType: "comic", projectStage: "能读能建", technologies: ["cat", "less", "mkdir", "touch"], jobSkills: ["Linux 基础"], status: "published", slug: "2026-09-20-cli-s01e02-view-create" },
      { season: 1, episode: 3, title: "复制、移动与致命的 rm", summary: "cp / mv / rm:一次没有回收站的删除事故,以及如何给自己留后路。", chapterType: "incident", projectStage: "会搬东西也会怕", technologies: ["cp", "mv", "rm"], jobSkills: ["Linux 基础"], status: "published", slug: "2026-09-21-cli-s01e03-cp-mv-rm" },
      { season: 1, episode: 4, title: "路径、通配与补全", summary: "绝对/相对路径、~ 与 -、* 通配符、Tab 补全与历史 —— 手速的秘密。", chapterType: "comic", projectStage: "走动如飞", technologies: ["路径", "通配符", "Tab"], jobSkills: ["Linux 基础"], status: "published", slug: "2026-09-22-cli-s01e04-path-glob" },
      { season: 1, episode: 5, title: "求助系统:man 一下", summary: "man / --help / tldr:特米的口头禅,授人以渔的一话。", chapterType: "reference", projectStage: "会自己查手册", technologies: ["man", "--help"], jobSkills: ["Linux 基础"], status: "published", slug: "2026-09-23-cli-s01e05-man-help" },
    ],
  },
  {
    season: 2,
    code: "C2",
    title: "文本与管道",
    subtitle: "Unix 的灵魂",
    goal: "掌握 grep / find 与管道重定向的组合心智模型 —— 小工具串成流水线,这是 Unix 哲学本体。",
    covers: ["文本处理", "管道哲学"],
    episodes: [
      { season: 2, episode: 1, title: "大海捞针:grep 与 find", summary: "按内容搜 grep,按名字搜 find,两把探照灯。", chapterType: "comic", projectStage: "找得到任何东西", technologies: ["grep", "find"], jobSkills: ["Linux 文本"], status: "published", slug: "2026-09-24-cli-s02e01-grep-find" },
      { season: 2, episode: 2, title: "管道:把小工具串成流水线", summary: "| 与 > >> 2>:输出接输入,重定向落文件 —— 本卷最重要的心智模型。", chapterType: "comic", projectStage: "会组合指令", technologies: ["管道", "重定向"], jobSkills: ["Linux 文本"], status: "published", slug: "2026-09-25-cli-s02e02-pipe" },
      { season: 2, episode: 3, title: "切与排:cut / sort / uniq / wc", summary: "流水线上的四个工位,统计咖啡站访问日志。", chapterType: "lab", projectStage: "能分析日志", technologies: ["cut", "sort", "uniq", "wc"], jobSkills: ["Linux 文本"], status: "published", slug: "2026-09-26-cli-s02e03-cut-sort" },
      { season: 2, episode: 4, title: "vim 生存指南", summary: "被困在 vim 里的第一夜::wq 逃生,与够用的 20% 操作。", chapterType: "comic", projectStage: "能改服务器配置", technologies: ["vim"], jobSkills: ["Linux 基础"], status: "published", slug: "2026-09-27-cli-s02e04-vim" },
      { season: 2, episode: 5, title: "打包与压缩:tar 的暗号", summary: "tar -czf / -xzf 一对暗号,zip/unzip 备胎,给咖啡站打第一个部署包。", chapterType: "lab", projectStage: "会打部署包", technologies: ["tar", "gzip"], jobSkills: ["Linux 基础"], status: "published", slug: "2026-09-28-cli-s02e05-tar" },
    ],
  },
  {
    season: 3,
    code: "C3",
    title: "Git 时间机(整卷)",
    subtitle: "从存档点到多人协作",
    goal: "把 Java 线一话带过的 Git 展开成整卷:从 commit 到 rebase,从单机到 GitHub 协作,吃透最常用的版本控制。",
    covers: ["Git", "GitHub 协作"],
    episodes: [
      { season: 3, episode: 1, title: "三个区与第一个存档点", summary: "工作区/暂存区/仓库,init / add / commit / log 的肌肉记忆。", chapterType: "comic", projectStage: "咖啡站代码有存档", technologies: ["git init", "add", "commit"], jobSkills: ["Git"], status: "published", slug: "2026-09-29-cli-s03e01-git-basics" },
      { season: 3, episode: 2, title: "平行时间线:branch 与 merge", summary: "开分支大胆试验,merge 汇流,以及第一次冲突。", chapterType: "comic", projectStage: "敢开分支了", technologies: ["branch", "merge", "冲突"], jobSkills: ["Git"], status: "published", slug: "2026-09-30-cli-s03e02-branch" },
      { season: 3, episode: 3, title: "后悔药三兄弟:reset / revert / checkout", summary: "改错了怎么回去:三种后悔药的适用场景与危险等级。", chapterType: "incident", projectStage: "改坏了能回退", technologies: ["reset", "revert"], jobSkills: ["Git"], status: "published", slug: "2026-10-01-cli-s03e03-undo" },
      { season: 3, episode: 4, title: "连接云端:remote / push / pull", summary: "GitHub 远程仓库、克隆与推拉,ssh key 配置。", chapterType: "lab", projectStage: "代码上 GitHub", technologies: ["remote", "push", "pull"], jobSkills: ["Git", "GitHub"], status: "published", slug: "2026-10-02-cli-s03e04-remote" },
      { season: 3, episode: 5, title: "rebase 与整洁历史", summary: "merge vs rebase 的取舍、交互式变基、公共分支铁律。", chapterType: "comic", projectStage: "历史干净可读", technologies: ["rebase"], jobSkills: ["Git"], status: "published", slug: "2026-10-03-cli-s03e05-rebase" },
      { season: 3, episode: 6, title: "stash、cherry-pick 与工作流", summary: "临时搁置、摘樱桃,以及团队协作的分支工作流。", chapterType: "project", projectStage: "Git 毕业", technologies: ["stash", "cherry-pick", "工作流"], jobSkills: ["Git"], status: "published", slug: "2026-10-04-cli-s03e06-stash-cherrypick" },
    ],
  },
  {
    season: 4,
    code: "C4",
    title: "进程与系统",
    subtitle: "服务器在想什么",
    goal: "看懂并驾驭一台运行中的服务器:进程、服务、日志、定时任务、用户与权限。",
    covers: ["进程", "systemd", "权限"],
    episodes: [
      { season: 4, episode: 1, title: "谁在跑:ps / top / kill", summary: "看进程、找吃 CPU 的元凶、优雅或强制结束它。", chapterType: "comic", projectStage: "能管进程", technologies: ["ps", "top", "kill"], jobSkills: ["Linux 运维"], status: "published", slug: "2026-10-05-cli-s04e01-ps-top-kill" },
      { season: 4, episode: 2, title: "权限九宫格:chmod / chown / sudo", summary: "rwx 九宫格、755 与 644、Permission denied 的一百种死法。", chapterType: "comic", projectStage: "看懂权限", technologies: ["chmod", "chown", "sudo"], jobSkills: ["Linux 运维"], status: "published", slug: "2026-10-06-cli-s04e02-chmod-sudo" },
      { season: 4, episode: 3, title: "常驻服务:systemctl 与日志", summary: "systemd 服务的启停自启,journalctl 翻日志破案。", chapterType: "lab", projectStage: "服务能常驻", technologies: ["systemctl", "journalctl"], jobSkills: ["Linux 运维"], status: "published", slug: "2026-10-07-cli-s04e03-systemctl-journal" },
      { season: 4, episode: 4, title: "定时任务与环境变量", summary: "cron 表达式、crontab 陷阱(环境变量不一样!)、export 与 PATH。", chapterType: "incident", projectStage: "会定时备份", technologies: ["cron", "PATH"], jobSkills: ["Linux 运维"], status: "published", slug: "2026-10-08-cli-s04e04-cron-env" },
      { season: 4, episode: 5, title: "远程与传输:ssh / scp / rsync", summary: "密钥登录、跳板、同步文件 —— 部署前最后一块拼图。", chapterType: "lab", projectStage: "远程自如", technologies: ["ssh", "scp", "rsync"], jobSkills: ["Linux 运维"], status: "published", slug: "2026-10-09-cli-s04e05-ssh-scp-rsync" },
    ],
  },
  {
    season: 5,
    code: "C5",
    title: "网络与部署",
    subtitle: "咖啡站的新家",
    goal: "网络排查三板斧 + nginx + Docker 指令,把豆豆咖啡站真正部署到这台服务器上 —— 与 Java 线大闭环。",
    covers: ["网络指令", "nginx", "Docker"],
    episodes: [
      { season: 5, episode: 1, title: "网络三板斧:ping / curl / ss", summary: "通不通、服务活没活、端口谁在听 —— 网络排查的起手式。", chapterType: "comic", projectStage: "会查网络", technologies: ["ping", "curl", "ss"], jobSkills: ["网络"], status: "published", slug: "2026-10-10-cli-s05e01-ping-curl-ss" },
      { season: 5, episode: 2, title: "门卫与转发:ufw 与 nginx", summary: "防火墙放行、nginx 反向代理与配置生效三连(-t / reload / 日志)。", chapterType: "lab", projectStage: "有门卫有前台", technologies: ["ufw", "nginx"], jobSkills: ["运维部署"], status: "published", slug: "2026-10-11-cli-s05e02-ufw-nginx" },
      { season: 5, episode: 3, title: "Docker 指令速成", summary: "run / ps / logs / exec / compose —— 集装箱的日常操作。", chapterType: "lab", projectStage: "会开集装箱", technologies: ["docker", "compose"], jobSkills: ["Docker"], status: "published", slug: "2026-10-12-cli-s05e03-docker-basics" },
      { season: 5, episode: 4, title: "上线日:把咖啡站搬进新家", summary: "整卷成果验收:git 拉代码、docker compose 起服务、nginx 反代、域名可访问 —— 大闭环。", chapterType: "project", projectStage: "咖啡站入住真实服务器", technologies: ["综合"], jobSkills: ["部署"], status: "published", slug: "2026-10-13-cli-s05e04-deploy-day" },
    ],
  },
];

export function cliAllEpisodes(): JavaEpisode[] {
  return CLI_SEASONS.flatMap((s) => s.episodes);
}

export function cliPublishedEpisodes(): JavaEpisode[] {
  return cliAllEpisodes().filter((e) => e.status === "published" && isPublicEpisode(e.slug));
}
