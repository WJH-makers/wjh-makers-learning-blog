import type { MetadataRoute } from "next";
import { getAllPublishedPosts, siteUrl } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const posts = await getAllPublishedPosts();
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/posts`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/tags`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/jobs`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ...posts.map((post) => ({
      url: `${base}/posts/${post.slug}`,
      lastModified: new Date(post.date), changeFrequency: "monthly" as const, priority: 0.7,
    })),
  ];
}
