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
  const totalLessons = seriesDone + cliPublishedEpisodes().length + cafePublishedEpisodes().length;

  return (
    <div className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Learn Publicly</p>
          <h1>豆豆课程组</h1>
          <p className="hero-text">CS · 遥感 VQA / 全栈 / 系统</p>
          <p className="hero-lede">把学习过程做成能阅读、能动手、也允许偶尔绕路的个人实验室。</p>
          <div className="hero-actions">
            <Link className="button primary" href="/posts">阅读博客</Link>
            <Link className="button" href="/java">Java 系列</Link>
            <Link className="button ghost" href="/random">闭眼开一页 ↗</Link>
          </div>
        </div>
        <aside className="hero-panel home-hero-panel" aria-label="学习现场速览">
          <p className="eyebrow">Learning desk · 今日工位</p>
          <strong>{totalLessons}<small> 个已发布学习节点</small></strong>
          <p>这里没有“从头读完”的压力。选一条线、完成一个小动作，再回到你的项目里。</p>
          <dl className="home-hero-stats">
            <div><dt>Java</dt><dd>{seriesDone} 话</dd></div>
            <div><dt>命令行</dt><dd>{cliPublishedEpisodes().length} 话</dd></div>
            <div><dt>咖啡站</dt><dd>{cafePublishedEpisodes().length} 话</dd></div>
          </dl>
        </aside>
      </section>

      <section className="home-start" aria-labelledby="start-here">
        <div className="home-start-head">
          <p className="eyebrow">Pick a door · 从一个入口开始</p>
          <h2 id="start-here">今天想让哪件事发生？</h2>
          <p>每条路线都有一个足够小的起点：读一话、敲一段、或给一段旧知识重新接上电。</p>
        </div>
        <div className="home-start-grid">
          <Link href="/posts/2026-07-25-java-s01e01-hello" className="home-start-card home-start-java">
            <span className="home-start-no">01 / 让程序开口</span>
            <strong>从第一句输出开始</strong>
            <span>读完就能在 Java 17 单文件实验里检查自己的第一段代码。</span>
            <b>进入最小实验 →</b>
          </Link>
          <Link href="/posts/2026-09-19-cli-s01e01-terminal" className="home-start-card home-start-cli">
            <span className="home-start-no">02 / 进入终端</span>
            <strong>和闪烁的光标打个招呼</strong>
            <span>从 pwd、ls、cd 三个立足指令，走进真实服务器的文件树。</span>
            <b>走进命令行 →</b>
          </Link>
          <Link href="/cafe" className="home-start-card home-start-cafe">
            <span className="home-start-no">03 / 读一段故事</span>
            <strong>先在咖啡站坐一会儿</strong>
            <span>不急着背概念；先跟着角色看一次系统为什么会在深夜出问题。</span>
            <b>打开故事地图 →</b>
          </Link>
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
