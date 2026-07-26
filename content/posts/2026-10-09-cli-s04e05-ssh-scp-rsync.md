---
title: "《从零开始玩命令行》21 · 远程与传输:ssh / scp / rsync"
date: 2026-10-09
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
      │ ② 服务器用公钥出一道随机题 ←──────── │
      │ ③ 私钥对题目签名作答 ──────────────→ │ ④ 公钥验签 → 开门
 密码登录:秘密要"发过去",可被钓;密钥登录:秘密永远不离开你的电脑。

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
$ chmod 600 ~/.ssh/id_ed25519         # 服务器侧的 authorized_keys 同样保持 600
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

*本话属于连载《从零开始玩命令行》。全卷地图见 [/cli](/cli);前作《从零开始学 Java》见 [/java](/java)。*
