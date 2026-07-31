---
title: "《从零开始玩命令行》16 · stash、cherry-pick 与工作流"
date: 2026-07-22
summary: "会员功能写到一半,豆豆冲进来喊线上 bug。改动没提交、切分支被 Git 拦下——特米拉开『抽屉』git stash。救完火再用 cherry-pick 把 hotfix 精准搬回 develop,途中踩了 stash pop 冲突和摘错樱桃两个坑。卷终话,把整卷手艺串成一套极简团队工作流,Git 毕业。"
tags: [Git, 命令行, 终端漫画, stash, cherry-pick, 阿零与特米]
---

# 《从零开始玩命令行》16 · stash、cherry-pick 与工作流

> 连载特刊 · 第二部《从零开始玩命令行》第 3 卷「Git 时间机」第 6 话(卷终 · 项目话)
> 长期项目:**把豆豆咖啡站部署上真实服务器**。承接上一话:会员功能写到一半,线上炸了——手头的活既不能提交也不敢丢。全卷地图见 [/cli](/cli)。

---

## 一、需求:活干到一半,火警响了

阿零正在 `feature/member` 上写会员折扣,`order.js` 改得七零八落,离能提交还差得远。豆豆滚进来:「线上拿铁价格算错了!马上修!」

阿零下意识 `git switch main`,Git 一把拦住:改动没提交,切过去会被覆盖。提交吧,「wip: 写了个寂寞」这种半成品他刚在上一话学会要脸;不提交吧,火在烧。他需要的是:**把手头的活原样搁进一个抽屉,腾出干净的工作区去救火,回来再原样拿出来**。救完火还有第二个需求:那个修复提交,`develop` 上也得有——但他不想把整条 hotfix 分支合过去,只想**摘这一颗**。

---

## 二、漫画 · 抽屉与樱桃

> **〔1〕** 阿零两手拽着写了一半的 `order.js`,豆豆在旁边冒烟:「线上 bug!」屏幕上 `git switch main` 被红字顶了回来。
> 阿零:「提交嫌脏,不提交切不动……我卡死了。」

> **〔2〕** 守卫从时间线里抽出一只悬浮抽屉,特米一脚把阿零的改动全踹了进去。
> 特米:「`git stash`。**工作区瞬间还原成干净的**,你的改动躺在抽屉里,随时取。快去救火。」

> **〔3〕** 阿零在 `hotfix/latte-price` 上一分钟修好价格,合回 `main`。回头想把这颗提交也给 `develop`。
> 守卫:「`git cherry-pick <哈希>`——从别的时间线上**摘一颗钉子,复制着钉到你脚下**。注意,是**复制**,新钉子新哈希。」

> **〔4〕** 阿零回到 `feature/member`,`git stash pop`,抽屉「哐」地卡住一半——冲突了。
> 阿零(慌):「抽屉……还在吗?!」特米:「pop 冲突时 Git **不敢扔**,stash 原样留着。解完冲突自己 `drop`。」

> **〔5〕** 阿零又手滑,cherry-pick 摘错了提交,满屏冲突。特米按住他想硬解的手。
> 特米:「摘错了就别硬吃。`git cherry-pick --abort`,**原路退回摘之前**,毫发无损。」

> **〔6〕** 火灭,樱桃归位,抽屉清空。守卫把整卷的钉子、分支、抽屉、樱桃拼成一张工作流地图,沙漏缓缓熄灭。
> 守卫:「main 守成、feature 开荒、hotfix 救火。这张图带走——**你从 Git 时间机毕业了**。」

---

## 三、本话目标

- 用 `git stash` 把未提交改动暂存进「抽屉」:`push`/`list`/`pop`/`apply`/`drop` 各干嘛;
- 认清抽屉的坑:**默认不收未跟踪的新文件**,要连新文件一起收得加 `-u`;
- 用 `git cherry-pick` 把某一颗提交**复制**到当前分支;冲突时 `--continue`/`--abort` 两条路;
- 踩两个真实坑:stash pop 冲突(抽屉还在不在?)、cherry-pick 摘错提交;
- 把整卷手艺串成极简团队工作流:**main 保护 + feature 分支 + hotfix 分支**,Git 毕业。

---

## 四、原理图:一只抽屉,一颗樱桃

