---
title: "《从零开始玩命令行》04 · 路径、通配与补全"
date: 2026-09-22
summary: "事故复盘揭开真相:rm 从没见过 *,是 shell 把它换成了名单。这一话补上走路的地基:绝对与相对路径、~ 与 cd -、echo 预览展开、Tab 补全与 Ctrl+R。阿零又摔两跤——*.log 无匹配时原样传给命令,相对路径站错目录直接找错人。"
tags: [Linux, 命令行, 终端漫画, 通配符, Tab 补全, 阿零与特米]
---

# 《从零开始玩命令行》04 · 路径、通配与补全

> 连载特刊 · 第二部《从零开始玩命令行》第 1 卷「终端点火篇」第 4 话
> 长期项目:**把豆豆咖啡站部署上真实服务器**。前作《从零开始学 Java》全 56 话见 [/java](/java)。

---

## 一、需求:手速全靠蛮力,是走不远的

事故复盘会。特米把昨天那条 `rm * .tmp` 投在肚皮屏幕上,一格一格回放:「元凶不是 rm,是你**看不见的中间人**。今天不学新命令——学走路的姿势。」

阿零也有一肚子苦水:昨天往返 `/var/log` 和 `~/coffee-shop/config` 抄日志、对配置,一条路径十几个字符,**目录名敲错三遍**;同一条长命令,重敲了五次。

特米:「高手的手速,是**少敲字**,不是敲得快。」

---

## 二、漫画 · 看不见的中间人

> **〔1〕** 阿零满头大汗地敲 `/home/ubuntu/coffee-shop/config/app.conf`,第三次把 `coffee` 敲成 `cofee`。
> 特米:「你在用手速弥补路标意识。先认路,再赶路。」

> **〔2〕** 特米在肚皮上画出一棵树:
> 特米:「**绝对路径**从根 `/` 说起,是完整住址,在哪敲都一个意思;**相对路径**从『你现在站的地方』出发——**锚点错,全错**。`~` 是家,`..` 是上一级。」

> **〔3〕** 阿零学会 `cd -`,在 `/var/log` 和家之间弹来弹去,玩得不亦乐乎。
> 阿零:「传送门!回去还能再回来!」特米:「`-` 记的是『上一个目录』,只有一格记忆,别当时光机。」

> **〔4〕** 特米回放昨天的事故,把 `*` 圈出来:
> 特米:「rm 从头到尾**没见过这个星号**。shell 先把它换成文件名单,rm 拿到的是名单。想看名单长啥样?——`echo` 一下,谁也删不掉的安全演习。」

> **〔5〕** 阿零敲 `cd ~/cof` 按下 Tab,目录名自己长完整了;双击 Tab,候选齐刷刷列出来。
> 阿零:「它、它会自动补!」特米:「Tab 补得出来,名字就是对的;**补不出来,先怀疑拼写**——它还是你的拼写检查器。」

> **〔6〕** 特米按住阿零的手,Ctrl+R,敲三个字母,昨天那条长命令原地复活。
> 特米:「敲过的命令都在 history 里。会走路之后,第二课是**别走重复的路**。」

---

## 三、本话目标

- 分清**绝对路径**(`/` 开头,处处等价)与**相对路径**(锚在当前目录);
- 四个路标:`~` 家、`.` 这里、`..` 上一级、`cd -` 弹回刚才的地方;
- 看穿 `*`:通配符由 **shell** 展开,命令收到的是名单;`echo` 就是预览器;
- 记住 glob 的怪脾气:**无匹配时,模式原样传给命令**;
- Tab 补全(双击列候选)与 `history` / `!!` / Ctrl+R,把蛮力手速换成准确率。

---

## 四、原理图:你敲的 ≠ 命令收到的

```text
一条命令的旅程:

  你敲:    cp  ~/coffee-shop/src/*.js  backup/
               │
               │  shell 预处理(在 cp 启动之前):
               │   ① ~      → /home/ubuntu            (家目录展开)
               │   ② *.js   → menu.js order.js         (glob 按磁盘上实际有的文件展开)
               │   ③ backup/ 是相对路径,原样留给 cp 拿"当前目录"去拼
               ▼
  cp 收到:  cp /home/ubuntu/coffee-shop/src/menu.js /home/ubuntu/coffee-shop/src/order.js backup/

路标速记:
  /home/ubuntu/coffee-shop   绝对路径:从根说起的完整住址
  config/app.conf            相对路径:从"当前目录"出发 —— 先确认你站在哪
  ~ = /home/ubuntu     . = 这里     .. = 上一级     cd - = 弹回上一个目录

glob 两条脾气:
  有匹配 → 换成名单(命令看到的是文件名,不是星号)
  无匹配 → 模式原样传给命令(命令多半一脸懵地报错)
```

