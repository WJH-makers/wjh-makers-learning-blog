---
title: "Windows CMD 速查 · 从导航到系统维护的全周期"
date: 2026-07-26
summary: "按「进目录 → 动文件 → 管磁盘 → 查网络 → 控进程 → 改注册表 → 修系统 → 写批处理」的全生命周期重排 cmd.exe 常用命令，逐条标注坑位、破坏性后果与 PowerShell 取舍边界，基线为 Windows 11 24H2 自带 cmd。"
tags: [命令速查, Windows, CMD]
---


# Windows CMD 速查 · 从导航到系统维护的全周期

> 基线：Windows 11 24H2 自带 cmd.exe（宿主默认为 Windows Terminal）。cmd 已冻结不再加新特性，本文只收仍然真实可用、且在 PowerShell 里不方便替代的部分。

## 快速导航

| 阶段 | 一句话 |
|------|--------|
| 0、CMD 还是 PowerShell | 先判断这活儿到底该不该用 cmd |
| 1、导航与路径 | 换盘、进目录、找可执行文件 |
| 2、文件与目录操作 | 复制、删除、比对、权限、编码 |
| 3、磁盘与分区 | 看容量、查卷、分区与格式化 |
| 4、网络诊断 | 连通性、DNS、端口、防火墙 |
| 5、进程与服务 | 查 PID、杀进程、控服务、计划任务 |
| 6、注册表 | 查改导入导出与 32/64 位视图 |
| 7、系统维护与修复 | sfc / DISM / chkdsk 及诊断报告 |
| 8、批处理速成 | 变量、循环、返回码、双击场景 |
| 常见错误速判 | 报错 → 病因 → 第一条命令 |
| 一页纸口诀 | 记住这 9 条就够日常用 |

## 0、CMD 还是 PowerShell

| 场景 | 选谁 | 原因 / 坑 |
|------|------|-----------|
| 双击 `.bat`、右键菜单、注册表 `Run` 键 | **CMD** | `.ps1` 双击默认是「编辑」而非执行，还要过执行策略；bat 是唯一开箱即点的脚本格式 |
| `vcvarsall.bat`、`setvars.bat`、各类 SDK 环境脚本 | **CMD** | 这类脚本靠 `set` 改**当前进程**环境变量；在 PowerShell 里调用 bat，变量随子进程一起消失 |
| Maven/Gradle 的 `mvnw.cmd` / `gradlew.bat` | **CMD** | 官方 wrapper 就是 cmd 脚本，路径含空格时行为最稳 |
| `diskpart` `netsh` `reg` `sc` 等原生 exe | 两者皆可 | PS 里参数含 `=` `:` 容易被解析器吃掉，PowerShell 7 可用 `--%` 停止解析；cmd 里直接原样传 |
| 文本过滤、JSON、对象管道、远程管理 | **PowerShell** | cmd 只有 `findstr`，没有结构化数据能力 |
| CI 容器、精简镜像、恢复环境（WinRE） | **CMD** | 体积小、必定存在；WinRE 命令行就是 cmd |
| 提权 | 24H2 起两者都有 `sudo` | 需在「设置 → 系统 → 开发者选项」中启用 Sudo；未启用时仍需右键「以管理员身份运行」 |

