---
title: "Node 工具链速查 · npm / pnpm 全周期"
date: 2026-07-26
summary: "按从建项目到发布清理的全生命周期速查 Node 工具链:版本管理、依赖与锁文件、脚本、调试、node --test、发布与审计。npm 与 pnpm 命令对照,讲透 ci 与 install 之别与 pnpm 硬链接省空间。基线 Node 22/24、npm 11、pnpm 10。"
tags: [命令速查, Node.js, npm]
---


# Node 工具链速查 · npm / pnpm 全周期

> 基线:Node 22 LTS / 24,npm 11,pnpm 10。命令按生命周期排,npm 与 pnpm 双写,标 ⚠ 者不可逆,版本敏感处已注明适用范围。

## 快速导航

| 阶段 | 一句话 |
|------|--------|
| 命令对照 | npm ↔ pnpm 等价命令一览,两边都会遇到 |
| 1、版本管理 | nvm / mise / corepack 切 Node 与包管理器 |
| 2、创建项目 | init 脚手架与 package.json 关键字段 |
| 3、安装与锁文件 | install vs ci,pnpm 硬链接省空间原理 |
| 4、运行与脚本 | run / start / node --run 与参数透传 |
| 5、开发调试 | --watch 热重载、--inspect 断点 |
| 6、测试 | node --test 内置测试器与覆盖率 |
| 7、构建与发布 ⚠ | pack 预演、publish 与 dist-tag(误发不可撤) |
| 8、审计与升级 | audit / outdated / update 与 semver |
| 9、缓存与清理 | cache verify、store prune、清 node_modules |
| 10、monorepo | workspaces 与 pnpm --filter |
| 常见错误速判 | 症状 → 病因 → 先试这条 |
| 一页纸口诀 | 心智模型浓缩 |

## 命令对照 · npm ↔ pnpm(先记这张)

| 场景 | npm | pnpm |
|------|-----|------|
| 装全部依赖 | `npm install` | `pnpm install` |
| CI 严格可复现 | `npm ci` | `pnpm install --frozen-lockfile` |
| 加生产依赖 | `npm i <pkg>` | `pnpm add <pkg>` |
| 加开发依赖 | `npm i -D <pkg>` | `pnpm add -D <pkg>` |
| 全局安装 | `npm i -g <pkg>` | `pnpm add -g <pkg>` |
| 卸载 / 升级 | `npm rm <pkg>` / `npm update` | `pnpm remove <pkg>` / `pnpm update` |
| 跑脚本 | `npm run build` | `pnpm build` |
| 一次性 CLI | `npx <pkg>` | `pnpm dlx <pkg>` |
| 审计 / 发布 | `npm audit` / `npm publish` | `pnpm audit` / `pnpm publish` |

> pnpm 在 CI 环境(检测到 `CI=true`)默认即按 `--frozen-lockfile` 行为,和 `npm ci` 一样把 lock 当只读契约。

## 1、版本管理(nvm / mise / corepack)

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `nvm install --lts` / `nvm use 22` | 装 / 切 Node(nvm-sh,类 Unix) | ⚠ nvm-windows 是**另一套**:`nvm install 22.11.0` + `nvm use 22.11.0`,不支持 `--lts` |
| `nvm alias default 22` | 设默认版本 | 新终端才生效;放 `.nvmrc`(仅版本号)后 `nvm use` 自动读 |
| `nvm ls` / `nvm ls-remote` | 列本地 / 可装版本 | Windows 版对应 `nvm list` / `nvm list available` |
| `mise use node@22` / `-g node@lts` | mise 项目 / 全局钉版本 | `cd` 进带 `.mise.toml` 的目录自动切;兼容 `.nvmrc`;`mise install` 按配置补齐 |
| `corepack enable` | 激活 pnpm / yarn 垫片 | Node 自带但默认不启用;个别 / 未来版本或需单独装,先 `corepack -v` 验 |
| `corepack use pnpm@10` | 钉包管理器版本 | 写 `packageManager: "pnpm@10.x"` 进 package.json,团队统一 |