```text
① stash = 工作区旁边的抽屉(栈:后进先出)

   工作区(乱)──git stash──▶ ┌─────────────────┐
                             │ stash@{0} 最新   │ ◀─ pop/apply 先拿这个
   工作区(净)◀──pop/apply── │ stash@{1} 更早   │
                             └─────────────────┘
   pop   = 拿出来 + 把这格抽屉扔掉
   apply = 拿出来 + 抽屉里还留着一份(想在多条分支重放时用)

② cherry-pick = 从别的分支"复制"一颗提交过来

   main:    A──B──F(f00dcaf 修价格)
   develop: A──C──D ──cherry-pick f00dcaf──▶ A──C──D──F'
                                                      ↑
                              F' 内容同 F,但哈希是新的(复制品,不是本尊)
```

一句话:**stash 管「没提交的」,cherry-pick 管「已提交的」——一个搁置现场,一个精准搬运。**

---

## 五、上手:塞抽屉 → 救火 → 摘樱桃

**① 火警响起,先塞抽屉**:

```bash
$ git switch main
error: Your local changes to the following files would be overwritten by checkout:
	src/order.js
Please commit your changes or stash them before you switch branches.
Aborting

$ git stash                            # 改动进抽屉,工作区还原
Saved working directory and index state WIP on feature/member: 8c31f02 feat: 会员骨架

$ git stash list                       # 抽屉清单(栈,@{0} 最新)
stash@{0}: WIP on feature/member: 8c31f02 feat: 会员骨架

$ git status                           # 干净了,但注意——
On branch feature/member
Untracked files:
	src/member.js
```

`member.js` 是新建的**未跟踪文件**,`git stash` 默认不收它!要连它一起进抽屉,得 `git stash -u`(untracked)。阿零补了一刀 `git stash -u`,这才真正两袖清风。

**② 开 hotfix 分支救火,合回 main**:

```bash
$ git switch -c hotfix/latte-price main
$ vim src/price.js                     # 一分钟修好
$ git add src/price.js && git commit -m "fix: 拿铁价格少乘了会员系数"
[hotfix/latte-price f00dcaf] fix: 拿铁价格少乘了会员系数
$ git switch main && git merge hotfix/latte-price && git push
```

**③ cherry-pick 把这颗修复摘给 develop**(develop 是团队刚养起来的开发集成分支——大家的功能先在这儿汇合,攒稳了再进 main):

```bash
$ git switch develop
$ git cherry-pick f00dcaf              # 只要这一颗,不合整条分支
[develop 3e91ac4] fix: 拿铁价格少乘了会员系数
 1 file changed, 1 insertion(+), 1 deletion(-)
```

注意新哈希 `3e91ac4`——**同一份改动,develop 上是一颗复制出来的新钉子**。

---

## 六、故意制造一个 Bug:卡住的抽屉 + 摘错的樱桃

救完火,阿零顺手在 `feature/member` 上也 cherry-pick 了价格修复(动了 `order.js` 里同一行),然后开抽屉:

```bash
$ git stash pop
```

另一头,他想再给 `develop` 摘那颗 hotfix,结果 `git log` 看串行,把自己的半成品 `9a41d77 wip: 会员写一半` 的哈希摘了过去:

```bash
$ git cherry-pick 9a41d77
```

---

## 七、读懂真实报错

**坑一**,stash pop 弹到一半卡住:

```text
Auto-merging src/order.js
CONFLICT (content): Merge conflict in src/order.js
On branch feature/member
Unmerged paths:
	both modified:   src/order.js
The stash entry is kept in case you need it again.
```

根因:抽屉里的改动和分支上的新提交动了**同一行**,pop 的「取出」这步冲突了。关键读最后一句——**pop 只有在干净应用成功时才会顺手扔掉抽屉;一旦冲突,stash 原样保留**(`git stash list` 还能看到它)。修法:像普通冲突一样改 `order.js` → `git add`,确认无误后手动 `git stash drop` 清掉那格抽屉;想彻底反悔则 `git checkout -- .` 后重新想辙,抽屉里那份始终没丢。

**坑二**,cherry-pick 摘错樱桃,满屏冲突:

