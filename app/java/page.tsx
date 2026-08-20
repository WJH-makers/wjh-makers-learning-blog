import Link from "next/link";
import { cacheLife } from "next/cache";
import {
  SERIES_META,
  SEASONS,
  PROJECT_STAGES,
  SIDE_QUESTS,
  CHAPTER_TYPE_LABEL,
  publishedEpisodes,
  seasonPublishedSlugs,
} from "@/lib/series";
import { siteUrl } from "@/lib/site-config";
import { publicAssetUrl } from "@/lib/assets";
import { jsonLdSafe, publisherRef } from "@/lib/jsonld";
import { staticPageMetadata } from "@/lib/og-base";
import JavaProgress from "./JavaProgress";
import SeriesMap from "./SeriesMap";


export const metadata = staticPageMetadata({
  title: "从零开始学 Java · 阿零与豆豆生态学院",
  description: SERIES_META.tagline,
  path: "/java",
});

export default async function JavaSeriesPage() {
  "use cache";
  cacheLife("content");

  const done = publishedEpisodes().length;
  const progressSeasons = SEASONS.map((s) => ({
    code: s.code,
    title: s.title,
    slugs: seasonPublishedSlugs(s),
  })).filter((s) => s.slugs.length > 0);
  const visibleSeasons = SEASONS.map((season) => ({
    ...season,
    episodes: season.episodes.filter((episode) => publishedEpisodes().some((item) => item.slug === episode.slug)),
  })).filter((season) => season.episodes.length > 0);

  // 系列主实体:与文章页 isPartOf 里的 CreativeWorkSeries 引用(name/url)严格一致,形成双向闭环。
  const seriesJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWorkSeries",
    name: SERIES_META.title,
    url: `${siteUrl()}/java`,
    description: SERIES_META.tagline,
    inLanguage: "zh-CN",
    // 与 layout 的 publisherNode 同一实体（见 app/posts/[slug]/page.tsx 的同款用法）。
    author: publisherRef(siteUrl()),
    hasPart: publishedEpisodes().map((ep, i) => ({
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
          <p className="eyebrow">连载特刊 · Serialized</p>
          <h1>{SERIES_META.title}</h1>
          <p className="hero-text">{SERIES_META.tagline}</p>
          <div className="hero-actions">
            {done > 0 && (
              <Link className="button primary" href={`/posts/${publishedEpisodes()[0].slug}`}>
                从第一话开始 →
              </Link>
            )}
            <Link className="button" href="/posts">
              返回全部文章
            </Link>
          </div>
        </div>
        <div className="hero-panel">
          <p className="eyebrow">连载进度</p>
          <p>
            已连载 <strong>{done}</strong> 话
          </p>
          <p className="muted">
            长期项目:{SERIES_META.project} · 基线 Java {SERIES_META.javaVersion} · 双版本验证{" "}
            {SERIES_META.verifiedVersions.join(" / ")}
          </p>
        </div>
      </section>

      <section className="comic-intro" aria-labelledby="comic-cast-title">
        <div>
          <p className="eyebrow">Comic Cast · 漫画设定</p>
          <h2 id="comic-cast-title">遇见阿零与豆豆</h2>
          <p>
            阿零负责把每个初学者真的会问的问题问出来；豆豆则用一杯咖啡、一次翻车和一句吐槽，把抽象的 Java 概念拆到能亲手验证。
          </p>
          <p className="muted">从第一话开始，所有代码都会在「豆豆咖啡站」这个项目里持续生长。</p>
        </div>
        <picture>
          <source type="image/avif" srcSet={`${publicAssetUrl("/comics/java/alings-and-doudou-character-sheet-512.avif")} 512w, ${publicAssetUrl("/comics/java/alings-and-doudou-character-sheet.avif")} 1055w`} sizes="(max-width: 900px) 94vw, 700px" />
          <source type="image/webp" srcSet={`${publicAssetUrl("/comics/java/alings-and-doudou-character-sheet-512.webp")} 512w, ${publicAssetUrl("/comics/java/alings-and-doudou-character-sheet.webp")} 1055w`} sizes="(max-width: 900px) 94vw, 700px" />
          <img
            src={publicAssetUrl("/comics/java/alings-and-doudou-character-sheet.webp")}
            alt="阿零与豆豆的角色设定图：阿零、豆豆、javac 编译官与 Java JVM 城主，以及深夜工作台场景"
            width={1055}
            height={1491}
            loading="lazy"
            decoding="async"
          />
        </picture>
      </section>

      <JavaProgress seasons={progressSeasons} />

      <section className="section-head">
        <div>
          <p className="eyebrow">Project Timeline</p>
          <h2>咖啡站成长时间线</h2>
        </div>
        <span className="muted">每个知识点都在解决它的真实问题</span>
      </section>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>卷</th>
              <th>咖啡站形态</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {PROJECT_STAGES.filter((stage) => visibleSeasons.some((season) => season.season === stage.season)).map((s) => (
              <tr key={s.stage}>
                <td>S{s.season}</td>
                <td>{s.stage}</td>
                <td>{s.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="section-head" style={{ marginTop: "2.5rem" }}>
        <div>
          <p className="eyebrow">Knowledge Map · 知识地图</p>
          <h2>脉络版图</h2>
        </div>
        <span className="muted">点节点直达 · 读过的自动打勾</span>
      </section>
      <SeriesMap seasons={visibleSeasons} storageKey="java-academy:completed" stages={PROJECT_STAGES.map((s) => ({ season: s.season, stage: s.stage }))} />

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
                  <th>咖啡站阶段</th>
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
                    <td>已发布</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="section-head" style={{ marginTop: "2.5rem" }}>
        <div>
          <p className="eyebrow">Side Quests</p>
          <h2>番外 · 平行宇宙</h2>
        </div>
        <span className="muted">主线完成后的职业转职,不塞进主线</span>
      </section>
      <div className="post-grid">
        {SIDE_QUESTS.map((q) => (
          <article className="card" key={q.slug}>
            <p className="eyebrow">{q.positioning}</p>
            <h3>{q.title}</h3>
            <p>{q.reason}</p>
            <div className="tags">
              {q.technologies.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
