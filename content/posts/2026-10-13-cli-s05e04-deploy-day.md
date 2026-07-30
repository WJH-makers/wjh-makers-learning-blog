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

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,接下来3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. "完整上线链"一般包含哪些步骤?
   - A) 只写代码　B) clone 代码→安装依赖→配置环境→启动服务→配置反向代理→测试　C) 只有启动服务　D) 上传文件即可

2. 502 Bad Gateway 错误,在 nginx 反向代理架构中最可能的原因是什么?
   - A) 客户端网络故障　B) nginx 本身崩溃　C) nginx 可以工作,但**后端应用服务**(proxy_pass 的目标)没有运行或无法响应　D) DNS 解析失败

3. "上线烟测四关"通常指什么?
   - A) 功能测试、性能测试、安全测试、兼容性测试　B) 端口监听(`ss`)、HTTP 可达(`curl`)、状态码正确、内容验证　C) 单元测试、集成测试、E2E 测试、压力测试　D) 代码审查、自动化测试、手动测试、上线审批

4. 502 排查的"三板斧"是什么?
   - A) 重启 nginx、重启服务器、重装系统　B) ①`systemctl status <app>`检查后端服务状态 ②`docker ps`/`ss -tlnp`检查端口监听 ③`journalctl -u <app> -f`查看后端日志　C) `ping`、`traceroute`、`nslookup`　D) 清除浏览器缓存、重启路由器、换电脑

5. `docker-compose ps` 在部署中的作用是什么?
   - A) 列出所有 Docker 镜像　B) 快速查看 compose 项目中各容器的状态(Up/Exited/端口映射)　C) 列出所有进程　D) 查看 compose 文件语法

6. `git clone`→`cd project`→`docker compose up -d`→`ss -tlnp`→`nginx -t && systemctl reload nginx`→`curl -I localhost` 这段操作序列体现了什么思想?
   - A) 随机操作　B) 完整的上线链:代码获取→服务启动→端口确认→反向代理配置→HTTP 验证　C) 只有 Docker 操作　D) 只适合开发环境

7. 部署后通过 `curl` 测试时,返回 404(Not Found)而非 502,这说明什么?
   - A) 后端服务没运行　B) 后端服务**正在运行**,但请求的 URL 路径/路由不对(nginx 正确转发了请求,但后端没有该路径的处理逻辑)　C) nginx 没有安装　D) 防火墙阻挡

8. 关于"上线烟测",以下哪项是**不必要**的?
   - A) 确认端口在监听　B) 确认 HTTP 返回状态码 200　C) 确认页面内容包含预期关键字　D) 在服务器上打开浏览器用鼠标点击所有链接

9. `docker-compose up -d` 后执行 `docker-compose logs -f app`,看到堆栈信息 `Connection refused: postgres:5432`,最可能的原因是什么?
   - A) PostgreSQL 容器还没启动完成(启动顺序问题,app 需要等待 postgres 就绪)　B) Docker 网络故障　C) Java 版本不兼容　D) nginx 配置错误

10. 关于生产部署后的回滚策略,以下哪种做法**最有效**?
   - A) 每次部署前手动备份文件　B) 使用 Git tag+commit hash 标记版本,部署脚本保留最近 3 个版本的可运行包,回滚时切换到旧版本并重启服务　C) 依赖 Docker 镜像的 `latest` 标签自动回滚　D) 部署后立即删除旧版本代码

### 解答题(5 道)

**Q1 概念:** 画出"完整上线链"的流程图:从代码仓库到用户可访问的完整路径,标注每一步使用的命令和验证方式。

**Q2 解释:** 为什么 502 Bad Gateway 被称为"后端服务的健康晴雨表"?解释 502 vs 503 vs 504 三种 nginx 错误的含义和排查方向。

**Q3 操作:** 写出从零开始部署咖啡站的完整命令序列:clone 仓库→创建 .env 配置文件→docker compose 启动→确认所有服务→配置 nginx 反向代理→SSL 证书→烟测验证→记录部署日志。

**Q4 排障:** 部署后访问 HTTPS 域名,浏览器显示 "ERR_CONNECTION_REFUSED"。请按分层排查给出诊断流程,并给出每种原因的解决方案。