## 1、导航与路径

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `cd /d D:\proj` | 切盘并切目录 | ⚠ 最高频误用：不带 `/d` 时 `cd D:\proj` 只是**记住 D 盘的当前目录**，人还留在 C 盘 |
| `D:` | 单纯切盘符 | 切过去会落在该盘「上次所在目录」，不是根目录 |
| `cd` | 打印当前目录 | 和 Linux 不同：不带参数**不会**回家目录；也没有 `cd -` |
| `cd ..` / `cd \` | 上级 / 本盘根 | 路径含空格必须整体加引号：`cd /d "C:\Program Files"` |
| `pushd \\srv\share` | 压栈并进入 | 对 UNC 路径会**自动映射一个临时盘符**，`popd` 才会释放；忘了 popd 会攒一堆幽灵盘符 |
| `dir /a /o-d /t:w` | 列目录（含隐藏、按修改时间倒序） | `/b` 只出裸文件名（适合喂给 for），`/s` 递归，`/a:d` 只看目录 |
| `tree /f /a` | 树状列出含文件 | `/a` 用 ASCII 线条，重定向到文件时不会乱码 |
| `where java` | 找命令的真实路径 | 相当于 `which`，但会先搜当前目录；`where /r C:\ *.jar` 可全盘找 |
| `echo %PATH%` / `path` | 看搜索路径 | 当前窗口的快照；在别处改了环境变量，本窗口不刷新，得重开 |
| `subst X: D:\very\long\path` | 把目录映射成盘符 | 绕开 260 字符 MAX_PATH 的土办法；`subst X: /d` 解除；重启即失效 |

## 2、文件与目录操作

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `copy a.txt b.txt` | 复制单个文件 | 只管文件，不支持目录树；拷目录别用它，用 robocopy（`xcopy` 也已被取代） |
| `robocopy src dst /e /r:1 /w:1` | 目录同步（首选） | ⚠ 默认 `/r:1000000 /w:30`，遇到锁定文件会「假死」几十天，务必手动压低重试；**返回码 < 8 都是成功**，CI 里写 `if %errorlevel% geq 8` 才对 |
| `robocopy src dst /mir` | 镜像同步 | ⚠ 破坏性：目标里源没有的文件**会被删除**。先用 `/l`（只列不做）空跑一遍 |
| `move a b` / `ren a b` | 移动 / 重命名 | `ren` 的新名字**不能带路径**，跨目录只能用 `move` |
| `md a\b\c` | 建多级目录 | cmd 默认开启命令扩展，天然递归，无需 `-p` |
| `del /f /s /q *.log` | 递归删文件 | ⚠ 破坏性：**不进回收站，不可撤销**；且 `/s` 只删文件、留下空目录。安全替代：先 `dir /s /b *.log` 把命令原样改成 dir 跑一遍确认清单 |
| `rd /s /q dir` | 删整棵目录树 | ⚠ 破坏性：同样绕过回收站。删前 `dir dir /s /b \| find /c /v ""` 数一下文件量 |
| `type nul > a.txt` | 创建空文件 | cmd 版 `touch`；`type` 看大文件请配 `\| more` 分页 |
| `fc /n a.txt b.txt` | 文本比对 | `/b` 走二进制比对；中文文本比对建议先统一编码，否则全行标红 |
| `findstr /s /i /n /c:"NullPointer" *.log` | 递归搜文本 | `/c:` 才是「整串当字面量」，不加时空格会被当成多个搜索词；不支持 `\d` 这类 PCRE，只有有限正则 |
| `attrib -h -s file` | 去隐藏/系统属性 | 隐藏文件用 `dir` 看不见，先 `dir /a` 再 attrib |
| `mklink /d link target` | 建目录符号链接 | 需管理员（或开启开发者模式）；`/j` 建 junction 不需提权但仅限本机固定盘 |
| `takeown /f dir /r /d y` + `icacls dir /grant %USERNAME%:F /t` | 夺取所有权并授权 | ⚠ 对系统目录批量执行会破坏默认 ACL 且难以还原，只对自己的数据目录用 |
| `certutil -hashfile pkg.zip SHA256` | 算哈希 | 校验下载包最省事的内置办法，无需装工具 |
| `tar -xf pkg.zip -C dst` / `curl -L -o f url` | 解压 / 下载 | Windows 10 1803 起内置 bsdtar 与 curl.exe；在 cmd 里 `curl` 就是真 curl（Windows PowerShell 5.1 里它是别名，行为不同） |
| `chcp 65001` | 切到 UTF-8 代码页 | 简体中文默认 936(GBK)，`type` 一个 UTF-8 文件就是乱码；改代码页只影响当前窗口 |

## 3、磁盘与分区

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `fsutil fsinfo drives` | 列出所有卷 | 比 `wmic` 稳；⚠ 24H2 起 WMIC 已是可按需卸载的功能（FoD）且官方标记弃用，新脚本别再依赖 |
| `fsutil volume diskfree C:` | 看剩余/总容量 | 输出是字节数，脚本里好解析；人眼看容量用 `dir C:\` 末行也行 |
| `vol C:` / `label D: DATA` | 看/改卷标 | `label` 改卷标不动数据，但改盘符要走 diskpart 或磁盘管理 |
| `chkdsk C: /scan` | **在线**扫描 NTFS | 免重启、不锁盘，日常自查首选（Win8+ 起支持） |
| `chkdsk D: /f` | 修复文件系统错误 | 需独占卷；⚠ 目标是系统盘时会提示「下次启动时检查」，重启后不可中断 |
| `chkdsk D: /r` | 扫描坏道并抢救数据 | 隐含 `/f`，大容量机械盘可能跑数小时；SSD 上意义不大，别乱用 |
| `defrag C: /A` → `/O` | 分析 → 优化 | `/O` 会自动判断介质：HDD 做碎片整理，SSD 只发 TRIM，不会伤盘 |
| `manage-bde -status` | 看 BitLocker 加密状态 | 换主板/清 TPM 前必须先确认已备份恢复密钥，否则数据永久锁死 |
| `mountvol` | 列卷 GUID / 挂载点 | 处理「没有盘符的卷」时唯一的 cmd 途径 |
| `compact /c /s:D:\logs` | 目录级 NTFS 压缩 | 对文本日志压缩比高；已压缩的媒体文件无收益反而费 CPU |
| `cipher /w:C:\` | 擦除空闲空间 | 不删现有文件，但会长时间满负荷写盘，笔记本别插着电池跑 |
| `format D: /fs:NTFS /q /v:DATA` | 格式化卷 | ⚠ 破坏性：整卷数据清零。执行前用 `vol D:` + `dir D:` 二次确认盘符，Windows 重装后盘符经常漂移 |
| `diskpart` | 交互式分区工具 | ⚠ 破坏性：内部 `clean` 会抹掉整块**物理磁盘**的分区表。标准姿势：`list disk` → `select disk N` → **再 `detail disk` 复核型号容量** → 才动手；选错 disk 号是最常见的数据事故 |

## 4、网络诊断

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `ipconfig /all` | 完整网络配置 | 看 DNS、MAC、DHCP 租约；只要 IP 用 `ipconfig` 即可 |
| `ipconfig /flushdns` | 清 DNS 缓存 | 改了 hosts 或切了 DNS 不生效时的第一条；`/displaydns` 可先看缓存里到底解析成了什么 |
| `ipconfig /release` + `/renew` | 重新取 DHCP | ⚠ 远程 RDP 会话里执行 `/release` 会当场断线，只能本地做 |
| `ping -n 4 host` / `ping -t host` | 连通性 / 持续探测 | Windows 默认发 4 包就停（不是 Linux 的无限）；`-t` 用 Ctrl+C 停，Ctrl+Break 可中途出统计 |
| `tracert -d host` | 路由跟踪 | `-d` 不反解域名，快很多；中间跳 `*` 常是对方禁 ICMP，未必是故障 |
| `pathping host` | 路由 + 丢包率 | 默认要跑 5 分钟左右，判断「哪一跳在丢包」比 tracert 准 |
| `nslookup -type=A host 8.8.8.8` | 指定 DNS 查解析 | 对比「本地 DNS vs 公共 DNS」结果，能快速判定是不是被劫持/污染 |
| `netstat -ano \| findstr :8080` | 查端口占用 | PID 是 **TCP 行**的第 5 列；⚠ UDP 行没有 State 列，PID 落在第 4 列，`findstr` 同时命中 UDP 时别数错；`-b` 能显示进程名但要管理员且极慢 |
| `netstat -an \| findstr LISTENING` | 列所有监听端口 | 中文系统输出仍是英文状态词，findstr 匹配 `LISTENING` 安全 |
| `route print -4` | 看路由表 | 排查 VPN 抢走默认路由（0.0.0.0 那行 metric 最小的生效） |
| `arp -a` | 看 ARP 表 | 局域网 IP 冲突、发现同网段设备时用；`arp -d *` 清表需管理员 |
| `getmac /v` | 网卡 MAC 与连接名 | 比在 ipconfig 里翻找快 |
| `netsh wlan show profile name="SSID" key=clear` | 查已保存的 Wi-Fi 密码 | 需管理员；密码在「关键内容」一行 |
| `netsh advfirewall firewall add rule name="dev8080" dir=in action=allow protocol=TCP localport=8080` | 放行入站端口 | 需管理员；删除用 `... delete rule name="dev8080"`。⚠ 别用 `netsh advfirewall set allprofiles state off` 图省事关防火墙 |
| `netsh int ip reset` / `netsh winsock reset` | 重置协议栈 / Winsock | ⚠ 会清掉静态 IP、代理、LSP 配置且**必须重启**；属于「全都试过了」才用的最后一招 |
| `curl -I https://example.com` | 看 HTTP 响应头 | cmd 无内置 telnet（默认未安装），测 TCP 通不通用 curl 或 PowerShell 的 `Test-NetConnection` |

