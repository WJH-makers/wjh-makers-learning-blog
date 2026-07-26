import type { Metadata } from "next";
import Link from "next/link";
import { getAllPublishedTags, getPublishedPostsByTag, siteUrl } from "@/lib/posts";
import { jsonLdSafe } from "@/lib/jsonld";
import { OG_BASE } from "@/lib/og-base";

type Props = {
  params: Promise<{ tag: string }>;
};

export async function generateStaticParams() {
  return (await getAllPublishedTags())
    .map(({ tag }) => ({ tag: encodeURIComponent(tag) }));
}

export const runtime = "nodejs";
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const posts = await getPublishedPostsByTag(decoded);
  return {
    title: `标签：${decoded}`,
    description: `${decoded} 主题，共 ${posts.length} 篇文章。`,
    robots: posts.length < 2 ? { index: false, follow: true } : undefined,
    // 与 sitemap 生成的 URL 严格一致,归一大小写/编码变体
    alternates: { canonical: `${siteUrl()}/tags/${encodeURIComponent(decoded)}` },
    openGraph: {
      ...OG_BASE,
      title: `标签：${decoded} | WJH-makers`,
      description: `${decoded} 主题下的学习记录集合`,
    },
  };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const posts = await getPublishedPostsByTag(decoded);
  const allTags = await getAllPublishedTags();
  const url = `${siteUrl()}/tags/${encodeURIComponent(decoded)}`;

  // 收集本标签下所有文章中出现频率最高的关联标签
  const relatedCounts = new Map<string, number>();
  for (const post of posts) {
    for (const t of post.tags) {
      if (t !== decoded) relatedCounts.set(t, (relatedCounts.get(t) ?? 0) + 1);
    }
  }
  const relatedTags = [...relatedCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `标签：${decoded}`,
    description: `${decoded} 相关学习记录`,
    url,
    inLanguage: "zh-CN",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl()}/posts/${post.slug}`,
        name: post.title,
        description: post.summary,
      })),
    },
  };

  return (
    <div className="page-shell narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(collectionJsonLd) }} />
      <Link className="back-link" href="/tags">← 返回标签</Link>
      <div className="page-title">
        <p className="eyebrow">Topic Desk · {posts.length} 篇</p>
        <h1>{decoded}</h1>
        <p>{posts.length} 篇相关学习记录。</p>
      </div>

      {relatedTags.length > 0 && (
        <aside className="related-tags">
          <span className="eyebrow">关联标签</span>
          <div className="tag-cloud">
            {relatedTags.map(([t, c]) => (
              <Link key={t} href={`/tags/${encodeURIComponent(t)}`}>
                {t}<span>{c}</span>
              </Link>
            ))}
          </div>
        </aside>
      )}

      <div className="post-list">
        {posts.length > 0 ? posts.map((post) => (
          <article className="list-item" key={post.slug}>
            <time>{post.date}</time>
            <div>
              <h2><Link href={`/posts/${post.slug}`}>{post.title}</Link></h2>
              <p>{post.summary}</p>
              <div className="tags">
                {post.tags.filter((t) => t !== decoded).slice(0, 5).map((t) => (
                  <Link key={t} href={`/tags/${encodeURIComponent(t)}`}>{t}</Link>
                ))}
              </div>
            </div>
          </article>
        )) : (
          <div className="empty-state">
            <p className="eyebrow">Empty Topic</p>
            <h3>这个主题暂时没有文章。</h3>
            <Link className="button primary" href="/posts">去看全部文章</Link>
            <Link className="button" href="/tags">换个主题</Link>
          </div>
        )}
      </div>
    </div>
  );
}
