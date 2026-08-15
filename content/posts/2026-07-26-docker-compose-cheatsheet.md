---
title: "Docker 与 Compose 速查 · 镜像到编排的全周期"
date: 2026-07-26
summary: "按「拉镜像 → 跑容器 → 调试 → 挂卷 → 组网 → 写 Dockerfile → 瘦身 → Compose 编排 → 回收磁盘 → 上生产」编排的命令速查，含破坏性命令警告、分层缓存顺序与多阶段瘦身可复制模板。"
tags: [命令速查, Docker, 容器]
---


# Docker 与 Compose 速查 · 镜像到编排的全周期

> 基线：Docker Engine 27+，Compose V2（`docker compose` 子命令，BuildKit 默认开启）。全文按容器从创建到销毁的生命周期排列，卡在哪一步就跳到哪一节。

## 快速导航

| 阶段 | 一句话 |
|------|--------|
| 01 镜像 | 拉、建、看层、打标签、导入导出 |
| 02 容器生命周期 | run / stop / rm 与重启策略 |
| 03 进入容器与调试 | exec、cp、inspect、无 shell 镜像怎么办 |
| 04 日志与监控 | logs、stats、events、日志轮转 |
| 05 数据卷 | 具名卷 vs bind mount、备份 |
| 06 网络 | 自定义 bridge、端口发布、访问宿主机 |
| 07 Dockerfile 与分层缓存 | 指令语义、缓存命中顺序 |
| 08 多阶段与瘦身 | builder、distroless、.dockerignore |
| 09 Compose 全周期 | up / logs / exec / down 与 profile |
| 10 清理与磁盘回收 | prune 家族到底删了什么 |
| 11 生产注意事项 | 权限、资源、优雅停机、密钥 |

## 01、镜像：拉、建、看、清

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `docker pull nginx:1.27-alpine` | 拉指定 tag | 别用 `latest` 部署：同名 tag 会被覆盖，回滚时拉到的已不是当初那个镜像 |
| `docker pull --platform linux/amd64 img` | 拉指定架构 | ARM 机器跑 amd64 镜像走 QEMU 模拟，性能掉几倍 |
| `docker build -t app:1.0 .` | 构建 | 末尾 `.` 是**构建上下文**，整目录都发给 daemon；没 `.dockerignore` 时 `node_modules`/`target`/`.git` 全被上传 |
| `docker build -f docker/Dockerfile -t app:1.0 .` | 指定 Dockerfile | `-f` 与上下文路径互相独立，别一起改错 |
| `docker build --no-cache -t app:1.0 .` | 禁缓存重建 | 排查「代码改了镜像没变」用；日常加上等于每次全量编译 |
| `docker build --build-arg VER=21 .` | 构建期变量 | `ARG` 值留在 `docker history` 里，**不能传密钥** |
| `docker buildx build --platform linux/amd64,linux/arm64 -t repo/app:1.0 --push .` | 多架构 | 多平台产物无法 `--load` 到本地，只能 `--push` |
| `docker images` / `docker image ls -a` | 列镜像 | `<none>:<none>` 即悬空镜像 |
| `docker history --no-trunc app:1.0` | 看每层大小与指令 | 瘦身第一步；能看到明文 `ARG`，也说明它藏不住秘密 |
| `docker tag app:1.0 repo/app:1.0` | 打标签 | 只加引用不产生新镜像，删原 tag 不丢数据 |
| `docker save -o app.tar app:1.0` / `docker load -i app.tar` | 离线导出/导入 | 别和 `export`/`import`（容器快照）混：后者丢分层和 CMD |
| `docker rmi app:1.0` | 删镜像 | 有容器（哪怕已停止）引用会拒绝，先删容器别急着 `-f` |
| ⚠ `docker image prune -a` | 删所有**未被容器使用**的镜像 | 不只是悬空，基础镜像一起没，下次构建全量重拉；日常用不带 `-a` 的只清 dangling |