**Q5 综合设计:** 为咖啡站设计一套"零恐惧部署"方案(基于前面 24 话全部知识),要求包括:①基于 git tag 的版本管理 ②自动化部署脚本(含 rollback) ③健康检查(端口+HTTP+内容) ④部署日志和告警 ⑤"部署后 5 分钟监控期"(如果在 5 分钟内发现问题,自动回滚)。写出方案框架和关键命令。

> [!答案]
> **1-B** 完整上线链:代码获取(clone/pull)→环境准备(依赖安装/镜像构建)→配置注入(环境变量/配置文件)→服务启动→反向代理(nginx)→端口/HTTP 验证→域名 SSL→最终确认。**举一反三:**这是前面 24 话所有知识的综合实践——每一环都可能出问题,所以需要"烟测"在每个环节停下来验证。
>
> **2-C** 502 是 nginx(作为网关/代理)从上游服务器(upstream/proxy_pass 目标)收到了**无效响应**(通常是后端服务崩溃/未启动/超时被关闭连接)。**举一反三:**502 的三板斧:查后端进程状态、查端口监听、查后端日志——这三步通常能定位 90% 的问题。🪟 IIS 中 502 等价错误是 "502 - Web server received an invalid response while acting as a gateway or proxy server"。
>
> **3-B** "烟测"(Smoke Test)四关:①端口:`ss -tlnp | grep :8080`(服务在听吗?) ②HTTP 可达:`curl -I http://localhost:8080/`(能连上吗?) ③状态码:`curl -o /dev/null -s -w "%{http_code}\n" http://localhost/`(返回 200 吗?) ④内容验证:`curl -s http://localhost/ | grep "Coffee Shop"`(页面内容对吗?)。**举一反三:**烟测是部署的最后一道防线——不跑完整测试套件,只验证"最基本的烟能不能冒起来"。如果烟都没冒,不用深入排查,直接回滚。
>
> **4-B** 三板斧:①`systemctl status coffee-app` 或 `docker ps | grep coffee-app`(应用在运行吗?) ②`ss -tlnp | grep <port>`(应用端口在监听吗?) ③`journalctl -u coffee-app -n 50` 或 `docker logs --tail 50 coffee-app`(应用日志有什么错误?)。**举一反三:**502 是我们这一路学到的故障排查综合实践:`systemctl`(进程管理)+`ss`(网络)+`journalctl`/`docker logs`(日志)+`curl`(HTTP 验证)。四条命令就是你的排查工具箱。
>
> **5-B** `docker-compose ps` 按 compose 项目分组显示容器运行状态、端口映射等。**举一反三:**这是部署后第一个要敲的验证命令;`docker stats` 看资源使用;`docker-compose logs --tail 20` 快速抽查日志。
>
> **6-B** 这正是我们全系列 24 话打造的"命令流"思维方式:每一步一个命令,每一步验证一个状态,不跳步,不盲推。**举一反三:**把这 6-7 个命令写成 `deploy.sh` 脚本,每次上线不用手敲,减少人为失误。Linux 的"组合式思维"在这里达到最高境界:把简单工具串成流水线。
>
> **7-B** 404 说明请求**成功到达后端**(nginx 转发正常,后端服务在运行),但后端找不到对应的 URL 处理逻辑。**举一反三:**这是好消息——说明 nginx 和后端通信没问题,问题缩小到"URL 路由配置"。检查后端路由表是否正确注册了该 URL。
>
> **8-D** 服务器上通常没有 GUI 浏览器;烟测之所以叫"烟测",就是因为它是轻量级的**命令行快速验证**,不需要打开浏览器。**举一反三:**在开发环境用浏览器完整测试,在生产环境用命令行快速烟测——各司其职。
>
> **9-A** Docker Compose 的 `depends_on` 只保证**容器启动顺序**,不等待服务"就绪"。postgres 容器启动了但 postgres 进程还在初始化(创建数据库、加载扩展等,可能需要几十秒),此时 app 容器已经启动,尝试连接→遭到拒绝。**解决:**①应用中实现数据库连接重试逻辑 ②使用 `dockerize` 或 `wait-for-it.sh` 在 app 启动前等待 `postgres:5432` 可连接 ③使用 Compose v3.8+ 的 `condition: service_healthy`+`healthcheck`。**举一反三:**这是 Docker 新手最常遇到但最难理解的问题——"容器启动≠服务就绪"。
>
> **10-B** Git tag 标记版本号+保留可运行包的方案,可以在任何时间点精确回滚。`latest` 标签总是指向最新,无法精确回滚。**举一反三:**`git tag v1.2.3 && git push --tags` 标记版本;`docker tag coffee-app:v1.2.3 coffee-app:stable` 维护可工作指针;回滚脚本:`docker-compose down && git checkout v1.2.2 && docker-compose up -d`。
>
> **Q1** 完整上线链流程:①`git clone`/`git pull` 获取代码 ②`cd project` 进入项目 ③准备环境变量(`cp .env.example .env && vim .env`) ④`docker compose build` 构建镜像/`npm install` 安装依赖 ⑤`docker compose up -d` 启动服务 ⑥验证服务:`docker-compose ps`(所有 Up)→`ss -tlnp | grep :8080`(端口监听)→`curl localhost:8080/health`(健康端点) ⑦配置 nginx:`sudo vim /etc/nginx/sites-available/coffee`(server_name+proxy_pass)→`nginx -t`→`sudo systemctl reload nginx` ⑧SSL 证书:`sudo certbot --nginx -d coffee.com` ⑨烟测:`curl -I https://coffee.com/ | grep "200 OK"`→`curl -s https://coffee.com/ | grep "Coffee"` ⑩记录:`echo "$(date): deployed $(git rev-parse --short HEAD)" >> /var/log/deploy.log`。**核心:**每一步都验证,而不是一口气做完最后才发现问题。
>
> **Q2** 三种 nginx 错误码:①**502 Bad Gateway:**nginx 作为网关/代理,从上游收到无效响应。含义:后端服务**存在但有问题**(崩溃/返回了乱码/连接被 RST)。排查:后端进程状态、端口监听、应用日志(stack trace/OOM)。②**503 Service Unavailable:**nginx 暂时无法处理请求。含义:后端服务**不存在**(未启动/停机维护/连接池耗尽)。排查:后端进程是否存在(start/enable)、上游服务器配置是否正确。③**504 Gateway Timeout:**nginx 等待上游响应超时。含义:后端服务**在运行但太慢**(处理超时,默认 60s)。排查:应用性能(数据库慢查询/死锁/GC 长时间暂停)、`proxy_read_timeout` 是否过短。**晴雨表比喻:**502/503/504 的差异就像体温计的不同读数:502=发烧了(有问题)、503=昏过去了(不存在)、504=反应迟钝(太慢)。
>
> **Q3** 完整命令序列:`git clone git@github.com:coffee/shop.git && cd shop` → `cp .env.example .env && vim .env`(设置密码和密钥) → `docker compose build && docker compose up -d` → `docker-compose ps`(确认所有容器 Up) → `sudo vim /etc/nginx/sites-available/coffee`(配置反向代理) → `sudo ln -s /etc/nginx/sites-available/coffee /etc/nginx/sites-enabled/` → `sudo nginx -t && sudo systemctl reload nginx` → `sudo certbot --nginx -d coffee.com -d www.coffee.com` → 烟测:`ss -tlnp | grep :80`(nginx 监听)→`ss -tlnp | grep :8080`(app 监听)→`curl -o /dev/null -s -w "%{http_code}\n" https://coffee.com/`(应输出 200)→`curl -s https://coffee.com/ | grep "Welcome"`(内容验证) → `echo "$(date '+%Y-%m-%d %H:%M:%S') | $(git rev-parse --short HEAD) | deploy success" | sudo tee -a /var/log/coffee-deploy.log`。**举一反三:**把整段命令写成 `deploy.sh`,使用 `set -euo pipefail`(遇错立即退出),前面 24 话的技巧全部用上。
>
> **Q4** ERR_CONNECTION_REFUSED 分层排查:①**网络层:**`ping coffee.com`(能解析到正确 IP 吗?能 ping 通吗?) 如果不是,检查 DNS 解析和服务器网络 ②**防火墙:**`sudo ufw status`(防火墙是否阻挡 80/443?) + 云安全组检查 ③**端口监听:**`sudo ss -tlnp | grep -E ":80|:443"`(nginx 在监听吗?) ④**nginx 状态:**`sudo systemctl status nginx`(nginx 在运行吗?)→如果没运行,`sudo systemctl start nginx` ⑤**SSL 证书:**如果是 HTTPS 且 nginx 运行,检查 SSL 配置(`listen 443 ssl;` + 证书路径是否正确) ⑥**域名 DNS:**`dig coffee.com`(DNS 记录指向正确的服务器 IP 吗?) ⑦如果是刚部署就拒绝连接,等 1-2 分钟(DNS 传播延迟)。**解决矩阵:**nginx 没装→安装;firewall 没放行→ufw allow;服务没监听→start;DNS 指错→更新 DNS 记录;SSL 证书过期→certbot renew。
>
> **Q5** "零恐惧部署"方案框架:①**版本管理:**每次部署前打 tag:`git tag v$(date +%Y%m%d-%H%M%S) && git push --tags`;docker 镜像用 commit hash+timestamp 做标签:`docker build -t coffee-app:$(git rev-parse --short HEAD) .`。②**部署脚本:**`deploy.sh` 包含:备份当前版本→拉取新代码→构建镜像→启动新容器→烟测→如果烟测通过,清理旧版本;如果烟测失败,自动回滚。③**健康检查:**函数 `smoke_test() { curl -f -s -o /dev/null http://localhost:8080/health || return 1; }`;部署后调用该函数判断。④**5 分钟监控:**`./deploy.sh && sleep 300 && ./smoke_test.sh`(如果 5 分钟后健康检查失败,发告警);或者用 systemd timer 每分钟运行健康检查脚本。⑤**回滚:**保留最近 3 个版本的可运行包(镜像 tag);回滚脚本:`docker compose down && git checkout $PREV_TAG && docker compose up -d`。⑥**部署日志:**每次部署写入 JSON 格式日志:`{"time":"...","version":"...","result":"success|fail","duration":"...","who":"..."}` → 便于后续统计部署成功率。**举一反三:**当你走完这 25 话,掌握了部署链上每个环节的工具,你就建立了一个"命令自信":你知道每一步做什么、如何验证、错了怎么回滚。这就是"零恐惧"——不是不出错,而是每步可验证、每错可回滚。

