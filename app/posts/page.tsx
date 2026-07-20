import Link from "next/link";
import { getAllPublishedPosts } from "@/lib/posts";

export const metadata = {
  title: "全部文章",
  description: "万佳泓的每日学习记录文章列表。",
};

export const revalidate = 3600;
export const runtime = "nodejs";

export default async function PostsPage() {
  const posts = await getAllPublishedPosts();

  return (
    <div className="page-shell narrow">
      <div className="page-title">
        <p className="eyebrow">Archive Desk</p>
        <h1>全部文章</h1>
        <p>按时间倒序整理每日学习成果：问题、命令、验证证据和复盘都会进入这份个人工程报纸。</p>
      </div>

      <div className="post-list">
        {posts.length > 0 ? posts.map((post) => (
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
    </div>
  );
}
