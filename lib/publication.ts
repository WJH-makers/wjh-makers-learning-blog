/**
 * 对外发布边界的唯一口径。
 *
 * 内容文件的 date 同时承担故事时间线与计划发布日期。只要日期还没到，文章可以继续
 * 留在仓库、被编辑和被注册表引用，但不能进入公开列表、RSS、sitemap 或静态文章路由。
 */

/**
 * 发布判定的基准时刻，**构建期求值一次**。
 *
 * 原来五个函数各写 `now = new Date()`。开启 cacheComponents 后这是硬错误：
 * 预渲染 /posts/[slug] 的 generateMetadata 时读当前时间会被直接拒绝
 * （Route "/posts/[slug]" used `new Date()` before accessing either uncached data
 * or Request data）。官方给的三条路里，本站选「构建期定值」——
 * 与 app/layout.tsx 的版权年同一个先例，理由也相同：
 *
 * 发布边界本就不需要按请求精确到秒。部署链是「push → CI → 强推 production ref →
 * 服务器 2min timer」，每次发布都重新构建，因此计划在明天的文章在明天首次部署后出现，
 * 这与改造前的实际行为一致（改造前每次构建也是各页面各读一次当前时间）。
 *
 * 需要按请求判定的调用方仍可显式传入 now —— 参数保留，只是默认值不再每次现读。
 */
const BUILD_TIME_NOW = new Date();

export function shanghaiDate(now = BUILD_TIME_NOW): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isReleasedDate(date: string, now = BUILD_TIME_NOW): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= shanghaiDate(now);
}

export function outboundDate(date: string, now = BUILD_TIME_NOW): Date {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00+08:00`)
    : undefined;
  const valid = parsed && !Number.isNaN(parsed.getTime()) && shanghaiDate(parsed) === date;
  return valid && parsed <= now ? parsed : new Date(now.getTime());
}

/** 连载 slug 以 YYYY-MM-DD 开头；无有效日期的条目绝不当作已发布。 */
export function isReleasedSlug(slug: string | undefined, now = BUILD_TIME_NOW): boolean {
  return Boolean(slug && isReleasedDate(slug.slice(0, 10), now));
}

/**
 * 话次是否对外可见。Java 与命令行两条线已把日期倒推回真实完稿区间，
 * 于是「已完结的课程要全部公开」不再需要按 slug 前缀开特例——日期本身就是唯一口径。
 */
export function isPublicEpisode(slug: string | undefined, now = BUILD_TIME_NOW): boolean {
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
