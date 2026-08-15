---
title: "Git + Docker + SSH 命令速查"
date: 2026-07-21
summary: "Git 分支合并回退 + Docker 容器镜像 + SSH 免密登录命令速查表"
tags: [Docker, Git, SSH, 命令速查]
---


# Git + Docker + SSH 命令速查

> 从[全栈指令速查大全](/posts/2026-07-15-command-reference-cheatsheet)拆分。

## Git · S 极高频

| 难度 | 命令 | 作用 |
|------|------|------|
| ★ | `git status` | 看状态 |
| ★ | `git add .` / `git add <file>` | 暂存 |
| ★ | `git commit -m "msg"` | 提交 |
| ★ | `git push` / `git push -u origin main` | 推送 |
| ★ | `git pull` | 拉并合并 |
| ★ | `git clone <url>` | 克隆 |
| ★★ | `git log --oneline -n 10` | 看历史 |
| ★★ | `git diff` / `git diff --staged` | 看差异 |
| ★★ | `git branch` / `git branch name` | 分支 |
| ★★ | `git checkout branch` / `git switch branch` | 切换 |
| ★★ | `git merge branch` | 合并 |
| ★★ | `git restore <file>` / `git checkout -- file` | 丢改动 |

**日更口诀**：`status → add → commit → push`；开分支：`switch -c feat/x`

## Git · A 高频

| 难度 | 命令 | 作用 |
|------|------|------|
| ★★ | `git fetch` | 只拉远程不合并 |
| ★★ | `git remote -v` | 远程地址 |
| ★★ | `git stash` / `stash pop` | 临时搁置 |
| ★★ | `git reset HEAD~1` / `--soft/--hard` | 回退（hard 慎用） |
| ★★★ | `git rebase main` | 变基整理历史 |
| ★★★ | `git cherry-pick <hash>` | 拣选提交 |
| ★★★ | `git tag v1.0` / `push --tags` | 打标签 |
| ★★★ | `git show <hash>` | 看某次提交 |
| ★★★ | `.gitignore` | 忽略规则 |

## Git · B/C 进阶

| 难度 | 命令 | 作用 |
|------|------|------|
| ★★★★ | `git rebase -i` | 交互变基（squash） |
| ★★★★ | `git bisect` | 二分找 bug |
| ★★★★ | `git reflog` | 找回“丢失”提交 |
| ★★★★ | `git blame` | 行级作者 |
| ★★★★ | `git submodule` | 子模块 |
| ★★★★★ | `git filter-repo` / 改写历史 | 敏感信息清理 |
| ★★★ | 冲突解决：改文件 → `add` → `merge/rebase --continue` | |

**安全**：未 push 可用 soft reset；已 push 避免强推 main；force 用 `push --force-with-lease`。

### Git · 工作流深补（面试 + monorepo）

| 频次/难度 | 命令/概念 | 要点 |
|-----------|-----------|------|
| **S/★★★** | `reset --soft/--mixed/--hard` | soft 留暂存+工作区；mixed 留工作区；hard 全丢——已 push 慎 hard |
| **A/★★★** | `revert` vs `reset` | revert 新提交可推远程；reset 改历史 |
| **A/★★★** | `rebase -i` / `cherry-pick` / `reflog` / `stash` | 整理提交 / 拣选 / 找回 / 暂存 |
| **A/★★★** | `git worktree add ../p branch` | 多工作树并行；`list/remove/prune` |
| **B/★★★** | `sparse-checkout init --cone` + `set dir/` | monorepo 稀疏检出 |

```bash
git worktree add ../app-hotfix hotfix/login
git sparse-checkout init --cone && git sparse-checkout set services/order
```

### Git · 撤销决策表（"我想反悔"该用哪个）

改坏了想回退，先问自己两件事：**改动到哪一步了**（工作区 / 暂存区 / 已提交 / 已 push），**要不要保留改动**。对号入座：

