---
title: "PowerShell 速查 · 对象管道的全周期用法"
date: 2026-07-26
summary: "以 PowerShell 7.x 为基线，按从心智模型到进程、CIM、注册表、远程、脚本、模块的完整生命周期串起 cmdlet，并标注 Windows PowerShell 5.1 差异与破坏性坑。"
tags: [命令速查, PowerShell, Windows]
---


# PowerShell 速查 · 对象管道的全周期用法

> 基线：PowerShell 7.x（可执行文件 `pwsh`），命令以 `动词-名词` cmdlet 为准，⚠ 标破坏性操作。差异处标注 Windows PowerShell 5.1（`powershell.exe`）——两者并存，Profile、模块目录、可用 cmdlet 均不互通。

## 快速导航

| 阶段 | 一句话 |
|------|--------|
| 1、心智模型 | 管道里流的是 .NET 对象，不是文本行 |
| 2、发现命令 | 三板斧 `Get-Command` / `Get-Help` / `Get-Member` |
| 3、文件与路径 | Provider 抽象：文件、环境变量、注册表同一套动词 |
| 4、文本与数据 | 正则、JSON、CSV，结构化数据别当字符串切 |
| 5、进程与服务 | 找进程、杀进程、管服务、查端口占用 |
| 6、WMI 与 CIM | 查系统底层信息，`Get-WmiObject` 已死 |
| 7、注册表 | 当成盘符遍历，改之前先导出 |
| 8、远程与 SSH | WinRM 与 SSH 两条路，注意反序列化对象 |
| 9、脚本与函数 | 执行策略、错误处理、`-WhatIf`、参数 |
| 10、配置与模块 | Profile、PSModulePath、PSResourceGet |

## 1、心智模型：一切皆对象

Bash 管道传**字节流**，靠 `cut`/`awk` 按分隔符切列；PowerShell 管道传 **.NET 对象**，下游直接按**属性名**取值——这决定了后面所有命令的用法。

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `Get-Process \| Select-Object Name,Id,WS` | 按属性名取列 | **不是 `cut`**：与显示宽度、列序无关，改格式也不崩；`cut -f2` 换版输出就废 |
| `... \| Select-Object -ExpandProperty Name` | 摊平成纯值数组 | 不加 `-ExpandProperty` 得到的是**只含一属性的对象**，`-join` 会拼出类型名 |
| `Get-Process \| Where-Object { $_.WS -gt 500MB }` | 按属性值过滤 | **不是 `grep`**：`-gt` 是数值比较，不会像 grep 拿 "100" 误中 "10"；`500MB` 是原生字面量 |
| `... \| Sort-Object CPU -Descending` | 按属性排序 | 数字走数值序、字符串走字典序；混合类型会抛错 |
| `... \| Group-Object Status` | 分组 | 类似 `sort \| uniq -c`，但每组 `.Group` 里**保留原始对象** |
| `... \| ForEach-Object { $_.Kill() }` | 逐个处理，`$_` 是当前对象 | 对象带**方法**不只数据，这是文本管道给不了的 |
| `Format-Table` / `Format-List` | 只负责最终显示 | ⚠ 输出的是**格式化指令对象**，后接 `Where`/`Export-Csv` 必拿垃圾。**只能放最后一位** |

**必须记住的比较语义**

| 写法 | 含义 | 坑 |
|------|------|-----|
| `-eq -ne -gt -ge -lt -le` | 比较 | 没有 `==`；默认**大小写不敏感**，要区分用 `-ceq`/`-clike` |
| `-contains` / `-in` | **集合成员**判断 | ⚠ `'abcd' -contains 'bc'` 是 `$False`；判子串请用 `-like`/`-match` |
| `$null -eq $x` | 判空 | ⚠ `$null` 必须写左边：`$x -eq $null` 在数组上会变成"过滤空元素" |

## 2、发现命令：三板斧

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `Get-Command -Name *service*` | 按名找命令 | 支持通配；`-CommandType Cmdlet,Function,Application` 缩小范围 |
| `(Get-Command git).Source` | 查外部 exe 路径 | 相当于 `which`；`Get-Command` 覆盖 cmdlet/函数/别名/exe 四类 |
| `Get-Help Get-Process -Examples` | 只看示例 | `-Online` 打开官方文档；本地帮助常落后，版本差异以线上为准 |
| `Get-Process \| Get-Member` | **看对象属性和方法** | 全表最重要一条：不知属性名就没法写 `Select-Object`；PS 7 帮助需先 `Update-Help` |
| `Get-Alias -Definition Get-ChildItem` | 反查别名 | ⚠ `ls`/`cat`/`rm` 在**非 Windows 的 PS 7 上不存在**，脚本一律写全名 |

