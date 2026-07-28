/**
 * 《从零开始精通 Git》· 版本控制深潜(进阶连载,slug 前缀 gitadv)。
 *
 * 与咖啡站宇宙同线:CLI 线 C3「Git 卷」教会阿零会用 add/commit/push,可当咖啡站
 * 招进第二个、第三个工程师,分支缠成一团、history 被 force push 抹平、密钥误提交进仓库——
 * "会用"撑不住"多人"。阿零一头扎进仓库最深处的 .git 目录,在墨囊般的暗室里遇见老住户
 * 章鱼「墨叔」(Mo):八条腕各缠一条分支,能同时推进多个上下文互不打架;喷出的墨就是版本
 * 历史,想改哪段就把那段墨迹重新吸回去再吐一遍(负责任地重写历史)。腕尖能同时贴八张
 * 便利贴(引用),盯着哪条腕,HEAD 就在哪。口头禅「提交是快照,不是补丁。」
 * 副口头禅「历史是可以被负责任地重写的。」
 *
 * 联动钩子:CLI 线特米(企鹅)从通风管递 man page 与管道技巧,墨叔回敬"man 一下?这事
 * git help 里也写着";JVM 线焰焰客串"版本残影"梗,墨叔的墨迹回放对标焰焰的《JEP 编年史》;
 * 长期项目"多人协作的咖啡站仓库"直接续 CLI 线 C3 的单机仓库。定位:CLI 线讲了 Git 基本
 * 操作,这条线讲原理与团队协作——从会用到讲透。
 * 本线独有深度栏目:🕸️ 对象图台(每个操作画成 commit/tree/blob 的 DAG 变化)
 * + 🔧 底层拆解(用 plumbing 命令还原一次 porcelain 操作,"上层一条命令,底层几步搬墨")。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const GITADV_SERIES_META = {
  slug: "gitadv-academy",
  title: "从零开始精通 Git",
  alias: "阿零与墨叔 · 版本控制深潜",
  tagline: "CLI 线 C3 教你会用 Git,这一部带你潜进 .git 目录——看懂 commit/tree/blob 到底存了什么、分支合并的真相,再学会带一个团队从工作流走到事故恢复。",
  project: "运营一个多人协作的咖啡站仓库,从工作流到事故恢复",
  storageKey: "gitadv-academy:completed",
} as const;

export const GITADV_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "G1",
    title: "Git 的本质",
    subtitle: "潜进 .git 目录",
    goal: "把 Git 从「魔法命令」还原成「一个内容寻址的文件系统」:看懂三棵树、commit/tree/blob 对象与引用,最后徒手用 plumbing 焊出一个提交。",
    covers: ["内容寻址", "三棵树", "对象模型与引用"],
    episodes: [
      { season: 1, episode: 1, title: "指纹柜台", summary: "内容寻址与 SHA 哈希:墨叔存东西不看文件名只认内容指纹,同样的内容永远进同一个储物格——原来 Git 是个按指纹编号的文件系统。", chapterType: "comic", projectStage: "看懂仓库怎么存东西", technologies: ["SHA-1/SHA-256", "内容寻址", "hash-object"], jobSkills: ["Git 原理"], status: "planned" },
      { season: 1, episode: 2, title: "三张桌子", summary: "工作区/暂存区/HEAD 三棵树:改稿桌、摆盘桌、归档桌各司其职,add 是端菜上桌、commit 是拍照存档,三张桌子讲清 Git 的全部日常。", chapterType: "comic", projectStage: "分清改动到底在哪张桌上", technologies: ["工作区", "index/暂存区", "HEAD"], jobSkills: ["Git 原理"], status: "planned" },
      { season: 1, episode: 3, title: "墨滴三兄弟", summary: "blob/tree/commit 三种对象:墨叔喷出三滴墨,blob 装文件内容、tree 装目录快照、commit 裹住一棵 tree 和父指针,层层指向拼出一次提交。", chapterType: "comic", projectStage: "拆开一次提交看清对象层级", technologies: ["blob", "tree", "commit 对象"], jobSkills: ["Git 原理"], status: "planned" },
      { season: 1, episode: 4, title: "腕尖上的便利贴", summary: "引用与 HEAD:分支不过是一张贴着提交号的便利贴,HEAD 是墨叔当前盯着的那条腕——切分支不搬砖,只是挪一下视线。", chapterType: "comic", projectStage: "看懂分支切换的真相", technologies: ["refs", "分支指针", "HEAD/detached HEAD"], jobSkills: ["Git 原理"], status: "planned" },
      { season: 1, episode: 5, title: "墨迹倒带机", summary: "reflog 是后悔药:以为 reset 弄丢的提交其实都在墨叔的私人日记里,reflog 记下 HEAD 每一次挪窝,悬空对象也还漂着没被回收。", chapterType: "comic", projectStage: "误操作后能自己找回提交", technologies: ["reflog", "悬空对象", "reset"], jobSkills: ["Git 排障"], status: "planned" },
      { season: 1, episode: 6, title: "潜入墨囊", summary: ".git 目录探秘:掀开盖子,objects 是储物柜、refs 是便利贴墙、HEAD 是一张纸条、packed-refs 是压缩档案——仓库全部秘密都摊在这一间暗室。", chapterType: "lab", projectStage: "读得懂 .git 目录结构", technologies: ["objects", "refs", "packfile", "HEAD 文件"], jobSkills: ["Git 原理"], status: "planned" },
      { season: 1, episode: 7, title: "徒手捏一次提交", summary: "卷终:不碰 git commit,用 hash-object / update-index / write-tree / commit-tree 四把 plumbing 手术刀,从零焊出一个真提交并让分支指过去。", chapterType: "project", projectStage: "gitadv-v1 看透对象模型", technologies: ["hash-object", "write-tree", "commit-tree", "update-ref"], jobSkills: ["Git 原理", "plumbing 命令"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "G2",
    title: "分支与合并的真相",
    subtitle: "指针的舞蹈",
    goal: "把分支、合并、变基从「感觉」讲成「机制」:分支只是指针,merge 与 rebase 各有代价,三方合并靠共同祖先,冲突是 Git 不敢替你拍板——最后理顺一团乱麻。",
    covers: ["分支即指针", "merge/rebase 取舍", "三方合并与冲突"],
    episodes: [
      { season: 2, episode: 1, title: "八腕分身术", summary: "分支只是一个指针:新建分支不搬一砖一瓦,只多贴一张便利贴,墨叔八条腕同时推八条线互不打架——这才明白分支为何这么轻、这么快。", chapterType: "comic", projectStage: "敢放心开分支做实验", technologies: ["branch", "指针本质", "快进合并"], jobSkills: ["分支管理"], status: "planned" },
      { season: 2, episode: 2, title: "合流还是改道", summary: "merge vs rebase 的取舍:merge 保留两条河的交汇口,rebase 把支流搬到主干末尾假装从没分家,墨叔摆出决策天平讲清各自代价与「黄金法则」。", chapterType: "reference", projectStage: "能按场景选合并策略", technologies: ["merge", "rebase", "rebase 黄金法则"], jobSkills: ["分支管理"], status: "planned" },
      { season: 2, episode: 3, title: "三点定案", summary: "三方合并算法:合并不是二选一,而是找共同祖先当第三方证人,base/ours/theirs 三点一对比,Git 才算得出谁改了哪一行。", chapterType: "comic", projectStage: "看懂 Git 怎么算出合并结果", technologies: ["three-way merge", "merge-base", "共同祖先"], jobSkills: ["分支管理"], status: "planned" },
      { season: 2, episode: 4, title: "两腕同改一行", summary: "冲突到底怎么产生:冲突不是 Git 使坏,是两条腕改了同一行它不敢替你拍板,只好把 <<<< ==== >>>> 摆上桌请你裁决,rerere 先埋个引子。", chapterType: "comic", projectStage: "能冷静手动解冲突", technologies: ["冲突标记", "merge 冲突", "ours/theirs"], jobSkills: ["分支管理", "Git 排障"], status: "planned" },
      { season: 2, episode: 5, title: "摘一颗墨珠", summary: "cherry-pick 与 revert:cherry-pick 把某次提交的改动单独摘过来重放,revert 造一次反向提交把错误抵消——都不撕历史,只在末尾续写。", chapterType: "comic", projectStage: "能精准搬运/撤销单个改动", technologies: ["cherry-pick", "revert", "反向提交"], jobSkills: ["分支管理"], status: "planned" },
      { season: 2, episode: 6, title: "重排墨迹", summary: "交互式变基改历史:pick/squash/reword/drop,墨叔把一串潦草提交拖进交互式变基台,压扁、改词、删行——历史被负责任地重写。", chapterType: "lab", projectStage: "能整理提交历史再推送", technologies: ["interactive rebase", "squash", "autosquash"], jobSkills: ["分支管理"], status: "planned" },
      { season: 2, episode: 7, title: "解开缠成一团的八条腕", summary: "卷终:一个 merge/rebase/cherry-pick 混作一团、图形乱成毛线球的仓库,墨叔带阿零逐节梳直,画出一张清爽可读的提交 DAG。", chapterType: "project", projectStage: "gitadv-v2 理顺分支", technologies: ["rebase --onto", "reset", "提交图整理"], jobSkills: ["分支管理", "Git 排障"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "G3",
    title: "团队协作工作流",
    subtitle: "多人上车不翻车",
    goal: "从单机走向多人:选一套分支工作流、把 PR 与 Code Review 变成文化、给主干加门禁、让提交信息驱动自动发版,最后写成一份团队都认的协作规范。",
    covers: ["工作流模型", "PR 与门禁", "monorepo 与 LFS"],
    episodes: [
      { season: 3, episode: 1, title: "一条主街还是四通八达", summary: "主干开发 vs Git Flow:trunk-based 只认一条主干天天上车,Git Flow 铺开 feature/release/hotfix 立交桥,墨叔按团队规模与发版节奏给出选路指南。", chapterType: "reference", projectStage: "为咖啡站团队选定工作流", technologies: ["trunk-based", "Git Flow", "GitHub Flow"], jobSkills: ["团队协作"], status: "planned" },
      { season: 3, episode: 2, title: "上菜前先过嘴", summary: "PR 与 Code Review 文化:PR 不是走过场,代码进主干前先摆上评审台,墨叔示范怎么切小 diff、怎么写让人愿意点赞的说明、怎么给不伤人的评论。", chapterType: "comic", projectStage: "团队开始走 PR 评审", technologies: ["Pull Request", "Code Review", "小步 diff"], jobSkills: ["团队协作"], status: "planned" },
      { season: 3, episode: 3, title: "主干门口的验票口", summary: "保护分支与 CI 门禁:给 main 加锁——必须过 CI、必须有人 approve、禁止 force push,墨叔在主街入口装上三道闸机拦住带病代码。", chapterType: "lab", projectStage: "main 分支上了保护与门禁", technologies: ["protected branch", "CI 门禁", "required review"], jobSkills: ["团队协作", "工程规范"], status: "planned" },
      { season: 3, episode: 4, title: "提交信息会自己发版", summary: "语义化提交与自动发版:feat/fix/BREAKING 写进提交信息,机器就能算出下一个版本号并生成 changelog——规范的提交是写给机器读的命令。", chapterType: "lab", projectStage: "接入语义化版本与自动发版", technologies: ["Conventional Commits", "SemVer", "自动 changelog"], jobSkills: ["工程规范"], status: "planned" },
      { season: 3, episode: 5, title: "一个大仓还是套娃仓", summary: "monorepo 与 submodule/subtree:submodule 是挂在仓库里的书签只记指针,subtree 把整个子仓揉进来,monorepo 干脆全塞一屋,墨叔拆解三种共享代码的活法。", chapterType: "reference", projectStage: "决定咖啡站多模块怎么拆仓", technologies: ["monorepo", "submodule", "subtree"], jobSkills: ["团队协作"], status: "planned" },
      { season: 3, episode: 6, title: "墨囊装不下的巨物", summary: "大文件与 LFS:把设计稿、模型权重直接 commit 会撑爆仓库,Git LFS 让大文件在仓库里只留一张指针、本体存到别处,墨叔算给你看省了多少墨。", chapterType: "comic", projectStage: "大文件改走 LFS 托管", technologies: ["Git LFS", "指针文件", ".gitattributes"], jobSkills: ["团队协作"], status: "planned" },
      { season: 3, episode: 7, title: "把规矩刻上墙", summary: "卷终:分支模型、提交规范、评审门禁、发版流程写成一份团队都认的 CONTRIBUTING 与模板,墨叔盖章生效——从此新人上车有章可循。", chapterType: "project", projectStage: "gitadv-v3 团队规范", technologies: ["CONTRIBUTING", "PR 模板", "CODEOWNERS"], jobSkills: ["团队协作", "工程规范"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "G4",
    title: "事故恢复与进阶",
    subtitle: "从删库到跑路的反面",
    goal: "把最吓人的场景变成可控操作:找回删掉的提交、二分定位 bug、force push 惨案急救、清理泄露的敏感信息、用 hooks 与 rerere 把经验自动化,最终从一次灾难全身而退。",
    covers: ["reflog 救援", "bisect 定位", "filter-repo 与 hooks"],
    episodes: [
      { season: 4, episode: 1, title: "从墨迹里捞回沉船", summary: "找回删掉的提交:reset --hard 之后代码没了?只要还没 gc,提交仍漂在 reflog 与悬空对象里,墨叔用一条腕把沉船从墨海里捞回岸。", chapterType: "comic", projectStage: "能救回误删的提交与分支", technologies: ["reflog", "fsck --lost-found", "cherry-pick 救援"], jobSkills: ["Git 排障"], status: "planned" },
      { season: 4, episode: 2, title: "二分抓内鬼", summary: "bisect 二分定位 bug:上千次提交里混进一个坏蛋,一个个试要试到天黑,bisect 让墨叔折半下注,log₂ 步就锁定第一个出错的提交。", chapterType: "lab", projectStage: "能用 bisect 快速定位回归", technologies: ["git bisect", "bisect run", "二分查找"], jobSkills: ["Git 排障"], status: "planned" },
      { season: 4, episode: 3, title: "深夜 push -f 惨案", summary: "误操作急救手册:有人往共享分支 force push,抹掉了同事一整天的活,墨叔掏出急救手册,从 reflog、远端 ref 和别人的本地副本三路抢救现场。", chapterType: "incident", projectStage: "有一套误操作急救流程", technologies: ["force push", "reflog 恢复", "--force-with-lease"], jobSkills: ["Git 排障", "团队协作"], status: "planned" },
      { season: 4, episode: 4, title: "把泄密的墨迹从每一页抹掉", summary: "filter-repo 清理敏感信息:误提交的密钥删一次 commit 根本不干净,filter-repo 重写全部历史逐页擦除,墨叔叮嘱擦完必须立刻轮换那把密钥。", chapterType: "lab", projectStage: "能彻底清除历史里的敏感信息", technologies: ["git filter-repo", "历史重写", "密钥轮换"], jobSkills: ["Git 排障", "安全"], status: "planned" },
      { season: 4, episode: 5, title: "腕上的自动机关", summary: "hooks 与自动化:pre-commit 拦格式错误、commit-msg 卡不合规的提交信息、pre-push 跑测试,墨叔在每条腕上绑好触发即动的机关,把规矩变成自动。", chapterType: "lab", projectStage: "关键 hook 上线守门", technologies: ["git hooks", "pre-commit", "commit-msg"], jobSkills: ["工程规范", "自动化"], status: "planned" },
      { season: 4, episode: 6, title: "记住你怎么解的冲突", summary: "rerere 与高级技巧:rerere 背下你上次的冲突解法,下次同样的冲突自动照抄,再加 worktree 并行、autosquash、maintenance——墨叔亮出压箱底绝活。", chapterType: "reference", projectStage: "掌握一批高阶提效技巧", technologies: ["rerere", "git worktree", "autosquash"], jobSkills: ["Git 进阶"], status: "planned" },
      { season: 4, episode: 7, title: "从一次灾难性误操作中全身而退", summary: "大成卷终:rebase 撞车、误删分支、脏历史三连击同时砸下,阿零靠 reflog + bisect + filter-repo 组合技全身而退——墨叔把八条腕交给他,Git 大成。", chapterType: "project", projectStage: "gitadv-v4 灾难恢复 · Git 大成", technologies: ["reflog", "bisect", "filter-repo", "综合"], jobSkills: ["Git 排障", "团队协作"], status: "planned" },
    ],
  },
];

export function gitadvAllEpisodes(): JavaEpisode[] {
  return GITADV_SEASONS.flatMap((s) => s.episodes);
}

export function gitadvPublishedEpisodes(): JavaEpisode[] {
  return gitadvAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
