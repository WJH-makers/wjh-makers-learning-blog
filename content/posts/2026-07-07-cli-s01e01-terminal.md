---
title: "《从零开始玩命令行》01 · 只有一个光标的世界"
date: 2026-07-07
summary: "咖啡站上云了,可阿零第一次 ssh 进真实服务器才发现:没有图标、没有鼠标,只有一个闪烁的光标。特米登场,教他在黑屏里迈出第一步——pwd、ls、cd 与文件系统树。"
tags: [Linux, 命令行, 终端漫画, ssh, 阿零与特米]
---

# 《从零开始玩命令行》01 · 只有一个光标的世界

> 连载特刊 · 第二部《从零开始玩命令行》第 1 卷「终端点火篇」第 1 话
> 长期项目:**把豆豆咖啡站部署上真实服务器**。前作《从零开始学 Java》全 56 话见 [/java](/java)。

---

## 一、需求:云上的家,你还没进去看过一眼

咖啡站在第七季风风光光上了云。可某天豆豆幽幽地问:「服务器就是你的店面。你在云控制台点了几百次鼠标——**店里面,你进去看过一眼吗?**」

阿零打开终端,按照文档敲下第一行:

```bash
ssh ubuntu@server-ip
```

回车。屏幕一黑——**没有桌面、没有图标、没有鼠标指针**。只有一行字和一个闪烁的光标:

```text
ubuntu@coffee-server:~$ █
```

阿零(僵住):「这……就是服务器的全部?」

---

## 二、漫画 · 特米登场

> **〔1〕** 漆黑的屏幕上只有一个光标,一下、一下地闪。阿零下意识伸手摸鼠标——手边空空如也。
> 阿零:「Java 我都写完七季了,现在你告诉我**连点的地方都没有**?」

> **〔2〕** 光标忽然"啵"地裂开,钻出一只圆滚滚的企鹅机器人,肚皮上一个 `>_` 标志。
> 特米:「我叫**特米**,住在终端里。这里不用点。**你说,它做。**」

> **〔3〕** 特米指着那行字:`ubuntu@coffee-server:~$`
> 特米:「这叫**提示符**,是服务器在报家门:`ubuntu` 是你的身份,`coffee-server` 是这台机器,`~` 是你现在站的位置,`$` 是它在说——**该你了**。」

> **〔4〕** 阿零壮着胆子敲了 `pwd`,回车,屏幕吐出 `/home/ubuntu`。
> 阿零:「它、它回话了!」特米(淡定):「一问一答。这就是 **shell**——你和机器之间的翻译官。」

> **〔5〕** 阿零想进咖啡站的目录,敲 `cd Coffee`,屏幕冷冷回了句 `No such file or directory`。
> 特米:「这个世界**大小写有别**,拼错一个字母就是查无此地。别猜——**先 `ls` 看清楚,再 `cd` 走过去**。」

> **〔6〕** 阿零按顺序敲完 `ls`、`cd coffee-shop`、`pwd`,提示符里的 `~` 变成了 `~/coffee-shop`。
> 特米:「恭喜,你在没有鼠标的世界里,**学会走路了**。」

---

## 三、本话目标

- 用 `ssh` 登进一台真实服务器,看懂**提示符**在告诉你什么;
- 理解 **shell**:你和内核之间的命令翻译官,一问一答;
- 三个立足指令:`pwd`(我在哪)、`ls`(这有什么)、`cd`(去那边);
- 建立**文件系统树**的心智模型(`/` 根、`~` 家);
- 踩一次「大小写敏感 + 路径不存在」的第一跤。

---

## 四、原理图:一棵倒着长的树

```text
终端(窗口) → shell(翻译官,如 bash/zsh) → 内核(真正干活)

文件系统:一棵从 / 长出来的树,没有 C: D: 盘符
/                       根:一切从这里出发
├── home/
│   └── ubuntu/         ← 你的家,简写 ~
│       └── coffee-shop/
├── etc/                配置(以后常来)
├── var/log/            日志(排障常来)
└── usr/bin/            大部分命令的真身

pwd  = print working directory  我在树上的哪个枝
ls   = list                     这根枝上挂着什么
cd   = change directory         挪到另一根枝
```

三条立刻要记的规矩:**① 一切皆路径,大小写敏感;② `~` 是家,`/` 开头是绝对路径;③ 迷路先 `pwd`,别瞎猜。**

---

## 五、上手:立足三连

