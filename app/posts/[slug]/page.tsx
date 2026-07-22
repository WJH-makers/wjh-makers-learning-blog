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
  const posts = await getAllPublishedPosts();
  const params: { slug: string; page?: string }[] = [];
  for (const post of posts) {
    params.push({ slug: post.slug });
    const sections = splitSections(post.content);
    for (let p = 2; p <= sections.length; p++) {
      params.push({ slug: post.slug, page: String(p) });
    }
  }
  return params;
}

export const revalidate = 604800;
export const runtime = "nodejs";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};
  const url = `${siteUrl()}/posts/${post.slug}`;
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.summary,
      url,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: "summary",
      title: post.title,
      description: post.summary,
    },
  };
}

function splitSections(markdown: string): string[] {
  const splitByHeading = (text: string, level: 1 | 2): string[] => {
    const re = level === 1 ? /^# / : /^## /;
    const lines = text.split(/\r?\n/);
    const out: string[] = [];
    let cur: string[] = [];
    let fence = false;
    for (const line of lines) {
      if (line.startsWith("```")) fence = !fence;
      if (!fence && re.test(line) && cur.some((l) => l.trim())) {
        out.push(cur.join("\n"));
        cur = [];
      }
      cur.push(line);
    }
    if (cur.some((l) => l.trim())) out.push(cur.join("\n"));
    return out;
  };

  const MAX_LINES = 220;
  const blocks = splitByHeading(markdown, 1);
  if (blocks.length === 0) return [markdown];

  const result: string[] = [];
  for (const block of blocks) {
    if (block.split("\n").length <= MAX_LINES) {
      result.push(block);
    } else {
      const subs = splitByHeading(block, 2);
      result.push(...(subs.length > 1 ? subs : [block]));
    }
  }
  return result.length > 0 ? result : [markdown];
}

export default async function PostPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const url = `${siteUrl()}/posts/${post.slug}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: siteUrl() },
      { "@type": "ListItem", position: 2, name: "博客", item: `${siteUrl()}/posts` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    url: `${siteUrl()}/posts/${post.slug}`,
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: "WJH-makers",
      alternateName: "WJH-makers",
      url: "https://github.com/WJH-makers",
    },
    keywords: post.tags.join(", "),
    inLanguage: "zh-CN",
  };

  const sections = splitSections(post.content);
  const rawPage = parseInt(pageParam ?? "1", 10);
  const page = Math.max(1, Math.min(sections.length, isNaN(rawPage) ? 1 : rawPage));
  const content = sections[page - 1];
  const contentHtml = await markdownToHtml(content);
  const sectionTitle = content.match(/^#{1,2} (.+)/m)?.[1] ?? "";

  return (
    <article className="page-shell article-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
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
