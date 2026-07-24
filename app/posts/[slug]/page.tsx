import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPublishedPosts, getPublishedPost, markdownToHtml, siteUrl, splitSections } from "@/lib/posts";
import AdminEditLink from "./AdminEditLink";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

// page 是 searchParams(query),不是路由段,故只需按 slug 预生成;分页由 searchParams 处理。
export async function generateStaticParams() {
  const posts = await getAllPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export const revalidate = 604800;
export const runtime = "nodejs";

function resolvePage(param: string | undefined, total: number): number {
  const raw = parseInt(param ?? "1", 10);
  return Math.max(1, Math.min(total, isNaN(raw) ? 1 : raw));
}

// 第一页用干净 URL(不带 ?page=1),与 canonical 保持一致
function pageHref(slug: string, p: number): Route {
  return (p <= 1 ? `/posts/${slug}` : `/posts/${slug}?page=${p}`) as Route;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const post = await getPublishedPost(slug);
  if (!post) return {};

  const sections = splitSections(post.content);
  const page = resolvePage(pageParam, sections.length);
  const base = `${siteUrl()}/posts/${post.slug}`;
  const url = page > 1 ? `${base}?page=${page}` : base;
  const sectionTitle = sections[page - 1]?.title;
  const title = page > 1 && sectionTitle ? `${post.title} · ${sectionTitle}` : post.title;

  return {
    title,
    description: post.summary,
    alternates: { canonical: url },
    // 分页小节不单独进索引,避免与完整文章重复内容;第一页为规范入口
    robots: page > 1 ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description: post.summary,
      url,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: "summary",
      title,
      description: post.summary,
    },
  };
}

export default async function PostPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const sections = splitSections(post.content);
  const page = resolvePage(pageParam, sections.length);
  const current = sections[page - 1];
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
    url,
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

  // 正文首行若是与文章标题重复的 H1,去掉(header 已展示,避免三重标题)
  const contentLines = current.content.split("\n");
  if (contentLines[0]?.replace(/^#\s+/, "").trim() === post.title.trim()) {
    contentLines.shift();
  }
  const contentHtml = await markdownToHtml(contentLines.join("\n").replace(/^\s+/, ""));
  const sectionTitle = current.title;
  const multi = sections.length > 1;

  return (
    <article className="page-shell article-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Link className="back-link" href="/posts">← 返回文章列表</Link>
      <header className="article-header">
        <p className="date">{post.date} · {post.readingMinutes} min read{multi ? ` · 共 ${sections.length} 节` : ""}</p>
        <h1>{post.title}</h1>
        {sectionTitle && sectionTitle !== post.title && <p className="eyebrow" style={{ marginTop: 8 }}>§ {sectionTitle}</p>}
        <p>{post.summary}</p>
        <div className="tags">
          {post.tags.map((tag) => <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>)}
        </div>
      </header>

      {multi && (
        <nav className="section-toc" aria-label="小节目录">
          <p className="eyebrow">本文目录</p>
          <ol>
            {sections.map((s, i) => {
              const n = i + 1;
              const label = s.title || `第 ${n} 节`;
              return (
                <li key={n} className={n === page ? "current" : ""} aria-current={n === page ? "true" : undefined}>
                  {n === page ? <span>{label}</span> : <Link href={pageHref(slug, n)}>{label}</Link>}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="article-content" dangerouslySetInnerHTML={{ __html: contentHtml }} />

      {multi && (
        <nav className="pagination article-pagination" aria-label="小节翻页">
          {page > 1 ? (
            <Link className="pagination-prev" href={pageHref(slug, page - 1)} rel="prev">
              <span className="pg-dir">← 上一节</span>
              {sections[page - 2].title && <span className="pg-title">{sections[page - 2].title}</span>}
            </Link>
          ) : <span aria-hidden />}
          <span className="pagination-info">{page} / {sections.length}</span>
          {page < sections.length ? (
            <Link className="pagination-next" href={pageHref(slug, page + 1)} rel="next">
              <span className="pg-dir">下一节 →</span>
              {sections[page].title && <span className="pg-title">{sections[page].title}</span>}
            </Link>
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
