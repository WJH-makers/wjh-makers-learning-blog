import Link from "next/link";
import { getAllPublishedPosts, getAllPublishedTags } from "@/lib/posts";

export const revalidate = 3600;
export const runtime = "nodejs";

export default async function HomePage() {
  const [posts, tags] = await Promise.all([
    getAllPublishedPosts(),
    getAllPublishedTags(),
  ]);

  const latestPosts = posts.slice(0, 6);

  return (
    <div className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Learn Publicly</p>
          <h1>WJH-makers</h1>
          <p className="hero-text">
            CS本科 &middot; 遥感视觉问答 &middot; MoE &middot; 全栈学习记录
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/posts">阅读博客</Link>
            <Link className="button" href="/tags">标签检索</Link>
            <Link className="button" href="/write">写心得</Link>
          </div>
        </div>
        <div className="hero-panel">
          <strong>{posts.length}</strong>
          <p>已列文章</p>
          <ol>
            <li>经公开标签检索 &rarr; {tags.length}</li>
            <li>每日学习沉淀归档</li>
            <li>MongoDB + Markdown 双写</li>
          </ol>
        </div>
      </section>

      <section className="stats-grid">
        <div>
          <strong>{posts.length}</strong>
          <span>学习记录</span>
        </div>
        <div>
          <strong>{tags.length}</strong>
          <span>技术标签</span>
        </div>
        <div>
          <strong>{posts.reduce((s, p) => s + p.readingMinutes, 0)}m</strong>
          <span>累计阅读</span>
        </div>
      </section>

      {latestPosts.length > 0 && (
        <>
          <section className="section-head">
            <div>
              <p className="eyebrow">Latest Dispatches</p>
              <h2>最新博客</h2>
            </div>
            <Link href="/posts">查看全部 &rarr;</Link>
          </section>
          <div className="post-grid">
            {latestPosts.map((post) => (
              <article className="card" key={post.slug}>
                <p className="date">{post.date} &middot; {post.readingMinutes} min</p>
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
