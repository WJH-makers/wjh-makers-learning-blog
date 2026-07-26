---
title: "《从零开始玩命令行》23 · 门卫与转发:ufw 与 nginx"
date: 2026-10-11
summary: "外网还是打不开,真凶是防火墙。这一话给服务器立规矩:ufw 当门卫,只放行该进的门——阿零差点跳过「先放行 SSH 再 enable」的保命顺序,被特米一把按住;nginx 当前台,把 80 端口的客人转发给 3000 的咖啡站。阿零还在配置里丢了一个分号,被 nginx -t 一句报错点名到行号。"
tags: [Linux, 命令行, 终端漫画, nginx, ufw, 阿零与特米]
---

# 《从零开始玩命令行》23 · 门卫与转发:ufw 与 nginx

> 连载特刊 · 第二部《从零开始玩命令行》第 5 卷「网络与部署」第 2 话
> 长期项目:**把豆豆咖啡站部署上真实服务器**。前作《从零开始学 Java》全 56 话见 [/java](/java)。

---

## 一、需求:开门,但只开该开的门

上一话结案:包被防火墙悄悄丢了。阿零撸起袖子:「那把防火墙整个关掉不就好了!」

特米的肚皮 `>_` 直接黑屏三秒:「关掉防火墙,等于把家门拆了睡大街——22 端口天天有人拿字典试密码。正确姿势是**只开该开的门**:ssh 给自己,80 给全世界,其余全关。而且客人不该背 3000 这种房间号——得有个**前台**把人从 80 正门往后厨领。」

门卫叫 `ufw`,前台叫 `nginx`。

---

## 二、漫画 · 门卫上岗记

> **〔1〕** 阿零撸袖子:「防火墙嘛,关掉最快!」特米肚皮弹出一屏 `auth.log`,密密麻麻全是陌生 IP 的失败登录。
> 特米:「这些人 24 小时排队试你家锁。你确定要拆门?」

> **〔2〕** 特米画了两个小人:门口站岗的 ufw,大厅里引路的 nginx。
> 特米:「**门卫决定谁能进,前台决定往哪领。**用户只记 80,不背端口号。」

> **〔3〕** 阿零查完 status 手起刀落就要 `sudo ufw enable`——特米整只企鹅扑到回车键上。
> 特米:「站住!你现在唯一的规则是『什么都不放行』。先 `allow OpenSSH` 再 enable,**否则下一秒你就被锁在门外,而钥匙挂在门里**。」

> **〔4〕** 按保命顺序敲完,`ufw status` 排出整齐的 ALLOW。阿零后背发凉:「差点给自己表演一个数字流放。」
> 特米:「远程改防火墙,永远先给自己留门。」

> **〔5〕** nginx 配置写完,`nginx -t` 却「emerg」一声——少了个分号,报错直接点名文件和行号。
> 阿零:「它连第几行都告诉我?!」特米:「所以**改完必先 -t 体检**,别拿 reload 赌命。」

> **〔6〕** `tail -f access.log` 滚出第一条来自外网的 `GET / 200`。阿零举着手机,首页在蜂窝网络下亮了。
> 特米:「前台开始记账了。欢迎光临,豆豆咖啡站。」

---

## 三、本话目标

- 用 `ufw` 管住入口:`status` 看现状、`allow`/`deny` 立规矩、`enable` 上岗——**先放行 OpenSSH 再 enable** 的保命顺序刻进 DNA;
- 写一个极简 nginx `server` 块:`listen 80` → `proxy_pass http://127.0.0.1:3000`,理解反向代理;
- 记住配置生效三连:**`nginx -t` 体检 → `systemctl reload nginx` 不断线生效 → `tail -f access.log` 看真实流量**;
- 踩两个真实坑:enable 前忘放行 ssh(未遂)、配置少分号被 `nginx -t` 点名;
- 想通:有了前台,后厨应该**缩回** 127.0.0.1。

---

## 四、原理图:一条请求的入职路线

```text
互联网客人                服务器 203.0.113.10
────────────┐   ┌─────────────────────────────────────────────┐
浏览器       │   │  [ufw 门卫]      [nginx 前台]      [咖啡站后厨] │
GET / ──────┼──▶│  80 ✔ 放行 ──▶  listen 80    ──▶  127.0.0.1:3000│
:80         │   │  22 ✔ 只给主人   proxy_pass         (node)      │
            │   │  3000 ✘ 不临街                                  │
────────────┘   └─────────────────────────────────────────────┘

反向代理 = 前台替客人「代拨内线」:客人只见 80,后厨房间号是内部机密。
```

