---
title: "把一台轻量云服务器的出口带宽榨干:三级缓存与 500 并发的真相"
date: 2026-07-26
summary: "这个博客的瓶颈从来不是 CPU 或内存,而是轻量云服务器那点可怜的出口带宽。本文拆解 Cloudflare → nginx → Node 的三级缓存链路,算清一笔带宽账:实测出口约 3.7Mbps,同时在线上限就在 500 人量级,而唯一的大杠杆是让 CF 缓存 HTML。附几处真实节流的源码取舍。"
tags: [工程实录, 性能, 缓存]
---

# 把一台轻量云服务器的出口带宽榨干:三级缓存与 500 并发的真相

> 背景:博客跑在一台几十块钱一月的轻量云服务器上,QPS 不高但偶尔被 RSS 阅读器和爬虫集中拉全文。核心结论:瓶颈不在算力而在**出口带宽**,把 HTML 交给 Cloudflare 缓存是唯一数量级级别的杠杆,其余都是围绕带宽做的分级节流。

## 1、先把瓶颈找对:不是 CPU,是那根出口水管

很多人给个人博客做性能优化,第一反应是压 CPU、加内存、上 Redis。但我这台机器长期看下来,`load` 常年趴在 0.1 以下,内存也剩一大半。真正会让访客"打开慢"的,是**出口带宽被打满**——轻量服务器的带宽是硬上限,超了就排队,排队就是所有人一起卡。

算一笔账。假设峰值可用出口约 3.7Mbps ≈ 462 KB/s。一个文章页首屏,HTML + 关键 CSS/JS,即便走了 gzip,一次完整冷加载也要百来 KB 级别。如果**每个请求都回源到 Node**,462 KB/s 除下去,能同时喂饱的并发连接就是**几百个的量级**——所谓"500 人同时在线",不是 Node 撑不住,是水管只有这么粗。

结论很硬:任何优化,只要不能减少"从我这台机器出去的字节数",对这个瓶颈就是零收益。于是整条链路的设计目标只有一个——**让尽可能多的字节根本不从源站出去**。

## 2、三级缓存链路:谁扛住哪一段

链路是这样分层的:

```text
访客 ─► Cloudflare(边缘)
          ├─ /_next/static/*  长期 HIT,永不回源
          └─ HTML             命中 Cache Rule 则 HIT,否则回源
             │
             ▼
        nginx(源站前台)
          ├─ HTML 短缓存 + stale-while-revalidate
          └─ 按真实 IP 限流(X-Cache-Status 可观测)
             │
             ▼
          Node(standalone)
```

- **Cloudflare** 扛住绝大多数流量。静态资源(`_next/static`)靠 `immutable` 头一次缓存永久复用;真正的战场是 HTML。
- **nginx** 是源站前台。它做两件事:HTML 短 TTL 缓存 + SWR(旧内容先发、后台再更新),以及按**真实客户端 IP** 限流——注意反向代理后面拿到的是 CF 的 IP,必须还原真实 IP 才能限对人。
- **Node** 只在缓存全落空时才被叫醒,`output: "standalone"` 让它自身足够轻。

`next.config.ts` 里静态资源的长缓存是这么钉死的:

```ts
{
  source: "/_next/static/:path*",
  headers: [
    { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
  ],
},
{
  // 漫画文件名为稳定版本名,正文引用变更时才会换 URL;允许 CDN 与浏览器长期复用。
  source: "/api/:path*",
  headers: [
    { key: "Cache-Control", value: "no-store" },
    { key: "X-Content-Type-Options", value: "nosniff" },
  ],
},
```

`_next/static` 用带 hash 的文件名,内容一变 URL 就变,所以 `immutable` 是安全的——这一层几乎零回源。而 `/api/*` 显式 `no-store`:接口数据不能进任何共享缓存,这也为下一节的"HTML 可缓存"划出了安全边界。

## 3、最大杠杆:让 Cloudflare 缓存 HTML(但尊重源站头)