## 2、创建项目与 package.json

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `npm init -y` | 生成默认 package.json | 不带 `-y` 走交互问答;`npm init` == `npm create` |
| `npm init vite@latest` | 用脚手架建项目 | == `npm create vite@latest`(pnpm 侧 `pnpm create vite`);`@latest` 拉最新,不吃旧缓存 |
| `npm pkg set scripts.dev="node --watch src/x.js"` | 改字段 | 支持点路径,比手编 JSON 稳;`npm pkg get` 读、`npm pkg delete` 删 |
| `npm version patch` / `minor` / `major` ⚠ | 升版本号 | ⚠ 默认会 `git commit` + 打 tag,要求工作区干净;`--no-git-tag-version` 只改文件 |

**package.json 关键字段(踩坑高发区)**

| 字段 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `"type": "module"` | 决定 `.js` 按 ESM 还是 CommonJS 解析 | 缺省 commonjs;设 module 后 `require` 不可用,得用 `import` 或改 `.cjs` |
| `"exports"` | 定义包入口与条件导出 | 一旦设置,未列出的内部路径外部**无法 import**,比 `main` 严格 |
| `"engines": {"node": ">=22"}` | 声明 Node 版本要求 | 默认只警告;`.npmrc` 里 `engine-strict=true` 才真拦截 |
| `"files": ["dist"]` | 白名单:发布带哪些文件 | 宁用白名单,避免误发源码 / `.env` / 密钥 |
| `"private": true` | 禁止发布 | ⚠ 内部项目务必加,防手滑 `npm publish` 外泄 |

## 3、依赖安装与锁文件

> 锁文件必须提交进 git:npm → `package-lock.json`,pnpm → `pnpm-lock.yaml`。它是"换机 / 上线装到同一份依赖"的唯一保证。

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `npm install` / `npm i` | 装全部,按需更新锁文件 | 复用已有 node_modules;**可能改写 lock**,提交前 `git diff` 看一眼 |
| `npm ci` | 干净可复现安装(CI 首选) | ⚠ 先删整个 node_modules;要求 lock 存在且与 package.json 一致,否则报错;绝不改写 lock;不能只装单包 |
| `npm i -D <pkg>` / `npm i -E <pkg>` | 加开发依赖 / 锁精确版本 | `-D`==`--save-dev`;`-E`==`--save-exact`(去掉 `^`) |
| `npm i -g <pkg>` | 全局安装 | ⚠ 全局包不进任何 lock,换机不可复现;能放 devDeps 就别全局 |
| `pnpm install --frozen-lockfile` | 等价 `npm ci` | lock 需改动即报错;CI 里默认就是这行为 |
| `npm rm <pkg>` / `pnpm remove <pkg>` | 卸依赖 | 同步更新 lock |
| `npm i --omit=dev` / `pnpm i --prod` | 只装生产依赖 | `--omit=dev` 取代旧 `--production` |

**npm ci vs npm install(务必分清)**

| 维度 | `npm install` | `npm ci` |
|------|---------------|----------|
| 锁文件 | 不存在会生成,不一致会改写 | 必须存在;不一致直接**报错退出** |
| node_modules | 增量复用 | 先整包删除再装 |
| 写回 lock | 会 | 绝不 |
| 能否装单包 | 能 `npm i x` | 不能 |
| 用途 | 本地开发、加 / 改依赖 | CI/CD、Docker 构建、要可复现 |

一句话:开发用 `install`,流水线用 `ci`。lock 和 package.json 对不上时,`ci` 把问题拦在构建期,而不是让线上偷偷装了别的版本。

**pnpm 硬链接为什么省空间**