| 处境 | 目标 | 命令 | 备注 / 坑 |
|------|------|------|-----------|
| 改了工作区文件，没 add | 丢弃单个文件改动 | `git restore <file>` | 新语法；旧 `git checkout -- <file>` 等价。⚠ 改动不进回收站，直接没 |
| 改了工作区文件，没 add | 丢弃**全部**未跟踪+已跟踪改动 | `git restore .` + `git clean -fd` | ⚠ `clean -fd` 删未跟踪文件/目录，无法恢复；先 `git clean -nd` 干跑预览 |
| 已 `git add`，想撤出暂存区 | 保留改动，只是不暂存 | `git restore --staged <file>` | 等价旧 `git reset HEAD <file>`；改动仍在工作区 |
| 刚 commit，还没 push，信息写错 | 改提交信息 | `git commit --amend` | ⚠ 会重写该 commit 的 hash；已 push 的别 amend |
| 刚 commit，还没 push，漏了文件 | 追加文件进上一次提交 | `git add 漏的文件 && git commit --amend --no-edit` | 同上，改 hash，只对未 push 的用 |
| 想撤销最近 N 次 commit，**保留改动在暂存区** | 重新组织提交 | `git reset --soft HEAD~N` | 最温和；改动全留着 |
| 想撤销最近 N 次 commit，**保留改动在工作区** | 拆分重提 | `git reset --mixed HEAD~N`（默认） | 改动回到未暂存态 |
| 想撤销最近 N 次 commit，**连改动一起扔** | 彻底不要了 | `git reset --hard HEAD~N` | ⚠⚠ 工作区改动直接销毁，只有 `reflog` 能救；操作前先 `git stash` 保险 |
| 提交**已经 push** 到共享分支，要撤 | 生成一个反向提交 | `git revert <hash>` | 不改历史、可安全推远程；协作分支唯一正确姿势 |
| 撤一段连续提交（已 push） | 批量反向 | `git revert <老>..<新>` 或 `git revert -n A B C` | `-n` 攒到一个提交里；范围左开右闭 |
| 误删分支 / reset --hard 后悔 | 找回 | `git reflog` → `git reset --hard <reflog-hash>` | 见下方"reflog 救命" |

**一句话记忆**：没 push 用 `reset`（改历史随便玩），已 push 用 `revert`（加一笔抵消，不动历史）。

### Git · rebase vs merge（合并两条路线怎么选）

| 维度 | `git merge feature` | `git rebase main`（在 feature 上） |
|------|---------------------|-----------------------------------|
| 历史形态 | 保留分叉，产生 merge commit | 线性历史，像一条直线 |
| 提交 hash | 不变 | ⚠ 全部重写（等于新提交） |
| 冲突解决 | 一次性解决 | 可能每个 commit 都要解一次 |
| 适用 | 公共分支合并、保留真实分叉 | 整理本地私有分支再合入 |
| 铁律 | 随便用 | ⚠ **绝不 rebase 已 push 的公共分支**，会让协作者历史错乱 |

**黄金法则**：只 rebase 还没分享出去的本地提交。合并主线到自己分支保持更新，团队约定用哪种就用哪种，别混。常见组合：本地 `git pull --rebase` 拉取避免无谓 merge commit（可 `git config --global pull.rebase true` 设默认）。

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `git pull --rebase` | 拉远程并把本地提交 rebase 到其上 | 避免"Merge branch 'main'"噪音 commit |
| `git rebase --continue` | 解完冲突继续 rebase | 别忘了先 `git add` 冲突文件 |
| `git rebase --abort` | 放弃 rebase 回到原状 | 救命键；搞乱了就按它 |
| `git rebase --onto A B feat` | 把 feat 从 B 之后的提交嫁接到 A | 高级搬运；换 base 神器 |
| `git merge --no-ff feature` | 强制产生 merge commit | 保留特性分支的成团历史，便于回溯 |
| `git merge --squash feature` | 把整条分支压成一次改动（不自动提交） | 之后手动 `git commit`；丢弃分支内部提交粒度 |

