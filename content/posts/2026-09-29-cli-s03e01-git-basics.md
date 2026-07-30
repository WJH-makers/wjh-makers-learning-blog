---
title: "《从零开始玩命令行》11 · 三个区与第一个存档点"
date: 2026-09-29
summary: "阿零在 Java 线一话里浅尝过 Git,这一卷要吃透。第一话把工作区、暂存区、仓库三个区拆到底:init/add/commit/log 的肌肉记忆,以及所有新手都会栽的『add 之后又改了却没再 add』快照陷阱。Git 时间守卫登场。"
tags: [Git, 命令行, 终端漫画, 版本控制, 阿零与特米]
---

# 《从零开始玩命令行》11 · 三个区与第一个存档点

> 连载特刊 · 第二部《从零开始玩命令行》第 3 卷「Git 时间机」第 1 话
> 长期项目:**把豆豆咖啡站部署上真实服务器**。Java 线 S3E7 已带你摸过 Git 三区/分支,这一卷**整卷吃透**。全卷地图见 [/cli](/cli)。

---

## 一、需求:光会敲命令,救不回昨天的代码

阿零已经能在服务器里自由走动、读写文件、串管道了。可昨天他手滑 `rm` 掉半个部署脚本,今天想找回——**没有存档,回不去**。他在 Java 线里用 IDE 点过几下 Git 按钮,但一到没有图标的服务器上,连 `git` 三个字母都不知道从哪敲起。

特米:「你在 IDE 里点的每一个绿勾,底下都是**一条命令**。这一卷,我们把按钮拆回命令——从今天起,咖啡站的代码进 Git,一路推到 GitHub。」

---

## 二、漫画 · 时间守卫登场

> **〔1〕** 阿零盯着空目录发呆:「脚本没了……昨天那版明明能跑。」
> 特米:「你从没**存档**。在这个世界,没存过的东西,不存在。」

> **〔2〕** 光标一沉,地面浮起一位披斗篷、胸口嵌着沙漏的守卫,沙漏里流的是一行行代码。
> 守卫:「我是 **Git 时间守卫**。你每盖一个存档点,我就在时间线上钉一颗钉子——想回哪颗,随时跳。」

> **〔3〕** 守卫摊开三个发光的格子:**工作区** →`add`→ **暂存区** →`commit`→ **仓库**。
> 守卫:「东西不是一步进仓库的。先在**工作区**改,`add` 挑进**暂存区**当草稿,`commit` 才盖章进**仓库**。」

> **〔4〕** 阿零急着 `git commit`,守卫抬手拦住:沙漏一片空。屏幕冷冷回:`nothing to commit`。
> 守卫:「暂存区是空的,你想盖章什么?**没 `add`,`commit` 无米下锅。**」

> **〔5〕** 阿零 `add` 完又顺手改了一行,直接 `commit`,美滋滋。守卫摇头,翻开仓库——存的竟是**改之前**那版。
> 特米:「`add` 拍的是**那一刻的快照**。拍完你又改了,新改动没进暂存区,自然不进仓库。」

> **〔6〕** 阿零重新 `add` 再 `commit`,`git log` 里第一次亮起两行带时间戳的存档点。
> 阿零:「原来绿勾底下……是三个区在传包裹。」守卫(钉下一颗钉子):「记住这三步,你就有了后悔的权利。」

---

## 三、本话目标

- 建立 **三个区** 的心智模型:工作区 / 暂存区(index)/ 仓库;
- `git init` 建仓库,`git add` 暂存,`git commit` 盖存档点;
- `git status` / `git log` 随时看清自己站在时间线的哪一格;
- 看懂 `commit` 输出里的哈希、分支、`root-commit`;
- 踩一次「`add` 后又改却没再 `add`」的快照陷阱,并用 `git diff` 抓现行。

---

## 四、原理图:包裹在三个区之间传递

```text
工作区 (working tree)      你正在编辑的真实文件
   │  git add <file>       ——把改动"挑进"草稿箱
   ▼
暂存区 (index / staging)   下一次提交的快照草稿
   │  git commit -m "..."  ——盖章,写进永久历史
   ▼
仓库 (repository)          一串带哈希和时间戳的存档点(commit)

关键真相:commit 存的是"暂存区那一刻的快照",
         不是"你工作区现在的样子"。add 与 commit 之间你再改,
         那点改动还留在工作区,不进这次提交。
```

