import { getAllPublishedPosts, siteUrl } from "@/lib/posts";
import { SERIES_LIST, seriesProgress } from "@/lib/series-registry";
import { agentContentSignal } from "@/lib/agent-markdown";

export const revalidate = 3600;
export const runtime = "nodejs";

export async function GET() {
  const base = siteUrl();
  const posts = await getAllPublishedPosts();
  const articleList = posts
    .map((post) => `- [${post.title}](${base}/posts/${post.slug}/markdown): ${post.summary}`)
    .join("\n");

  // 连载入口走注册表:新开一条线自动出现,只列已开更的。
  const seriesList = SERIES_LIST
    .map((s) => ({ s, p: seriesProgress(s) }))
    .filter(({ p }) => p.done > 0)
    .map(({ s, p }) => `- [${s.title}](${base}${s.route}): ${s.tagline}(${p.done}/${p.total} 话)`)
    .join("\n");

  const body = `# 豆豆课程组

> 中文技术学习博客，记录 Java 全栈、工程实践与遥感 VQA / MoE 研究。
> 特色:把 Java 工程师需要的整个知识面写成同一个咖啡站宇宙下的漫画连载。

## 阅读入口

- [连载总台](${base}/series):全部漫画连载
- [全量归档](${base}/archive):按时间线的完整文章清单
- [速查手册](${base}/cheatsheets):命令与语法速查
- [标签索引](${base}/tags)
- [项目集](${base}/projects) · [关于作者](${base}/about) · [现在在做](${base}/now)

## 连载

${seriesList}

## 机器可读格式

- [站点地图](${base}/sitemap.xml)
- [RSS](${base}/rss.xml)
- 文章提供 Markdown 版本：在文章 URL 后加 /markdown，或向公开页面发送 Accept: text/markdown。

## 最新与全部文章

${articleList}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Language": "zh-CN",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Content-Signal": agentContentSignal,
    },
  });
}
