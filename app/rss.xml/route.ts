import { getAllPublishedPosts, markdownToHtml, siteUrl } from "@/lib/posts";

// RSS 变化频率低(仅发文时),用 ISR 缓存;write 发布会 revalidatePath('/rss.xml') 主动刷新。
export const revalidate = 3600;
export const runtime = "nodejs";

export async function GET() {
  const base = siteUrl();
  // 最近 30 篇全文(content:encoded 保留全文阅读体验),防文章增多后 RSS 无限膨胀。
  const posts = (await getAllPublishedPosts()).slice(0, 30);
  const items = (await Promise.all(
    posts.map(async (post) => `
      <item>
        <title><![CDATA[${post.title}]]></title>
        <link>${base}/posts/${post.slug}</link>
        <guid>${base}/posts/${post.slug}</guid>
        <pubDate>${new Date(post.date).toUTCString()}</pubDate>
        <description><![CDATA[${post.summary}]]></description>
        <content:encoded><![CDATA[${await markdownToHtml(post.content)}]]></content:encoded>
      </item>`)
  )).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
      <channel>
        <title>万佳泓的学习日志</title>
        <link>${base}</link>
        <description>记录每天学习成果的个人博客</description>
        ${items}
      </channel>
    </rss>`;

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
