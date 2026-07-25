import type { Metadata } from "next";
import Link from "next/link";
import { getAllPublishedTags, getPublishedPostsByTag, siteUrl } from "@/lib/posts";

type Props = {
  params: Promise<{ tag: string }>;
};

export async function generateStaticParams() {
  // 只生成有 ≥2 篇文章的标签页，避免薄内容进入索引
  return (await getAllPublishedTags())
    .filter(({ count }) => count >= 2)
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
    openGraph: {
      title: `标签：${decoded} | WJH-makers`,
      description: `${decoded} 主题下的学习记录集合`,
    },
  };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const posts = await getPublishedPostsByTag(decoded);
  const url = `${siteUrl()}/tags/${encodeURIComponent(decoded)}`;

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
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
