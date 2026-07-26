---
title: "《从零开始玩命令行》25 · 上线日:把咖啡站搬进新家"
date: 2026-10-13
summary: "全系列大结局。豆豆与特米同框监工,阿零独立走完全流程:clone、配 .env、compose up、ss 自检、nginx 反代、手机上输入域名——中途还撞上一记 502,被他用 22 话的三板斧当场破案。Java 线 56 话建起咖啡站,命令行 25 话给了它一个家。特米的肚皮上,第一次显示了一颗心。"
tags: [Linux, 命令行, 终端漫画, 部署, 阿零与特米]
---

# 《从零开始玩命令行》25 · 上线日:把咖啡站搬进新家

> 连载特刊 · 第二部《从零开始玩命令行》第 5 卷「网络与部署」第 4 话 · 全系列大结局
> 长期项目:**把豆豆咖啡站部署上真实服务器**。前作《从零开始学 Java》全 56 话见 [/java](/java)。

---

## 一、需求:一次真正的上线

早上八点整,终端里同时亮起两个头像:特米的 `>_` 肚皮,和豆豆举着浓缩的圆脸。这是两位导师第一次同框——一位陪阿零写完了 Java 线的 56 话,一位陪他敲完了命令行的前 24 话。

豆豆:「今天我只监工,不插手。」特米:「我也是。键盘是你的。」

需求只有一行,却是两条连载共同的终点:**让世界上任何一台设备,输入 `coffee.example.com`,看到豆豆咖啡站的首页。**没有新命令要学——今天要做的,是把前面 24 话学过的每一件事,按正确的顺序,亲手串成一条链。

---

## 二、漫画 · 搬家日

> **〔1〕** 清晨的终端,特米和豆豆的头像并排亮起。豆豆:「56 话之后,好久不见,阿零。」
> 特米:「今天我俩只出现在旁白里。开始吧。」

> **〔2〕** 阿零把手放上键盘,忽然想起第 1 话:那个只有一个光标在黑屏上闪的夜晚,他连 `ls` 都不敢按回车。
> 阿零(小声):「原来光标一直没变,变的是我。」

> **〔3〕** `git clone`、`.env`、`chmod 600`、`compose up -d`、`ss`——每敲一条,特米在旁白里轻轻报一个数:「14 话。9 话。1 卷权限课。24 话。22 话。」
> 豆豆:「这不是复习,这是**复利**。」

> **〔4〕** 手机输入 `coffee.example.com`——**502 Bad Gateway**。空气凝固,豆豆刚要开口,阿零抬手拦住。
> 阿零:「让我来。三板斧。」

> **〔5〕** curl 本机 200、ss 在听、error.log 里 `upstream: http://127.0.0.1:3300` 一行现形——proxy_pass 笔误。`nginx -t`,reload,刷新——**首页亮起**。
> 豆豆:「Java 线 56 话你建起它,这 25 话,你给了它一个家。」

> **〔6〕** 阿零想说点什么,最后只在终端敲了一行 `echo "welcome home"`。
> 特米没接话。他的肚皮 `>_` 上,第一次显示的不是提示符,是一颗心。

---

## 三、本话目标

- 独立走完一次完整上线:**clone → 配置与权限 → compose up → ss 自检 → nginx 反代 → curl 自证 → 域名访问**;
- 亲历一次真实的上线日故障(502),用 22 话的三板斧分层破案,而不是重启碰运气;
- 跑一遍**烟测清单**:服务、容器、状态码、日志,四关全绿才算上线;
- 完成两条连载的大闭环:从 `Hello World` 到一个在公网上活着的项目。

---

## 四、原理图:全链路,每一段都有出处

```text
手机浏览器
   │  DNS:coffee.example.com → 203.0.113.10
   ▼ :80
┌──────────────────────── 服务器 ────────────────────────┐
│ [ufw 门卫]──▶[nginx 前台]──proxy_pass──▶ 127.0.0.1:3000 │
│   (23 话)      (23 话)                       │          │
│                                      [docker-proxy]    │
│                                        (24 话)  │       │
│                                 ┌──────集装箱队──▼────┐  │
│                                 │ app ──服务名──▶ db  │  │
│                                 │   (compose,24 话)  │  │
│                                 └────────────────────┘  │
│  钥匙:ssh(21 话)  代码:git(3 卷)  排查:三板斧(22 话)  │
└────────────────────────────────────────────────────────┘
```

一句话:**上线不是一个命令,是一条链;链上每一环,都是某一话的名字。**

---

## 五、上手:全流程,一气呵成

