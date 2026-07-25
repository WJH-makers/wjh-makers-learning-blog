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
| ★ | `cd` | 切换目录 | `cd /var/log` `cd -` |
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
| ★ | `df -h` / `du -sh` / `free -h` | 盘/目录/内存 | `df -h` · `du -sh /var/log` · `free -h` |
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
| ★★★ | `xargs` | 批参数 | `find ... \| xargs rm` |

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

### Linux · 性能排障工具箱（A，与第 21 章联动）

| 工具 | 看什么 |
|------|--------|
| `vmstat 1` | r/b、si/so、wa |
| `iostat -x 1` | %util / await |
| `pidstat -t -p PID 1` | 线程 CPU |
| `mpstat -P ALL 1` | 各核 |
| `sar` | 历史（sysstat） |
| `ss -tn` | 连接（替 netstat） |
| USE 方法 | Utilization / Saturation / Errors |

---

# 二、Windows 命令（难度 × 频次）

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