## 5、进程与服务

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `tasklist /fi "IMAGENAME eq java.exe" /v` | 按条件列进程 | 过滤器整体要加引号，`eq` 前后必须有空格 |
| `tasklist /svc` | 进程 ↔ 服务对应 | 定位「哪个 svchost 承载了目标服务」的标准手段 |
| `taskkill /f /pid 1234` | 强杀指定 PID | ⚠ `/f` 跳过一切保存逻辑；先不带 `/f` 试优雅关闭（相当于发关闭消息） |
| `taskkill /f /t /im node.exe` | 按名连子进程一起杀 | `/t` 杀整棵进程树，对 node/java 派生的子进程很关键；不带 `/t` 常留孤儿进程占着端口 |
| `sc query` / `sc queryex 服务名` | 查服务状态 / 含 PID | `queryex` 给出 PID，能和 tasklist 对上；服务名不是显示名，用 `sc query \| findstr /i 关键字` 找 |
| `net start` / `net stop 服务名` | 启停服务 | 需管理员；`net start` 不带参数就是列出正在运行的服务 |
| `sc config 服务名 start= auto` | 改启动类型 | ⚠ 语法陷阱：`=` **后面必须有一个空格**，`start=auto` 会直接报语法错误 |
| `sc delete 服务名` | 删除服务注册 | ⚠ 破坏性且不可撤销，删错系统服务只能靠还原点。先 `sc qc 服务名` 把配置抄下来 |
| `start "" "C:\app\x.exe" -p 8080` | 新窗口启动程序 | ⚠ 第一个引号参数会被当成**窗口标题**，所以路径前要补一个空标题 `""`；`/b` 不开新窗口，`/wait` 等它结束 |
| `shutdown /r /t 0` | 立即重启 | `/s` 关机、`/a` 取消已计划的关机、`/f` 强制关掉未保存的程序（⚠ 会丢数据） |
| `schtasks /query /tn "任务名" /v /fo list` | 看计划任务详情 | 排查「谁在半夜跑脚本」；`/create /sc daily /st 03:00 /tn X /tr "C:\x.bat"` 建任务 |
| `quser` | 看本机登录会话 | 多用户/远程桌面机器上定位「谁占着会话」；`logoff <ID>` 踢人需管理员 |
| `powershell -NoProfile -Command "Get-Process \| Sort CPU -Desc \| Select -First 5"` | 从 cmd 借用 PS | 遇到 cmd 表达不了的过滤逻辑，这是最省事的逃生口；`-NoProfile` 避免加载用户配置拖慢 |

