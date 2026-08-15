---
title: "《从零开始玩命令行》21 · 远程与传输:ssh / scp / rsync"
date: 2026-07-27
summary: "备份包要拉回本地,新代码要传上服务器——总不能复制粘贴。特米发钥匙:ssh-keygen 造密钥对(私钥=身份,公钥=锁),~/.ssh/config 一个词登录;scp 看冒号定方向,rsync 只传差异。阿零踩坑两连:私钥权限 644 被 ssh 当场拒收,rsync 尾斜杠一杠之差多套一层目录。C4 卷终。"
tags: [Linux, 命令行, 终端漫画, ssh, rsync, 阿零与特米]
---

# 《从零开始玩命令行》21 · 远程与传输:ssh / scp / rsync

> 连载特刊 · 第二部《从零开始玩命令行》第 4 卷「进程与系统」第 5 话
> 长期项目:**把豆豆咖啡站部署上真实服务器**。前作《从零开始学 Java》全 56 话见 [/java](/java)。

---

## 一、需求:两台机器之间,得有一条正经通道

上一话结尾留了两桩事:服务器上的备份包要**拉一份回本地**(鸡蛋别放一个篮子),本地改了三天的新代码要**传上服务器**。阿零盯着两台机器,脑子里闪过的第一个方案是 `cat` 出来鼠标复制——被特米当场按灭。

而且还有个每天磨人的小事:他登录服务器,**每次都要敲密码**。一天连十几次,烦;真到写自动化脚本时,密码更是没法嵌进去。这一话把三件事一起办了:**免密登录、文件上下行、增量同步**——部署前的最后一块拼图。

---

## 二、漫画 · 一把钥匙和一杠之差

> **〔1〕** 阿零 `cat` 开备份包,满屏乱码,他真的框选准备右键复制。特米肚皮 `>_` 打出两个大字:**住手**。
> 特米:「二进制你复制个啥?文件搬运有正经通道——就走你天天用的 ssh。但先治治你的密码依赖症。」

> **〔2〕** 特米递出一对发光的小物件:一把钥匙、一把锁。
> 特米:「`ssh-keygen` 造一对:**私钥=你的身份**,锁死在本机,永不外传;**公钥=一把锁**,装到服务器门上(`authorized_keys`)。锁可以到处贴,钥匙只有一把。」

> **〔3〕** 阿零眼睛一亮:「Java 线学过——这不就是非对称加密!」
> 特米(难得点头):「登录时服务器拿**公钥出一道随机题**,你拿**私钥签名作答**,验签通过就开门。秘密从没在网线上跑过——所以比密码硬。」

> **〔4〕** 阿零把旧电脑上的私钥拷过来,一敲 `ssh`,满屏 `@` 号警告糊脸,连门都没让敲。
> 阿零:「它嫌我的钥匙……太开放?」特米:「644 的私钥,等于把身份证贴在楼道里。ssh 的规矩:**这种钥匙,宁可不用**。」

> **〔5〕** 权限修好,`scp` 一发入魂拉回备份;上传代码特米却拦下换 `rsync`。
> 特米:「`scp` 是傻搬全量,`rsync` 先对账、**只传差异**。它还有把镜像剪刀 `--delete`——会删掉目标里多余的文件,动剪刀前先 `--dry-run` 彩排。」

> **〔6〕** 阿零 rsync 完一看,服务器上多了一层 `dist/dist`,套了个娃。
> 特米:「尾斜杠之谜:`dist` 是'把**这个目录**搬过去',`dist/` 是'把**里面的东西**倒过去'。一杠之差,两种人生。man 一下 rsync,今晚作业。」

---

## 三、本话目标

- 搞懂密钥登录的第一性原理:**私钥=身份、公钥=锁**,挑战-签名-验签,秘密不上网线;
- `ssh-keygen -t ed25519` 造钥匙,公钥进服务器 `authorized_keys`,权限铁律 **700(目录)/ 600(钥匙)**;
- 用 `~/.ssh/config` 起别名:`ssh coffee` 一个词登录;
- `scp` 上传下载:**方向看冒号在哪边**;
- `rsync -avz` 增量同步,明白它为什么比 scp 聪明;`--delete` 先 `--dry-run`;
- 踩两个真实坑:私钥 644 被拒(UNPROTECTED PRIVATE KEY FILE)、rsync 尾斜杠套娃。

