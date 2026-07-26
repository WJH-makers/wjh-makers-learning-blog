import type { Metadata } from "next";
import Link from "next/link";
import { getAllPublishedPosts, siteUrl } from "@/lib/posts";
import { SERIES_META, publishedEpisodes, totalEpisodeCount } from "@/lib/series";
import { CLI_SERIES_META, cliAllEpisodes, cliPublishedEpisodes } from "@/lib/series-cli";
import { CAFE_SERIES_META, cafeAllEpisodes, cafePublishedEpisodes } from "@/lib/series-cafe";

export const revalidate = 3600;
export const runtime = "nodejs";

// title/description/OG 沿用 layout 默认;首页只需补 canonical 这一环。
export const metadata: Metadata = {
  alternates: { canonical: siteUrl() },
};

export default async function HomePage() {
  const posts = await getAllPublishedPosts();

  const latestPosts = posts.slice(0, 3);
  const seriesDone = publishedEpisodes().length;

  return (
    <div className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Learn Publicly</p>
          <h1>WJH-makers</h1>
          <p className="hero-text">CS · 遥感 VQA / 全栈 / 系统</p>
          <div className="hero-actions">
            <Link className="button primary" href="/posts">阅读博客</Link>
            <Link className="button" href="/java">Java 系列</Link>
          </div>
        </div>
      </section>

      <section className="section-head">
        <div>
          <p className="eyebrow">New Series · 连载中 · 第三部</p>
          <h2>豆豆咖啡站</h2>
        </div>
        <Link href="/cafe">查看故事地图 →</Link>
      </section>
      <Link href="/cafe" className="card series-hero-card">
        <p className="series-hero-lead">{CAFE_SERIES_META.tagline}</p>
        <p className="muted">
          已连载 {cafePublishedEpisodes().length} / 规划 {cafeAllEpisodes().length} 话 · 删掉所有技术名词,这一话仍然值得阅读
        </p>
      </Link>

      <section className="section-head">
        <div>
          <p className="eyebrow">Now Serializing · 连载中 · 周更</p>
          <h2>从零开始玩命令行</h2>
        </div>
        <Link href="/cli">查看全卷地图 →</Link>
      </section>
      <Link href="/cli" className="card series-hero-card">
        <p className="series-hero-lead">{CLI_SERIES_META.tagline}</p>
        <p className="muted">
          已连载 {cliPublishedEpisodes().length} / 规划 {cliAllEpisodes().length} 话 · 每话附 🪟 Linux ↔ PowerShell 双系统对照
        </p>
      </Link>

      <section className="section-head">
        <div>
          <p className="eyebrow">Flagship Series · 主线 56 话完结 · 番外三卷 34 话</p>
          <h2>从零开始学 Java</h2>
        </div>
        <Link href="/java">查看全卷地图 →</Link>
      </section>
      <Link href="/java" className="card series-hero-card">
        <p className="series-hero-lead">{SERIES_META.tagline}</p>
        <p className="muted">
          已连载 {seriesDone} / {totalEpisodeCount()} 话 · 跟着阿零和豆豆,把「豆豆咖啡站」从一行输出建成完整系统
        </p>
      </Link>

      {latestPosts.length > 0 && (
        <>
          <section className="section-head">
            <div>
              <p className="eyebrow">Latest Dispatches</p>
              <h2>最新博客</h2>
            </div>
            <Link href="/posts">查看全部 →</Link>
          </section>
          <div className="post-grid">
            {latestPosts.map((post) => (
              <article className="card" key={post.slug}>
                <p className="date">{post.date} · {post.readingMinutes} min</p>
                <h3><Link href={`/posts/${post.slug}`}>{post.title}</Link></h3>
                <p>{post.summary}</p>
                <div className="tags">
                  {post.tags.map((tag) => (
                    <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
