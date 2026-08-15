---
title: "《从零开始玩命令行》24 · Docker 指令速成"
date: 2026-07-30
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

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,接下来3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. Docker 镜像(Image)和容器(Container)的关系,最恰当的类比是什么?
   - A) 文件与文件夹　B) 类(Class)与实例(Instance):镜像是只读模板,容器是镜像的运行实例　C) 压缩包与解压后的文件　D) 代码与编译器

2. `docker run -d -p 8080:80 --name web nginx` 中 `-d`、`-p`、`--name` 分别代表什么?
   - A) daemon(后台运行)、port(端口映射 主机:容器)、name(容器名称)　B) delete、password、name　C) directory、process、namespace　D) detach、path、node

3. `docker ps` 默认显示什么?
   - A) 所有容器(含已停止的)　B) 正在运行的容器列表　C) 所有镜像　D) 容器日志

4. `docker logs -f web` 中 `-f` 的作用是?
   - A) 强制(force)　B) follow,持续跟踪输出(类似 tail -f),实时查看新日志　C) 过滤(filter)　D) 格式化(format)

5. `docker exec -it web bash` 的作用是什么?
   - A) 停止名为 web 的容器　B) 在正在运行的 `web` 容器内**打开一个交互式 bash shell**　C) 创建新容器并命名为 bash　D) 查看容器日志

6. `docker-compose up -d` 和 `docker-compose down` 是一对什么操作?
   - A) 无关联　B) `up -d` 以守护进程模式启动 compose 定义的所有服务,`down` 停止并移除所有相关容器/网络/卷　C) `up` 是部署,`down` 是下载镜像　D) 两者等价,只是语法不同

7. 容器停止后数据丢失,正确的数据持久化方式是什么?
   - A) 把数据写进镜像　B) 使用 Docker Volume(卷)或 bind mount(绑定挂载)将数据存储在主机的持久化目录中　C) 容器内的数据永远不会丢失　D) 定期 `docker commit` 保存容器状态

8. `docker stop web` 和 `docker kill web` 的区别?
   - A) 完全相同　B) `stop` 发送 SIGTERM(给应用优雅清理的时间,超时后 SIGKILL),`kill` 立即发送 SIGKILL(强制终止)　C) `stop` 删除容器,`kill` 暂停容器　D) `kill` 是 `stop` 的别名

9. 关于 Docker 的"镜像分层"概念,以下说法**正确**的是?
   - A) 每个镜像只有一个层　B) 镜像由多个只读层堆叠而成,每个 Dockerfile 指令( RUN/COPY/ADD )创建一个新层,容器在顶部有一个可写层　C) 分层只是比喻,实际不存在　D) 分层会让镜像变得更大

10. Docker Compose 文件的 `depends_on` 指令作用是什么?
   - A) 复制文件到容器　B) 定义服务间的启动依赖顺序(如 db 先于 app 启动)　C) 安装依赖包　D) 指定挂载卷

### 解答题(5 道)

**Q1 概念:** 用 Java 的"类与实例"类比 Docker 的"镜像与容器",并解释 Dockerfile、Image、Container、Registry(如 Docker Hub)四者之间的关系。

**Q2 解释:** `docker run -p 8080:80 nginx` 中端口映射 `8080:80` 是什么意思?为什么需要端口映射而不直接访问容器?

**Q3 操作:** 写出用 Docker 部署咖啡站 Java 应用(`coffee-app.jar`,监听 8080)的完整步骤:写 Dockerfile→构建镜像→运行容器(含端口映射、环境变量、后台运行、自动重启)→查看日志→进入容器排查。

**Q4 排障:** 容器启动后立即退出(`docker ps -a` 状态为 `Exited (0)`),用 `docker logs` 看不到明显错误。分析可能原因和排查方法。

**Q5 综合设计:** 咖啡站由 app(Java,8080)、postgres(5432)、redis(6379) 三服务组成。设计 docker-compose.yml:①三个服务定义 ②app 依赖 postgres 和 redis ③数据库密码通过环境变量传入(不用硬编码) ④app 和 postgres 的数据持久化(volume) ⑤使用自定义网络使服务间通过服务名通信 ⑥开发和生产的 compose 文件分离策略。