```bash
$ ssh deploy@203.0.113.10                                # 21 话:钥匙
$ git clone git@github.com:doudou-cafe/coffee-shop.git   # 14 话:remote
Cloning into 'coffee-shop'...
remote: Enumerating objects: 214, done.
Receiving objects: 100% (214/214), 187.42 KiB | 1.02 MiB/s, done.
Resolving deltas: 100% (96/96), done.
$ cd coffee-shop

$ vim .env                       # 9 话:vim。填 MONGO_URL、PORT、SECRET
$ chmod 600 .env                 # 1 卷权限课:密钥只许自己读写
$ ls -l .env
-rw------- 1 deploy deploy 128 Oct 13 08:02 .env

$ docker compose up -d           # 24 话:整队集装箱
[+] Running 3/3
 ✔ Network coffee-shop_default  Created                              0.1s
 ✔ Container coffee-shop-db-1   Started                              0.7s
 ✔ Container coffee-shop-app-1  Started                              1.2s

$ ss -tlnp | grep 3000           # 22 话:门开在哪面墙
LISTEN  0  4096  127.0.0.1:3000  0.0.0.0:*  users:(("docker-proxy",pid=1187,fd=4))

$ curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000   # 本机自证
200
```

后厨就位。前台换上正式门牌(23 话的 server 块,`server_name` 填上域名),生效三连:

```bash
$ sudo vim /etc/nginx/sites-available/coffee    # server_name coffee.example.com;
$ sudo nginx -t
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
$ sudo systemctl reload nginx
```

阿零掏出手机,关掉 Wi-Fi,用蜂窝网络在地址栏一个字母一个字母地输入 `coffee.example.com`——

---

## 六、故意制造一个 Bug:上线日的 502

这次不是「故意」的——上线日的墨菲定律亲自到场。手机屏幕上不是咖啡站首页,而是:

```text
502 Bad Gateway
nginx/1.18.0 (Ubuntu)
```

豆豆和特米同时看向阿零。三秒沉默后,阿零深吸一口气,没有慌着重启任何东西——他把 22 话的三板斧拍在桌上:**能返回 502,说明 ufw 和 nginx 都活着,是前台替客人拨内线时,后厨没接。那就一层层问。**

(原来他昨晚改 `server_name` 时顺手「规整」了一遍配置,把 `proxy_pass` 的端口敲成了 3300。)

---

## 七、读懂真实报错

第一斧,后厨自证清白:

```bash
$ curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
200
```

第二斧,门确实开着:

```bash
$ ss -tlnp | grep 3000
LISTEN  0  4096  127.0.0.1:3000  0.0.0.0:*  users:(("docker-proxy",pid=1187,fd=4))
```

服务无辜、端口在听——那就是**前台拨错了内线**。看 nginx 的 error.log,案卷原文:

```text
2026/10/13 08:12:41 [error] 1290#1290: *17 connect() failed (111: Connection refused)
while connecting to upstream, client: 198.51.100.23, server: coffee.example.com,
request: "GET / HTTP/1.1", upstream: "http://127.0.0.1:3300/", host: "coffee.example.com"
```

根因全写在里面:nginx 去连 `upstream: http://127.0.0.1:3300` 被 **Connection refused**(22 话教的:秒拒 = 那个端口没人听)——3300 是笔误,后厨在 3000。这就是 502 的本质:**网关自己活着,但它代拨的上游没接电话。**同族病友还有一个:compose 里 `ports` 忘了写,容器活着但宿主 3000 根本没人听——同一套三板斧,ss 那一斧就能看穿。修法:

```bash
$ sudo grep -n proxy_pass /etc/nginx/sites-enabled/coffee
7:        proxy_pass http://127.0.0.1:3300;
$ sudo vim /etc/nginx/sites-available/coffee     # 3300 → 3000
$ sudo nginx -t && sudo systemctl reload nginx   # 体检通过才 reload
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

刷新手机——首页亮起。豆豆咖啡站的菜单,第一次出现在公网上。

> **🪟 双系统对照 · 上线烟测的两种方言**

| 干什么 | Linux (bash) | PowerShell 7 | 关键差异 |
|---|---|---|---|
| 服务活着吗 | `systemctl status nginx` | `Get-Service nginx` | PS 返回 ServiceController **对象**,`Status` 是属性;systemctl 给你一屏文本 |
| 容器活着吗 | `docker compose ps` | 同一条 | 集装箱到哪都说同一种话 |
| 状态码烟测 | `curl -I 域名` | `iwr 域名 -Method Head` | `iwr` 遇 5xx **直接抛异常**,脚本要 try/catch;curl 默认照样返回,加 `--fail` 才置非零 `$?` |
| 盯实时日志 | `tail -f access.log` | `Get-Content access.log -Wait` | 同一个心跳,两种方言——文本流 vs 对象管道,这门课到最后一话依然成立 |

> **🎯 面试直击**:线上突然 502,你的排查思路?
> 先明确 502 的定义:**网关活着,但从 upstream 拿不到合法响应**——所以别重启网关碰运气。分层走:① 服务器本机 `curl` 上游端口,自证应用层;② `ss -tlnp` 验监听地址和端口(容器场景看端口映射);③ 看 nginx error.log,`upstream:` 字段直接写着它在连谁、错在哪(refused 查端口与进程,timeout 查防火墙)。能把「refused vs timeout」「监听地址」「反代链路」串成一条因果链讲出来,比背十个命令都值钱。

---

## 八、用命令验证:上线烟测清单

四关全绿,才叫上线:

```bash
$ systemctl status nginx --no-pager | head -3                  # 第 1 关:前台
● nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)
     Active: active (running) since Tue 2026-10-13 08:20:11 CST; 6min ago

