import type { Metadata } from "next";
import Link from "next/link";
import { CHAPTER_TYPE_LABEL } from "@/lib/series";
import { CLI_SEASONS, CLI_SERIES_META, cliAllEpisodes, cliPublishedEpisodes } from "@/lib/series-cli";
import { siteUrl } from "@/lib/posts";
import JavaProgress from "../java/JavaProgress";

export const revalidate = 3600;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "从零开始玩命令行 · 阿零与特米终端大陆",
  description: CLI_SERIES_META.tagline,
  alternates: { canonical: `${siteUrl()}/cli` },
  openGraph: {
    title: "从零开始玩命令行 · 阿零与特米终端大陆",
    description: CLI_SERIES_META.tagline,
    url: `${siteUrl()}/cli`,
    type: "website",
  },
};

const STATUS_LABEL: Record<string, string> = {
  published: "已连载",
  draft: "草稿",
  planned: "规划中",
};

export default function CliSeriesPage() {
  const total = cliAllEpisodes().length;
  const done = cliPublishedEpisodes().length;
  const progressSeasons = CLI_SEASONS.map((s) => ({
    code: s.code,
    title: s.title,
    slugs: s.episodes.filter((e) => e.status === "published" && e.slug).map((e) => e.slug as string),
  })).filter((s) => s.slugs.length > 0);

  return (
    <div className="page-shell">
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
            已连载 <strong>{done}</strong> / 规划 {total} 话 · 周更中
          </p>
          <p className="muted">
            长期项目:{CLI_SERIES_META.project} · 每话附 🪟 双系统对照(Linux ↔ PowerShell)
          </p>
        </div>
      </section>

      {progressSeasons.length > 0 && (
        <JavaProgress seasons={progressSeasons} storageKey={CLI_SERIES_META.storageKey} />
      )}

      {CLI_SEASONS.map((season) => (
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
