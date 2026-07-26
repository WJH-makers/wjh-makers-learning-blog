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

*本话属于连载《从零开始玩命令行》。全卷地图见 [/cli](/cli);前作《从零开始学 Java》见 [/java](/java)。*