---

## 四、原理图:钥匙不出门,冒号定方向

```text
一对钥匙,两个位置:

 你的电脑(客户端)                          服务器
 ~/.ssh/id_ed25519                          ~/.ssh/authorized_keys
 私钥 = 身份(600,永不外传)               公钥 = 装在门上的锁(可到处贴)
      │ ① 请求登录 ────────────────────────→ │
      │ ② 服务器发出签名挑战 ←────────────── │
      │ ③ 私钥对题目签名作答 ──────────────→ │ ④ 公钥验签 → 开门
 密码登录:密码在 SSH 加密传输层内提交，但仍可能被钓鱼或在服务端泄露；密钥登录:私钥不离开你的电脑。

 scp / rsync 的方向,看冒号在哪边(冒号 = 远端):
   scp coffee:/srv/backup/a.tar.gz .        远 → 本(下载)
   scp app.js coffee:/srv/coffee/           本 → 远(上传)

 rsync 为什么聪明:先比对两端(大小/时间/校验和),只传"变了的部分";
 scp 不管三七二十一,每次全量重传。
```

---

## 五、上手:造钥匙、装锁、起别名

本地造钥匙,把锁装到服务器上:

```bash
$ ssh-keygen -t ed25519 -C "azero@laptop"
Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/azero/.ssh/id_ed25519):
Your identification has been saved in /home/azero/.ssh/id_ed25519
Your public key has been saved in /home/azero/.ssh/id_ed25519.pub

$ ssh-copy-id azero@203.0.113.10        # 把公钥追加进服务器的 authorized_keys
Number of key(s) added: 1

$ ssh azero@203.0.113.10                # 这次不要密码了
```

嫌 `azero@203.0.113.10` 长?写进 `~/.ssh/config`:

```text
Host coffee
    HostName 203.0.113.10
    User azero
    IdentityFile ~/.ssh/id_ed25519
```

从此 `ssh coffee` 一个词登录,scp/rsync 也认这个别名。搬文件:

```bash
$ scp coffee:/srv/backup/coffee_2026-10-09.tar.gz .     # 下载:冒号在源那边
coffee_2026-10-09.tar.gz              100% 1246KB   2.1MB/s   00:00

$ rsync -avz dist/ coffee:/srv/coffee/dist/             # 上传:增量同步构建产物
sending incremental file list
index.html
assets/app.js
sent 48,231 bytes  received 87 bytes  32,212.00 bytes/sec

$ rsync -avzn --delete dist/ coffee:/srv/coffee/dist/   # -n = --dry-run,动剪刀前先彩排
```

> **特米旁白**:`-a` 归档(保留权限/时间戳,含递归)、`-v` 话多、`-z` 压缩着传。第二次 rsync 你会发现几乎瞬间完成——没差异就不传,这就是它比 scp 聪明的地方。

---

## 六、故意制造一个 Bug:太开放的钥匙,多余的一杠

阿零从旧电脑把私钥拷过来,途径 U 盘,权限被抹成 644:

```bash
$ ls -l ~/.ssh/id_ed25519
-rw-r--r-- 1 azero azero 411 Oct  9 10:02 /home/azero/.ssh/id_ed25519
$ ssh coffee
```

修好之后上传代码,他想更新服务器上的 `/srv/coffee/dist`,顺手敲:

```bash
$ rsync -avz dist coffee:/srv/coffee/dist     # 源没带尾斜杠
```

---

## 七、读懂真实报错

**坑一**,ssh 当场拒收 644 的私钥:

```text
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Permissions 0644 for '/home/azero/.ssh/id_ed25519' are too open.
It is required that your private key files are NOT accessible by others.
This private key will be ignored.
Load key "/home/azero/.ssh/id_ed25519": bad permissions
azero@203.0.113.10: Permission denied (publickey).
```

