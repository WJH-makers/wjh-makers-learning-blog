---
title: "《从零开始玩命令行》06 · 大海捞针:grep 与 find"
date: 2026-07-12
summary: "咖啡站代码里埋了一堆没做完的 TODO,阿零想一口气找齐——却对着几百个文件傻眼。特米甩出两把探照灯:grep 按内容照,find 按名字照。阿零先被 grep 的正则元字符坑了一把,又把 find 的参数顺序敲反,踩齐本话两个经典坑。"
tags: [Linux, 命令行, 终端漫画, grep, find, 阿零与特米]
---

# 《从零开始玩命令行》06 · 大海捞针:grep 与 find

> 连载特刊 · 第二部《从零开始玩命令行》第 2 卷「文本与管道」第 1 话
> 长期项目:**把豆豆咖啡站部署上真实服务器**。前作《从零开始学 Java》全 56 话见 [/java](/java)。

---

## 一、需求:代码里到底埋了多少「以后再说」

上一卷阿零学会了在服务器上走动、增删查看文件。这一卷豆豆丢来一句灵魂拷问:「你把咖啡站源码传上来了,可里面到底还有多少 `TODO` 没填?你打算**一个文件一个文件 `cat` 过去数**?」

阿零看着 `coffee-shop/` 下几十个文件,手已经悬在半空。他知道内容藏在某些文件的某些行里——**但不知道是哪个文件、哪一行**。`ls` 只能看名字,`cat` 一次只能看一个。这时候需要的是一把**探照灯**。

---

## 二、漫画 · 两把探照灯

> **〔1〕** 阿零对着一屏文件名发呆,准备一个个 `cat`。手边的咖啡已经凉了。
> 阿零:「几十个文件……我 `cat` 到天亮也数不完 TODO。」

> **〔2〕** 特米从光标里钻出来,肚皮 `>_` 一闪,甩出两只小手电。
> 特米:「找东西分两种。**照名字**用 `find`,**照内容**用 `grep`。你要找的 TODO 是内容——用 `grep`。」

> **〔3〕** 阿零敲 `grep -rn TODO .`,屏幕唰地列出三处,每处都带**文件名:行号**。
> 阿零:「它把藏在第几行都告诉我了?!」特米:「`-r` 钻进子目录,`-n` 报行号。**探照灯不搬文件,只喊坐标。**」

> **〔4〕** 阿零想找配置里的 `host=0.0.0.0`,顺手敲 `grep '0.0.0.0' app.conf`,结果连 `hostX0X0X0X0` 那行垃圾也被照了出来。
> 阿零:「我没让它匹配那行啊!」特米(眯眼):「因为在 grep 眼里,`.` 不是句点——是**通配任意一个字符**。你踩到正则的门槛了。」

> **〔5〕** 阿零转头想按名字找所有 `.js`,把命令敲成 `find -name "*.js" .`,屏幕冷冷回一句 `paths must precede expression`。
> 特米:「`find` 有脾气:**先说在哪找(路径),再说找什么(条件)**。你把顺序敲反了。」

> **〔6〕** 阿零把两条命令都改对,TODO 清单和文件清单齐刷刷列出。
> 特米:「记住这对搭档:**grep 照内容,find 照名字**。丢东西的夜里,它俩就是你的手电。」

---

## 三、本话目标

- 用 `grep` 按**内容**在多个文件里搜索,`-r` 递归、`-n` 报行号、`-i` 忽略大小写;
- 用 `find` 按**名字/类型**在目录树里定位,记住「**路径在前、条件在后**」;
- 认清 grep 是**正则**引擎:`.` `*` `$` 是元字符,不是普通符号;
- 踩两个真实坑:grep 元字符误伤、find 参数顺序反了;
- 建立心智:**「照内容」和「照名字」是两件事,用两把不同的灯。**

---

## 四、原理图:两把灯照两个维度