一句话:**ufw 管「哪扇门开」,nginx 管「进门之后去哪」。**

---

## 五、上手:门卫上岗、前台开业

门卫三步,顺序就是命:

```bash
$ sudo ufw status
Status: inactive

$ sudo ufw allow OpenSSH        # 保命第一条:先给自己留门!
Rules updated
Rules updated (v6)

$ sudo ufw allow 80/tcp         # 给全世界开正门
Rules updated
Rules updated (v6)

$ sudo ufw enable               # 规则齐了才上岗
Command may disrupt existing ssh connections. Proceed with operation (y|n)? y
Firewall is active and enabled on system startup

$ sudo ufw status
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
OpenSSH (v6)               ALLOW       Anywhere (v6)
80/tcp (v6)                ALLOW       Anywhere (v6)
```

那句 `Command may disrupt existing ssh connections` 不是客套——它就是在问:「你给自己留门了吗?」想明确拒绝某扇门,`sudo ufw deny 3000/tcp` 即可。

前台开业,装 nginx、写一个最小 server 块:

```bash
$ sudo apt install -y nginx
$ sudo vim /etc/nginx/sites-available/coffee     # vim 是第 9 话的老朋友
```

```text
# /etc/nginx/sites-available/coffee
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

挂载到 `sites-enabled`(nginx 只认这里的软链接),然后**生效三连**:

```bash
$ sudo ln -s /etc/nginx/sites-available/coffee /etc/nginx/sites-enabled/coffee
$ sudo rm /etc/nginx/sites-enabled/default      # 摘掉默认欢迎页

$ sudo nginx -t                                 # 一连:体检
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful

$ sudo systemctl reload nginx                   # 二连:不断线生效

$ sudo tail -f /var/log/nginx/access.log        # 三连:看真实流量
198.51.100.23 - - [11/Oct/2026:10:23:45 +0800] "GET / HTTP/1.1" 200 1287 "-" "Mozilla/5.0 (iPhone; ...)"
```

> **特米旁白**:`reload` 和 `restart` 不是同义词。reload 是「新员工换班、老员工把手头客人送完」,连接不断;restart 是「全员下班再上班」,线上会闪断。能 reload 就别 restart。

最后收个尾,呼应上一话:后厨缩回客厅——`HOST=127.0.0.1` 重启 node。对外只剩 80,`ss -tlnp` 里 3000 重新变回 `127.0.0.1`,但这次是**故意的**。

---

## 六、故意制造一个 Bug:少一个分号

阿零后来又改配置加 `proxy_set_header`,写到 `proxy_pass` 那行时电话响了,回来忘了行尾的分号:

```text
    location / {
        proxy_set_header Host $host;
        proxy_pass http://127.0.0.1:3000
    }
