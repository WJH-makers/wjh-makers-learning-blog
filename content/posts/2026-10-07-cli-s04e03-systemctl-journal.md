---
title: "《从零开始玩命令行》19 · 常驻服务:systemctl 与日志"
date: 2026-10-07
summary: "阿零手动跑起的咖啡站,一断 ssh 就死——SIGHUP 的散伙信了解一下。特米教他写第一个 systemd 单元文件,把服务交给 PID 1 托管:start/enable/daemon-reload 各司其职,journalctl 翻日志破案。两个经典坑:改了 .service 忘了 daemon-reload,以及 ExecStart 路径写错的 203/EXEC。"
tags: [Linux, 命令行, 终端漫画, systemctl, journalctl, 阿零与特米]
---

# 《从零开始玩命令行》19 · 常驻服务:systemctl 与日志

> 连载特刊 · 第二部《从零开始玩命令行》第 4 卷「进程与系统」第 3 话
> 长期项目:**把豆豆咖啡站部署上真实服务器**。前作《从零开始学 Java》全 56 话见 [/java](/java)。

---

## 一、需求:ssh 一断,咖啡站就倒闭

上一话结尾,阿零终于用 `sudo` 把权限捋顺,兴冲冲在服务器上敲 `node /srv/coffee/app.js`,咖啡站跑起来了。他合上笔记本去吃了顿饭,回来一看——**站没了**。进程消失得干干净净,连句遗言都没有。

他没按 Ctrl+C,没 `kill`,只是断开了 ssh。豆豆幽幽补刀:「店员下班它就关门,还得店员盯着屏幕才营业——这不叫部署,叫**人肉挂机**。」

这一话只解决一个问题:**让服务不依赖任何人的终端:自己常驻、挂了自己爬起来、开机自己启动。**

---

## 二、漫画 · 把服务过继给 1 号进程

> **〔1〕** 阿零重新 ssh 上服务器,盯着空空的进程列表,一脸冤枉。
> 阿零:「我明明没按 Ctrl+C!它自己死的?」

> **〔2〕** 特米从光标里钻出来,肚皮 `>_` 打出三个大字母:`SIGHUP`。
> 特米:「你断开 ssh,终端没了,系统给挂在这个终端上的进程群发一封**散伙信**——SIGHUP。你的 node 是前台进程,收信即死。」

> **〔3〕** 阿零掰手指头类比:「Java 线里 Tomcat 就不用人盯着,开机自己就在……」
> 特米:「因为有人替它当**守护者**。Linux 的总守护者叫 systemd——PID 1,全服务器进程的祖宗。把服务过继给它,ssh 断一万次也与它无关。」

> **〔4〕** 特米甩出一张十来行的小纸片,标题 `coffee.service`。
> 特米:「**单元文件**:把'怎么启动、挂了怎么办、跟谁一起开机'写成说明书交给 systemd,它替你盯一辈子。」

> **〔5〕** 阿零 `systemctl start coffee`,断开 ssh 再连上,`curl` 一下——咖啡站还活着!
> 特米(泼冷水):「先别欢呼。重启一下服务器试试?」——重启回来,服务没起。阿零:「?!」

> **〔6〕** 特米肚皮分屏打出两个词:`start` | `enable`。
> 特米:「`start` 只管**这一次**,`enable` 才管**开机自启**,两码事,面试常考。回去 man 一下 systemctl,今晚作业。」

---

## 三、本话目标

- 搞懂**前台进程 vs 守护进程**:为什么 ssh 一断,手动跑的进程会收 SIGHUP 而死;
- 写出极简版单元文件 `coffee.service`:`[Unit]` / `[Service]` / `[Install]` 三段;
- 用熟四板斧 `systemctl start / stop / status / enable`,分清 **enable 和 start 是两件事**;
- 记住改完 `.service` 必须 `systemctl daemon-reload`;
- 用 `journalctl -u coffee -f` / `--since` 翻日志破案,认得 **203/EXEC** 这个退出码。

---

## 四、原理图:两棵进程树,两种命运