一句话:**绝对路径是住址,相对路径是"从这里走两步"——瞟一眼提示符,确认你站在哪,再迈腿。**

---

## 五、上手:路标、预览、补全三连

路标:

```bash
$ cd /var/log                   # 绝对路径:在哪敲都去同一个地方
$ pwd
/var/log
$ cd -                          # 弹回上一个目录(它还会把去处报出来)
/home/ubuntu
$ cd coffee-shop/src            # 相对路径:从当前目录出发
$ cd ../..                      # 连跳两级回家
$ pwd
/home/ubuntu
```

预览展开(把昨天的事故变成安全演习):

```bash
$ cd ~/coffee-shop
$ echo *                        # * = 当前目录的所有名字(. 开头的隐藏文件除外)
config logs src
$ echo src/*.js                 # 先看名单——这是谁也删不掉的预演
src/menu.js src/order.js
$ ls src/*.js                   # 名单没问题,再把 echo 换成真命令
src/menu.js  src/order.js
```

补全与历史:

```bash
$ cd ~/cof<Tab>                 # 敲前几个字母按 Tab → 自动补成 coffee-shop/
$ ls ~/coffee-shop/<Tab><Tab>   # 双击 Tab:列出全部候选,像下拉菜单
config/  logs/  src/
$ history                       # 敲过的命令都有编号(节选)
   41  echo *
   42  echo src/*.js
   43  ls src/*.js
$ !!                            # 重跑上一条(屏幕会先回显 ls src/*.js 再执行)
```

