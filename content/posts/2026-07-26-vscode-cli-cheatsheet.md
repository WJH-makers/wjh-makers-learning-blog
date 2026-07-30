---
title: "VS Code 速查 · 命令行与工程化用法"
date: 2026-07-26
summary: "以 code CLI 为主线，按「打开→扩展→工作区→远程→任务调试→诊断→恢复→同步→供应链安全」的完整工程化生命周期编排；命令据 VS Code 1.129 实测校验，覆盖 1.9x+ 稳定版。"
tags: [命令速查, VSCode, 编辑器]
---


# VS Code 速查 · 命令行与工程化用法

> 基线：VS Code 1.9x 及以上稳定版，`code` CLI（命令据 1.129 实测校验）。所有 flag 以 `code --help` / `code <子命令> --help` 为准；标 ⚠ 者有破坏性或安全风险，已给后果与替代。

## 快速导航

| 阶段 | 一句话 |
|------|--------|
| 1 打开与比较 | `code` 开文件/目录/diff，当 Git 编辑器 |
| 2 扩展管理 | 命令行装/删/列扩展，批量还原 |
| 3 工作区与多根 | 单目录 vs `.code-workspace` 多根 |
| 4 远程开发 | SSH / WSL / Dev Container + tunnel/serve-web |
| 5 任务与调试 | tasks.json / launch.json 关键字段与坑 |
| 6 诊断与性能 | `--status` / `--prof-startup` / 扩展剖析 |
| 7 安全模式与恢复 | `--disable-extensions` 二分、干净重启 |
| 8 同步与可移植 | Settings Sync / Profile / Portable Mode |
| 9 供应链安全 | 扩展定期自查：盘点、认发布者、删僵尸 |
| 常见错误速判 | 症状→病因→先试哪条 |
| 一页纸口诀 | 浓缩心智模型 |

## 1、code CLI：打开、比较与 Git 集成

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `code .` / `code 文件` | 用当前目录/文件开窗 | 可一次给多路径；Windows 装时勾「Add to PATH」，否则命令面板 `Shell Command: Install 'code' command in PATH` |
| `code -n` / `code -r` | 强制新窗 / 复用当前窗 | 很多 flag（如 `--disable-extensions`）只对新窗生效，排障务必配 `-n` |
| `code -a <目录>` | 把目录加进最后活动窗口 | `--remove <目录>` 反向移除（较新版本） |
| `code -g 文件:行:列` | 跳到指定行列 | 例 `code -g app.ts:120:8`，脚本里定位报错行 |
| `code -d a b` | 并排 diff 两个文件 | `--diff`；只读比较，不建工作区 |
| `code -m 本地 远端 base 输出` | 三方合并 | `--merge`；正是 Git mergetool 的四参数顺序 |
| `echo 文本 \| code -` | 读 stdin 开成无标题文件 | 管道结果丢进编辑器看，不落盘 |
| `code -w` | 等文件关闭再返回 | `--wait`；当外部编辑器的前提 |

**当 Git 的编辑器 / merge 工具**（全局配一次）：

```bash
git config --global core.editor "code --wait"
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait --merge "$REMOTE" "$LOCAL" "$BASE" "$MERGED"'
```

`--wait` 不能省——否则 Git 以为编辑器秒退，提交信息/合并直接走空。

> 实测 1.129 还带 `chat`/`agent` 子命令、`--add-mcp`、`--transient`、`--remove` 等较新能力，1.9x 早期未必有，以本机 `code --help` 为准。

## 2、扩展命令行管理

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `code --list-extensions` | 列已装扩展 ID | ID 形如 `publisher.name`，发布者前缀是安全审查抓手（见第 9 节） |
| `code --list-extensions --show-versions` | 连版本一起列 | 盘点/审计/锁版本的基础；可加 `--category <类>` 过滤 |
| `code --install-extension <id>` | 装/更新扩展 | 加 `--force` 才更新到最新；例 `esbenp.prettier-vscode` |
| `code --install-extension <id>@<版本>` | 装指定版本 | 例 `vscode.csharp@1.2.3`；CI/锁定场景钉死版本 |
| `code --install-extension 路径.vsix` | 从本地 VSIX 装（加 `--pre-release` 装预发布） | ⚠ 只从可信来源拿 VSIX，来路不明的等于运行陌生代码 |
| `code --uninstall-extension <id>` | 卸载扩展 | 定期清「僵尸扩展」，减攻击面又提速 |
| `code --update-extensions` | 更新所有扩展 | 敏感环境改手动（设置 `extensions.autoUpdate`） |
| `code --enable-proposed-api <id>` | 开 proposed API | ⚠ 只给自研扩展开；给第三方开等于放大其能力面 |
| `code --extensions-dir <目录>` | 指定扩展根目录 | 配 `--user-data-dir` 可开互不干扰的隔离实例 |

