---
title: "Java JVM 排障 + Maven/Gradle 命令速查"
date: 2026-07-21
summary: "JVM 内存结构 · GC 日志读法 · jcmd/jstack/jmap/jstat 排查三板斧 · OOM 与 CPU 飙高套路 · JFR 飞行记录仪 · 常用启动参数,配套 Maven/Gradle 构建速查。基线 JDK 25 / Ubuntu 24.04。"
tags: [JVM, JDK, Java, GC, OOM, JFR, jstack, jmap, Maven, Gradle, systemctl, Vim]
---

![JVM 排障漫画：从告警到证据链](/comics/jvm/jvm-troubleshooting-cheatsheet.png)

> 从[全栈指令速查大全](/posts/2026-07-15-command-reference-cheatsheet)拆分。本篇聚焦 **JVM 线上排障**——内存结构、GC 日志读法、诊断工具（jcmd/jstack/jmap/jstat）、OOM 与 CPU 飙高套路、JFR 飞行记录仪、常用启动参数,并保留 Maven/Gradle 构建与常用运维命令。基线:JDK 25 / Ubuntu 24.04 / PowerShell 7。

## 一、Maven 构建与依赖

### Maven · S 极高频

| 难度 | 命令 | 作用 | 阶段 |
|------|------|------|------|
| ★ | `mvn clean` | 清理 target 目录 | clean |
| ★ | `mvn compile` | 编译源码到 target/classes | compile |
| ★ | `mvn test` | 运行单元测试 | test |
| ★ | `mvn package` | 打包成 jar/war（含编译+测试） | package |
| ★ | `mvn install` | 打包并安装到**本地仓库**（多一步） | install |
| ★★ | `mvn clean package` | 最常用组合（先清理再打包） | |
| ★★ | `mvn clean package -Dmaven.test.skip=true` | 跳过测试打包 | |
| ★★ | `mvn clean install -DskipTests` | 跳过测试安装 | |

**生命周期**：`clean → validate → compile → test → package → verify → install → deploy`  
**常用组合口诀**：`mvn clean package`（日常） / `mvn clean install`（需本地依赖）

## Maven · A 高频

| 难度 | 命令 | 作用 |
|------|------|------|
| ★★ | `mvn dependency:tree` | 查看依赖树（排查冲突） |
| ★★ | `mvn dependency:tree -Dincludes=groupId:artifactId` | 只看指定依赖 |
| ★★★ | `mvn -U clean package` | 强制更新 SNAPSHOT 依赖（避免缓存旧版本） |
| ★★★ | `mvn -P 环境 test` | 指定 profile 激活（dev/test/prod 配置切换） |
| ★★★ | `mvn -pl 模块名 -am` | 指定模块构建（`-am` also-make 含依赖模块） |
| ★★★ | `mvn help:effective-pom` | 查看合并后的完整 POM |
| ★★★ | `mvn versions:display-dependency-updates` | 查看可用更新 |

### Maven 依赖冲突排查（面试高频）

当出现 `ClassNotFoundException` 或 `NoSuchMethodError` 时，通常是**依赖冲突**（不同版本的同名 jar 同时存在）。

**排查流程**：

```bash
mvn dependency:tree          # 1. 输出完整依赖树
# 搜索冲突的 groupId:artifactId，找到有版本冲突的分支
mvn dependency:tree -Dincludes=com.google.guava:guava  # 2. 聚焦目标依赖
```

**解决方案**：在 `pom.xml` 中用 `<exclusions>` 排除传递依赖中的旧版本：

```xml
<dependency>
    <groupId>xxx</groupId>
    <artifactId>xxx</artifactId>
    <exclusions>
        <exclusion>
            <groupId>conflict-group</groupId>
            <artifactId>conflict-artifact</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

**私有包安装**（企业内部未发布到中央仓库的遗留 jar）：

```bash
mvn install:install-file \
  -Dfile=lib/custom-driver.jar \
  -DgroupId=com.internal \
  -DartifactId=custom-driver \
  -Dversion=1.0 \
  -Dpackaging=jar