```bash
$ pwd                       # 我在哪
/home/ubuntu

$ ls                        # 这有什么
coffee-shop  logs  notes.md

$ ls -la                    # 加料:隐藏文件 + 详细信息(以 . 开头的是隐藏文件)
drwxr-xr-x 4 ubuntu ubuntu 4096 Sep 19 10:00 .
-rw-r--r-- 1 ubuntu ubuntu  220 Sep 19 09:00 .bashrc
drwxr-xr-x 2 ubuntu ubuntu 4096 Sep 19 10:00 coffee-shop

$ cd coffee-shop            # 走过去
$ pwd
/home/ubuntu/coffee-shop

$ cd ..                     # .. = 上一级
$ cd                        # 不带参数 = 回家(~)
```

> **特米旁白**:`ls -la` 里那串 `drwxr-xr-x` 是权限九宫格,第 4 卷专门拆;现在你只需认得开头的 `d` = 目录、`-` = 文件。

---

## 六、故意制造一个 Bug:凭感觉 cd

阿零记得目录叫「Coffee 什么的」,直接凭感觉敲:

```bash
$ cd Coffee-Shop
```

---

## 七、读懂真实报错

```text
-bash: cd: Coffee-Shop: No such file or directory
```

三段式读法,以后所有 shell 报错都长这样:

- `-bash:` —— 谁在说话(bash 这个 shell);
- `cd:` —— 哪个命令出的事;
- `Coffee-Shop: No such file or directory` —— 它去找了,**没有这个地方**。

根因:真名是 `coffee-shop`——**Linux 大小写敏感**,`Coffee-Shop` 和 `coffee-shop` 是两个完全不同的名字(Windows 用户最容易在这摔第一跤)。修法就是漫画里那句口诀:**先 `ls` 看清真名,再 `cd`;或者敲前几个字母按 `Tab` 让它自己补全**——补不出来,就说明名字错了,Tab 还是你的拼写检查器。

> **🪟 双系统对照 · 今天这三招,Windows 上怎么打**

| 干什么 | Linux (bash) | PowerShell | 备注 |
|---|---|---|---|
| 我在哪 | `pwd` | `Get-Location`(别名就叫 `pwd`) | 无痛 |
| 这有什么 | `ls -la` | `Get-ChildItem -Force`(别名 `ls`/`dir`) | `-Force` 才显示隐藏项 |
| 去那边 | `cd coffee-shop` | `Set-Location`(别名 `cd`) | 无痛 |
| 大小写 | **敏感** | **不敏感** | 本话的坑在 Windows 上根本不报错——所以换到服务器才格外容易翻车 |

PowerShell 给三大件都留了同名别名——你在 Windows 终端练的手感,80% 能直接带上服务器。

> **🎯 面试直击**:终端(Terminal)和 shell 是一回事吗?
> 不是。**终端**是那个窗口(输入输出的仿真设备),**shell** 是窗口里运行的**命令解释程序**(bash、zsh、PowerShell 都是 shell)。你在终端里打字,shell 负责解释并调内核干活。追问:`echo $SHELL` 可以看当前登录 shell;换个 shell(如 zsh)终端窗口不用换。

---

## 八、用命令验证:你真的站稳了

不用 JUnit,终端的验证就是**再问一遍**:

```bash
$ whoami            # 我是谁
ubuntu
$ echo $SHELL       # 谁在替我翻译
/bin/bash
$ pwd               # 我在哪(任何时候迷路,先敲它)
/home/ubuntu/coffee-shop
```

三问三答都对,你在这个世界就算站住了。

---

## 九、项目检查点 · 服务器探索 v0.1

