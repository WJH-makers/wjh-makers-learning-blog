import type { Metadata } from "next";
import Link from "next/link";
import { CHAPTER_TYPE_LABEL, STATUS_LABEL, seasonPublishedSlugs } from "@/lib/series";
import { CLI_SEASONS, CLI_SERIES_META, cliAllEpisodes, cliPublishedEpisodes } from "@/lib/series-cli";
import { siteUrl } from "@/lib/posts";
import { jsonLdSafe, personRef } from "@/lib/jsonld";
import { OG_BASE } from "@/lib/og-base";
import JavaProgress from "../java/JavaProgress";
import SeriesMap from "../java/SeriesMap";

export const revalidate = 3600;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "从零开始玩命令行 · 阿零与特米终端大陆",
  description: CLI_SERIES_META.tagline,
  alternates: { canonical: `${siteUrl()}/cli` },
  // 未开更的蓝图页对搜索引擎是薄内容;开更后自动恢复索引。
  robots: cliPublishedEpisodes().length === 0 ? { index: false, follow: true } : undefined,
  openGraph: {
    ...OG_BASE,
    title: "从零开始玩命令行 · 阿零与特米终端大陆",
    description: CLI_SERIES_META.tagline,
    url: `${siteUrl()}/cli`,
    type: "website",
  },
};

export default function CliSeriesPage() {
  const total = cliAllEpisodes().length;
  const done = cliPublishedEpisodes().length;
  const progressSeasons = CLI_SEASONS.map((s) => ({
    code: s.code,
    title: s.title,
    slugs: seasonPublishedSlugs(s),
  })).filter((s) => s.slugs.length > 0);

  // 系列主实体:与文章页 isPartOf 里的 CreativeWorkSeries 引用(name/url)严格一致,形成双向闭环。
  const seriesJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWorkSeries",
    name: CLI_SERIES_META.title,
    url: `${siteUrl()}/cli`,
    description: CLI_SERIES_META.tagline,
    inLanguage: "zh-CN",
    author: personRef(siteUrl()),
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
            已连载 <strong>{done}</strong> / 规划 {total} 话 · 周更中
          </p>
          <p className="muted">
            长期项目:{CLI_SERIES_META.project} · 每话附 🪟 双系统对照(Linux ↔ PowerShell)
          </p>
        </div>
      </section>

      <section className="learning-route" aria-labelledby="cli-outcome-title">
        <p className="eyebrow">Start here · 课程怎么产生价值</p>
        <h2 id="cli-outcome-title">把终端操作变成可复现的工作流</h2>
        <p>命令行系列用同一个终端大陆项目串起文件、进程与自动化，并把 Linux 与 PowerShell 的差异并列说明。每话读完可在本机复现，再用进度条继续下一步。</p>
        <div className="learning-route-grid">
          <div><span>01 · 读懂</span><p>先理解命令作用范围和输出，不把高风险命令当成口令。</p></div>
          <div><span>02 · 复现</span><p>按自己的系统执行最小步骤；Linux 与 PowerShell 的差异会被显式标出。</p></div>
          <div><span>03 · 迁移</span><p>把可重复的命令组织进日常工作流，而不是只记一行命令。</p></div>
        </div>
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