根因:私钥就是你的**身份本体**,644 意味着同机其他用户也能读走它、冒充你。ssh 的硬规矩是:**组或其他人可读的私钥,直接拒用**(`will be ignored`),然后退回密钥认证失败。修法两行,顺便把整套权限立正(第 18 话的 chmod 在这儿交作业):

```bash
$ chmod 700 ~/.ssh
$ chmod 600 ~/.ssh/id_ed25519         # 客户端私钥必须不让组/其他用户读取
$ chmod 600 ~/.ssh/authorized_keys    # 常用安全权限；关键是它及父目录不能被其他用户写入
```

**坑二**,rsync 套娃。上传完检查:

```bash
$ ssh coffee ls /srv/coffee/dist
dist                                   # ?!目录里又一个 dist
```

根因:rsync 的语义差——源写 `dist`(不带尾斜杠)是「把**目录本身**搬进目标」,结果成了 `/srv/coffee/dist/dist/…`;源写 `dist/`(带尾斜杠)才是「把**目录内容**倒进目标」。修法:删掉套娃层,改用 `dist/`。特米追加一条保命令:这种时刻**千万别**顺手加 `--delete` 去"清理"——斜杠搞错时它会按错误的对照关系把目标里不该删的文件全剪掉,**先 `--dry-run` 看清单,再动真格**(目标端只有 rsync 自己传过去的东西时才考虑镜像)。

> **🪟 双系统对照 · Windows 也内置了 OpenSSH**

| 干什么 | Linux (bash) | PowerShell 7 / Windows | 关键差异 |
|---|---|---|---|
| 造钥匙 | `ssh-keygen -t ed25519` | 同一条命令(Win10+ 内置 OpenSSH 客户端) | 一致,难得的大团圆 |
| 私钥权限 | `chmod 600 ~/.ssh/id_ed25519` | `icacls $env:USERPROFILE\.ssh\id_ed25519 /inheritance:r /grant:r "$env:USERNAME:R"` | Windows 没有 rwx 九宫格,用 **ACL 对象**;OpenSSH 同样会嫌钥匙"太开放" |
| 别名配置 | `~/.ssh/config` | 同款语法,路径 `C:\Users\你\.ssh\config` | 一致 |
| 增量同步 | `rsync -avz` | 无原生 rsync:`robocopy src dst /MIR` 或进 WSL 用 rsync | `/MIR` = `--delete` 同款剪刀,一样会删目标多余文件,一样先彩排(`/L` 只列不做) |
| 公钥装到 Windows 服务器 | 追加进 `~/.ssh/authorized_keys` | 管理员组用户要写进 `C:\ProgramData\ssh\administrators_authorized_keys` | Windows 的著名特例,坑过无数人 |

> **🎯 面试直击**:ssh 密钥登录为什么比密码安全?scp 和 rsync 怎么选?
> 密钥:私钥**从不离开本机**,登录走"服务器公钥出题 → 私钥签名 → 公钥验签"的挑战应答,网线上没有可窃取、可重放的秘密;还能在服务器关掉 `PasswordAuthentication`,爆破直接无门。scp vs rsync:scp 简单粗暴全量拷,单个小文件够用;rsync 增量比对只传差异、`-a` 保留属性、可断点续、可 `--delete` 做镜像——目录同步和反复部署一律 rsync。追问点:`authorized_keys` 权限要求、`--delete` 的风险控制(`--dry-run`)。

---

## 八、用命令验证:一个词直达,一根指纹对账

```bash
$ ssh coffee 'echo ok'                 # 别名 + 免密,一个词直达
ok
$ ls -l ~/.ssh/id_ed25519
-rw------- 1 azero azero 411 Oct  9 10:12 /home/azero/.ssh/id_ed25519
$ md5sum coffee_2026-10-09.tar.gz && ssh coffee md5sum /srv/backup/coffee_2026-10-09.tar.gz
7c9e01f3b2…  coffee_2026-10-09.tar.gz          # 两端指纹一致,搬运没伤着
7c9e01f3b2…  /srv/backup/coffee_2026-10-09.tar.gz
$ rsync -avzn dist/ coffee:/srv/coffee/dist/ | tail -2
sent 1,024 bytes  received 19 bytes  695.33 bytes/sec   # 彩排显示无差异可传 = 已同步
```