```text
手动跑(挂在 ssh 会话上):              systemd 托管(挂在 PID 1 上):

 sshd ── bash ── node app.js            systemd(PID 1)
   │                ↑                       └── node app.js
   └ ssh 断开 → SIGHUP → 死             ssh 断不断,与它无关;
                                        挂了还能按 Restart 策略拉起

单元文件 = 写给 systemd 的说明书(放 /etc/systemd/system/coffee.service):
 [Unit]     这是个啥、排在谁后面启动(Description / After)
 [Service]  怎么跑(ExecStart)、挂了怎么办(Restart)
 [Install]  跟哪一批服务一起开机(WantedBy=multi-user.target)
```

一句话:**手动跑的进程是"你的孩子",你(的终端)一走它就没人管;交给 systemd,它成了 1 号进程的孩子,永远有人管。**

---

## 五、上手:给咖啡站发常驻工牌

先写说明书(要动 `/etc`,得 sudo):

```bash
$ sudo vim /etc/systemd/system/coffee.service
```

```ini
[Unit]
Description=Doudou Coffee Station
After=network.target

[Service]
ExecStart=/usr/bin/node /srv/coffee/app.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

然后交给 systemd:

```bash
$ sudo systemctl daemon-reload        # 新装/改过说明书,先让 systemd 重读一遍
$ sudo systemctl start coffee
$ systemctl status coffee
● coffee.service - Doudou Coffee Station
     Loaded: loaded (/etc/systemd/system/coffee.service; disabled; vendor preset: enabled)
     Active: active (running) since Wed 2026-10-07 12:03:41 UTC; 6s ago
   Main PID: 3182 (node)
     CGroup: /system.slice/coffee.service
             └─3182 /usr/bin/node /srv/coffee/app.js

$ sudo systemctl enable coffee        # 开机自启——注意,这和 start 是两件事
Created symlink /etc/systemd/system/multi-user.target.wants/coffee.service → /etc/systemd/system/coffee.service.
```

日志不再散落在你的终端里,统一进了 journald,按服务名调取:

```bash
$ journalctl -u coffee -f                    # 跟着滚动看(Ctrl+C 退出)
$ journalctl -u coffee --since "10 min ago"  # 只看最近十分钟
$ journalctl -u coffee -n 20 --no-pager      # 最后 20 行,直接打印不进翻页器
```

> **特米旁白**:`status` 里那个 `disabled`,`enable` 之后会变 `enabled`。`Loaded` 行管"开机拉不拉",`Active` 行管"现在活没活",各管一件事。

---

## 六、故意制造一个 Bug:改了说明书,却没告诉 systemd

阿零把项目重构了一下,顺手改 `ExecStart`,手一滑把 node 敲成了 `nodee`:

```ini
ExecStart=/usr/bin/nodee /srv/coffee/app.js
```

然后凭直觉直接重启服务——**没有 daemon-reload**:

```bash
$ sudo systemctl restart coffee
$ systemctl status coffee
```

服务居然还是老样子在跑,改动像没发生过;等他补完手续再重启,服务又「啪」地趴了。一个 Bug,炸出两层。

---

## 七、读懂真实报错

**第一层**,`status` 顶上多了一行警告,改动没生效:

```text
Warning: The unit file, source configuration file or drop-ins of coffee.service
changed on disk. Run 'systemctl daemon-reload' to reload units.
```

根因:systemd 把单元文件**缓存在内存里**,你改的只是磁盘上的文本;不 `daemon-reload`,它继续按旧说明书办事。修法一行:

```bash
$ sudo systemctl daemon-reload && sudo systemctl restart coffee
```

**第二层**,重读之后,错误的路径真正生效,服务直接启动失败:

```text
× coffee.service - Doudou Coffee Station
     Loaded: loaded (/etc/systemd/system/coffee.service; enabled; vendor preset: enabled)
     Active: failed (Result: exit-code) since Wed 2026-10-07 12:31:07 UTC; 4s ago
    Process: 3521 ExecStart=/usr/bin/nodee /srv/coffee/app.js (code=exited, status=203/EXEC)
   Main PID: 3521 (code=exited, status=203/EXEC)