```text
已具备:ssh 登录、看懂提示符、pwd/ls/cd 三连、文件系统树心智模型、大小写警觉
还没有:只能看,不能创造 —— 文件读不了内容、目录建不出来
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| ssh 登录与终端基本功 | 「熟悉 Linux 常用命令」的第 0 行 |
| 文件系统树 / 路径 | 一切部署、排障、脚本的地基 |
| 会读 shell 报错 | 和读 Java 栈轨迹同级的生存技能 |

---

## 十一、下一话悬念

能走了,可阿零想看一眼咖啡站的配置文件——**打不开**;想建个 `backup` 目录——**不会建**。这个世界暂时还是「只读」的。

> 下一话《查看与创建》:`cat` / `less` 读文件,`mkdir` / `touch` 造东西,再顺手认识 `echo` 和它身后那个改变一切的 `>` 符号。

---

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,接下来3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. 以下哪一项是 SSH 远程登录服务器的命令格式?
   - A) `ssh user@host`　B) `ssh host@user`　C) `ssh -u user host`　D) `ftp user@host`

2. 提示符 `ubuntu@coffee-server:~$` 中,`~` 代表什么?
   - A) 系统根目录　B) 当前用户的 home 目录　C) 临时目录　D) 最后一个访问的目录

3. 执行 `pwd` 命令的作用是?
   - A) 修改当前工作目录　B) 列出当前目录下的文件　C) 打印当前工作目录的绝对路径　D) 切换到上级目录

4. 用户位于 `/home/ubuntu/projects`,执行 `cd ..` 后,`pwd` 输出是什么?
   - A) `/home/ubuntu`　B) `/home`　C) `/home/ubuntu/projects/..`　D) `/`

5. 在 Linux 中,以下哪两个文件名会被视为**同一个文件**?
   - A) `Readme.md` 和 `readme.md`　B) `Readme.md` 和 `README.md`　C) `readme.md` 和 `README.md`　D) 以上都不是,Linux 大小写敏感

6. 报错 `No such file or directory` 的第一排查步骤是什么?
   - A) 重新安装系统　B) `ls` 列出当前目录确认文件名拼写和大小写　C) 重启终端　D) 用 `sudo` 再执行一次

7. 以下路径中,哪个是**绝对路径**?
   - A) `../var/log`　B) `./config/app.conf`　C) `/etc/nginx/nginx.conf`　D) `~/.ssh/id_rsa`

8. 执行 `cd /var/log && cd ../../home/ubuntu` 后,最终所在目录是什么?
   - A) `/var/log/home/ubuntu`　B) `/home/ubuntu`　C) `/var/home/ubuntu`　D) `/var/../home/ubuntu`

9. 关于 Linux 文件系统树,以下说法**错误**的是?
   - A) 所有文件和目录都挂在唯一的根 `/` 下　B) `.` 代表当前目录,`..` 代表父目录　C) `~` 永远等于 `/root`　D) `/` 是文件系统树的根节点

10. 在 `~/projects/coffee` 目录下执行 `cd /etc` 然后执行 `cd -`,最终在哪个目录?
   - A) `/etc`　B) `/home`　C) `~/projects/coffee`　D) `/root`

### 解答题(5 道)

**Q1 概念:** 简述提示符 `user@host:path$` 各部分的含义,以及 `$` 与 `#` 的区别。

**Q2 解释:** 为什么执行 `cd Coffee` 报错,但执行 `ls` 后发现目录名实际是 `coffee`?请用"大小写敏感"和"报错三段式读法"解释排查过程。

**Q3 操作:** 写出从任意位置一步跳转到 `/var/log` 目录的命令,然后列出其中所有文件,再快速返回上一次所在目录的完整操作序列。

**Q4 排障:** 某同学 ssh 登录后,在 home 目录下执行 `cd downloads` 报 `No such file or directory`,但 `ls` 显示 `Downloads` 目录存在。请诊断错误原因并给出两种解决方案。

**Q5 综合设计:** 你需要在服务器上快速查看项目结构:已知道路根 `/home/deploy/app`,目录树为 `app/src/main/java/com/coffee/`,请写出从登录到定位该目录的完整路径导航策略(含确认每一步的命令)。

