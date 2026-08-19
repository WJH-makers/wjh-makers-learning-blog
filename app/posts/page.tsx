import Link from "next/link";
import { getAllPublishedPosts, type Post } from "@/lib/posts";
import { staticPageMetadata } from "@/lib/og-base";
import { SERIES_LIST, findEpisodeInfo, seriesProgress } from "@/lib/series-registry";


export const metadata = staticPageMetadata({
  title: "文章精选 · 速查与笔记",
  description: "速查手册与学习笔记的精选列表;连载话次在各系列地图里,全量清单见 /archive。",
  path: "/posts",
});

// 连载话次单独有系列地图,不塞进列表;速查与笔记分区展示。
// 走注册表判定而非 slug 正则 —— 新开一条线不改这里也能正确归类。
function isSeriesEpisode(p: Post): boolean {
  return findEpisodeInfo(p.slug) !== undefined;
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
            <span key={tag}>{tag}</span>
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
        <p className="eyebrow">Selected · 精选</p>
        <h1>文章精选 · 速查与笔记</h1>
        <p>
          这一页放速查手册与学习笔记。连载话次各有自己的地图(见 <Link href="/series">连载总台</Link>),
          想要不分类的完整清单请去 <Link href="/archive">全量归档</Link>。
        </p>
      </div>

      <section className="section-head">
        <div>
          <p className="eyebrow">Serialized · 连载</p>
          <h2>📖 漫画连载</h2>
        </div>
        <Link href="/series">全部 {SERIES_LIST.length} 条 →</Link>
      </section>
      <div className="post-grid">
        {SERIES_LIST.map((series) => ({ series, p: seriesProgress(series) }))
          .filter(({ p }) => p.done > 0)
          .map(({ series, p }) => (
            <Link key={series.route} href={series.route} className="card series-hero-card">
              <p className="series-hero-lead">{series.title}</p>
              <p className="muted">
                {p.done >= p.total ? "已完结" : "连载中"} {p.done} / {p.total} 话
                {series.alias ? ` · ${series.alias}` : ""}
              </p>
            </Link>
          ))}
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