```text
一个文件有两个属性,对应两把灯:

           名字/位置                    内容(每一行文字)
        ┌───────────────┐         ┌────────────────────────┐
  find ─┤ src/order.js  │   grep ─┤ 第3行: // TODO: validate│
        │ config/app.conf│        │ 第2行: // TODO: load    │
        └───────────────┘         └─────────────────────────┘
         照"叫什么、在哪"            照"里面写了什么"

grep = Global Regular Expression Print  —— 逐行匹配,命中就打印
find = 在目录树里递归走,按条件筛节点(名字/类型/时间/大小)
```

一句话:**不知道文件叫什么、只知道里面有啥 → grep;知道名字规律、要定位在哪 → find。**

---

## 五、上手:两把灯各点一次

grep 照内容(在咖啡站源码根目录):

```bash
$ grep -rn "TODO" .
./config/app.conf:3:# TODO: move secret to env
./src/menu.js:2:// TODO: load from config
./src/order.js:3:  // TODO: validate item

$ grep -rin "todo" . | wc -l      # -i 忽略大小写,配管道数一下(管道下一话细讲)
3

$ grep -c " 404 " logs/access.log  # -c 只报命中"行数",不打印内容
2
```

find 照名字:

```bash
$ find . -name "*.js"              # 路径 . 在前,条件 -name 在后
./src/menu.js
./src/order.js

$ find . -type f -name "*.conf"    # 再加条件:只要普通文件(f=file, d=dir)
./config/app.conf

$ find . -type d                   # 只列目录
.
./config
./logs
./src
```

> **特米旁白**:grep 的 `-r`(recursive)让它自己钻子目录;find 天生就递归,不用加。两把灯的默认脾气不一样,别混。

---

## 六、故意制造一个 Bug:把「.」当成句点

阿零要在配置里精确找 `0.0.0.0` 这一行,顺手敲:

```bash
$ grep '0.0.0.0' hosttest.txt
```

而文件里除了正经的 `host=0.0.0.0`,还有一行手滑写的垃圾 `hostX0X0X0X0`。

同一时刻,他想按名字找 `.js` 文件,凭 Java 时代「先写主料再写位置」的直觉敲成:

```bash
$ find -name "*.js" .
```

---

## 七、读懂真实报错

**坑一**,grep 的 `.` 把垃圾行也照了出来:

```text
host=0.0.0.0
hostX0X0X0X0
```

根因:grep 用的是**正则表达式**,`.` 在正则里表示「**任意一个字符**」,所以 `0.0.0.0` 也能匹配 `0X0X0X0`。修法有两条:要么把点转义成 `0\.0\.0\.0`,要么直接告诉 grep「我要的是**死字符串**,别当正则」——加 `-F`(Fixed string):

```bash
$ grep -F '0.0.0.0' hosttest.txt
host=0.0.0.0
```

**坑二**,find 参数顺序反了:

```text
find: paths must precede expression: '.'
find: possible unquoted pattern after predicate '-name'?
```

find 说得很直白:**路径必须在表达式之前**。它把 `-name "*.js"` 当成了条件,又冒出个 `.` 不知道往哪放。修法就是漫画那句口诀——**先路径、后条件**:`find . -name "*.js"`。

> **🪟 双系统对照 · 两把灯在 PowerShell 上怎么点**

| 干什么 | Linux (bash) | PowerShell 7 | 关键差异 |
|---|---|---|---|
| 按内容搜 | `grep -rn "TODO" .` | `Select-String -Path .\* -Pattern "TODO" -Recurse` 或 `Get-ChildItem -Recurse \| Select-String TODO` | PS 返回的是 **MatchInfo 对象**(带 .LineNumber/.Filename),不是纯文本 |
| 忽略大小写 | `grep -i` | 默认就不敏感(要精确用 `-CaseSensitive`) | 默认脾气正好相反 |
| 按名字搜 | `find . -name "*.js"` | `Get-ChildItem -Recurse -Filter *.js` | PS 返回 FileInfo 对象 |
| 只要目录/文件 | `find . -type d` / `-type f` | `Get-ChildItem -Recurse -Directory` / `-File` | — |
| 死字符串匹配 | `grep -F` | `Select-String -SimpleMatch` | 都在「关掉正则」 |

一个要提前记住的分水岭:`grep` 吐**文本行**,`Select-String` 吐**对象**。这条差异下一话讲管道时会变成主角。