三条立刻要记的规矩:**① 改动必须先 `add` 再 `commit`;② `add` 拍的是当下快照,改了要重 `add`;③ 迷路先 `git status`,它永远告诉你三个区各是什么状态。**

---

## 五、上手:给咖啡站盖第一个存档点

进到咖啡站项目目录,四步走:

```bash
$ git init
Initialized empty Git repository in /home/ubuntu/coffee-shop/.git/

$ git config user.name  "azero"          # 报上作者身份(第一次用必设)
$ git config user.email "azero@coffee.dev"

# 工作区新建一个菜单文件
$ printf 'name = 豆豆咖啡站\nprice = 18\n' > menu.txt

$ git status
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	menu.txt

nothing added to commit but untracked files present (use "git add" to track)
```

`Untracked`(未跟踪)= Git 看得见这个文件,但还没管它。挑进暂存区:

```bash
$ git add menu.txt
$ git status
On branch main

No commits yet

Changes to be committed:          # ← 进了暂存区
	new file:   menu.txt

$ git commit -m "feat: 咖啡站菜单初稿"
[main (root-commit) 06bb19d] feat: 咖啡站菜单初稿
 1 file changed, 2 insertions(+)
 create mode 100644 menu.txt
```

读懂这行章:`main` 是分支,`(root-commit)` 是**这仓库的第一个提交**(以后就没这标记了),`06bb19d` 是这个存档点的**短哈希**(全局唯一的身份证)。再改一轮、看历史:

```bash
$ printf 'name = 豆豆咖啡站\nprice = 20\n' > menu.txt   # 涨价
$ printf '拿铁\n美式\n' > drinks.txt                     # 加饮品清单
$ git add .
$ git commit -m "feat: 涨价到 20 并加饮品清单"
[main 54f532a] feat: 涨价到 20 并加饮品清单
 2 files changed, 3 insertions(+), 1 deletion(-)

$ git log --oneline
54f532a feat: 涨价到 20 并加饮品清单
06bb19d feat: 咖啡站菜单初稿
```

两颗钉子上了时间线。`git log`(不加 `--oneline`)会展开完整信息——作者、时间、完整 40 位哈希。

---

## 六、故意制造一个 Bug:add 之后又改了,却没再 add

阿零想把价格定成 20。他先写 18、`add`,然后改主意写成 20,**忘了再 add**,直接提交:

```bash
$ printf 'price = 18\n' > menu.txt
$ git add menu.txt              # 此刻拍下的快照:price = 18
$ printf 'price = 20\n' > menu.txt   # 又改成 20,但没再 add
$ git commit -m "feat: 菜单定价 20"
```

提交信息写着 20,他以为大功告成。

---

## 七、读懂现象:仓库里存的竟是 18

```bash
$ git show HEAD:menu.txt         # 看仓库里这次提交存的真实内容
price = 18

$ git status
On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   menu.txt

$ git diff                       # 工作区 vs 暂存区,差在哪一行
diff --git a/menu.txt b/menu.txt
index 3822787..c8494ab 100644
--- a/menu.txt
+++ b/menu.txt
@@ -1 +1 @@
-price = 18
+price = 20
```

根因就是原理图那句红字:**`commit` 存的是暂存区快照,不是工作区现状**。`add` 那一刻价格是 18,之后改成 20 的动作没进暂存区,所以这次提交存的是 18;而 20 还孤零零躺在工作区,被 `git status` 标成 `modified`。修法一步到位:

```bash
$ git add menu.txt               # 把 20 也挑进暂存区
$ git commit -m "fix: 菜单价格实际改为 20"
$ git status
On branch main
nothing to commit, working tree clean
```

一句口诀防终身:**提交前先 `git status` 扫一眼,`git diff` 看清改了啥,再 `commit`。** 别凭"我以为改了"就盖章。

---

## 八、用命令验证:时间线站稳了

终端的验证就是**再问一遍**:

```bash
$ git status                     # 三个区是否干净
nothing to commit, working tree clean

$ git log --oneline              # 存档点是否都在
$ git show --stat HEAD           # 最后一次提交到底动了哪些文件
```

`working tree clean` + `git log` 数得清存档点 + `git show` 内容对得上——你在这条时间线上就算站稳了。

> **🪟 双系统对照 · Git Bash vs PowerShell 里跑 git**

