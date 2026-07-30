import type { Metadata } from "next";
import Link from "next/link";
import { getAllPublishedPosts, siteUrl } from "@/lib/posts";

export const revalidate = 3600;
export const runtime = "nodejs";

export const metadata: Metadata = {
  alternates: { canonical: siteUrl() },
};

export default async function HomePage() {
  const latestPosts = (await getAllPublishedPosts()).slice(0, 3);

  return (
    <div className="page-shell">
      <section className="hero home-hero">
        <div>
          <p className="eyebrow">Story-first technical learning</p>
          <h1>豆豆课程组</h1>
          <p className="hero-lede">从第一句 Java、第一条命令，到咖啡站里的真实系统问题。</p>
          <div className="hero-actions">
            <Link className="button primary" href="/series">选择一条课程</Link>
            <Link className="button" href="/posts/2026-07-25-java-s01e01-hello">从最小实验开始</Link>
          </div>
        </div>
      </section>

      <section className="home-start" aria-labelledby="start-here">
        <div className="home-start-head">
          <p className="eyebrow">Pick a path</p>
          <h2 id="start-here">从一条主线开始</h2>
          <p>首页只负责带路；课程地图和文章页再展开全部细节。</p>
        </div>
        <div className="home-start-grid">
          <Link href="/java" className="home-start-card home-start-java">
            <span className="home-start-no">01 / Java</span>
            <strong>从零开始学 Java</strong>
            <span>用故事、代码和最小实验走完一条完整主线。</span>
            <b>进入课程 →</b>
          </Link>
          <Link href="/cli" className="home-start-card home-start-cli">
            <span className="home-start-no">02 / Command line</span>
            <strong>从零开始玩命令行</strong>
            <span>在自己的终端里建立可靠的操作习惯。</span>
            <b>进入课程 →</b>
          </Link>
          <Link href="/cafe" className="home-start-card home-start-cafe">
            <span className="home-start-no">03 / Story</span>
            <strong>豆豆咖啡站</strong>
            <span>从一间小店的故事，认识软件系统为何会出问题。</span>
            <b>打开故事地图 →</b>
          </Link>
        </div>
      </section>

      {latestPosts.length > 0 && (
        <>
          <section className="section-head">
            <div>
              <p className="eyebrow">Recently added</p>
              <h2>最近更新</h2>
            </div>
            <Link href="/archive">查看全部 →</Link>
          </section>
          <div className="home-latest-list">
            {latestPosts.map((post) => (
              <Link href={`/posts/${post.slug}`} className="home-latest-item" key={post.slug}>
                <p className="date">{post.date} · {post.readingMinutes} min</p>
                <h3>{post.title}</h3>
                <span>阅读文章 →</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