> **特米旁白**:Ctrl+R 是历史的搜索框——按下后敲几个字母,出现 `` (reverse-i-search)`conf': cat config/app.conf ``,回车执行,Esc 放弃,再按 Ctrl+R 找更早的。**长命令只敲一次**,是这个世界的礼仪。

---

## 六、故意制造一个 Bug:两跤,一次摔完

第一跤:阿零想看日志,人站在 `~/coffee-shop`(日志其实在 `logs/` 子目录里),直接敲:

```bash
$ ls *.log
```

第二跤:他 `cd` 回了家,脑子却还留在 `coffee-shop`,想把配置备份一份:

```bash
$ cp config/app.conf backup/
```

---

## 七、读懂真实报错

**坑一**,glob 无匹配的怪脾气:

```text
ls: cannot access '*.log': No such file or directory
```

看清楚:报错里的是 **`*.log` 本身**。当前目录没有任何名字匹配 `*.log`(`logs` 是目录名,不以 `.log` 结尾),于是 shell 把模式**原样**递给了 ls——ls 真去找一个叫 `*.log` 的文件。上一话结尾那行报错,谜底在这。修法:把路径写对(`ls logs/*.log`);写脚本时可用 `shopt -s nullglob` 让"无匹配"变成"空",现在先混个脸熟。反过来,想让 `*` 保持字面——**用引号拦住 shell**:以后见到命令里带引号的 `"*.js"`,都是在**防 shell 抢跑**。

**坑二**,相对路径锚错了地方:

```text
cp: cannot stat 'config/app.conf': No such file or directory
```

`cannot stat` = 按这个路径没摸到东西。根因:相对路径锚在**当前目录**——他人在 `/home/ubuntu`,而 `config/` 长在 `~/coffee-shop` 底下。命令没错,路径没错,**站的地方错了**。修法三条:① 迷路先 `pwd`(第 1 话的规矩,今天升级成肌肉记忆);② 提示符把当前位置写在脸上,养成瞟一眼的习惯;③ 关键操作用绝对路径或 `~` 开头写全,**不赌自己站在哪**。

> **🪟 双系统对照 · 走路的姿势,PowerShell 版**

| 干什么 | Linux (bash) | PowerShell 7 | 关键差异 |
|---|---|---|---|
| 回家 | `cd ~` / `cd` | `cd ~` | 家在 `$env:USERPROFILE`,`~` 两边都认 |
| 弹回上一处 | `cd -` | `cd -`(还有 `cd +` 往回弹) | PS 6.2+ 才有;老 Windows PowerShell 5 没有 |
| 通配符 | **shell 展开**后给命令 | **原样传给 cmdlet**,由它自己解释 | bash 里命令看不到 `*`;PS 里 cmdlet 亲自处理 |
| 无匹配时 | `'*.log'` 原样传入 → 命令报错 | `Get-ChildItem *.log` 返回**空集合**,不吭声 | bash 吵,PS 静——各有各的坑法 |
| 补全 | Tab 补全,双击列候选 | Tab 轮换候选;Ctrl+Space 弹菜单(PSReadLine) | 交互不同,肌肉记忆各练各的 |
| 搜历史 | Ctrl+R 增量搜索 | Ctrl+R(PSReadLine 同款) | 无痛——这条肌肉记忆全平台通用 |
| 重跑上一条 | `!!` | `Invoke-History`(别名 `r`) | PS 没有 `!` 展开这套黑话 |

又见那条哲学分水岭:bash 把 `*` 展开成**文本名单**塞给命令;PS 把模式交给 cmdlet,返回的是**对象集合**——空了就是空集合,连报错都懒得报。

> **🎯 面试直击**:bash 里通配符是谁展开的?没有匹配时会发生什么?
> 是 **shell** 在命令启动前展开(globbing),命令的 argv 里收到的已经是文件名清单;无匹配时 bash 默认把模式**原样**传给命令(多半引发 No such file 报错),可用 `nullglob` / `failglob` 改变这个行为。追问:这正是 `rm *` 类事故的原理——rm 看不到星号,只看到 shell 给的名单;所以预演的标准姿势是先用 `echo` 跑一遍同样的模式。

---

## 八、用命令验证:先定锚,再出手

```bash
$ pwd                                   # 第一步永远是确认锚点
/home/ubuntu
$ echo coffee-shop/logs/*.log           # 第二步预览名单
coffee-shop/logs/access.log
$ cp ~/coffee-shop/config/app.conf backup/   # 关键操作用 ~ 写全,不赌 cwd
$ ls backup
2026  app.conf  coffee-shop-0921  memo-0921.txt  notes.md.bak
```

`pwd` → `echo` 预览 → 真命令,三步一套。多敲的那两下,是买给昨天那种事故的保险。

---

## 九、项目检查点 · 服务器探索 v0.4

```text
已具备:绝对/相对路径与四个路标(~ . .. cd -)、* 展开真相与 echo 预演、
        无匹配原样传递的怪脾气、引号拦展开、Tab/双击 Tab、history / !! / Ctrl+R
还没有:参数还是靠背 —— tail 的跟随是 -f 还是 -F?rm 少啰嗦是 -i 还是 -I?
        记不住,又不敢在服务器上乱试
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 路径心智(绝对/相对/锚点) | 一切脚本、Dockerfile、CI 配置里 WORKDIR 与相对引用的地基 |
| shell 展开原理 | 面试高频题,也是安全操作规范的底层认知 |
| Tab / Ctrl+R 效率操作 | 「命令行操作熟练」在终端前的直观体现 |

---

## 十一、下一话悬念

深夜,阿零在纸上抄小抄,已经写到第三页:「`tail` 跟随是 `-f`……`rm` 少问是大 `-I`……`cp` 递归是小 `-r`……」越抄越心虚:这辈子背得完吗?

特米一屁股坐在小抄上,肚皮亮出四个字:**man 一下**。「我这句口头禅你听了四话了。这个世界的说明书从来不用背——**它就住在这台机器里**。明天,授人以渔。」

> 下一话《求助系统:man 一下》:man 的分节暗号、SYNOPSIS 方括号与省略号的读法、`--help` 快查与 tldr——第 1 卷收官之战。

---

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,接下来3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. 相对路径的参照起点是什么?
   - A) 根目录 `/`　B) 当前工作目录(pwd)　C) 用户的 home 目录　D) `/usr/local`

2. `cd -` 的作用是?
   - A) 切换到 home 目录　B) 切换到根目录　C) 切换到上一次所在的工作目录　D) 切换到父目录

3. Tab 键在命令行中的主要功能是?
   - A) 执行命令　B) 显示帮助　C) 自动补全文件名/命令名/路径　D) 清空当前行

4. 当前目录有两个文件 `app.log`、`error.log`,执行 `ls *.log` 时,shell 实际执行的是?
   - A) `ls "*.log"`　B) `ls app.log error.log`　C) `ls`　D) `ls '*。log'`

5. 绝对路径和相对路径各有优劣,以下哪条适合在 **shell 脚本**中使用?
   - A) 相对路径,因为更短　B) 绝对路径,因为不依赖当前工作目录　C) 两者没区别　D) 混合使用,看心情

6. Ctrl+R 快捷键的功能是什么?
   - A) 重启终端　B) 反向搜索命令历史(reverse-i-search)　C) 清屏　D) 撤销上一条命令

7. 在 `/home/user/docs` 下执行 `cd ../../var/log`,等价于?
   - A) `cd /var/log`　B) `cd /home/var/log`　C) `cd /home/user/var/log`　D) `cd /home/user/docs/var/log`

8. 关于 glob 通配符,以下哪种写法可以匹配 `file1.txt`、`file2.txt`、`file10.txt`,但**不能**匹配 `file.txt`?
   - A) `file*.txt`　B) `file?.txt`　C) `file[0-9]*.txt`　D) `file+([0-9]).txt`

9. 用户在 `/tmp/a/b/c` 目录,想用一条命令直接回到 home 目录并列出所有文件,正确的是?
   - A) `cd && ls`　B) `cd ~ && ls`　C) `cd; ls`　D) 以上都可以

10. 以下关于路径的说法,**全部正确**的是?
   - A) `~` 永远是 `/home/用户名`　B) `.` 代表父目录,`..` 代表当前目录　C) `cd /` 回到 home 目录　D) 以上都不全对

### 解答题(5 道)

**Q1 概念:** 什么是以 `/` 开头的绝对路径和以 `./`、`../` 或不带前缀的相对路径?举例说明两者的转换关系。

**Q2 解释:** Shell glob 展开和正则表达式是同一回事吗?通过 `*.txt` 和 `.*\.txt` 说明 glob 与正则的核心差异。

**Q3 操作:** 假设当前目录是 `/var/log/nginx`,写出三条不同的方法回到 `/var/log` 目录。

**Q4 排障:** 菜菜敲 `cat /etc/ngnix/nginx.conf`,报 `No such file or directory`。他确定配置一定在 `/etc/` 下。请列出排查思路。

**Q5 综合设计:** 你需要查一个日志文件,只记得文件名中有 `access` 和日期 `202609`,但不确定文件在哪个子目录、后缀是 `.log` 还是 `.txt`。请设计一套搜索策略(利用 Tab 补全、Ctrl+R、find、glob 等工具)。

> [!答案]
> **1-B** 相对路径从当前工作目录(即 `pwd` 输出)出发。**举一反三:**写脚本时如果使用相对路径,一定要在脚本开头 `cd` 到确定位置,或全部用绝对路径。
>
> **2-C** `cd -` 切换到 `$OLDPWD` 环境变量记录的上一个工作目录。**举一反三:**`cd -` 只能在两个目录间来回切换;需要多级历史可以用 `pushd`/`popd` 目录栈。
>
> **3-C** Tab 补全是命令行效率的核心——补全文件名、目录名、命令名,减少拼写错误。**举一反三:**连按两次 Tab 显示所有可能的补全选项;Bash 中 `Tab` 默认补全,可安装 `bash-completion` 扩展更多命令的补全支持。🪟 PowerShell 的 Tab 补全同样好用,且支持参数名补全。
>
> **4-B** Shell 在执行命令前先把 `*.log` 展开为 `app.log error.log`,然后执行 `ls app.log error.log`。**举一反三:**这就是"globbing"——`rm` 等命令收到的不是通配符,而是已展开的文件列表。
>
> **5-B** 脚本中用绝对路径最安全,因为脚本可能在任意工作目录被调用,相对路径会导致找不到目标。**举一反三:**脚本最佳实践:`SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"` 先定位脚本自身目录,然后基于该绝对路径引用其他文件。
>
> **6-B** Ctrl+R 进入反向增量搜索模式,边输入边匹配历史命令中的最近一条。**举一反三:**再按一次 Ctrl+R 跳到下一个匹配;Ctrl+Shift+R 正向搜索;`history | grep keyword` 也可以检索。🪟 PowerShell 中 Ctrl+R 同样支持历史搜索(PSReadLine 模块)。
>
> **7-A** 从 `/home/user/docs`→`cd ..`→`/home/user`→`cd ..`→`/home`→`cd ../..`→`/`→`cd var/log`→`/var/log`。等价于直接 `cd /var/log`。**举一反三:**`.。/.。` 手动追踪很容易出错,实际场景中优先使用绝对路径或 Tab 补全。
>
> **8-D** `file+([0-9]).txt`(需启用 extglob)精确匹配文件名主体后跟至少一个数字。`?` 只匹配单个字符,所以 `file?.txt` 不能匹配 `file10.txt`(数字>1位)。`*` 匹配任意长度,所以 `file*.txt` 也会匹配 `file.txt`。**举一反三:**glob 的 `?`=任意单个字符,`*`=任意长度任意字符,`[abc]`=字符集。
>
> **9-D** `cd`(无参数)默认回到 home,`cd ~` 也是。`&&` 和 `;` 都可以串联命令,前者要求前一步成功才执行。**举一反三:**`cd ~/projects` 等价于 `cd /home/user/projects`(假设用户 home 为 `/home/user`)。
>
> **10-D** A:`~` 对 root 用户是 `/root`;B:`.` 是当前,`..` 是父目录;C:`cd /` 去根目录。所以三条都不完全正确。**举一反三:**基础概念务必准确——`.`≠`..`, `/`≠`~`, `cd`≠`cd /`。
>
> **Q1** 绝对路径:从根 `/` 出发的完整路径,如 `/etc/nginx/nginx.conf`;无论当前在哪都可以准确定位。相对路径:从当前工作目录 `pwd` 出发,如 `../config/app.conf`。**转换:**已知 pwd=`/home/user`,相对路径 `projects/coffee` 的绝对形式是 `/home/user/projects/coffee`;绝对路径 `/etc/passwd` 相对于 `/` 的相对路径是 `etc/passwd`。
>
> **Q2** 不是同一回事。Glob 用于文件名匹配,语法简单:`*`=任意字符,`?`=单字符,`[...]`=字符集。正则表达式用于文本内容匹配,语法更丰富:`.`=任意字符,`*`=前一元素重复0+次,`\`=转义。**举例:**glob `*.txt` 匹配所有 `.txt` 文件;正则 `.*\.txt` 匹配文本中任何以 `.txt` 结尾的字符串(其中 `\.` 转义了 `.` 字符)。**何时用哪个:**`ls`/`find -name` 用 glob;`grep`/`sed` 用正则。
>
> **Q3** 方法一:`cd ..`;方法二:`cd /var/log`(用绝对路径);方法三:`cd -`(如果上次就在 `/var/log`)。**举一反三:**也可以 `cd "$(dirname "$(pwd)")"` 通过命令展开获取父目录。
>
> **Q4** 排查思路:①`ls /etc/ | grep -i nginx` 确认目录下的实际文件名 ②注意到了拼写:`ngnix` 应该是 `nginx` ③用 Tab 补全:`ls /etc/ng`然后按 Tab,让 shell 自动补全 ④用 `find /etc -maxdepth 1 -iname "*nginx*"` 模糊搜索(不区分大小写)。**举一反三:**`-iname` 不区分大小写,适合不确定大小写格式时使用。
>
> **Q5** 搜索策略:①`find /var/log -type f -name "*access*202609*"` 按文件名模糊搜索 ②如果 find 太慢,先用 `ls /var/log/**/*access*202609*`(需开启 globstar) ③用 Ctrl+R 搜索之前查看过该文件的命令 ④如果完全不确定路径,`find / -type f -name "*access*202609*" 2>/dev/null` 全局搜索 ⑤用 `locate access202609`(如果系统有 mlocate 索引)。**举一反三:**搜索优先级:已知目录用 glob+Tab → 子目录用 find → 全局用 locate → 都不行用 grep 搜内容。

## 运行前边界、回滚与验证

- **运行前**：示例以 GNU/Linux 的 Bash 为主；先用 `command --help`、`man command` 或发行版文档确认本机版本和参数。不要把教程中的 IP、域名、用户、路径直接复制到生产机器。
- **先确认作用域**：涉及文件、仓库、容器或远端主机时，先运行 `pwd`、`whoami`、`git status`、`docker context show` 或 `ssh -G 主机别名`，确认当前目标；对重要数据先做可恢复备份。
- **完成后验证**：用只读命令确认结果，例如 `ls -la`、`git status`、`systemctl status 服务名`、`docker ps` 或 `curl -fS URL`；失败时停止扩大操作范围，先读报错。
- **删除边界**：`rm`/`Remove-Item` 不会进入回收站。先用 `ls -- 路径` 或 PowerShell 的 `-WhatIf` 预演；避免对变量、通配符或当前目录直接使用递归强制删除。
- **网络边界**：远程启用防火墙前先放行当前 SSH 入口；修改 Nginx 后先 `nginx -t`，通过后再 reload，并从外部和本机两侧验证端口与 HTTP 状态。