### Git · stash 深用（切分支前的临时口袋）

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `git stash` / `git stash push` | 暂存已跟踪文件的改动 | ⚠ 默认**不含未跟踪的新文件**，会被留在工作区 |
| `git stash -u` | 连未跟踪文件一起暂存 | 新建的文件也想收走时必须加 `-u` |
| `git stash push -m "说明"` | 带备注暂存 | 多个 stash 时靠备注区分，强烈建议加 |
| `git stash push <path>` | 只暂存指定文件 | 部分暂存，别的改动留着 |
| `git stash list` | 列出所有暂存栈 | 显示 `stash@{0}`、`stash@{1}`… |
| `git stash pop` | 恢复最近一个并从栈删除 | ⚠ 若有冲突会中断，且 stash **不会自动删**，需手动处理 |
| `git stash apply stash@{2}` | 恢复指定 stash，保留在栈里 | 想应用到多个分支时用 apply 不用 pop |
| `git stash drop stash@{0}` | 删除指定 stash | pop 冲突后清理残留用 |
| `git stash branch 新分支` | 基于 stash 创建新分支并恢复 | 当时的 base 已变导致 pop 冲突时的最佳解法 |
| `git stash clear` | 清空整个 stash 栈 | ⚠ 全部丢弃不可恢复，慎用 |

### Git · reflog 救命（"提交没了"其实还在）

`reset --hard`、误删分支、rebase 搞乱、`amend` 覆盖——只要改动**曾经被 commit 过**，Git 就在 reflog 里留了 90 天（默认 `gc.reflogExpire`）的引用记录。这是新手最该背下来的救命链：

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `git reflog` | 看 HEAD 的移动全历史 | 每次 commit/reset/checkout/rebase 都留一行，带 `HEAD@{n}` |
| `git reflog show <branch>` | 看某分支引用的移动 | 找回误删分支的最后位置 |
| `git reset --hard HEAD@{3}` | 回到 3 步之前的 HEAD 状态 | ⚠ 会覆盖当前工作区，先确认没有别的改动 |
| `git checkout -b 救回 <hash>` | 把丢失提交拉成新分支 | 比直接 reset 稳，先落地再验证 |
| `git cherry-pick <hash>` | 单独把某个丢失提交捡回来 | 只丢了一两个提交时更精准 |

**捞回被 reset --hard 误删的提交实操**：

```bash
git reflog                      # 找到 reset 之前那一行，例如 a1b2c3d HEAD@{1}: commit: 重要改动
git reset --hard a1b2c3d        # 或更稳：git checkout -b rescue a1b2c3d
```

> [!TIP]
> 只有**已 commit** 的内容进 reflog。从没 `git add`+`commit` 过的工作区改动被 `reset --hard`/`checkout` 冲掉，reflog 也救不回——所以危险操作前养成 `git stash` 或先随手提交的习惯。

---

## Docker 命令速查

## Docker · S 极高频

| 难度 | 命令 | 作用 | 示例 |
|:----:|------|------|------|
| ★★ | `docker run` | 运行容器（核心） | 见下方参数表 |
| ★ | `docker ps` | 查看运行中容器 | `docker ps -a`（含已停止） |
| ★ | `docker stop 容器` | 停止容器 | `docker stop web` |
| ★ | `docker start 容器` | 启动已停止容器 | `docker start web` |
| ★ | `docker restart 容器` | 重启容器 | `docker restart web` |
| ★★ | `docker exec -it 容器 /bin/bash` | 进入容器（最常用调试） | `docker exec -it web bash` |
| ★★ | `docker logs 容器` | 查看日志 | `docker logs -f --tail 100 容器` |
| ★ | `docker images` | 列出本地镜像 | |
| ★ | `docker pull 镜像:tag` | 拉取镜像 | `docker pull nginx:latest` |
| ★ | `docker rm 容器` | 删除容器 | `docker rm -f 容器`（强制删运行中的） |
| ★ | `docker rmi 镜像` | 删除镜像 | |