> [!答案]
> **1-B** 镜像=类(class):定义了"这个应用运行需要哪些文件和配置",是静态的、只读的、可复用的模板。容器=实例(instance):基于镜像创建的**运行中的进程**,有自己的文件系统层、网络栈、进程空间。**举一反三:**一个镜像可以启动多个容器(像一个类可以 new 多个对象);修改容器不会影响镜像(除非 commit)。🪟 Windows 中 Docker Desktop 同样使用镜像/容器模型。
>
> **2-A** `-d`=detached(后台运行,不占用终端),`-p 8080:80`=端口映射(主机 8080→容器 80),`--name web`=给容器命名(方便后续引用,否则 Docker 随机分配名称)。**举一反三:**`docker run --rm` 容器退出后自动删除(适合一次性测试);`-e VAR=value` 传入环境变量;`-v /host/path:/container/path` 挂载数据卷。
>
> **3-B** `docker ps` 默认只显示正在运行的容器。**举一反三:**`docker ps -a` 显示所有容器(含已停止);`docker ps -q` 只输出容器 ID(适合脚本);`docker container ls` 是新命令格式(与 `docker ps` 效果相同,但更明确是操作容器)。
>
> **4-B** `-f`=follow,跟踪日志输出。**举一反三:**`docker logs --tail 100 web` 只显示最后 100 行;`docker logs --since 10m web` 显示最近 10 分钟的日志;`docker logs -t web` 在每行前加时间戳。调试时先 `logs` 再 `exec` 进入容器。
>
> **5-B** `exec -it web bash` = execute interactive terminal:在名为 `web` 的容器内启动 bash 并给你一个交互终端。**举一反三:**`-i`=stdin 保持打开,`-t`=分配伪终端(TTY)。`docker exec web ls /app` 执行单个命令不进入交互。如果容器内没有 bash,用 `/bin/sh` 或 `ash`(Alpine)。
>
> **6-B** `up -d`=启动 compose 文件中定义的所有服务(后台);`down`=停止+删除所有相关资源(容器、默认网络、匿名卷)。**举一反三:**`up`(不加 -d)=前台运行(适合调试,按 Ctrl+C 停止);`down -v` 同时删除命名卷(清除数据);`restart` 重启服务;`ps` 查看 compose 项目中的容器状态。
>
> **7-B** 容器是无状态的(设计意图):每个新容器从镜像启动,有自己的可写层,容器被删除时可写层也消失。**持久化数据需要 Volume:**
>①Docker Volume:`docker volume create data && docker run -v data:/app/data`(由 Docker 管理,路径在 `/coffee-lab/var/lib/docker/volumes/`) ②Bind Mount:`-v /coffee-lab/home/user/data:/app/data`(直接挂载主机目录)。**举一反三:**数据库容器务必挂载 volume!`docker-compose` 的 `volumes:` 段是生产必需;无 volume 的数据库容器删除后数据永久丢失。
>
> **8-B** `stop`=SIGTERM(15),给应用 10 秒(默认)优雅退出,超时后 SIGKILL。`kill`=立即 SIGKILL(9),不给清理机会。**举一反三:**与之前学的 `kill` 命令一致——Docker 也只是给容器内进程发信号。`docker stop -t 30`(自定义超时 30 秒);`docker kill -s SIGTERM`(发送 SIGTERM 而非默认的 SIGKILL)。数据库容器务必用 stop。
>
> **9-B** 镜像分层(layered)是 Docker 的核心机制:每个 Dockerfile 指令(RUN/COPY/ADD)创建一个新的**只读层**,堆叠起来形成完整镜像。容器启动时在顶部追加一个**可写层**(所有修改都在这里)。**举一反三:**分层的好处:①共享层(多个镜像共用同一基础层,节省磁盘) ②缓存加速构建(未变更的层复用缓存) ③快照式回滚。`docker image history nginx` 可以看到所有层及其大小。
>
> **10-B** `depends_on` 定义启动顺序(如先启动数据库,再启动应用),但不等待服务"就绪"(只等容器启动,不验证服务是否 ready)。**举一反三:**对于需要等待服务就绪的场景(如数据库接受连接),应在应用容器内实现重试逻辑或使用 `wait-for-it.sh` 等工具;Compose v3 的 `depends_on` 配合 `condition: service_healthy` 可以等待健康检查通过。
>
> **Q1** Docker 四者关系:①Dockerfile="建筑蓝图"(文本文件,描述如何构建镜像——FROM 基础、RUN 安装、COPY 文件、CMD 启动命令等) ②Image="建筑模具"(由 Dockerfile `docker build` 生成,只读模板,可以上传到 Registry 分享) ③Container="用模具倒出来的实物房子"(`docker run` 镜像创建的运行实例,有自己的可写层) ④Registry="模具仓库"(如 Docker Hub,存储和分发镜像,供全球 `docker pull` 下载)。**Java 类比:**Dockerfile=`.java` 源文件,Image=`.class` 字节码(编译后,可分发),Container=JVM 中的运行对象(运行实例),Registry=Maven Central(共享仓库)。
>
> **Q2** `8080:80` = 主机端口:容器端口。主机 8080→容器 80。意义:容器有自己的**隔离网络**,外界不能直接访问容器的 IP(`172.17.0.x` 内部 IP),需要通过主机端口映射暴露服务。**访问路径:**外部请求→主机 IP:8080→Docker 代理(iptables NAT)→容器内 80 端口→nginx 进程处理。**不映射:**容器内服务只有从主机用 `docker exec` 或其他容器(同一网络内)才能访问,外界不可达。**多容器冲突:**主机上的端口只能被一个进程占用,所以映射时注意端口规划(如 app=8081,api=8082)。
>
> **Q3** 步骤:①Dockerfile:
```
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY coffee-app.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```
②`docker build -t coffee-app:latest .`(构建镜像) ③`docker run -d --name coffee -p 8080:8080 -e JAVA_OPTS="-Xmx512m" --restart=unless-stopped coffee-app:latest`(运行容器,自动重启策略) ④`docker logs -f coffee`(查看启动日志) ⑤`docker exec -it coffee bash` 进入容器排查(如 `ls /app`、`ps aux`、`cat /coffee-lab/etc/hosts`)。**举一反三:**小优化:用 multi-stage build(Dockerfile 中先编译再打包,最终镜像极小);`docker run --rm` 调试时不残留已停止容器。
>
> **Q4** 容器退出可能原因:①主进程(PID 1)执行完就退出了——前台命令如 `echo hello` 执行完容器自然退出,应用应以前台模式运行(如 Java 不要加 `&` 或 `nohup`) ②应用启动失败——日志可能输出到了 stderr(用 `docker logs coffee 2>&1` 捕获) ③CMD/ENTRYPOINT 错误——命令不存在或路径不对,但错误信息可能在 stdout/stderr ④环境变量缺失——如数据库密码未设置,应用检测后直接退出。**排查方法:**①`docker ps -a` 查看退出码(0=正常退出,非 0=错误退出) ②`docker logs coffee` 查看所有输出(包括退出前的错误信息) ③修改 CMD 为 `sleep 3600`(保持容器运行),然后 `docker exec -it coffee bash` 进去手动启动应用排查 ④用 `docker run -it`(不分离,前台运行)直接看启动过程的实时输出。
>
> **Q5** compose 文件框架:
```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: coffee
      POSTGRES_PASSWORD: ${DB_PASSWORD}  # 从 .env 读
    volumes:
      - pgdata:/coffee-lab/var/lib/postgresql/data
    networks:
      - coffee-net
  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    networks:
      - coffee-net
  app:
    build: ./app
    ports:
      - "8080:8080"
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/coffee
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
    depends_on:
      - postgres
      - redis
    networks:
      - coffee-net
volumes:
  pgdata:
  redisdata:
networks:
  coffee-net:
    driver: bridge
```
**开发/生产分离:**①共用基础 compose ②`docker-compose.override.yml`(开发:挂载源码、暴露调试端口、volumes 热加载) ③`docker-compose.prod.yml`(生产:不挂载源码、配置日志驱动、限制资源 limits、使用特定镜像 tag 而非 latest) ④启动:`docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`。**举一反三:**`.env` 文件存放密码等敏感变量,不提交到 Git;生产密码通过 Docker Swarm secrets 或外部密钥管理服务注入。