## 02、容器生命周期

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `docker run -d --name web -p 8080:80 nginx:1.27-alpine` | 后台启动并映射端口 | 端口是 `宿主:容器`，写反表现为「起来了连不上」 |
| `docker run --rm -it alpine sh` | 一次性交互容器 | 忘了 `--rm` 就攒一堆 Exited 容器 |
| `docker run -it --entrypoint sh app:1.0` | 绕过 ENTRYPOINT 进 shell | 镜像一启动就崩时靠它看里面有什么 |
| `docker run --restart unless-stopped ...` | 重启策略 | `always` 会在 daemon 重启后把你手动停的容器也拉起来；生产多数选 `unless-stopped` |
| `docker ps -a` | 全部容器 | 不带 `-a` 看不到 Exited；`--filter status=exited` 更精确 |
| `docker stop web` / `docker stop -t 30 web` | 优雅停机 | 默认 SIGTERM 后等 10s 再 SIGKILL；有落盘收尾的服务必须调大 |
| `docker restart web` | 重启 | **不会重新读镜像和 `-e`/`-p`**，改配置必须 `rm` 后重新 `run` |
| ⚠ `docker kill web` | 直接 SIGKILL | 等价拔电源，只在进程不响应 SIGTERM 时用 |
| ⚠ `docker rm -f web` | 强删运行中容器 | 容器内**未挂卷**的写入随删随丢 |
| `docker update --memory 512m --cpus 1 web` | 热改资源限制 | 只能改资源，端口/网络/挂载改不了 |
| `docker inspect -f '{{.State.ExitCode}}' web` | 查退出码 | `137`=SIGKILL（多为 OOM）、`139`=段错误、`143`=SIGTERM |
| ⚠ `docker container prune --filter "until=24h"` | 清 24h 前退出的容器 | 不带 filter 会清掉所有 Exited，包括你正要翻日志那个 |

## 03、进入容器与调试

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `docker exec -it web sh` | 进 shell | alpine/distroless 没 `bash`，先试 `sh`；`-it` 少一个就没交互终端 |
| `docker exec -u root -it web sh` | 以 root 进入 | 非 root 容器装调试工具用，改动别固化 |
| `docker exec web env` | 看容器内环境变量 | 排查配置没生效比进 shell 快 |
| ⚠ `docker attach web` | 附加到主进程 stdio | Ctrl+C 会把主进程一起杀掉；看日志请用 `docker logs -f` |
| `docker cp web:/app/logs/app.log ./` | 拷文件出来 | 反向也行，但重建即失效，别当配置管理用 |
| `docker inspect -f '{{json .NetworkSettings.Networks}}' web` | 查网络细节 | 自定义网络下 IP 在 `Networks.<网络名>.IPAddress`，不在顶层 |
| `docker top web` | 容器内进程 | 显示宿主 PID 视角，方便和 `top` 对上 |
| `docker diff web` | 相对镜像的文件改动 | `A` 增 `C` 改 `D` 删，确认谁往容器里写了东西 |
| `docker port web` | 实际端口映射 | 用 `-P` 随机映射时唯一可靠查法 |
| `docker run -it --rm --network container:web nicolaka/netshoot` | 借调试镜像共享目标网络栈 | 对付 distroless 等无 shell 镜像的标准解法，目标容器不用改 |
| `docker commit web debug:snap` | 固化当前容器状态 | **只用于事后取证**，拿它产出上线镜像等于放弃可复现构建 |