```text
Auto-merging src/order.js
CONFLICT (content): Merge conflict in src/order.js
error: could not apply 9a41d77... wip: 会员写一半
hint: After resolving the conflicts, mark them with
hint: "git add/rm <pathspec>", then run
hint: "git cherry-pick --continue".
hint: To abort and get back to the state before "git cherry-pick",
hint: run "git cherry-pick --abort".
```

根因:摘的根本不是 hotfix,是自己的半成品。这时别硬着头皮解冲突——**先问自己「这颗樱桃摘对了吗」**。摘错了,`git cherry-pick --abort` 原路退回摘之前;确实摘对了只是有冲突,才走「改文件 → `git add` → `git cherry-pick --continue`」。和上一话 rebase 的 `--abort`/`--continue` 是同一对开关,Git 的中断操作全家都认这两个词。

> **🪟 双系统对照 · 同一套 Git,不同的壳**

| 干什么 | Linux (bash) | PowerShell 7 | 关键差异 |
|---|---|---|---|
| 塞抽屉/取出 | `git stash` / `git stash pop` | 完全相同 | Git 本体跨系统零差异,差异全在壳上 |
| 操作指定抽屉 | `git stash apply stash@{1}` | `git stash apply 'stash@{1}'` | **PS 把 `@{...}` 当哈希表字面量**(又是对象!),会把花括号吞掉,git 收到 `stash@1` 报 `unknown revision`——必须加引号 |
| 在 stash 清单里筛 | `git stash list \| grep member` | `git stash list \| Select-String member` | git 是外部命令,PS 拿到的也退化成**文本行**;Select-String 再把它包回 MatchInfo 对象 |
| 看提交找樱桃 | `git log --oneline develop` | 相同 | — |

上一话的换行符、这一话的 `@{}`:Git 命令本身从不跨系统翻车,翻车的永远是**壳对字符的抢戏**——PowerShell 满脑子对象语法,连 `stash@{0}` 都想先解析成哈希表。

> **🎯 面试直击**:线上出了紧急 bug,而你手头有一堆未提交的改动,怎么处理?
> 标准流:`git stash -u` 搁置现场(记得 `-u` 连未跟踪文件一起收)→ 从 `main` 切出 `hotfix/xxx` 修复、提交、合回 main 并部署 → 需要同步到开发线时 `git cherry-pick <哈希>` 把修复复制过去 → 回到功能分支 `git stash pop` 恢复现场。追问点:`pop` 与 `apply` 的区别(pop 成功即丢弃、apply 保留可重放)、pop 冲突时 stash 是否还在(在,Git 冲突时不丢弃)。

---

## 八、用命令验证:抽屉空了没,樱桃落对枝没

```bash
$ git stash list                     # 空输出 = 抽屉清空,没有忘在里面的活
$ git log --oneline -3 develop       # 樱桃在不在 develop 尖上
3e91ac4 fix: 拿铁价格少乘了会员系数
...
$ git status                         # 回到 feature/member,现场恢复、无残留冲突
On branch feature/member
nothing to commit, working tree clean
```

三连看完才算收工:**抽屉空、樱桃在、工作区净。** 这也是每次救火归来的固定巡检。

---

## 九、项目检查点 · 咖啡站进 Git v1.0(毕业)