## 6、注册表

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion" /v DisplayVersion` | 读单个值 | 这条就能确认系统是不是 24H2；键路径含空格必须加引号 |
| `reg query HKLM\SOFTWARE /s /f "关键字"` | 递归搜索 | `/f` 需配 `/s`；默认搜「值数据」，搜键名加 `/k`、搜值名加 `/v` |
| `reg export HKCU\Software\X backup.reg` | 导出备份 | ⚠ **改注册表前的必做动作**；`reg import backup.reg` 回滚 |
| `reg add HKCU\Environment /v FOO /t REG_SZ /d bar /f` | 写值 | `/f` 是「不提示直接覆盖」；写 HKLM 需管理员窗口 |
| `reg delete "HKCU\Software\X" /f` | 删键或值 | ⚠ 破坏性：`/f` 无确认、无回收站、不可撤销。安全替代：先 `reg export` 同一路径，再删 |
| `reg query <键> /reg:64` / `/reg:32` | 指定注册表视图 | 32 位进程读 HKLM\Software 会被重定向到 `WOW6432Node`；「明明装了却查不到」十有八九是视图选错 |
| `reg load HKLM\TmpHive C:\Users\x\NTUSER.DAT` | 挂载离线用户配置单元 | 需管理员；用完必须 `reg unload HKLM\TmpHive`，否则该用户无法正常登录 |
| `setx FOO bar` | 持久化用户环境变量 | ⚠ 两个坑：**对当前窗口不生效**（要重开）；且 `setx PATH "%PATH%;新目录"` 会把「用户+系统」合并后的 PATH 写进用户 PATH，**超过 1024 字符直接截断**——改 PATH 请用系统属性 GUI 或 PowerShell 的 `[Environment]::SetEnvironmentVariable` |
| `regedit /e out.reg "HKLM\SOFTWARE\X"` | 图形工具的导出模式 | 与 `reg export` 等价，区别是默认 UTF-16 编码，脚本解析要注意 |