## 04、日志与监控

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `docker logs -f --tail 100 web` | 跟最近 100 行 | 不带 `--tail` 从第一行开始刷，大日志直接刷爆终端 |
| `docker logs --since 10m --timestamps web` | 按时间窗查 | `--since`/`--until` 支持 `10m`、`2h` 与 RFC3339 |
| `docker logs web 2>/dev/null` | 只看 stdout | 日志分 stdout/stderr 两路，不少框架把 INFO 也写 stderr |
| `docker stats` / `--no-stream` | 实时 / 单次资源 | MEM 分母是容器 limit，没设 limit 时是宿主总内存，看着永远很富裕 |
| `docker events --since 1h --filter 'event=die'` | daemon 事件流 | 排查「容器半夜自己重启了」的第一手证据 |
| `docker inspect -f '{{.LogPath}}' web` | 日志文件位置 | 仅 `json-file` 驱动有效；该文件默认**不轮转**，能吃满磁盘 |
| `docker run --log-opt max-size=10m --log-opt max-file=3 ...` | 单容器日志轮转 | 更该在 `/coffee-lab/etc/docker/daemon.json` 的 `log-opts` 里全局设一次 |
| `docker system df -v` | 分项磁盘占用 | 回收前先看它，才知道该清镜像、卷还是 build cache |
| `docker compose logs -f --tail 50 api` | 单服务日志 | 不写服务名就是全栈混排，很难读 |

## 05、数据卷

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `docker volume create pgdata` | 建具名卷 | 生产数据一律具名卷，别指望容器可写层 |
| `docker run -v pgdata:/coffee-lab/var/lib/postgresql/data ...` | 挂具名卷 | `-v` 第一段不含 `/` 是卷名，含 `/` 是 bind mount，一字之差行为完全不同 |
| `docker run -v /coffee-lab/opt/conf:/coffee-lab/etc/app:ro ...` | 只读 bind mount | 宿主路径必须绝对；写错路径 Docker 会**自动建空目录**而非报错，表现为「配置没加载」 |
| `docker run --mount type=volume,src=pgdata,dst=/data ...` | `--mount` 显式语法 | 键值写法比 `-v` 的冒号串清晰；换 `type=bind` 时源路径不存在会直接报错，不像 `-v` 那样静默建空目录 |
| `docker run --tmpfs /tmp:rw,size=64m ...` | 内存临时盘 | 只读根文件系统的容器靠它写临时文件 |
| `docker volume ls -f dangling=true` | 列无人使用的卷 | 删前先看清单，数据库卷经常混在里面 |
| `docker volume inspect pgdata` | 查宿主实际路径 | 默认在 `/coffee-lab/var/lib/docker/volumes/<name>/_data` |
| `docker run --rm -v pgdata:/from -v "$PWD":/to alpine tar czf /to/pgdata.tgz -C /from .` | 备份卷 | 数据库卷应先停容器或用自带 dump，热拷贝可能拿到不一致快照 |
| ⚠ `docker volume rm pgdata` | 删卷 | **不可逆**；被容器引用时会拒绝——这层保护是好事，别绕过 |
| ⚠ `docker volume prune` | 清未使用的卷 | Docker 23.0 起**默认只删匿名卷**，加 `-a` 才连未使用的具名卷一起删；跨版本脚本务必写死参数 |

## 06、网络

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `docker network create app-net` | 建自定义 bridge | 默认 `bridge` **不提供容器名 DNS**，服务间互调必须建自定义网络 |
| `docker run --network app-net --name api ...` | 加入网络 | 同网络内直接 `http://api:8080`，不用知道 IP |
| `docker network connect / disconnect app-net web` | 运行中增删网络 | 一个容器可接多个网络，用来做前后端隔离、演练故障 |
| `docker network inspect app-net` | 看网段与成员 | 网段和公司内网撞车时在这里确认，改 `daemon.json` 的 `default-address-pools` |
| `docker run -p 127.0.0.1:8080:80 ...` | 只绑回环 | ⚠ 直接写 `-p 8080:80` 绑 `0.0.0.0`，且 Docker 的 iptables 规则**先于 ufw/firewalld 生效**，等于把端口暴露到公网 |
| `docker run -P ...` | 随机映射 EXPOSE 端口 | 端口不可预测，只适合本地并行多实例 |
| `docker run --network host ...` | 共享宿主网络栈 | 仅 Linux 语义完整；无网络隔离，端口冲突直接打架 |
| `docker run --add-host=host.docker.internal:host-gateway ...` | 容器访问宿主服务 | Desktop 自带该域名，**Linux 必须显式加**否则解析不到 |
| `docker network prune` | 删未使用的自定义网络 | 只删无容器连接的，内置 bridge/host/none 不动 |