---

## 九、项目检查点 · 读懂服务器 v0.5

```text
已具备:密钥登录全套(ssh-keygen/authorized_keys/700与600 铁律)、
        ~/.ssh/config 别名、scp 冒号定方向、rsync 增量同步 + --dry-run 彩排、
        连同 v0.1~v0.4:进程、权限、常驻服务、定时备份——一台服务器的"内政"齐了
还没有:代码上去了、服务活着,可浏览器输服务器 IP 就是打不开——
        端口、监听、防火墙、反向代理,一概不认识:门在哪?谁在听?
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| ssh 密钥登录与 config | 「熟悉 Linux 远程运维」的第一道门槛 |
| scp/rsync 文件传输 | 部署脚本、数据搬运的日常动作 |
| rsync 增量/镜像意识 | 分得清 --delete 的威力与危险,是老手信号 |

---

## 十一、下一话悬念 · C4 卷终

rsync 把最新代码送上服务器,`systemctl restart coffee`,journalctl 里服务欢快地打出启动日志——四卷功课在这一刻串成一条线。阿零深吸一口气,把服务器 IP 发给豆豆:「开业了!」

豆豆的浏览器转了半天,转出一页冰冷的「无法访问此网站」。屋里安静了三秒。特米的肚皮缓缓亮起一行字:**门在哪?谁在听?**

> 下一卷 C5《网络与部署》(全系列最后一卷):端口与监听、防火墙、Nginx 反向代理、HTTPS——把咖啡站**真正开门迎客**。服务活在服务器里还不够,得让全世界敲得开它的门。

---

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,接下来3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. `ssh-keygen -t ed25519` 生成的是什么?
   - A) 一条 SSH 连接　B) 一对公钥和私钥(用于免密 SSH 登录)　C) 服务器证书　D) SSL 证书

2. `scp file.txt user@server:/tmp/` 的作用是什么?
   - A) 从服务器下载文件　B) 将本地 `file.txt` 上传到服务器的 `/tmp/` 目录　C) 在服务器上创建文件　D) 备份文件到本地

3. `rsync -avz source/ dest/` 中 `-a`、`-v`、`-z` 分别代表什么?
   - A) archive(归档/保留属性)、verbose(详细输出)、compress(传输中压缩)　B) all、version、zip　C) append、verify、zero　D) auto、view、zlib

4. `scp` 中冒号 `:` 的作用是什么?
   - A) 分隔文件名和端口号　B) 分隔主机名和远程路径(冒号后是远程路径)　C) 表示压缩传输　D) 分隔用户名和密码

5. `~/.ssh/authorized_keys` 文件的作用是什么?
   - A) 存储客户端的私钥　B) 存储**允许免密登录**的公钥列表(放公钥的人可以登录这台服务器)　C) 存储已知主机列表　D) 存储用户密码

6. `rsync` 相比 `scp` 的核心优势是什么?
   - A) rsync 更快(总是)　B) rsync 支持增量传输(只传差异部分)、断点续传、可排除文件　C) rsync 不需要 SSH　D) rsync 只能本地使用

7. `~/.ssh/config` 中配置以下内容:
```
Host coffee
  HostName 192.0.2.5
  User deploy
