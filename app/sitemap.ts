import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-config";
import { getAllPublishedTags, getPublishedPostIndex, outboundDate } from "@/lib/posts";
import { publishedEpisodesOf, SERIES_LIST } from "@/lib/series-registry";
import type { JavaEpisode } from "@/lib/series";
import { STATIC_SITEMAP_ROUTES } from "@/lib/sitemap-routes";


/** 系列最新一话的日期(slug 前 10 位即 YYYY-MM-DD),避免全站任何更新都虚报到每个连载页。 */
function latestEpisodeDate(episodes: JavaEpisode[], fallback: Date): Date {
  const dates = episodes.flatMap((e) => (e.slug ? [e.slug.slice(0, 10)] : []));
  return dates.length > 0 ? outboundDate(dates.sort().at(-1) as string) : fallback;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const posts = await getPublishedPostIndex();
  const tags = await getAllPublishedTags();

  // 首页与列表页的 lastModified 取最新文章日期(钳到当下,不对外声明未来时间)
  const latestDate = posts.length > 0 ? outboundDate(posts[0].date) : new Date("2026-07-04");

  // 每个标签的真实最新文章日期(过度声明会让爬虫不信任 sitemap 的 lastModified)
  const tagLatest = new Map<string, string>();
  for (const post of posts) {
    for (const tag of post.tags) {
      const cur = tagLatest.get(tag);
      if (!cur || post.date > cur) tagLatest.set(tag, post.date);
    }
  }

  // 连载页遍历注册表:新开一条线不改这里也会自动进 sitemap。
  // 只收录已开更的线 —— 全 planned 的蓝图页对搜索引擎是薄内容。
  const seriesEntries: MetadataRoute.Sitemap = SERIES_LIST.flatMap((series) => {
    const published = publishedEpisodesOf(series);
    if (published.length === 0) return [];
    return [{
      url: `${base}${series.route}`,
      lastModified: latestEpisodeDate(published, latestDate),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }];
  });

  const entries: MetadataRoute.Sitemap = [
    ...STATIC_SITEMAP_ROUTES.map((entry) => ({
      url: entry.path === "/" ? base : `${base}${entry.path}`,
      lastModified: latestDate,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    })),
    ...seriesEntries,
    ...posts.map((post) => ({
      url: `${base}/posts/${post.slug}`,
      lastModified: outboundDate(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];

  // 只收录有 ≥2 篇文章的标签页，避免薄内容
  for (const { tag, count } of tags) {
    if (count >= 2) {
      entries.push({
        url: `${base}/tags/${encodeURIComponent(tag)}`,
        lastModified: outboundDate(tagLatest.get(tag) ?? posts[0]?.date ?? "2026-07-04"),
        changeFrequency: "weekly",
        priority: 0.4,
      });
    }
  }

  return entries;
}