**跨机批量还原**（把扩展集纳入 dotfiles）：

```powershell
code --list-extensions > extensions.txt                          # 旧机导出
Get-Content extensions.txt | % { code --install-extension $_ }    # 新机还原(PS)
# bash 等价：cat extensions.txt | xargs -L1 code --install-extension
```

## 3、工作区与多根工作区

| 对象 / 命令 | 作用 | 备注 / 坑 |
|-------------|------|-----------|
| `code <目录>` | 单文件夹工作区 | `.vscode/` 里的 settings/tasks/launch 随目录走 |
| `code 项目.code-workspace` | 打开多根工作区 | 一窗挂多个根（前后端同开）；它本身是 JSON 文件 |
| `code -a <目录>` / `--remove <目录>` | 动态增删根 | 对当前活动窗口生效 |
| `.code-workspace` 的 `folders` | 声明多个根 | `[{"path":"api"},{"path":"web","name":"前端"}]`，支持别名 |
| `.code-workspace` 的 `settings` | 工作区级设置 | 覆盖用户设置，又被文件夹级 `.vscode/settings.json` 再覆盖 |
| 设置优先级 | 谁说了算 | 默认 < 用户 < 工作区 < 文件夹；「改了不生效」多半被更靠右层覆盖 |
| `${workspaceFolder:名}` | 多根路径变量 | 多根里必须带 `:名` 指明哪个根，否则任务/调试指错目录 |

## 4、远程开发（SSH / WSL / Dev Container）

> 三者都靠对应扩展（Remote-SSH / WSL / Dev Containers，或整包 Remote Development）。CLI 只是「连接到…」面板命令的等价入口，扩展没装 CLI 也打不开。

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `code --remote ssh-remote+<主机> <绝对路径>` | 连 SSH 主机并开目录 | 主机名取自 `~/.ssh/config`；路径必须是远端**绝对路径**；URI 形式 `--folder-uri "vscode-remote://ssh-remote+<主机>/path"` 脚本里更稳 |
| `code --remote wsl+<发行版> <路径>` | 连 WSL 发行版 | 发行版名用 `wsl -l -q` 查；例 `wsl+Ubuntu /home/me/app` |
| （在 WSL shell 内）`code .` | 从 WSL 里反连开窗 | WSL 装了 `code` shim 后直接用，最省事 |
| Dev Container | 在容器里开发 | CLI 直连要 hex 编码 URI，不实用；走面板 `Dev Containers: Reopen in Container` |
| `devcontainer up --workspace-folder .` | 起容器开发环境 | 独立 npm 包 `@devcontainers/cli`，**不是** `code` 自带 |
| `devcontainer exec --workspace-folder . <命令>` | 在容器里执行命令 | CI 里跑与本地一致的 devcontainer |

**远程访问：把本机或编辑器暴露出去（慎用）**

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `code tunnel` | 建隧道，vscode.dev 等可安全连回本机 | ⚠ 等于把本机挂到公网；首次要 GitHub/Microsoft 登录授权 |
| `code tunnel user login --provider github` | 隧道服务登录 | 也支持 `microsoft`；可用 `--access-token` 免交互 |
| `code tunnel --name <名> --accept-server-license-terms` | 命名并跳过许可交互 | `--random-name` 随机命名 |
| `code tunnel status` / `kill` / `restart` / `prune` | 查/停/重启/清隧道 | `prune` 清掉当前没在跑的服务器 |
| `code tunnel service install` | 装成系统服务、开机常驻 | ⚠⚠ 持久远程访问=后门级权限；`service uninstall` 卸、`service log` 看日志 |
| `code serve-web --port 8000 --connection-token <令牌>` | 起浏览器版编辑器服务 | 令牌是唯一门禁，务必设强令牌或 `--connection-token-file` |
| `code serve-web --without-connection-token` | 无令牌起服务 | ⚠ 无鉴权，任何能访问端口者都能进；仅当已有 VPN/反代兜底时用 |