```
配置后,以下哪条命令可以连接该服务器?
   - A) `ssh coffee`　B) `ssh 192.0.2.5`　C) `ssh deploy@coffee`　D) 以上都可以,A 最简洁

8. `rsync -avz --delete source/ dest/` 中 `--delete` 的作用是什么?
   - A) 删除源目录　B) 删除目标目录中多余的文件(使 dest 成为 source 的**精确镜像**)　C) 删除所有文件后同步　D) 删除源和目标中不同的文件

9. 关于 SSH 密钥对,以下说法**正确**的是?
   - A) 私钥放在服务器,公钥放在本地　B) 私钥是锁(public),公钥是钥匙(private)　C) 私钥是**身份证明**(绝不能泄露),公钥是"锁"(放在要登录的服务器上)　D) 公钥和私钥可以互换使用

10. 用户执行 `scp root@server:/etc/nginx/nginx.conf ./`,以下哪种冒号方向的解读是**正确**的?
   - A) 冒号后的路径是本地路径　B) `server:` = 在 host:path 中,冒号标识远程路径(从远程**下载**)　C) 冒号开头的路径表示绝对路径　D) 冒号是注释符号

### 解答题(5 道)

**Q1 概念:** 用"锁与钥匙"比喻解释 SSH 密钥对的工作原理:公钥放在哪?私钥放在哪?免密登录的认证过程是怎样的?

**Q2 解释:** 对比 `scp` 和 `rsync` 的使用场景:什么时候用 scp,什么时候用 rsync?为什么 rsync 更适合"备份同步"任务?

**Q3 操作:** 写出配置 SSH 免密登录的完整流程:生成密钥→分发公钥到服务器→配置 `~/.ssh/config` 简化连接→测试免密登录。

**Q4 排障:** 菜菜配置了 SSH key 但还是被提示输入密码,执行 `ssh -v user@server` 看到 `debug1: Authentications that can continue: publickey,password` 和 `Permission denied (publickey)`. 分析可能原因(至少 3 个)。

**Q5 综合设计:** 设计咖啡站代码的远程部署方案:用 rsync 将本地 `~/coffee-app/` 同步到生产服务器,要求:①排除 `.git`/`node_modules`/`*.log` ②先在本地试运行(`--dry-run`) ③保留服务器上 `uploads/` 目录(不同步删除) ④同步后自动重载 nginx ⑤写入 `~/.ssh/config` 方便日后使用。

> [!答案]
> **1-B** `ssh-keygen -t ed25519` 生成 Ed25519 算法的 SSH 密钥对:私钥(`~/.ssh/id_ed25519`)和公钥(`~/.ssh/id_ed25519.pub`)。**举一反三:**Ed25519 是推荐算法(比 RSA 更安全、更快、更短);旧系统可能只支持 RSA:`ssh-keygen -t rsa -b 4096`。🪟 PowerShell 同样内置 `ssh-keygen`。
>
> **2-B** `scp 源 目标`。`file.txt` 是本地文件,`user@server:/tmp/` 是远程目标 → 上传。**举一反三:**方向记忆:冒号那边是远程。下载:`scp user@server:/remote/file.txt ./`(冒号在源)。🪟 PowerShell 也可用 `scp`,或 `pscp`(PuTTY)。
>
> **3-A** `-a`=archive(递归+保留符号链接/权限/时间戳/属主,等同于 `-rlptgoD`),`-v`=verbose(显示传输细节),`-z`=compress(传输中 gzip 压缩,节省带宽)。**举一反三:**`-P` 显示进度条;`-n`=dry-run(模拟运行,不实际传输);`--exclude='*.log'` 排除模式。rsync 的选项相当于"存档+报告+压缩",是最常用的组合。
>
> **4-B** scp 的路径语法:`[user@]host:path`。冒号是"远程分隔符":冒号前=主机,冒号后=远程路径。**举一反三:**`scp file1 file2 user@server:/tmp/` 可以一次上传多个文件;`scp -r dir/ user@server:/tmp/` 递归上传目录。方向:源中有冒号=下载,目标中有冒号=上传。
>
> **5-B** `authorized_keys` 存储"授权登录的公钥"。拥有对应私钥的用户可以免密登录。**举一反三:**常用安全权限是 `chmod 700 ~/.ssh`、`chmod 600 ~/.ssh/authorized_keys`；OpenSSH 真正防的是文件或父目录被其他用户写入，不能把“0644 必然拒绝”当成跨平台规则。客户端私钥则必须严格限制为仅自己可读。`ssh-copy-id user@server` 是分发公钥的标准工具。
>
> **6-B** rsync 的增量传输算法:首次传输全量,后续只传输**变化的块**(文件变更的部分),极大节省时间和带宽。`scp` 每次都全量复制。rsync 还支持:`--partial` 断点续传、`--exclude` 排除、`--delete` 同步删除。**举一反三:**大文件/频繁同步用 rsync;临时搬一个小文件用 scp 更快(无需计算差异)。
>
> **7-D** `ssh coffee`(利用 config 别名)、`ssh 192.0.2.5`(IP 直连但需手动指定用户)、`ssh deploy@coffee`(别名已配置用户,手动再指定也不冲突)。**举一反三:**`~/.ssh/config` 可以定义端口:`Port 2222`;指定密钥:`IdentityFile ~/.ssh/coffee_key`;配置代理跳板:`ProxyJump bastion`。这是效率神器——再也不需要记住 `ssh -i ~/.ssh/special_key -p 2222 user@192.0.2.50`。
>
> **8-B** `--delete` 使目标成为源的**精确镜像**——目标目录中如果有源目录没有的文件,会被删除。**举一反三:**`--delete` 很强大也很危险,建议先用 `--dry-run` 预览会删除哪些文件。结合 `--exclude` 可以保护目标中的特定目录(如 `--exclude='uploads/' --delete` 删除其他多余文件但保留 uploads)。
>
> **9-C** 私钥=你的身份证(绝对保密,别人拿到就能冒充你);公钥=锁(公开,装了这把锁的服务器认得出你的身份证)。**举一反三:**认证走的是**挑战-签名-验签**,不是加密解密:服务器发一段随机数据当题目→客户端用**私钥签名**作答→服务器用 `authorized_keys` 里的**公钥验签**→通过。私钥全程不出本机,网线上跑的只是一个签名;而且每次题目都不同,截获了也没法重放到下一次。⚠ 别记成「服务器用公钥加密、客户端用私钥解密」——那是 SSH-1 时代的老做法,现代 SSH-2 的公钥认证是签名验证,和本话正文里那张挑战应答图一致。
>
> **10-B** `scp root@server:/path ./` :`root@server:/path` 中冒号前是主机和用户,冒号后是远程路径→这是从远程下载到本地。**举一反三:**`scp ./file root@server:/path`(源无冒号=本地,目标有冒号=远程)→上传。记忆:"冒号指向谁,就是从谁那搬东西"。`rsync` 同理。
>
> **Q1** 密钥对模型:①你生成一对钥匙:公钥(锁)和私钥(钥匙) ②把**公钥**(锁)放到服务器的 `~/.ssh/authorized_keys` 里(相当于给这个家门装上一把只认你的锁) ③**私钥**(钥匙)保存在你的本地 `~/.ssh/id_ed25519`,用密码保护(可选) ④认证过程:你 ssh 到服务器→服务器发来一段随机数据当挑战→你的客户端**用私钥对它签名**→把签名发回去→服务器用 `authorized_keys` 里的**公钥验签**→通过,免密登录。**关键:私钥自始至终没有离开你的电脑**,网线上跑的只是一个签名,而且挑战每次都不同,截获也无法重放。**安全要点:**私钥绝不可分享;`authorized_keys` 权限必须 600;公钥可以随意分发。
>
> **Q2** scp:基于 SSH 的简单文件拷贝,每次传输全量文件,没有差异计算。适用场景:临时传一个配置文件、下载一个日志文件、小文件一次性传输。**rsync:**增量传输(只传差异)+ 丰富的同步策略(保属性/排除/删除/断点续传)。适用场景:代码部署(只上传变更)、定期备份(只备份新增/修改)、大文件同步(断点续传)、镜像同步(`--delete` 保证两边完全一致)。**为什么 rsync 更适合备份:**增量传输节省带宽和时间、`-a` 保留所有元数据(权限/时间/所有者)、`--link-dest` 可以基于上次备份硬链接去重(节省磁盘)、`--partial` 支持断点续传。
>
> **Q3** 完整流程:①`ssh-keygen -t ed25519 -C "coffee-server-key"` 生成密钥对(一路回车,不设密码可直接使用) ②`ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@coffee-server` 分发公钥(或手动 `cat ~/.ssh/id_ed25519.pub | ssh user@server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"`) ③`vim ~/.ssh/config` 添加:`Host coffee`、`HostName 192.0.2.100`、`User deploy`、`IdentityFile ~/.ssh/id_ed25519` ④测试:`ssh coffee` 应该直接登录(免密) ⑤服务器端确认权限:`chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`。**举一反三:**可以给不同服务器生成不同密钥:`ssh-keygen -t ed25519 -f ~/.ssh/coffee_key`,在 config 中 `IdentityFile ~/.ssh/coffee_key`。
>
> **Q4** 可能原因:①公钥没有正确添加到服务器的 `~/.ssh/authorized_keys`(拼写错误、没重启 sshd 虽不需但建议确认、文件权限不是 600) ②服务器上 `.ssh` 目录或 `authorized_keys` 文件权限过于宽松(必须 700/600,否则 sshd 忽略) ③客户端私钥路径不对(如果用了非默认路径,需要在 ssh 命令中 `-i` 或在 config 中 `IdentityFile` 指定) ④服务器 `sshd_config` 禁用了 pubkey 认证(`PubkeyAuthentication no`) ⑤使用了错误的用户名(公钥装在 userA 的 authorized_keys,但用 userB ssh 连接) ⑥`known_hosts` 中该服务器的旧密钥与新服务器不匹配(重装过服务器)。**排查:**`ssh -vvv user@server` 看详细输出,搜索 "Authentication" 和 "publickey" 关键字。
>
> **Q5** 方案:①创建 `~/.ssh/config`:`Host coffee-prod`、`HostName 192.0.2.5`、`User deploy`、`IdentityFile ~/.ssh/coffee_prod_ed25519` ②试运行:`rsync -avzn --exclude='.git' --exclude='node_modules' --exclude='*.log' --exclude='uploads/' ~/coffee-app/ deploy@coffee-prod:/var/www/coffee/`(`-n` dry-run 预览) ③确认无误后去掉 `-n` 正式同步:`rsync -avz --exclude='.git' --exclude='node_modules' --exclude='*.log' --exclude='uploads/' ~/coffee-app/ deploy@coffee-prod:/var/www/coffee/`(不加 `--delete`,upload 不会被删除) ④同步后远程执行重载:`rsync ... && ssh coffee-prod "sudo systemctl reload nginx"` ⑤写成脚本 `deploy.sh` 方便复用:`#!/bin/bash; set -e; rsync -avz --exclude=... ~/coffee-app/ deploy@coffee-prod:/var/www/coffee/; ssh coffee-prod "sudo systemctl reload nginx"; echo "Deploy OK"`。**举一反三:**生产级部署还应考虑:同步前先备份、记录部署历史(Git commit hash)、支持回滚(`rsync -avz /backups/old-version/ deploy@coffee-prod:/var/www/coffee/`)、用 `--link-dest` 去重节省备份空间。

