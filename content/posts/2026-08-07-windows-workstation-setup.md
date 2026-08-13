---
title: "我的 Windows 全栈工作站：性能优先的 Java + WSL2 配置复盘"
date: 2026-08-07
summary: "把游戏、IDE、前端、Java、Python GPU 实验和 Linux 工具放在一台 Windows 工作站上，关键不是堆更多软件，而是给每一层划清职责、资源预算和可验证的边界。"
tags: [Windows, WSL2, Java, 全栈开发, PyTorch, 性能优化, 环境配置, 复盘]
---

# 我的 Windows 全栈工作站：性能优先的 Java + WSL2 配置复盘

## 为什么要重新整理工作站

开发环境最容易变成一座“能运行但说不清”的旧仓库：系统里有好几份 JDK，终端里有好几个 Node，容器一会儿走 Docker、一会儿走 Podman，IDE 还能自己偷偷选另一套构建 JVM。偶尔能跑通，并不等于环境可靠。

这次整理的目标很具体：

- 游戏时保留稳定的图形性能，不让开发服务和重复的虚拟机悄悄吃掉内存；
- Java 项目可以在 8、17、21、25 之间切换，Maven 和 Gradle 能知道自己实际用了哪个 JDK；
- WSL2 负责 Linux 后端、Python/PyTorch 和脚本，Windows 负责游戏、IDE 与需要原生体验的前端工具；
- 每个关键配置都有验证命令，出问题时能定位到层，而不是继续盲目“优化”。

## 最终采用的分层

| 层 | 主要职责 | 原则 |
| --- | --- | --- |
| Windows | 游戏、IDE、浏览器、原生前端调试 | 保持图形驱动、输入和桌面体验稳定 |
| WSL2 Ubuntu | Linux 后端、脚本、Python、GPU 实验 | 让 Linux 工具链在一个可复现的环境里工作 |
| Java | 8/17/21/25 多版本项目 | 默认版本与项目 toolchain 分开，不靠“碰运气的 PATH” |
| 容器 | Redis 等开发依赖 | 同一时间尽量只运行一套后端，避免双重虚拟化 |
| 缓存 | Maven、Gradle、uv、npm、Cargo | 集中放到开发缓存目录，系统盘只保留必要运行文件 |

这不是“所有东西都塞进 WSL”。游戏和 IDE 的交互体验留在 Windows，Linux 后端和 GPU 实验放进 WSL，边界清楚以后，排查问题反而更快。

## Java：多版本共存，但每个项目只认一份

当前工作站需要兼容老项目和新项目，所以保留了 Temurin 8、Microsoft JDK 17、Temurin 21，以及 GraalVM JDK 25。默认开发基线设为 25；需要老版本时，用显式的切换函数或项目 toolchain，而不是手动改系统变量。

先确认命令行看到的版本：

```powershell
java -version
javac -version
mvn -v
gradle -v
```

这里有一个经常被忽略的区别：`java -version` 反映的是 PATH 中找到的命令，Maven/Gradle 还会受 `JAVA_HOME`、IDE 设置和项目 wrapper 影响。真正可靠的检查要同时看：

```powershell
where.exe java
$env:JAVA_HOME
mvn -v
```

项目级构建应优先使用 Maven Wrapper 或 Gradle Wrapper；全局 Maven/Gradle 只是方便执行诊断和没有 wrapper 的小项目。全局 Gradle 开启 daemon、并行、缓存和有限 worker 数，堆上限给到足够但不过度的范围，避免 32 GB 机器被多个守护进程一起吃满。

## WSL2：给它预算，而不是让它无限长大

WSL2 当前的思路是给开发留出明确预算：内存上限约 16 GB，配合有限 swap；构建缓存、Python 缓存和 Gradle 用户目录集中管理。这样做的价值不是让每个任务都拿到最大资源，而是让游戏、浏览器、IDE 和训练任务同时存在时，系统仍然有余量。

基础状态检查：

```powershell
wsl --status
wsl --list --verbose
```

WSL 内部再确认 Java、Python 和 GPU：

```bash
java -version
python -c 'import torch; print(torch.__version__, torch.cuda.is_available())'
nvidia-smi
```

