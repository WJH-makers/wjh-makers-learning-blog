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

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,接下来3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. `ufw` 是什么工具的简称?
   - A) Universal Firewall　B) Uncomplicated Firewall(简化防火墙,iptables 的前端)　C) User File Watcher　D) Unix Forward Web

2. 第一次启用 `ufw` 前,**必须**先执行什么操作?
   - A) 重启服务器　B) 允许 SSH 端口(`ufw allow ssh` 或 `ufw allow 22`),否则启用后 SSH 会被断开　C) 安装 iptables　D) 关闭所有应用

3. nginx 配置中 `server { listen 80; server_name coffee.com; ... }` 的 `server_name` 作用是什么?
   - A) 设置服务器的操作系统主机名　B) 基于域名的虚拟主机匹配(HTTP Host 头匹配)　C) 设置监听 IP　D) 命名 nginx 进程

4. `nginx -t` 命令的作用是什么?
   - A) 启动 nginx　B) 测试配置文件语法是否正确(不实际启动)　C) 显示 nginx 版本　D) 停止 nginx

5. `systemctl reload nginx` 和 `systemctl restart nginx` 的关键区别是什么?
   - A) 完全相同　B) `reload` 重载配置文件**不中断现有连接**(优雅重载),`restart` 停止并重新启动(瞬间中断所有连接)　C) `reload` 更快　D) `restart` 不会检查配置文件

6. nginx 的 `proxy_pass` 指令作用是什么?
   - A) 设置 nginx 的密码　B) 将请求转发(反向代理)到后端应用服务器(如 `http://localhost:3000`)　C) 直接提供静态文件　D) 设置代理服务器地址

7. 配置了 `ufw allow 80` 后再 `ufw enable`,以下说法**正确**的是?
   - A) 只有 80 端口对外可访问,所有其他端口(包括 22)都被拒绝　B) 所有端口都开放　C) 只有 80 和 22 开放　D) 除了 80,之前配置的其他 allow 规则也生效(如已有的 SSH 规则)

8. nginx 配置文件中缺少一个分号 `;`,nginx 能正常运行吗?
   - A) 能,分号不重要　B) nginx 会使用默认分号位置自动修正　C) `nginx -t` 会报告语法错误并指出具体行号,`reload`/`restart` 会失败　D) nginx 会崩溃且无法启动

9. 为什么生产环境中推荐使用 `reload` 而非 `restart`?
   - A) reload 更快　B) reload 实现零停机(zero-downtime):旧 worker 处理完现有请求后退出,新 worker 加载新配置接收新请求,期间服务不中断　C) restart 会丢失日志　D) reload 是新的命令,restart 已废弃

10. 以下关于 ufw 默认策略的说法,**合理**的是?
   - A) 默认允许所有入站和出站连接　B) 默认拒绝所有入站(deny incoming),允许所有出站(allow outgoing)　C) 默认拒绝所有出站和入站　D) ufw 没有默认策略

### 解答题(5 道)

**Q1 概念:** UFW 和 iptables 是什么关系?UFW 的 `allow`/`deny`/`reject` 三种动作的区别是什么?

**Q2 解释:** nginx 作为"反向代理"的工作过程是什么?画图说明客户端→nginx→后端应用的请求流转路径,以及为什么需要 nginx 而不是直接暴露应用端口。

**Q3 操作:** 写出配置防火墙和 nginx 的完整步骤:①放行 SSH 和 HTTP/HTTPS 端口 ②启用防火墙 ③创建 nginx server 块,将 `coffee.com` 的请求代理到 `localhost:8080` ④测试配置并重载 nginx。

**Q4 排障:** 菜菜修改 nginx 配置后执行 `systemctl restart nginx`,服务无法启动,网站挂了。请给出安全的工作流,确保"配置错误不会导致服务中断"。

**Q5 综合设计:** 设计咖啡站的完整入口架构:①防火墙只开放 22、80、443 ②HTTP(80)自动重定向到 HTTPS(443) ③HTTPS 请求由 nginx 反向代理到后端的 3 个微服务(基于 URL 路径:`/api/orders`→order-service:8081,`/api/payments`→payment-service:8082,`/`→frontend:3000) ④配置 Let's Encrypt SSL 证书(使用 certbot 插件) ⑤用 `nginx -t`+`reload` 确保配置变更零停机。