```

```bash
$ journalctl -u coffee -n 5 --no-pager
Oct 07 12:31:07 coffee-server (nodee)[3521]: coffee.service: Failed to locate executable /usr/bin/nodee: No such file or directory
Oct 07 12:31:07 coffee-server (nodee)[3521]: coffee.service: Failed at step EXEC spawning /usr/bin/nodee: No such file or directory
Oct 07 12:31:07 coffee-server systemd[1]: coffee.service: Main process exited, code=exited, status=203/EXEC
Oct 07 12:31:07 coffee-server systemd[1]: coffee.service: Failed with result 'exit-code'.
Oct 07 12:31:08 coffee-server systemd[1]: coffee.service: Start request repeated too quickly.
```

根因:**203/EXEC 是 systemd 的行话,专指"启动第一步就没找到/没法执行 ExecStart 那个文件"**——路径写错、文件不存在、没执行权限,都是它。日志第一行已挑明:`Failed to locate executable /usr/bin/nodee`。修法:`which node` 核实真实路径,改回 `/usr/bin/node`,再走一遍 `daemon-reload` + `restart`。至于最后那行 `Start request repeated too quickly`,是 `Restart=on-failure` 连拉几次都失败后 systemd 熔断了——别跟它较劲,先修根因。

> **🪟 双系统对照 · Windows 的服务世界**

| 干什么 | Linux (bash) | PowerShell 7 / Windows | 关键差异 |
|---|---|---|---|
| 看服务状态 | `systemctl status coffee` | `Get-Service coffee` | PS 返回 **ServiceController 对象**(.Status/.StartType 可继续管道),不是一屏文本 |
| 启动/停止 | `sudo systemctl start/stop coffee` | `Start-Service coffee` / `Stop-Service coffee`(需管理员) | — |
| 开机自启 | `systemctl enable coffee`(建软链接) | `Set-Service coffee -StartupType Automatic` | Linux 靠**软链接进 wants 目录**,Windows 是服务自身的**启动类型属性** |
| 注册新服务 | 写 `.service` 文件 + `daemon-reload` | `New-Service -Name coffee -BinaryPathName ...` | Windows 服务程序得会跟 SCM 对话,普通 exe 要用 WinSW/NSSM 包一层 |
| 看服务日志 | `journalctl -u coffee --since "10 min ago"` | `Get-WinEvent -FilterHashtable @{LogName='Application'}` | journald 吐**文本流**顺管道 grep;Get-WinEvent 吐 **EventLogRecord 对象**按属性筛 |

老话重提:Linux 给你文本自己 grep,PowerShell 给你对象按属性过滤——看日志这件事上,两种哲学差异最直观。

> **🎯 面试直击**:`systemctl enable` 和 `systemctl start` 有什么区别?
> `start` 是**现在立刻启动一次**,不影响开机;`enable` 是**注册开机自启**(本质是在 `/etc/systemd/system/multi-user.target.wants/` 下建一个指向单元文件的软链接),不影响当下。两个都要就 `enable --now`。追问链:`is-enabled` / `is-active` 分别查两种状态;`mask` 是更狠的"焊死",连手动 start 都不许。

---

## 八、用命令验证:常驻 + 自启,两条都要过

```bash
$ systemctl is-active coffee
active
$ systemctl is-enabled coffee
enabled
$ ps -o ppid=,cmd= -p $(pgrep -f 'node /srv/coffee')
      1 /usr/bin/node /srv/coffee/app.js        # 父进程 PID=1,过继成功
$ sudo reboot
# ……重新 ssh 上来
$ systemctl status coffee | head -3              # Active: active (running) since 开机时刻
$ curl -s localhost:3000/menu
{"menu":["拿铁","美式","豆豆特调"]}
```

断 ssh 不死、挂了自己爬、重启机器自己来——三关全过,咖啡站才算真的「常驻」。

---

## 九、项目检查点 · 读懂服务器 v0.3

```text
已具备:前台进程 vs 守护进程(SIGHUP 真相)、coffee.service 三段式单元文件、
        systemctl start/stop/status/enable 四板斧、daemon-reload 手续、
        journalctl -u/-f/--since 破案、认得 203/EXEC 与"repeated too quickly"
