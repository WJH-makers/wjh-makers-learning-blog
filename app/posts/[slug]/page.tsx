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

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await searchParams;
  const post = await getPublishedPost(slug);
  if (!post) return {};
  const suffix = page && page !== "1" ? `?page=${page}` : "";
  const url = `${siteUrl()}/posts/${post.slug}${suffix}`;
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary,
      url,
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: { card: "summary", title: post.title, description: post.summary },
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

function sectionLabel(section: string, i: number): string {
  return section.match(/^#{1,3}\s+(.+)/m)?.[1]?.trim() ?? `第 ${i + 1} 节`;
}

export default async function PostPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const sections = splitSections(post.content);
  const rawPage = parseInt(pageParam ?? "1", 10);
  const page = Math.max(1, Math.min(sections.length, Number.isNaN(rawPage) ? 1 : rawPage));
  const content = sections[page - 1];
  const contentHtml = await markdownToHtml(content);
  const sectionTitle = sectionLabel(content, page - 1);
  const multi = sections.length > 1;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    keywords: post.tags.join(", "),
    author: { "@type": "Person", name: "万佳泓", url: "https://github.com/WJH-makers" },
    mainEntityOfPage: `${siteUrl()}/posts/${post.slug}`,
  };

  return (
    <article className="page-shell article-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <Link className="back-link" href="/posts">← 返回文章列表</Link>
      <header className="article-header">
        <p className="date">{post.date} · {post.readingMinutes} min read</p>
        <h1>{post.title}</h1>
        {multi && sectionTitle && <p className="eyebrow" style={{ marginTop: 8 }}>§ {sectionTitle}</p>}
        <p>{post.summary}</p>
        <div className="tags">
          {post.tags.map((tag) => <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>)}
        </div>
      </header>

      {multi && (
        <nav className="section-toc" aria-label="章节目录">
          {sections.map((s, i) => {
            const n = i + 1;
            return (
              <Link
                key={n}
                href={`/posts/${slug}?page=${n}`}
                className={n === page ? "toc-item active" : "toc-item"}
                aria-current={n === page ? "page" : undefined}
              >
                <span className="toc-n">{String(n).padStart(2, "0")}</span>
                {sectionLabel(s, i)}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="article-content" dangerouslySetInnerHTML={{ __html: contentHtml }} />

      {multi && (
        <nav className="pagination" aria-label="分节翻页">
          {page > 1 ? (
            <Link className="pagination-prev" href={`/posts/${slug}?page=${page - 1}`}>← 上一节</Link>
          ) : <span aria-hidden />}
          <span className="pagination-info">{page} / {sections.length}</span>
          {page < sections.length ? (
            <Link className="pagination-next" href={`/posts/${slug}?page=${page + 1}`}>下一节 →</Link>
          ) : <span aria-hidden />}
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
