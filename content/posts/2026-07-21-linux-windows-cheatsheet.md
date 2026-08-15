---
title: "Linux & Windows 常用命令速查"
date: 2026-07-21
summary: "Linux 高频命令按 S~D 频次排序 + Windows CMD/WSL 对照速查表"
tags: [Linux, Windows, 命令速查]
---


# Linux & Windows 常用命令速查

> 从[全栈指令速查大全](/posts/2026-07-15-command-reference-cheatsheet)拆分。

## Linux · S 极高频

| 难度 | 命令 | 作用 | 示例 |
|:----:|------|------|------|
| ★ | `ls` | 列目录 | `ls -lah` |
| ★ | `cd` | 切换目录 | `cd /coffee-lab/var/log` `cd -` |
| ★ | `pwd` | 当前路径 | `pwd` |
| ★ | `mkdir` | 建目录 | `mkdir -p a/b` |
| ★ | `rm` | 删除 | `rm -rf dir`（慎用） |
| ★ | `cp` | 复制 | `cp -r src dst` |
| ★ | `mv` | 移动/重命名 | `mv a b` |
| ★ | `touch` | 建空文件 | `touch a.txt` |
| ★ | `cat` | 看全文 | `cat f` |
| ★ | `echo` | 输出 | `echo $PATH` |
| ★★ | `grep` | 搜文本 | `grep -rn "ERR" .` |
| ★★ | `tail` | 看末尾/跟日志 | `tail -f app.log` |
| ★★ | `head` | 看开头 | `head -n 20 f` |
| ★★ | `less` | 分页 | `less f` |
| ★★ | `ssh` | 远程登录 | `ssh user@host` |
| ★★ | `chmod` | 改权限 | `chmod 755 s.sh` |
| ★★ | `ps` | 进程快照 | `ps aux` / `ps -ef` |
| ★★★ | `find` | 找文件 | `find . -name "*.log"` |
| ★★★ | `kill` | 杀进程 | `kill PID` 再 `kill -9` |
| ★★★ | `ss`/`curl` | 端口/HTTP | `ss -tlnp` `curl -I url` |

**口诀**：列切路、建删复移、看搜跟、权进杀。

## Linux · A 高频

| 难度 | 命令 | 作用 | 示例 |
|:----:|------|------|------|
| ★ | `df -h` / `du -sh` / `free -h` | 盘/目录/内存 | `df -h` · `du -sh /coffee-lab/var/log` · `free -h` |
| ★ | `uname -a` / `uptime` | 系统/负载 | `uname -a` · `uptime` |
| ★★ | `chown` / `chgrp` | 属主/组 | `chown -R u:g /app` |
| ★★ | `tar` | 打包 | `tar -zcvf a.tgz dir/` · `tar -zxvf a.tgz` |
| ★★ | `scp` / `rsync` | 传文件 | `scp f u@h:/p` |
| ★★ | `wget` | 下载 | `wget url` |
| ★★ | `apt`/`yum`/`dnf` | 装包 | `apt update && apt install nginx` |
| ★★ | `sudo` / `su` | 提权 | `sudo -i` |
| ★★★ | `sed` / `awk` | 流处理 | `sed -i 's/a/b/g' f` |
| ★★★ | `sort`/`uniq`/`wc`/`cut` | 管道统计 | `... \| sort \| uniq -c` |
| ★★★ | `systemctl` / `journalctl` | 服务/日志 | `systemctl status nginx` |
| ★★★ | `ip` / `ping` / `dig` | 网络 | `ip a` |
| ★★★ | `ln -s` | 软链 | `ln -s target link` |
| ★★★ | `export` / `which` / `history` | 环境 | `export JAVA_HOME=...` |
| ★★★ | `crontab` | 定时 | `crontab -e` |
| ★★★ | `xargs` | 批参数 | `find . -name '*.log' -print0 \| xargs -0 rm`。⚠ 别写 `find ... \| xargs rm`:默认按空白切分,文件名里有空格就会被拆成两个参数删错东西。要么 `-print0` 配 `xargs -0`,要么直接 `find ... -delete` |