```text
已具备:三区模型与提交、分支/合并/冲突、reset/revert/reflog 后悔药、
        远程与 push/pull、merge vs rebase 取舍、stash 抽屉、cherry-pick 摘运,
        以及一套极简团队工作流:
        ── main 只进过审代码(平台上设保护,禁止直推)
        ── 新功能一律 feature/xxx 分支,完工发起 PR(拉取请求,请同伴过目后合入)
        ── 线上救火走 hotfix/xxx,合回 main 后 cherry-pick 同步到开发线
还没有:代码管得明明白白了,可承载代码的这台服务器,还是一只黑箱
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| stash 应急切换 | 「多任务并行不丢现场」,一线开发每天都在用 |
| cherry-pick 精准同步 | 多分支维护(发布分支回合修复)的标配手艺 |
| 分支工作流意识 | JD 里的「熟悉 Git Flow / 分支管理规范」 |

---

## 十一、下一话悬念 · C3 卷终

Git 时间守卫收起沙漏,咖啡站的代码史从此清清爽爽。可就在阿零得意的当口,服务器毫无征兆地卡了三秒——光标冻住,敲什么都不理。缓过来后特米盯着屏幕深处:「代码你是管明白了。**但这台机器此刻正在跑着几百个你看不见的东西**——谁在吃 CPU?黑屏后面,它到底在想什么?」

> 下一卷第 4 卷《进程与系统》开卷话《谁在跑:ps / top / kill》:掀开黑箱,看见每一个正在运行的进程,并学会礼貌地——或不礼貌地——请它停下。

---

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,接下来3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. `git stash` 的作用是什么?
   - A) 删除未提交的修改　B) 临时保存当前工作目录和暂存区的修改,让工作区变干净　C) 提交修改但不 push　D) 回退到上一次提交

2. `git stash pop` 和 `git stash apply` 的区别是什么?
   - A) 完全相同　B) `pop` 恢复最近一次 stash 并从 stash 列表中移除;`apply` 恢复但不移除,可以反复应用到不同分支　C) `pop` 可以恢复多个 stash,`apply` 只能恢复一个　D) `apply` 是 `pop` 的别名

3. `git cherry-pick` 的主要用途是什么?
   - A) 复制整个分支　B) 将某个特定的提交(commit)"摘取"并应用到当前分支　C) 删除某个提交　D) 合并两个分支

4. `git stash list` 显示什么信息?
   - A) 最近一次 commit 的 diff　B) 所有被 stash 保存的临时修改的列表(带索引和描述)　C) 暂存区文件列表　D) 已删除的文件列表

5. 在 `feature` 分支上工作到一半,突然需要紧急切换到 main 修 bug,最快最安全的做法是?
   - A) 立即 `git switch main`(丢弃 feature 上的修改)　B) `git stash`(保存当前修改)→`git switch main`→修 bug→`git switch feature`→`git stash pop`(恢复工作)　C) `git commit`(随便 commit 一下)→`git switch main`　D) 同时打开两个终端分别工作

6. `git cherry-pick abc123` 执行后,新提交的哈希值是?
   - A) 与 `abc123` 相同　B) 一个新的、不同的哈希值(因为父提交、时间戳、作者上下文都不同)　C) 以 `abc123` 开头但后面不同　D) 随机生成

7. `git stash drop stash@{2}` 的作用是什么?
   - A) 删除 stash 列表中的第 3 个条目(索引从 0 开始)　B) 丢弃文件修改　C) 恢复到第 2 个 stash　D) 查看第 2 个 stash 的内容

8. cherry-pick 时发生冲突,以下处理流程**正确**的是?
   - A) 放弃 cherry-pick,用 merge 替代　B) 解决冲突→`git add`→`git cherry-pick --continue`　C) `git stash` 保存冲突→重新 cherry-pick　D) 直接 force push

9. 关于 Git Flow 分支模型,`hotfix` 分支应该基于哪个分支创建,又合并回哪些分支?
   - A) 基于 feature 创建,合并回 feature　B) 基于 main 创建,同时合并回 main 和 develop　C) 基于 develop 创建,只合并回 develop　D) 基于任意分支,合并回任意分支

10. 以下哪种场景**不适合**使用 `cherry-pick`?
   - A) 把 bug fix 从 release 分支同步到 develop　B) 从功能分支上摘取一个通用的工具函数提交到 main　C) 将整个 feature 分支上所有提交搬到 main(应使用 merge)　D) 将一个提交从一个分支复制到另一个分支

### 解答题(5 道)

**Q1 概念:** `stash`(暂存修改)、`cherry-pick`(摘樱桃)、`branch`+`merge`(分支合并)三者在"在不同分支间搬运代码"这件事上各有什么特点和适用场景?

**Q2 解释:** `git stash` 保存了什么?工作目录、暂存区、未跟踪文件的处理方式各是什么?(提示:默认行为 vs `-u`/`-a` 选项)

**Q3 操作:** 在 feature 分支上正在改 3 个文件(未 commit),突然要修 main 的紧急 bug。写出从保存工作→切分支→修 bug→推送到远程→恢复工作的完整命令序列。

**Q4 排障:** 菜菜 `git stash pop` 时遇到冲突(merge conflict),但不想解决,想回到 pop 前的状态。怎么办?

**Q5 综合设计:** 咖啡站团队使用 Git Flow:有 `main`(生产)、`develop`(开发)、`feature/*`等多个分支。某天发现生产环境有 bug,需要基于 main 创建 `hotfix` 修复,同时 develop 上已经有一个相关但不完全一样的修改。请设计完整的 hotfix 流程:创建、修复、合并回 main 和 develop、处理 develop 上的冲突。

> [!答案]
> **1-B** stash(藏匿)将工作目录和暂存区的修改"打包存起来",让工作区恢复到 HEAD 的干净状态,稍后可以恢复。**举一反三:**所谓"工作到一半被打断"的情景——stash 就是为此而生。🪟 PowerShell 没有直接的 stash 等价物,但可以通过 `git stash` 使用。
>
> **2-B** `pop`=弹出(恢复 + 删除 stash 条目),`apply`=应用(恢复 + 保留 stash 条目,可以反复使用)。**举一反三:**如果 stash 恢复时可能冲突,用 `apply` 更安全——万一一团糟,stash 条目还在,可以重新来。`pop` 成功后 stash 条目消失。
>
> **3-B** cherry-pick 像一个"代码搬运工":选择一个或多个提交,把它们在当前分支上重新创建(新哈希)。**举一反三:**比喻:"从另一棵树上摘下一颗樱桃,嫁接到你当前的树枝上"。它与 merge 的区别:merge 搬整个分支,c-p 只搬你选中的那个提交。
>
> **4-B** `git stash list` 显示所有 stash 条目,格式:`stash@{0}: WIP on feature: abc123 最近提交信息`。**举一反三:**`stash@{0}` 是最近一次 stash,`stash@{1}` 是上上次。`git stash show -p stash@{0}` 查看某个 stash 的具体内容(diff)。
>
> **5-B** stash 是处理"工作到一半被打断"的标准方案。B 是最安全的操作序列。**举一反三:**C 选项(随便 commit)也是一种做法——之后可以用 `git reset HEAD~1` 撤销——但 stash 更简洁。核心是:不要让未提交的修改阻挡你切换分支。
>
> **6-B** cherry-pick 会创建一个**全新的提交**(新哈希、新时间戳、新父提交),但代码变更相同。**举一反三:**这就是为什么两个看起来一模一样的 cherry-pick 提交会有不同的哈希——提交的"上下文"变了(所在分支位置不同)。
>
> **7-A** `stash@{N}` 中序号从 0 开始,`stash@{2}` 是第 3 个条目。`drop` 删除但不恢复。**举一反三:**`git stash clear` 一键清空所有 stash(危险操作,确认不需要这些存储的修改)。
>
> **8-B** cherry-pick 冲突的处理流程与 merge 冲突完全一样:手动解决→`git add`→`git cherry-pick --continue`。**举一反三:**如果想放弃 cherry-pick:`git cherry-pick --abort`。也可以 `--skip` 跳过当前冲突的提交(极少用)。
>
> **9-B** hotfix 是紧急生产修复,基于生产分支(`main`)创建,修复后必须同时合并回 `main`(让生产受益)和 `develop`(让开发分支也包含修复,避免下次发布时遗忘)。**举一反三:**这是 Git Flow 的核心规则之一。如果忘记了合并回 develop,下次从 develop 发版时这个 bug 会"复活"。
>
> **10-C** cherry-pick 适合搬运**一个或几个**特定的提交,不适合搬运整个分支。搬运整个分支应该用 `merge`。**举一反三:**用 cherry-pick 搬大量提交容易出现遗漏、冲突频发。判断标准:要搬 < 3 个提交用 cherry-pick;要搬整个 feature 用 merge/rebase。
>
> **Q1** ①stash:临时保存未提交修改,让工作区干净以便做其他事,特点是"暂存→切上下文→救回来"。场景:紧急修 bug 时需要从当前分支抽身。②cherry-pick:精确复制某个提交到另一个分支,只搬选中的(不搬整个分支)。场景:把 release 分支上的某个关键修复单独嫁接到 develop,而不把 release 的其他改动带过去。③branch+merge:完整的并行开发与合并,搬整个功能的所有提交。场景:标准的 feature 开发合并到 main。**核心区别:**stash 搬的是"未提交的脏修改";cherry-pick 搬的是"单个已提交的干净 snap";merge 搬的是"整个分支的所有提交"。
>
> **Q2** 默认行为:保存已跟踪文件的修改(工作目录)和暂存区的内容。**未跟踪文件(untracked)不会被保存**。`git stash -u`(或 `--include-untracked`):同时保存未跟踪文件。`git stash -a`(或 `--all`):保存所有文件(包括 .gitignore 忽略的文件)。**举一反三:**新建了文件但还没 `git add`(untracked),然后用 `git stash` 发现新文件没有进 stash——这是常见困惑。解决方案:要么 `git stash -u`,要么先 `git add` 让文件被 tracking。
>
> **Q3** 完整序列:①`git stash`(或 `git stash -u` 如果有新文件)保存当前修改 ②`git switch main` 切到 main ③`git pull origin main` 拉取最新 ④修 bug→`git add . && git commit -m "紧急修复:登录空指针异常"` ⑤`git push origin main` 推送 ⑥`git switch feature` 切回 feature 分支 ⑦`git stash pop`(或 `apply`)恢复之前的工作。**举一反三:**stash 时可以加描述:`git stash push -m "开发中的登录功能"`,之后 `git stash list` 能清楚看到这个记录是做什么的。
>
> **Q4** 如果 `pop` 遇到冲突,stash 条目**没有被自动删除**(pop 失败时 Git 会保留 stash)。如果不想解决冲突:①先 `git reset --hard HEAD`(丢弃当前混乱状态) ②`git stash pop` 又回来了(如果第一次 pop 失败但 stash 还在的话)。如果 stash 已经不在(`git stash list` 看不到),虽然 pop 出冲突但条目已删,此时可以用 `git reset --merge HEAD` 回到 pop 前的状态。**核心:**pop 冲突时 Git 不会删除 stash,但一旦 stash 条目被手动 drop 且没有 reflog(不像 commit),就无法通过 Git 本身恢复了。安全流程:不确定时先 `apply` 看看。
>
> **Q5** 完整 hotfix 流程:①`git switch main && git pull origin main` ②`git switch -c hotfix/order-crash`(基于 main 创建) ③修 bug→commit→`git push -u origin hotfix/order-crash` ④创建 PR 合并到 main(生产环境) ⑤main 上创建 tag:`git tag v1.2.1 && git push --tags` ⑥**必须同步回 develop:**`git switch develop && git pull origin develop` ⑦`git merge hotfix/order-crash`(或 `git cherry-pick <修复提交>`) ⑧如果 develop 上已有相关修改,这里可能出现冲突——解决冲突时注意:develop 的另一份修改和 hotfix 的目的可能不同(一个是对原功能的优化,一个是紧急修复),保留两者的有效部分 ⑨测试通过→`git push origin develop` ⑩清理:`git branch -d hotfix/order-crash`。**举一反三:**Git Flow 的标签是发布管理的关键——`v1.2.1` 标记了 hotfix 后的生产版本,随时可以从这个 tag 回滚或部署。

## 运行前边界、回滚与验证

- **运行前**：示例以 GNU/Linux 的 Bash 为主；先用 `command --help`、`man command` 或发行版文档确认本机版本和参数。不要把教程中的 IP、域名、用户、路径直接复制到生产机器。
- **先确认作用域**：涉及文件、仓库、容器或远端主机时，先运行 `pwd`、`whoami`、`git status`、`docker context show` 或 `ssh -G 主机别名`，确认当前目标；对重要数据先做可恢复备份。
- **完成后验证**：用只读命令确认结果，例如 `ls -la`、`git status`、`systemctl status 服务名`、`docker ps` 或 `curl -fS URL`；失败时停止扩大操作范围，先读报错。
- **删除边界**：`rm`/`Remove-Item` 不会进入回收站。先用 `ls -- 路径` 或 PowerShell 的 `-WhatIf` 预演；避免对变量、通配符或当前目录直接使用递归强制删除。
- **Git 回滚边界**：`reset --hard`、rebase 和强推会改写本地或共享历史。先保存 `git status`/`git log --oneline`，共享分支优先 `git revert`；必须强推时使用 `--force-with-lease` 并与协作者确认。
