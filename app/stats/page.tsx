import Link from "next/link";
import { siteUrl } from "@/lib/site-config";
import { getAllPublishedPosts, getAllPublishedTags, type Post } from "@/lib/posts";
import { SERIES_LIST, seriesProgress, allSeriesProgress, findEpisodeInfo } from "@/lib/series-registry";
import { jsonLdSafe } from "@/lib/jsonld";
import { staticPageMetadata } from "@/lib/og-base";


const TITLE = "站点数据";
const DESC = "这个博客的公开数据面:文章总数与总字数、各连载进度、按月更新节奏、标签分布与长短篇极值 —— 全部实时从内容算出来,不接任何统计脚本。";

export const metadata = staticPageMetadata({
  title: TITLE,
  description: DESC,
  path: "/stats",
});

function charCount(post: Post): number {
  return post.content.length;
}

export default async function StatsPage() {
  const posts = await getAllPublishedPosts();
  const tags = await getAllPublishedTags();
  const total = allSeriesProgress();

  const totalChars = posts.reduce((sum, p) => sum + charCount(p), 0);
  const totalMinutes = posts.reduce((sum, p) => sum + p.readingMinutes, 0);
  const episodeCount = posts.filter((p) => findEpisodeInfo(p.slug)).length;

  // 按月统计更新量,用于热力条
  const byMonth = new Map<string, number>();
  for (const post of posts) {
    const key = post.date.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }
  const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const peak = Math.max(1, ...months.map(([, n]) => n));

  const sorted = [...posts].sort((a, b) => charCount(b) - charCount(a));
  const longest = sorted.slice(0, 5);
  const shortest = sorted.slice(-5).reverse();
  const multiUseTags = tags.filter((t) => t.count >= 2);
  const topTags = [...tags].sort((a, b) => b.count - a.count).slice(0, 24);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: TITLE,
    url: `${siteUrl()}/stats`,
    description: DESC,
    inLanguage: "zh-CN",
  };

  return (
    <div className="page-shell narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }} />

      <div className="page-title">
        <p className="eyebrow">Numbers · 站点数据</p>
        <h1>{TITLE}</h1>
        <p>
          每个数字都由内容实时算出,页面每小时再生一次。服务器运行指标在私有的{" "}
          <code>/monitor</code>,这里只放内容侧。
        </p>
      </div>

      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="stat-num">{posts.length}</span>
          <span className="stat-label">篇文章</span>
        </div>
        <div className="stat-tile">
          <span className="stat-num">{(totalChars / 10000).toFixed(1)}<em>万</em></span>
          <span className="stat-label">总字数</span>
        </div>
        <div className="stat-tile">
          <span className="stat-num">{total.lines}</span>
          <span className="stat-label">条连载线</span>
        </div>
        <div className="stat-tile">
          <span className="stat-num">{episodeCount}</span>
          <span className="stat-label">已上线话次</span>
        </div>
        <div className="stat-tile">
          <span className="stat-num">{total.total}</span>
          <span className="stat-label">规划总话数</span>
        </div>
        <div className="stat-tile">
          <span className="stat-num">{Math.round(totalMinutes / 60)}<em>小时</em></span>
          <span className="stat-label">读完全站约需</span>
        </div>
      </div>

      <section className="section-head" style={{ marginTop: "2.5rem" }}>
        <div>
          <p className="eyebrow">Series · 各线进度</p>
          <h2>连载完成度</h2>
        </div>
        <Link href="/series">连载总台 →</Link>
      </section>
      <div className="stat-bars">
        {SERIES_LIST.map((series) => {
          const p = seriesProgress(series);
          const pct = Math.round((p.done / Math.max(p.total, 1)) * 100);
          return (
            <div key={series.route} className="stat-bar-row">
              <Link href={series.route} className="stat-bar-name">{series.title}</Link>
              <span className="stat-bar-track" aria-hidden="true">
                <span className="stat-bar-fill" style={{ width: `${pct}%` }} />
              </span>
              <span className="stat-bar-num">
                {p.done}/{p.total}
              </span>
            </div>
          );
        })}
      </div>

      <section className="section-head" style={{ marginTop: "2.5rem" }}>
        <div>
          <p className="eyebrow">Cadence · 更新节奏</p>
          <h2>按月发布量</h2>
        </div>
        <span className="muted">含按剧情时间线排期的连载话次</span>
      </section>
      <div className="stat-months">
        {months.map(([month, n]) => (
          <div key={month} className="stat-month">
            <span className="stat-month-bar" style={{ height: `${Math.round((n / peak) * 100)}%` }} title={`${month} · ${n} 篇`} />
            <span className="stat-month-label">{month.slice(2)}</span>
          </div>
        ))}
      </div>

      <section className="section-head" style={{ marginTop: "2.5rem" }}>
        <div>
          <p className="eyebrow">Tags · 标签分布</p>
          <h2>{tags.length} 个标签,其中 {multiUseTags.length} 个用过两次以上</h2>
        </div>
        <Link href="/tags">标签云 →</Link>
      </section>
      <div className="stat-tagcloud">
        {topTags.map(({ tag, count }) => (
          <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
            {tag} <em>{count}</em>
          </Link>
        ))}
      </div>

      <div className="stat-two-col">
        <section>
          <h3>最长的五篇</h3>
          <ol className="stat-rank">
            {longest.map((post) => (
              <li key={post.slug}>
                <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                <span>{(charCount(post) / 1000).toFixed(1)}k</span>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h3>最短的五篇</h3>
          <ol className="stat-rank">
            {shortest.map((post) => (
              <li key={post.slug}>
                <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                <span>{(charCount(post) / 1000).toFixed(1)}k</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