## 5、任务与调试配置（tasks.json / launch.json）

> 没有「跑任务」的 CLI；任务/调试是 `.vscode/` 下的 JSON 工程化配置。面板 `Tasks: Run Task`、`Ctrl+Shift+B`（默认构建）、`F5`（启动调试）。

**`.vscode/tasks.json` 关键字段**

| 字段 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `version` | 固定 `"2.0.0"` | 旧的 `0.1.0` 语法已淘汰 |
| `type` | `shell` / `process` | `shell` 过一层 shell（有引号/转义坑），`process` 直接执行更可控 |
| `command` / `args` | 命令与参数 | Windows 默认 shell 常是 PowerShell，引号与 bash 不同；必要时在 `options.shell` 指定 |
| `group` | `build` / `test` + `isDefault` | 设 `"group":{"kind":"build","isDefault":true}` 才吃 `Ctrl+Shift+B` |
| `problemMatcher` | 把输出解析成「问题」条目 | watch/长驻任务**必须**配（如 `$tsc-watch`），否则被认为永不结束、卡住依赖链 |
| `dependsOn` / `dependsOrder` | 任务编排 | `dependsOrder:"sequence"` 才严格串行，默认并行 |

**`.vscode/launch.json` 关键字段**

| 字段 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `version` | 固定 `"0.2.0"` | 与 tasks 的版本号不是一回事 |
| `request` | `launch` / `attach` | 新起进程 vs 附加到已运行进程（附加要 `port`/`processId`） |
| `preLaunchTask` | 调试前先跑的任务 | 值要与 tasks.json 的 `label` 完全一致，否则静默不执行 |
| `env` / `envFile` | 注入环境变量 | `envFile` 指向 `.env`；敏感值别写进会提交的 launch.json |
| `${workspaceFolder}` `${file}` `${env:X}` `${input:id}` | 配置变量 | `${workspaceRoot}` 是老写法已弃用，换 `${workspaceFolder}` |
| `compounds` | 组合启动多个配置 | 前后端一键同时调 |

## 6、诊断与性能排查

| 命令 / 入口 | 作用 | 备注 / 坑 |
|-------------|------|-----------|
| `code -s` / `code --status` | 打印进程占用与诊断信息 | **需先有运行中的实例**否则报错；等价 GUI 是面板 `Developer: Open Process Explorer` |
| `code --prof-startup` | 采集启动期 CPU profile | 会重启并生成 `.cpuprofile`，用于提性能 issue；配 `--disable-extensions` 先排除扩展 |
| `code --verbose --log trace` | 详细日志 | `--log` 可按扩展设级别：`--log ms-python.python:trace` |
| `code --inspect-extensions <端口>` | 调试/剖析扩展宿主 | 再到 `chrome://inspect` 连；`--inspect-brk-extensions` 会在启动处断住 |
| 面板 `Developer: Show Running Extensions` | 看每个扩展的激活耗时/CPU | 揪「谁拖慢启动」最直观，可就地 Profile |
| `code --disable-gpu` | 关硬件加速 | 花屏/黑屏/闪烁先试；长期改用面板 `Preferences: Configure Runtime Arguments` 写 argv.json |

## 7、安全模式与故障恢复

> 排障第一问永远是：**「是不是某个扩展干的？」** 下面的 `--disable-extensions` 二分流程就是回答它的标准动作。

