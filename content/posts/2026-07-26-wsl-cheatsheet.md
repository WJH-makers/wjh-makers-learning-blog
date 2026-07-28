---
title: "WSL 速查 · 安装到导出的全周期"
date: 2026-07-26
summary: "WSL2(Ubuntu 24.04 LTS)在 Windows 11 上从 wsl --install 到 export / unregister 的完整生命周期速查:发行版管理、路径互通性能陷阱、网络端口、systemd、.wslconfig 资源限制与备份迁移。"
tags: [命令速查, WSL, Linux]
---


# WSL 速查 · 安装到导出的全周期

> 基线:WSL2 on Windows 11;Ubuntu 24.04 LTS。约定——`wsl --*` 管理命令在 **Windows 端**(PowerShell / CMD)执行,`apt` / `systemctl` / `ip` 等在**发行版内**(Linux)执行;改任何配置后以 `wsl --shutdown` 生效,`exit` 不算。

## 快速导航

| 阶段 | 一句话 |
|------|--------|
| 1、安装与发行版管理 | 装 WSL2、列/切/关发行版、转版本 |
| 2、进入与用户 | 各种进入姿势、设默认用户、忘密救援 |
| 3、apt 包管理 | 装升卸清,以及 WSL 时钟漂移致 apt 失败 |
| 4、文件系统与路径互通 | **本篇核心**:/mnt/c 的 IO 性能陷阱与正确做法 |
| 5、网络与端口 | WSL IP、localhost 转发、镜像网络、端口转发 |
| 6、systemd 与服务 | 开 systemd、验证 PID 1、无 systemd 的替代 |
| 7、与 Windows 互操作 | Linux 调 Windows、Windows 调 Linux、剪贴板 |
| 8、资源限制（.wslconfig） | 限内存/CPU/swap、自动归还缓存 |
| 9、备份导出与导入 | export/import、迁移出 C 盘、稀疏磁盘 |
| 10、卸载与减面 | 注销发行版（⚠）、压缩 vhdx、彻底关功能 |
| 常见错误速判 | 症状→病因→先试哪条 |
| 一页纸口诀 | 浓缩心智模型 |

## 1、安装与发行版管理

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `wsl --install` | 一键装 WSL2 + 默认 Ubuntu | Win11 自带;需管理员;装完**重启**再设账号 |
| `wsl --install -d Ubuntu-24.04` | 装指定发行版 | 名字用 `wsl -l -o` 里的准确写法 |
| `wsl -l -o` | 列可在线安装的发行版 | `--list --online` 的简写 |
| `wsl -l -v` | 列已装发行版 + 状态 + WSL 版本 | VERSION 列是 1 还是 2,一眼看清 |
| `wsl --status` | 看默认发行版 / 默认版本 / 内核版本 | 排障第一条 |
| `wsl --version` | 看 WSL / 内核 / WSLg 版本 | 需 Store 版 WSL;老的内建 WSL 无此命令 |
| `wsl --update` | 更新 WSL 内核与组件 | 现在内核走 Store 分发;加 `--pre-release` 尝鲜 |
| `wsl --set-default-version 2` | 设新装发行版默认用 WSL2 | 只影响之后新装的 |
| `wsl --set-version Ubuntu-24.04 2` | 把某发行版从 WSL1 转 WSL2 | 一次性转换,大发行版**很慢**,先备份 |
| `wsl -s Ubuntu-24.04` | 设默认发行版 | `--set-default` 的简写;裸敲 `wsl` 进的就是它 |
| `wsl -t Ubuntu-24.04` | 只关某个发行版 | `--terminate`;比整机 shutdown 温柔 |
| `wsl --shutdown` | 关掉所有发行版和 WSL2 虚拟机 | ⚠ 会掐断该 VM 内全部进程;改配置后靠它生效 |

