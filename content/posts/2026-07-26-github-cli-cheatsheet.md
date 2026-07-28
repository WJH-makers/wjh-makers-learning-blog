---
title: "GitHub CLI 速查 · 从建库到发布的全周期"
date: 2026-07-26
summary: "覆盖 gh 2.x 从安装认证、建库克隆、Issue 与 PR 全周期、Actions 观测、Release 发布到 Secret 管理与 gh api 兜底的高频命令,按「从创建到清理」的生命周期编排,每条附常见误用与破坏性警示。"
tags: [命令速查, GitHub, Git]
---


# GitHub CLI 速查 · 从建库到发布的全周期

> 基线:gh 2.x(命令按 2.96 实测校对,2.4+ 基本通用)。站内 Git 速查讲 git 本身,这份讲「和 GitHub 服务器打交道」——凡是以前要开浏览器点的,这里都有对应命令。命令默认作用于当前目录仓库,跨仓加 `-R OWNER/REPO`。

## 快速导航

| 阶段 | 一句话 |
|------|--------|
| 1、安装与认证 | 登一次,`git push` 也跟着免密 |
| 2、建库与克隆 | 本地目录直接变远程仓库 |
| 3、Issue 全周期 | 建、查、派、关,附带开分支 |
| 4、PR 全周期(建 / 审 / 改 / 合) | `--fill`、`checkout`、`--auto` 是省时核心 |
| 5、Actions 与工作流 | `gh run watch` 替代刷网页 |
| 6、Release 与制品 | 发版、传包、下包 |
| 7、Gist 与 Secret | 片段分享与 CI 凭据注入 |
| 8、仓库设置与删除 | 改配置、归档、⚠ 删库 |
| 9、gh api 万能出口 | gh 没封装的,REST/GraphQL 全走这里 |
| 常见错误速判 | 报错 → 病因 → 第一条命令 |
| 一页纸口诀 | 心智模型浓缩 |

## 1、安装与认证

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `winget install GitHub.cli`（或 `brew install gh`） | 安装 | apt 源版本常年落后;gh 无自升级命令 |
| `gh auth login` | 交互式登录(浏览器 OAuth) | 顺带配 git 协议;选 https 后 git 复用 gh 凭据,无需再配 PAT |
| `gh auth login --with-token < token.txt` | 用 PAT 非交互登录 | token 从 **stdin** 读;classic PAT 最小 scope:`repo`、`read:org`、`gist` |
| `gh auth setup-git` | 把 gh 注册为 git 凭据助手 | 让 `git push` 复用 gh token,换机第一步 |
| `gh auth status` | 看账号、主机、已授权 scope | 排查 401/404 第一条命令——多数「找不到仓库」是 scope 不够 |
| `gh auth refresh -s delete_repo` | 给现有登录追加 scope | 删库要 `delete_repo`、改 Actions 要 `workflow`;`-r` 反向收权 |
| `gh auth switch` | 多账号切当前活跃账号 | 切完 `gh auth status -a` 确认,别在错的号下建库 |
| `GH_TOKEN=xxx gh ...` | 用环境变量提供 token(CI 首选) | ⚠ **优先级高于登录态**:本地误设会静默覆盖登录账号,是「登录了却 401」头号原因 |

## 2、建库与克隆

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `gh repo create my-app --public --clone` | 建远程新库并克隆 | 非交互建库**必须**给 `--public`/`--private`/`--internal` 之一,否则退回交互 |
| `gh repo create --source=. --private --push` | 把当前本地仓库推成远程新库 | 省掉「网页建库 → 复制 URL → git remote add」三步;库名默认取目录名 |
| `gh repo create app --template org/tmpl --public` | 从模板仓库建库 | 默认只带默认分支,全部分支加 `--include-all-branches` |
| `gh repo clone OWNER/REPO -- --depth=1` | 克隆并透传原生 git 参数 | `--` 之后原样交给 `git clone`;克隆的若是 fork 会自动加 `upstream` 远程 |
| `gh repo fork OWNER/REPO --clone --remote` | fork 并克隆、加远程 | `--remote` 才会在已有本地仓库里加 remote;`--org` fork 到组织 |
| `gh repo set-default OWNER/REPO` | 指定本目录 gh 默认操作的仓库 | 多 remote 时 gh 拒绝猜测并报 `could not determine base repository`,这条是解药 |
| `gh repo sync -b main` | 把 fork 默认分支同步到上游 | ⚠ 加 `--force` 会**硬重置丢弃本地独有提交**;先 `git log HEAD..upstream/main` 确认 |
| `gh repo list OWNER -L 100 --no-archived` | 列某人/组织的仓库 | 默认只列 30 条;配 `--json nameWithOwner,visibility` 便于盘点 |