## 7、系统维护与修复

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `DISM /Online /Cleanup-Image /ScanHealth` | 扫描组件存储是否损坏 | 只读检测，约几分钟；`/CheckHealth` 更快但只读标记位，不做实扫 |
| `DISM /Online /Cleanup-Image /RestoreHealth` | 修复组件存储 | 需管理员 + 联网（走 Windows Update 拉源）；日志在 `%windir%\Logs\DISM\dism.log` |
| `DISM /Online /Cleanup-Image /RestoreHealth /Source:wim:D:\sources\install.wim:1 /LimitAccess` | 用 ISO 离线源修复 | 断网或 WU 被策略拦时用；`/LimitAccess` 表示不再回落到 Windows Update |
| `sfc /scannow` | 校验并修复系统文件 | ⚠ **顺序很关键**：sfc 的修复源就是组件存储，组件存储坏了 sfc 必然报「无法修复」——先 DISM 后 sfc。日志 `%windir%\Logs\CBS\CBS.log` |
| `sfc /verifyonly` | 只检测不修改 | 想先评估影响面时用；`/scanfile=<完整路径>` 可只查单个文件 |
| `chkdsk C: /scan` | 在线扫描磁盘 | 三件套里最后做：sfc/DISM 管系统文件，chkdsk 管文件系统元数据，别一上来就 `/r` |
| `DISM /Online /Cleanup-Image /StartComponentCleanup` | 清理旧组件释放空间 | 安全；加 `/ResetBase` 能多省几 GB，但 ⚠ **之后无法卸载任何已安装的更新**，不可逆 |
| `systeminfo` | 系统全貌 | 含开机时间、补丁列表、物理内存；⚠ 中文系统输出是中文字段名，脚本里 `findstr` 别硬编码英文 |
| `ver` / `whoami /groups` | 版本号 / 当前身份与组 | `whoami /groups` 里看 `Mandatory Label\High` 才说明这个窗口真的提了权 |
| `driverquery /v` | 列出已安装驱动 | 蓝屏排查时和 minidump 里的模块名对照 |
| `powercfg /batteryreport /output C:\br.html` | 生成电池健康报告 | 对比「设计容量 vs 完全充电容量」判断电池衰减 |
| `powercfg /energy` | 60 秒能耗与驱动问题诊断 | 需管理员，输出 HTML 报告；`/requests` 查「谁在阻止睡眠」，`/lastwake` 查上次被谁唤醒 |
| `wevtutil qe System /c:20 /rd:true /f:text` | 命令行读事件日志 | `/rd:true` 表示从最新往回读；比开图形事件查看器快得多 |
| `cleanmgr /sageset:1` | 配置磁盘清理项 | 配完用 `/sagerun:1` 静默执行，可放进计划任务 |
| `mdsched` | 内存诊断 | ⚠ 会安排重启并在启动前跑测试，跑起来无法中断，别在有未保存工作时点 |
| `bcdedit` | 查看/修改启动配置 | ⚠ 改错直接进不去系统。只读用 `bcdedit /enum`；改之前 `bcdedit /export C:\bcd.bak` |

