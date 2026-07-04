import type { MetadataRoute } from "next";
import { getAllPublishedPosts, siteUrl } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const posts = await getAllPublishedPosts();
  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/posts`, lastModified: new Date() },
    { url: `${base}/tags`, lastModified: new Date() },
    ...posts.map((post) => ({
      url: `${base}/posts/${post.slug}`,
      lastModified: new Date(post.date),
    })),
  ];
}
