---
title: "《从零开始玩命令行》22 · 网络三板斧:ping / curl / ss"
date: 2026-10-10
summary: "代码传上服务器了,浏览器输 IP 却打不开。特米掏出网络排查三板斧:ping 问路通不通,curl 问服务活没活,ss 问端口谁在听。阿零先把 Connection refused 和 timeout 两种「打不开」分了家,又在 ss -tlnp 的输出里逮住真凶——咖啡站把门牌挂在了 127.0.0.1 的自家客厅。"
tags: [Linux, 命令行, 终端漫画, curl, ss, 阿零与特米]
---

# 《从零开始玩命令行》22 · 网络三板斧:ping / curl / ss

> 连载特刊 · 第二部《从零开始玩命令行》第 5 卷「网络与部署」第 1 话
> 长期项目:**把豆豆咖啡站部署上真实服务器**。前作《从零开始学 Java》全 56 话见 [/java](/java)。

---

## 一、需求:代码上去了,浏览器为什么打不开

上一话阿零用 `rsync` 把咖啡站源码稳稳送进了服务器,兴奋地在浏览器地址栏敲下 `http://203.0.113.10:3000`——转圈,转圈,最后一句冷冰冰的「无法访问此网站」。

阿零的第一反应是重传一遍代码。特米按住他:「打不开不是一种病,是**一串**病:路不通?服务没起?门开错了墙?得**一层一层问**,而不是把所有药一起灌下去。」

---

## 二、漫画 · 三板斧

> **〔1〕** 阿零盯着浏览器的转圈圈,上一话传完代码的兴奋只维持了三十秒。
> 阿零:「rsync 明明说传完了……浏览器你是不是针对我?」

> **〔2〕** 特米从光标里探出头,肚皮 `>_` 上排出三个词:ping、curl、ss。
> 特米:「排查分三层:**路通不通、服务活没活、端口谁在听**。一层层问,别瞎猜。man 一下也行,但先学会问对问题。」

> **〔3〕** 笔记本上 `ping -c 3 203.0.113.10`,三发三中,8 毫秒。
> 特米:「路是通的,主机活着。第一层排除。**ping 走 ICMP,只问『人在吗』,不问『店开没开』**。」

> **〔4〕** 阿零 ssh 进服务器,`curl localhost:3000`——`Connection refused`。他愣住:服务根本没起!`node server.js` 拉起来再 curl,一屏 HTML。
> 特米:「**先在本机自证清白**。本机都不通,就别怪网络。」

> **〔5〕** 可笔记本上再访问,依然打不开。特米让他敲 `ss -tlnp`,输出里一行 `127.0.0.1:3000` 亮得刺眼。
> 特米:「看见没,你的咖啡站把门牌挂在了**自家客厅**——只接本机的敲门。」

> **〔6〕** 阿零把监听地址改成 `0.0.0.0`,ss 里的那行变了脸。
> 特米:「`0.0.0.0` 才是临街大门。记住这幕:**本机 curl 通、外网打不开,先查监听地址。**」

---

## 三、本话目标

- 建立分层排查心智:**通不通(ping)→ 活没活(curl)→ 谁在听(ss)**;
- 用 `curl -I` 只看状态码、`curl -v` 看整个握手过程、`curl localhost:端口` 做本机自证;
- 逐列读懂 `ss -tlnp`,认清 `0.0.0.0` 与 `127.0.0.1` 两种监听地址的分水岭;
- 分清两种「打不开」:`Connection refused`(有人明确拒绝)vs `timeout`(路上没人应答);
- 踩两个真实坑:服务只听 127.0.0.1、curl 拼错端口。

---

## 四、原理图:三层三问

```text
「浏览器打不开」≠ 一种病。至少分三层,一层层问:

第 1 层 · 路通吗?         ping <IP>            ICMP:只问主机在不在,不问服务
        │ 通
        ▼
第 2 层 · 服务活着吗?     curl localhost:3000   先在服务器本机自证清白
        │ 活着
        ▼
第 3 层 · 门开在哪面墙?   ss -tlnp              监听地址决定「谁能进来」

监听地址两兄弟:
  127.0.0.1:3000   只接本机(loopback)的敲门 —— 门牌挂在自家客厅
  0.0.0.0:3000     接所有网卡的敲门          —— 门牌挂在临街大门
```