**权限数字（必背）**：`755` 目录/脚本 · `644` 普通文件 · `600` 私钥 · `700` 私密目录  
**kill**：先 `SIGTERM(15)` 优雅，不行再 `-9 SIGKILL`

## Linux · B 中频（排查/部署）

| 难度 | 命令/组合 | 场景 |
|------|-----------|------|
| ★★★ | `top` / `htop` / `top -Hp PID` | 实时资源、线程 |
| ★★★ | `jps -l` `jstack` `jmap` `jstat` / `jcmd` | Java 诊断 |
| ★★★★ | CPU 飙高：`top -Hp` → `printf %x` → `jstack \| grep nid=` | 定位到代码行 |
| ★★★ | `nohup java -jar app.jar > app.log 2>&1 &` | 后台部署 |
| ★★★ | `grep -A 20 Exception app.log` | 看堆栈 |
| ★★★★ | `vmstat` `lscpu` `lsblk` | 深挖硬件 |
| ★★★★ | `useradd` `passwd` `userdel` | 用户管理 |
| ★★★★ | `zip`/`unzip` `gzip` | 其它压缩 |

## Linux · C/D 低频

| 难度 | 命令 | 说明 |
|------|------|------|
| ★★ | `locate`/`updatedb`/`tree` | 快速找名/树状 |
| ★★★ | `netstat`（旧） | 优先用 `ss` |
| ★★★ | `ifconfig`（旧） | 优先用 `ip` |
| ★★★ | `telnet`/`traceroute` | 连通性 |
| ★★★★ | SUID/SGID/Sticky | 特殊权限位 |
| ★★★★ | `man` 深读 | 文档 |

---

### Linux · 性能排障工具箱

| 工具 | 看什么 |
|------|--------|
| `vmstat 1` | r/b、si/so、wa |
| `iostat -x 1` | %util / await |
| `pidstat -t -p PID 1` | 线程 CPU |
| `mpstat -P ALL 1` | 各核 |
| `sar` | 历史（sysstat） |
| `ss -tn` | 连接（替 netstat） |
| USE 方法 | Utilization / Saturation / Errors |

#### top / htop —— 实时资源全景

| 命令 / 交互键 | 作用 | 备注 / 坑 |
|------|------|------|
| `top` | 实时进程表 | `%CPU` 可 >100%：多核累加，`400%` = 4 核占满，别当异常 |
| `top -o %MEM` | 按内存排序启动 | 交互态按 `M`（内存）/`P`（CPU）/`T`（时间）也能切排序 |
| `top -Hp PID` | 展开某进程的线程 | 定位 Java/Go CPU 飙高的线程，再 `printf %x` 转十六进制查 nid |
| top 内按 `1` | 逐核显示 | 单核 100% 而总体不高 = 单线程瓶颈，扩容核数没用 |
| top 内按 `c` | 显示完整命令行 | 默认只显示进程名，排查多实例时必开 |
| top 内按 `V` / `H` | 树状 / 线程模式 | `H` 把每个线程当一行 |
| `htop` | 彩色增强版 top | 需 `apt install htop`；`F5` 树、`F6` 排序、`F9` 发信号杀 |
| load average | 1/5/15 分钟平均运行队列长度 | 超过 CPU 核心数才算过载；含 D 态（等 IO）进程，IO 卡也会拉高 |

> ⚠ `top` 里直接按 `k`/htop 按 `F9` 可杀进程，手滑选错 PID 会误杀关键服务。

#### CPU / 内存 / IO 深挖