## 3、文件与路径

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `Get-ChildItem -Recurse -File -Filter *.log` | 递归找文件 | `-Filter` 走底层比 `-Include` **快一个量级**，但只支持一个模式；`-Force` 才含隐藏项 |
| `Get-Item -LiteralPath 'C:\a[1].txt'` | 按字面路径取 | ⚠ `-Path` 会把 `[` `]` 当通配符，含中括号路径必须用 `-LiteralPath` |
| `New-Item -ItemType Directory -Force` | 建目录 | `-Force` 等价 `mkdir -p`；⚠ 但对**文件**用 `-Force` 会清空已有内容 |
| `Copy-Item -Recurse` / `Move-Item` / `Rename-Item` | 复制/移动/改名 | `Rename-Item -NewName` 只接名字**不能带路径**（跨目录用 `Move-Item`） |
| `Remove-Item -Recurse -Force` | ⚠ 递归强删 | ⚠ 不进回收站、不可逆。先 `-WhatIf` 看清单；`"$root\*"` 里 `$root` 为空会指向盘根 |
| `Get-Content -Tail 20 -Wait` | 等价 `tail -f` | 默认**逐行**返回数组；加 `-Raw` 得整块字符串（处理 JSON/整体正则时必须） |
| `Set-Content` / `Add-Content` / `Out-File` | 写文件 | ⚠ 编码坑：PS 7 统一 `utf8NoBOM`；5.1 下 `Out-File`/`>` 默认 **UTF-16LE**、`Set-Content` 默认 ANSI。显式写 `-Encoding utf8` |
| `Get-ChildItem Env:` / `$env:PATH` | 环境变量当盘用 | ⚠ `$env:X='v'` 只对**当前进程**有效；持久化用 `[Environment]::SetEnvironmentVariable('X','v','User')` |

## 4、文本与数据处理（含 JSON / CSV）

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `Select-String -Pattern 'ERROR' -Path *.log` | 等价 grep | 返回 **MatchInfo 对象**（含 `LineNumber`/`Line`），非纯文本；`-SimpleMatch` 关正则，`-Context 2,5` 给上下文 |
| `$s -replace 'a(\d+)','b$1'` | 正则替换 | ⚠ **默认正则**；替换字面点写 `'\.'`，`$1` 引用捕获组且必须**单引号** |
| `ConvertTo-Json -Depth 10` | 对象转 JSON | ⚠ **`-Depth` 默认只有 2**，嵌套深的会被截成类型名。序列化配置务必给足深度 |
| `Get-Content x.json -Raw \| ConvertFrom-Json` | 读 JSON 文件 | ⚠ 少了 `-Raw` 就是逐行喂入，长 JSON 直接解析失败；结果 `.` 逐层取 |
| `Import-Csv -Delimiter ';' -Encoding utf8` | CSV 转对象 | 每行变对象、列名即属性名；表头重复列名会报错 |
| `Export-Csv -NoTypeInformation` | 对象转 CSV | PS 6+ 已默认不写 `#TYPE`；⚠ 属性是**集合**时会导成 `System.Object[]`，先 `-join ';'` |
| `Invoke-RestMethod` | 调 REST 接口 | 自动把 JSON 反序列化成对象，**不用**再 `ConvertFrom-Json`；要状态码用 `Invoke-WebRequest` |

> ⚠ PS 6+ 已**移除** `curl`/`wget` 别名（原指向 `Invoke-WebRequest`）。现在 `curl` 就是系统真 `curl.exe`，参数语义完全不同，迁老脚本必查。

