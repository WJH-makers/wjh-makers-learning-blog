import type { MetadataRoute } from "next";
import { getAllPublishedPosts, getAllPublishedTags, siteUrl } from "@/lib/posts";

export const revalidate = 3600;
export const runtime = "nodejs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const posts = await getAllPublishedPosts();
  const tags = await getAllPublishedTags();

  // 使用最新文章的日期作为首页和列表页的 lastModified
  const latestDate = posts.length > 0
    ? new Date(posts[0].date)
    : new Date("2026-07-04");

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: latestDate },
    { url: `${base}/posts`, lastModified: latestDate },
    { url: `${base}/tags`, lastModified: latestDate },
    ...posts.map((post) => ({
      url: `${base}/posts/${post.slug}`,
      lastModified: new Date(post.date),
    })),
  ];

  // 只收录有 ≥2 篇文章的标签页，避免薄内容
  for (const { tag, count } of tags) {
    if (count >= 2) {
      entries.push({
        url: `${base}/tags/${encodeURIComponent(tag)}`,
        lastModified: latestDate,
      });
    }
  }

  return entries;
}