## 3、Issue 全周期

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `gh issue create -t "标题" -b "正文"` | 建 Issue | 两 flag 都给才完全非交互;`-F -` 从 stdin 读正文,`-T 模板名` 套模板 |
| `gh issue list -l bug -a @me -S "in:title 崩溃"` | 按标签/负责人/搜索语法过滤 | `-s all` 才含已关闭;`@me` 是通用「我自己」占位符;`-S` 用 GitHub 搜索语法 |
| `gh issue view 42 -c` | 看正文连评论 | 终端里 Markdown 会渲染,代码块可直接复制 |
| `gh issue develop 42 --checkout` | **从 Issue 直接开关联分支并切过去** | 网页要点三次;分支与 Issue 建链接,PR 合并时自动闭环 |
| `gh issue edit 42 --add-label P0 --remove-label triage` | 改标签/里程碑/负责人 | 标签名不存在会直接报错而非自动创建,先 `gh label list` |
| `gh issue close 42 -r "not planned"` | 关闭并写原因 | `-r` 只接受 `completed`/`not planned`/`duplicate`;**含空格必须引号** |
| `gh issue delete 42` | ⚠ **彻底删除 Issue** | 不可恢复,评论与关联全没。安全替代:`gh issue close 42 -r "not planned"` |

## 4、PR 全周期(建、审、改、合)

**① 建 / 推**

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `gh pr create --fill` | **用 commit 信息自动填标题正文,零交互开 PR** | ⭐ gh 相比网页最省时的一条:分支未推会自动推、需要时自动 fork |
| `gh pr create --fill-first` | 只取**第一个** commit 的标题+正文 | 分支多个杂乱 commit 时比 `--fill` 干净;`--fill-verbose` 铺全部 commit |
| `gh pr create -B develop -H feature/x -r alice -l feat -d` | 指定目标/源分支、评审人、标签、草稿 | 评审人 handle 写错会整条失败;团队写 `org/team`;草稿用 `gh pr ready` 转正 |
| 正文写 `Fixes #123` | 合并时自动关闭 Issue | 只认 `Fixes/Closes/Resolves #N`,写「修复 #123」不触发 |
| `gh pr status` | 一屏看:我提的 / 待我审的 / 当前分支的 PR | 每天开工第一条命令,比刷通知快 |

**② 审 / 改**

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `gh pr checkout 128` | **把别人的 PR 分支拉到本地并切过去** | ⭐ 免手动 `git fetch origin pull/128/head`;来自 fork 的也一条命令搞定 |
| `gh pr checkout 128 -f` | 强制重置本地分支 | ⚠ `-f` **丢弃该分支所有未推送提交**;改过东西先 `git stash` |
| `gh pr diff 128 --name-only` | 终端看 diff | `--name-only` 先看改动面,`--patch` 出标准 patch,`-e "*.lock"` 排噪声 |
| `gh pr checks 128 --watch` | 看/盯该 PR 的 CI | `--watch` 阻塞到跑完,`--required` 只看必需检查 |
| `gh pr review 128 --approve -b "LGTM"` | 批准 | 不能批准自己的 PR(422);`--request-changes`/`--comment` **必须带正文** |
| `gh pr edit 128 --add-reviewer bob -B main` | 改评审人/标签/目标分支 | 改 base 会重算 diff、可能卷进无关提交,改完看 `gh pr diff --name-only` |