> [!答案]
> **1-A** SSH 命令格式为 `ssh 用户名@主机地址`。**举一反三:**还可以指定端口 `ssh -p 2222 user@host`,默认端口 22。🪟 Windows 中可用 `ssh` 命令(PowerShell 内置 OpenSSH 客户端),也可用 PuTTY 等图形工具。
>
> **2-B** `~` 是当前用户 home 目录的缩写。**举一反三:**`echo ~` 可以展开查看实际路径,通常是 `/home/username`。🪟 Windows PowerShell 中 `~` 同样代表 `C:\Users\用户名`。
>
> **3-C** `pwd` = Print Working Directory。**举一反三:**`pwd -P` 会显示物理路径(解析所有符号链接),`pwd -L` 显示逻辑路径(默认)。
>
> **4-A** `..` 代表父目录,所以从 `/home/ubuntu/projects` 上移一层是 `/home/ubuntu`。**举一反三:**`cd ../..` 可以连上两层,`cd -` 返回上一个目录。
>
> **5-D** Linux 文件系统严格区分大小写,`Readme.md`、`readme.md`、`README.md` 是三个不同的文件。**举一反三:**Windows 文件系统不区分大小写(保留大小写但不敏感),所以 `Readme.md` 和 `readme.md` 在 Windows 上指向同一文件。🪟 这是跨平台开发最常见的坑之一——在 Windows 上开发正常,部署到 Linux 后文件名找不到。
>
> **6-B** 报错三段式读法:①看命令名有无拼错 ②看文件/目录名(注意大小写)③看路径前缀。第一时间 `ls` 确认实际的目录内容。**举一反三:**`ls -la` 可以列出隐藏文件(以 `.` 开头的文件),有时目标文件是隐藏的。
>
> **7-C** 绝对路径以 `/` 开头,从根目录出发。A、B 是相对路径,D 的 `~` 虽然展开后是绝对路径,但写法本身不是以 `/` 开头的"纯"绝对路径形式。**举一反三:**写脚本时一律用绝对路径最安全,避免因工作目录不同而出错。
>
> **8-B** `cd /var/log` 到达 `/var/log`;`cd ../../home/ubuntu` 从 `/var/log` 上两层到 `/`,再进入 `/home/ubuntu`。**举一反三:**在脑中把 `..` 拆成"上一层",逐层追踪即可。🪟 PowerShell 也支持 `..` 语法。
>
> **9-C** `~` 展开为当前用户的 home 目录;普通用户是 `/home/username`,root 用户才是 `/root`。所以 `~` 永远等于 `/root` 是错的。**举一反三:**用 `echo ~` 和 `echo ~root` 可以分别查看自己和其他用户的 home 目录。
>
> **10-C** `cd /etc` 切换到 `/etc`;`cd -` 返回上一个工作目录即 `~/projects/coffee`。**举一反三:**`cd -` 只能切回上一次的位置,不是历史栈;如果需要更复杂的目录跳转,可以用 `pushd`/`popd`。
>
> **Q1** 提示符 `user@host:path$` 各部分:①`user`=当前登录用户名 ②`host`=主机名 ③`path`=当前工作目录(`~`=home) ④`$`=普通用户,`#`=root 超级用户。**举一反三:**提示符由环境变量 `PS1` 控制,可用 `echo $PS1` 查看格式模板。🪟 PowerShell 提示符默认 `PS C:\Users\user>` ,由 `prompt` 函数控制。
>
> **Q2** Linux 大小写敏感,`coffee`≠`Coffee`。排查过程:①看到 `No such file or directory` ②定位"哪个文件/目录不存在"→`Coffee` ③`ls` 列出实际内容,发现是 `coffee` ④结论:大小写不匹配。**举一反三:**所有 Linux 命令、文件名、路径都区分大小写,习惯性先用 `ls` 再 `cd`。
>
> **Q3** 操作序列:`cd /var/log` → `ls -la` → `cd -`。**举一反三:**也可以 `ls /var/log` 不切换目录直接查看;`cd -` 利用 `OLDPWD` 环境变量记录上次位置。
>
> **Q4** 错误原因:`Downloads` 首字母大写,`downloads` 全小写不匹配。方案一:`cd Downloads`(纠正大小写);方案二:先 `ls` 确认准确名称再 `cd`。**举一反三:**养成习惯——不盲敲路径,先 `ls` 后 `cd`;可用 Tab 键自动补全避免拼写错误。
>
> **Q5** 导航策略:①`ssh user@server` 登录 ②`pwd` 确认在 home ③`cd /home/deploy/app` 或逐层 `cd /home`→`cd deploy`→`cd app` ④`pwd` 确认 ⑤`cd src/main/java/com/coffee` 到达目标 ⑥`ls -la` 查看项目文件。全程每步用 `pwd`+`ls` 确认位置。**举一反三:**实际工作中可以用 `tree -L 3` 可视化目录树,或直接 `cd /home/deploy/app/src/main/java/com/coffee` 一步到位。

## 运行前边界、回滚与验证

- **运行前**：示例以 GNU/Linux 的 Bash 为主；先用 `command --help`、`man command` 或发行版文档确认本机版本和参数。不要把教程中的 IP、域名、用户、路径直接复制到生产机器。
- **先确认作用域**：涉及文件、仓库、容器或远端主机时，先运行 `pwd`、`whoami`、`git status`、`docker context show` 或 `ssh -G 主机别名`，确认当前目标；对重要数据先做可恢复备份。
- **完成后验证**：用只读命令确认结果，例如 `ls -la`、`git status`、`systemctl status 服务名`、`docker ps` 或 `curl -fS URL`；失败时停止扩大操作范围，先读报错。
- **权限边界**：先用 `stat`/`ls -ld` 查所有者和现有权限；按最小权限原则修改，避免 `chmod -R 777`。`sudo` 仅用于明确的单条命令，不在不理解的脚本前盲加。
- **远端边界**：首次连接核验主机指纹；传输前先确认目标路径和账号，`rsync` 删除模式必须先加 `--dry-run`。远程改网络或防火墙时保留一个已登录会话和云控制台回退路径。
- **网络边界**：远程启用防火墙前先放行当前 SSH 入口；修改 Nginx 后先 `nginx -t`，通过后再 reload，并从外部和本机两侧验证端口与 HTTP 状态。


*本话属于连载《从零开始玩命令行》。全卷地图见 [/cli](/cli);前作《从零开始学 Java》见 [/java](/java)。*
