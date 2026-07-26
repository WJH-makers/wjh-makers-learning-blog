import type { MetadataRoute } from "next";
import { getAllPublishedPosts, getAllPublishedTags, siteUrl } from "@/lib/posts";
import { publishedEpisodes } from "@/lib/series";
import { cliPublishedEpisodes } from "@/lib/series-cli";
import { cafePublishedEpisodes } from "@/lib/series-cafe";
import type { JavaEpisode } from "@/lib/series";

export const revalidate = 3600;
export const runtime = "nodejs";

/** 系列最新一话的日期(slug 前 10 位即 YYYY-MM-DD),避免全站任何更新都虚报到每个连载页。 */
function latestEpisodeDate(episodes: JavaEpisode[], fallback: Date): Date {
  const dates = episodes.flatMap((e) => (e.slug ? [e.slug.slice(0, 10)] : []));
  return dates.length > 0 ? new Date(dates.sort().at(-1) as string) : fallback;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const posts = await getAllPublishedPosts();
  const tags = await getAllPublishedTags();

  // 使用最新文章的日期作为首页和列表页的 lastModified
  const latestDate = posts.length > 0
    ? new Date(posts[0].date)
    : new Date("2026-07-04");

  // 每个标签的真实最新文章日期(过度声明会让爬虫不信任 sitemap 的 lastModified)
  const tagLatest = new Map<string, string>();
  for (const post of posts) {
    for (const tag of post.tags) {
      const cur = tagLatest.get(tag);
      if (!cur || post.date > cur) tagLatest.set(tag, post.date);
    }
  }

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: latestDate, changeFrequency: "daily", priority: 1 },
    { url: `${base}/java`, lastModified: latestEpisodeDate(publishedEpisodes(), latestDate), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/cli`, lastModified: latestEpisodeDate(cliPublishedEpisodes(), latestDate), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/cafe`, lastModified: latestEpisodeDate(cafePublishedEpisodes(), latestDate), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/posts`, lastModified: latestDate, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/tags`, lastModified: latestDate, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/about`, lastModified: new Date("2026-07-04"), changeFrequency: "monthly", priority: 0.3 },
    ...posts.map((post) => ({
      url: `${base}/posts/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];

  // 只收录有 ≥2 篇文章的标签页，避免薄内容
  for (const { tag, count } of tags) {
    if (count >= 2) {
      entries.push({
        url: `${base}/tags/${encodeURIComponent(tag)}`,
        lastModified: new Date(tagLatest.get(tag) ?? latestDate),
        changeFrequency: "weekly",
        priority: 0.4,
      });
    }
  }

  return entries;
}