- npm / yarn 经典布局:每个项目把依赖文件**各复制一份**进自己的 node_modules,100 个项目就有 100 份 lodash,占盘且扁平提升易生"幽灵依赖"。
- pnpm 用**全局内容寻址仓库**(`pnpm store path` 查位置),按文件内容哈希只存一份。安装时从仓库向项目 `node_modules/.pnpm` 建**硬链接**——硬链接只是指向同一份磁盘数据的另一个目录项,不复制数据。于是同版本包全盘只占一份,新项目安装近乎"零增量";顶层再用软链接指进 `.pnpm`,非扁平结构顺带**杜绝幽灵依赖**。
- ⚠ 坑:硬链接要求仓库与项目在**同一磁盘分区**。Windows 上 store 在 `C:`、项目在 `D:` 会退化为复制,省空间失效——在 `.npmrc` 里把 `store-dir` 设到与项目同盘即可。

## 4、运行与脚本

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `npm run` / `npm run <script>` | 列脚本 / 执行 scripts | 不带名列全部;`node_modules/.bin` 自动进 PATH,可直接写 `tsc` / `eslint` |
| `npm run <s> -- --flag` | 向脚本透传参数 | ⚠ 必须加 `--` 分隔,否则参数被 npm 自己吃掉 |
| `node --run <script>` | Node 22+ 原生跑脚本 | 比 npm run 快;但**不执行 pre/post 脚本**,迁移前确认没依赖 `prexxx` |
| `pnpm <script>` | pnpm 可省略 run | 仅当脚本名不与 pnpm 子命令冲突;冲突时用 `pnpm run <script>` |
| `npx <pkg>` / `pnpm dlx <pkg>` | 不装直接跑一次性 CLI | npx 优先用本地已装版本;要强制最新加 `@latest` |

> 跨平台设环境变量别直接写 `NODE_ENV=prod cmd`(Windows 不认),用 `cross-env` 或 `node --env-file=.env`。

## 5、开发调试(--watch、inspect)

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `node --watch app.js` | 文件变更自动重启 | Node 22 起稳定(20 为实验);替代 nodemon 的多数场景;`--watch-path=./src` 限目录 |
| `node --env-file=.env app.js` | 启动时加载 .env | 免装 dotenv;`--env-file-if-exists` 缺文件不报错(Node 22.9+) |
| `node --inspect app.js` | 开调试端口 9229 | 浏览器开 `chrome://inspect`,或 VS Code attach |
| `node --inspect-brk app.js` | 第一行即断点等待 | 调试启动早期逻辑必用,否则没接上就跑完了 |
| `node --inspect=0.0.0.0:9229 app.js` ⚠ | 对外暴露调试口 | ⚠ 调试口 = 任意代码执行,绝不可暴露公网 / 生产;仅本机或内网 |

## 6、测试(node --test)

> Node 20+ 内置测试器,无需 Jest / Mocha:`import { test } from 'node:test'`,断言用 `import assert from 'node:assert/strict'`。

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `node --test` | 跑测试(自动发现) | 默认匹配 `*.test.js`、`*.spec.js`、`test/` 下文件等命名 |
| `node --test --watch` | 改动重跑 / 跑指定文件 | 传文件路径可只跑单个;本地 TDD 循环 |
| `node --test-name-pattern="登录"` | 按用例名过滤 | 正则匹配 test / it 的名字 |
| `node --test-reporter=spec` | 选报告格式 | 可选 `spec` / `tap` / `dot` / `junit`;`--test-reporter-destination` 输出到文件 |
| `node --experimental-test-coverage` | 覆盖率(实验) | ⚠ 仍是实验特性,开关 / 输出随版本变,以 `node --help` 为准 |
| `node --test-shard=1/3` | 分片跑(CI 并行) | 三台机各跑一片,加速大测试集 |

## 7、构建与发布 ⚠(误发不可撤)