## 07、Dockerfile 写法与分层缓存

| 指令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `FROM eclipse-temurin:21-jre-alpine` | 基础镜像 | 写到小版本或 digest；`FROM x AS build` 给阶段命名供后面引用 |
| `WORKDIR /app` | 设工作目录 | 用它代替 `RUN cd /app`——`cd` 只在当前 RUN 内有效 |
| `COPY --chown=app:app target/app.jar app.jar` | 拷贝并设属主 | 只认构建上下文内路径；`--link` 让该层独立于前序层缓存 |
| `ADD` | 拷贝 + 解压 tar + 支持 URL | 除「解压本地 tar」外一律用 `COPY`，`ADD` 的隐式行为是经典事故源 |
| `RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /coffee-lab/var/lib/apt/lists/*` | 装依赖 | 必须和 `update` 同层，否则缓存命中旧 index 装到过期包；清缓存也要**同层**，另起一层删不掉体积 |
| `RUN --mount=type=cache,target=/coffee-lab/root/.m2 ./mvnw package` | BuildKit 缓存挂载 | 依赖缓存跨构建复用且不进镜像层，Maven/Gradle/npm 提速最明显 |
| `RUN --mount=type=secret,id=npmrc ...` | 构建期密钥 | 唯一不写进镜像层的传密钥方式；`ARG`/`ENV` 都会被 `docker history` 看到 |
| `EXPOSE 8080` | 声明端口 | **纯文档作用**，不发布端口，真正生效的是 `-p` |
| `USER app` | 切运行用户 | 放在所有需 root 的 RUN 之后，之后的 `COPY` 注意属主 |
| `HEALTHCHECK --interval=30s --timeout=3s --start-period=40s CMD wget -qO- http://localhost:8080/health \|\| exit 1` | 健康检查 | 探针命令镜像里必须真有（distroless 无 wget/curl）；`start-period` 太短会在启动期被判不健康 |
| `ENTRYPOINT ["java","-jar","/app/app.jar"]` | 固定入口 | **必须 exec 数组形式**：shell 形式让 `sh` 占 PID 1，SIGTERM 传不到 JVM，停机变成 10 秒后强杀 |
| `CMD ["--spring.profiles.active=prod"]` | 默认参数 | 与 exec 形式 ENTRYPOINT 搭配时是默认参数，`docker run` 末尾传参会整体覆盖 |

**分层缓存唯一原则：变化频率低的放上面。** 配套 `.dockerignore`（不写等于把整个工作区上传给 daemon）：

```
.git
target/
build/
node_modules/
*.log
.env
Dockerfile
```

## 08、多阶段构建与瘦身