**`docker run` 核心参数**（面试高频）：
| 参数 | 含义 | 示例 |
|------|------|------|
| `-d` | 后台运行 | |
| `-p 宿主端口:容器端口` | 端口映射 | `-p 8080:80` |
| `--name 名字` | 命名容器 | `--name web` |
| `-e KEY=值` | 环境变量 | `-e MYSQL_ROOT_PASSWORD=123` |
| `-v 宿主目录:容器目录` | 挂载卷 | `-v /data:/coffee-lab/var/lib/mysql` |
| `-it` | 交互式终端 | |
| `--restart always` | 自动重启 | |

**完整示例**：`docker run -d -p 8080:80 --name web --restart always nginx:latest`

## Docker · A 高频

| 难度 | 命令 | 作用 |
|------|------|------|
| ★★ | `docker build -t 名字:tag .` | 构建镜像（在当前目录找 Dockerfile） |
| ★★ | `docker inspect 容器` | 查看容器元数据 |
| ★★ | `docker cp 容器:路径 宿主路径` | 容器与宿主间拷文件 |
| ★★ | `docker search 镜像` | 搜索镜像仓库 |
| ★★ | `docker top 容器` | 查看容器内进程 |
| ★★★ | `docker stats` | 查看容器资源占用（CPU/内存） |
| ★★★ | `docker images -aq \| xargs docker rmi` | 批量删镜像 |
| ★★★ | `docker rm -f $(docker ps -aq)` | 删所有容器（谨慎） |

## Docker · B 中频

| 难度 | 命令/概念 | 作用 |
|------|-----------|------|
| ★★★ | `docker compose up -d`（或旧 `docker-compose`） | 启动编排（Compose V2） |
| ★★★ | `docker compose down`（或旧 `docker-compose`） | 停止并移除 |
| ★★★ | `docker compose ps` | 查看编排服务（Compose V2 子命令,旧版是 `docker-compose ps`) |
| ★★★ | `docker network ls` / `create` | 网络管理 |
| ★★★ | `docker volume ls` | 卷管理 |
| ★★★ | `docker system prune -a` | 清理未使用镜像/容器/卷/网络（高危） |

> [!WARNING]
> **`docker rm -f` 强制删除运行中容器**，数据可能丢失（除非用了 volume 持久化）。  
> **`docker system prune -a` 删所有未用镜像**，包括下载过的所有历史镜像。
> Docker 与虚拟机区别（面试高频）：Docker 共享宿主机内核、启动秒级、MB 级资源；虚拟机独立 Guest OS、启动分钟级、GB 级。

### Docker 构建最佳实践

**Dockerfile 缓存分层原则**：每行指令产生一个镜像层，将**不常变的放在前面**（如 OS 依赖 → 语言运行时依赖 → 应用依赖 → 源码），修改源码时只重建最后几层，大幅加速构建。

**镜像瘦身策略**：
- 多阶段构建（Multi-stage Build）：编译阶段用完整 SDK，运行阶段只拷产物到精简 base 镜像
- 选择 Alpine/Slim 基础镜像代替完整 OS 镜像
- `.dockerignore` 排除 `target/`、`node_modules/`、`.git/` 等

### Docker · 排障 / HEALTHCHECK / buildx