> ⚠ 发布是最危险的一步:版本号一旦推上 registry **基本不可撤**,密钥若随包发出即视为泄露。发前一律先 `--dry-run` + `npm pack` 核对内容。

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `npm pack --dry-run` / `npm pack` | 预演打包内容 / 生成 `.tgz` 不发布 | ⚠ 发布前必跑,核对没把 `.env` / 密钥带进去;可本地 `npm i ./x.tgz` 验证 |
| `npm publish --dry-run` | 预演发布全过程 | 不真上传,查权限 / 文件 / 版本 |
| `npm publish` ⚠ | 发布到 registry | ⚠ 版本发出**基本不可撤**;发前查 `npm whoami`、版本未被占、`files` / `private` 正确 |
| `npm publish --access public` | 发布 scoped 包为公开 | `@scope/x` 默认私有,开源必须显式 public |
| `npm publish --tag beta` | 发预发布版到 beta 标签 | 不动 `latest`,用户需 `npm i x@beta` 才拿到;稳了再 promote |
| `npm dist-tag add <pkg>@1.2.3 latest` | 移动 latest 指向 | 误发**补救**:把 latest 指回旧稳定版(但坏版本仍在) |
| `npm deprecate <pkg>@"<1.0" "msg"` | 标记废弃(不删包) | 安装时给用户警告;比 unpublish 温和,官方推荐 |
| `npm unpublish <pkg>@1.2.3` ⚠ | 撤回某版本 | ⚠ 仅发布 72h 内基本可撤,超时几乎删不掉;撤已被依赖的版本会连累下游 |

误发补救优先级:`deprecate` + 发新修订版 > `dist-tag` 挪 `latest` > `unpublish`(下策,且常做不到)。密钥一旦发出就当已泄露,**立即轮换**,别指望删包。

## 8、依赖审计与升级

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `npm outdated` / `pnpm outdated` | 列可升级依赖 | 三列:current / wanted(符合范围)/ latest(最新) |
| `npm update` / `pnpm update` | 升到符合范围的最新 | 只在 `^` / `~` 范围内动,不跨大版本;npm 不改 package.json 的范围声明 |
| `pnpm up -L` | 升到最新(忽略范围) | ⚠ 会跨大版本并改 package.json;升完必测 |
| `npm i <pkg>@latest` | 精确升单个到最新 | 跨大版本升级的标准做法 |
| `npm audit` / `pnpm audit` | 扫已知漏洞 | 读 lock 比对漏洞库;有误报,看 severity 与是否可达 |
| `npm audit fix` | 自动升到安全的兼容版本 | 只在 semver 范围内修,较安全 |
| `npm audit fix --force` ⚠ | 强修(允许破坏性升级) | ⚠ 会装 semver-major,可能直接改坏构建;跑完必全量测试 |
| `npm explain <pkg>` / `pnpm why <pkg>` | 查某包为何被装 | 定位是哪个上游拖进来的间接依赖;`npm audit signatures` 可校验包签名 |

**semver 小抄**:`^1.2.3` 锁大版本、允许 `1.x` 内升(常见默认);`~1.2.3` 只允许 `1.2.x` 补丁;`1.2.3` 精确;`*` / `latest` 危险别用于库依赖。⚠ 特例:`^0.2.3` 只允许 `0.2.x`——0 版每个 minor 视为破坏性。

## 9、缓存与清理

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `npm cache verify` | 校验并清理缓存 | 日常首选;缓存自愈,一般无需手动清 |
| `npm cache clean --force` ⚠ | 强清缓存 | ⚠ npm5+ 缓存自愈,官方不建议清;必须 `--force` 才执行,清了只是下次重下 |
| `pnpm store path` / `pnpm store prune` | 查仓库位置 / 删无人引用的包 | 排查跨盘退化时看 path;prune 是安全的空间回收,不影响现有项目 |
| 删 node_modules 重装 | 疑难杂症"万能重启" | `rm -rf node_modules && npm ci`(Windows PowerShell:`Remove-Item -Recurse -Force node_modules`) |

