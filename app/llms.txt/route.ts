import { getAllPublishedPosts, siteUrl } from "@/lib/posts";
import { agentContentSignal } from "@/lib/agent-markdown";

export const revalidate = 3600;
export const runtime = "nodejs";

export async function GET() {
  const base = siteUrl();
  const posts = await getAllPublishedPosts();
  const articleList = posts
    .map((post) => `- [${post.title}](${base}/posts/${post.slug}/markdown): ${post.summary}`)
    .join("\n");

  const body = `# WJH-makers

> 中文技术学习博客，记录 Java 全栈、工程实践与遥感 VQA / MoE 研究。

## 阅读入口

- [文章索引](${base}/posts)
- [Java 漫画课程](${base}/java)
- [CLI 学习系列](${base}/cli)
- [豆豆咖啡站(温情工程漫画)](${base}/cafe)
- [标签索引](${base}/tags)
- [关于作者](${base}/about)

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
