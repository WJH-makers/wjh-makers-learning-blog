---
title: Windows Java 全栈环境整理复盘
date: 2026-07-04
summary: 从复盘出发的 Windows Java 全栈环境完整手册：JDK 版本管理、JAVA_HOME/PATH 排坑、Maven/Gradle 全局配置、Git/SSH 现代写法、Node/mise、MySQL 免密、IntelliJ 配置要点，每一步都附「装完怎么确认」的验证命令。
tags: Windows, Java, Git, MySQL, Maven, Gradle, mise, IntelliJ, 环境配置
---

## 今天完成了什么

- 统一了 GitHub 连接方式：优先使用 SSH，避免在 remote URL 中出现 token。
- 梳理了 Node/NVM/opencode 的命令来源，目标是所有命令都走一个明确入口。
- Java 选择 GraalVM JDK 25.0.3，Maven 和 Gradle 走独立官方目录。
- MySQL 与 mycli 使用 login-path/DSN，避免明文密码。
- 给 `tldr git`、`tldr mysql`、`tldr java`、`tldr gh` 增加了高频命令速查。

## 学到的关键点

> 开发环境不是装得越多越好，而是每个命令都应该知道从哪里来、为什么存在、如何恢复。

Git 的核心工作流可以压缩为：

```text
git status -> git diff -> git add -p -> git commit -> git push
```

遇到问题时优先看：

- `git status --short --branch`
- `git config --show-origin --show-scope --list`
- `where node` / `where java` / `where opencode`
- `tldr git undo`

## 1、JDK 版本管理：为什么不手动扔环境变量

早年装 JDK 的做法是：官网下 zip、解压到某目录、手动把 `JAVA_HOME` 指过去、再往 `PATH` 塞 `%JAVA_HOME%\bin`。单个 JDK 时没问题，一旦要**同时维护多个版本**（一个老项目卡在 17、新项目上 25、某个 Android 工具链只认 21）就会失控：切版本要改系统环境变量、重开所有终端、还容易忘了哪个窗口是哪个 Java。版本管理器解决的正是「一条命令切换 + 自动改当前 shell 的 PATH + 按项目锁定版本」。

本机的取舍：**Java 不归 mise 管，单独走 `JAVA_HOME`**（GraalVM JDK 25 需要它的 `native-image`/`gu` 等专有工具，且 profile 里用两层通配 + 数字零填充排序，升级小版本时路径自动跟随，不用改配置）；Node 才交给 mise。这是刻意的分工，不是所有语言都塞进同一个管理器。

