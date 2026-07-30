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

/** 连载 slug 以 YYYY-MM-DD 开头；无有效日期的条目绝不当作已发布。 */
export function isReleasedSlug(slug: string | undefined, now = new Date()): boolean {
  return Boolean(slug && isReleasedDate(slug.slice(0, 10), now));
}

/** Date-based publication check used by posts whose editorial date is authoritative. */
export const isPublicOn = isReleasedDate;

/** Java and CLI curricula were explicitly opened as complete learning paths. */
export function isAlwaysPublicCurriculum(slug: string): boolean {
  return /^\d{4}-\d{2}-\d{2}-(?:java|cli)-s\d+e\d+-/.test(slug);
}

/** Series routes use the explicit curriculum policy before the scheduled slug date. */
export function isPublicEpisode(slug: string | undefined, now = new Date()): boolean {
  return Boolean(slug && (isAlwaysPublicCurriculum(slug) || isReleasedSlug(slug, now)));
}

/** Keep unreleased manuscripts visible as non-linkable previews. */
export function publicFacingEpisodes<T extends { status: string; slug?: string }>(episodes: T[]): T[] {
  return episodes.map((episode) => (
    episode.status === "published" && !isPublicEpisode(episode.slug)
      ? { ...episode, status: "planned" }
      : episode
  ));
}
