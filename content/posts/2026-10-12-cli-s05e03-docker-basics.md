---
title: "《从零开始玩命令行》24 · Docker 指令速成"
date: 2026-10-12
summary: "裸跑的 node 半夜崩了,根因是服务器和本地的 Node 版本打架。特米请出集装箱:镜像是类,容器是实例——阿零第一次用 Java 类比没翻车。docker run/ps/logs/exec 一套勘查手艺练完,阿零把 -p 的宿主与容器顺序敲反,又在容器里改文件后随手重建,亲眼看着改动蒸发——可写层是便利贴,不是石碑。"
tags: [Docker, 命令行, 终端漫画, compose, 阿零与特米]
---

# 《从零开始玩命令行》24 · Docker 指令速成

> 连载特刊 · 第二部《从零开始玩命令行》第 5 卷「网络与部署」第 3 话
> 长期项目:**把豆豆咖啡站部署上真实服务器**。前作《从零开始学 Java》全 56 话见 [/java](/java)。

---

## 一、需求:把「在我电脑上能跑」装进箱子

昨夜的崩溃日志摆在眼前:本地 Node 20 写的代码,服务器上跑的是 Node 18,一个新语法当场把裸跑的进程带走。阿零的第一反应是给服务器升级 Node,特米否了:「今天为咖啡站升到 20,明天另一个项目要 18,后天再来个要 Python 3.9 的——服务器迟早变成**版本坟场**。」

「换个思路:别让应用去适应服务器,**让应用自带整个世界**。代码、依赖、运行时、系统库,统统打进一个箱子;服务器只负责放箱子。箱子在你笔记本里什么样,在服务器上就什么样。」这个箱子体系,叫 Docker。

---

## 二、漫画 · 集装箱开箱

> **〔1〕** 阿零看着崩溃日志叹气:「本地明明好好的……」特米肚皮滚出两行版本号:`local: v20.11` / `server: v18.19`。
> 特米:「经典遗言第一名:**在我电脑上能跑**。」

> **〔2〕** 特米画了一张设计图和三个一模一样的箱子。
> 特米:「**镜像是只读的模板,容器是照着它跑起来的活实例**。」阿零眼睛一亮:「类和对象!`docker run` 就是 `new`!」特米(难得点头):「……Java 那 56 话没白学。」

> **〔3〕** `docker run -d -p 3000:3000 --name coffee coffee:1.0`,`docker ps` 里 STATUS 一栏「Up 4 seconds」。
> 特米:「`-d` 后台跑,`--name` 起门牌,`-p` 是**宿主在前、容器在后**——先写门牌号,再写房间号。」

> **〔4〕** 阿零 `exec -it` 钻进容器改了菜单文案,得意地删掉容器重开一个——文案打回原形。
> 特米:「容器的可写层是**便利贴**,箱子一扔全没了。想留住,要么改进镜像,要么挂 volume。」

> **〔5〕** 要加数据库了,阿零准备手敲第二条长长的 run——特米甩出一张 `docker-compose.yml`。
> 特米:「两个箱子以上,就别一条条背咒语了。**一张清单,一队集装箱。**」

> **〔6〕** `docker compose up -d`,两行 `Started` 绿光落定。豆豆的头像出现在视频窗口里:「闹钟定好了,明天早上八点。」
> 特米擦了擦肚皮的 `>_`:「明天,上线日。」

---

## 三、本话目标

- 用第一性原理记住:**镜像 = 只读模板(类),容器 = 镜像 + 一层可写层(实例)**;
- 跑通容器生命周期:`run -d -p 宿主:容器 --name` → `ps` → `logs -f` → `exec -it` → `stop`/`rm`;
- 记牢 `-p` 的方向:**宿主在前,容器在后**;
- 用 `docker-compose.yml` 声明 app + db 两个服务,`up -d`/`down`/`logs` 三连;
- 踩两个真实坑:`-p` 顺序写反、容器里改的文件随容器一起蒸发(volume 一句点到为止)。

---

## 四、原理图:类与实例,门牌与房间

```text
镜像 coffee:1.0(只读,像 class)
  ├── Node 20 运行时 + 系统库
  ├── node_modules(依赖锁死)
  └── 咖啡站代码
        │ docker run = new
        ▼
容器 coffee(活的,像 instance)= 镜像 + 一层【可写层】(临时!)

端口映射 -p 3000:3000
              ┌─────宿主机──────┐      ┌────容器────┐
外面的请求 ──▶ │ 宿主端口 3000    │ ───▶ │ 容器内 3000 │
              └──── 门牌号 ─────┘      └── 房间号 ──┘
                 宿主在前                 容器在后

容器删除 → 可写层跟着火化;镜像毫发无损,可以再 new 一个。
```

