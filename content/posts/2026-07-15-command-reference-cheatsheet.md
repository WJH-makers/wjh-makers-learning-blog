---
title: "全栈命令 · 指令速查大全（总索引）"
date: 2026-07-15
summary: "全栈命令总索引：按主题跳转 Linux/Git/Docker/MySQL/Redis/Java/Markdown 专题速查，并内置跨主题「最高频 50 条命令」速查表，含每条命令的备注与坑。"
tags: ["命令速查", "Linux", "Git", "Docker", "MySQL", "Redis", "Java", "Markdown", "HTML", "PowerShell"]
---

# 全栈指令速查 · 总索引

> 这是全栈开发日常命令的**总入口**。按主题查请走下方专题页；只想快速捞一条命令、或临阵磨枪，直接看本页内置的 **[最高频 50 条命令](#top50)** 速查表——每条都带真实的「备注 / 坑」。
>
> **怎么用**：知道要干哪一类事 → 点专题页深读；只记得命令名的一半、或忘了某个 flag → Ctrl/⌘+F 本页全文搜。

## 0、专题导航

| 专题页 | 覆盖内容 | 什么时候看 |
|------|------|------|
| [Linux & Windows](/posts/2026-07-21-linux-windows-cheatsheet) | Shell 高频命令、文件操作、进程管理、WSL、CMD/PowerShell 对照 | 部署、排障、写脚本 |
| [Git + Docker + SSH](/posts/2026-07-21-git-docker-cheatsheet) | 版本控制、容器部署、远程免密登录、镜像构建 | 提交代码、上线、连服务器 |
| [MySQL & Redis](/posts/2026-07-21-mysql-redis-cheatsheet) | SQL 增删改查、索引优化、缓存五大数据类型、持久化 | 写查询、调慢 SQL、设计缓存 |
| [Java JVM + 排障 + Spring/Maven](/posts/2026-07-21-java-jvm-cheatsheet) | JVM 调优、CPU/OOM/线程 排查、Spring Boot、Maven | 服务卡死、内存暴涨、面试 |
| [Markdown + HTML](/posts/2026-07-21-markdown-html-cheatsheet) | 写作语法全解、HTML5 标签速查 | 写文档、写博客、排版 |

> 基线环境：Ubuntu 24.04 / Windows 11 / PowerShell 7 / Java 25 / Docker Compose V2 / OpenSSH 8.8+。本页命令已按现代写法给出（如 `docker compose` 空格版、`ssh-keygen -t ed25519`），过时写法在备注里点名。

---

<a id="top50"></a>

## 1、最高频 50 条命令 · 跨主题速查

> 不分专题、只按「几乎天天用」筛出来的 50 条。想深挖某一类，点上面的专题页。破坏性命令标 ⚠。

### 1.1 文件与目录（Linux / macOS）

| 命令 | 作用 | 备注 / 坑 |
|------|------|------|
| `ls -lah` | 列目录（含隐藏、人类可读大小） | `-h` 只对 `-l` 生效；纯 `ls -a` 不显示大小。别名冲突时用 `\ls` 走原始命令 |
| `cd -` | 回上一个目录 | 只记一层；跳多层用 `pushd`/`popd` 或 `cd $OLDPWD` |
| `cp -a src dst` | 归档式复制（保留权限/属主/软链/时间） | 比 `-r` 更安全；`-r` 会把软链复制成实体文件。目标是已存在目录时行为不同，末尾加不加 `/` 结果不一样 |
| `mv a b` | 移动 / 重命名 | ⚠ 目标已存在会**静默覆盖**，加 `-i` 交互确认、`-n` 不覆盖。跨文件系统时是「复制+删除」不是原子操作 |
| `rm -rf dir/` ⚠ | 递归强删 | ⚠ 不可恢复、无回收站。绝不对变量直接 `rm -rf "$X/"`——`X` 为空就删根。删前先 `echo` 展开路径确认 |
| `find . -name "*.log" -mtime +7 -delete` ⚠ | 找并删 7 天前日志 | ⚠ `-delete` 要放最后；先去掉 `-delete` 干跑一遍。`-name` 区分大小写，用 `-iname` 忽略。`-mtime +7` 是「≥8 天」不是「≥7 天」 |
| `grep -rn "ERR" .` | 递归带行号搜文本 | 大目录慢；用 `rg`(ripgrep) 快一个量级且自动跳过 `.gitignore`。搜二进制会乱码，加 `-I` 排除 |
| `tail -f app.log` | 实时跟踪日志 | 日志被 logrotate 切割后 `-f` 会跟丢，用 `-F`(大写) 自动重开新文件 |
| `tar -zxvf a.tgz -C /opt` | 解包到指定目录 | 记忆：**c**reate/e**x**tract、**z**gzip、**v**erbose、**f**ile。`f` 必须紧挨归档名。解包前 `tar -ztvf` 看内容，防「炸目录」（无顶层目录的包铺满当前路径） |
| `chmod 600 id_ed25519` | 改权限 | SSH 私钥必须 600、`.ssh` 目录 700，否则 OpenSSH 拒绝并报 "bad permissions"。`chmod -R 777` ⚠ 是安全反模式，别图省事 |
| `chown -R app:app /srv/app` ⚠ | 改属主/属组 | ⚠ 递归改错目录（如 `/`）会让系统无法启动。用户名写错不会报错、会按 UID 处理 |
| `ln -s /real /link` | 建软链 | 源路径建议用**绝对路径**，相对路径是相对「软链所在目录」解析，极易断链。删软链用 `rm link` 别加 `/` |

### 1.2 进程 · 网络 · 系统

| 命令 | 作用 | 备注 / 坑 |
|------|------|------|
| `ps -ef \| grep java` | 查进程 | grep 会匹配到自己那行，用 `pgrep -a java` 更干净 |
| `kill -9 PID` ⚠ | 强制杀进程 | ⚠ `-9`(SIGKILL) 不给进程善后机会，可能丢数据/留脏锁。先 `kill PID`(SIGTERM) 优雅退，无效再 `-9` |
| `ss -tlnp` | 看监听端口及占用进程 | 已取代 `netstat`；`netstat -tlnp` 多数新系统已不预装。看某端口谁占：`ss -tlnp 'sport = :8080'` |
| `curl -I https://x.com` | 只取响应头 | 测连通/看状态码/跟重定向 `-L`。`-k` 忽略证书 ⚠ 仅调试用。POST：`curl -X POST -d '{}' -H 'Content-Type: application/json'` |
| `df -h` / `du -sh *` | 盘用量 / 目录用量 | `df` 报满但 `du` 加不出来 → 多半是已删但被进程占用的文件，`lsof \| grep deleted` 揪出。`du` 大目录很慢 |
| `free -h` | 看内存 | Linux 的 available 才是真可用；buff/cache 会被算进 used，别一看 used 高就慌 |
| `journalctl -u nginx -f --since "10 min ago"` | 跟 systemd 服务日志 | 无 `-u` 会刷全系统。磁盘被日志占满：`journalctl --vacuum-size=200M` |
| `systemctl restart nginx` | 重启服务 | 改了 unit 文件要先 `systemctl daemon-reload` 否则不生效。`reload` 比 `restart` 温和（不断连接） |
| `nohup java -jar app.jar > app.log 2>&1 &` | 后台常驻运行 | `2>&1` 顺序不能反；漏了标准错误不进文件。生产更推荐用 systemd/supervisor 托管，别裸 `nohup` |

### 1.3 Git

| 命令 | 作用 | 备注 / 坑 |
|------|------|------|
| `git status -sb` | 简洁状态 + 分支追踪 | 上线前必看，确认没漏加文件 |
| `git add -p` | 交互式分块暂存 | 把一次乱改拆成干净的多次提交；比 `git add .` 可控得多 |
| `git commit -m "..."` | 提交 | 空仓首次提交需先有内容；`--amend` 改上一次提交 ⚠ 会改 hash，已 push 的别 amend |
| `git pull --rebase` | 拉取并变基 | 避免无谓的 merge commit；本地有冲突时会中断，`git rebase --abort` 撤回。团队约定统一才用 |
| `git push -u origin feat` | 推送并建立追踪 | ⚠ `git push -f` 强推会覆盖远端历史、坑队友；要用改用 `--force-with-lease`（他人有新提交时会拒绝） |
| `git switch -c feat` | 建并切分支 | 现代写法，取代 `git checkout -b`。切分支丢改动用 `git switch -` 回去；`git checkout` 一词多义易误删文件 |
| `git restore --staged f` | 取消暂存 | 取代老的 `git reset HEAD f`。`git restore f` ⚠ 会丢弃工作区改动、不可恢复 |
| `git log --oneline --graph --all` | 图形化看全分支历史 | 判断某提交/分支是否存在，看 `--all` 而非只看当前 HEAD |
| `git stash` / `git stash pop` | 暂存/恢复未提交改动 | ⚠ `stash` 默认不含未追踪文件（新建的），要加 `-u`。`pop` 冲突时 stash 不会自动删，需手动清 |
| `git reset --hard HEAD~1` ⚠ | 硬回退一版 | ⚠ 丢弃工作区+暂存区所有改动，不可逆。误删可在 `git reflog` 里找回 commit hash 补救 |

### 1.4 Docker & Compose V2

| 命令 | 作用 | 备注 / 坑 |
|------|------|------|
| `docker ps -a` | 列所有容器（含已停止） | 不加 `-a` 只看运行中。查退出码定位崩溃原因 |
| `docker logs -f --tail 200 app` | 跟容器日志 | 日志默认无限增长撑爆磁盘，用 `--log-opt max-size=10m` 限制。`--tail` 防一次刷出几万行 |
| `docker exec -it app bash` | 进容器交互 shell | 精简镜像（alpine）无 bash，用 `sh`。容器已退出时 exec 不进去，得先 `start` |
| `docker compose up -d` | 后台起编排 | V2 是 `docker compose`（空格），`docker-compose`（连字符）是已弃用的 V1。改了 compose 文件重跑此命令即增量更新 |
| `docker compose down` ⚠ | 停并删编排容器/网络 | ⚠ 加 `-v` 会连**命名卷一起删**（数据库数据没了）。不加 `-v` 卷会保留 |
| `docker build -t app:1.0 .` | 构建镜像 | `.dockerignore` 没配好会把 `node_modules`/`.git` 塞进构建上下文，巨慢。用 `--no-cache` 强制重建 |
| `docker system prune -a` ⚠ | 清理无用镜像/容器/网络 | ⚠ `-a` 会删掉所有「未被容器使用」的镜像，包括你想留的。加 `--volumes` 更狠，会删数据卷 |
| `docker stats` | 实时看容器资源占用 | 排查容器 OOM/CPU 打满的第一手工具 |

### 1.5 SSH & 传输

| 命令 | 作用 | 备注 / 坑 |
|------|------|------|
| `ssh-keygen -t ed25519 -C "you@host"` | 生成密钥对 | 现代默认用 ed25519，别再用 `-t rsa`（除非对端老旧，需 rsa 时给 `-b 4096`）。私钥别设空口令后到处拷 |
| `ssh-copy-id user@host` | 免密公钥分发 | 手动等价于把 `id_ed25519.pub` 追加到对端 `~/.ssh/authorized_keys`。仍要密码：查对端 `.ssh` 权限 700、文件 600 |
| `ssh -p 5522 user@host` | 指定端口登录 | ⚠ 是大写 `-P` 给 `scp`、小写 `-p` 给 `ssh`，两者相反，最常踩。频繁连的写进 `~/.ssh/config` |
| `scp -P 5522 f user@host:/p` | 拷文件到远端 | 大目录/断点续传用 `rsync -avzP` 更好。含空格路径要双重转义 |
| `rsync -avzP src/ user@host:/dst/` | 增量同步 | ⚠ 源路径末尾 `/` 有无天差地别：有 `/` 同步「目录内容」，无 `/` 同步「目录本身」。`--delete` 会删目标多余文件，先 `-n` 干跑 |

### 1.6 MySQL / Redis

| 命令 | 作用 | 备注 / 坑 |
|------|------|------|
| `EXPLAIN SELECT ...` | 看执行计划 | 关注 `type`（避免 ALL 全表）、`key`（是否命中索引）、`rows`（扫描行数）。`Extra` 出现 Using filesort/temporary 要警惕 |
| `SELECT ... WHERE ... LIMIT 1` | 查询 | ⚠ 生产环境裸跑无 WHERE 的大表查询会拖垮库；`UPDATE`/`DELETE` 无 WHERE ⚠ 全表操作，`sql_safe_updates` 可拦一手 |
| `SHOW PROCESSLIST` | 看当前连接与慢查询 | 定位是谁把库跑满；`kill <id>` 杀掉卡死查询。生产用 `SHOW FULL PROCESSLIST` 看完整 SQL |
| `mysqldump -u u -p db > db.sql` | 逻辑备份 | ⚠ 密码别写在 `-p` 后同一行（会进 history 且明文）；大库会锁表，加 `--single-transaction` 走一致性快照不锁 InnoDB |
| `redis-cli -n 0 KEYS pattern` ⚠ | 按模式列键 | ⚠ `KEYS *` 在生产会**阻塞整个 Redis**（单线程）。改用 `SCAN 0 MATCH pattern COUNT 100` 游标遍历 |
| `SET k v EX 3600` | 带过期写入 | 缓存必设过期，否则内存只增不减。原子「不存在才设」用 `SET k v NX EX 3600`（分布式锁基础） |
| `TTL key` | 看剩余过期时间 | 返回 `-1` 是永不过期、`-2` 是键不存在——两者别混。缓存雪崩防护：过期时间加随机抖动 |

### 1.7 Java 排障（服务器现场三板斧）

| 命令 | 作用 | 备注 / 坑 |
|------|------|------|
| `jps -l` | 列 JVM 进程及主类 | 比 `ps` 干净。容器里跑不出来多半是 JDK 与目标进程不在同一 namespace/用户 |
| `jstack <pid> > t.txt` | 导线程栈 | CPU 打满时：`top -H -p <pid>` 找高占线程的十进制 tid → 转 16 进制 → 在 jstack 里搜 `nid=0x...`。抓多次对比才准 |
| `jmap -histo:live <pid> \| head` | 看存活对象直方图 | ⚠ `-histo:live` 会触发一次 Full GC 造成 STW 卡顿，生产高峰慎用。找内存泄漏排前几名的类 |
| `jstat -gcutil <pid> 1000` | 每秒采一次 GC 统计 | 看 `FGC`(Full GC 次数) 和 `FGCT`(耗时) 是否飙升，判断是否 GC 频繁导致卡顿 |
| `jcmd <pid> GC.heap_dump /t/h.hprof` ⚠ | 导堆转储 | ⚠ 大堆会生成数 GB 文件并让进程暂停数秒；导完用 MAT/VisualVM 离线分析。别在磁盘将满时导 |

### 1.8 Windows / PowerShell 7 对照

| 命令 | 作用 | 备注 / 坑 |
|------|------|------|
| `Get-ChildItem -Force` | 列目录（含隐藏），≈ `ls -a` | 别名 `ls`/`dir`/`gci` 都指向它，但**输出是对象不是文本**，`ls \| grep` 那套在 PS 里要换成 `Where-Object` |
| `Get-Content -Wait app.log` | 跟踪文件，≈ `tail -f` | `-Wait` 才是跟踪；`-Tail 200` 看末尾。别名 `gc`/`cat` |
| `Get-Process` / `Stop-Process -Id` ⚠ | 看进程 / 杀进程 | ⚠ `Stop-Process` 无优雅信号概念，等价 kill -9。管理员权限进程需以管理员身份运行 PS |
| `Test-NetConnection host -Port 8080` | 测端口连通，≈ `nc -zv` | 比 `ping`（走 ICMP、常被防火墙禁）能真正验证 TCP 端口通不通 |
| `Remove-Item -Recurse -Force $p` ⚠ | 递归强删 | ⚠ 本机沙箱会拦**变量路径**的 `Remove-Item`（误判删根）。删变量路径改用 .NET：`[System.IO.Directory]::Delete($p,$true)`，删前校验叶名与路径深度 |

---

## 2、投前必会 S 包

**部署 / Linux**
- [ ] `ls cd pwd mkdir rm cp mv cat grep tail chmod ps kill ss curl`
- [ ] `tar` `nohup java -jar ... &` `tail -f app.log`
- [ ] `docker ps/run/logs/exec` `docker compose up -d`

**Git / 构建**
- [ ] `git status add commit push pull clone branch`
- [ ] `mvn clean package` `java -jar`

**数据**
- [ ] MySQL：`SELECT/INSERT/UPDATE/DELETE` `EXPLAIN`
- [ ] Redis：`GET/SET/DEL/EXPIRE` 缓存三连

**Java 排障**
- [ ] `jps -l` `jstack` `jmap`

**Spring / MyBatis**
- [ ] `@RestController` `@Autowired` `@Transactional`
- [ ] `#{}` vs `${}` 事务失效 3 条

**分布式口述**
- [ ] 缓存穿透/击穿/雪崩 分布式锁 接口幂等