## 5、进程与服务

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `Get-Process \| Sort-Object WS -Descending \| Select-Object -First 10` | 内存 Top10 | 名字**不带** `.exe`；`WS`=工作集，`CPU` 是累计秒数不是百分比，别当 `top` 读 |
| `Get-CimInstance Win32_Process \| Select ProcessId,CommandLine` | 看完整命令行 | 5.1 的 `Get-Process` **没有** `CommandLine`（7.1+ 才有），跨版本走 CIM 最稳 |
| `Stop-Process -Id 1234 -Force` | ⚠ 强杀进程 | ⚠ 等价 `kill -9` 不给保存机会。先试不带 `-Force`；按名杀先确认无同名误伤 |
| `Start-Process pwsh -Verb RunAs` | 提权启动 | `-Verb RunAs` 触发 UAC；`-Wait` 等退出，`-PassThru` 拿回 Process 对象 |
| `Restart-Service -Name X -Force` | ⚠ 重启服务 | ⚠ `-Force` 会连**依赖它的服务**一起停；先 `Get-Service X -DependentServices` 看连带 |
| `Set-Service -Name X -StartupType Disabled` | ⚠ 改启动类型 | ⚠ 禁用关键服务会致无法登录/断网；改前记原值 `(Get-Service X).StartType` |
| `Get-NetTCPConnection -LocalPort 8080 -State Listen` | 查端口占用 | 仅 Windows。拿 `OwningProcess` 再 `Get-Process -Id` 定位，比 `netstat -ano \| findstr` 干净 |
| `Get-WinEvent -FilterHashtable @{LogName='System';Level=2}` | 查系统日志 | ⚠ `Get-EventLog` **PS 7 已不再内置**（Windows 上仍会经兼容层代理跑通，同 §6 的 `Get-WmiObject`）；必须在**日志侧** `-FilterHashtable` 过滤，先取全量再 `Where` 会慢到不可用 |

## 6、WMI 与 CIM

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `Get-CimInstance -ClassName Win32_OperatingSystem` | 查系统信息 | ⚠ `Get-WmiObject` 系列 **PS 7 已不再内置**，一律用 `*-CimInstance`（CIM 走 WSMan，WMI 走 DCOM）。⚠ 但在 **Windows 上它照样跑得通** —— PS 7 会自动拉起 `WinPSCompatSession` 隐式远程到 5.1 代理执行，`Get-Command` 查到的是 `Function`（模块版本 1.0，实体在 `%TEMP%\remoteIpMoProxy_*`）而非 `Cmdlet`。**别把「跑得通」当成「还在」**：非 Windows 上直接没有，且跨进程回来的对象只剩属性没有方法 |
| `Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"` | 查本地磁盘 | ⚠ `-Filter` 用 **WQL 语法**（`=`、`LIKE '%x%'`），不是 PS 的 `-eq`；服务端过滤远快于管道 `Where` |
| `Invoke-CimMethod -ClassName Win32_Process -MethodName Create` | ⚠ 调 WMI 方法启动进程 | ⚠ 常被恶意软件使用、EDR 会告警；本机启动进程请用 `Start-Process` |
| `Set-CimInstance` / `Remove-CimInstance` | ⚠ 改写/删除实例 | ⚠ 直接改系统对象（网卡、服务、共享）无回滚；先 `Get-` 出来核对 |
| `Get-CimInstance Win32_Product` | ⚠ 查已装 MSI 程序 | ⚠ **生产禁用**：会对每个已装 MSI 触发一致性检查，卡数分钟。查软件读注册表 `...\Uninstall\*` |

**高频类速记**：`Win32_OperatingSystem`（版本/内存）· `Win32_ComputerSystem`（型号/域）· `Win32_Process`（命令行/父进程）· `Win32_Service`（可执行路径/账号）· `Win32_LogicalDisk`（容量）· `Win32_NetworkAdapterConfiguration`（IP/DNS）。CIM 命令**仅 Windows 可用**。

## 7、注册表

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `Get-ChildItem 'HKLM:\SOFTWARE'` | 遍历"子键" | 注册表是 Provider，套用文件系统动词；⚠ 它只列**子键**，看不到值 |
| `Get-ItemProperty 'HKCU:\Environment'` | 读某键下所有值 | 返回对象混有 `PSPath`/`PSParentPath` 等元数据，别当真实值 |
| `New-ItemProperty -Path X -Name Y -Value 1 -PropertyType DWord` | 建/改值 | ⚠ `-PropertyType` 必须选对：`String`/`ExpandString`/`DWord`/`QWord`/`MultiString`/`Binary`，写错读取方失效 |
| `Set-ItemProperty` / `Remove-ItemProperty` | ⚠ 改值 / 删值 | ⚠ 无撤销；改前先 `reg export "HKCU\Software\Demo" backup.reg` 备份 |
| `Remove-Item -Path X -Recurse` | ⚠ 删整个键树 | ⚠ 删错分支可能致系统/应用无法启动；先 `-WhatIf`，确认路径变量非空 |
| `$k.GetValue('Path',$null,'DoNotExpandEnvironmentNames')` | 读**未展开**原始值 | ⚠ 编辑用户 PATH 必修：`Get-ItemProperty` 会把 `%USERPROFILE%` 展开，写回就把变量写死 |