| 频次/难度 | 命令 | 要点 |
|-----------|------|------|
| **S/★★** | `docker exec -it <c> sh` | 进容器 |
| **A/★★** | `logs -f --tail` / `stats` / `inspect` | 日志/资源/元数据 |
| **A/★★** | `system prune` | 清理（慎 -a） |
| **B/★★★** | Dockerfile `HEALTHCHECK` | 健康检查 |
| **A/★★★** | 多阶段 `FROM … AS build` | 瘦镜像 |
| **C/★★★** | `docker buildx` | 跨平台 |

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:8080/actuator/health || exit 1
```

**开发环境 Compose 一键编排**：

```yaml
# docker-compose.yml 示例（本地微服务调试）
# version 字段在 Compose V2 已废弃（可省略）
# version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root123
    ports:
      - "3306:3306"
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  app:
    build: .
    ports:
      - "8080:8080"
    depends_on:
      - mysql
      - redis
```
`docker compose up -d` 一键拉起整个开发环境子网，`docker compose down` 一键销毁。

### Docker Compose V2 · 常用子命令全表

Compose V2 是 `docker` 的子命令（`docker compose`，空格），旧的独立二进制 `docker-compose`（连字符）已停止维护，语法基本兼容但**新特性只在 V2 上**。下表全部用 V2：

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `docker compose up -d` | 后台创建并启动全部服务 | 不加 `-d` 会前台占终端，Ctrl-C 即停 |
| `docker compose up -d --build` | 启动前强制重建镜像 | 改了 Dockerfile/代码后必须加 `--build`，否则用旧镜像 |
| `docker compose up -d <svc>` | 只起指定服务 | 会连带其 `depends_on` 依赖一起起 |
| `docker compose down` | 停止并删除容器/网络 | ⚠ **默认不删 named volume**，数据库数据还在 |
| `docker compose down -v` | 连同卷一起删 | ⚠⚠ 数据库数据一并销毁，慎用；本地重置环境才用 |
| `docker compose down --rmi all` | 顺带删除镜像 | 彻底清干净 |
| `docker compose ps` | 看本项目服务状态 | 只显示当前 compose 项目，比 `docker ps` 聚焦 |
| `docker compose logs -f <svc>` | 跟随某服务日志 | 不指定服务则聚合全部，多服务时刷屏 |
| `docker compose exec <svc> sh` | 进正在运行的服务容器 | 用**服务名**不是容器名；容器没起会报错 |
| `docker compose run --rm <svc> <cmd>` | 起一次性容器跑命令 | 跑迁移/测试常用；`--rm` 用完即删不留垃圾 |
| `docker compose restart <svc>` | 重启服务 | 不重建镜像，只重启进程；改了代码没用 |
| `docker compose stop` / `start` | 停/起但保留容器 | 比 down/up 快，配置没变时用 |
| `docker compose build <svc>` | 只构建不启动 | CI 里分离构建与运行 |
| `docker compose config` | 校验并打印最终配置 | 排查 `.env` 变量插值、YAML 缩进错误利器 |
| `docker compose pull` | 拉取所有 image 型服务的新镜像 | 更新第三方镜像前先 pull |
| `docker compose --profile debug up` | 按 profile 选择性启动 | 把可选服务（如 adminer）圈进 profile，平时不起 |
| `docker compose -f a.yml -f b.yml up` | 多文件叠加 | 后者覆盖前者，实现 base + override 分环境 |

> [!TIP]
> `.env` 文件与 `docker-compose.yml` 同目录时会自动加载，`${VAR}` 插值取自它。改了 `.env` 后 `up` 才生效；已运行的容器不会热更新环境变量，需 `up -d` 重建。用 `docker compose config` 可预览插值结果，排查"变量没生效"。

### Docker · 多阶段构建完整示例（镜像从 700MB 到 200MB）

多阶段构建（Multi-stage Build）核心：**用一个大 SDK 镜像编译，只把产物拷进一个精简运行时镜像**，中间层全部丢弃。以 Java 25 为例：

```dockerfile
# ---------- 阶段 1：构建（含完整 JDK + Maven，几百 MB） ----------
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
# 先只拷 pom.xml 下载依赖 —— 这一层只要 pom 不变就命中缓存，不必每次重下依赖
COPY pom.xml .
RUN mvn -B dependency:go-offline
# 再拷源码编译 —— 改代码只重建这一层
COPY src ./src
RUN mvn -B clean package -DskipTests