| 手段 | 写法 | 备注 / 坑 |
|------|------|-----------|
| 多阶段 | `FROM maven AS build` … `COPY --from=build /src/target/app.jar .` | 工具链留在 build 阶段，成品只含产物，镜像从 700MB+ 降到 200MB 级 |
| 只构建到某阶段 | `docker build --target build -t app:build .` | 调试构建阶段或单独跑测试阶段 |
| 换更小底座 | `eclipse-temurin:21-jre-alpine` → `gcr.io/distroless/java21-debian12` | distroless 无 shell 无包管理器，攻击面最小；代价是**不能 exec 进去**，调试靠 netshoot 或临时切 `:debug` 变体 |
| 精简运行时 | `jlink --add-modules $(jdeps --print-module-deps app.jar) --strip-debug --no-man-pages --output /jre` | 自定义 JRE 常在 50MB 内；反射/SPI 重的应用要手工补模块并跑完整回归 |
| 分层 jar | Spring Boot 3.3+：`java -Djarmode=tools -jar app.jar extract --layers` | 依赖层与代码层分开 COPY，改代码只重传几 MB；3.3 之前是 `-Djarmode=layertools` |
| 减少层数 | 合并同类 `RUN`，删除与产生放同层 | 上层写入的文件，下层 `rm` 只是加删除标记，体积不减 |
| 上下文瘦身 | `.dockerignore` | 构建开头那句 `transferring context: xxxMB` 就是体检报告 |
| 体积体检 | `docker history --no-trunc app:1.0` | 先定位哪层胖，再决定砍什么 |

可复制的 Java 多阶段模板：

```dockerfile
# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN --mount=type=cache,target=/coffee-lab/root/.m2 mvn -q -B dependency:go-offline
COPY src src
RUN --mount=type=cache,target=/coffee-lab/root/.m2 mvn -q -B clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /src/target/*.jar app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java","-XX:MaxRAMPercentage=75","-jar","/app/app.jar"]
```

## 09、Compose 全周期

> Compose V2 是 `docker compose`（子命令，无连字符）。旧的独立二进制 `docker-compose` 已停止维护，**全文仅此一处提及**；`compose.yaml` 顶层的 `version:` 字段在 V2 中已废弃，写了只会告警。

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `docker compose up -d` | 后台拉起全栈 | 只重建有变化的服务；改了 Dockerfile 不加 `--build` 用的还是旧镜像 |
| `docker compose up -d --build` | 先构建再启动 | 本地开发默认写法 |
| `docker compose up -d --wait` | 等到健康才返回 | CI 里替代 `sleep 30`；服务需定义 `healthcheck` 才有意义 |
| `docker compose up -d --force-recreate` | 强制重建容器 | 配置改了容器没更新时的兜底 |
| `docker compose up -d --scale worker=3` | 水平扩实例 | 该服务不能写死 `container_name` 或固定宿主端口，否则第二个实例必冲突 |
| `docker compose config` | 渲染最终配置 | 校验 YAML + 查 `.env` 插值；⚠ **会打印明文密钥**，别贴群里 |
| `docker compose ps` | 服务状态 | 看 STATUS 里的 `(healthy)`/`(unhealthy)` |
| `docker compose exec api sh` | 进运行中的服务 | 对已有容器操作 |
| `docker compose run --rm api ./mvnw test` | 一次性容器跑命令 | 与 `exec` 的区别：新建容器、**默认不发布端口**；忘了 `--rm` 会攒残留 |
| `docker compose restart api` | 重启服务 | **不重新读 compose 文件**，改了配置要 `up -d` |
| `docker compose stop` / `start` | 停/启但保留容器 | 想保留状态就用它，别一上来就 `down` |
| `docker compose pull` | 更新镜像 | 配合 `up -d` 完成滚动更新 |
| `docker compose --profile dev up -d` | 按 profile 启动 | 把 pgadmin、mailhog 这类工具关进 profile，默认不启 |
| `docker compose -f compose.yaml -f compose.prod.yaml up -d` | 多文件叠加 | 后者覆盖前者，环境差异化标准做法 |
| `docker compose -p myproj up -d` | 指定项目名 | 默认取目录名，不同仓库的同名目录会互相覆盖容器和卷 |
| `docker compose watch` | 变更自动同步/重建 | 需配 `develop.watch`（Compose 2.22+） |
| `docker compose down` | 停并删容器与网络 | **默认保留具名卷**，数据还在 |
| ⚠ `docker compose down -v` | 连卷一起删 | 数据库数据直接归零，**不可逆**；生产环境永远不要输入这条 |
| ⚠ `docker compose down --rmi local --remove-orphans` | 删本地构建镜像 + 孤儿容器 | 改服务名后清场用，会删掉改名前遗留的容器 |

