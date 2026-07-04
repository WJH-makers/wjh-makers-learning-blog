import { getAllPublishedPosts, markdownToHtml, siteUrl } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const base = siteUrl();
  const items = (await getAllPublishedPosts())
    .map((post) => `
      <item>
        <title><![CDATA[${post.title}]]></title>
        <link>${base}/posts/${post.slug}</link>
        <guid>${base}/posts/${post.slug}</guid>
        <pubDate>${new Date(post.date).toUTCString()}</pubDate>
        <description><![CDATA[${post.summary}]]></description>
        <content:encoded><![CDATA[${markdownToHtml(post.content)}]]></content:encoded>
      </item>`)
    .join("");

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