## 运行前边界、回滚与验证

- **运行前**：示例以 GNU/Linux 的 Bash 为主；先用 `command --help`、`man command` 或发行版文档确认本机版本和参数。不要把教程中的 IP、域名、用户、路径直接复制到生产机器。
- **先确认作用域**：涉及文件、仓库、容器或远端主机时，先运行 `pwd`、`whoami`、`git status`、`docker context show` 或 `ssh -G 主机别名`，确认当前目标；对重要数据先做可恢复备份。
- **完成后验证**：用只读命令确认结果，例如 `ls -la`、`git status`、`systemctl status 服务名`、`docker ps` 或 `curl -fS URL`；失败时停止扩大操作范围，先读报错。
- **权限边界**：先用 `stat`/`ls -ld` 查所有者和现有权限；按最小权限原则修改，避免 `chmod -R 777`。`sudo` 仅用于明确的单条命令，不在不理解的脚本前盲加。
- **远端边界**：首次连接核验主机指纹；传输前先确认目标路径和账号，`rsync` 删除模式必须先加 `--dry-run`。远程改网络或防火墙时保留一个已登录会话和云控制台回退路径。
- **网络边界**：远程启用防火墙前先放行当前 SSH 入口；修改 Nginx 后先 `nginx -t`，通过后再 reload，并从外部和本机两侧验证端口与 HTTP 状态。
