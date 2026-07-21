import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPublishedPosts, getPublishedPost, markdownToHtml, siteUrl } from "@/lib/posts";
import AdminEditLink from "./AdminEditLink";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateStaticParams() {
  return (await getAllPublishedPosts()).map((post) => ({ slug: post.slug }));
}

export const revalidate = 3600;
export const runtime = "nodejs";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: `${siteUrl()}/posts/${post.slug}` },
  };
}

function splitSections(markdown: string): string[] {
  const sections = markdown.split(/(?=^## )/m).filter(Boolean);
  if (sections.length === 0) return [markdown];
  return sections;
}

export default async function PostPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const sections = splitSections(post.content);
  const rawPage = parseInt(pageParam ?? "1", 10);
  const page = Math.max(1, Math.min(sections.length, isNaN(rawPage) ? 1 : rawPage));
  const content = sections[page - 1];
  const contentHtml = await markdownToHtml(content);
  const sectionTitle = content.match(/^## (.+)/m)?.[1] ?? "";

  return (
    <article className="page-shell article-shell">
      <Link className="back-link" href="/posts">← 返回文章列表</Link>
      <header className="article-header">
        <p className="date">{post.date} · {post.readingMinutes} min read</p>
        <h1>{post.title}</h1>
        {sectionTitle && <p className="eyebrow" style={{ marginTop: 8 }}>§ {sectionTitle}</p>}
        <p>{post.summary}</p>
        <div className="tags">
          {post.tags.map((tag) => <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>)}
        </div>
      </header>
      <div className="article-content" dangerouslySetInnerHTML={{ __html: contentHtml }} />

      {sections.length > 1 && (
        <nav className="pagination">
          {page > 1 && (
            <Link className="pagination-prev" href={`/posts/${slug}?page=${page - 1}`}>
              ← 上一节
            </Link>
          )}
          <span className="pagination-info">{page} / {sections.length}</span>
          {page < sections.length && (
            <Link className="pagination-next" href={`/posts/${slug}?page=${page + 1}`}>
              下一节 →
            </Link>
          )}
        </nav>
      )}

      <nav className="article-actions" aria-label="文章操作">
        <AdminEditLink slug={post.slug} />
        <Link className="button primary" href="/write">写今日心得</Link>
        <Link className="button" href="/posts">继续看归档</Link>
        <Link className="button ghost" href="/tags">按标签检索</Link>
      </nav>
    </article>
  );
}
