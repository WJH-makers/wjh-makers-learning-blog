# 万佳泓的学习日志

这是一个部署到 Vercel 的个人学习博客，用来记录每天学习 Java 全栈、Git、MySQL、AI、系统与工程配置的成果。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/WJH-makers/wjh-makers-learning-blog&project-name=wjh-makers-learning-blog&repository-name=wjh-makers-learning-blog)

## 技术栈

- Next.js App Router
- TypeScript
- Newsprint 报纸风格界面：强网格、无圆角、衬线标题、清晰主次按钮
- 本地 Markdown 只读内容：`content/posts/*.md`
- 线上云数据库写入：MongoDB Atlas M0 Free Cluster
- 无 ORM / 无 CMS：只使用 MongoDB 官方 Node.js Driver 直连

## 常用命令

```bash
npm install
npm run dev
npm run typecheck
npm run build
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
- **安全**：必须输入 `BLOG_ADMIN_TOKEN`，真实 token 只放在 Vercel / `.env.local`，不进 Git。
- **可诊断**：页面会 ping MongoDB，并提示 `MONGODB_URI`、Atlas 用户、Network Access、Vercel 环境变量是否需要检查。
- **写作模板**：默认正文按「今天学了什么 / 关键命令 / 遇到的问题 / 验证证据 / 明天继续」生成。
- **按钮规范**：主按钮只保留一个高优先级动作「发布今日心得」，次按钮回到归档；所有按钮保持至少 44px 触控尺寸、强边框、强焦点态和 Newsprint 零圆角风格。

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
npx vercel@latest --prod
```

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
