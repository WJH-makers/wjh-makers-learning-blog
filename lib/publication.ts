/**
 * 对外发布边界的唯一口径。
 *
 * 内容文件的 date 同时承担故事时间线与计划发布日期。只要日期还没到，文章可以继续
 * 留在仓库、被编辑和被注册表引用，但不能进入公开列表、RSS、sitemap 或静态文章路由。
 */
export function shanghaiDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isReleasedDate(date: string, now = new Date()): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= shanghaiDate(now);
}

export function outboundDate(date: string, now = new Date()): Date {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00+08:00`)
    : undefined;
  const valid = parsed && !Number.isNaN(parsed.getTime()) && shanghaiDate(parsed) === date;
  return valid && parsed <= now ? parsed : new Date(now.getTime());
}

/** 连载 slug 以 YYYY-MM-DD 开头；无有效日期的条目绝不当作已发布。 */
export function isReleasedSlug(slug: string | undefined, now = new Date()): boolean {
  return Boolean(slug && isReleasedDate(slug.slice(0, 10), now));
}

/**
 * 话次是否对外可见。Java 与命令行两条线已把日期倒推回真实完稿区间，
 * 于是「已完结的课程要全部公开」不再需要按 slug 前缀开特例——日期本身就是唯一口径。
 */
export function isPublicEpisode(slug: string | undefined, now = new Date()): boolean {
  return isReleasedSlug(slug, now);
}

/** Keep unreleased manuscripts visible as non-linkable previews. */
export function publicFacingEpisodes<T extends { status: string; slug?: string }>(episodes: T[]): T[] {
  return episodes.map((episode) => (
    episode.status === "published" && !isPublicEpisode(episode.slug)
      ? { ...episode, status: "planned" }
      : episode
  ));
}
