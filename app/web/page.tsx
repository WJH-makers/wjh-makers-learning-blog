import type { Metadata } from "next";
import Link from "next/link";
import { CHAPTER_TYPE_LABEL, STATUS_LABEL, seasonPublishedSlugs } from "@/lib/series";
import { WEB_SEASONS, WEB_SERIES_META, webPublishedEpisodes, webAllEpisodes } from "@/lib/series-web";
import { siteUrl } from "@/lib/posts";
import { jsonLdSafe } from "@/lib/jsonld";
import { OG_BASE } from "@/lib/og-base";
import JavaProgress from "../java/JavaProgress";
import SeriesMap from "../java/SeriesMap";

export const revalidate = 3600;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: `${WEB_SERIES_META.title} · ${WEB_SERIES_META.alias}`,
  description: WEB_SERIES_META.tagline,
  alternates: { canonical: `${siteUrl()}/web` },
  // 未开更的蓝图页对搜索引擎是薄内容;开更后自动恢复索引。
  robots: webPublishedEpisodes().length === 0 ? { index: false, follow: true } : undefined,
  openGraph: {
    ...OG_BASE,
    title: `${WEB_SERIES_META.title} · ${WEB_SERIES_META.alias}`,
    description: WEB_SERIES_META.tagline,
    url: `${siteUrl()}/web`,
    type: "website",
  },
};

export default function WebSeriesPage() {
  const total = webAllEpisodes().length;
  const done = webPublishedEpisodes().length;
  const progressSeasons = WEB_SEASONS.map((s) => ({
    code: s.code,
    title: s.title,
    slugs: seasonPublishedSlugs(s),
  })).filter((s) => s.slugs.length > 0);

  // 系列主实体:与文章页 isPartOf 里的 CreativeWorkSeries 引用(name/url)严格一致,形成双向闭环。
  const seriesJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWorkSeries",
    name: WEB_SERIES_META.title,
    url: `${siteUrl()}/web`,
    description: WEB_SERIES_META.tagline,
    inLanguage: "zh-CN",
    author: {
      "@type": "Person",
      name: "WJH-makers",
      alternateName: "WJH-makers",
      url: "https://github.com/WJH-makers",
    },
    hasPart: webPublishedEpisodes().map((ep, i) => ({
      "@type": "BlogPosting",
      position: i + 1,
      name: ep.title,
      url: `${siteUrl()}/posts/${ep.slug}`,
    })),
  };

  return (
    <div className="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(seriesJsonLd) }} />
      <section className="hero">
        <div>
          <p className="eyebrow">连载特刊 · 蓝图先行</p>
          <h1>{WEB_SERIES_META.title}</h1>
          <p className="hero-text">{WEB_SERIES_META.tagline}</p>
          <div className="hero-actions">
            {done > 0 && (
              <Link className="button primary" href={`/posts/${webPublishedEpisodes()[0].slug}`}>
                从第一话开始 →
              </Link>
            )}
            <Link className="button" href="/java">起点:从零开始学 Java</Link>
          </div>
        </div>
        <div className="hero-panel">
          <p className="eyebrow">连载进度</p>
          <p>
            已连载 <strong>{done}</strong> / 规划 {total} 话 · 蓝图先行,逐话开更
          </p>
          <p className="muted">
            长期项目:{WEB_SERIES_META.project}
          </p>
        </div>
      </section>

      {progressSeasons.length > 0 && (
        <JavaProgress seasons={progressSeasons} storageKey={WEB_SERIES_META.storageKey} />
      )}

      <section className="section-head" style={{ marginTop: "2.5rem" }}>
        <div>
          <p className="eyebrow">Knowledge Map · 知识地图</p>
          <h2>脉络版图</h2>
        </div>
        <span className="muted">点节点直达 · 读过的自动打勾</span>
      </section>
      <SeriesMap seasons={WEB_SEASONS} storageKey={WEB_SERIES_META.storageKey} />

      {WEB_SEASONS.map((season) => (
        <section key={season.season} style={{ marginTop: "2.5rem" }}>
          <div className="section-head">
            <div>
              <p className="eyebrow">
                {season.code} · {season.subtitle}
              </p>
              <h2>
                第{season.season}卷 · {season.title}
              </h2>
            </div>
            <span className="muted">{season.covers.join(" · ")}</span>
          </div>
          <p className="muted" style={{ marginBottom: "0.75rem" }}>
            {season.goal}
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>话</th>
                  <th>标题</th>
                  <th>形态</th>
                  <th>项目阶段</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {season.episodes.map((ep) => (
                  <tr key={ep.episode} className={ep.status === "published" ? undefined : "row-planned"}>
                    <td>{String(ep.episode).padStart(2, "0")}</td>
                    <td>
                      {ep.status === "published" && ep.slug ? (
                        <Link href={`/posts/${ep.slug}`}>{ep.title}</Link>
                      ) : (
                        ep.title
                      )}
                    </td>
                    <td>{CHAPTER_TYPE_LABEL[ep.chapterType]}</td>
                    <td>{ep.projectStage}</td>
                    <td>{STATUS_LABEL[ep.status] ?? ep.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