一句话:**ping 通只说明「人在家」,curl 通才说明「店开门」,ss 告诉你「门朝哪开」。**

---

## 五、上手:三板斧各抡一遍

第一板斧,笔记本上先探路:

```bash
$ ping -c 3 203.0.113.10
PING 203.0.113.10 (203.0.113.10) 56(84) bytes of data.
64 bytes from 203.0.113.10: icmp_seq=1 ttl=52 time=8.42 ms
64 bytes from 203.0.113.10: icmp_seq=2 ttl=52 time=8.17 ms
64 bytes from 203.0.113.10: icmp_seq=3 ttl=52 time=8.30 ms

--- 203.0.113.10 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms
rtt min/avg/max/mdev = 8.166/8.297/8.421/0.104 ms
```

第二板斧,ssh 进服务器,把服务拉起来、**在本机自证**:

```bash
$ nohup node server.js > app.log 2>&1 &    # 2>&1 是第 7 话的老朋友
[1] 21354
$ curl -I http://localhost:3000            # -I 只要响应头,看状态码最快
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: text/html; charset=utf-8
Content-Length: 1287
Date: Sat, 10 Oct 2026 09:12:31 GMT
Connection: keep-alive
```

想看「电话是怎么接通的」,加 `-v`(verbose):

```bash
$ curl -v http://localhost:3000/ -o /dev/null -s
*   Trying 127.0.0.1:3000...
* Connected to localhost (127.0.0.1) port 3000 (#0)
> GET / HTTP/1.1
> Host: localhost:3000
> User-Agent: curl/7.81.0
> Accept: */*
>
< HTTP/1.1 200 OK
* Connection #0 to host localhost left intact
```

`>` 开头是 curl 说出去的话,`<` 是服务器答回来的——一次 HTTP 对话全程录音。

第三板斧,看端口谁在听:

```bash
$ ss -tlnp
State   Recv-Q  Send-Q   Local Address:Port    Peer Address:Port  Process
LISTEN  0       511          127.0.0.1:3000         0.0.0.0:*      users:(("node",pid=21354,fd=18))
LISTEN  0       128            0.0.0.0:22           0.0.0.0:*      users:(("sshd",pid=612,fd=3))
LISTEN  0       128               [::]:22              [::]:*      users:(("sshd",pid=612,fd=4))
```

逐列拆:`-t` 只看 TCP,`-l` 只看正在监听的,`-n` 端口用数字别翻译成服务名,`-p` 带上进程。`State` 是状态;`Local Address:Port` 是**监听地址**——本话主角;`Process` 告诉你门后站着谁(进程名和 pid)。

> **特米旁白**:sshd 那行是 `0.0.0.0:22`,所以你能从外面 ssh 进来;node 那行是 `127.0.0.1:3000`,所以外面谁也进不去。同一台机器,两种命运,差别全在这一列。

---

## 六、故意制造一个 Bug:两种「打不开」

阿零在服务器上手滑,把端口敲成了 3300:

```bash
$ curl http://localhost:3300
```

紧接着他回到笔记本,直接访问服务器的 3000 端口(此时服务还只听 127.0.0.1):

```bash
$ curl --connect-timeout 5 http://203.0.113.10:3000
```

两条命令都失败了——但**失败得完全不一样**。

---

## 七、读懂真实报错

**坑一**,拼错端口,秒回:

```text
curl: (7) Failed to connect to localhost port 3300 after 0 ms: Connection refused
```

**坑二**,外网访问,干等五秒:

```text
curl: (28) Connection timed out after 5001 milliseconds
```

根因是两回事。`Connection refused` 是**有人明确拒绝**:包到了机器,内核一看 3300 端口没人听,立刻回一个 RST——「查无此店」,所以 0 毫秒就死心。`timeout` 是**路上没人应答**:SYN 发出去石沉大海,连拒绝都没有——十有八九是防火墙把包**悄悄丢了**(DROP),或者压根没路由到。**秒拒查端口和进程,干等查防火墙和网络**,这条经验值一次深夜加班。

坑二的真凶用第三板斧一眼看穿:`ss -tlnp` 里 node 监听的是 `127.0.0.1:3000`。修法是让应用听 `0.0.0.0`——咖啡站的 `server.js` 里写死了开发期的 `HOST=127.0.0.1`,改成环境变量并默认 `0.0.0.0`,重启:

```bash
$ kill 21354 && HOST=0.0.0.0 nohup node server.js > app.log 2>&1 &
[1] 21501
$ ss -tlnp | grep 3000
LISTEN  0  511  0.0.0.0:3000  0.0.0.0:*  users:(("node",pid=21501,fd=18))
```

可笔记本上再 curl——**依然 timeout**。特米:「绑定修好了,但门外还有一道墙在丢你的包。这个坑先钉在这,下一话拆。」

> **🪟 双系统对照 · 三板斧在 PowerShell 上怎么抡**

| 干什么 | Linux (bash) | PowerShell 7 | 关键差异 |
|---|---|---|---|
| 探路 | `ping -c 3 主机` | `Test-Connection 主机 -Count 3` | PS 返回**对象数组**,`Latency` 是属性,可直接 `Sort-Object` |
| 只看状态码 | `curl -I url` | `(iwr url -Method Head).StatusCode` | `iwr` 返回响应对象;遇 4xx/5xx **直接抛异常**而不是打印 |
| 端口谁在听 | `ss -tlnp` | `Get-NetTCPConnection -State Listen` | `OwningProcess` 属性可管道给 `Get-Process`——对象接力,不用肉眼抠 pid |
| 测端口通不通 | `curl` / `nc -zv 主机 3000` | `Test-NetConnection 主机 -Port 3000` | 结果里 `TcpTestSucceeded` 是**布尔属性**,脚本判断零解析 |

老规矩:Linux 三板斧吐**文本**,你用眼睛和 grep 找;PS 吐**对象**,你用属性名直接拿。

> **🎯 面试直击**:`Connection refused` 和连接超时有什么区别?排查思路呢?
> refused = 对方主机**回了 RST**:机器在线,但目标端口没进程监听(或明确拒绝),重点查服务起没起、端口对不对;timeout = SYN **没有任何回应**,重点查防火墙(DROP 不回包)、安全组、路由。排查按层走:ping 验主机 → 服务器本机 curl 验服务 → `ss -tlnp` 验监听地址(127.0.0.1 还是 0.0.0.0)→ 再查防火墙。追问「本机通外网不通」:监听地址和防火墙,就这两个惯犯。

---

## 八、用命令验证:三层各自过关

```bash
$ curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000   # 只输出状态码
200
$ ss -tlnp | grep ':3000'
LISTEN  0  511  0.0.0.0:3000  0.0.0.0:*  users:(("node",pid=21501,fd=18))
```

`-w "%{http_code}"` 是 curl 的写脚本利器:不看正文,只要一个数字,配合 `$?` 就能进 if 判断。

---

## 九、项目检查点 · 咖啡站入住 v0.1

```text
已具备:分层排查心智(ping→curl→ss)、curl -I/-v/本机自证、ss -tlnp 逐列读、
        refused vs timeout 分家、0.0.0.0 vs 127.0.0.1 监听地址意识
还没有:门被防火墙关着,外网依然进不来;而且就算开了门,总不能让用户
        在地址栏里背端口号
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 分层排查网络问题 | 「快速定位线上故障」的第 1 步,面试高频追问 |
| curl 调试接口 | 后端/运维 JD 的常客:联调、验活、看握手全过程 |
| ss 与监听地址意识 | 「本机通、外网不通」类事故的秒杀技 |

---

## 十一、下一话悬念

三板斧把案情钉死了:路通、服务活、门也改到了临街——只剩一道**防火墙**把包悄悄丢进海里。可特米盯着 `:3000` 又补了一刀:「就算把这扇门凿开,以后咖啡站再加个后台、再加个 API,难道让客人记一串端口号?你缺的不只是开门,是**一个门卫加一个前台**。」

> 下一话《门卫与转发:ufw 与 nginx》:ufw 决定哪些门对外开(先放行 ssh 再 enable 的保命顺序!),nginx 站在 80 端口把客人转发给后厨——阿零还会在配置文件里丢掉一个分号,被 `nginx -t` 点名到行号。

---

*本话属于连载《从零开始玩命令行》。全卷地图见 [/cli](/cli);前作《从零开始学 Java》见 [/java](/java)。*