## 8、批处理速成

| 写法 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `@echo off` + `chcp 65001 >nul` | 关回显 + 切 UTF-8 | ⚠ .bat 若存成「UTF-8 **带 BOM**」，首行会变成 `锘?echo off` 直接报错；要么存 ANSI(GBK)，要么存**无 BOM** UTF-8 |
| `cd /d "%~dp0"` | 切到脚本所在目录 | ⚠ 双击运行时工作目录未必是脚本目录（从资源管理器/计划任务启动尤其如此），几乎每个 bat 第一行都该有这句。`%~dp0` 自带结尾反斜杠 |
| `set "NAME=value"` | 赋值 | 引号包住整个 `键=值`，避免把行尾空格也吃进变量；`set /a n=1+2` 只做 32 位整数运算 |
| `set /p ANS=继续?(y/n) ` | 交互输入 | CI 里会卡死；无人值守脚本禁止出现它和 `pause` |
| `%1 %2 %*` / `shift` | 位置参数 | `%*` 是全部参数原样；`%~1` 去掉外层引号，`%~f1` 转绝对路径 |
| `if "%1"=="" ( ... )` | 判空 | 两边都加引号，否则参数为空时语法直接崩 |
| `if errorlevel 1 exit /b 1` | 判返回码 | ⚠ `if errorlevel 1` 的语义是「**大于等于** 1」；要精确判等用 `if %errorlevel% equ 1` |
| `for %%i in (*.log) do echo %%i` | 遍历文件 | ⚠ 脚本里是 `%%i`，命令行里是 `%i`，两者不通用——最经典的复制粘贴翻车点 |
| `for /f "tokens=2 delims=:" %%a in ('ipconfig ^\| findstr /c:"IPv4"') do ...` | 解析命令输出 | ⚠ 单引号里的管道必须写成 `^\|` 转义；读文件用 `for /f "usebackq" %%a in ("有空格的路径.txt")` |
| `setlocal enabledelayedexpansion` + `!var!` | 延迟展开 | ⚠ 没开它的话，`for`/`if` 块里的 `%var%` 在进入块之前就被一次性替换死了，循环里永远是旧值 |
| `call :sub 参数` / `goto :eof` | 调用子过程 | 定义 `:sub ... goto :eof`；`call` 另一个 bat 才能返回，直接写文件名会一去不回 |
| `exit /b 1` | 退出脚本并返回码 | ⚠ 不带 `/b` 的 `exit` 会连整个 cmd 窗口一起关掉 |
| `命令 >nul 2>&1` | 丢弃全部输出 | `2>&1` 必须放在 `>nul` **之后**，顺序反了 stderr 仍会打屏 |
| `a && b`、`a \|\| b`、`a & b` | 成功才执行 / 失败才执行 / 无条件顺序 | 拼装重试与兜底逻辑的最短写法 |
| `timeout /t 5 /nobreak` | 延时 | ⚠ 输入被重定向时会报 `ERROR: Input redirection is not supported`；无窗口场景改用 `ping -n 6 127.0.0.1 >nul` |