`depends_on` 只保证启动顺序、不保证「可用」，正确写法：

```yaml
services:
  db:
    image: postgres:17-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 10
  api:
    build: .
    depends_on:
      db: { condition: service_healthy }
    stop_grace_period: 30s
```

## 10、清理与磁盘回收

先诊断再动手：`docker system df -v` 会分别列出 Images / Containers / Local Volumes / Build Cache 的 RECLAIMABLE。

| 命令 | 删掉什么 | 备注 / 坑 |
|------|----------|-----------|
| ⚠ `docker system prune` | 已停止的容器 + 未使用的网络 + **悬空**镜像 + 构建缓存 | 不删卷、不删有 tag 的未使用镜像；但仍会带走你想留着看日志的 Exited 容器 |
| ⚠ `docker system prune -a` | 上面全部 + **所有未被运行中容器使用的镜像** | 停机维护时执行等于清空全部镜像，重启需联网重拉；离线环境是灾难 |
| ⚠⚠ `docker system prune -a --volumes` | 上面全部 + 未使用的卷 | **数据库数据在这里被抹掉**且不可逆；执行前先 `docker volume ls` 存一份清单 |
| `docker system prune --filter "until=72h"` | 只清 72 小时前的对象 | 给 prune 上保险的最实用参数，可与 `-a` 同用 |
| `docker builder prune` / `-a` | 未使用 / 全部 BuildKit 缓存 | 磁盘暴涨的头号嫌疑常是 build cache；`-a` 后首次构建会很慢 |
| `docker builder prune --filter until=168h --keep-storage 20GB` | 限额清理 | 更适合放进定时任务 |
| `docker image prune` | 仅悬空镜像 | 最安全的日常清理 |
| Desktop / WSL2 磁盘不缩 | — | prune 只释放虚拟磁盘内部空间，宿主 `.vhdx` 只涨不缩；需在 Docker Desktop 的 Resources 里回收，或对 WSL 发行版执行 `wsl --manage <distro> --set-sparse true` |

## 11、生产注意事项

| 事项 | 做法 | 备注 / 坑 |
|------|------|-----------|
| 不以 root 运行 | Dockerfile 里 `USER app` 或 `docker run --user 1000:1000` | 容器 root 逃逸即宿主 root；bind mount 的文件属主会被写成 root，主机侧后续删不掉 |
| 只读根文件系统 | `--read-only --tmpfs /tmp --tmpfs /run` | 应用要写盘的路径必须显式挂出来，否则启动即失败 |
| 削减能力 | `--cap-drop ALL --cap-add NET_BIND_SERVICE` | 只有绑 1024 以下端口才需要那个 cap，更好的做法是监听 8080 |
| 禁止提权 | `--security-opt no-new-privileges:true` | 挡掉容器内 setuid 提权路径，几乎零成本 |
| 资源限额 | `-m 512m --cpus 1.5 --pids-limit 200` | 不设 limit 时一个容器能吃光宿主内存；退出码 137 通常就是被 OOM Killer 干掉 |
| JVM 感知容器 | `-XX:MaxRAMPercentage=75` | JDK 10+ 默认开 `UseContainerSupport`，但默认堆上限约 25%，不调等于浪费 3/4 内存 |
| 镜像不可变 | 部署用 `repo/app:1.2.3` 或 `repo/app@sha256:...` | `latest` 让「线上跑的到底是哪份代码」变成悬案 |
| 优雅停机 | exec 形式 ENTRYPOINT + `stop_grace_period: 30s` | shell 形式启动时 PID 1 是 `sh`，SIGTERM 收不到；必要时 `--init` 挂 tini 收割僵尸进程 |
| 日志有上限 | `daemon.json` 全局配 `log-driver` + `max-size`/`max-file` | 漏配一次就可能撑满 `/coffee-lab/var/lib/docker`，进而拖死整台机器 |
| 密钥不进镜像 | 运行期挂文件或用编排层 secret，构建期 `RUN --mount=type=secret` | `ENV`/`ARG` 会被 `docker inspect` 和 `docker history` 读到，推到公共仓库即泄露 |
| 别在容器里存状态 | 数据一律具名卷或外部服务 | 容器应可随时销毁重建，「登进去改一下」的容器迟早被人 `rm` 掉 |
| 远程操作 | `docker context create prod --docker "host=ssh://user@host"` + `docker context use prod` | 比裸 `-H tcp://` 安全；⚠ 切完 context 后所有命令都打在生产上，动手前先 `docker context ls` 确认星号在哪 |

