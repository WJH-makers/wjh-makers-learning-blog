import type { Metadata } from "next";
import Link from "next/link";
import { getAllPublishedPosts, siteUrl } from "@/lib/posts";

export const revalidate = 604800;
export const runtime = "nodejs";

const PAGE_SIZE = 6;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const posts = await getAllPublishedPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const raw = parseInt(sp.page ?? "1", 10);
  const page = Math.max(1, Math.min(totalPages, isNaN(raw) ? 1 : raw));
  const base = `${siteUrl()}/posts`;
  return {
    title: page > 1 ? `全部文章 · 第 ${page} 页` : "全部文章",
    description: "学习记录文章列表。",
    alternates: { canonical: page > 1 ? `${base}?page=${page}` : base },
    // 第 2 页起不重复进索引,第一页为规范入口
    robots: page > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const posts = await getAllPublishedPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const rawPage = parseInt(sp.page ?? "1", 10);
  const page = Math.max(1, Math.min(totalPages, isNaN(rawPage) ? 1 : rawPage));
  const slice = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="page-shell narrow">
      <div className="page-title">
        <p className="eyebrow">Archive Desk</p>
        <h1>全部文章</h1>
        <p>按时间倒序整理每日学习成果。</p>
      </div>

      <div className="post-list">
        {slice.length > 0 ? slice.map((post) => (
          <article className="list-item" key={post.slug}>
            <time>{post.date}</time>
            <div>
              <h2><Link href={`/posts/${post.slug}`}>{post.title}</Link></h2>
              <p>{post.summary}</p>
              <div className="tags">
                {post.tags.map((tag) => <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>)}
              </div>
            </div>
          </article>
        )) : (
          <div className="empty-state">
            <p className="eyebrow">No Articles</p>
            <h3>归档还没有文章。</h3>
            <Link className="button primary" href="/write">去写第一篇</Link>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="pagination">
          {page > 1 && <Link className="pagination-prev" href={`/posts?page=${page - 1}`}>← 上一页</Link>}
          <span className="pagination-info">{page} / {totalPages}</span>
          {page < totalPages && <Link className="pagination-next" href={`/posts?page=${page + 1}`}>下一页 →</Link>}
        </nav>
      )}
    </div>
  );
}