**③ 合 / 善后**

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `gh pr merge 128 --squash -d` | 压缩合并并删本地+远程分支 | 最常用组合;`-d` 删**两边**分支,本地有未推送提交会被带走 |
| `gh pr merge 128 --merge` / `--rebase` | 合并提交 / 变基合并 | 三选一必须显式给;仓库禁用了对应策略会返回 405 |
| `gh pr merge 128 --auto --squash` | **满足条件后自动合并** | ⭐ CI 绿+批准齐了服务端自动合;需仓库开启 auto-merge,`--disable-auto` 取消 |
| `gh pr merge 128 --admin` | ⚠ 管理员绕过分支保护强合 | **跳过必需检查与评审直接合入 main**。安全替代:`--auto` 等它自然满足 |
| `gh pr close 128` / `gh pr reopen 128` | 关闭(不合并)/ 重开 | close 加 `-d` 同时删分支;重开前提是分支还在 |

## 5、Actions 与工作流

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `gh run list -w ci.yml -b main -s failure` | 运行记录 | 默认 20 条;`-u @me` 只看我触发的 |
| `gh run watch --exit-status` | **阻塞等待运行结束并实时刷新** | ⭐ 推完代码不用刷网页;`&& ./deploy.sh` 可串流水线,`--compact` 只显示相关/失败步骤 |
| `gh run view <id> --log-failed` | **只看失败步骤日志** | 排障最高频:从几万行里直接切出错段落;`--log` 是全量,重定向到文件再看 |
| `gh run rerun <id> --failed` | 只重跑失败的 job(含依赖) | 比整条重跑省时省配额;`-d` 带调试日志重跑 |
| `gh run rerun <id> -j <job-id>` | 重跑指定 job | ⚠ 浏览器 URL 里 `/jobs/<数字>` **不是**这里要的 ID(会 404);用 `--json jobs --jq '.jobs[].databaseId'` 取真 ID |
| `gh run download <id> -n dist -D ./out` | 下载 artifact | 不给 `-n/-p` 会下载**全部** artifact,注意体积 |
| `gh workflow run deploy.yml -f env=prod --ref release/1.2` | **手动触发工作流** | 工作流必须声明 `on: workflow_dispatch`;不给 `--ref` 用默认分支版本,最易翻车 |
| `gh workflow disable ci.yml` / `enable` | 临时停用/启用工作流 | 重构期关掉噪声 CI 的正解,比注释 yml 干净 |
| `gh cache delete <key>` | 删 Actions 缓存 | ⚠ `--all` 清空全部会让下次构建全量拉依赖、CI 时长翻倍 |

## 6、Release 与制品

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `gh release create v1.2.0 --generate-notes` | 建 Release 并**自动生成变更日志** | 由 Release Notes API 按 PR 标题聚合;未给 `-t` 时标题也自动生成 |
| `gh release create v1.2.0 dist/*.jar` | 建 Release 并上传制品 | ⚠ **tag 不存在时自动从默认分支 HEAD 建 tag**——「发到错提交」的常见根因 |
| `gh release create v1.2.0 --verify-tag` | tag 不存在则直接中止 | 想要「先 git tag 再发版」就固定加它;`--target <SHA/分支>` 指定建 tag 位置 |
| `gh release create v1.2.0 -F CHANGELOG.md -d -p` | 正文来自文件、草稿、预发布 | `-F -` 读 stdin;`--latest=false` 补发旧版热修时必加,否则会拽回 Latest 指针 |
| `gh release upload v1.2.0 app.jar --clobber` | 向已有 Release 追加/替换资产 | ⚠ `--clobber` 是**先删后传**,上传中断会导致原资产也没了 |
| `gh release download v1.2.0 -p '*.jar' -D ./libs` | 下载资产 | 不给 tag 取最新;`-A tar.gz` 下源码归档,`-O -` 写到 stdout |
| `gh release edit v1.2.0 --draft=false` | 草稿转正式发布 | 发布瞬间才推送订阅通知;也可 `--latest`、`--prerelease` 改状态 |
| `gh release delete v1.2.0 --cleanup-tag -y` | ⚠ 删 Release **并连 tag 一起删** | 被依赖的 tag 消失会打断下游构建。安全替代:先 `--draft=true` 下架观察 |