$ docker compose ps                                            # 第 2 关:后厨
NAME                 IMAGE            COMMAND                  SERVICE   CREATED          STATUS          PORTS
coffee-shop-app-1    coffee-shop-app  "docker-entrypoint.s…"   app       25 minutes ago   Up 25 minutes   127.0.0.1:3000->3000/tcp
coffee-shop-db-1     mongo:7          "docker-entrypoint.s…"   db        25 minutes ago   Up 25 minutes   27017/tcp

$ curl -I http://coffee.example.com                            # 第 3 关:公网门脸
HTTP/1.1 200 OK
Server: nginx/1.18.0 (Ubuntu)
Content-Type: text/html; charset=utf-8
Content-Length: 1287

$ tail -3 /var/log/nginx/access.log                            # 第 4 关:真实客人
198.51.100.23 - - [13/Oct/2026:08:26:02 +0800] "GET / HTTP/1.1" 200 1287 "-" "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ..."
203.0.113.77 - - [13/Oct/2026:08:26:41 +0800] "GET /menu HTTP/1.1" 200 2054 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..."
192.0.2.56 - - [13/Oct/2026:08:27:03 +0800] "GET / HTTP/1.1" 200 1287 "-" "CoffeeBot/1.0 (doudou)"
```

最后那条 UA 是 `CoffeeBot/1.0`——豆豆用自己的爬虫,给新家投了第一张亲友票。

---

## 九、项目检查点 · 咖啡站入住 v1.0 · 大闭环

```text
已具备(两条线的复利,一次上线全部兑现):
  《从零开始学 Java》全 56 话 —— 从 Hello World 到完整业务:语法、集合、IO、
      并发、Spring、测试……咖啡站本身,是豆豆陪他一行行建起来的
  《从零开始玩命令行》全 25 话 —— 终端与文件、权限、grep/find、管道、vim、tar、
      Git 全链、ssh/scp/rsync、ping/curl/ss 三板斧、ufw/nginx、Docker 与 compose
      ……直到今天:独立完成一次真实上线,并当场破掉一记 502
还没有:只留一句 —— 运维的路才刚开始:监控、HTTPS、CI/CD……都是下一个故事。
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 独立完成一次上线 | 简历上「负责项目部署上线」六个字的全部底气 |
| 502 分层破案 | 运维/后端面试的招牌故事:有方法论,不靠重启 |
| 烟测清单意识 | 「上线后确认」比「上线」更专业的那一层 |

---

## 十一、完结 · 新的起点

没有悬念了。这一次,真的没有了。

两条连载在此正式闭环:《从零开始学 Java》56 话,豆豆陪阿零把咖啡站从一行 `Hello World` 建成一个完整的项目;《从零开始玩命令行》25 话,特米陪他把这个项目送进了公网上的家。第 1 话那个让人手心冒汗的黑屏光标,如今是阿零每天最先打开的窗口——**命令行从恐惧,变成了日常。**

如果你也是从某一话中途上车的:欢迎去 [/cli](/cli) 的全卷地图回看任何一话,或者去 [/java](/java) 看看这家咖啡站是怎么被一杯一杯建起来的。而屏幕前的你,那台属于你自己的服务器、那个属于你自己的项目——光标正在闪。

轮到你敲下第一行了。

```text
deploy@coffee:~$ echo "welcome home"
welcome home
deploy@coffee:~$ █
```

---

*本话属于连载《从零开始玩命令行》。全卷地图见 [/cli](/cli);前作《从零开始学 Java》见 [/java](/java)。*
