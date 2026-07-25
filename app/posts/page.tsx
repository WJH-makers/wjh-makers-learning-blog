import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { getAllPublishedPosts, siteUrl, type Post } from "@/lib/posts";
import { publishedEpisodes, totalEpisodeCount } from "@/lib/series";
import { cliAllEpisodes, cliPublishedEpisodes } from "@/lib/series-cli";

export const revalidate = 604800;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "全部文章",
  description: "漫画连载、命令与速查手册、学习笔记 —— 分门别类。",
  alternates: { canonical: `${siteUrl()}/posts` },
};

// 连载话次单独有 /java /cli 地图,不塞进列表;速查与笔记分区展示。
function isSeriesEpisode(p: Post): boolean {
  return /(java|cli)-s\d/.test(p.slug);
}
function isCheatsheet(p: Post): boolean {
  return p.slug.includes("cheatsheet") || p.tags.some((t) => t === "命令速查" || t === "速查");
}

function ListItem({ post }: { post: Post }) {
  return (
    <article className="list-item">
      <time>{post.date}</time>
      <div>
        <h2><Link href={`/posts/${post.slug}`}>{post.title}</Link></h2>
        <p>{post.summary}</p>
        <div className="tags">
          {post.tags.slice(0, 5).map((tag) => (
            <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>
          ))}
        </div>
      </div>
    </article>
  );
}

export default async function PostsPage() {
  const posts = await getAllPublishedPosts();
  const cheatsheets = posts.filter((p) => !isSeriesEpisode(p) && isCheatsheet(p));
  const notes = posts.filter((p) => !isSeriesEpisode(p) && !isCheatsheet(p));

  return (
    <div className="page-shell narrow">
      <div className="page-title">
        <p className="eyebrow">Archive Desk</p>
        <h1>全部文章</h1>
        <p>漫画连载 · 命令与速查 · 学习笔记 —— 分门别类,各取所需。</p>
      </div>

      <section className="section-head">
        <div>
          <p className="eyebrow">Serialized · 连载</p>
          <h2>📖 漫画连载</h2>
        </div>
        <span className="muted">故事化的长篇教程</span>
      </section>
      <div className="post-grid">
        <Link href={"/java" as Route} className="card series-hero-card">
          <p className="series-hero-lead">从零开始学 Java</p>
          <p className="muted">已完结 {publishedEpisodes().length} / {totalEpisodeCount()} 话 · 阿零与豆豆 · 咖啡站 v0→v7</p>
        </Link>
        <Link href={"/cli" as Route} className="card series-hero-card">
          <p className="series-hero-lead">从零开始玩命令行</p>
          <p className="muted">连载中 {cliPublishedEpisodes().length} / {cliAllEpisodes().length} 话 · 阿零与特米 · Linux↔PowerShell</p>
        </Link>
      </div>

      {cheatsheets.length > 0 && (
        <>
          <section className="section-head">
            <div>
              <p className="eyebrow">Cheatsheets · 速查</p>
              <h2>📇 命令与速查手册</h2>
            </div>
            <span className="muted">Linux / Git / Docker / MySQL / Redis…</span>
          </section>
          <div className="post-list">
            {cheatsheets.map((post) => <ListItem key={post.slug} post={post} />)}
          </div>
        </>
      )}

      {notes.length > 0 && (
        <>
          <section className="section-head">
            <div>
              <p className="eyebrow">Notes · 笔记</p>
              <h2>📝 学习笔记</h2>
            </div>
            <span className="muted">环境配置 · 复盘 · 随笔</span>
          </section>
          <div className="post-list">
            {notes.map((post) => <ListItem key={post.slug} post={post} />)}
          </div>
        </>
      )}
    </div>
  );
}
