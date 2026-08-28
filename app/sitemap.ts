import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-config";
import { getAllPublishedTags, getPublishedPostIndex, outboundDate } from "@/lib/posts";
import { publishedEpisodesOf, SERIES_LIST } from "@/lib/series-registry";
import { isReleasedDate } from "@/lib/publication";
import { COFFEE_PROJECT_STAGES, READING_PATHS, UNIVERSE_DISTRICTS } from "@/lib/universe";
import type { JavaEpisode } from "@/lib/series";
import { STATIC_SITEMAP_ROUTES, type SitemapRoute } from "@/lib/sitemap-routes";


/** 系列最新一话的日期(slug 前 10 位即 YYYY-MM-DD),避免全站任何更新都虚报到每个连载页。 */
function latestEpisodeDate(episodes: JavaEpisode[], fallback: Date): Date {
  const dates = episodes.flatMap((e) => (e.slug ? [e.slug.slice(0, 10)] : []));
  return dates.length > 0 ? outboundDate(dates.sort().at(-1) as string) : fallback;
}

/**
 * 三个 tracksSeriesOpening 页面各自展示哪些线 —— 它们的渲染结果只在其中某条线
 * 从雾区变成已开更时才变,所以 lastmod 取「所展示的线里最晚那次开更」。
 * 键必须与 STATIC_SITEMAP_ROUTES 对齐,漏一条直接抛错(见下方 openingDate)。
 */
const OPENING_DEPENDENCIES: Record<string, readonly string[]> = {
  "/start": READING_PATHS.map((p) => p.route),
  "/universe": UNIVERSE_DISTRICTS.map((d) => d.route),
  "/coffee-station": COFFEE_PROJECT_STAGES.map((s) => s.route),
};

/** 一条线的开更日(首话发布日)。后续加话不改这个值 —— 页面上它只从雾区亮一次。 */
function openedDate(route: string): string | undefined {
  const series = SERIES_LIST.find((s) => s.route === route);
  if (!series) return undefined;
  const dates = publishedEpisodesOf(series).flatMap((e) => (e.slug ? [e.slug.slice(0, 10)] : []));
  return dates.sort()[0];
}

/**
 * 已知的少报:往 UNIVERSE_DISTRICTS 之类常量里新增一个「雾区」条目也会改页面,
 * 但没有任何线的开更日跟着动,lastmod 就不会前移。少报只是晚一点被重抓,
 * 比多报安全 —— 后者会让爬虫连整份 sitemap 的日期一起不信。
 */
function openingDate(path: string, fallback: Date): Date {
  const routes = OPENING_DEPENDENCIES[path];
  if (!routes) throw new Error(`[sitemap] ${path} 声明了 tracksSeriesOpening,却没登记它展示哪些线`);
  const opened = routes.flatMap((route) => {
    const date = openedDate(route);
    return date ? [date] : [];
  });
  return opened.length > 0 ? outboundDate(opened.sort().at(-1) as string) : fallback;
}

function staticRouteDate(entry: SitemapRoute, latestDate: Date): Date {
  if (entry.tracksSeriesOpening) return openingDate(entry.path, latestDate);
  if (!entry.updatedOn) return latestDate;
  // 手写日期打错(月份写成 13、写到未来)时 outboundDate 会静默退回构建时刻,
  // 那正好又变成虚报 —— 与其悄悄错,不如构建期炸出来。
  if (!isReleasedDate(entry.updatedOn)) {
    throw new Error(`[sitemap] ${entry.path} 的 updatedOn 不是已到期的 YYYY-MM-DD:${entry.updatedOn}`);
  }
  return outboundDate(entry.updatedOn);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const posts = await getPublishedPostIndex();
  const tags = await getAllPublishedTags();

  // 首页与列表页(/posts /archive /cheatsheets /tags /stats /series)的 lastModified
  // 取最新文章日期(钳到当下,不对外声明未来时间)。这几页确实每篇新文章都会重排。
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
      lastModified: staticRouteDate(entry, latestDate),
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