| 命令 | 看什么 | 备注 / 坑 |
|------|--------|------|
| `vmstat 1` | 每秒采样 | **第一行是开机以来均值，必须忽略**；`r`>核心数=CPU 排队，`b`=不可中断(等IO)，`si/so`≠0=在换 swap（内存吃紧），`wa`高=IO 瓶颈 |
| `iostat -x 1` | 磁盘扩展指标 | `%util` 近 100% 且 `await` 高 = 磁盘饱和；但 **SSD/NVMe 并行队列会让 %util 失真**，别只看它，配合 `await`/`aqu-sz` 判断。需 `sysstat` |
| `mpstat -P ALL 1` | 各核使用率 | 定位单核热点；`%steal` 高 = 虚拟机被宿主抢 CPU（云主机超卖） |
| `pidstat -t -p PID 1` | 进程/线程级 CPU、IO | `-t` 展开线程，`-d` 看每进程磁盘读写 |
| `free -h` | 内存 | **看 `available` 而非 `free`**；`buff/cache` 可被回收不算真占用；`Swap` 一直在换=内存不足 |
| `dmesg -T \| tail` | 内核环形缓冲 | 排查 OOM killer 杀了谁、磁盘/驱动报错；`-T` 转人类时间 |
| `sar -u 1 3` | 历史 CPU | 需 sysstat 采集服务开着；`sar -r` 内存、`sar -b` IO，可回溯过去几天 |

#### 谁占了端口 / 文件 —— ss 与 lsof

| 命令 | 作用 | 备注 / 坑 |
|------|------|------|
| `ss -tlnp` | 监听中的 TCP + 进程 | 现代替代 `netstat`；`t`=tcp `l`=listen `n`=不解析端口名 `p`=进程（需 root 才显示别人的进程） |
| `ss -tnp state established` | 已建立连接 | 排查连接泄漏/半开连接 |
| `ss -s` | 连接汇总统计 | 一眼看 TIME-WAIT 堆积 |
| `lsof -i:8080` | 谁占了 8080 端口 | 端口冲突时最直接 |
| `lsof -p PID` | 某进程打开的所有文件/socket | 查句柄泄漏（`Too many open files`） |
| `lsof +D /mnt/x` | 谁在占用该目录 | ⚠ 卸载/删目录前先查，否则 `umount: target is busy` |
| `lsof \| grep deleted` | 已删文件但句柄未释放 | **"删了文件磁盘不降"之谜**：进程还持有句柄，重启该进程才真正释放 |

> `netstat` 读 `/proc` 逐条解析，连接量大时明显慢；`ss` 走 netlink 快得多，新系统一律用 `ss`。

---

### Linux · 文本处理三剑客（grep / sed / awk 精要）

#### grep —— 搜

| 命令 | 作用 | 备注 / 坑 |
|------|------|------|
| `grep -rn "ERR" .` | 递归带行号搜 | `-r` 不跟符号链接目录，要跟用 `-R` |
| `grep -i` | 忽略大小写 | 与 `-w`（整词）常组合 |
| `grep -v` | 反向选择（不含） | `ps aux \| grep ssh \| grep -v grep` 排除 grep 自身 |
| `grep -E "a\|b"` | 扩展正则（原 egrep） | 默认是 BRE，`( ) { } + ?` 要反斜杠转义；用 `-E` 免转义 |
| `grep -F "1.2.3"` | 固定字符串不当正则 | 搜含 `.` `*` 的字面量更快更稳（原 fgrep） |
| `grep -o "[0-9]\+"` | 只输出匹配部分 | 提取 IP/数字，不打印整行 |
| `grep -c` / `grep -l` | 计数 / 只列文件名 | `-c` 是"匹配行数"非"匹配次数" |
| `grep -A3 -B3 -C3` | 后/前/前后 N 行上下文 | 看异常堆栈上下文神器 |
| `grep -P "(?<=id=)\d+"` | PCRE（前瞻/后顾） | 需 `--perl-regexp`，部分精简系统未编译进 |

#### sed —— 流编辑

| 命令 | 作用 | 备注 / 坑 |
|------|------|------|
| `sed 's/a/b/'` | 替换每行首个 | 加 `g` 才全行替换：`s/a/b/g` |
| `sed -i 's/a/b/g' f` | 原地修改 | ⚠ 直接写回文件、不可撤销：先不加 `-i` 预览确认 |
| `sed -i.bak 's/a/b/g' f` | 改前留 `.bak` 备份 | 生产改配置务必带备份后缀 |
| `sed -n '10,20p' f` | 只打印 10–20 行 | `-n` 抑制默认输出，配 `p` |
| `sed '2d'` / `sed '/pat/d'` | 删第 2 行 / 删匹配行 | 与 `-i` 组合才落盘 |
| `sed 's#/a/b#/x/y#g'` | 换分隔符为 `#` | 处理含 `/` 的路径，免去满屏 `\/` |
| `sed -E 's/(a)(b)/\2\1/'` | 扩展正则 + 反向引用 | GNU 用 `-E`（`-r` 亦可） |
| `echo x \| sed 's/x/[&]/'` | `&` 代表整个匹配 | 想要字面 `&` 需写 `\&` |