# ---------- 阶段 2：运行（只要 JRE，精简） ----------
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
# 只从 build 阶段拷最终 jar，SDK/源码/.m2 全部不进最终镜像
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**关键点**：
- `COPY --from=build` 是多阶段的灵魂，跨阶段只搬产物。
- **先拷依赖清单再拷源码**（pom.xml / package.json 先行）——利用分层缓存，改源码时不重下依赖，构建从几分钟降到几秒。
- 运行阶段用 `-jre-alpine` 而非 `-jdk`，体积差一大截；但 Alpine 用 musl libc，遇到需要 glibc 的原生库（如某些 native 依赖）改用 `-jammy`/`slim`。
- `HEALTHCHECK` 里 Alpine 没有 `curl`，用自带的 `wget -qO-`；`--start-period` 给 JVM 启动留缓冲，否则启动期就被判 unhealthy。

配套 `.dockerignore`（和 Dockerfile 同目录，构建前排除，避免把垃圾送进构建上下文拖慢构建、撑大缓存）：

```gitignore
target/
node_modules/
.git/
.gradle/
*.log
.env
```

### Docker · 磁盘清理（Docker 吃满硬盘时）

Docker 的镜像层、停止的容器、悬空镜像（dangling，`<none>:<none>`）、构建缓存会悄悄吃掉几十上百 GB。先看占用，再精准清：

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `docker system df` | 看 Docker 各类对象磁盘占用 | 排查前第一条；`-v` 看到每个镜像/卷明细 |
| `docker image prune` | 删悬空镜像（`<none>`） | 安全，只删没 tag 又没被引用的 |
| `docker image prune -a` | ⚠ 删**所有**当前没有容器在用的镜像 | 会把只是暂时没跑的镜像也删掉，下次得重拉 |
| `docker container prune` | 删所有已停止容器 | 相对安全；确认没有想 start 回来的 |
| `docker volume prune` | ⚠ 删所有未被容器引用的卷 | **数据库数据常在这里**，删前务必确认没有停着的库容器 |
| `docker builder prune` | 清 buildx 构建缓存 | CI 机器缓存最占地；`-a` 清全部构建缓存 |
| `docker network prune` | 删未使用的自定义网络 | 一般安全 |
| `docker system prune` | 一键清停止容器+悬空镜像+未用网络+构建缓存 | 不删未用镜像和卷（默认） |
| `docker system prune -a --volumes` | ⚠⚠ 核平：连未用镜像和卷全删 | **数据全没**，只在确认要彻底重置时用；生产禁用 |

> [!WARNING]
> `docker volume prune` 和 `--volumes` 是数据丢失第一大坑：只要数据库容器**当时是停止状态**，它的 named volume 就算"未被引用"，会被一起删掉。清理前先 `docker ps -a` 确认没有停着的有状态容器，或给重要卷起个固定名字并 `docker system df -v` 核对。

### Docker · 排障速查（容器起不来/连不上）