还没有:半夜三点的数据库备份还得人肉爬起来敲命令——服务器不会自己定闹钟
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| systemd 单元文件编写 | 「服务部署与运维」类 JD 的标配动作 |
| journalctl 日志排障 | 线上事故的第一现场勘查能力 |
| enable/start 概念清晰 | 高频面试题,一句答准就是信号 |

---

## 十一、下一话悬念

服务稳了,豆豆的新需求跟着就到:「订单数据无价,**每天凌晨三点**备份一次。」阿零看了看手机闹钟,又看了看特米。特米肚皮缓缓打出一行字:「与其你定闹钟,不如**让服务器自己定闹钟**。」

> 下一话《定时任务与环境变量》:`crontab` 五颗星让任务按点自动跑——外加一桩经典悬案:**手动跑得好好的脚本,cron 里就是不跑**。阿零将迎来本卷最惨的一次翻车。

---

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,接下来3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. `systemctl` 是哪个初始化系统的管理命令?
   - A) SysV init　B) Upstart　C) systemd　D) launchd

2. `systemctl start nginx` 和 `systemctl enable nginx` 的区别是什么?
   - A) 完全相同　B) `start`=立即启动服务(本次运行),`enable`=设置开机自启动(下次启动生效),两者独立操作　C) `enable` 是 `start` 的别名　D) `start` 包含 `enable` 的功能

3. `journalctl -u nginx` 的作用是什么?
   - A) 重启 nginx 服务　B) 查看 nginx 服务单元(unit)的所有日志　C) 更新 nginx 单元配置　D) 停止 nginx 服务

4. `systemctl daemon-reload` 什么时候需要执行?
   - A) 每次启动系统时　B) 修改了 systemd 单元文件(`.service`/`.timer` 等)后,让 systemd 重新加载配置　C) 每次安装新软件后　D) 服务崩溃后

5. `systemctl status nginx` 输出中 `Active: active (running)` 和 `Loaded: loaded (/lib/systemd/system/nginx.service; enabled)` 分别表示什么?
   - A) 两者含义相同　B) Active 表示服务当前是否在运行;Loaded+enabled 表示单元文件是否加载且设为开机启动　C) Active 表示开机启动状态,Loaded 表示内存占用　D) Active 表示网络连接,Loaded 表示 CPU 负载

6. `journalctl -f` 的 `-f` 等价于什么功能?
   - A) 强制(force)　B) follow,持续追踪最新日志输出(类似 `tail -f`)　C) 全文搜索(full-text)　D) 过滤(filter)

7. 一条服务单元文件(`.service`)的三要素是什么?
   - A) Name、Path、Owner　B) Description、ExecStart、Type　C) Unit、Service、Install(三段落)　D) Start、Stop、Restart

8. `systemctl mask nginx` 和 `systemctl disable nginx` 的区别是什么?
   - A) 完全一样　B) `disable` 取消开机自启(但可以被手动或依赖启动);`mask` 彻底禁止启动(即使手动 start 也不行,单元文件被链接到 /dev/null)　C) `mask` 是 `disable` 的别名　D) `mask` 会删除服务

9. `journalctl --since "2026-09-20" --until "2026-09-21"` 的作用?
   - A) 删除指定日期的日志　B) 查看 2026-09-20 这一天的所有日志　C) 备份日志　D) 统计日志行数

10. 以下哪个是 systemd 单元文件的正确存放位置(用户自定义)?
   - A) `/usr/bin/`　B) `/etc/systemd/system/`　C) `/var/log/`　D) `/home/user/`

### 解答题(5 道)

**Q1 概念:** 解释 systemd 中"单元文件"(Unit)的概念。`.service`、`.timer`、`.socket` 三类单元各司何职?

**Q2 解释:** 为什么 `systemctl start` 和 `systemctl enable` 是两件独立的事?举例说明一个需要 start 但不需要 enable 的场景。