> ⚠ 跨平台坑：GNU sed 直接 `-i`，BSD/macOS 的 `-i` 后必须跟备份后缀参数（`-i ''`），脚本移植时最易翻车。

#### awk —— 列处理与统计

| 命令 | 作用 | 备注 / 坑 |
|------|------|------|
| `awk '{print $1}'` | 打印第 1 列 | 默认按空白分隔且**合并连续空格**，`$0`=整行 |
| `awk -F: '{print $1}'` | 指定分隔符 | `-F'[:,]'` 可用正则多分隔符 |
| `awk '{print $NF}'` | 打印最后一列 | `$(NF-1)` 倒数第二；`NF`=字段数 |
| `awk 'NR==1'` / `awk 'NR%2==0'` | 第 1 行 / 偶数行 | `NR`=行号，等价 `head -1` 但更灵活 |
| `awk '$3>100'` | 条件过滤 | 数值比较无需引号；文本用 `$1=="x"` |
| `awk '{s+=$1} END{print s}'` | 求和 | `END` 块在读完后执行；`BEGIN` 在读之前 |
| `awk '{a[$1]++} END{for(k in a)print a[k],k}'` | 分组计数 | `sort \| uniq -c` 的增强版，还能顺带算和/均值 |
| `ps aux \| awk '{print $2}'` | 取 PID 列 | 与 `xargs kill` 组合批量处理 |

---

## 二、Windows 命令（难度 × 频次）

## Windows · S 极高频

| 难度 | CMD | 作用 | Linux 对应 |
|------|-----|------|-----------|
| ★ | `dir` | 列目录 | ls |
| ★ | `cd` | 切换 | cd |
| ★ | `md`/`mkdir` | 建目录 | mkdir |
| ★ | `copy` | 复制文件 | cp |
| ★ | `move` | 移动 | mv |
| ★ | `del` | 删文件 | rm |
| ★ | `type` | 看内容 | cat |
| ★ | `cls` | 清屏 | clear |
| ★★ | `xcopy` / `robocopy` | 拷目录 | cp -r |
| ★★ | `tasklist` | 进程 | ps |
| ★★ | `taskkill /PID n /F` | 杀进程 | kill |
| ★★ | `ipconfig` | IP | ip a |
| ★★ | `ping` | 连通 | ping |
| ★★★ | `netstat -ano \| findstr :8080` | 端口占 | ss -tlnp |

**查端口杀进程（Windows）**  
1. `netstat -ano | findstr :8080` → 记 PID  
2. `taskkill /PID <pid> /F`

## Windows · A 高频

| 难度 | 命令 | 作用 |
|------|------|------|
| ★ | `rd /s /q dir` | 删目录树 |
| ★ | `ren` | 重命名 |
| ★ | `hostname` `whoami` `ver` | 身份/版本 |
| ★★ | `systeminfo` | 系统详情 |
| ★★ | `tracert` `nslookup` | 路由/DNS |
| ★★ | `ipconfig /flushdns` | 清 DNS 缓存 |
| ★★ | `findstr` | 类似 grep |
| ★★★ | 批处理：`@echo off` `set` `if` `for` `%1` | 脚本 |

## Windows · B/C

| 难度 | 命令 | 作用 |
|------|------|------|
| ★★★ | `chkdsk` `sfc /scannow` `DISM ... RestoreHealth` | 磁盘/系统修复 |
| ★★★★ | `diskpart` | 分区（危险） |
| ★★ | PowerShell：`Get-Process` `Get-ChildItem` `Select-Object` | 对象管道 |
| ★★★ | `.ps1` 脚本执行策略 | 现代自动化 |

**CMD vs PowerShell**：CMD 传文本；PowerShell 传 .NET 对象（`动词-名词` cmdlet）。