## 运行前边界、回滚与验证

- **运行前**：示例以 GNU/Linux 的 Bash 为主；先用 `command --help`、`man command` 或发行版文档确认本机版本和参数。不要把教程中的 IP、域名、用户、路径直接复制到生产机器。
- **先确认作用域**：涉及文件、仓库、容器或远端主机时，先运行 `pwd`、`whoami`、`git status`、`docker context show` 或 `ssh -G 主机别名`，确认当前目标；对重要数据先做可恢复备份。
- **完成后验证**：用只读命令确认结果，例如 `ls -la`、`git status`、`systemctl status 服务名`、`docker ps` 或 `curl -fS URL`；失败时停止扩大操作范围，先读报错。
- **权限边界**：先用 `stat`/`ls -ld` 查所有者和现有权限；按最小权限原则修改，避免 `chmod -R 777`。`sudo` 仅用于明确的单条命令，不在不理解的脚本前盲加。
- **远端边界**：首次连接核验主机指纹；传输前先确认目标路径和账号，`rsync` 删除模式必须先加 `--dry-run`。远程改网络或防火墙时保留一个已登录会话和云控制台回退路径。
- **容器边界**：先执行 `docker context show`、`docker ps -a` 和 `docker system df`；清理命令只对确认无用的资源执行，带卷的删除额外确认持久化数据和备份。
- **网络边界**：远程启用防火墙前先放行当前 SSH 入口；修改 Nginx 后先 `nginx -t`，通过后再 reload，并从外部和本机两侧验证端口与 HTTP 状态。
