---
title: "《从零开始玩命令行》16 · stash、cherry-pick 与工作流"
date: 2026-10-04
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

*本话属于连载《从零开始玩命令行》。全卷地图见 [/cli](/cli);前作《从零开始学 Java》见 [/java](/java)。*