## 7、Gist 与 Secret

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `gh gist create snippet.java -d "示例"` | 创建 gist | ⚠ **默认 secret(未公开列出)而非 private**——凭 URL 谁都能看,别存敏感信息 |
| `cmd \| gh gist create - -f log.txt` | 从 stdin 建 gist | `-` 读标准输入,`-f` 指定文件名;不给 `-f` 会失去语法高亮 |
| `gh gist edit <id>` / `gh gist clone <id>` | 编辑 / 当仓库克隆 | gist 本身就是 git 仓库;`gh gist delete <id>` 无回收站无确认,慎用 |
| `gh secret set API_TOKEN < token.txt` | 设仓库级 Actions Secret | 不给 `-b` 时从 **stdin** 读,避免明文进 shell history |
| `gh secret set -f .env` | 从 dotenv 批量导入 | ⚠ 会把文件里**所有**键都推上去,导入前先删本地调试键 |
| `gh secret set DEPLOY_KEY -e production` | 设环境级 Secret | 需 workflow 里声明 `environment: production` 才可见,「设了却读不到」多半是这个 |
| `gh secret set X -a dependabot` | 指定应用域 | Actions / Dependabot / Codespaces 的 Secret **相互隔离**,跨域读不到 |
| `gh secret list` | 列 Secret 名与更新时间 | 只能看名字,**值永远读不回来**(单向加密),忘了值只能覆写 |
| `gh variable set APP_ENV -b prod` | 设 Actions 变量 | ⚠ Variable **明文可读**(`gh variable get` 能取回),凡密钥一律走 secret |

## 8、仓库设置与删除

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `gh repo edit -d "描述" -h https://ex.com --add-topic java,spring` | 改描述/主页/topic | 不带仓库参数改的是当前仓库;topic 会被服务端静默转小写 |
| `gh repo edit --default-branch main` | 改默认分支 | 改前该分支须已存在于远程;开着的 PR 的 base 不会自动跟着变 |
| `gh repo edit --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false` | 只允许 squash 合并 | 布尔 flag 支持 `=false`;三种全关会导致 PR 无法合并 |
| `gh repo edit --delete-branch-on-merge --enable-auto-merge` | 配 PR 流水线 | 新建仓库后立刻跑一遍,省掉后续每个 PR 的手工收尾 |
| `gh repo edit --visibility private --accept-visibility-change-consequences` | ⚠ 改可见性 | public→private 会**丢失 star/watch/fork 关系与 Actions 免费额度**,须显式加长确认 flag |
| `gh repo archive OWNER/REPO -y` | 归档仓库(转只读) | **99% 的「想删库」应该用这条**:内容/Issue/PR 全保留只是不可改,随时可取消 |
| `gh repo delete OWNER/REPO --yes` | ⚠⚠ **删除仓库** | **不可逆**:代码/Issue/PR/Release/Wiki/Actions 全消失。需 `delete_repo` scope,缺了报 **404 而非 403** |

## 9、gh api 万能出口

