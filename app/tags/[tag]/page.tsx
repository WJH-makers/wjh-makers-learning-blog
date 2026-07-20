import type { Metadata } from "next";
import Link from "next/link";
import { getAllPublishedTags, getPublishedPostsByTag } from "@/lib/posts";

type Props = {
  params: Promise<{ tag: string }>;
};

export async function generateStaticParams() {
  return (await getAllPublishedTags()).map(({ tag }) => ({ tag: encodeURIComponent(tag) }));
}

export const runtime = "nodejs";
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `标签：${decoded}`,
    description: `浏览 ${decoded} 相关学习记录。`,
  };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const posts = await getPublishedPostsByTag(decoded);

  return (
    <div className="page-shell narrow">
      <Link className="back-link" href="/tags">← 返回标签</Link>
      <div className="page-title">
        <p className="eyebrow">Topic Desk</p>
        <h1>{decoded}</h1>
        <p>{posts.length} 篇相关学习记录。</p>
      </div>
      <div className="post-list">
        {posts.length > 0 ? posts.map((post) => (
          <article className="list-item" key={post.slug}>
            <time>{post.date}</time>
            <div>
              <h2><Link href={`/posts/${post.slug}`}>{post.title}</Link></h2>
              <p>{post.summary}</p>
            </div>
          </article>
        )) : (
          <div className="empty-state">
            <p className="eyebrow">Empty Topic</p>
            <h3>这个主题暂时没有文章。</h3>
            <Link className="button primary" href="/write">写一篇补上</Link>
          </div>
        )}
      </div>
    </div>
  );
}