默认情况下 CDN 只缓存静态资源,HTML 每次都回源——这正是带宽被吃掉的地方。**最大的杠杆是加一条 CF Cache Rule,让 HTML 也进边缘缓存**。

但 HTML 缓存是有毒的:一旦把带鉴权状态的页面缓存了,所有访客会共享同一个人的页面。这个坑我在连载里专门写过一次真实事故——某人给页面开了 `proxy_cache`,把登录后的鉴权页也缓存了,reload 多少遍都没用,因为供货的是缓存不是后厨。

我的做法是让 **CF Cache Rule 尊重源站的 `Cache-Control`**,而不是无脑缓存。这样一来,凡是不该缓存的路径,源站自己会喊 `no-store`,CF 自动跳过:

- `/monitor`、`/write`(写作台,POST 还要过 token 校验)、`/api/*` —— 天然 `no-store`,排除在缓存之外;
- 公开内容页 —— 走 ISR,带上可缓存的头,CF 命中即 HIT。

`/write` 的排除不只是靠头,middleware 里还有一道真实的鉴权闸,跑在 Edge Runtime 上:

```ts
if (request.nextUrl.pathname === "/write" && request.method === "POST") {
  const expected = process.env.BLOG_ADMIN_TOKEN?.trim();
  if (!expected) return new NextResponse("Not Found", { status: 404 });
  const cookieToken = request.cookies.get("blog_admin_token")?.value?.trim();
  if (!cookieToken || !safeCompare(cookieToken, expected)) {
    return new NextResponse("Not Found", { status: 404 });
  }
}
```

注意这里的 `safeCompare` 是**内联手写**的常量时间比较,不能复用 `@/lib/safe-compare`——那份依赖 `node:crypto`/`Buffer`,而 middleware 跑在 Edge Runtime,只有 Web API 可用。这类"环境决定实现"的取舍,是缓存边界之外另一层真实约束。

内容页的 ISR 周期开得很长,文章页 7 天,`app/posts/[slug]/page.tsx`:

```ts
export const revalidate = 604800; // 7 天
```

发文时用 `revalidatePath` 主动刷新,所以长 TTL 不会导致内容陈旧。CF 命中一次 HTML,后面成千次访问都不碰源站——这是把带宽账从"每请求几百 KB"压到"每 7 天一次"的关键。

## 4、内容协商的暗坑:同一 URL 两种表示

我给内容页做了 Markdown 内容协商:agent 带 `Accept: text/markdown` 抓同一个 URL,拿到的是裸 Markdown;浏览器拿 HTML。这个特性和缓存直接打架——**同一 URL 两种响应,共享缓存会串味**。

middleware 里的处理是两道保险:

```ts
const rewritten = NextResponse.rewrite(target);
// 同一 URL 会按 Accept 返回 HTML 或 Markdown 两种内容:不声明 Vary,
// CF/nginx 只按 URL 缓存 —— agent 抓一次就可能让后续浏览器读者拿到裸 Markdown。
rewritten.headers.append("Vary", "Accept");
// 这份变体只服务内容协商,不进共享缓存。
rewritten.headers.set("Cache-Control", "private, no-store");
```

`Vary: Accept` 告诉缓存"按 Accept 分表示",`private, no-store` 则干脆让 Markdown 变体不进共享缓存。两者叠加,才保证 CF 缓存的永远是浏览器该看的 HTML,而不会被某个爬虫的一次抓取污染成 Markdown。

## 5、几处真实节流:每一 KB 都是带宽

大杠杆是 CF 缓存 HTML,但边缘之外还有一堆"直接从源站漏出去的字节",逐个堵。

**RSS 全文只给最近 12 篇。** `rss.xml` 是全站最大的单一响应。阅读器和爬虫会高频拉它,而每次都是**未压缩全文**的纯带宽支出。30 篇全文塞进 feed 大约 860KB,把 `content:encoded` 收窄到最近 12 篇后,体积从 ~843KB 降到 ~329KB——一多半带宽凭空省下:

```ts
const FULL_COUNT = 12;
const posts = (await getAllPublishedPosts()).slice(0, 30);
// ...
${i < FULL_COUNT ? `<content:encoded><![CDATA[${await markdownToHtml(post.content)}]]></content:encoded>` : ""}
```

30 篇仍进 feed(标题+摘要保证订阅完整),但只有前 12 篇带全文正文。

**`lastBuildDate` 用最新文章日期,而不是 `now()`。** 这是个反直觉但关键的细节:

```ts
<lastBuildDate>${(posts.length > 0 ? outboundDate(posts[0].date) : new Date()).toUTCString()}</lastBuildDate>
```

如果这里写 `new Date()`,那么每次 `revalidate` 重新生成 feed,`lastBuildDate` 都在变——阅读器据此判定"内容更新了",**304 条件请求全部失效**,又要拉一次全文。用最新文章日期,没发新文时这个值恒定,阅读器的 `If-Modified-Since` 能稳稳命中 304,回一个空响应。这一改直接决定了 RSS 那 300 多 KB 是"每次都发"还是"发一次"。

**React `cache()` 请求内去重。** 一个文章页渲染要查好几次数据:`generateMetadata`、页面正文、相关阅读各要一份文章列表。不去重就是同一份数据打好几次 DB:

```ts
export const getAllPublishedPosts = cache(async (): Promise<Post[]> => {
  const markdownPosts = getAllPosts();
  let databasePosts: Post[] = [];
  try {
    databasePosts = await getDatabasePosts();
  } catch (error) {
    console.warn("[learning-blog] database read failed, falling back to Markdown only:", error);
  }
  // ...merge & sort
});
```

`cache()` 保证同一次请求/再生内只真正执行一次。它不省带宽,但省源站 CPU 与 DB 往返,让"缓存落空回源"这条最贵的路尽可能快地跑完。

**生产环境 Markdown 进程级缓存。** 站里 75+ 篇 md 文件,如果每次 `getAllPosts` 都全量重读磁盘再解析 frontmatter,文章页一次渲染就要跑好几遍:

```ts
let mdPostsCache: Post[] | undefined;

export function getAllPosts(): Post[] {
  if (process.env.NODE_ENV === "production" && mdPostsCache) return mdPostsCache;
  // ...readdir + parse + sort
  if (process.env.NODE_ENV === "production") mdPostsCache = posts;
  return posts;
}
```

生产环境 md 随镜像不可变,读一次缓存进程;dev 下每次重读以便热更。

## 6、取舍与边界:这套设计什么时候会崩

这套链路建立在几个前提上,越界就失效:

- **HTML 可缓存的前提是页面无个性化。** 一旦要做"登录后显示用户名"这类逐人内容,HTML 就不能进共享缓存,带宽杠杆立刻塌一半——那时得改用 CF 边缘计算或客户端注水,而不是缓存整页。
- **`immutable` 只对内容寻址的 URL 安全。** `_next/static` 和文件名稳定的漫画资源可以钉一年;任何 URL 不变而内容会变的东西,`immutable` 就是灾难。
- **限流必须按真实 IP。** 反向代理后面直接限 `remote_addr` 会把整个 CF 边缘节点当成一个人,一限就误伤一片。
- **RSS 的 12 篇是拍脑袋的平衡点。** 给多了带宽疼,给少了新订阅者读不到历史全文。选 12 是因为它把最大响应压回了 CDN 友好的量级,同时覆盖近期主要内容。

## 7、一句话总结

个人博客的性能优化,第一性原理是**先量出真正的瓶颈资源**——对轻量服务器,那几乎总是出口带宽而非算力。找对之后,所有动作只有一个判据:**这一步能不能减少从源站出去的字节?** 能,就做(CF 缓存 HTML、RSS 收窄、304 复用);不能,再漂亮也是自我感动。把 HTML 交给边缘,把源站的头设成可信的缓存指令,剩下的就是逐个 KB 地抠——直到 500 人同时在线,那根 3.7Mbps 的水管还没被打满。