## 2、进入与用户

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `wsl` | 进默认发行版、默认用户 | 起点在当前 Windows 目录（即 `/mnt/...`）|
| `wsl -d Ubuntu-24.04` | 进指定发行版 | 多发行版并存时用 |
| `wsl -u root` | 以 root 进(免密) | `--user`;救援 / 修权限用 |
| `wsl -e <cmd>` / `wsl -- <cmd>` | 跑一条命令即退出 | `wsl -- ls -la`;`--` 后原样透传,不被 wsl 解析 |
| `wsl --cd ~` | 进入时切到指定目录 | 支持 Linux 或 Windows 路径;`--cd ~` 直达家目录避开 /mnt |
| `/etc/wsl.conf` → `[user]`<br>`default=<name>` | 设发行版默认登录用户 | 通用做法;改后 `wsl --shutdown` 生效 |
| `sudo adduser <name>` | 新建用户 | 交互式设密码;比 `useradd` 友好 |
| `sudo usermod -aG sudo <name>` | 加入 sudo 组 | 没这步新用户不能 `sudo` |
| `passwd <name>` | 改密码 | **忘密救援**:`wsl -u root` 进 → `passwd 你的用户名` |

## 3、apt 包管理

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `sudo apt update` | 刷新包索引 | 新装发行版**第一件事**;索引不刷,后面全报 404 |
| `sudo apt upgrade` | 升级已装包 | 加 `-y` 免确认;不删包 |
| `sudo apt full-upgrade` | 升级（允许删/换依赖） | 跨大版本时才需要 |
| `sudo apt install <pkg>` | 装包 | 一次可跟多个包名 |
| `sudo apt remove <pkg>` | 卸包（留配置） | 配置文件还在 `/etc` |
| `sudo apt purge <pkg>` | 卸包 + 删配置 | 想彻底清用它 |
| `sudo apt autoremove` | 清孤儿依赖 | 定期跑,省 vhdx 空间 |
| `sudo add-apt-repository ppa:<x>` | 加 PPA 源 | 加完要 `apt update` |
| `sudo apt clean` | 清 `/var/cache/apt/archives` 缓存 | 释放已下载的 .deb,vhdx 减肥的一环 |

> [!WARNING]
> **WSL 时钟漂移**:Windows 休眠/唤醒后,WSL2 时钟可能滞后,`apt update` 报 `Release file ... is not valid yet`（证书/元数据"来自未来"）。先 `sudo hwclock -s` 从硬件时钟同步;仍不行就 `wsl --shutdown` 重进（重启会重新对时）。这不是源坏了,别急着换镜像。

## 4、文件系统与路径互通（性能陷阱）