```

## Gradle · B 中频

| 难度 | 命令 | 作用 | Maven 对应 |
|------|------|------|-----------|
| ★★ | `./gradlew build` | 构建（编译+测试+打包） | `mvn package` |
| ★★ | `./gradlew clean` | 清理 | `mvn clean` |
| ★★ | `./gradlew test` | 测试 | `mvn test` |
| ★★ | `./gradlew assemble` | 只打包不测试 | |
| ★★ | `./gradlew build -x test` | 跳过测试构建 | |
| ★★★ | `./gradlew dependencies --configuration compileClasspath` | 查看依赖树 | `mvn dependency:tree` |

### Gradle CI/CD 流水线排障

当构建失败时，提升日志级别定位根因：

```bash
./gradlew clean build --info --stacktrace
```
- `--info`：输出详细构建日志（含任务跳过原因）
- `--stacktrace`：打印完整异常堆栈
- `--debug`：最详细级别（含内部变量，但不建议日常使用）

> **推荐用 `./gradlew`（Gradle Wrapper）**保证团队版本一致，比 Maven 快（增量构建 + Daemon 守护进程 + Build Cache）。

---

## 十、Vim 编辑器（难度 × 频次）

## Vim · S 极高频

| 难度 | 命令 | 作用 |
|------|------|------|
| ★ | `i` | 光标前进入插入模式 |
| ★ | `a` | 光标后进入插入模式 |
| ★ | `o` | 下方新开一行进入插入模式 |
| ★ | `Esc` | 返回普通模式（最常用按键） |
| ★ | `:w` | 保存 |
| ★ | `:q` | 退出 |
| ★ | `:wq` 或 `ZZ` | 保存并退出 |
| ★ | `:q!` | 强制不保存退出 |
| ★★ | `h j k l` | 光标移动（左下上右） |
| ★★ | `gg` | 跳到首行 |
| ★★ | `G` | 跳到末行 |
| ★★ | `0` / `$` | 行首 / 行尾 |

**三模式速记**：普通模式（浏览）- `i` → 插入模式（编辑）- `Esc` → 普通模式 - `:` → 命令行模式。

## Vim · A 高频

| 难度 | 命令 | 作用 |
|------|------|------|
| ★★ | `x` | 删除光标字符 |
| ★★ | `dd` | 删除整行（`5dd` 删 5 行） |
| ★★ | `dw` | 删除单词 |
| ★★ | `yy` | 复制行（`5yy` 复制 5 行） |
| ★★ | `p` | 粘贴 |
| ★★ | `u` | 撤销 |
| ★★ | `Ctrl+r` | 重做 |
| ★★ | `/关键字` | 向下搜索（`n` 下一个 `N` 上一个） |
| ★★ | `:%s/old/new/g` | 全文替换 |
| ★★ | `:%s/old/new/gc` | 逐个确认替换 |
| ★★★ | `v` / `V` / `Ctrl+v` | 可视模式（字符/行/块选择） |

> [!NOTE]
> Vim 学习曲线陡峭但效率极高——避免用鼠标、光标移动全靠键盘。熟记 `i Esc :wq` 就能保证基本使用。

### Vim · 进阶效率（B）

| 操作 | 命令 |
|------|------|
| 分屏 | `:sp` / `:vsp`，`Ctrl-w h/j/k/l` |
| 缓冲 | `:bn` / `:bp` / `:ls` |
| 替换 | `:%s/old/new/g`（`gc` 确认） |
| 列编辑 | `Ctrl-v` 可视块 |
| 宏 | `qa…q` 录制，`@a` 回放；`.` 重复 |
| 跳转 | `gg/G`、`:n`、`*`、`Ctrl-o/i` |

---

## 十一、SSH / SCP 远程连接（难度 × 频次）

---

## 十二、systemctl 服务管理（难度 × 频次）

## S 极高频（运行时）

| 难度 | 命令 | 作用 |
|------|------|------|
| ★★ | `systemctl start 服务` | 立即启动 |
| ★★ | `systemctl stop 服务` | 立即停止 |
| ★★ | `systemctl restart 服务` | 完整重启（PID 变化，短暂中断） |
| ★★ | `systemctl reload 服务` | 重载配置不停服务（需服务支持） |
| ★★ | `systemctl status 服务` | 查看详细状态 |
| ★★ | `systemctl enable 服务` | 设开机自启（不立即启动） |
| ★★ | `systemctl disable 服务` | 取消开机自启 |
| ★★ | `systemctl enable --now 服务` | 开机自启并立即启动（一步到位） |

**restart vs reload（面试点）**：
- `restart`：杀进程重建，PID 变，会**短暂中断**连接
- `reload`：发信号让进程重读配置，PID 不变，**不掉连接**（如 nginx `systemctl reload nginx`）

**关键认知**：`start/stop` 与 `enable/disable` 相互独立——只 `stop` 不 `disable`，下次开机还会自动启动。

## A 高频（状态与日志）

| 难度 | 命令 | 作用 |
|------|------|------|
| ★★ | `systemctl is-active 服务` | 判断是否运行（脚本用） |
| ★★ | `systemctl is-enabled 服务` | 判断是否自启 |
| ★★ | `systemctl list-units --type=service` | 列出活动服务 |
| ★★ | `systemctl --failed` | 列出失败服务 |
| ★★★ | `systemctl daemon-reload` | 修改 unit 文件后重载系统认知 |
| ★★★ | `journalctl -u 服务名` | 查看服务日志 |
| ★★★ | `journalctl -u 服务 -f` | 实时跟踪日志 |
| ★★★ | `journalctl -xe` | 排查启动失败首选 |
| ★★★ | `journalctl -xeu 服务` | 针对单服务排障 |
| ★★★ | `journalctl -u 服务 --since "10 min ago"` | 按时间过滤 |
| ★★★ | `journalctl -u 服务 -n 100` | 最近 100 行 |
| ★★★ | `journalctl -u 服务 -p err` | 只看错误级别 |
| ★★★ | `journalctl -u 服务 -b` / `--until "1 hour ago"` | 本次启动 / 时间窗 |

**部署 Java 应用为标准服务**：

```bash
# 1. 编辑 service 文件
sudo vim /etc/systemd/system/myapp.service

