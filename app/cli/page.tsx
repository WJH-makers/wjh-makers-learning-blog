import Link from "next/link";
import { CHAPTER_TYPE_LABEL, STATUS_LABEL, seasonPublishedSlugs } from "@/lib/series";
import { CLI_SEASONS, CLI_SERIES_META, cliPublishedEpisodes } from "@/lib/series-cli";
import { siteUrl } from "@/lib/site-config";
import { jsonLdSafe, publisherRef } from "@/lib/jsonld";
import { staticPageMetadata } from "@/lib/og-base";
import JavaProgress from "../java/JavaProgress";
import SeriesMap from "../java/SeriesMap";
import { isReleasedSlug } from "@/lib/publication";
import { publicAssetUrl } from "@/lib/assets";


export const metadata = staticPageMetadata({
  title: "从零开始玩命令行 · 阿零与特米终端大陆",
  description: CLI_SERIES_META.tagline,
  path: "/cli",
  // 未开更的蓝图页对搜索引擎是薄内容;开更后自动恢复索引。
  robots: cliPublishedEpisodes().length === 0 ? { index: false, follow: true } : undefined,
});

export default function CliSeriesPage() {
  const done = cliPublishedEpisodes().length;
  const progressSeasons = CLI_SEASONS.map((s) => ({
    code: s.code,
    title: s.title,
    slugs: seasonPublishedSlugs(s),
  })).filter((s) => s.slugs.length > 0);

  if (done === 0) {
    return (
      <div className="page-shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Terminal Continent · 创作中</p>
            <h1>{CLI_SERIES_META.title}</h1>
            <p className="hero-text">这条路线尚未正式开更。章节表、排期和技术承诺留在创作后台，首篇通过校验后才会在这里点亮。</p>
            <div className="hero-actions"><Link className="button primary" href="/start">返回阅读起点</Link></div>
          </div>
        </section>
      </div>
    );
  }

  // 系列主实体:与文章页 isPartOf 里的 CreativeWorkSeries 引用(name/url)严格一致,形成双向闭环。
  const seriesJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWorkSeries",
    name: CLI_SERIES_META.title,
    url: `${siteUrl()}/cli`,
    description: CLI_SERIES_META.tagline,
    inLanguage: "zh-CN",
    // 与 layout 的 publisherNode 同一实体（见 app/posts/[slug]/page.tsx 的同款用法）。
    author: publisherRef(siteUrl()),
    hasPart: cliPublishedEpisodes().map((ep, i) => ({
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
          <p className="eyebrow">连载特刊 · 第二部</p>
          <h1>{CLI_SERIES_META.title}</h1>
          <p className="hero-text">{CLI_SERIES_META.tagline}</p>
          <div className="hero-actions">
            {done > 0 && (
              <Link className="button primary" href={`/posts/${cliPublishedEpisodes()[0].slug}`}>
                从第一话开始 →
              </Link>
            )}
            <Link className="button" href="/java">前作:从零开始学 Java</Link>
          </div>
        </div>
        <div className="hero-panel">
          <p className="eyebrow">连载进度</p>
          <p>
            已连载 <strong>{done}</strong> 话
          </p>
          <p className="muted">
            长期项目:{CLI_SERIES_META.project} · 每话附 🪟 双系统对照(Linux ↔ PowerShell)
          </p>
        </div>
      </section>

      <section className="comic-intro" aria-labelledby="cli-comic-cast-title">
        <div>
          <p className="eyebrow">Comic Cover · 系列视觉</p>
          <h2 id="cli-comic-cast-title">{CLI_SERIES_META.comicCast.title}</h2>
          <p>{CLI_SERIES_META.comicCast.description}</p>
        </div>
        <picture>
          <source type="image/avif" srcSet={`${publicAssetUrl(`${CLI_SERIES_META.comicCast.image}-512.avif`)} 512w, ${publicAssetUrl(`${CLI_SERIES_META.comicCast.image}.avif`)} 1024w`} sizes="(max-width: 760px) calc(100vw - 32px), 420px" />
          <source type="image/webp" srcSet={`${publicAssetUrl(`${CLI_SERIES_META.comicCast.image}-512.webp`)} 512w, ${publicAssetUrl(`${CLI_SERIES_META.comicCast.image}.webp`)} 1024w`} sizes="(max-width: 760px) calc(100vw - 32px), 420px" />
          <img src={publicAssetUrl(`${CLI_SERIES_META.comicCast.image}.webp`)} alt={CLI_SERIES_META.comicCast.alt} width={1024} height={1536} loading="eager" decoding="async" />
        </picture>
      </section>

      {progressSeasons.length > 0 && (
        <JavaProgress seasons={progressSeasons} storageKey={CLI_SERIES_META.storageKey} />
      )}

      <section className="section-head" style={{ marginTop: "2.5rem" }}>
        <div>
          <p className="eyebrow">Knowledge Map · 知识地图</p>
          <h2>脉络版图</h2>
        </div>
        <span className="muted">点节点直达 · 读过的自动打勾</span>
      </section>
      <SeriesMap seasons={CLI_SEASONS} storageKey={CLI_SERIES_META.storageKey} />

      {CLI_SEASONS.map((season) => ({ ...season, episodes: season.episodes.filter((episode) => episode.status === "published" && isReleasedSlug(episode.slug)) })).filter((season) => season.episodes.length > 0).map((season) => (
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