```

他这次学乖了,没直接 reload,先 `-t` 体检:

```bash
$ sudo nginx -t
```

另一个坑——enable 前没放行 ssh——已在漫画第 3 格被特米用身体拦下,属于「事故未遂」。

---

## 七、读懂真实报错

**坑一(未遂)**,ufw 的警告其实就是报错的预告片:

```text
Command may disrupt existing ssh connections. Proceed with operation (y|n)?
```

根因:ufw 默认策略是 `deny incoming`——enable 一瞬间,**没被 allow 的门全部落锁**,包括你脚下这条 ssh 连接。当前会话或许还能苟住(连接已建立),但只要断开一次,就再也进不来,只能去云控制台用 VNC「破窗」。修法根本不是修,是**顺序**:`allow OpenSSH` → `enable`,永远先给自己留门。

**坑二**,nginx -t 一口咬住行号:

```text
nginx: [emerg] directive "proxy_pass" is not terminated by ";" in /etc/nginx/sites-enabled/coffee:7
nginx: configuration file /etc/nginx/nginx.conf test failed
```

`emerg` 是 emergency——配置根本没法加载。人话翻译:「`proxy_pass` 这条指令没用分号收尾,案发地点 coffee 文件第 7 行。」nginx 配置里**每条指令以分号结束**,少一个,轻则像这样被点名,重则(比如少了右花括号)报 `unexpected end of file, expecting "}"`,行号直接指到文件末尾,得往回找。修法:补上分号,重跑 `-t` 到 `syntax is ok`,再 reload。**体检不过,绝不上岗**——这就是三连里 `-t` 排第一的原因。

> **🪟 双系统对照 · 门卫与前台在 Windows 上叫什么**

| 干什么 | Linux (bash) | PowerShell 7 | 关键差异 |
|---|---|---|---|
| 看防火墙规则 | `sudo ufw status` | `Get-NetFirewallRule \| Where-Object Enabled -eq True` | PS 返回**规则对象**,可继续管道筛选/排序,不用肉眼扫表格 |
| 放行 80 端口 | `sudo ufw allow 80/tcp` | `New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow` | ufw 一句黑话,PS 一长串全名参数——啰嗦,但自带文档 |
| 拒绝端口 | `sudo ufw deny 3000/tcp` | 同上,`-Action Block` | 同一个动词,两种方言 |
| 配置体检 | `sudo nginx -t` | `nginx -t`(nginx.exe 同款) | nginx 跨平台,命令一模一样——好工具自己会带着走 |
| 不断线生效 | `sudo systemctl reload nginx` | `Restart-Service nginx`(或 IIS 的 `iisreset`) | Windows 服务模型没有 reload/restart 之分,这个「不断线」是 systemd 的温柔 |

> **🎯 面试直击**:为什么应用监听 127.0.0.1、由 nginx 对外,而不是直接把 3000 暴露出去?
> 一是**收敛攻击面**:对外只剩 80/443 一个入口,应用端口外网碰不到;二是 80/443 是特权端口,让 nginx 以最小代价占住,应用不必提权;三是前台能干的活多:多个服务共用一个入口按路径分发、静态资源、限流、日志、以后加 HTTPS 都在这一层做,应用零改动。追问 reload vs restart:reload 平滑换配置不断连接,restart 全停再起——线上默认 reload。

---

## 八、用命令验证:门开对了没有

```bash
$ sudo ufw status | grep -E 'OpenSSH|80'
OpenSSH                    ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere

$ ss -tlnp | grep -E ':80 |:3000 '
LISTEN  0  511      0.0.0.0:80    0.0.0.0:*  users:(("nginx",pid=22876,fd=6))
LISTEN  0  511    127.0.0.1:3000  0.0.0.0:*  users:(("node",pid=21501,fd=18))
```

再在笔记本上用 22 话的板斧收尾:

```bash
$ curl -s -o /dev/null -w "%{http_code}\n" http://203.0.113.10
200
```

80 临街、3000 缩回客厅、外网 200——三行输出,一张完美的岗位表。

---

## 九、项目检查点 · 咖啡站入住 v0.2

```text
已具备:ufw 门卫(先 OpenSSH 后 enable 的保命顺序、allow/deny)、nginx 前台
        (server 块反代、-t 体检、reload 不断线、access.log 看流量)、
        外网 80 直达咖啡站、后厨收回 127.0.0.1
还没有:应用还在 nohup 裸跑,一崩就没人扶;服务器 node 版本还和本地
        打架——依赖环境得连锅端走
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 防火墙规则管理 | 「有安全意识」不再是一句空话:最小开放面原则 |
| nginx 反向代理 | 几乎所有后端/运维 JD 的标配词 |
| reload 不断线发布 | 「变更不影响线上服务」的基本功 |

---

## 十一、下一话悬念

门卫在岗,前台开业,阿零却在深夜收到一条崩溃日志:裸跑的 node 进程因为服务器上的 Node 版本比本地旧了两个大版本,一个新语法直接把它带走了。阿零想在服务器上重装 Node,特米摇头:「装完这个版本,下个项目又要另一个版本,服务器迟早变成版本坟场。**别搬家具了,该请集装箱了**——把应用连同它的整个世界打包成一个箱子,在哪落地都长一样。」

> 下一话《Docker 指令速成》:镜像是类,容器是实例——阿零终于能用 Java 类比而不翻车;`docker run -d -p`、`logs -f`、`exec -it` 进箱勘查,还有一张 compose 清单把 app 和 db 一队拉起。

---

*本话属于连载《从零开始玩命令行》。全卷地图见 [/cli](/cli);前作《从零开始学 Java》见 [/java](/java)。*
