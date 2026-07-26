import { getAllPublishedPosts, getPublishedPost, siteUrl } from "@/lib/posts";
import { agentContentSignal, articleMarkdown } from "@/lib/agent-markdown";

function response(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Language": "zh-CN",
      "Cache-Control": "no-store",
      "Content-Signal": agentContentSignal,
      Vary: "Accept",
      "X-Robots-Tag": "noindex",
    },
  });
}

export const runtime = "nodejs";

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path") ?? "/";
  const base = siteUrl();

  if (path === "/" || path === "/posts") {
    const posts = await getAllPublishedPosts();
    const entries = posts.map((post) =>
      `- [${post.title}](${base}/posts/${post.slug}) — ${post.summary}`
    ).join("\n");
    return response(`# WJH-makers\n\n中文技术学习博客。完整机器可读目录：${base}/llms.txt\n\n## 文章\n\n${entries}\n`);
  }

  const slug = path?.match(/^\/posts\/([^/]+)$/)?.[1];
  if (!slug) return response("# Not Found\n", 404);

  const post = await getPublishedPost(slug);
  if (!post) return response("# Not Found\n", 404);
  return response(articleMarkdown(post, base));
}
