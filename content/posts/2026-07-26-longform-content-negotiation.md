---
title: "同一个 URL,给人返回网页,给 AI 返回 Markdown"
date: 2026-07-26
summary: "用 Next.js middleware 做内容协商:按 Accept 头把公开内容页 rewrite 到 Markdown 变体,给 agent 省 token、给人留完整体验。实录 Edge Runtime 不能用 node:crypto 的约束、safeCompare 内联的原因,以及一个真实缓存投毒坑——不声明 Vary: Accept,共享缓存会让浏览器读者拿到裸 Markdown。"
tags: [工程实录, Next.js, AI]
---

# 同一个 URL,给人返回网页,给 AI 返回 Markdown

> 2026 年,抓我博客的一半流量已经不是人,是 agent。它们要的不是我精心排版的页面,是干净的正文。于是我让同一个 URL 学会看客下菜:`Accept: text/markdown` 给 Markdown,普通浏览器给 HTML。听起来一行 rewrite 的事,真正踩的坑全在缓存和 Runtime 上。

## 1、问题:agent 时代,HTML 是给人看的负担

一篇文章页 gzip 后大几十 KB,里面绝大部分是导航、主题切换脚本、Tailwind 生成的类名、React 注水的数据。人需要这些。但当一个 LLM agent 来抓这篇文章当上下文,它要为这堆噪声付 token,还得自己从 DOM 里刨正文——刨得对不对全看它造化。

我不想为 agent 单独维护一套 URL(`/posts/xxx.md` 之类),那会分裂链接、分散权重、让分享出去的地址变得难看。我想要的是:**URL 不变,表示(representation)随客户端而变**。这正是 HTTP 内容协商(content negotiation)的本职——`Accept` 请求头声明"我能接受什么",服务端按能力挑一种表示返回。只是过去二十年我们几乎只用它协商压缩和语言,没人拿它区分"人还是机器"。

## 2、方案:middleware 在边缘按 Accept 头 rewrite

Next.js 的 middleware 跑在每个请求最前面,是做这件事的天然位置——它能在路由匹配前改写请求,且部署在 Edge Runtime、贴近用户。核心逻辑就一段:

```ts
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const accept = request.headers.get("accept")?.toLowerCase() ?? "";
  const acceptsMarkdown = accept.split(",").some((item) => {
    const mediaType = item.trim();
    return mediaType.startsWith("text/markdown") && !/;\s*q=0(?:\.0+)?(?:;|$)/.test(mediaType);
  });

  const isContentPage = pathname === "/" || pathname === "/posts" || /^\/posts\/[^/]+$/.test(pathname);
  if (request.method === "GET" && acceptsMarkdown && isContentPage) {
    const target = pathname === "/" || pathname === "/posts"
      ? new URL("/agent/markdown", request.url)
      : new URL(`${pathname}/markdown`, request.url);
    const rewritten = NextResponse.rewrite(target);
    rewritten.headers.append("Vary", "Accept");
    rewritten.headers.set("Cache-Control", "private, no-store");
    return rewritten;
  }
  // ...
}
```

几个刻意的决定:

**只解析 `text/markdown`,还要排除 `q=0`。** 浏览器发的 `Accept` 是一长串带权重的媒体类型,`text/markdown;q=0` 语义上是"明确不要 Markdown"。所以我不能只 `includes("text/markdown")`,得逐段 trim 再判权重。这个正则 `/;\s*q=0(?:\.0+)?(?:;|$)/` 就是把 `q=0` 和 `q=0.0` 这种拒绝语义摘出来。

**只给公开内容页做协商。** `isContentPage` 白名单死死圈住首页、列表页、`/posts/单段 slug`。写作台 `/write`、任何接口、任何未公开路由一律保持原行为——内容协商是给"可公开正文"用的,不能顺手把后台也 Markdown 化了。

**rewrite 目标分两类。** 首页和列表 rewrite 到 `/agent/markdown`(它内部默认按 `/` 生成目录);单篇文章直接 rewrite 到它自己那条固定的 `${pathname}/markdown` 路由。源码里那句注释是血泪:"不要依赖内部 rewrite 的查询参数传递"——早期我想靠 query 把 slug 塞给一个通用 handler,结果 rewrite 的 query 传递行为在不同部署环境下并不稳,最后老老实实让每篇文章走自己的确定路由。

## 3、Markdown 变体长什么样:干净、自带 canonical

被 rewrite 到的 Markdown 路由跑在 Node runtime,复用 `lib/agent-markdown.ts` 把 `Post` 渲染成一份稳定的 Markdown。关键在 `articleMarkdown`:

```ts
export function articleMarkdown(post: Post, baseUrl: string): string {
  const canonicalUrl = `${baseUrl}/posts/${post.slug}`;
  const body = withoutRepeatedTitle(post);
  const tags = post.tags.map((tag) => `  - ${yamlValue(tag)}`).join("\n");

  return `---
title: ${yamlValue(post.title)}
description: ${yamlValue(post.summary)}
date: ${post.date}
canonical: ${canonicalUrl}
tags:
${tags || "  - 未分类"}
---

# ${post.title}

> ${post.summary}
...`;
}
```

两个细节值得说。一是 `yamlValue` 直接用 `JSON.stringify`——JSON 字符串本身就是 YAML 合法的双引号标量,标题里的冒号、引号全能被可靠转义,不必自己写 YAML escaper。二是 `withoutRepeatedTitle`:正文首行如果就是 `# 标题` 且与 `post.title` 相同,就 shift 掉,避免 frontmatter 的 `title` 和正文 H1 重复。给机器的 frontmatter 里我塞了 `canonical`——哪怕 agent 只拿到 Markdown,它也知道这份内容的规范地址是哪个 HTML URL,引用/回链不会指错。

