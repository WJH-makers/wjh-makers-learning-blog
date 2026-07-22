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

---

# Docker 命令速查

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
| `-v 宿主目录:容器目录` | 挂载卷 | `-v /data:/var/lib/mysql` |
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
| ★★★ | `docker-compose ps` | 查看编排服务 |
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
`docker-compose up -d` 一键拉起整个开发环境子网，`docker-compose down` 一键销毁。

---

# SSH / SCP 远程连接

## SSH / SCP · S 极高频

| 难度 | 命令 | 作用 | 示例 |
|:----:|------|------|------|
| ★★ | `ssh 用户@主机` | 远程登录 | `ssh root@192.168.1.1` |
| ★★ | `ssh 用户@主机 -p 端口` | 指定端口 | `ssh root@host -p 2222` |
| ★★ | `ssh 用户@主机 "命令"` | 远程执行命令 | `ssh root@host "df -h"` |
| ★★ | `scp 本地文件 用户@主机:远程路径` | 上传文件 | `scp app.jar root@host:/opt/` |
| ★★ | `scp 用户@主机:远程文件 本地路径` | 下载文件 | `scp root@host:/var/log/app.log ./` |
| ★★ | `scp -r 目录 用户@主机:路径` | 传目录 | `scp -r dist/ root@host:/var/www/` |
| ★★ | `scp -P 端口` | 指定端口（大写 P） | `scp -P 2222 file root@host:/` |

## SSH · A 高频（免密登录）

| 难度 | 命令 | 作用 |
|------|------|------|
| ★★ | `ssh-keygen -t rsa` | 生成密钥对（默认 `~/.ssh/id_rsa` + `id_rsa.pub`） |
| ★★ | `ssh-copy-id 用户@主机` | 复制公钥到远程（写入 `~/.ssh/authorized_keys`） |
| ★★★ | 原理：公钥放服务器，私钥留本地，非对称加密验证 | |
| ★★★ | 权限：远程 `.ssh` 目录须 `700`，`authorized_keys` 须 `600`，否则免密失效 | |

> [!TIP]
> 免密登录三步：① `ssh-keygen -t rsa` 生成 → ② `ssh-copy-id user@host` 复制 → ③ `ssh user@host` 验证。  
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
  HostName 10.0.2.15
  User app
  ProxyJump jump
```

---

# systemctl 服务管理