# 内容示例：
# [Unit]
# Description=My Java App
# After=network.target
# [Service]
# ExecStart=/usr/bin/java -jar /opt/app/app.jar
# Restart=always
# [Install]
# WantedBy=multi-user.target

# 2. 重载 + 启用 + 启动
sudo systemctl daemon-reload
sudo systemctl enable --now myapp
```

> [!NOTE]
> **daemon-reload vs reload 区别（面试考点）**：`daemon-reload` 重载 systemd 对 unit 文件的认知（修改 `/etc/systemd/system/*.service` 后必执行）；`reload` 重载具体服务的应用配置。  
> MySQL 服务名在不同发行版为 `mysqld`（RHEL/CentOS）或 `mysql`（Debian/Ubuntu），MariaDB 为 `mariadb`。

---

## 十三、JDK / JVM 命令行工具（难度 × 频次）

## JDK · S 极高频

| 难度 | 命令 | 作用 | 示例 |
|:----:|------|------|------|
| ★ | `javac 文件.java` | 编译源码成 class | `javac Hello.java` |
| ★ | `java 类名` | 运行 class | `java Hello` |
| ★ | `java -jar app.jar` | 运行可执行 jar（最常用启动） | |
| ★★ | `java -Xms512m -Xmx1024m -jar app.jar` | 设堆内存启动 | |
| ★ | `java -version` | 查看版本 | |
| ★★ | `jar -cvf app.jar 目录` | 打包 jar | |
| ★★ | `jar -tf app.jar` | 查看 jar 内容 | |
| ★★ | `jar -xvf app.jar` | 解压 jar | |
| ★★ | `jps -l` | 查看所有 Java 进程（PID + 主类） | `jps -l`、`jps -v`（含 JVM 参数） |

## JDK · A 高频（JVM 排查三板斧）

| 难度 | 命令 | 作用 | 场景 |
|------|------|------|------|
| ★★★ | `jstack <PID>` | 打印线程堆栈快照 | 死锁、死循环、线程阻塞、CPU 飙高 |
| ★★★ | `jmap -heap <PID>` | 查看堆内存使用（**JDK 8**；9+ 用 `jhsdb jmap --heap` 或 `jcmd GC.heap_info`） | 排查内存占用 |
| ★★★ | `jmap -dump:format=b,file=heap.hprof <PID>` | 导出堆快照（**OOM 排查核心**） | 内存泄漏分析 |
| ★★★ | `jmap -histo <PID>` | 对象数量统计 | 快速看哪些对象多 |
| ★★★ | `jstat -gcutil <PID> 1000` | 每秒监控 GC 各区使用率 | 排查频繁 Full GC |
| ★★★ | `jstat -gc <PID>` | 看各代容量和 GC 次数 | |
| ★★★ | `jinfo -flags <PID>` | 查看 JVM 启动参数 | |
| ★★★ | `jinfo -flag +PrintGC <PID>` | 动态开关 GC 日志（**JDK 8**；9+ 统一日志后无效，用 `jcmd`） | |

**`jstack` 输出关键字段**：
```
"线程名" tid=0x... nid=0x1db1   <-- nid 是十六进制线程 ID
   java.lang.Thread.State: RUNNABLE
        at com.example.Xxx.method(Xxx.java:行号)
```
线程状态：RUNNABLE（运行中）、BLOCKED（等锁）、WAITING（等 notify）、TIMED_WAITING（限时等待）。

## JDK · B 中频（进阶诊断）

| 难度 | 命令/工具 | 作用 |
|------|-----------|------|
| ★★★ | `jcmd <PID> Thread.print` | 替代 jstack（Oracle 推荐） |
| ★★★ | `jcmd <PID> GC.heap_info` | 替代 jmap -heap |
| ★★★ | `jcmd <PID> GC.heap_dump file.hprof` | 替代 jmap -dump |
| ★★★ | `jcmd <PID> help` | 列出所有可用命令 |
| ★★★ | `jconsole` / `jvisualvm` | 图形化 JVM 监控（本地/远程） |
| ★★★★ | **Arthas**（阿里开源，36k+ stars） | 线上诊断神器 |

**Arthas 常用命令**（`java -jar arthas-boot.jar` 启动并 attach）：
| 命令 | 作用 | 对标/场景 |
|------|------|----------|
| `dashboard` | 全局面板（CPU/内存/线程/GC 实时刷新） | 宏观监控，类似可视化工具的终端版 |
| `thread` | 线程列表，`thread -n 3` 找 Top 3 CPU 线程，`thread -b` 查死锁 | CPU 飙高第一响应指令 |
| `watch 类 方法 '{params,returnObj,throwExp}' -x 2` | 无侵入监控方法入参/出参/异常 | 不用打日志，不用重启，出参深度 `-x 2` 控展开层级 |
| `trace 类 方法` | 方法内部调用链耗时树 | 定位慢接口的瓶颈子方法 |
| `jad 类` | 反编译内存中字节码为 Java 源码 | 验证线上运行代码是否最新版本 |
| `sc 类名` | 搜索 JVM 已加载类，显示来自哪个 jar 及 ClassLoader | 排查 Jar Hell（类冲突）、Spring Bean 注入失败 |
| `sm 类名` | 搜索类中所有方法 | 确认方法签名 |
| `stack 类 方法` | 看方法被谁调用（调用来源路径） | 排查意外调用 |
| `tt -t 类 方法` | Time Tunnel 时空隧道，记录每次调用现场 | 偶发 Bug 的"回放"机制——记录后可 `tt --replay` 重放 |
| `mc /tmp/Hello.java -d /tmp/` + `redefine /tmp/Hello.class` | 内存编译 + 热替换类 | **不重启修复线上 Bug**（Arthas 革命性特性） |

> [!NOTE]
> Oracle 官方文档将 jstack/jmap/jinfo 标注为"实验性（Experimental）"工具，自 JDK 8 引入 `jcmd` 起建议改用 `jcmd`。但 jstack/jmap 因简单直接，生产中仍广泛使用。Windows 下部分 jinfo/jmap 功能受限。  
> **Arthas 的价值**：传统 jmap dump 会触发长时间 STW（Stop The World），jstack 只有静态快照。Arthas 通过字节码增强实现无侵入动态诊断——不修改代码、不重启应用、可反复重放。

---

## 十四、线上排查经典套路（必背）

## CPU 飙高 100% 排查五步法

| 步骤 | 命令 | 目的 |
|------|------|------|
| 1 | `top` | 找到最耗 CPU 的进程 PID（按 `P` 排序） |
| 2 | `top -Hp <PID>` | 找该进程内最耗 CPU 的线程 TID（**十进制**） |
| 3 | `printf "%x\n" <TID>` | 将线程 ID 转成**十六进制** |
| 4 | `jstack <PID> \| grep -A 30 "nid=0x<hex>"` | 定位具体线程堆栈与代码行 |
| 5 | 分析代码 | 常见原因：死循环、正则、频繁计算、频繁 Full GC |

**完整命令链（一条复制）**：

```bash
# 假设 top 找到 PID=12345，top -Hp 12345 找到线程 TID=12399
printf "%x\n" 12399          # → 0x306f
jstack 12345 | grep -A 30 "nid=0x306f"
```

> [!IMPORTANT]
> **关键点**：`top` 显示的线程 ID 是**十进制**，jstack 的 `nid` 是**十六进制**，必须用 `printf "%x"` 转换。建议间隔几秒抓 3~5 次 dump，排除瞬时繁忙。

**现代加速路径（Arthas，与五步法互补）**：

```bash
java -jar arthas-boot.jar
dashboard
thread -n 3                 # Top CPU，无需手算 hex
thread -b                   # 死锁
trace com.demo.OrderService create
watch com.demo.OrderService create '{params,returnObj,throwExp}' -x 2
```

## OOM / 内存泄漏排查流程

| 步骤 | 命令 | 目的 |
|------|------|------|
| 1 | 启动参数加 `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=路径` | OOM 时自动导出堆快照 |
| 2 | 或手动 `jmap -dump:format=b,file=heap.hprof <PID>` | 手动导出 |
| 3 | 用 Eclipse Memory Analyzer Tool（MAT）分析 hprof | 定位大对象/泄漏引用链 |
| 4 | 配合 `jstat -gcutil PID 1000` | 观察是否频繁 Full GC |

**OOM 前兆判断**：

```bash
jstat -gcutil <PID> 1000
# 关注 FGC（Full GC 次数）持续增长、OU（老年代使用率）持续接近 100%
```

---

## 十五、跨平台对照速查

| 操作 | Linux | Windows CMD |
|------|-------|-------------|
| 列目录 | `ls -la` | `dir` |
| 进目录 | `cd` | `cd` |
| 建目录 | `mkdir -p` | `md` |
| 复制 | `cp -r` | `xcopy`/`robocopy`/`copy` |
| 删除 | `rm -rf` | `del` / `rd /s /q` |
| 看文件 | `cat`/`less` | `type` |
| 搜文本 | `grep` | `findstr` |
| 进程 | `ps aux` | `tasklist` |
| 杀进程 | `kill`/`kill -9` | `taskkill /F` |
| 端口 | `ss -tlnp` / `lsof -i :端口` | `netstat -ano` |
| IP | `ip a` | `ipconfig` |
| 路由追踪 | `traceroute` | `tracert` |
| 端口连通 | `telnet host 端口` | `telnet host 端口` |
| DNS | `dig` / `nslookup` | `nslookup` |
| Docker | `docker` | `docker`（Docker Desktop） |
| Git | `git` | `git` |
| MySQL | `mysql -u root -p` | `mysql -u root -p` |

### 查端口额外手段

| Linux | 作用 |
|-------|------|
| `ss -tlnp \| grep :8080` | 现代首选，直接读内核 socket 表 |
| `lsof -i :8080` | List Open Files，通过进程文件描述符反查 |
| `netstat -tlnp \| grep 8080` | 旧方式，需 `net-tools` 包 |

### PowerShell 常用别名（Unix → PS 映射）

| Unix | PowerShell Cmdlet | 别名 |
|------|------------------|------|
| `ls` | `Get-ChildItem` | `ls` `dir` `gci` |
| `cat` | `Get-Content` | `cat` `type` `gc` |
| `grep` | `Select-String` | — |
| `ps` | `Get-Process` | `ps` `gps` |
| `kill` | `Stop-Process` | `kill` `spps` |
| `curl` | `Invoke-WebRequest` | `curl` `iwr` |

---

## 十六、一页纸总口诀

```text
【Linux S】ls cd pwd  mkdir rm cp mv  cat grep tail  chmod ps kill ss curl
【Win S】  dir cd md copy del type  tasklist taskkill  ipconfig netstat
【Git S】  status add commit push pull clone  branch switch merge log
【MD S】   #标题 **粗** *斜* `码` -列表 1. [链](url) >引用 ```代码
【HTML S】 html head body div p a img h1-6 ul/ol form input script link
【MySQL S】SELECT INSERT UPDATE DELETE WHERE  GROUP BY JOIN EXPLAIN
【Redis S】SET GET DEL EXPIRE KEYS  HSET LPUSH SADD ZADD  INCR DECR
【Docker S】run ps stop exec logs  build images pull rm rmi
【Maven S】clean compile test package install  dependency:tree
【Vim S】  i Esc :w :q h j k l  dd yy p /搜索  :%s/old/new/g
【SSH S】  ssh user@host  scp file user@host:path
【systemctl S】start stop restart status enable disable
【JDK S】  java -jar javac jps  jstack jmap jstat
```

**权限**：755 目录 · 644 文件 · 600 密钥  
**杀进程**：先温柔 TERM，再 -9 / taskkill /F  
**Git 日更**：status → add → commit → push  

---

## 十七、核心洞察与校招入职赋能指南

> 指令是手段，建立**系统可观测性**的思维才是目的。

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