> ⚠ 通过注册表改环境变量后，**已运行进程不会感知**。用 `[Environment]::SetEnvironmentVariable(...,'User')`（会广播 `WM_SETTINGCHANGE`）。另：`setx` 会把超 1024 字符的值截断，改 PATH 不要用它。

## 8、远程管理与 SSH

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `Enable-PSRemoting -Force` | ⚠ 开启 WinRM 远程 | ⚠ 会启服务并开防火墙，扩大攻击面。公网机不要开；客户端侧**不需要**执行 |
| `Set-Item WSMan:\localhost\Client\TrustedHosts -Value 'srv01' -Concatenate` | ⚠ 非域信任目标 | ⚠ 别写 `-Value '*'`（信任任意主机、可被冒充）；`-Concatenate` 才不覆盖已有列表 |
| `Enter-PSSession -ComputerName srv01 -Credential (Get-Credential)` | 交互式会话（WinRM） | 提示符变 `[srv01]:`；`exit` 退出 |
| `Enter-PSSession -HostName user@host` | **走 SSH** 的会话（PS 6+） | 对端 sshd 需配 `Subsystem powershell`；⚠ SSH 模式**不支持** `-Credential`，靠密钥/密码交互 |
| `$s=New-PSSession -ComputerName a,b; Invoke-Command -Session $s { Get-Service w32time }` | 持久会话 + 远程执行 | 并行分发，结果自带 `PSComputerName`；用完 `Remove-PSSession $s` |
| `Invoke-Command { ... $using:path ... }` | 传本地变量进远端 | ⚠ 远端脚本块看不到本地变量，不加 `$using:` 就是 `$null`；或用 `-ArgumentList`+`param()` |

> ⚠ **反序列化陷阱**：`Invoke-Command` 返回的对象经 XML 序列化，**只剩属性没有方法**，`(Invoke-Command {Get-Process x}).Kill()` 必失败——把逻辑整体放进远端脚本块内执行完再返回结果。

## 9、脚本与函数基础

