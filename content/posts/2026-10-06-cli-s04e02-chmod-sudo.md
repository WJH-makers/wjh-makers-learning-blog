---
title: "《从零开始玩命令行》18 · 权限九宫格:chmod / chown / sudo"
date: 2026-10-06
summary: "想清理元凶留下的垃圾文件,被 Permission denied 拍在脸上;自己写的 deploy.sh 也跑不起来。这一话把 ls -l 开头十个字符逐位拆开:rwx 九宫格、755/644 的二进制真相、chmod/chown 两把改锥,以及 sudo 的本质——不是变身,是以 root 身份执行一条命令。阿零想 777 一把梭,被特米当场按住。"
tags: [Linux, 命令行, 终端漫画, chmod, sudo, 阿零与特米]
---

# 《从零开始玩命令行》18 · 权限九宫格:chmod / chown / sudo

> 连载特刊 · 第二部《从零开始玩命令行》第 4 卷「进程与系统」第 2 话
> 长期项目:**把豆豆咖啡站部署上真实服务器**。承接上一话:元凶已伏法,收拾残局时被一句 Permission denied 拦在门外。全卷地图见 [/cli](/cli)。

---

## 一、需求:这台机器,凭什么不听我的

上一话 `kill -9` 送走了失控的压测脚本,它却在 `/var/cache/stress/` 拉了一地临时文件——那目录是豆豆当初图省事用 `sudo` 跑初始化时建的,归 root 所有。阿零一个 `rm` 抡过去,`Permission denied`。

祸不单行:他刚给咖啡站写好第一版部署脚本 `deploy.sh`,兴冲冲 `./deploy.sh`,又是一句 `Permission denied`——**这回文件明明是他自己的**。

同一句报错,两个完全不同的病根。阿零需要看懂 Linux 世界的通行证制度:**每个文件归谁、允许谁做什么,全写在 `ls -l` 开头那十个字符里。**

---

## 二、漫画 · 九宫格通行证

> **〔1〕** 阿零对着 `rm` 被拒的红字发抖:「上一话我连进程都杀了,现在删个文件不让?」
> 特米:「杀进程你杀的是**自己的**。这文件的主人是 root——楼里辈分最高的那位。」

> **〔2〕** 特米肚皮亮出一行天书:`-rw-r--r--`。它把后九个字符掰成三组,排成九宫格。
> 特米:「第一位是类型(`-` 文件 `d` 目录),后面九位三三分组:**主人 / 同组 / 其他人**,每组三问——能读 r?能写 w?能执行 x?」

> **〔3〕** 阿零看自己的 `deploy.sh`:`-rw-r--r--`。九宫格里「执行」一列全是 `-`。
> 特米:「Linux 不看后缀名。**没有 x 位,写成花也只是一篇文章,不是程序。**`chmod +x`,给它发执行证。」

> **〔4〕** 阿零嫌一个个改麻烦,手指悬向 `chmod -R 777 /`旁边——特米整只企鹅横着飞过来按住。
> 特米:「777 = 全楼所有人对它**可读可写可执行**。你这不是发通行证,是把大门拆了。」

> **〔5〕** 轮到 root 的垃圾文件。阿零:「那我变身 root?」特米摇头,递来一枚一次性印章。
> 特米:「`sudo` 不是变身,是**借印**:以 root 身份执行**这一条**命令,盖完印就还。每一次借用都记档。」

> **〔6〕** 阿零忘了加 sudo 又被拒,特米教他念咒:`sudo !!`。上一条命令自动被抬着重跑了一遍。
> 阿零:「`!!` 是上一条命令?!」特米:「对,史上最著名的偷懒咒。**但盖印之前,先看清自己在盖什么。**」

---

## 三、本话目标

- 逐位拆解 `ls -l` 开头十个字符:1 位类型 + rwx × 3(owner / group / other);
- 建立**九宫格**心智模型,用二进制第一性原理看穿数字法:r=4、w=2、x=1,755/644 不再靠背;
- `chmod` 两种写法:符号法 `+x` 和数字法 `755`;`chown user:group` 换主人;
- 理解 `sudo` 的本质:**以 root 身份执行一条命令**,不是「变身 root」;顺手学会 `sudo !!`;
- 踩两个坑:脚本没有 x 位跑不动、`777` 一把梭为什么是坏习惯(最小权限原则)。

---

## 四、原理图:十个字符,一张通行证

```text
-  r w x  r - x  r - -        ← ls -l 的前十个字符
│  └owner┘ └group┘ └other┘
│   主人    同组     其他人
└ 类型:- 文件 / d 目录 / l 链接

九宫格(每格独立开关):        数字法 = 每组做一次二进制加法:
          r    w    x                r=4  w=2  x=1
 owner   ✔    ✔    ✔          rwx = 4+2+1 = 7
 group   ✔    ✘    ✔          r-x = 4+0+1 = 5
 other   ✔    ✘    ✘          r-- = 4+0+0 = 4

 于是:rwxr-xr-x = 755(脚本/目录常用)
       rw-r--r-- = 644(普通文件常用)
       rwxrwxrwx = 777(大门拆掉,红线)

sudo ≠ 变身:
  阿零 ──sudo──▶ [以 root 身份执行这一条命令] ──▶ 印章收回,还是阿零
  (每次使用记入 /var/log/auth.log,借印有账)
```

