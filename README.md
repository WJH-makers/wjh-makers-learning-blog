# 万佳泓的学习日志

这是一个部署到 Vercel 的个人学习博客，用来记录每天学习 Java 全栈、Git、MySQL、AI、系统与工程配置的成果。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/WJH-makers/learning-blog&project-name=learning-blog&repository-name=learning-blog)

## 技术栈

- Next.js App Router
- TypeScript
- 本地 Markdown 内容：`content/posts/*.md`
- 无数据库、无 CMS、无额外 Markdown 依赖

## 常用命令

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## 新增文章

在 `content/posts` 下新建 Markdown 文件：

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
3. 选择 GitHub 仓库 `WJH-makers/learning-blog`。
4. Framework Preset 保持 `Next.js`。
5. Build Command 使用 `npm run build`。
6. 点击 Deploy。

推荐流程二：Vercel CLI

```bash
npx vercel@latest login
npx vercel@latest --prod
```

如需固定站点地址，在 Vercel 环境变量设置：

```text
NEXT_PUBLIC_SITE_URL=https://你的域名
```

## 目录

- `/` 首页
- `/posts` 全部文章
- `/posts/[slug]` 文章详情
- `/tags` 标签
- `/rss.xml` RSS
- `/sitemap.xml` Sitemap