| 干什么 | Git Bash (Linux 同款) | PowerShell 7 | 备注 |
|---|---|---|---|
| 敲 git 命令 | `git status` | `git status` | **完全一样**——git 是独立程序,不是 shell 内置,跨平台命令零差异 |
| 建文件测试 | `printf '...' > f.txt` | `Set-Content f.txt '...'` | 造文件的是 shell,写法两样;git 本身不变 |
| 看历史 | `git log --oneline` | `git log --oneline` | 一致 |
| 中文乱码 | 一般正常 | 若 log 中文变 `\xxx`,设 `git config --global core.quotepath false` | Windows 上偶发,一次性根治 |

一句话:**从今往后所有 `git xxx` 命令,Git Bash 和 PowerShell 敲的字一模一样。** 你在 Windows 练的 git 手感,100% 能带上 Linux 服务器——这正是我们把 git 单列一卷的底气。

> **🎯 面试直击**:`git add` 到底做了什么?工作区、暂存区、仓库分别存的是什么?
> `add` 把工作区改动写进**暂存区(index)**,形成"下次提交的快照草稿";`commit` 把暂存区快照永久写进**仓库**。三者关系:工作区=你正在编辑的文件,暂存区=已挑好待提交的快照,仓库=一串不可变的历史存档点。追问点:为什么要有暂存区?——它让你能**只提交一部分改动**(`git add` 挑文件、`git add -p` 挑代码块),把一次杂乱的编辑拆成几个干净的提交。

---

## 九、项目检查点 · 咖啡站进 Git v0.1