| 命令 / 语法 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `Get-ExecutionPolicy -List` | 看各作用域策略 | 优先级：MachinePolicy > UserPolicy > Process > CurrentUser > LocalMachine |
| `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` | 允许本地脚本运行 | ⚠ 别把 `Unrestricted`/`Bypass` 设到 `LocalMachine`。它是**防误操作**、非安全边界 |
| `pwsh -ExecutionPolicy Bypass -File .\x.ps1` | 单次绕过 | CI/一次性任务用它，别改全局策略；下载脚本被 MOTW 挡时先 `Unblock-File` |
| `.\script.ps1` | 执行当前目录脚本 | ⚠ 必须带 `.\`：当前目录**不在**搜索路径，是防劫持的刻意设计 |
| `[CmdletBinding(SupportsShouldProcess)]` + `$PSCmdlet.ShouldProcess($t)` | 让函数支持 `-WhatIf`/`-Confirm` | 写任何删改类函数都应加；`-WhatIf` 只打印不执行，是上生产前的**标准彩排** |
| `-Confirm:$false` | 强制关闭确认 | 无人值守脚本对默认高危 cmdlet 显式关闭，避免卡在交互提示 |
| `$ErrorActionPreference = 'Stop'` | 让非终止错误变终止 | ⚠ 默认 `Continue`：命令报红但**脚本继续跑**。自动化脚本第一行就该设 |
| `try { ... } catch { $_ } finally { }` | 异常处理 | ⚠ 只能捕获**终止性**错误；捕不到时给那条命令单独加 `-ErrorAction Stop` |
| `$LASTEXITCODE` / `$?` | 外部命令退出码 / 上条成败 | ⚠ `$ErrorActionPreference` **管不了外部 exe**：`git push` 失败脚本照跑，必须自己判 |
| `Set-StrictMode -Version Latest` | 严格模式 | 引用未定义变量、访问不存在属性直接报错，提前暴露拼写错误 |
| `Write-Host` | ⚠ 只写主机、不进管道 | ⚠ 别用它输出**数据**（调用方接不到）；输出数据用 `Write-Output`，提示才用它 |

## 10、配置文件与模块

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `$PROFILE \| Format-List *` | 看全部 4 个 Profile 路径 | ⚠ PS 7 用 `~\Documents\PowerShell\`，5.1 用 `~\Documents\WindowsPowerShell\`，**互不读取** |
| `New-Item -Path $PROFILE -ItemType File -Force` | 创建 Profile | 首次目录往往不存在，`-Force` 会连目录一起建；诊断慢启动用 `pwsh -NoProfile` |
| `Import-Module X -Force` | 强制重新导入 | 改完模块代码不加 `-Force` 加载的还是旧版本 |
| `Find-Module X` / `Install-Module X -Scope CurrentUser` | 从 PSGallery 找/装 | ⚠ 不加 `-Scope CurrentUser` 要管理员并装到全机；PSGallery 默认 Untrusted 会弹确认 |
| `Install-PSResource X -Scope CurrentUser` | 新一代包管理（PSResourceGet） | PS 7.4 内置，比 `Install-Module` 快；与旧命令可共存但元数据不完全互通 |
| `Uninstall-Module X -RequiredVersion 1.2.0` | 卸载指定版本 | ⚠ `Install-Module` 默认**并存多版本**，`Get-Module -ListAvailable` 会看到一堆旧版 |
| `(Get-PSReadLineOption).HistorySavePath` | 命令历史文件位置 | ⚠ **明文保存**；别把密码/token 直接写命令行，会长期留在此文件 |
| `$PSDefaultParameterValues['*:Encoding']='utf8'` | 全局默认参数 | 写进 Profile 统一编码等默认；键格式 `Cmdlet:Parameter`，支持通配 |

## 常见错误速判

| 症状 | 多半是 | 先试这条 |
|------|--------|----------|
| `因为在此系统上禁止运行脚本` | 执行策略 | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| 下载脚本报 `UnauthorizedAccess` 但策略已放开 | 文件带 Internet 标记 | `Unblock-File .\x.ps1` |
| `Export-Csv` 结果变成一堆乱列 | 中间用了 `Format-*` | 去掉所有 `Format-*`，它只能收尾 |
| JSON 深层节点变成 `System.Object[]` | `ConvertTo-Json` 默认 `-Depth 2` | 加 `-Depth 10` |
| `ConvertFrom-Json` 报语法错误 | `Get-Content` 逐行喂入 | 加 `-Raw` |
| `Get-WmiObject : 无法识别为 cmdlet` | 在**非 Windows** 的 PS 7 上跑 5.1 脚本（Windows 上有兼容层接住，不会报这个） | 改成 `Get-CimInstance` |
| `try/catch` 抓不到报红的错误 | 那是非终止错误 | 该命令加 `-ErrorAction Stop` |
| 外部命令失败但脚本继续跑 | `$ErrorActionPreference` 不管 exe | 判 `$LASTEXITCODE` |
| 路径含 `[` `]` 时找不到文件 | `-Path` 按通配符解析 | 换 `-LiteralPath` |

## 一页纸口诀

1. **管道流的是对象，不是文本**：`Select-Object` 按属性名取列、`Where-Object` 按类型化的值比较——脚本因此不怕上游改格式。
2. **不知道属性名就先 `Get-Member`**，这是写任何一条管道的前置动作。
3. **`Format-*` 只能放最后一位**，它之后的一切处理都是垃圾进垃圾出。
4. **`-eq` 判空要把 `$null` 写左边**，`-contains` 判集合成员而非子串，子串用 `-like`/`-match`。
5. **删改类操作先 `-WhatIf`**，自写函数也要 `SupportsShouldProcess`；⚠ 标记处一律先只读核实再动手。
6. **自动化脚本开头三件套**：`$ErrorActionPreference='Stop'`、`Set-StrictMode -Version Latest`、`#Requires`。
7. **`$ErrorActionPreference` 管不到外部 exe**，调 git/docker/java 之后自己看 `$LASTEXITCODE`。
8. **编码显式写死 `utf8`**，5.1 的默认值会在跨平台协作时咬人；PS 7 与 5.1 是两套 Profile 与模块路径，动手前先看 `$PSVersionTable.PSEdition`。
