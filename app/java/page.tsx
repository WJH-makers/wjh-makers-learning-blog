import type { Metadata } from "next";
import Link from "next/link";
import {
  SERIES_META,
  SEASONS,
  PROJECT_STAGES,
  SIDE_QUESTS,
  CHAPTER_TYPE_LABEL,
  allEpisodes,
  publishedEpisodes,
} from "@/lib/series";
import { siteUrl } from "@/lib/posts";
import JavaProgress from "./JavaProgress";
import SeriesMap from "./SeriesMap";

export const revalidate = 3600;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "从零开始学 Java · 阿零与豆豆生态学院",
  description: SERIES_META.tagline,
  alternates: { canonical: `${siteUrl()}/java` },
  openGraph: {
    title: "从零开始学 Java · 阿零与豆豆生态学院",
    description: SERIES_META.tagline,
    url: `${siteUrl()}/java`,
    type: "website",
  },
};

const STATUS_LABEL: Record<string, string> = {
  published: "已连载",
  draft: "草稿",
  planned: "规划中",
};

export default function JavaSeriesPage() {
  const total = allEpisodes().length;
  const done = publishedEpisodes().length;
  const progressSeasons = SEASONS.map((s) => ({
    code: s.code,
    title: s.title,
    slugs: s.episodes.filter((e) => e.status === "published" && e.slug).map((e) => e.slug as string),
  })).filter((s) => s.slugs.length > 0);

  return (
    <div className="page-shell">
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
            已连载 <strong>{done}</strong> / 规划 {total} 话
          </p>
          <p className="muted">
            长期项目:{SERIES_META.project} · 基线 Java {SERIES_META.javaVersion} · 双版本验证{" "}
            {SERIES_META.verifiedVersions.join(" / ")}
          </p>
        </div>
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
            {PROJECT_STAGES.map((s) => (
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
      <SeriesMap seasons={SEASONS} storageKey="java-academy:completed" stages={PROJECT_STAGES.map((s) => ({ season: s.season, stage: s.stage }))} />

      {SEASONS.map((season) => (
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
