/**
 * 连载线首页的唯一实现。
 *
 * 在此之前,24 条「蓝图先行」的连载线各自持有一份逐字相同的 143 行页面
 * (仅函数名与 XXX_SEASONS/XXX_SERIES_META 前缀不同),改一处版式要动 24 个文件,
 * 且新开一条线必须整页复制 —— 复制粘贴本身就是最容易漂移的地方。
 *
 * 现在数据全部走 SeriesRef(注册表已收口 title/alias/tagline/project/route/storageKey/seasons),
 * 页面只剩「取哪条线」这一个变量,各线的 page.tsx 退化成十来行的薄壳。
 * java / cli / cafe 三条已开更的线有各自的定制版式,不走这里。
 */
import type { Metadata } from "next";
import Link from "next/link";
import { CHAPTER_TYPE_LABEL, STATUS_LABEL, seasonPublishedSlugs } from "@/lib/series";
import { publishedEpisodesOf, type SeriesRef } from "@/lib/series-registry";
import { siteUrl } from "@/lib/site-config";
import { publicAssetUrl } from "@/lib/assets";
import { jsonLdSafe, publisherRef } from "@/lib/jsonld";
import { staticPageMetadata } from "@/lib/og-base";
import JavaProgress from "../java/JavaProgress";
import SeriesMap from "../java/SeriesMap";

/** 各线 page.tsx 的 `export const metadata` 一律由这里生成,标题/canonical/OG 口径统一。 */
export function seriesLandingMetadata(series: SeriesRef): Metadata {
  const title = series.alias ? `${series.title} · ${series.alias}` : series.title;
  return staticPageMetadata({
    title,
    description: series.tagline,
    path: series.route,
    // 未开更的蓝图页对搜索引擎是薄内容;开更后自动恢复索引。
    robots: publishedEpisodesOf(series).length === 0 ? { index: false, follow: true } : undefined,
  });
}

export default function SeriesLanding({ series }: { series: SeriesRef }) {
  const published = publishedEpisodesOf(series);
  const done = published.length;
  const progressSeasons = series.seasons
    .map((s) => ({ code: s.code, title: s.title, slugs: seasonPublishedSlugs(s) }))
    .filter((s) => s.slugs.length > 0);
  const visibleSeasons = series.seasons
    .map((season) => ({
      ...season,
      episodes: season.episodes.filter((episode) => episode.status === "published" && published.some((item) => item.slug === episode.slug)),
    }))
    .filter((season) => season.episodes.length > 0);

  // 系列主实体:与文章页 isPartOf 里的 CreativeWorkSeries 引用(name/url)严格一致,形成双向闭环。
  const seriesJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWorkSeries",
    name: series.title,
    url: `${siteUrl()}${series.route}`,
    description: series.tagline,
    inLanguage: "zh-CN",
    // 与 layout 的 publisherNode 同一实体（见 app/posts/[slug]/page.tsx 的同款用法）。
    author: publisherRef(siteUrl()),
    hasPart: published.map((ep, i) => ({
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
          <p className="eyebrow">连载特刊 · {done > 0 ? "正在连载" : "蓝图先行"}</p>
          <h1>{series.title}</h1>
          <p className="hero-text">{series.tagline}</p>
          <div className="hero-actions">
            {done > 0 && (
              <Link className="button primary" href={`/posts/${published[0].slug}`}>
                从第一话开始 →
              </Link>
            )}
            <Link className="button" href="/java">起点:从零开始学 Java</Link>
          </div>
        </div>
        <div className="hero-panel">
          <p className="eyebrow">连载进度</p>
          <p>
            已连载 <strong>{done}</strong> 话
          </p>
          <p className="muted">
            长期项目:{series.project}
          </p>
        </div>
      </section>

      {series.comicCast && (
        <section className="comic-intro" aria-labelledby="series-comic-cast-title">
          <div>
            <p className="eyebrow">Comic Cast · 漫画设定</p>
            <h2 id="series-comic-cast-title">{series.comicCast.title}</h2>
            <p>{series.comicCast.description}</p>
          </div>
          <picture>
            <source type="image/avif" srcSet={`${publicAssetUrl(`${series.comicCast.image}-512.avif`)} 512w, ${publicAssetUrl(`${series.comicCast.image}.avif`)} 1024w`} sizes="(max-width: 720px) 94vw, 420px" />
            <source type="image/webp" srcSet={`${publicAssetUrl(`${series.comicCast.image}-512.webp`)} 512w, ${publicAssetUrl(`${series.comicCast.image}.webp`)} 1024w`} sizes="(max-width: 720px) 94vw, 420px" />
            <img src={publicAssetUrl(`${series.comicCast.image}.webp`)} alt={series.comicCast.alt} width={1024} height={1536} loading="eager" decoding="async" />
          </picture>
        </section>
      )}

      {progressSeasons.length > 0 && (
        <JavaProgress seasons={progressSeasons} storageKey={series.storageKey} />
      )}

      {done > 0 ? <>
        <section className="section-head" style={{ marginTop: "2.5rem" }}>
          <div>
            <p className="eyebrow">Knowledge Map · 知识地图</p>
            <h2>已经点亮的脉络</h2>
          </div>
          <span className="muted">点节点直达 · 读过的自动打勾</span>
        </section>
        <SeriesMap seasons={visibleSeasons} storageKey={series.storageKey} />
      </> : (
        <section className="universe-intro">
          <p className="eyebrow">创作中</p>
          <p>这条路线尚未正式开更。章节设计、排期与技术承诺只在创作后台维护；第一篇经过验证并发布后，才会在这里出现。</p>
        </section>
      )}

      {visibleSeasons.map((season) => (
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
                  <tr key={ep.episode}>
                    <td>{String(ep.episode).padStart(2, "0")}</td>
                    <td>
                      <Link href={`/posts/${ep.slug}`}>{ep.title}</Link>
                    </td>
                    <td>{CHAPTER_TYPE_LABEL[ep.chapterType]}</td>
                    <td>{ep.projectStage}</td>
                    <td>{STATUS_LABEL.published}</td>
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
