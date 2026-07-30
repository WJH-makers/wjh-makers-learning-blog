# 咖啡站技术志

这是一个以 Docker 部署到自有云服务器的技术学习站，用原创漫画和可验证代码记录 Java、工程与系统实践。GitHub Actions 负责验证并发布 `production` 引用，服务器定时拉取已通过测试的提交。

> 隐私说明：部署时请使用自己的私有仓库与独立项目名；不要在公开文档中暴露账户、仓库地址、服务器地址或管理员令牌。

## 技术栈

- Next.js App Router
- TypeScript
- Newsprint 报纸风格界面：强网格、无圆角、衬线标题、清晰主次按钮
- BlockNote 块编辑器：`@blocknote/react` + `@blocknote/core` + `@blocknote/mantine`
- 本地 Markdown 只读内容：`content/posts/*.md`
- 线上云数据库写入：MongoDB Atlas M0 Free Cluster
- 无 ORM / 无 CMS：只使用 MongoDB 官方 Node.js Driver 直连
- MongoDB 连接池同时兼容长驻 Node 进程与 Vercel Functions

## 常用命令

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run audit:reader
npm run deploy:doctor
npm run post:new -- "今天学到的主题" --tags="Java, MySQL, 复盘"
```

## 为什么之前不能在网页里直接写心得？

之前这个博客是纯静态 Markdown 架构：

- 文章只从 `content/posts/*.md` 读取。
- 没有云数据库驱动。
- 没有 Server Action 写入入口。
- 容器文件系统和 Vercel 文件系统都不应当作持久写入空间，网页表单不能直接把 Markdown 永久写回仓库。

现在新增了 MongoDB Atlas 云数据库写入链路：配置 `MONGODB_URI` 后，打开 `/write` 就能把每天心得写入 `learning_posts` collection。

## 网页写作入口设计

`/write` 是唯一的线上写作入口，目标是每天能快速写、快速发、快速复盘：

- **直连**：Next.js Server Action 直接调用 MongoDB 官方 Node.js Driver，不引入 ORM、CMS 或额外后台。
- **连接池**：长驻容器复用 `MongoClient`；在 Vercel Functions 中也会交给 `attachDatabasePool` 管理生命周期。
- **安全**：必须输入 `BLOG_ADMIN_TOKEN`，真实 token 只放在服务器 `.env` 或本机 `.env.local`，不进 Git。
- **可诊断**：页面会 ping MongoDB，并提示 `MONGODB_URI`、Atlas 用户和 Network Access 是否需要检查。
- **块编辑**：正文使用 BlockNote，发布前自动转换成 Markdown 存入 MongoDB，数据库结构不变。
- **知识卡片模板**：默认按「概念 / 为什么重要 / 核心知识点 / 示例命令代码 / 易错点 / 练习验证 / 明天继续」生成。
- **本地草稿**：浏览器 `localStorage` 自动保存，key 为 `wjh-learning-blog:write-draft:v1`。
- **极简发布**：主动作保持「发布今日心得」，发布前会确认“写入 MongoDB 并公开到首页/文章/标签/RSS”。

## `/write` 写作技巧

新版写作台不是 CMS，而是一张“知识卡片”编辑桌。推荐这样用：

1. **先写标题**：标题用“今天真正掌握了什么？”来写，不写流水账。
2. **用 `/` 快速插块**：在正文里输入 `/`，插入标题、列表、代码块、任务项。
3. **一段只讲一个概念**：每个 `##` 小节回答一个问题，避免把过程和结论混在一起。
4. **代码和命令放进代码块**：关键命令、报错、SQL、Java 片段都放代码块，后续复盘更快。
5. **用任务项做验证清单**：把“跑过构建/测试/命令”写成勾选项，避免只写感受。
6. **先保存草稿再发布**：草稿只存在当前浏览器；换设备不会同步。
7. **发布前看 Markdown 输出**：右侧展开“Markdown 输出检查”，确认会写入 MongoDB 的正文。
8. **标签少而稳定**：标签用英文逗号分隔，例如 `Java, MySQL, 复盘`，不要每天造新标签。

## MongoDB Atlas 免费云数据库配置

推荐使用 MongoDB Atlas 的 **M0 Free Shared Cluster**，足够支撑个人博客/学习日志。

1. 打开 <https://www.mongodb.com/products/platform/atlas-database> 并创建免费账号。
2. 新建一个 **M0 Free** cluster。
3. 在 **Database Access** 创建数据库用户，权限选择当前库 `readWrite`。
4. 在 **Network Access** 添加允许访问来源。
   - 自有服务器优先只放行服务器固定出口 IP，不要长期开放 `0.0.0.0/0`。
   - 若使用无固定出口 IP 的 Serverless 预览环境，应单独评估网络边界，并继续使用强数据库密码和 `BLOG_ADMIN_TOKEN`。
5. 在 **Connect → Drivers → Node.js** 复制连接字符串。
6. 在服务器 `.env`（或托管平台的 Environment Variables）添加：

```text
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/learning_blog?retryWrites=true&w=majority
MONGODB_DB_NAME=learning_blog
MONGODB_COLLECTION=learning_posts
BLOG_ADMIN_TOKEN=一个很长的写入密钥
NEXT_PUBLIC_SITE_URL=https://你的域名
```

如果某个平台只给 `DATABASE_URL`，项目也能兼容读取；项目仍优先读取 `MONGODB_URI`。

本地开发同样复制环境变量模板：

```powershell
copy .env.example .env.local
```

然后把 `.env.local` 改成你的真实 Atlas 连接字符串。不要把真实 `.env.local` 提交到 Git。

启动后访问：

```text
http://localhost:3000/write
```

## 新增文章

方式一：网页写入 MongoDB：

```text
/write
```

方式二：用脚本生成本地 Markdown 学习记录：

```bash
npm run post:new -- "Git bisect 实战复盘" --tags="Git, 调试, 复盘"
```

方式三：在 `content/posts` 下手动新建 Markdown 文件：

```md
---
title: 文章标题
date: 2026-07-04
summary: 一句话摘要
tags: Java, Git, MySQL
---

## 今天学了什么

正文内容...
```

## 生产部署

主流程是 GitHub Actions + txcloud 拉取式发布：

1. `main` 上的类型检查、测试、生产构建和依赖审计全部通过。
2. Actions 将该提交发布为 `production` 引用。
3. 服务器上的 `txcloud-blog-pull.timer` 拉取该引用并构建 Docker 镜像。
4. 容器健康检查和 `/api/version` 提交号核对通过后才记录发布成功。
5. Actions 再从公网核对同一个提交号，避免“CI 绿了但线上没更新”。

服务器安装、systemd 状态检查和 Cloudflare 失效策略见 [`docs/txcloud-pull-deploy.md`](docs/txcloud-pull-deploy.md)。Vercel 仍可作为兼容的预览部署面，但不是当前生产发布链路。

本机配置完成后运行：

```bash
npm run deploy:doctor
```

它会检查环境变量、MongoDB Atlas 和拉取式部署所需文件，不会打印真实密钥。

章节翻页改动在发布前还应针对本地生产服务运行：

```bash
npm run audit:reader
```

该审计会验证桌面翻页时序、移动端滑动、减少动态效果、横向溢出和浏览器错误，并把报告与前后截图写入 `.omx/artifacts/browser-reader/`。

## 目录

- `/` 首页
- `/posts` 全部文章
- `/posts/[slug]` 文章详情
- `/tags` 标签
- `/write` 网页写入心得（需要 MongoDB Atlas + BLOG_ADMIN_TOKEN）
- `/rss.xml` RSS
- `/sitemap.xml` Sitemap

## 设计与实现参考

- Next.js Forms / Server Actions：<https://nextjs.org/docs/app/guides/forms>
- Docker Compose：<https://docs.docker.com/compose/>
- systemd timers：<https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html>
- MongoDB Node.js Driver `MongoClient`：<https://www.mongodb.com/docs/drivers/node/current/connect/mongoclient/>
- MongoDB Atlas Free Cluster：<https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/>
- W3C WCAG target size：<https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>
- GOV.UK / Material / Apple 按钮规范：用于校验按钮主次、触控尺寸、可访问焦点和清晰文案。
