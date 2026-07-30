import Link from "next/link";
import { CHAPTER_TYPE_LABEL, STATUS_LABEL, seasonPublishedSlugs } from "@/lib/series";
import { CAFE_SEASONS, CAFE_SERIES_META, CAFE_STAGES, cafePublishedEpisodes } from "@/lib/series-cafe";
import { siteUrl } from "@/lib/posts";
import { jsonLdSafe } from "@/lib/jsonld";
import { staticPageMetadata } from "@/lib/og-base";
import JavaProgress from "../java/JavaProgress";
import SeriesMap from "../java/SeriesMap";
import { isReleasedSlug } from "@/lib/publication";

export const revalidate = 3600;
export const runtime = "nodejs";

export const metadata = staticPageMetadata({
  title: "豆豆咖啡站 · 温情工程物语",
  description: CAFE_SERIES_META.tagline,
  path: "/cafe",
  // 未开更的蓝图页对搜索引擎是薄内容;开更后自动恢复索引。
  robots: cafePublishedEpisodes().length === 0 ? { index: false, follow: true } : undefined,
});

export default function CafeSeriesPage() {
  const done = cafePublishedEpisodes().length;
  const progressSeasons = CAFE_SEASONS.map((s) => ({
    code: s.code,
    title: s.title,
    slugs: seasonPublishedSlugs(s),
  })).filter((s) => s.slugs.length > 0);

  if (done === 0) {
    return (
      <div className="page-shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Coffee Station · 创作中</p>
            <h1>{CAFE_SERIES_META.title}</h1>
            <p className="hero-text">故事主线尚未正式开更。设定、章节表和日期只在创作后台维护，真正发布的第一话会从这里开始。</p>
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
    name: CAFE_SERIES_META.title,
    url: `${siteUrl()}/cafe`,
    description: CAFE_SERIES_META.tagline,
    inLanguage: "zh-CN",
    author: {
      "@type": "Person",
      name: "咖啡站技术志",
      url: siteUrl(),
    },
    hasPart: cafePublishedEpisodes().map((ep, i) => ({
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
          <p className="eyebrow">连载特刊 · 第三部</p>
          <h1>{CAFE_SERIES_META.title}</h1>
          <p className="hero-text">{CAFE_SERIES_META.tagline}</p>
          <div className="hero-actions">
            {done > 0 && (
              <Link className="button primary" href={`/posts/${cafePublishedEpisodes()[0].slug}`}>
                从第一话开始 →
              </Link>
            )}
            <Link className="button" href="/java">从零开始学 Java</Link>
            <Link className="button" href="/cli">从零开始玩命令行</Link>
          </div>
        </div>
        <div className="hero-panel">
          <p className="eyebrow">连载进度</p>
          <p>
            已连载 <strong>{done}</strong> 话
          </p>
          <p className="muted">
            长期项目:{CAFE_SERIES_META.project} · 删掉所有技术名词,这一话仍然值得阅读
          </p>
        </div>
      </section>

      {progressSeasons.length > 0 && (
        <JavaProgress seasons={progressSeasons} storageKey={CAFE_SERIES_META.storageKey} />
      )}

      <section className="section-head" style={{ marginTop: "2.5rem" }}>
        <div>
          <p className="eyebrow">Story Map · 故事地图</p>
          <h2>脉络版图</h2>
        </div>
        <span className="muted">点节点直达 · 读过的自动打勾</span>
      </section>
      <SeriesMap
        seasons={CAFE_SEASONS}
        storageKey={CAFE_SERIES_META.storageKey}
        stages={CAFE_STAGES.map((s) => ({ season: s.season, stage: s.stage }))}
      />

      {CAFE_SEASONS.map((season) => ({ ...season, episodes: season.episodes.filter((episode) => episode.status === "published" && isReleasedSlug(episode.slug)) })).filter((season) => season.episodes.length > 0).map((season) => (
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