## 4、Edge Runtime 的硬约束:safeCompare 必须内联

middleware 里还有一段和内容协商无关、但被同一个 Runtime 约束绑死的逻辑——`/write` 的 POST 要校验管理员 token:

```ts
function safeCompare(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ua = enc.encode(a);
  const ub = enc.encode(b);
  if (ua.length !== ub.length) return false;
  let r = 0;
  for (let i = 0; i < ua.length; i++) r |= ua[i] ^ ub[i];
  return r === 0;
}
```

项目里本来有 `@/lib/safe-compare`,但那份依赖 `node:crypto` 的 `timingSafeEqual` 和 `Buffer`。**middleware 跑在 Edge Runtime,只有 Web 标准 API,没有 `node:crypto`、没有 `Buffer`。** 直接 import 那份会在构建期就炸。所以这里必须内联一版纯 Web API 的常量时间比较:`TextEncoder` 编码成字节,先比长度、再逐字节异或累积,全程不因某位不同而提前 return。安全性上它守住了 timing-safe 的底线,代价是重复了一小段逻辑——这是 Edge Runtime 逼出来的取舍,不是疏忽。源码顶部那条注释就是留给未来"手贱想 DRY 掉它"的自己看的。

## 5、真正的坑:不声明 Vary: Accept,共享缓存会投毒

这是整件事最危险、也最反直觉的地方,值得单开一节。

同一个 URL,现在会因为 `Accept` 头不同而返回 HTML 或 Markdown 两种完全不同的字节。但 CDN(我用 Cloudflare)和 nginx 的默认缓存键**只有 URL**——它们不看 `Accept`。想象这个时序:

1. 一个 agent 带 `Accept: text/markdown` 抓 `/posts/foo`,拿到裸 Markdown;
2. CDN 把这份 Markdown 以 `/posts/foo` 为键缓存下来;
3. 一个真人用浏览器打开 `/posts/foo`,CDN 命中缓存,把**裸 Markdown 当页面**吐给他。

这就是经典的缓存投毒(cache poisoning),只不过投毒源不是攻击者,是一个正常抓取的 agent。修复是 HTTP 早就给好的 `Vary` 头——它告诉所有共享缓存:"这个 URL 的表示取决于 `Accept`,请把 `Accept` 也纳入缓存键。"

所以在 middleware 里,**协商命中和没命中的两条路径都要声明 `Vary: Accept`**。没命中(返回 HTML)那条也不能漏:

```ts
const response = NextResponse.next();
if (isContentPage) {
  response.headers.append("Vary", "Accept");
  // ... 还顺手打了 Link 头,声明 llms.txt / sitemap / rss / markdown 等 alternate
  response.headers.set("Link", links.join(", "));
}
```

光靠 `Vary` 我还不放心,于是给 Markdown 变体加了第二道锁:`Cache-Control: private, no-store`。`private` 让共享代理根本不缓存它,`no-store` 让浏览器也不存。理由写在注释里——**这份变体只服务内容协商,不该进任何共享缓存,免得上游把它误当成这个 URL 的规范表示**。而那条固定的文章 Markdown 路由本身也返回了一致的头:

```ts
"Cache-Control": "no-store",
Vary: "Accept",
"X-Robots-Tag": "noindex",
```

`X-Robots-Tag: noindex` 是配套的:我不想让搜索引擎把 Markdown 变体当独立页面索引,和 HTML 正文抢排名、造成重复内容。canonical 归 HTML,Markdown 只是同一内容的机读表示。

## 6、llms.txt 与 Content-Signal:让 agent 知道有这条路

最后一块拼图是"发现性"。agent 怎么知道该发 `Accept: text/markdown`?我在两个层面广播。

其一,`/llms.txt` 给出全站机读目录,每条文章直接链到它的 `/markdown` 地址,并明确写了协商方式:

```
- 文章提供 Markdown 版本:在文章 URL 后加 /markdown,或向公开页面发送 Accept: text/markdown。
```

其二,所有机读响应都带 `Content-Signal` 头,值来自 `lib/agent-markdown.ts` 的常量:

```ts
const CONTENT_SIGNAL = "search=yes, ai-train=no, use=reference";
```

这是我对 agent 的边界声明:可以检索、可以当参考引用,但不许拿去训模型。它不是强制协议,更像 robots.txt 的精神后裔——一个愿意合作的信号。加上 HTML 响应里那组 `Link: rel="alternate"` 头(指向 `llms.txt`、`sitemap.xml`、`rss.xml`、以及文章的 `text/markdown` 变体),我把"这里有机读版"这件事在能声明的每个地方都声明了一遍。

## 7、如果重来

- **内容协商的成本从来不在协商本身,而在缓存。** 决定让一个 URL 有多种表示的那一刻,就欠下了 `Vary` 的债;共享缓存默认只认 URL,你不还,它就替你还成一次投毒事故。这条我会第一天就写进 checklist。
- **Runtime 边界要当成类型边界看待。** middleware 在 Edge,能用什么 API 是硬约束。`node:crypto` 不可用不是"以后优化",是"现在就构建失败"。内联一段 timing-safe 比较不丢人,盲目复用 Node 依赖才会炸。
- **给机器的表示要自带回家的路。** Markdown 变体里的 `canonical` 和 `X-Robots-Tag: noindex` 一进一退,共同保证:agent 用得上,SEO 不打架,人始终落在那个漂亮的 HTML 上。
- 一句话:让同一个 URL 对人和 AI 各自友好,靠的不是两套页面,是一层想清楚了缓存语义的内容协商。