## 常见错误速判

| 症状 | 多半是 | 先试这条 |
|------|--------|----------|
| `bind: address already in use` | 宿主端口被占 | `docker ps --filter publish=8080`，或宿主 `ss -tlnp \| grep 8080` |
| `Conflict. The container name "/web" is already in use` | 同名容器残留 | `docker rm -f web` 后重跑 |
| 容器起来立刻 Exited (0) | 主进程不是前台常驻 | `docker logs web`，补上 `nginx -g "daemon off;"` 之类前台参数 |
| 退出码 137 | 被 SIGKILL，通常 OOM | `docker inspect -f '{{.State.OOMKilled}}' web`，加 `-m` 并调 `MaxRAMPercentage` |
| `exec ./entrypoint.sh: no such file or directory` | 脚本是 CRLF 换行，或镜像架构不符 | 转 LF（`.gitattributes` 写 `*.sh text eol=lf`）；查 `docker image inspect -f '{{.Architecture}}'` |
| 改了代码重新 build 却没生效 | 缓存命中或被 ignore 掉 | `docker build --no-cache`；检查 `.dockerignore` 是否误伤 `src` |
| 容器间用服务名连不上 | 还在默认 bridge 网络 | 建自定义网络，或用 Compose（自动建网并提供 DNS） |
| 应用连不上宿主机的 MySQL | 容器里的 `localhost` 是它自己 | 用 `host.docker.internal`，Linux 需 `--add-host=host.docker.internal:host-gateway` |
| 读写挂载目录 `permission denied` | 容器 UID 与宿主属主不匹配 | `--user $(id -u):$(id -g)`，或宿主侧 `chown` 到对应 UID |
| 磁盘莫名爆满 | build cache 或未轮转的容器日志 | `docker system df -v` 定位，再针对性 `builder prune` |
| `up` 之后配置仍是旧的 | 用了 `restart` 而非 `up`，或 `.env` 没读到 | `docker compose config` 看渲染结果，再 `up -d --force-recreate` |
| 停机总要等 10 秒 | PID 1 是 shell，SIGTERM 没传下去 | ENTRYPOINT 改 exec 数组形式 |

## 一页纸口诀

1. **镜像不可变、tag 要具体**——`latest` 是给人看的，不是给生产用的。
2. **变化频率低的放 Dockerfile 上面**：依赖在前、源码在后，缓存才有意义。
3. **多阶段是默认姿势**：工具链留在 builder，运行镜像只装产物和 JRE。
4. **`-v` 第一段带不带 `/` 是两种完全不同的挂载**；生产数据只认具名卷。
5. **容器名 DNS 只在自定义网络里生效**，默认 bridge 靠 IP 是死路。
6. **ENTRYPOINT 用 exec 数组形式**，否则 PID 1 是 sh，优雅停机变强杀。
7. **`prune` 前先 `docker system df -v`**；带 `-a`、`--volumes` 的那几条不可逆。
8. **密钥永远不进 ARG/ENV**——`docker history` 是公开的。
9. **不设 limit 的容器等于没有边界**：内存、CPU、pids、日志大小，四样都要有上限。