> [!WARNING]
> **本篇最值钱的一节。** WSL2 是轻量虚拟机:Linux 根文件系统是一块 **ext4 虚拟磁盘(ext4.vhdx)**,访问 `~`、`/home`、`/` 是**原生速度**;而 Windows 盘挂在 `/mnt/c`,经 **9P 协议跨虚拟机边界**访问——小文件密集 IO(`git status`、`npm install`、`node_modules`、编译)会**慢一个数量级(5–10 倍甚至更多)**。
>
> **正确做法:项目源码放 Linux 侧(如 `~/projects`),不要放在 `/mnt/c` 下。** 需在 Windows 里编辑时,反过来从 `\\wsl.localhost\<发行版>\` 访问 Linux 文件;`/mnt/c` 只当作两侧"交换文件"的中转,别把工作区安在那儿。

| 命令 / 路径 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `~/projects`（Linux 侧） | 放项目源码的正确位置 | ext4 原生 IO,快;编译/包管理都在这跑 |
| `/mnt/c/...` | 从 Linux 访问 Windows C 盘 | ⚠ 9P 跨界,小文件 IO **慢一个数量级**;别把仓库放这 |
| `\\wsl.localhost\Ubuntu-24.04\home\<user>` | 从 Windows 访问 Linux 文件 | 资源管理器地址栏直接输;老写法 `\\wsl$\...` 亦可 |
| `explorer.exe .` | 在资源管理器打开当前 Linux 目录 | 反向访问的最快入口 |
| `wslpath -w /home/user` | Linux 路径 → Windows 路径 | 输出如 `\\wsl.localhost\...` 或 `C:\...` |
| `wslpath -u 'C:\Users\me'` | Windows 路径 → Linux 路径 | **单引号**包住,否则反斜杠被吞 |
| `/etc/wsl.conf` → `[automount]`<br>`options="metadata,umask=022"` | 让 `chmod`/`chown` 在 /mnt 上生效 | 不加 metadata,/mnt 文件恒为 777,改权限不落地 |
| `git config --global core.autocrlf input` | 统一换行(项目在 Linux 侧时) | CRLF 会让脚本报 `bad interpreter: ^M`;或用 `dos2unix` |

## 5、网络与端口

| 命令 / 配置 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `hostname -I` / `ip addr show eth0` | 查 WSL2 自身 IP | NAT 模式该 IP **每次启动可能变**,别写死进脚本 |
| Windows 侧访问 `localhost:<端口>` | 直连 WSL 内监听的服务 | `localhostForwarding` 默认开;服务最好绑 `0.0.0.0` 而非仅内网卡 |
| `ss -tlnp` | 列 WSL 内监听端口 / 进程 | 替代老的 `netstat`;确认服务真在听 |
| `ip route show default` | 取默认网关 | NAT 模式下即通往 Windows 主机的地址,从 WSL 访问 Windows 服务用它 |
| `.wslconfig` → `[wsl2]`<br>`networkingMode=mirrored` | 镜像网络模式 | Win11 22H2+ / WSL 2.0+;localhost **双向**、Windows 可直达 WSL 服务 |
| `netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=8080 connectaddress=<WSL_IP>` | Windows→WSL 端口转发 | ⚠ 需管理员;供局域网访问 WSL 服务;WSL IP 变了要重配;查用 `... show all`,删用 `... delete v4tov4 listenport=8080` |

> [!NOTE]
> **DNS 挂了**(VPN / 代理下常见):`wsl.conf` 加 `[network] generateResolvConf=false` 再手动写 `/etc/resolv.conf`;或 `.wslconfig` 设 `[wsl2] dnsTunneling=true` 借道 Windows 解析。

## 6、systemd 与服务

| 命令 / 配置 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `/etc/wsl.conf` → `[boot]`<br>`systemd=true` | 开启 systemd | 改后 `wsl --shutdown` 重启才生效;近版 Ubuntu 24.04 多已默认开 |
| `ps -p 1 -o comm=` | 看 PID 1 是不是 systemd | 输出 `systemd` 即已启用;否则是 `init`/shell |
| `systemctl status <svc>` | 查服务状态 | 需 systemd;没开会报 "System has not been booted with systemd" |
| `sudo systemctl enable --now <svc>` | 开机自启 + 立刻启动 | 如 `enable --now docker` |
| `sudo service <svc> start` | SysV 方式启动服务 | **无 systemd** 时的退路 |
| `journalctl -u <svc> -e` | 看服务日志(跳到末尾) | systemd 环境;`-f` 实时跟 |
| `/etc/wsl.conf` → `[boot]`<br>`command="<cmd>"` | 开机以 root 跑一条命令 | 轻量替代:不想开整套 systemd 时用它拉起某服务 |

## 7、与 Windows 互操作（互相调用命令）

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `explorer.exe .` | 资源管理器打开当前 Linux 目录 | `.exe` 能直接跑,是因 Windows PATH 被追加进 Linux |
| `code .` | VS Code 远程连 WSL 打开当前目录 | 装了 WSL 扩展即走 Remote,编辑器在 Windows、进程在 Linux |
| `<命令> \| clip.exe` | 输出送 Windows 剪贴板 | 如 `cat id_rsa.pub \| clip.exe` |
| `powershell.exe -c "<cmd>"` / `cmd.exe /c <cmd>` | 从 Linux 调 Windows shell | PS 输出为 UTF-16/CRLF;如 `cmd.exe /c ver` |
| `wslview <url或文件>` | 用 Windows 默认程序打开 | 需 `wslu` 包;`sudo apt install wslu` |
| `wsl -- <cmd>`（在 Windows 端） | 从 PowerShell/CMD 调 Linux 命令 | 如 `wsl -- ls -la`;`--` 后原样透传 |
| `export WSLENV=VAR/p`（Linux 端） | 跨界传环境变量 | 标志:`/p` 路径转换、`/l` 列表、`/u` 仅 Win→WSL、`/w` 仅 WSL→Win |
| `/etc/wsl.conf` → `[interop]`<br>`appendWindowsPath=false` | 停止把 Windows PATH 拼进来 | 能加速 shell 启动,但**从此 `.exe` 不能直接调**;权衡使用 |

## 8、资源限制（.wslconfig）

`.wslconfig` 在 **Windows 侧** `%UserProfile%\.wslconfig`,**全局作用于所有 WSL2 发行版**(区别于 Linux 侧、单发行版的 `/etc/wsl.conf`);改完一律 `wsl --shutdown` 生效。

| 配置项（`[wsl2]` 段） | 作用 | 备注 / 坑 |
|------|------|-----------|
| `memory=8GB` | 限制 VM 最大内存 | 不设时默认约为物理内存 **50% 与 8GB 取小**(较老版本为 80%) |
| `processors=4` | 限制可用 CPU 核数 | 不设默认给全部逻辑核 |
| `swap=4GB` / `swap=0` | 设置 / 关闭 swap | 默认约为内存的 25%;设 0 关闭 |
| `swapFile=D:\\wsl\\swap.vhdx` | swap 文件位置 | 反斜杠要**双写**转义 |
| `autoMemoryReclaim=gradual` | 自动归还已缓存内存给 Windows | 值:`gradual`/`dropcache`/`disabled`;缓解 `Vmmem` 常驻占满 |
| `localhostForwarding=true` | localhost 端口转发 | 默认开;NAT 模式下 Windows 访问 WSL 服务靠它 |
| `networkingMode=mirrored` | 镜像网络 | 见第 5 节 |
| `wsl --shutdown` | 让以上改动生效 | ⚠ 必做一步;`exit` 退出 shell 不重建 VM,配置不加载 |

## 9、备份导出与导入

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `wsl --export Ubuntu-24.04 D:\bak\ub.tar` | 导出发行版为 tar | 整机迁移 / 快照;导出前先 `wsl -t <发行版>` 保一致 |
| `wsl --export --vhd Ubuntu-24.04 D:\bak\ub.vhdx` | 导出为 vhdx | 更快;需 WSL 2.0+ |
| `wsl --import Ub-Clone D:\wsl\clone D:\bak\ub.tar --version 2` | 从 tar 导入为新发行版(指定 WSL2) | ⚠ 导入后**默认用户变 root**(tar 不含默认用户);进去用 wsl.conf `[user] default` 改回 |
| `wsl --import-in-place <名> D:\wsl\ub.vhdx` | 原地注册已有 vhdx | WSL 2.0+;不复制、直接挂现成盘 |
| `wsl --manage Ubuntu-24.04 --move D:\wsl\ub` | 把发行版 vhdx 迁到新位置 | WSL 2.0+;**搬离 C 盘**最省事的一条 |
| `wsl --manage Ubuntu-24.04 --set-sparse true` | 开启稀疏磁盘 | 让 vhdx 能回收空洞空间(见下一节) |

## 10、卸载与减面

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `wsl --unregister Ubuntu-24.04` | 注销发行版 | ⚠⚠ **同时删除该发行版全部数据(ext4.vhdx),不可恢复**;动手前务必 `wsl --export` 备份 |
| `wsl --manage <发行版> --set-sparse true` | 让磁盘可自动回收空间 | vhdx **只涨不缩**的首选解法 |
| `wsl --shutdown` 后 `diskpart`:`select vdisk file="...ext4.vhdx"` → `attach vdisk readonly` → `compact vdisk` → `detach vdisk` | 手动压缩 vhdx | 必须先 shutdown;删过大文件后回收 C 盘空间 |
| `Optimize-VHD -Path <vhdx> -Mode Full`（PowerShell 管理员） | Hyper-V 方式压缩 | 需启用 Hyper-V 功能;等效 diskpart compact |
| `wsl --uninstall` | 卸载 WSL(Store 版应用) | WSL 2.0+;保留 Windows 可选功能,发行版数据不动 |
| `dism.exe /online /disable-feature /featurename:Microsoft-Windows-Subsystem-Linux`<br>`dism.exe /online /disable-feature /featurename:VirtualMachinePlatform` | 彻底关掉 WSL / 虚拟机平台功能 | 管理员;关完重启;等同"启用或关闭 Windows 功能"里取消勾选 |

> [!WARNING]
> `wsl --unregister` **不是卸载应用,是格式化那个 Linux**——它连 ext4.vhdx 一起删,数据无回收站、无法恢复。想保数据先 `wsl --export`。另外:在"设置→应用"里卸载发行版商店应用,可能**残留 vhdx**,要彻底清仍需 `--unregister`。

## 常见错误速判

| 症状 | 多半是 | 先试这条 |
|------|--------|----------|
| `wsl` 打开秒退 / 报 `0x8007019e` | WSL 或"虚拟机平台"功能没开 | `wsl --install` 或勾选可选功能后重启 |
| `WslRegisterDistribution failed 0x80370102` | BIOS 虚拟化没开 / VM 平台没启 | BIOS 开 VT-x（AMD-V）+ 启用 VirtualMachinePlatform |
| `apt update` 报 `not valid yet` | 时钟漂移（休眠唤醒后） | `sudo hwclock -s`,不行 `wsl --shutdown` 重进 |
| 编译 / `npm install` 慢到离谱 | 项目放在 `/mnt/c`（9P 跨界） | 迁到 `~/`（ext4);见第 4 节 |
| Windows 的 `localhost` 访问不到 WSL 服务 | 服务只绑了内网卡 / 防火墙 | 服务改绑 `0.0.0.0`;或启用 `networkingMode=mirrored` |
| `systemctl` 报 "not been booted with systemd" | 没开 systemd | wsl.conf `[boot] systemd=true` 再 `wsl --shutdown` |
| 改了 `.wslconfig` / `wsl.conf` 没反应 | 没重建 VM | `wsl --shutdown` 后重进,`exit` 不算 |
| 脚本报 `bad interpreter: ^M` | CRLF 行尾 | `dos2unix 脚本` 或编辑器改 LF |
| 内存被吃满、`Vmmem` 居高不下 | Linux 缓存 + 未回收 | `.wslconfig` 设 `memory=` + `autoMemoryReclaim=gradual` |
| C 盘越来越满 | ext4.vhdx 只涨不缩 | `--set-sparse true` 或 diskpart `compact vdisk` |
| `\\wsl$` / `\\wsl.localhost` 打不开 | WSL 没在运行 | 先 `wsl` 起一个会话,再从资源管理器访问 |

## 一页纸口诀

1. 装机三连:`wsl --install` → `wsl -l -v` 验版本 → `wsl --update` 保新。
2. 改配置(`.wslconfig` / `wsl.conf`)不生效?先 `wsl --shutdown`,`exit` 不算数。
3. 项目一定放 `~/`(ext4,快),`/mnt/c` 只做 Windows↔Linux 交换区——跨界 IO 慢十倍。
4. 反向访问:Linux 文件从 Windows 走 `\\wsl.localhost\<发行版>\`,别把仓库塞进 C 盘再从 Linux 编译。
5. 互调靠 PATH:Linux 里直接敲 `explorer.exe .` / `code .` / `clip.exe`;Windows 里 `wsl -- <cmd>`。
6. 网络分两态:NAT(默认,IP 会变、localhost 单向转发)vs mirrored(共享网卡、localhost 双向)。
7. 搬家 = `wsl --export` 存 tar/vhdx,`wsl --import` 落到 D 盘;import 后默认用户变 root,记得改回。
8. `wsl --unregister` 等于格式化那个发行版——先 `export` 再动手。⚠
9. 磁盘只涨不缩:删完大文件用 `--set-sparse true` 或 diskpart `compact vdisk` 回收。