一句话:**权限 = 「谁」×「能干什么」的九宫格;chmod 改格子,chown 换主人,sudo 借最高的章用一次。**

---

## 五、上手:读证、发证、换主、借印

**① 先学会读**:

```bash
$ ls -l
total 8
-rw-r--r-- 1 ubuntu ubuntu 312 Oct  6 10:02 deploy.sh
drwxr-xr-x 2 ubuntu ubuntu 4096 Oct  6 09:58 coffee-shop

$ ls -l /var/cache/stress/tmp1.log
-rw-r--r-- 1 root root 52428800 Oct  5 23:59 /var/cache/stress/tmp1.log
```

`deploy.sh` 主人是 ubuntu,但九宫格里没有一个 `x`;垃圾文件主人是 **root**,对「其他人」只开了 `r`——难怪删不动(顺带一记:能不能删文件,其实看的是**所在目录**的 `w` 位,这目录也是 root 的)。

**② chmod 发执行证(符号法与数字法等价)**:

```bash
$ chmod +x deploy.sh              # 符号法:三组各加 x
$ ls -l deploy.sh
-rwxr-xr-x 1 ubuntu ubuntu 312 Oct  6 10:02 deploy.sh

$ chmod 644 notes.txt             # 数字法:rw- r-- r--
$ chmod 755 deploy.sh             # 和上面 +x 后的结果一样,一步到位
```

**③ chown 换主人(动别人的东西就得借印)**:

```bash
$ chown ubuntu:ubuntu /var/cache/stress/tmp1.log
chown: changing ownership of '/var/cache/stress/tmp1.log': Operation not permitted

$ sudo chown -R ubuntu:ubuntu /var/cache/stress/
[sudo] password for ubuntu:
$ ls -l /var/cache/stress/tmp1.log
-rw-r--r-- 1 ubuntu ubuntu 52428800 Oct  5 23:59 /var/cache/stress/tmp1.log
```

换主人本身就是特权操作——**普通用户连「把别人的东西过户给自己」都不行**,不然通行证制度形同虚设。过户完,`rm` 顺理成章。

**④ sudo !! 偷懒咒**:

```bash
$ rm /var/cache/stress/tmp2.log
rm: cannot remove '/var/cache/stress/tmp2.log': Permission denied
$ sudo !!
sudo rm /var/cache/stress/tmp2.log        # bash 先回显它替你拼好的命令
```

`!!` 是 bash 的「上一条命令」占位符,`sudo !!` = 把刚被拒的那条抬着重跑。爽,但特米的叮嘱同样重要:**回显那一行先看一眼再回车**——盖着 root 的章,手滑没有后悔药。

---

## 六、故意制造一个 Bug:跑不动的脚本 + 一把梭的 777

其实在学会读证之前,阿零就已经撞过墙了。他写完 `deploy.sh` 直接跑:

```bash
$ ./deploy.sh
```

被拒之后他的第一反应堪称经典——「权限不够?那我把权限全打开不就完了」:

```bash
$ chmod -R 777 ~/coffee-shop      # 特米横身拦截,此键未落
```

---

## 七、读懂真实报错

**坑一**,自己的脚本也 Permission denied:

```text
bash: ./deploy.sh: Permission denied
```

根因:和「文件归不归你」无关——九宫格里**没有 x 位**。Linux 判断「能不能作为程序运行」只看执行位,不看 `.sh` 后缀(对比 Windows:后缀说了算)。修法一行:`chmod +x deploy.sh`,或规范点 `chmod 755 deploy.sh`。绕行写法 `bash deploy.sh` 也能跑(执行的是 bash,脚本只是它读的**数据**)——这正好反证了 x 位的含义。

**坑二**,`chmod -R 777` 为什么被整只企鹅拦下?它当下「有效」,但埋三颗雷:

1. **写位对所有人开放** = 这台机器上**任何**用户、任何被攻破的进程,都能改你的部署脚本——往里塞一行恶意代码,下次你自己以自己的身份把它跑起来,这就是现成的后门;
2. 违背**最小权限原则**:权限只给「完成工作所需的最小集合」,脚本 755、数据 644 就够,多开的每一格都是白送的攻击面;
3. 很多软件会**拒绝**权限过松的文件。上一卷配过的 ssh 私钥就是现成例子,权限一松它直接罢工:

```text
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Permissions 0777 for '/home/ubuntu/.ssh/id_ed25519' are too open.
This private key will be ignored.
```

