import { getAllPublishedPosts, markdownToHtml, outboundDate, siteUrl } from "@/lib/posts";

// RSS 变化频率低(仅发文时),用 ISR 缓存;write 发布会 revalidatePath('/rss.xml') 主动刷新。
export const revalidate = 3600;
export const runtime = "nodejs";

// title/summary 是未经渲染器的原始字段;含 ]]> 会提前闭合 CDATA,把其后内容注入成 feed 裸标记。
// 标准中和写法:]]> → ]]]]><![CDATA[>(markdownToHtml 的输出每个 > 均已转义,无需处理)。
const cdata = (value: string) => `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;

export async function GET() {
  const base = siteUrl();
  // 最近 30 篇进 feed;全文(content:encoded)只给最近 FULL_COUNT 篇,其余仅摘要。
  // rss.xml 是站内最大单一响应(30 篇全文未压缩 ~860KB),阅读器/爬虫高频拉取时
  // 是纯带宽支出,而轻量服务器出口带宽是全站并发的硬瓶颈。
  const FULL_COUNT = 12;
  const posts = (await getAllPublishedPosts()).slice(0, 30);
  const items = (await Promise.all(
    posts.map(async (post, i) => `
      <item>
        <title>${cdata(post.title)}</title>
        <link>${base}/posts/${post.slug}</link>
        <guid>${base}/posts/${post.slug}</guid>
        <pubDate>${outboundDate(post.date).toUTCString()}</pubDate>
        <description>${cdata(post.summary)}</description>
        ${i < FULL_COUNT ? `<content:encoded><![CDATA[${await markdownToHtml(post.content)}]]></content:encoded>` : ""}
      </item>`)
  )).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"
         xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>豆豆课程组 的技术学习与工程实践</title>
        <link>${base}</link>
        <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml"/>
        <description>Java 全栈、系统实践、遥感 VQA 与 MoE 研究记录</description>
        <language>zh-CN</language>
        <lastBuildDate>${(posts.length > 0 ? outboundDate(posts[0].date) : new Date()).toUTCString()}</lastBuildDate>
        ${items}
      </channel>
    </rss>`;

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