```text
已具备:git init 建仓库、add/commit 盖存档点、status/log/diff 看清三区、
        看懂哈希与 root-commit、快照陷阱免疫
还没有:所有存档都挤在一条 main 时间线上 —— 想大胆改个实验功能,
        又怕炸了主线,不敢动手
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| Git 三区心智模型 | 面试高频第一问,答不清=没真用过 Git |
| init/add/commit/log 工作流 | 任何协作岗的 0 号门票,JD 默认要求 |
| 会读 status/diff 定位改动 | Code Review 与冲突排查的地基 |

---

## 十一、下一话悬念

阿零想给咖啡站加个"会员折扣"功能,又怕改崩线上那版。他问守卫:「能不能**另开一条时间线**试,炸了不连累主线?」守卫的沙漏"啵"地裂成两股平行的沙流……

> 下一话《平行时间线:branch 与 merge》:开分支大胆试验,`merge` 汇流成果,以及**人生第一次合并冲突**——两条时间线改了同一行,Git 该听谁的?

---

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,接下来3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. Git 的"三区模型"是指哪三个区?
   - A) 本地区、远程区、缓存区　B) 工作目录、暂存区、本地仓库(.git)　C) 代码区、文档区、测试区　D) master 区、branch 区、tag 区

2. `git add` 的作用是什么?
   - A) 创建新文件　B) 将修改从工作目录添加到暂存区(索引)　C) 将修改从暂存区提交到仓库　D) 将修改推送到远程仓库

3. `git commit` 提交的是哪个区的内容?
   - A) 工作目录中的所有修改　B) 暂存区(索引)中的内容　C) 远程仓库中的内容　D) 所有未跟踪的文件

4. "add 快照陷阱"指的是什么?
   - A) `git add` 很快所以叫快照　B) `git add` 时复制了文件的**当前状态**,之后修改工作目录中的文件不会自动反映到暂存区　C) `git add` 创建的是系统快照,可以随时恢复　D) 不存在"add 快照陷阱"这个概念

5. `git log --oneline` 的输出是什么格式?
   - A) 完整的提交信息含 diff　B) 每个提交一行(简短哈希 + 提交信息)　C) 只显示最近一个提交　D) 图形化分支图

6. `git status` 会显示哪些关键信息?
   - A) 只显示当前分支名　B) 当前分支名、工作区与暂存区的状态(已修改/已暂存/未跟踪)　C) 只显示未提交的文件列表　D) 完整的提交历史

7. `git diff` 和 `git diff --staged` 的区别是什么?
   - A) 完全相同　B) `git diff` 比较工作目录与暂存区(未暂存的修改),`git diff --staged` 比较暂存区与最近一次提交(已暂存的修改)　C) `git diff` 比较两次提交,`git diff --staged` 比较分支　D) `git diff` 是简写,`--staged` 是完整形式,结果一样

8. 修改了 `a.txt`,执行 `git add a.txt`,然后又修改了 `a.txt`,此时 `git commit` 会提交哪个版本?
   - A) 第一次修改的版本(执行 add 时的快照)　B) 第二次修改的版本(最新版本)　C) 两次修改的合并版本　D) 报错,要求重新 add

9. `git commit -m "message"` 执行后,以下哪个说法**错误**?
   - A) 暂存区的内容被保存为一个新的提交　B) 工作目录中的文件被清空　C) 提交记录可以通过 `git log` 查看　D) 提交包含作者、时间戳、提交信息等元数据

10. 以下操作序列会产生什么结果:修改 `a.txt`→`git add a.txt`→修改 `a.txt`→`git commit`→`git status`?
   - A) working tree clean(干净)　B) `a.txt` 显示为已修改(modified)　C) 报错,提交失败　D) 文件被还原到 add 时的状态

### 解答题(5 道)

**Q1 概念:** 画出 Git 三区模型(工作目录、暂存区、本地仓库)的数据流向图,解释 `add` 和 `commit` 在其中的作用。

**Q2 解释:** 用"快递打包"比喻解释 Git 的 add+commit 流程:为什么需要 add(选货)而不直接 commit(发货)?

**Q3 操作:** 写出初始化一个 Git 仓库、创建 `README.md`、完成首次提交的完整命令序列。提交信息为"初始化项目"。

**Q4 排障:** 菜菜修改了 3 个文件:`a.txt`(bugfix)、`b.txt`(新功能)、`c.txt`(临时调试代码)。现在只想提交 `a.txt` 和 `b.txt`,不想提交 `c.txt`。请给出正确的操作序列。

**Q5 综合设计:** 你需要为咖啡站的 `order-service` 模块建立 Git 仓库进行版本控制:①初始化仓库 ②添加 `.gitignore` 排除 `*.log` 和 `node_modules/` ③完成首次提交 ④设计日常开发循环(add→commit→status→log)的工作流,要求每次提交前检查要提交的内容。

> [!答案]
> **1-B** 工作目录(Working Directory)=你看到的文件;暂存区(Staging Area/Index)=下一次 commit 的快照候选区;本地仓库(.git)=已提交的历史版本。**举一反三:**还有一个"远程仓库"(Remote),不在本地三区内。🪟 TortoiseGit/SourceTree 等 GUI 工具用图形化界面呈现相同的三区概念。
>
> **2-B** `git add` 把工作目录中的修改"标记为准备提交",存入暂存区(索引)。**举一反三:**`git add .` 添加所有修改;`git add -p` 交互式选择要暂存的代码块(可以选择性添加文件中的部分修改)。这就是"add 快照陷阱"的来源——add 是"拍照"而非"标记文件"。
>
> **3-B** `git commit` 只提交暂存区的内容,而不是工作目录中的所有修改!**举一反三:**如果有文件修改了但没有 `git add`,那些修改不会进入这次提交。用 `git status` 可以确认暂存区和工作区的状态。
>
> **4-B** `git add` 时拍下的"照片"(文件快照)被固定到暂存区。之后如果继续修改文件,暂存区中的快照不会自动更新,需要再次 `git add` 才会更新。**举一反三:**日常操作:改代码→add→又想改一点→改完后忘了再 add→commit 发现修改没进去→原因是"add 快照"。
>
> **5-B** `--oneline` 每个提交显示一行:`缩写哈希 提交信息`(如 `a1b2c3d Fix login bug`)。**举一反三:**`git log --oneline --graph --all` 可以查看所有分支的拓扑图;`git log --oneline -5` 限制显示最近 5 条。
>
> **6-B** `git status` 是最常用的"仪表盘":①当前分支 ②尚未暂存的修改(Changes not staged) ③已暂存待提交的修改(Changes to be committed) ④未跟踪的新文件(Untracked files)。**举一反三:**养成 `git status` 肌肉记忆——每次 commit 前、pull 前、操作后都先看一眼状态。🪟 `git status -s`(short)显示简洁格式。
>
> **7-B** `git diff`=工作目录 vs 暂存区(改了什么但还没 add);`git diff --staged`(= `git diff --cached`)=暂存区 vs 上一次 commit(add 了什么即将被 commit)。**举一反三:**`git diff HEAD`=工作目录 vs 最近一次提交(全部未提交的修改,含已暂存和未暂存);`git diff branch1..branch2`=两个分支之间的差异。
>
> **8-A** commit 只提交暂存区的内容,暂存区中保存的是第一次 add 时的快照,所以第一次修改的版本被提交。**举一反三:**这就是"陷阱"所在:第二次修改在工作目录中,但没有被重新 add,所以不在暂存区中,不会被提交。需要再跑一次 `git add a.txt` 才能提交第二次修改。
>
> **9-B** 提交后工作目录中的文件不会变化——commit 是记录,不是"清空"。**举一反三:**commit 创建了一个不可变的时间点(除非用 reset/rebase 等修改历史的操作),工作目录中的文件保持最后一次保存的状态。
>
> **10-B** 第二次修改后的 `a.txt`(未 add)仍在工作目录中,与暂存区(保存的是第一次 add 的快照)不同→`git status` 显示 `a.txt` 为 modified。**举一反三:**这就是 add 快照陷阱的经典演示:commit 之后工作目录中可能还有未暂存的修改。
>
> **Q1** 数据流向:工作目录](修改)—{`git add`}→[暂存区](准备提交)—{`git commit`}→[本地仓库 .git](版本历史)—{`git push`}→[远程仓库 GitHub]。**add 的作用:**把"要提交的内容"从工作目录选入暂存区(拍照/选货)。**commit 的作用:**把暂存区的快照永久写入仓库,产生一个不可变的版本记录(附作者、时间、信息)。**关键:**工作目录→暂存区(选择性)、暂存区→仓库(批量提交)。
>
> **Q2** 比喻:①工作目录=超市货架(你想要的东西都在上面) ②`git add`=把商品放入购物车(挑选"这次要买的东西",购物车里是照片不是实物) ③`git commit`=推购物车去结账(把购物车里的商品拍成购物小票存档,购物记录永久保留)。**为什么需要 add:**①可以分批结账(这次只提交部分修改) ②可以确认"购物车里是不是我想要的"(git diff --staged 查看即将提交的内容) ③避免一不小心把临时调试代码一起提交。
>
> **Q3** 命令序列:`git init` → `echo "# 我的项目" > README.md` → `git add README.md` → `git commit -m "初始化项目"`。**举一反三:**用 `git status` 可以在每一步之间确认状态;`git init -b main`(Git 2.28+)可以直接指定默认分支名;初始化后建议立即创建 `.gitignore`。
>
> **Q4** 正确操作:`git add a.txt b.txt`(只 add 需要提交的两个文件,`c.txt` 保持 untracked 或 modified 但不 add)→`git commit -m "bugfix: a.txt; feat: add b.txt"`。**举一反三:**`c.txt` 不会被提交是因为它不在暂存区。用 `git stash push c.txt` 可以临时保存 `c.txt` 的修改(如果已 tracked),稍后用 `git stash pop` 恢复。
>
> **Q5** 操作:①`git init order-service && cd order-service` ②`echo "*.log\nnode_modules/" > .gitignore && git add .gitignore` ③`git commit -m "初始化 order-service 仓库"` ④日常开发循环:`git status`(看状态)→`git diff`(看未暂存的修改内容)→`git add <files>`(选要提交的文件)→`git diff --staged`(确认即将提交的内容)→`git commit -m "描述本次修改"`→`git log --oneline -3`(确认提交成功)。**举一反三:**用 `git commit -v` 打开编辑器并显示 diff,可以在写提交信息时参照修改内容;`git commit --amend` 修正最近一次提交(改信息或补充文件)。

## 运行前边界、回滚与验证

- **运行前**：示例以 GNU/Linux 的 Bash 为主；先用 `command --help`、`man command` 或发行版文档确认本机版本和参数。不要把教程中的 IP、域名、用户、路径直接复制到生产机器。
- **先确认作用域**：涉及文件、仓库、容器或远端主机时，先运行 `pwd`、`whoami`、`git status`、`docker context show` 或 `ssh -G 主机别名`，确认当前目标；对重要数据先做可恢复备份。
- **完成后验证**：用只读命令确认结果，例如 `ls -la`、`git status`、`systemctl status 服务名`、`docker ps` 或 `curl -fS URL`；失败时停止扩大操作范围，先读报错。
- **删除边界**：`rm`/`Remove-Item` 不会进入回收站。先用 `ls -- 路径` 或 PowerShell 的 `-WhatIf` 预演；避免对变量、通配符或当前目录直接使用递归强制删除。