| 症状 | 排查命令 | 备注 / 坑 |
|------|----------|-----------|
| 容器一起就退出 | `docker logs <c>` + `docker ps -a` 看 EXITED 码 | 退出码 137 = OOM 被杀（内存不够）；139 = 段错误；1 = 应用自身报错 |
| 想进已退出的容器看现场 | `docker run -it --entrypoint sh <镜像>` | 容器已 Exit 时 `exec` 进不去；改覆盖 entrypoint 起个新的调试 |
| 端口访问不通 | `docker port <c>` + `docker ps` 看映射 | 容器内服务须监听 `0.0.0.0` 不是 `127.0.0.1`，否则映射出去也连不上 |
| 容器间互相连不上 | `docker network inspect <net>` | 同一自定义网络内用**服务名/容器名**当主机名互访，别用 `localhost` |
| 看容器实时资源 | `docker stats <c>` | CPU/内存/网络 IO 实时刷新；定位 OOM 前兆 |
| 看容器完整配置 | `docker inspect <c>` | `--format '{{.State.ExitCode}}'` 精准取字段；查挂载/环境变量/IP |
| 看镜像是怎么构建的 | `docker history <镜像>` | 逐层看大小，揪出哪一层把镜像撑大 |
| 磁盘写满导致启动失败 | `docker system df` | 见上节清理；`no space left on device` 就是它 |
| 时间/时区不对 | 挂载 `-v /coffee-lab/etc/localtime:/coffee-lab/etc/localtime:ro` 或设 `TZ` 环境变量 | 容器默认 UTC，日志时间对不上常因此 |

> [!TIP]
> 退出码速记：**137 = 128+9（SIGKILL，多为 OOM）**，**143 = 128+15（SIGTERM，正常停止）**，**139 = 128+11（段错误）**。看到 137 先查内存限制 `--memory` 和宿主可用内存。

---

## SSH / SCP 远程连接

## SSH / SCP · S 极高频

| 难度 | 命令 | 作用 | 示例 |
|:----:|------|------|------|
| ★★ | `ssh 用户@主机` | 远程登录 | `ssh root@192.0.2.1` |
| ★★ | `ssh 用户@主机 -p 端口` | 指定端口 | `ssh root@host -p 2222` |
| ★★ | `ssh 用户@主机 "命令"` | 远程执行命令 | `ssh root@host "df -h"` |
| ★★ | `scp 本地文件 用户@主机:远程路径` | 上传文件 | `scp app.jar root@host:/coffee-lab/opt/` |
| ★★ | `scp 用户@主机:远程文件 本地路径` | 下载文件 | `scp root@host:/coffee-lab/var/log/app.log ./` |
| ★★ | `scp -r 目录 用户@主机:路径` | 传目录 | `scp -r dist/ root@host:/coffee-lab/var/www/` |
| ★★ | `scp -P 端口` | 指定端口（大写 P） | `scp -P 2222 file root@host:/` |

## SSH · A 高频（免密登录）

| 难度 | 命令 | 作用 |
|------|------|------|
| ★★ | `ssh-keygen -t ed25519` | 生成密钥对（默认 `~/.ssh/id_ed25519` + `.pub`;OpenSSH 8.8+ 已弃用 rsa/SHA-1) |
| ★★ | `ssh-copy-id 用户@主机` | 复制公钥到远程（写入 `~/.ssh/authorized_keys`） |
| ★★★ | 原理：公钥放服务器，私钥留本地，非对称加密验证 | |
| ★★★ | 权限：远程 `.ssh` 目录须 `700`，`authorized_keys` 须 `600`，否则免密失效 | |

> [!TIP]
> 免密登录三步：① `ssh-keygen -t ed25519` 生成 → ② `ssh-copy-id user@host` 复制 → ③ `ssh user@host` 验证。  
> 若免密失效先查远程权限：`chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`

### SSH · config / 隧道 / agent（大厂跳板机）

| 频次/难度 | 能力 | 要点 |
|-----------|------|------|
| **S/★★★** | `~/.ssh/config` | Host 别名、IdentityFile、**ProxyJump** |
| **A/★★★★** | `-L` 本地转发 | `ssh -L 3307:db:3306 -N -f jump` |
| **A/★★★★** | `-R` / `-D` | 远程转发 / SOCKS 动态代理 |
| **A/★★★** | `ssh-agent` + `ssh-add` | 私钥托管 |

```sshconfig
Host jump
  HostName bastion.company.com
  User zhangsan
  IdentityFile ~/.ssh/id_ed25519
Host prod-api
  HostName 192.0.2.15
  User app
  ProxyJump jump
```
