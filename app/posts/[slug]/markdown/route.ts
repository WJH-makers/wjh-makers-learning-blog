import { getPublishedPost, siteUrl } from "@/lib/posts";
import { agentContentSignal, articleMarkdown } from "@/lib/agent-markdown";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function markdownResponse(body: string, cacheControl: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Language": "zh-CN",
      "Cache-Control": cacheControl,
      "Content-Signal": agentContentSignal,
      "X-Robots-Tag": "noindex, follow",
      Vary: "Accept",
    },
  });
}

export const revalidate = 604800;
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return markdownResponse("# Not Found\n", "no-store");
  return markdownResponse(articleMarkdown(post, siteUrl()), "public, max-age=300, s-maxage=600, stale-while-revalidate=600");
}