## 运行前边界、回滚与验证

- **运行前**：示例以 GNU/Linux 的 Bash 为主；先用 `command --help`、`man command` 或发行版文档确认本机版本和参数。不要把教程中的 IP、域名、用户、路径直接复制到生产机器。
- **先确认作用域**：涉及文件、仓库、容器或远端主机时，先运行 `pwd`、`whoami`、`git status`、`docker context show` 或 `ssh -G 主机别名`，确认当前目标；对重要数据先做可恢复备份。
- **完成后验证**：用只读命令确认结果，例如 `ls -la`、`git status`、`systemctl status 服务名`、`docker ps` 或 `curl -fS URL`；失败时停止扩大操作范围，先读报错。
- **删除边界**：`rm`/`Remove-Item` 不会进入回收站。先用 `ls -- 路径` 或 PowerShell 的 `-WhatIf` 预演；避免对变量、通配符或当前目录直接使用递归强制删除。
- **进程边界**：先核对 PID、命令行和父进程（`ps -fp PID`）；优先 `kill -TERM PID`，仅在进程无法自行退出时才用 `kill -KILL PID`，并检查数据写入和服务健康状态。
- **远端边界**：首次连接核验主机指纹；传输前先确认目标路径和账号，`rsync` 删除模式必须先加 `--dry-run`。远程改网络或防火墙时保留一个已登录会话和云控制台回退路径。
- **容器边界**：先执行 `docker context show`、`docker ps -a` 和 `docker system df`；清理命令只对确认无用的资源执行，带卷的删除额外确认持久化数据和备份。
- **网络边界**：远程启用防火墙前先放行当前 SSH 入口；修改 Nginx 后先 `nginx -t`，通过后再 reload，并从外部和本机两侧验证端口与 HTTP 状态。