## 常见错误速判

| 症状 | 多半是 | 先试这条 |
|------|--------|----------|
| `'xxx' 不是内部或外部命令` | PATH 里没有，或装完没重开窗口 | `where xxx`，查不到就补 PATH 并**重开 cmd** |
| `拒绝访问` / `Access is denied` | 窗口没提权，或文件被占用 | `whoami /groups` 看是否 High；再用资源监视器查占用句柄 |
| `cd` 之后盘符没变 | 少写 `/d` | `cd /d D:\proj` |
| 中文全是问号或方块 | 代码页与文件编码不一致 | `chcp 65001`，或把文件另存为 GBK |
| 端口被占启动失败 | 上次进程没退干净 | `netstat -ano \| findstr :8080` → `taskkill /f /t /pid <PID>` |
| 双击 bat 一闪而过 | 脚本报错后窗口即关 | 末尾加 `pause`，或在已开的 cmd 里跑一遍看输出 |
| 循环里变量一直是旧值 | 没开延迟展开 | `setlocal enabledelayedexpansion` + 把 `%v%` 改成 `!v!` |
| `sfc` 报「无法修复其中一些文件」 | 组件存储自身损坏 | 先 `DISM /Online /Cleanup-Image /RestoreHealth`，再跑 `sfc /scannow` |
| ping 得通但网页打不开 | DNS 解析或代理 | `ipconfig /flushdns` + `nslookup 域名 8.8.8.8` |
| robocopy 长时间不动 | 撞上锁定文件，默认重试百万次 | 中断后加 `/r:1 /w:1` 重跑 |
| `sc config` 报语法错误 | `=` 后面漏了空格 | 写成 `start= auto` |
| `setx` 之后 PATH 变短甚至丢失 | 超 1024 字符被截断 | 立刻用系统属性 GUI 或还原点恢复，之后别再用 setx 改 PATH |
| 路径太长报错 | MAX_PATH 260 限制 | 用 `robocopy`（原生支持长路径）或 `subst` 映射一个短盘符 |

## 一页纸口诀

1. 换盘一定用 `cd /d`；不带 `/d` 的 `cd` 只是在别的盘上「记了个位置」。
2. `del /s`、`rd /s`、`format`、`diskpart clean` 都**不进回收站**——回车前先把同一条命令改成 `dir` 或 `/l` 空跑一遍。
3. 拷目录用 robocopy，不用 copy；但 `/mir` 会删目标端多余文件，返回码 < 8 才算成功。
4. 修复顺序固定：DISM 补组件存储 → sfc 修系统文件 → chkdsk 管文件系统，反过来做等于白跑。
5. 端口三步走：`netstat -ano` 找 PID → `tasklist /fi` 确认是谁 → `taskkill /f /t /pid`。
6. 动注册表前先 `reg export`，动启动项前先 `bcdedit /export`，动分区前先 `detail disk` 复核。
7. 批处理里 `%%i`、命令行里 `%i`；块内要读新值必须 `setlocal enabledelayedexpansion` 配 `!var!`。
8. 老 .bat、SDK 环境脚本、双击场景留给 cmd；文本处理、对象过滤、远程管理交给 PowerShell。
9. 报「拒绝访问」时，九成是窗口没提权而不是命令写错——先看 `whoami /groups`。