> **🎯 面试直击**:`grep` 和 `find` 有什么本质区别,什么时候用哪个?
> `grep` 匹配文件**内容**(逐行正则),`find` 按文件**属性**(名字、类型、时间、大小)在目录树里筛。「日志里有没有 error」用 grep,「哪些文件是昨天改的」用 find。追问:两者常组合——`find . -name "*.log" | xargs grep error`,find 定位文件、grep 再照内容(`xargs` 是后话)。

---

## 八、用命令验证:照准了没有

```bash
$ grep -rn "TODO" . | wc -l    # 应与逐个文件数出的 TODO 行数一致
3
$ echo $?                       # grep 命中返回 0
0
$ grep "不可能出现的字符串xyz" logs/access.log ; echo $?   # 没命中返回 1
1
```

grep 有个和别的命令不同的脾气:**命中 `$?`=0,没命中=1,出错=2**。写脚本时常靠这个 0/1 判断「文件里到底有没有」。

---

## 九、项目检查点 · 服务器探索 v0.6

```text
已具备:grep 照内容(-r/-n/-i/-c/-F)、find 照名字(路径在前/-type/-name)、会读两种真实报错
还没有:找到一堆结果后,只能干瞪眼 —— 不会把上一个命令的输出喂给下一个命令
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| grep 日志检索 | 「能在海量日志里定位问题」的第 1 步 |
| find 文件定位 | 清理、批处理、部署脚本的常客 |
| 正则元字符意识 | 从「会敲命令」到「知道命令为什么翻车」 |

---

## 十一、下一话悬念

阿零现在能一次照出所有 404 行了——可他想接着**只留 IP、去重、数出谁访问最多**,发现每次都得先把结果存进文件、再打开、再处理,来回搬三趟。特米冷冷抛下一句:「谁让你搬了?**让水自己流。**」

> 下一话《管道:把小工具串成流水线》:`|` 把一个命令的输出直接灌进下一个命令,`>` `>>` `2>&1` 把水引到文件里——本卷最重要的一话,Unix 的灵魂登场。

---

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,接下来3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. `grep` 命令的核心功能是什么?
   - A) 查找文件　B) 在文本中搜索匹配指定模式的行　C) 替换文本内容　D) 统计文件行数

2. `find` 命令的路径参数应该放在什么位置?
   - A) 命令的最后　B) 命令的最前面(紧接 find 之后)　C) 放在 -name 参数之后　D) 任意位置

3. `grep -i "error" log.txt` 中的 `-i` 代表什么?
   - A) 忽略大小写(insensitive)　B) 反向匹配(invert)　C) 显示行号(index)　D) 交互模式(interactive)

4. `grep -r "TODO" src/` 与 `grep "TODO" src/*` 的关键区别是?
   - A) 完全一样　B) `-r` 递归搜索所有子目录,`*` 只搜索当前层文件　C) `-r` 更快　D) `*` 搜索隐藏文件,`-r` 不搜索

5. `find /var/log -name "*.log" -type f` 中 `-type f` 的作用是?
   - A) 只匹配普通文件(regular file)　B) 只匹配目录　C) 匹配任意类型　D) 按文件大小过滤

6. 关于正则表达式元字符,以下哪个是 `grep` 默认模式下的"任意单个字符"?
   - A) `*`　B) `?`　C) `.`　D) `+`

7. `grep -c "404" access.log` 的输出是什么?
   - A) 所有包含 404 的行　B) 第一个包含 404 的行　C) 包含 404 的总行数(计数值)　D) 不包含 404 的行

8. 以下 `find` 命令哪个能找出 `/home` 下 7 天内修改过的所有 `.java` 文件?
   - A) `find /home -name "*.java" -mtime -7`　B) `find /home -mtime -7 -name "*.java"`　C) `find /home -name "*.java" -mtime +7`　D) 以上 A 和 B 都对

9. `grep -F "a.txt" file_list.txt` 中的 `-F` 是什么意思?
   - A) 强制搜索(force)　B) 固定字符串匹配(不解释正则元字符)　C) 只显示文件名　D) 全文搜索(full-text)

10. 以下哪条命令最准确地查找包含 IP 地址 `192.168.1.1` 的行(不匹配 `192.168.1.10`)?
   - A) `grep "192.168.1.1" file`　B) `grep "192\.168\.1\.1\b" file`　C) `grep -w "192.168.1.1" file`　D) 以上 B 和 C 都可以

### 解答题(5 道)

**Q1 概念:** `grep` 和 `find` 各司何职?比喻说明两者在"信息检索"中的分工。

**Q2 解释:** `grep -r` 与 `find ... -exec grep` 组合的区别?何时必须用后者而非前者?

**Q3 操作:** 在 `/var/log` 目录下,递归查找所有包含 "ERROR" 的 `.log` 文件,并显示匹配行的行号。写出命令。

**Q4 排障:** 菜菜执行 `find / -name "nginx.conf"`,命令行卡住很久没有输出。分析可能原因,并给出优化方案。

**Q5 综合设计:** 咖啡站项目代码在 `~/project/` 下,里面有上百个 `.java`、`.py`、`.js` 文件。现在需要:①找出所有包含 `FIXME` 或 `TODO` 注释的行 ②排除 `node_modules/` 和 `__pycache__/` 目录 ③统计每个文件类型中有多少个待办项。设计完整的搜索策略和命令。

> [!答案]
> **1-B** `grep` = Global Regular Expression Print,按正则模式搜索文本行。**举一反三:**`grep` 家族还包括 `egrep`(扩展正则,=`grep -E`)、`fgrep`(固定字符串,=`grep -F`)。🪟 PowerShell 中 `Select-String` 等价于 `grep`。
>
> **2-B** `find` 的语法:`find [起始路径] [匹配条件] [动作]`,路径必须紧跟命令名。**举一反三:**这一点初学者常搞错——`find -name "*.txt" /home` 会报错,因为路径参数 `-name` 被错误地放在路径前。
>
> **3-A** `-i` = ignore case,搜索时不区分大小写。**举一反三:**`-v` 反向匹配(排除),`-n` 显示行号,`-c` 计数,`-l` 只显示文件名,`-w` 整词匹配。`grep -iv "debug" log` 排除 debug 行。
>
> **4-B** `-r`(recursive)递归搜索子目录;`src/*` 中 shell 展开 `*` 只匹配当前目录下的可见文件/目录名,不递归进入子目录。**举一反三:**`grep -r` 会搜索所有子文件夹,包括 `.git`;通常需要加排除:`grep -r --exclude-dir={.git,node_modules} "pattern" .`。
>
> **5-A** `-type f` 限定只匹配普通文件(type file),排除目录、符号链接、设备文件等。**举一反三:**其他类型:`d`=目录,`l`=符号链接,`s`=socket。`find . -type d -empty` 找出所有空目录。
>
> **6-C** `.` 匹配任意单个字符(换行符除外)。**举一反三:**`*` 在正则中表示"前一元素重复 0 次或多次",不是通配符!这是正则和 glob 最容易混淆的地方。`a.*b` 匹配 a 后跟任意字符再到 b;glob 中 `a*b` 匹配文件名以 a 开头以 b 结尾。
>
> **7-C** `-c` 输出计数(count),即匹配到的总行数,不是匹配的内容本身。**举一反三:**`grep -c` 常用于统计,如 `grep -c "ERROR" *.log` 统计每个日志文件中的错误数。🪟 Select-String 无直接 `-c` 等价,用 `(Select-String ...).Count`。
>
> **8-D** A 和 B 都对——`find` 的表达式是"与"(AND)关系,各条件顺序可交换(性能可能有差异但结果相同)。**举一反三:**`-mtime -7` 表示"最近 7 天内修改"(modified time < 7 days),`-mtime +7` 表示"7 天前修改",`-mtime 7` 表示"恰好 7 天前修改"。
>
> **9-B** `-F` 将搜索模式视为纯字符串字面量,不解释 `.`、`*`、`[` 等正则元字符。**举一反三:**搜索文件名或包含特殊字符的字符串时,务必用 `-F` 或 `fgrep`,否则 `grep "a.txt"` 中的 `.` 会匹配任意字符。`grep -F "a.txt"` 只匹配字面的 `a.txt`。
>
> **10-D** `grep -w`(整词匹配)确保不匹配 `192.168.1.100`;正则中的 `\b`(词边界)也有同样效果。**举一反三:**`-w` 比手写正则简单且不易出错。注意 `grep` 默认把 IP 中的 `.` 当作正则元字符(=任意字符),如果不加 `-w` 或 `-F`,`grep "192.168.1.1"` 会意外匹配到 `192x168y1z1`。
>
> **Q1** `grep` 按**内容**找——"包含某个关键词的那一行在哪?";`find` 按**属性**找——"叫什么名字/多大/什么时候改过的那个文件在哪?"。**比喻:**`find` 是图书管理员(按书名、出版日期检索图书),`grep` 是在书里做全文检索(找哪个段落写过某句话)。两者组合(`find ... -exec grep ...`)威力无穷。
>
> **Q2** `grep -r "ERR" /var/log/` 直接递归搜索所有文件,简洁快速。但当需要**先按条件筛选文件再搜索内容**时,必须用 `find+exec`。例如"找所有 `.log` 文件中大于 100MB 的那几个,然后搜索 ERR":`find /var/log -name "*.log" -size +100M -exec grep "ERR" {} \;`。**举一反三:**`find+exec` 会为每个匹配文件启动一个新 grep 进程;`find ... -exec grep {} +`(注意 `+` 结尾)会把多个文件合并传给 grep,性能更好。
>
> **Q3** 命令:`grep -rn "ERROR" /var/log/ --include="*.log"`。解析:`-r` 递归,`-n` 显示行号,`--include` 限定文件名模式。**举一反三:**也可以用 `find /var/log -name "*.log" -exec grep -nH "ERROR" {} +`;`-H` 确保即使只有一个文件也显示文件名。
>
> **Q4** 卡住原因:①`/` 是整个文件系统,文件数量巨大,`find` 需要遍历所有挂载点 ②可能遍历到远程文件系统(NFS)或 `/proc` `/sys` 等虚拟文件系统,速度极慢。**优化方案:**①缩小范围:先猜测配置文件可能在 `/etc/`,用 `find /etc -name "nginx.conf"` ②限制深度:`find / -maxdepth 3 -name "nginx.conf"` ③排除虚拟文件系统:`find / -path /proc -prune -o -path /sys -prune -o -name "nginx.conf" -print` ④用 `locate nginx.conf`(如果已建立索引)。**举一反三:**永远不要在生产服务器上裸跑 `find /`,轻则让硬盘满负载,重则触发 IO timeout 告警。
>
> **Q5** 搜索策略:①`grep -rn --include="*.{java,py,js}" -E "FIXME|TODO" ~/project/ --exclude-dir={node_modules,__pycache__}` 一步完成前两步 ②统计:`grep -rn --include="*.java" "TODO\|FIXME" ~/project/ | wc -l` 单类型统计 ③完整脚本:用 `for ext in java py js; do count=$(grep -rn --include="*.$ext" -E "FIXME|TODO" ~/project/ --exclude-dir={node_modules,__pycache__} | wc -l); echo "$ext: $count"; done`。**举一反三:**`-E` 开启扩展正则,支持 `|`(或)操作符;`--exclude-dir` 接受花括号展开,可同时排除多个目录。

## 运行前边界、回滚与验证

- **运行前**：示例以 GNU/Linux 的 Bash 为主；先用 `command --help`、`man command` 或发行版文档确认本机版本和参数。不要把教程中的 IP、域名、用户、路径直接复制到生产机器。
- **先确认作用域**：涉及文件、仓库、容器或远端主机时，先运行 `pwd`、`whoami`、`git status`、`docker context show` 或 `ssh -G 主机别名`，确认当前目标；对重要数据先做可恢复备份。
- **完成后验证**：用只读命令确认结果，例如 `ls -la`、`git status`、`systemctl status 服务名`、`docker ps` 或 `curl -fS URL`；失败时停止扩大操作范围，先读报错。
- **网络边界**：远程启用防火墙前先放行当前 SSH 入口；修改 Nginx 后先 `nginx -t`，通过后再 reload，并从外部和本机两侧验证端口与 HTTP 状态。