| 方案 | 平台 | 典型命令 | 备注 / 坑 |
| --- | --- | --- | --- |
| **手动 + JAVA_HOME** | 全平台 | 解压后设 `JAVA_HOME`，PATH 加 `%JAVA_HOME%\bin` | 最透明、无额外依赖；多版本切换全靠自己改变量，适合「主力就一个 JDK」。GraalVM 想用 `native-image` 只能走这条，版本管理器的 shim 常绕过 `gu` |
| **mise** | Win/Linux/mac | `mise use -g java@temurin-25`；`mise use java@21`（写进 `.mise.toml`） | 跨语言统一、按目录锁版本、shim 自动改 PATH。坑：GraalVM 的专有二进制未必被 shim 暴露；Windows 上要确认 shim 目录 `~\AppData\Local\mise\shims` 在 PATH 靠前 |
| **SDKMAN!** | Linux/mac/**Git Bash** | `sdk install java 25-graalce`；`sdk use java 21.0.5-tem` | Java 生态最顺手，能装 Maven/Gradle/Spring Boot CLI。**原生 PowerShell 不支持**，Windows 上只能在 Git Bash/WSL 里用 |
| **Scoop / winget** | Windows | `scoop install temurin25-jdk`；`winget install EclipseAdoptium.Temurin.25.JDK` | 装得快、能自动进 PATH；但**多版本共存与切换弱**，winget 尤其不擅长「并存多个大版本再来回切」 |

验证装对没有：

| 命令 | 作用 | 备注 / 坑 |
| --- | --- | --- |
| `java -version` | 看当前生效的 JDK 版本与厂商 | 输出走 **stderr**，脚本里重定向要用 `2>&1`；显示的是 PATH 里第一个 `java`，未必等于 `JAVA_HOME` 指的那个（见下节） |
| `java --version` | 同上，新式单行输出 | JDK 9+ 才有；老脚本仍用 `-version` |
| `javac -version` | 确认编译器版本 | 只装 JRE 时没有 `javac`；能跑 `java` 不代表能编译 |
| `where java`（PS/CMD）/ `which -a java`（Bash） | 列出 PATH 中**所有** java，按顺序 | ⚠ Windows 常见幽灵：`C:\Windows\System32\java.exe` 或 `C:\ProgramData\Oracle\Java\javapath\java.exe`（Oracle 安装器留的 shim），排在你的 JDK 前面就会「版本对不上」 |
| `echo $env:JAVA_HOME`（PS）/ `echo $JAVA_HOME`（Bash） | 确认 JAVA_HOME 指向 | 值应指到 JDK **根目录**，不是 `\bin`；结尾不要带反斜杠 |

## 2、JAVA_HOME 与 PATH：全栈环境头号坑区

绝大多数「明明装了 25 却跑出 17」「Maven 用错 JDK」都出在这两个变量。记住一条：**Maven、Gradle、IDE 的构建普遍读 `JAVA_HOME`，而命令行敲 `java` 读的是 `PATH`**——两者可以不一致，且默默地不一致。

| 坑 | 现象 | 正确做法 |
| --- | --- | --- |
| `JAVA_HOME` 指到 `\bin` | Maven/Gradle 报 `JAVA_HOME is set to an invalid directory` | 指向 JDK **根目录**（含 `bin`、`lib`、`conf`） |
| 结尾带反斜杠或引号 | 拼出 `...\bin\\java` 或路径被引号污染 | 值里不写引号、不留尾部 `\`；PATH 里写 `%JAVA_HOME%\bin` |
| 路径含空格未处理 | `C:\Program Files\...` 在脚本/CI 里被截断 | 用户变量里直接填无妨，但脚本内引用要加引号；能避开 `Program Files` 就装到无空格路径 |
| PATH 顺序错 | `where java` 里 System32/Oracle 的 shim 排第一 | 把 `%JAVA_HOME%\bin`（或 mise shim）**移到 PATH 最前**；删掉 Oracle javapath |
| 用户变量 vs 系统变量混设 | 一个窗口对、另一个错 | 统一在**用户变量**设，别系统/用户各设一份互相打架 |
| 改了变量不重开终端 | 老进程仍读旧值 | 环境变量只在进程启动时读取；改完**新开** shell（连 IDE、连资源管理器有时都要重启） |

PowerShell 7 里临时改（只影响当前会话，用来快速验证某版本）：

| 命令 | 作用 | 备注 / 坑 |
| --- | --- | --- |
| `$env:JAVA_HOME = 'C:\...\graalvm-jdk-25'` | 当前会话切 JAVA_HOME | 仅本进程有效，关窗即失效；适合临时验证 |
| `$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"` | 把该 JDK 顶到 PATH 最前 | 同上，临时性；别拿它当持久配置 |
| `[Environment]::SetEnvironmentVariable('JAVA_HOME','C:\...','User')` | **持久**写入用户变量 | ⚠ 写错值会影响所有新终端；写前先 `Get-` 读一遍旧值备份 |
| `[Environment]::GetEnvironmentVariable('JAVA_HOME','User')` | 读回持久值核实 | 写后必回读——`$env:JAVA_HOME` 读的是当前进程快照，不等于已持久化 |

## 3、Maven 全局配置（settings.xml）

Maven 的用户级配置在 `~/.m2/settings.xml`（Windows 即 `C:\Users\<你>\.m2\settings.xml`），默认**不存在**，需要自己建。三件事最值得配：镜像（国内加速）、本地仓库位置、以及可选的私服认证。

| 配置项 | 位置 / 键 | 备注 / 坑 |
| --- | --- | --- |
| 本地仓库 | `<localRepository>` | 默认落在 `~/.m2/repository`，会长到几个 GB；想外置到别的盘就显式配。改了之后老仓库不会自动迁移 |
| 镜像加速 | `<mirrors>` 里加阿里云 `https://maven.aliyun.com/repository/public` | `<mirrorOf>` 写 `*` 会拦截**所有**仓库（含私服）；要放行私服写 `*,!私服id`。只写 `central` 则仅镜像中央仓库 |
| 私服认证 | `<servers>` 的 `<id>` 必须与 `<repository>`/`<mirror>` 的 id **完全一致** | id 对不上 → 401；密码可用 `mvn --encrypt-password` 加密后配 `settings-security.xml`，别放明文 |
| 指定构建 JDK | `<profiles>` + toolchains，或直接靠 `JAVA_HOME` | Maven 用哪个 Java 由 `JAVA_HOME` 决定，与 `where java` 无关——这是「命令行是 25、Maven 却是 17」的根因 |

验证：

| 命令 | 作用 | 备注 / 坑 |
| --- | --- | --- |
| `mvn -v` | 看 Maven 版本、以及它**实际用的 Java 版本和 JAVA_HOME** | 最关键一行是 `Java version: ... , vendor` 和 `Java home:`——直接暴露 Maven 认的是哪个 JDK |
| `mvn help:effective-settings` | 打印合并后的最终 settings（含镜像/仓库路径） | 排查「镜像没生效」神器；能看清哪个 profile 真正激活 |
| `mvn -X <goal>` | debug 模式，打印仓库解析、插件加载全过程 | 输出极长，定位「依赖从哪个仓库下的」用它 |
| `mvn dependency:tree` | 依赖树，查冲突/传递依赖 | 加 `-Dverbose` 看被 Maven 调解掉的重复依赖 |

本机 Maven 是手装的 `apache-maven-3.9.16`（3.9.x 系列稳定线；Maven 4 已发布但工具链兼容仍在铺开，生产项目暂缓）。命令行 `mvn` 走这份，IDE 里建议在设置中把 Maven home 指到同一份，避免「IDE 用捆绑 Maven、命令行用系统 Maven」两套行为。

## 4、Gradle 全局配置（GRADLE_USER_HOME / gradle.properties）

Gradle 的用户级目录由 `GRADLE_USER_HOME` 决定（默认 `~/.gradle`），里面放全局 `gradle.properties`、缓存、wrapper 分发包。本机把它**外置到 `E:\.dev-cache\gradle-home`**（缓存能涨到十几 GB，别占 C 盘系统盘）。

全局 `gradle.properties`（放在 `GRADLE_USER_HOME` 下，对所有项目生效）常配：

| 键 | 作用 | 备注 / 坑 |
| --- | --- | --- |
| `org.gradle.jvmargs=-Xmx2g -Dfile.encoding=UTF-8` | Gradle 守护进程的堆与编码 | 大项目 OOM 就加大 `-Xmx`；Windows 上不显式设 UTF-8 容易中文乱码 |
| `org.gradle.daemon=true` | 复用守护进程，二次构建快很多 | CI 里反而应设 `false`（容器一次性，守护进程留着浪费内存） |
| `org.gradle.parallel=true` | 多模块并行构建 | 模块间有隐式依赖但没在 build 脚本声明时，并行会暴露出偶发失败——那是脚本本来就有 bug |
| `org.gradle.caching=true` | 打开构建缓存 | 显著提速，但自定义 task 若未正确声明 input/output，缓存会给你「假成功」的陈旧产物 |
| `org.gradle.java.installations.auto-download=true` | 允许 toolchain 自动下载缺失 JDK | 内网/无代理环境会卡下载；可改 `auto-detect` 只用本机已装的 |

**用 Gradle Toolchain 而不是 `JAVA_HOME` 来锁编译 JDK**是现代做法——在 `build.gradle(.kts)` 里写：

```kotlin
java { toolchain { languageVersion = JavaLanguageVersion.of(25) } }
```

这样构建用哪个 Java 由脚本声明、可复现，不再受「谁的 JAVA_HOME」影响。Gradle 会自己找/下对应 JDK 来编译，而运行 Gradle 自身的 JVM 仍是 `JAVA_HOME` 那个——两者分离是特性不是 bug。

| 命令 | 作用 | 备注 / 坑 |
| --- | --- | --- |
| `gradle -v` / `./gradlew -v` | 看 Gradle 版本 + 它自身运行的 JVM | **优先用项目里的 `./gradlew`**（wrapper），版本随项目锁定；直接 `gradle` 用的是本机全局版（本机 9.6.0），可能与项目要求不符 |
| `./gradlew javaToolchains` | 列出 Gradle 发现的所有 JDK 及来源 | 排查 toolchain「找不到 25」时看这个——能看到它扫了哪些目录 |
| `./gradlew build --scan` | 构建并生成可分享的性能报告 | `--scan` 会上传到 gradle.com，公司项目注意数据合规 |
| `./gradlew --stop` | 停掉所有 Gradle 守护进程 | ⚠ 守护进程吃内存/偶发状态污染时用；改了 `gradle.properties` 的 JVM 参数后必须 stop 才生效 |
| `./gradlew clean build --refresh-dependencies` | 强制重下依赖 | 依赖缓存损坏/拿到脏 SNAPSHOT 时的重锤，会慢很多 |

⚠ **wrapper 脚本安全**：`gradlew` 会执行 `gradle-wrapper.jar`。克隆陌生仓库时，这个 jar 是能跑任意代码的——别对不信任来源的项目无脑 `./gradlew`。

## 5、Git 与 SSH：现代写法（淘汰 rsa）

原文已确立「优先 SSH、不在 remote URL 里放 token」的方向。这里补齐现代密钥与常用排查。

| 命令 | 作用 | 备注 / 坑 |
| --- | --- | --- |
| `ssh-keygen -t ed25519 -C "邮箱或标识"` | 生成现代椭圆曲线密钥 | ⚠ **别再用 `-t rsa`**：要用也得 `-t rsa -b 4096`，但 ed25519 更短更快更安全，OpenSSH 8.8+ 默认冷落弱 RSA-SHA1。老教程里的 `ssh-keygen -t rsa` 已过时 |
| `ssh -T git@github.com` | 验证 GitHub SSH 是否打通 | 成功会显示 `Hi <用户>! You've successfully authenticated`；`Permission denied (publickey)` 多半是 key 没加进 agent 或没上传到 GitHub |
| `ssh -Tv git@github.com` | 带 verbose 排查认证 | 看它实际尝试了哪把 key、走 22 还是 443 端口 |
| `Get-Service ssh-agent`（PS） | 查 Windows 自带 OpenSSH agent 服务状态 | Windows 的 agent 是**系统服务**，默认可能 `Stopped/Disabled`；`Set-Service ssh-agent -StartupType Automatic` 再 `Start-Service` |
| `ssh-add ~/.ssh/id_ed25519` | 把私钥加入 agent | 加之前确认 agent 在跑，否则报 `Could not open a connection to your authentication agent` |
| `git remote -v` | 查当前远程是 SSH 还是 HTTPS | 混用会导致「有时要密码有时不要」；统一成 `git@github.com:` 前缀 |
| `git config --show-origin --show-scope --list` | 列出每条配置来自哪个文件、哪个作用域 | 排查「明明设了 user.email 却没生效」——常是仓库级覆盖了全局 |
| `git config --global core.autocrlf input` | 换行符策略 | ⚠ Windows 上设 `true` 会把仓库里的 LF 检出成 CRLF，跨平台项目/shell 脚本会因 CRLF 跑不起来；纯本地无所谓，跨端建议 `input` 或用 `.gitattributes` 显式声明 |
| `git config --global commit.gpgsign true` | 开启提交签名 | 配合 SSH 签名（`gpg.format=ssh`）可复用现有 ed25519 key 给提交签名，GitHub 上显示 Verified |

## 6、Node 与 mise：命令来源要单一

原文目标是「所有命令走一个明确入口」。本机 Node 交给 **mise**（当前 26.5.0），shim 在 `~\AppData\Local\mise\shims`。

| 命令 | 作用 | 备注 / 坑 |
| --- | --- | --- |
| `mise ls --current` | 看当前目录**实际生效**的各语言版本 | 比 `node -v` 更能说明「为什么这个目录是这个版本」 |
| `mise use -g node@26` | 全局锁 Node 大版本 | 写进 `~/.config/mise/config.toml`；`-g` 是全局，去掉则写当前目录的 `.mise.toml` |
| `mise use node@lts` | 当前项目锁 LTS | 会在项目里生成 `.mise.toml`，团队共享版本 |
| `where node`（PS） | 确认 node 来源唯一 | ⚠ 若同时装过 nvm-windows / 官方 msi / mise，PATH 里会有多个 node 打架；目标是只剩 mise shim 那一个 |
| `mise doctor` | 体检 mise 配置与激活状态 | shim 没生效、`mise activate` 没进 profile 时它会点出来 |
| `corepack enable` | 启用 pnpm/yarn 的官方版本管理 | Node 16.9+ 自带 corepack；比全局 `npm i -g pnpm` 更干净，版本随项目 `packageManager` 字段锁定 |

⚠ 别再新装 **nvm-windows**：它和 mise 都要抢 PATH 里的 node，两者共存必然出现「切了版本没变化」。选一个，本机是 mise。

## 7、MySQL 与 mycli：免明文密码

原文方向正确（login-path/DSN），补齐命令。

| 命令 | 作用 | 备注 / 坑 |
| --- | --- | --- |
| `mysql_config_editor set --login-path=local --host=localhost --user=root --password` | 把凭据写进加密的 `.mylogin.cnf` | 之后 `mysql --login-path=local` 免密登录；⚠ `.mylogin.cnf` 是**混淆不是强加密**，能被解出，仍要保护好文件权限。注意此工具**社区版/部分发行版可能不带** |
| `mysql --login-path=local` | 用 login-path 登录 | 免在命令行敲 `-p密码`（那样密码会进 shell 历史和进程列表，⚠ 危险） |
| `mycli mysql://root@localhost:3306/dbname` | 带补全高亮的客户端 | 密码建议放 `~/.my.cnf` 或用 DSN 别名，别写进 URL |
| `mysqladmin -u root -p status` | 快速看服务是否活、连接数、QPS | 确认「装完起没起来」的第一命令 |
| `mysql -e "SELECT VERSION();"` | 单条查询看版本 | 验证安装与连通性一步到位；`-e` 跑完即退，适合脚本 |
| `SHOW VARIABLES LIKE 'character_set%';` | 查字符集是否 utf8mb4 | ⚠ 老库/老配置常是 `utf8`（只 3 字节，存不下 emoji 和部分中文生僻字）——务必确认 `utf8mb4` |

## 8、IntelliJ IDEA 配置要点

IDE 的构建行为独立于命令行，几个点不对齐就会「命令行能编、IDE 报错」或反之。

| 配置项 | 位置 | 备注 / 坑 |
| --- | --- | --- |
| Project SDK | File → Project Structure → Project | 指到与命令行同一个 JDK（本机 GraalVM 25）；这里选错就是「命令行 25、IDE 21」的另一半根因 |
| Language level | 同上 | SDK 是 25 但 language level 停在 17，则新语法（如更新的 pattern matching）标红——两者要匹配 |
| Gradle JVM | Settings → Build Tools → Gradle | 单独一项！默认可能跟 Project SDK 不同；toolchain 项目这里也要能找到目标 JDK |
| Maven home | Settings → Build Tools → Maven | 建议指向系统 `apache-maven-3.9.16` 而非 IDE 捆绑版，保证与命令行一致 |
| 构建/运行委托 | Settings → Build Tools → Gradle → *Build and run using* | 选 Gradle 则 IDE 走真实 Gradle（与命令行一致，慢但准）；选 IDEA 则用内建编译器（快但可能与 gradle build 结果有别） |
| 文件编码 | Settings → File Encodings | 全部设 UTF-8，勾 *Transparent native-to-ascii*（properties 文件）；否则中文注释/资源在不同机器乱码 |
| 注解处理 | Settings → Build → Compiler → Annotation Processors | 用 Lombok/MapStruct 却没开，会满屏「找不到 getter/生成类」的假错 |

验证 IDE 与命令行一致：在 IDE 的内置 Terminal 里跑 `java -version` 和 `mvn -v`，与外部 PowerShell 输出对比——不一致说明 IDE 的 Terminal 继承了不同的环境变量。

## 9、一步一验证：环境自检清单

装完/换机后，从下到上跑一遍，任何一条不对就地排查，别往上叠：

| 层 | 验证命令（PowerShell 7 基线） | 期望 / 备注 |
| --- | --- | --- |
| Shell | `$PSVersionTable.PSVersion` | 7.x；确认主 shell 是 PS7 不是老 Windows PowerShell 5.1 |
| 代理 | `echo $env:HTTP_PROXY` | 需要代理的构建前确认；本机 profile 会在 Clash 没跑时自动清空，避免卡超时 |
| JDK 存在 | `java -version` / `javac -version` | 版本、厂商符合预期；两者都在 |
| JDK 来源唯一 | `where java` | 只有你的 JDK，**没有** System32/Oracle javapath 抢跑 |
| JAVA_HOME | `echo $env:JAVA_HOME` | 指 JDK 根目录、无尾斜杠、无引号 |
| Maven | `mvn -v` | `Java home` 与 `JAVA_HOME` 一致 |
| Gradle | `gradle -v`；项目内 `./gradlew -v` | 全局版与项目 wrapper 版都心里有数 |
| Node | `node -v`；`mise ls --current` | 版本符合、来源是 mise shim |
| Git | `git --version`；`ssh -T git@github.com` | Git 可用、SSH 认证通过 |
| Git 身份 | `git config --show-origin user.email` | 邮箱正确、来自预期的配置文件 |
| DB | `mysql -e "SELECT VERSION();"` | 服务在跑、连得上、版本对 |
| 编码 | `[Console]::OutputEncoding` | UTF-8（无 BOM），中文不乱码 |

一条经验：**「装完怎么确认」永远和「怎么装」写在一起**。没有验证命令的安装步骤等于没装——你只是「以为」装好了。

## 明天继续

- 把个人博客部署到 外部托管平台。
- 把每天学习内容按标签沉淀下来。
- 继续把 Java / MySQL / Git 的实战命令整理成可复用模板。
