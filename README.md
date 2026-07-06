# 万佳泓的学习日志

这是一个部署到 Vercel 的个人学习博客，用来记录每天学习 Java 全栈、Git、MySQL、AI、系统与工程配置的成果。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/WJH-makers/wjh-makers-learning-blog&project-name=wjh-makers-learning-blog&repository-name=wjh-makers-learning-blog)

## 技术栈

- Next.js App Router
- TypeScript
- Newsprint 报纸风格界面：强网格、无圆角、衬线标题、清晰主次按钮
- BlockNote 块编辑器：`@blocknote/react` + `@blocknote/core` + `@blocknote/mantine`
- 本地 Markdown 只读内容：`content/posts/*.md`
- 线上云数据库写入：MongoDB Atlas M0 Free Cluster
- 无 ORM / 无 CMS：只使用 MongoDB 官方 Node.js Driver 直连
- Vercel Functions 连接池管理：`@vercel/functions` 的 `attachDatabasePool`

## 常用命令

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run deploy:doctor
npm run post:new -- "今天学到的主题" --tags="Java, MySQL, 复盘"
```

## 为什么之前不能在网页里直接写心得？

之前这个博客是纯静态 Markdown 架构：

- 文章只从 `content/posts/*.md` 读取。
- 没有云数据库驱动。
- 没有 Server Action 写入入口。
- Vercel 的文件系统不能当作持久写入空间，网页表单不能直接把 Markdown 永久写回仓库。

现在新增了 MongoDB Atlas 云数据库写入链路：配置 `MONGODB_URI` 后，打开 `/write` 就能把每天心得写入 `learning_posts` collection。

## 网页写作入口设计

`/write` 是唯一的线上写作入口，目标是每天能快速写、快速发、快速复盘：

- **直连**：Next.js Server Action 直接调用 MongoDB 官方 Node.js Driver，不引入 ORM、CMS 或额外后台。
- **Serverless 连接池**：在 Vercel Functions 中把 `MongoClient` 交给 `attachDatabasePool`，避免函数挂起/恢复时连接泄漏。
- **安全**：必须输入 `BLOG_ADMIN_TOKEN`，真实 token 只放在 Vercel / `.env.local`，不进 Git。
- **可诊断**：页面会 ping MongoDB，并提示 `MONGODB_URI`、Atlas 用户、Network Access、Vercel 环境变量是否需要检查。
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
   - Vercel 没有固定出口 IP，个人博客最简单是临时使用 `0.0.0.0/0`。
   - 同时务必使用强数据库密码和 `BLOG_ADMIN_TOKEN` 保护 `/write`。
5. 在 **Connect → Drivers → Node.js** 复制连接字符串。
6. 在 Vercel Project Settings → Environment Variables 添加：

```text
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/learning_blog?retryWrites=true&w=majority
MONGODB_DB_NAME=learning_blog
MONGODB_COLLECTION=learning_posts
BLOG_ADMIN_TOKEN=一个很长的写入密钥
NEXT_PUBLIC_SITE_URL=https://你的域名
```

如果某个工具只给 `DATABASE_URL`，项目也能兼容读取；但 Vercel MongoDB 集成推荐保留 `MONGODB_URI`。

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

## Vercel 部署

推荐流程一：网页一键导入

1. 点击上面的 **Deploy with Vercel**。
2. 用你的 Vercel 账号登录。
3. 选择 GitHub 仓库 `WJH-makers/wjh-makers-learning-blog`。
4. Project Name 建议使用 `wjh-makers-learning-blog`，避免和别人已有的 `learning-blog.vercel.app` 冲突。
5. Framework Preset 保持 `Next.js`。
6. Build Command 使用 `npm run build`。
7. 在 Environment Variables 中配置 MongoDB Atlas 和 `BLOG_ADMIN_TOKEN`。
8. 点击 Deploy。

部署后检查：

- `/write` 顶部显示 `Publishing Desk Ready：MongoDB Atlas`。
- 提交一篇测试文章后，首页、`/posts`、`/tags`、`/rss.xml` 都能看到更新。
- 如果 Atlas Network Access 使用 `0.0.0.0/0`，请确保数据库用户只给当前库 `readWrite`，并使用高强度密码。

推荐流程二：Vercel CLI

```bash
npx vercel@latest login
npx vercel@latest link --yes --project wjh-makers-learning-blog
npx vercel@latest --prod
```

本机配置完成后可运行：

```bash
npm run deploy:doctor
```

它会检查 `.env.local`、Vercel 项目绑定、必需环境变量和 MongoDB Atlas ping，不会打印真实密钥。

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
- Vercel Environment Variables：<https://vercel.com/docs/environment-variables>
- MongoDB Node.js Driver `MongoClient`：<https://www.mongodb.com/docs/drivers/node/current/connect/mongoclient/>
- MongoDB Atlas Free Cluster：<https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/>
- Vercel MongoDB starter：<https://vercel.com/templates/next.js/mongodb-starter>
- Vercel / Next.js blog starter：<https://github.com/vercel/next.js/tree/canary/examples/blog-starter>
- W3C WCAG target size：<https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>
- GOV.UK / Material / Apple 按钮规范：用于校验按钮主次、触控尺寸、可访问焦点和清晰文案。