Windows 和 WSL 两侧都验证过 PyTorch 能看到 RTX 4060，说明 GPU 通路已经打通；但“能看到 GPU”不等于每次训练都应该占满显存。训练任务仍要按 batch size、显存和温度逐步加压。

## 容器：最容易被忽略的性能分叉

这台机器同时存在 WSL2 Podman 和 Windows Hyper-V Podman。它们都能运行容器，但同时开着就是两套 Linux 虚拟化环境：一个开发 Redis 即使只占很少 CPU，也会额外保留虚拟机资源。

检查当前入口：

```powershell
podman machine list
podman system connection list
podman ps -a
```

整理时不能直接 `prune` 或删除 volume。先确认 compose 项目、端口和数据卷，再决定唯一后端。我的性能优先取舍是：

1. WSL2 作为 Linux 开发和 rootless 容器的主入口；
2. Windows Podman 只在确实需要 Windows 侧 Docker 兼容体验时启动；
3. Redis 等有状态服务先导出或确认数据卷，再迁移和停机；
4. 游戏前关闭不需要的容器和训练进程，而不是依赖注册表“神优化”。

这次实际落地时没有直接删除 Windows 后端：为了保留 Windows 侧 Docker/Podman 兼容入口，把 Hyper-V 机器从 8 核/6 GB 收到 4 核/4 GB；原有 Redis 容器重启后通过 `PONG`、健康检查和本机端口验证，数据量仍为 0。WSL Podman 暂时保持空闲，等真正需要统一后端时再做导出、切换和回滚验证。

## 权限：纯净不等于全盘只留两个 SID

用户目录和项目目录可以收紧到“本人 + Administrators + SYSTEM”。但 `C:\Windows`、`Program Files` 和磁盘根目录必须保留 `SYSTEM`、`TrustedInstaller`、应用包以及系统默认的读取/遍历权限。把整台电脑的 ACL 强行改成两个 SID，会让更新、驱动、Defender、WSL 或 Hyper-V 在某个看似无关的时刻坏掉。

更好的规则是：

- 私密目录收紧权限；
- 系统目录保持 Windows 默认 ACL；
- 任何递归 ACL 修改前先导出当前 ACL，并只对明确的目标目录操作；
- 权限优化和性能优化分开验证，不能为了“看起来干净”牺牲可恢复性。

## 一张够用的验收清单

每次改完环境，我会按下面的顺序验收：

```powershell
where.exe java
java -version
mvn -v
gradle -v
wsl --list --verbose
podman machine list
nvidia-smi
```

再根据项目运行测试：

```powershell
npm run typecheck
npm test
npm run build
```

如果某一项失败，先记录它属于 Windows、WSL、JDK、构建工具、容器还是项目代码，再修那一层。不要在没有证据时继续加启动项、改注册表或删缓存。

## 这次复盘留下的结论

真正好用的工作站不是“装得最多”，而是每个工具都有唯一入口、每份资源都有预算、每个高风险动作都有回滚路径。游戏性能、Java 全栈开发和 AI 实验并不冲突；冲突通常来自重复的运行时、没有边界的缓存和未经验证的全局修改。

下一步是把 Windows Podman 与 WSL Podman 的职责彻底统一，并把这套检查清单放进项目的日常开发流程里。环境会继续变化，但诊断方法应该比版本变化更稳定。

## 运行环境、验证与依据

- **运行环境**：Windows 11 + WSL2 Ubuntu；Java 项目按 8/17/21/25 的实际需求选择 JDK，文章中的默认基线不代表所有项目必须升级。
- **最后验证**：Windows 与 WSL 分别执行 `java -version`、`mvn -v`、`wsl --list --verbose` 与 `nvidia-smi`；项目构建以仓库自己的 wrapper、锁文件和测试结果为准。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html)、[WSL 文档](https://learn.microsoft.com/windows/wsl/) 与 [Podman 文档](https://docs.podman.io/)。版本、实现细节和性能数字必须按实际环境重新验证。
- **安全边界**：本文不记录账户 SID、真实路径、代理凭据、数据库连接串或服务器地址；任何涉及生产环境、权限递归修改和有状态容器的数据操作，都应先备份再执行。