| 命令 / 步骤 | 作用 | 备注 / 坑 |
|-------------|------|-----------|
| `code --disable-extensions -n` | 禁用**全部**扩展开新窗（安全模式） | 不持久，只对新窗生效——**必须配 `-n`**，复用旧窗等于没禁 |
| `code --disable-extension <id> -n` | 只禁某一个 | 锁定嫌疑犯后精确验证 |
| 面板 `Help: Start Extension Bisect` | 二分法自动找元凶扩展 | 每轮禁一半、你答「好/坏」，几轮定位到单个扩展，比手删快 |
| `code --transient` | 用临时数据/扩展目录、如首次启动 | 干净复现利器（较新版本）；老版本用下一行替代 |
| `code --user-data-dir <临时> --extensions-dir <临时>` | 全新沙箱实例 | 不碰主配置就能试「是不是配置坏了」 |
| `Preferences: Configure Runtime Arguments`（argv.json） | 持久运行时开关 | 如永久关硬件加速 `"disable-hardware-acceleration": true` |
| 重置用户数据（备份后） | 配置彻底损坏时的核弹 | ⚠ Windows：用户数据 `%APPDATA%\Code`、扩展 `%USERPROFILE%\.vscode\extensions`；**先备份再改名/删** |

**「是不是扩展？」标准排障流**：① 复现 → ② `code --disable-extensions -n` 开新窗复现（好了⇒就是扩展；没好⇒本体/配置/GPU，转 `--transient`、`--disable-gpu`）→ ③ `Help: Start Extension Bisect` 二分到单个扩展 → ④ `code --disable-extension <元凶> -n` 复验 → ⑤ 卸载 / 回退旧版 `--install-extension <id>@<版本>` / 报 issue。

## 8、配置同步与可移植配置

| 命令 / 机制 | 作用 | 备注 / 坑 |
|-------------|------|-----------|
| `code --sync on` / `code --sync off` | 开/关 Settings Sync | 云端同步设置/键位/扩展/UI；面板 `Settings Sync: Show Synced Data` 可查/回滚 |
| `code --profile "<名>"` | 用指定配置集开工作区 | 按项目分「前端/后端/写作」Profile，扩展与设置各自隔离；不存在则新建 |
| Profile 导出/导入 | 团队共享一套配置 | 面板 `Profiles: Export Profile` 出 `.code-profile`（或 Gist），新人一键导入 |
| Portable Mode（便携模式） | 所有数据随目录走 | 在**压缩包版**安装目录建 `data` 文件夹即启用；⚠ 只认 ZIP/归档版，`.exe` 安装器版无效，macOS 用 `code-portable-data` |
| `--user-data-dir` + `--extensions-dir` | 手动指向可移植/备份目录 | U 盘/网盘跑独立环境；换机迁移兜底 |
| `code --list-extensions > list.txt` + 循环装 | 扩展集可复现 | 见第 2 节，把 list 纳入 dotfiles |

## 9、供应链安全：扩展权限自查

> 扩展市场是投毒重灾区：仿冒发布者、抢注同名、刷高装机量、更新里夹带恶意代码都真实发生过。扩展一旦激活就在你的用户权限下跑任意代码——把它当依赖供应链来管。

**定期自查清单（建议每月 / 进新扩展后各来一遍）**

| 步骤 | 命令 / 动作 | 看什么 / 坑 |
|------|-------------|-------------|
| ① 盘点 | `code --list-extensions --show-versions` | 导出后与版本库里的「已知良好清单」diff，冒出的陌生项重点查 |
| ② 认发布者 | 核对 ID 的 `publisher.` 前缀 | 微软是 `ms-*`/`vscode`、Red Hat 是 `redhat`；警惕 `prettier-vscode` 之类仿名、大小写/连字符障眼法（typosquatting） |
| ③ 查可信度 | 市场页看 Verified 徽章、装机量、开源仓库 | 新号 + 高仿名 + 权限大 = 高危组合 |
| ④ 删僵尸 | `code --uninstall-extension <id>` | 半年没用的、功能重复的一律清；扩展越少攻击面越小、启动越快 |
| ⑤ 看激活 | 面板 `Developer: Show Running Extensions` | 哪些在后台常驻、激活耗时异常，排查它到底跑了什么 |
| ⑥ 钉版本 | `code --install-extension <id>@<版本>` + 关自动更新 | 敏感/CI 把 `extensions.autoUpdate` 设手动，防某次更新拉到被投毒新版 |
| ⑦ 隔离 proposed API | 审查谁开了 `--enable-proposed-api` | ⚠ 第三方扩展不该开；开了等于额外授权 |
| ⑧ 工作区信任 | 面板 `Workspace: Manage Workspace Trust` | 不信任的仓库开在 Restricted Mode，任务/调试/部分扩展默认不跑 |

