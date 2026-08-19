import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/site-config";
import { getPublishedPostIndex } from "@/lib/posts";

// 每次请求都要换一篇,不能被任何一层缓存住。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 随机跳一篇:给 130+ 篇长尾内容一条被发现的路径。 */
export async function GET() {
  const posts = await getPublishedPostIndex();
  const base = siteUrl();
  if (posts.length === 0) return NextResponse.redirect(`${base}/posts`);

  const pick = posts[Math.floor(Math.random() * posts.length)];
  return NextResponse.redirect(`${base}/posts/${pick.slug}`, {
    headers: { "Cache-Control": "no-store" },
  });
}