> [!答案]
> **1-B** UFW = Uncomplicated Firewall,是 iptables 的易用前端,**简化**防火墙规则的增删。**举一反三:**iptables 语法复杂(需要长命令),ufw 提供简洁接口(`ufw allow 80`)。底层 UFW 仍然翻译为 iptables 规则。🪟 Windows 防火墙用 `netsh advfirewall` 或 GUI `wf.msc`。
>
> **2-B** 这是一条"保命铁律"——先放行 SSH(`ufw allow ssh`),再 `ufw enable`。因为防火墙默认策略是"拒绝所有入站",如果先 enable 再 allow SSH,你的 SSH 连接会被立即切断。**举一反三:**这是初学者(和老手)最常见的踩坑——忘记先放行 SSH,然后不得不通过控制台(VNC/串口)抢救。🪟 云服务器的安全组和本地防火墙是两套不同的系统。
>
> **3-B** `server_name` 实现"虚拟主机"(Virtual Host):同一个 IP 地址同一端口(如 80)上,根据 HTTP 请求头中的 `Host` 字段(如 `coffee.com` vs `blog.coffee.com`),匹配到不同的 server 块,提供不同的网站内容。**举一反三:**`nginx -T | grep server_name` 列出所有 server_name 配置。`server_name _;` 作为默认 server(捕获所有不匹配的请求)。
>
> **4-B** `-t`=test,检查所有配置文件(`nginx.conf` + 所有 include 文件)的语法有效性,输出 `syntax is ok` 或 `nginx: [emerg] unexpected "X" in ...`。**举一反三:**这是 nginx 的安全带——每次修改配置后,必须先 `nginx -t`,确认通过后 `systemctl reload nginx`。跳过 `-t` 直接 reload 是玩火。
>
> **5-B** reload 是向 master 进程发 SIGHUP 信号:master 启动一组新 worker(加载新配置),并告诉旧 worker"优雅退出"(处理完当前请求后关闭)。restart 是停掉全部进程再启动,期间服务不可用。**举一反三:**nginx 的 reload 是其"七层可靠性"的基石——配置变更无需停机。但 reload 不会重读 SSL 证书(证书只在新连接建立时校验),如果更换证书,需要 restart 或手动 `kill -USR1` 重读。
>
> **6-B** `proxy_pass` 是反向代理的核心指令,将匹配的请求转发到后端服务器。如 `proxy_pass http://localhost:3000;` 把所有匹配当前 location 的请求转发给 3000 端口的 Node.js 应用。**举一反三:**常见搭配:`proxy_set_header Host $host;`(传递原始域名),`proxy_set_header X-Real-IP $remote_addr;`(传递客户端真实 IP,否则后端只能看到 nginx 的 IP),`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`。
>
> **7-D** `ufw enable` 激活之前添加的所有规则(含 SSH 的 allow 规则)。如果只配置了 `ufw allow 80`,默认策略是拒绝其他端口。但之前已经配置的规则(如 `ufw allow 22`)会被保留并生效。**举一反三:**`ufw status numbered` 显示带编号的规则列表;`ufw delete 3` 通过编号删除规则;`ufw reset` 重置所有规则并禁用防火墙。
>
> **8-C** nginx 配置文件**严格**要求每条指令以分号 `;` 结尾,每对花括号正确闭合。`nginx -t` 会报错:`nginx: [emerg] unexpected ";" in /etc/nginx/sites-enabled/coffee:5`(精确到文件和行号)。**举一反三:**`;` 遗漏 + `{}` 不匹配 + `server_name` 域名拼写错误是 nginx 配置的三大刽子手。每次改配置后执行 `nginx -t` 是肌肉记忆。
>
> **9-B** reload=旧 worker 优雅退出(处理完现有请求)+ 新 worker 启动(用新配置处理新请求),整个过程**不丢失连接**。restart=stop→start,这中间的窗口期所有请求都被拒绝。**举一反三:**即使 `nginx -t` 通过,reload 也可能遇到语法错误(比如 include 的文件在 test 后被删除)。如果 reload 失败,旧 worker 继续工作(回退保护),但最好还是 reload 后立即 `curl -I` 测试一下。
>
> **10-B** ufw 默认策略:拒绝所有入站(保护服务器),允许所有出站(不影响服务器主动访问外网)。**举一反三:**可以通过 `ufw default deny incoming` 和 `ufw default allow outgoing` 显式设置;`ufw default deny outgoing` 彻底锁死出站(极严格,通常只在安全审计场景使用)。🪟 Windows 防火墙也类似:默认阻止入站,允许出站。
>
> **Q1** UFW 是 iptables 的"用户友好前端"。iptables 是 Linux 内核 netfilter 框架的命令行工具,功能强大但语法复杂(每个规则需要写长命令)。UFW 将常用操作简化:`ufw allow 80` → 底层转换为 `iptables -A INPUT -p tcp --dport 80 -j ACCEPT`。**三种动作:**`allow`=接受连接(ACCEPT),`deny`=丢弃数据包(DROP,不给任何回应,客户端表现为 timeout),`reject`=拒绝并回复 ICMP/错误包(REJECT,客户端表现为 Connection refused)。**使用场景:**对外服务用 allow;内部服务不想让外面知道存在用 deny(静默);需要明确告诉对方"不允许"用 reject。
>
> **Q2** 请求流转:用户浏览器→ `https://coffee.com` → DNS 解析→服务器 IP→nginx(监听 443)→根据 `server_name` 匹配 server 块→根据 URL 路径匹配 location→`proxy_pass` 转发到后端应用(localhost:8080)→应用处理→返回响应给 nginx→nginx 返回给用户。**为什么需要 nginx:**①安全:只有 80/443 暴露给外网,后端应用隐藏在 localhost(不绑定公网 IP) ②SSL 终端:nginx 负责 HTTPS 加密/解密,后端无需处理 SSL ③静态文件加速:nginx 直接提供 HTML/CSS/JS,不经过后端应用 ④负载均衡:`upstream` 块分发请求到多个后端实例 ⑤缓存/Gzip/限流等中间件功能。
>
> **Q3** 完整步骤:①`sudo ufw allow ssh && sudo ufw allow http && sudo ufw allow https`(分别或 `sudo ufw allow 22,80,443/tcp`) ②确认 SSH 已放行后 `sudo ufw enable` → `sudo ufw status` 验证 ③`sudo vim /etc/nginx/sites-available/coffee`,写入:`server { listen 80; server_name coffee.com; location / { proxy_pass http://localhost:8080; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; } }` ④`sudo ln -s /etc/nginx/sites-available/coffee /etc/nginx/sites-enabled/`(启用站点) ⑤`sudo nginx -t`(测试配置) ⑥`sudo systemctl reload nginx`(重载) ⑦`curl -I http://coffee.com/` 验证(如果 DNS 未配,可 `curl -H "Host: coffee.com" http://server-ip/`)。**举一反三:**配置前备份:`cp original.conf original.conf.bak`。
>
> **Q4** 安全工作流:①修改配置前:`sudo cp /etc/nginx/sites-enabled/coffee /tmp/coffee.backup`(备份) ②修改后**不直接 restart** ③`sudo nginx -t`(先测试) ④如果通过:`sudo systemctl reload nginx`(优雅重载) ⑤如果 `-t` 失败:根据错误提示修正,再次 `-t`,直到通过 ⑥**严禁在生产环境下跳过 `-t` 直接 restart/reload** ⑦如果 reload 后发现问题:快速回滚 `sudo cp /tmp/coffee.backup /etc/nginx/sites-enabled/coffee && sudo nginx -t && sudo systemctl reload nginx`。**举一反三:**自动化部署脚本中务必包含 `nginx -t` 检查,失败则回滚+告警。nginx 的 `-T` 大写选项可以输出完整的合并后配置,方便调试 include/继承问题。
>
> **Q5** 架构:①防火墙:`ufw default deny incoming && ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw --force enable`。②HTTP→HTTPS:`server { listen 80; server_name coffee.com; return 301 https://$host$request_uri; }`(301 永久重定向)。③HTTPS 反向代理:同一 server 块:`listen 443 ssl; ssl_certificate /etc/letsencrypt/live/coffee.com/fullchain.pem; ssl_certificate_key /etc/letsencrypt/live/coffee.com/privkey.pem;` →location 规则:`location /api/orders/ { proxy_pass http://localhost:8081/; }`, `location /api/payments/ { proxy_pass http://localhost:8082/; }`, `location / { proxy_pass http://localhost:3000/; }`。④SSL 证书:`sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d coffee.com`(自动配置 SSL 并设自动续期) ⑤零停机部署流程:改配置→`nginx -t`→`systemctl reload nginx`→`curl -I https://coffee.com/ | grep "200 OK"`(烟测)。**举一反三:**注意 `proxy_pass` URL 尾部的 `/` 行为:`location /api/ { proxy_pass http://backend/; }` 中的 `/` 会去除 `/api` 前缀;不加 `/` 会保留前缀传给后端。