**攻击面小结**：ID = `发布者.名字`，**发布者**是第一道防线；VSIX 侧装（`--install-extension x.vsix`）绕过市场审核，只用审计过的包；`--enable-proposed-api`、`--disable-chromium-sandbox` 都在放大权限，非必要不开。

## 常见错误速判

| 症状 | 多半是 | 先试这条 |
|------|--------|----------|
| `'code' 不是内部或外部命令` / command not found | PATH 里没有 code | Windows 重装勾「Add to PATH」；或面板 `Shell Command: Install 'code' command in PATH` |
| `--disable-extensions` 了问题还在 | 复用了旧窗口，flag 只对新窗生效 | 补 `-n` 开新窗，或先全关再开 |
| `code --status` 报错/无输出 | 没有运行中的实例 | 先 `code .` 开一个，再 `code -s` |
| 改了 settings 不生效 | 被工作区/文件夹/Profile 层覆盖 | 查 `.vscode/settings.json` 与当前 Profile；默认<用户<工作区<文件夹 |
| Remote-SSH `--remote` 打不开 | 没装 Remote 扩展 / 路径不是绝对路径 | 装 Remote-SSH；远端路径写绝对路径 |
| tunnel / serve-web 连不上 | 令牌或防火墙/端口 | 查 `--connection-token`、端口、`code tunnel status` |
| 扩展装了不激活 | 触发条件没命中 / 被 Restricted Mode 拦 | 看 `Show Running Extensions`；信任工作区 |
| 启动巨慢 | 某扩展或 GPU | `--disable-extensions -n` 二分 → `--prof-startup` → `--disable-gpu` |
| Windows 上 task 引号/转义乱 | 默认 shell 是 PowerShell，与 bash 不同 | task 里指定 `options.shell`，或改 `"type":"process"` |

## 一页纸口诀

- 打开三连：`code .` 进目录、`-n` 开新窗、`-r` 复用窗；比对 `-d a b`、合并 `-m`、当 Git 编辑器 `code --wait`。
- 排障先问「是不是扩展」：`--disable-extensions -n` 开新窗 → `Extension Bisect` 二分到元凶。
- 慢就三招：`--prof-startup` 抓启动、`Show Running Extensions` 看激活、`--disable-gpu` 排渲染。
- 扩展即攻击面：定期 `--list-extensions --show-versions` 盘点，认发布者、删僵尸、关键版本 `@version` 钉死。
- 远程靠扩展：SSH/WSL/Dev Container 先装扩展，CLI 用 `--remote`，容器另有独立 `devcontainer` CLI。
- 对外暴露必设令牌：`serve-web` 别用 `--without-connection-token`，`tunnel` 把本机挂上公网，`service install` 是持久后门级权限。⚠
- 要干净复现：`--transient`（新版）或 `--user-data-dir`+`--extensions-dir` 指临时目录，别动主配置。
- 配置可移植：`--list-extensions > list.txt` 导出、循环 `--install-extension` 还原；Profile 导 `.code-profile`；Portable 只认压缩包版。
- 不信任的仓库开在 Restricted Mode，信任前 tasks/调试/部分扩展都不跑。

## 运行前边界、回滚与验证

- **运行前**：示例以 GNU/Linux 的 Bash 为主；先用 `command --help`、`man command` 或发行版文档确认本机版本和参数。不要把教程中的 IP、域名、用户、路径直接复制到生产机器。
- **先确认作用域**：涉及文件、仓库、容器或远端主机时，先运行 `pwd`、`whoami`、`git status`、`docker context show` 或 `ssh -G 主机别名`，确认当前目标；对重要数据先做可恢复备份。
- **完成后验证**：用只读命令确认结果，例如 `ls -la`、`git status`、`systemctl status 服务名`、`docker ps` 或 `curl -fS URL`；失败时停止扩大操作范围，先读报错。
- **远端边界**：首次连接核验主机指纹；传输前先确认目标路径和账号，`rsync` 删除模式必须先加 `--dry-run`。远程改网络或防火墙时保留一个已登录会话和云控制台回退路径。