一句话:**镜像负责「永远一样」,容器负责「跑起来」;数据想活得比容器久,得搬出箱子(volume)。**

---

## 五、上手:一个箱子的一生

先送别裸跑时代(nohup 的 node 可以退休了),再把咖啡站装箱:

```bash
$ kill 21501                              # 裸跑进程,再见
$ docker build -t coffee:1.0 .            # 按 Dockerfile 打镜像,标签 1.0
 => [4/5] COPY . .
 => [5/5] RUN npm ci --omit=dev
 => => naming to docker.io/library/coffee:1.0

$ docker run -d -p 3000:3000 --name coffee coffee:1.0
7f3c9a1e5b2d4c8e91a6f0b3d7e2a5c8f1b4d7e0a3c6f9b2e5d8a1c4f7b0e3d6

$ docker ps
CONTAINER ID   IMAGE        COMMAND                  CREATED         STATUS         PORTS                                       NAMES
7f3c9a1e5b2d   coffee:1.0   "docker-entrypoint.s…"   5 seconds ago   Up 4 seconds   0.0.0.0:3000->3000/tcp, :::3000->3000/tcp   coffee
```

三件勘查工具:看日志、进现场、收摊:

```bash
$ docker logs -f coffee                   # -f 跟着滚,Ctrl+C 只退出观看,不杀容器
coffee-shop listening on 0.0.0.0:3000
^C
$ docker exec -it coffee bash             # 钻进容器,现场勘查
root@7f3c9a1e5b2d:/app# node -v
v20.11.1
root@7f3c9a1e5b2d:/app# exit
$ docker stop coffee && docker rm coffee  # 停箱、拆箱
coffee
coffee
```

app 要配 db 了,两个箱子起步就该上清单——`docker-compose.yml`:

```text
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "127.0.0.1:3000:3000"   # 呼应 22 话:只临本机的街,对外自有 nginx 前台
    env_file: .env
    depends_on:
      - db
  db:
    image: mongo:7
    volumes:
      - dbdata:/data/db          # volume:把数据搬出集装箱,活得比容器久
volumes:
  dbdata:
```

```bash
$ docker compose up -d
[+] Running 3/3
 ✔ Network coffee-shop_default  Created                              0.1s
 ✔ Container coffee-shop-db-1   Started                              0.7s
 ✔ Container coffee-shop-app-1  Started                              1.1s

$ docker compose logs -f app     # 只盯 app 一个服务的日志
$ docker compose down            # 整队收摊(容器删除,volume 保留)
```

> **特米旁白**:注意 `ports` 里那个 `127.0.0.1:` 前缀——22 话的监听地址课在这里复利了:db 干脆一个端口都不映射,只在 compose 的内部网络里被 app 用服务名 `db` 喊到。**不临街的门,一扇都别开。**

---

## 六、故意制造一个 Bug:方向感与便利贴

compose 收摊后,阿零想单独起个试验容器,挂到宿主 8080 上比对新旧版本。他心里默念「容器在前……宿主在后?」——记反了,敲成:

```bash
$ docker run -d -p 3000:8080 --name coffee-test coffee:1.0
$ curl http://localhost:3000
```

紧接着第二个坑:他 `exec` 进正式容器把菜单里的「拿铁」改成「豆豆特调」,页面立刻生效。晚上顺手 `docker rm -f` 重建了容器——

```bash
$ docker exec -it coffee-shop-app-1 bash -c \
    "sed -i 's/拿铁/豆豆特调/' src/menu.js"     # sed 是第 8 话附近的老朋友
$ docker rm -f coffee-shop-app-1 && docker compose up -d
```

---

## 七、读懂真实报错

**坑一**,-p 写反,curl 一脸懵:

```text
curl: (56) Recv failure: Connection reset by peer
```

容器明明「Up」,连接却被掐断。让 docker 自己交代映射关系:

```bash
$ docker port coffee-test
8080/tcp -> 0.0.0.0:3000
```

真相:这条映射读作「宿主 3000 → **容器 8080**」——可容器里的 node 听的是 3000,8080 房间空无一人,连接进了箱子却没人接,被复位。根因:`-p` 永远是 **宿主:容器**,他想要的是 `-p 8080:3000`。口诀:**先门牌(外),后房间(内)**——跟寄快递先写省市一个道理。修法:

```bash
$ docker rm -f coffee-test
$ docker run -d -p 8080:3000 --name coffee-test coffee:1.0
$ curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080
200
```

**坑二**,重建后菜单打回原形——没有报错,页面就是「证词」:

```text
$ curl -s localhost:3000 | grep -o "豆豆特调" | head -1     # 重建前:有
豆豆特调
$ curl -s localhost:3000 | grep -o "拿铁" | head -1          # 重建后:打回原形
拿铁
```

根因:`exec` 进去改的文件写在容器的**可写层**,那层和容器同生共死——`rm` 掉再 `up`,是从**只读镜像**重新 new 了一个实例,便利贴当然没了。修法分两类:**代码类**改动回源码、重新 `build` 进镜像(正道);**数据类**状态挂 volume——db 的 `dbdata:/data/db` 就是活例子,compose down 再 up,订单一条不少。本话点到为止,记住一句:**容器可抛弃,数据放 volume。**

> **🪟 双系统对照 · 集装箱在 Windows 上怎么玩**

| 干什么 | Linux (bash) | PowerShell 7 | 关键差异 |
|---|---|---|---|
| 装 Docker | `apt` / 官方脚本 | Docker Desktop(WSL2 后端) | Windows 上的 Linux 容器其实跑在 WSL2 那层 Linux 里 |
| 起容器/看容器 | `docker run` / `docker ps` | 一模一样 | CLI 跨平台同源——集装箱的意义就是「到哪都一样」 |
| 抠出容器名 | `docker ps --format '{{.Names}}'` | `docker ps --format json \| ConvertFrom-Json \| Select-Object -Expand Names` | Linux 用 Go 模板抠**文本**,PS 把 JSON 变**对象**再取属性 |
| 进容器 | `docker exec -it coffee bash` | 同款(镜像若是 alpine,只有 `sh`) | 进了容器就都是 Linux——本连载前 23 话在箱子里全部通用 |

> **🎯 面试直击**:镜像和容器是什么关系?容器删了,里面的数据呢?
> 镜像是**只读模板**(分层文件系统),容器 = 镜像 + 一层**可写层**,类似类与实例。容器删除时可写层一起销毁,所以容器内落盘的数据默认是临时的;需要持久化就挂 volume(或 bind mount),让数据活在容器生命周期之外。追问 `-p 3000:3000` 谁是谁:宿主在前、容器在后;`EXPOSE` 只是文档声明,不做真实映射。

---

## 八、用命令验证:箱子队列点名

```bash
$ docker compose ps
NAME                 IMAGE            COMMAND                  SERVICE   CREATED         STATUS         PORTS
coffee-shop-app-1    coffee-shop-app  "docker-entrypoint.s…"   app       2 minutes ago   Up 2 minutes   127.0.0.1:3000->3000/tcp
coffee-shop-db-1     mongo:7          "docker-entrypoint.s…"   db        2 minutes ago   Up 2 minutes   27017/tcp

$ ss -tlnp | grep 3000                     # 22 话的板斧,这回门后站的是 docker-proxy
LISTEN  0  4096  127.0.0.1:3000  0.0.0.0:*  users:(("docker-proxy",pid=23412,fd=4))

$ curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
200
```

db 的 `PORTS` 一栏只有 `27017/tcp`、没有箭头——**没临街**,正合规矩。

---

## 九、项目检查点 · 咖啡站入住 v0.3

```text
已具备:镜像/容器心智(类与实例)、run -d -p(宿主:容器)--name、
        ps / logs -f / exec -it 勘查三件套、stop/rm、
        compose 清单(up -d / down / logs)、可写层是临时的 + volume 意识
还没有:只差最后一步——正式的家:域名、完整链路、当着豆豆的面
        把 25 话学的所有东西串成一次真正的上线
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| Docker 基础指令 | JD 出现频率最高的词之一:「容器化部署经验」 |
| compose 编排 | 「一键拉起整套环境」的团队协作底气 |
| 镜像/容器/volume 心智 | 从「会敲 docker」到「知道数据会不会丢」 |

---

## 十一、下一话悬念

万事俱备:代码在 Git 里(第 3 卷),钥匙在 ssh 里(第 4 卷),门卫和前台在岗(23 话),集装箱整队待发(本话)。域名已经解析到服务器,`.env` 的空格子等着最后填写。

豆豆在视频里举起一杯浓缩:「五十六话之前,它只是一行 `Hello World`。明早八点,咖啡站搬新家。」特米没说话,只是把肚皮的 `>_` 擦得锃亮。

> 下一话《上线日:把咖啡站搬进新家》——全系列大结局:阿零独立操作全流程,每一步都是前面 24 话的复利。当然,上线日怎么可能一帆风顺……

---

*本话属于连载《从零开始玩命令行》。全卷地图见 [/cli](/cli);前作《从零开始学 Java》见 [/java](/java)。*