> 依赖装乱了,先删 node_modules 用 `npm ci` **照 lock** 重装;只有确认 lock 本身坏了才删 lock。清缓存解决不了"装错依赖"。

## 10、monorepo(workspaces)

> npm 在 package.json 写 `"workspaces": ["packages/*"]`;pnpm 用根目录 `pnpm-workspace.yaml` 列 `packages:`。二者语义相近但过滤命令差别大。

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `npm init -w packages/a` | 新建子包并登记 | 自动加进 workspaces |
| `npm i <pkg> -w <ws>` | 给指定子包装依赖 | `-w` == `--workspace`(选**某个**工作区) |
| `npm run build --workspaces` | 跑所有子包同名脚本 | `--workspaces` == `-ws`;配 `--if-present` 跳过无该脚本的包;单包用 `-w <ws>` |
| `pnpm -r build` | 递归所有子包跑脚本 | `-r` == `--recursive` |
| `pnpm --filter <pkg> build` | 只跑某包 | `-F` 简写,支持 glob;`<pkg>...` 含依赖,`...<pkg>` 含依赖者 |
| `pnpm add <pkg> -w` | 装到 workspace 根 | ⚠ pnpm 的 `-w`==`--workspace-root`,与 npm 的 `-w`(选某工作区)**语义相反**,别记串 |
| 内部互引 `"workspace:*"` | 引用本仓其它子包 | pnpm 协议,发布时自动替换成真实版本号 |

## 常见错误速判

| 症状 | 多半是 | 先试这条 |
|------|--------|----------|
| `npm ci` 报 "lock file out of sync" | package.json 改了没更新 lock | 本地 `npm install` 再提交新 lock,别在 CI 用 install 绕过 |
| `Cannot find module 'xxx'` | 没装 / 装到别的工作区 / 幽灵依赖 | `npm ls xxx` 看有没有、在哪;缺就显式 `npm i xxx` |
| `ERR_REQUIRE_ESM` / import 报错 | `type: module` 与 `require` 混用 | 统一 ESM,或把该文件改 `.cjs` / `.mjs` |
| 脚本参数没生效 | 忘了 `--` 分隔 | `npm run x -- --flag` |
| pnpm 装完某包"没编译" / 缺二进制 | pnpm 10 默认不跑依赖 build 脚本 | `pnpm approve-builds`,或 package.json 加 `onlyBuiltDependencies` |
| pnpm 不省空间 / 装得慢 | store 与项目跨盘,硬链接退化为复制 | `.npmrc` 设 `store-dir` 到项目同一分区 |
| `EACCES` 全局装失败 | 全局目录权限,或 sudo 装乱了 | 改用 nvm / mise 接管,别 `sudo npm -g` |
| 换台机器行为不一致 | 依赖靠全局装 / 没提交 lock | 依赖进 devDeps + 提交 lock,用 `npm ci` |
| `command not found: pnpm` | corepack 没启用 | `corepack enable` 激活垫片 |

## 一页纸口诀

- 开发 `install`,流水线 `ci`;lock 必进 git,对不上就让 `ci` 报错,别让线上偷装别的版本。
- pnpm 省空间靠**全局仓库 + 硬链接**:同版本全盘一份;但跨盘会退化成复制。
- npm 的 `-w` 是"选某工作区",pnpm 的 `-w` 是"装到根"——语义相反,别记串。
- 传参给脚本要 `--` 分隔;`node --run` 快但不跑 pre/post 钩子。
- `--watch` 热重载、`--inspect-brk` 早断点、`--env-file` 免 dotenv,内置够用先别急上工具。
- 测试用 `node --test`,过滤 `--test-name-pattern`,CI 分片 `--test-shard`。
- 发布前先 `--dry-run` + `npm pack` 核文件;版本发出**基本不可撤**,内部包加 `"private": true`。
- 误发补救:`deprecate` + 发修订版 > 挪 `dist-tag` > `unpublish`(下策);密钥发出即泄露,立刻轮换。