> gh 没封装的都从这里出。`{owner}`/`{repo}` 是占位符,gh 用当前仓库自动替换,脚本可跨仓复用。

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `gh api repos/{owner}/{repo}` | 调 REST API | `-X PATCH`/`--method DELETE` 指定方法;`--jq .field` 取字段(内置 jq,数组用 `.[]`) |
| `gh api .../issues --paginate` | 自动翻页拉全量 | 不加默认只 30 条,是「数据莫名变少」头号原因;`--slurp` 把多页合并成数组 |
| `gh api -f k=v` **对比** `gh api -F k=v` | **传参关键区别** | ⚠ 反直觉:小写 `-f/--raw-field` 一律当**字符串**;大写 `-F/--field` 才做**类型转换**(true/false/数字)并支持 `@file`。设布尔用 `-f private=true` 会传成字符串导致 422 |
| `gh api graphql -f query='...' -F n=repo` | 调 GraphQL | 变量用 `-F`(要类型),查询串用 `-f`;REST 拿不到的(Discussion、Project V2)只能走这里 |
| `gh api rate_limit --jq .rate` | 查 API 配额 | 突然大面积 403 先看这里;`--paginate` 很容易把配额跑光 |
| `gh api -i .../repo` | 打印含响应头 | 排查限流(`x-ratelimit-*`)的第一手证据;`--verbose` 出完整请求响应 |
| `gh alias set prs 'pr list -A @me -s all'` | 把常用组合存成别名 | `--shell` 可包 shell 命令;别名存在 gh 配置里,换机要同步 |

## 常见错误速判

| 症状 | 多半是 | 先试这条 |
|------|--------|----------|
| `could not determine base repository` | 不在仓库内,或多 remote 让 gh 无法确定目标 | `gh repo set-default OWNER/REPO` |
| 明明登录过却 `401 Bad credentials` | 环境变量 `GH_TOKEN`/`GITHUB_TOKEN` 覆盖了登录态,或 PAT 过期 | `gh auth status`;再清 `GH_TOKEN`(PS:`Remove-Item Env:GH_TOKEN`) |
| 私有仓库操作报 `404 Not Found` | 不是不存在,而是 **token scope 不够**——无权限资源统一返回 404 | `gh auth status` 看 scope,再 `gh auth refresh -s repo`(删库 `-s delete_repo`) |
| `gh pr create` 报须在非默认分支 | 当前还在 main/master | `git switch -c feature/x && git push -u origin HEAD` |
| `gh pr merge` 报 405 | 仓库禁用了你选的合并方式 | `gh repo view --json squashMergeAllowed,mergeCommitAllowed,rebaseMergeAllowed` |
| `gh run rerun -j <id>` 返回 404 | 用了浏览器 URL 里 `/jobs/` 后的数字 | `gh run view <id> --json jobs --jq '.jobs[].databaseId'` 取真 ID |
| workflow 里 secret 读到空值 | 设成环境/组织级但未授权本仓库,或落在别的应用域 | `gh secret list` 与 `gh secret list -e <env>` 对比 |
| `gh release` 把版本发到错的提交 | tag 不存在时 gh 自动从默认分支 HEAD 建了 tag | 删掉重发并固定加 `--verify-tag`(或 `--target <SHA>`) |
| 列表结果明显偏少 | 默认上限:list 30、run 20、gist 10、api 每页 30 | 加 `-L 100`,`gh api` 加 `--paginate` |

## 一页纸口诀

1. **认证一次,git 也通**:`gh auth login` → `gh auth setup-git`,从此不再手贴 PAT。
2. **404 常常不是「没有」,是「没权限」**:先 `gh auth status` 看 scope,再 `gh auth refresh -s`。
3. **提 PR 别手写标题**:`gh pr create --fill`(commit 乱就 `--fill-first`),推分支、开 PR 一步到位。
4. **审代码别开网页**:`gh pr checkout N` 把 PR 拉到本地跑起来,fork 来的也一样。
5. **CI 别刷页面**:`gh run watch --exit-status` 阻塞到出结果,失败直接 `gh run view --log-failed` 切日志。
6. **几乎每条命令都能 `-R owner/repo`**:不必先 cd 进仓库,跨仓批处理靠它。
7. **`--json` + `--jq` 是 gh 的管道口**:脚本化前先跑一次 `--json` 不带参数看有哪些字段。
8. **gh 没封装的,`gh api` 一定有**:记住反直觉的 `-f` 传字符串、`-F` 才带类型。
9. **删库前先想归档**:`gh repo archive` 保留一切且可撤销;`gh repo delete` 一去不回。