**Q3 操作:** 写出为咖啡站 Java 应用编写 systemd 单元文件并部署的完整步骤:创建 `.service` 文件→重载配置→启动→设置开机自启→验证。

**Q4 排障:** 菜菜修改了 `/etc/systemd/system/coffee.service` 中的 `ExecStart`,执行 `systemctl restart coffee` 后服务仍然按旧配置运行。诊断原因并给出正确操作。

**Q5 综合设计:** 咖啡站有 3 个微服务(order-service、payment-service、user-service),每个都需要:①systemd 管理 ②崩溃自动重启(Restart=on-failure) ③日志集中查看 ④依赖顺序(user-service 先于 order-service,order-service 先于 payment-service)。设计完整的 systemd 配置和运维命令集。

> [!答案]
> **1-C** `systemctl` 是 systemd 系统的控制工具。**举一反三:**systemd 是现代 Linux 发行版(Ubuntu 15.04+、CentOS 7+、Debian 8+)的标准初始化系统,替代了旧的 SysV init(`service` 命令)和 Upstart。🪟 Windows 的服务管理用 `services.msc`(GUI)或 `sc`/`Get-Service`(PowerShell)。
>
> **2-B** `start`=立即启动(本次开机);`enable`=设置开机自动启动(下次及以后)。两者独立:**需要同时执行两者**才能在"立即启动"同时"开机自启"。**举一反三:**可以 start 但不 enable(临时启动测试);可以 enable 但不 start(配置好但先不运行,下次重启生效)。🪟 Windows 中 `Start-Service` 和 `Set-Service -StartupType Automatic` 是类似的概念。
>
> **3-B** `journalctl -u nginx` 过滤显示指定 systemd 单元(unit)的日志。**举一反三:**`journalctl -u nginx -f` 跟踪 nginx 日志;`journalctl -u nginx --since today` 查看今天的日志;`journalctl -u nginx -p err` 只查看错误级别及以上日志。
>
> **4-B** 修改任何 systemd 单元文件后,必须运行 `systemctl daemon-reload` 让 systemd 重新读取配置。**举一反三:**这是最常见的 systemd 忘记步骤——改了 `.service` 文件直接 restart,发现没生效。正确的三步:`sudo systemctl daemon-reload`→`sudo systemctl restart <service>`→`sudo systemctl status <service>`。
>
> **5-B** `Active`=当前服务运行状态(active/running=运行中,inactive=已停止,failed=启动失败)。`Loaded`=单元文件是否被 systemd 加载,括号内显示文件路径和开机启动状态(enabled/disabled/static)。**举一反三:**`systemctl is-active nginx`(返回 active/inactive),`systemctl is-enabled nginx`(返回 enabled/disabled)——这两个子命令适合在脚本中使用。
>
> **6-B** `-f`=follow,等价于 `tail -f`,显示完最后几行后不退出,持续显示新的日志条目。按 `Ctrl+C` 退出。**举一反三:**`journalctl -f -u nginx` 同时跟踪指定服务的日志;`journalctl -f -n 100` 先显示最后 100 行再跟踪。
>
> **7-C** systemd 单元文件有三段结构:`[Unit]`(描述和依赖关系),`[Service]`(服务自身的启动/停止/重启行为),`[Install]`(定义如何"安装"到系统中,如哪些 target 下启用)。**举一反三:**`[Unit]` 中 `After=network.target` 表示网络可用后启动;`Wants=` 表示弱依赖(失败不影响自身);`Requires=` 表示强依赖(依赖失败则自身也失败)。
>
> **8-B** `disable`=取消开机自启,但服务仍然可以被手动 `start` 或被其他服务依赖而启动。`mask`=将单元文件符号链接到 `/dev/null`,服务被彻底"封禁",即使手动 `start` 也不行。**举一反三:**`systemctl unmask` 解封;`mask` 通常用于"这个服务绝对不能在系统上运行"的场景(如禁掉不安全的 telnet 服务)。
>
> **9-B** `--since` 和 `--until` 组合指定时间窗口。**举一反三:**时间格式灵活:`--since "1 hour ago"`,`--since yesterday`,`--since "2026-09-20 14:00:00"`。`journalctl --since "2026-09-20" --until "2026-09-21"` 显示一天内的所有日志。
>
> **10-B** `/etc/systemd/system/` 是管理员自定义单元文件的标准位置。**举一反三:**`/lib/systemd/system/`=包管理器安装的单元文件(如 nginx.service);`/etc/systemd/system/`=本地管理员自定义(优先于 /lib 的同名文件);`/run/systemd/system/`=运行时临时单文件。`systemctl cat nginx` 可以查看实际的单元文件内容。
>
> **Q1** 单元文件(Unit)是 systemd 管理的**万物**(服务、定时器、socket、挂载点等)的配置描述文件。三类:①`.service`=服务单元,定义如何启动/停止一个后台服务(最常用)。②`.timer`=定时器单元,替代 cron 任务(精确到秒级、支持随机延迟、可与服务单元关联)。③`.socket`=套接字激活单元,监听端口/文件,有连接时自动启动关联的服务(实现"按需启动",不活动时节省资源)。**核心思想:**一切都抽象为"单元",用统一的命令(`systemctl`)和格式管理——而不像旧时代 `service`、`crontab`、`inetd` 三套命令。
>
> **Q2** start 和 enable 是独立的,因为"立即运行"和"开机启动"是两个不同的管理意图。**不需要 enable 的场景:**①临时启动一个测试服务,测试完就停 ②手动维护时启动数据库备份脚本,不需要下次开机自启 ③用 systemd timer 触发的一次性任务(定时器会启动服务,不需要开机自启)。**正确配置新服务:**`systemctl enable --now service_name`(--now 同时 start+enable 一步完成)。
>
> **Q3** 完整步骤:①创建单元文件:`sudo vim /etc/systemd/system/coffee.service`,内容包含 `[Unit]` 描述/依赖、`[Service]` Type/ExecStart/User/Restart、`[Install]` WantedBy=multi-user.target ②`sudo systemctl daemon-reload`(重载配置) ③`sudo systemctl start coffee`(启动) ④`sudo systemctl enable coffee`(设置开机自启) ⑤验证:`sudo systemctl status coffee`(状态)、`sudo systemctl is-active coffee`(运行中?)、`sudo journalctl -u coffee -f`(查看日志输出)。**举一反三:**`systemctl cat coffee` 查看已加载的单元文件内容;`systemctl edit coffee --full` 编辑;`systemctl show coffee` 显示所有属性。
>
> **Q4** 原因:**忘记 `daemon-reload`**。修改单元文件后,systemd 不会自动重新读取文件,它内部缓存了旧版本。`restart` 是根据缓存的旧配置重启服务。**正确操作:**`sudo systemctl daemon-reload`→`sudo systemctl restart coffee`→`sudo systemctl status coffee`(确认配置生效)。**举一反三:**也可以用 `systemctl reenable coffee`(重新创建符号链接)如果需要更新 Install 段。养成习惯:改 unit file → 想三件事(reload → restart → status)。
>
> **Q5** 设计:①`user-service.service` 设 `Before=order-service.service` ②`order-service.service` 设 `After=user-service.service` 和 `Before=payment-service.service` ③`payment-service.service` 设 `After=order-service.service` ④所有服务都设:`Restart=on-failure`(崩溃自动重启)、`RestartSec=5s`(重启间隔)、`StandardOutput=journal` 和 `StandardError=journal`(标准输出和错误都进 journal) ⑤日志查看:`journalctl -u user-service -u order-service -u payment-service -f`(同时查看三个服务的实时日志) ⑥状态检查:`systemctl status user-service order-service payment-service`(一次查看多个服务状态)。**举一反三:**可以用 `systemctl list-dependencies order-service.service` 查看服务的依赖树;创建 systemd target(如 `coffee.target`)统一管理三个微服务:`Wants=` 关联三个服务,`systemctl start coffee.target` 一键启动所有。