修法:回到九宫格,**按需发证**——`chmod 755` 给脚本,`chmod 644` 给数据,`chmod 600` 给私钥;真遇到「别人也要写」的需求,用 group 那一列解决,而不是把 other 全开。

> **🪟 双系统对照 · 九个格子 vs 一张清单**

| 干什么 | Linux (bash) | PowerShell 7 | 关键差异 |
|---|---|---|---|
| 看权限 | `ls -l`(十个**文本字符**) | `Get-Acl .\deploy.ps1 \| Format-List` | Windows 用 **ACL**:一张任意长的规则清单,Get-Acl 返回的是**安全描述符对象**,不是十个字符 |
| 改权限 | `chmod 755 deploy.sh` | `icacls .\deploy.ps1 /grant user:RX` | rwx 九格是**定长开关**,ACL 是可增删的**对象列表**——又是文本 vs 对象 |
| 「能否执行」由谁定 | x 位(与后缀无关) | 后缀(.exe/.ps1)+ **执行策略**(`Get-ExecutionPolicy`,脚本常被 `Restricted` 拦) | Windows 没有 x 位;PS 脚本跑不动八成是执行策略,不是权限 |
| 换主人 | `sudo chown ubuntu:ubuntu f` | `icacls f /setowner ubuntu` | — |
| 借最高权限 | `sudo <一条命令>` | 「以管理员身份运行」整个新终端(或装 `gsudo`) | sudo 借印**一条命令**;Windows 原生是提权**一整个会话**,粒度粗得多 |

同一句「Permission denied」,两个世界的病历完全不同:Linux 先查九宫格和 x 位,Windows 先查 ACL 和执行策略。跨系统排障,第一步永远是问「**这个系统的通行证长什么样**」。

> **🎯 面试直击**:`chmod 755` 和 `644` 分别是什么意思?为什么不建议 `777`?
> 每组权限按 r=4、w=2、x=1 相加:755 = `rwxr-xr-x`(主人全权,组和其他人可读可执行,不可写),给脚本和目录;644 = `rw-r--r--`(主人读写,其余只读),给普通文件。777 = 所有人可读写执行,违背**最小权限原则**:任何用户/进程都能篡改文件内容再诱导执行,是典型提权入口;且 ssh 等软件会直接拒绝权限过松的敏感文件。追问点:目录的 x 位是什么意思(能否**进入**目录)、删除文件看谁的权限(所在**目录**的 w 位)、`sudo` 与直接登录 root 的区别(按条授权、全程留痕)。

---

## 八、用命令验证:证发对了没有

```bash
$ ls -l deploy.sh                     # x 位到位,主人没变
-rwxr-xr-x 1 ubuntu ubuntu 312 Oct  6 10:02 deploy.sh
$ stat -c "%a %U:%G %n" deploy.sh     # 数字形式直接验:755
755 ubuntu:ubuntu deploy.sh
$ ./deploy.sh                         # 跑起来了
Deploying coffee-shop ...
$ sudo -v && echo "印章可借"          # 确认自己在 sudo 名单里
印章可借
```

`stat -c "%a"` 把九宫格直接翻译成数字,比肉眼数 `rwx` 靠谱——**改完权限用它复核**,是部署脚本里常见的自检写法。

---

## 九、项目检查点 · 读懂服务器 v0.2

```text
已具备:十字符权限逐位判读、rwx 九宫格与 755/644 二进制原理、
        chmod 符号法/数字法、chown 过户、sudo 借印观(+ sudo !!)、
        最小权限原则(777 红线)
还没有:咖啡站终于要在服务器上第一次点火了——但它全靠阿零的终端
        亲手托着;离开人,它能不能自己活,还没经过考验
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 权限模型判读 | 「Permission denied 三分钟定位」,运维排障基本盘 |
| 最小权限原则 | 安全意识题:「为什么生产环境禁止 777」 |
| sudo 规范使用 | 「按条提权、操作留痕」,生产机红线素养 |

---

## 十一、下一话悬念

权限捋顺,`deploy.sh` 把代码稳稳铺进 `/srv/coffee/`。阿零深吸一口气,敲下 `node /srv/coffee/app.js`——屏幕滚出一行 `Coffee shop listening on 3000`,咖啡站**第一次真正跑在了服务器上**!他截图发给豆豆,心满意足地合上笔记本,吃饭庆祝去了。只有特米盯着那扇正在合拢的终端,肚皮上的 `>_` 幽幽闪了一下:「他还不知道,这扇门一关……」

> 下一话《常驻服务:systemctl 与日志》:ssh 一断、服务就死的真相(一封叫 SIGHUP 的「散伙信」),以及把咖啡站过继给 1 号进程 systemd——单元文件、start 与 enable 的两码事、journalctl 翻日志破案。

---

*本话属于连载《从零开始玩命令行》。全卷地图见 [/cli](/cli);前作《从零开始学 Java》见 [/java](/java)。*
