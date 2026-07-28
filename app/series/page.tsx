import type { Metadata } from "next";
import Link from "next/link";
import { SERIES_LIST, seriesProgress, allSeriesProgress } from "@/lib/series-registry";
import { siteUrl } from "@/lib/posts";
import { jsonLdSafe } from "@/lib/jsonld";
import { OG_BASE } from "@/lib/og-base";

export const revalidate = 3600;
export const runtime = "nodejs";

const TITLE = "全部连载";
const DESC = "咖啡站宇宙的全部漫画连载 —— 从第一行 Java 到 JVM、构建、微服务、网络、操作系统、数据库、分布式、云原生、安全、算法、AI 与前端,每一条线都有自己的导师和长期项目。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: `${siteUrl()}/series` },
  openGraph: {
    ...OG_BASE,
    title: TITLE,
    description: DESC,
    url: `${siteUrl()}/series`,
    type: "website",
  },
};

export default function SeriesIndexPage() {
  const total = allSeriesProgress();
  const rows = SERIES_LIST.map((series) => ({ series, progress: seriesProgress(series) }));
  const serialized = rows.filter((r) => r.progress.done > 0);
  const planned = rows.filter((r) => r.progress.done === 0);

  const listJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    url: `${siteUrl()}/series`,
    description: DESC,
    inLanguage: "zh-CN",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: rows.length,
      itemListElement: rows.map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: r.series.title,
        url: `${siteUrl()}${r.series.route}`,
      })),
    },
  };

  return (
    <div className="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(listJsonLd) }} />

      <div className="page-title">
        <p className="eyebrow">Series Desk · 连载总台</p>
        <h1>{TITLE}</h1>
        <p>
          同一个咖啡站宇宙,{total.lines} 条连载线,规划 {total.total} 话,已上线{" "}
          <strong>{total.done}</strong> 话。每条线一位导师、一个长期项目 —— 技术永远长在故事里。
        </p>
      </div>

      <section className="section-head">
        <div>
          <p className="eyebrow">On Air · 连载中与已完结</p>
          <h2>已开更 {serialized.length} 条</h2>
        </div>
        <span className="muted">点进任意一条,读它的全卷地图</span>
      </section>
      <div className="series-index-grid">
        {serialized.map(({ series, progress }) => (
          <Link key={series.route} href={series.route} className="card series-index-card">
            <p className="series-index-route">{series.route}</p>
            <p className="series-index-name">{series.title}</p>
            {series.alias && <p className="series-index-alias">{series.alias}</p>}
            <p className="series-index-tagline">{series.tagline}</p>
            <p className="series-index-meta">
              <strong>{progress.done}</strong> / {progress.total} 话
              {progress.done >= progress.total ? " · 已完结" : " · 连载中"}
            </p>
            <span className="series-index-bar" aria-hidden="true">
              <span style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }} />
            </span>
          </Link>
        ))}
      </div>

      {planned.length > 0 && (
        <>
          <section className="section-head" style={{ marginTop: "2.5rem" }}>
            <div>
              <p className="eyebrow">Blueprint · 蓝图先行</p>
              <h2>规划中 {planned.length} 条</h2>
            </div>
            <span className="muted">章节表已全部写好,逐话开更</span>
          </section>
          <div className="series-index-grid">
            {planned.map(({ series, progress }) => (
              <Link key={series.route} href={series.route} className="card series-index-card is-planned">
                <p className="series-index-route">{series.route}</p>
                <p className="series-index-name">{series.title}</p>
                {series.alias && <p className="series-index-alias">{series.alias}</p>}
                <p className="series-index-tagline">{series.tagline}</p>
                <p className="series-index-meta">规划 {progress.total} 话 · 蓝图已就绪</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
