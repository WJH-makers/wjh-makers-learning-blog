---
title: "没有后端的博客：用 Server Action 直连 Mongo，本地 md 与 DB 按 slug 合并"
date: 2026-07-26
summary: "这个博客没有独立后端、没有 REST 层：文章按 slug 双源合并（DB 覆盖 md、DB 挂了退回 md），写入靠 Server Action 直调 MongoDB driver。复盘四个真实坑——本地 build 的 ECONNREFUSED 是正常降级、首连失败的 promise 缓存会让写作台永久静默、uniqueSlug 不能用 count、以及写作台的 token 鉴权。"
tags: [工程实录, Next.js, 架构]
---

# 没有后端的博客：用 Server Action 直连 Mongo，本地 md 与 DB 按 slug 合并

> 一个 Next.js 单体博客既要能纯 md 静态跑，又要能在网页上写文章存进 Atlas。我的答案是：不引入独立后端、不铺 REST 层，用 Server Action 直调 MongoDB driver，内容按 slug 双源合并——DB 覆盖 md、DB 挂了 fallback 到 md。听起来简单，真正踩到血的是连接缓存、slug 去重和降级边界。

## 1、问题：一个博客到底需不需要"后端"

最初这个博客就是一堆 `content/posts/*.md`,`getAllPosts()` 读目录、解析 frontmatter、按日期排序,静态渲染,零依赖。够用,但有个痒点:我想在没带电脑时直接从网页写一篇当天的心得并发布。

传统做法是加后端:起个 Express/Nest,画几条 REST(`POST /api/posts`),前端 fetch,后端连库。但对单人博客,这套的边际成本高得离谱——多一个进程、多一份鉴权、多一层 DTO、多一处 CORS,而承载的真实流量是"我偶尔写一篇"。

Next.js 16 的 App Router + `output: "standalone"` 给了另一条路:**Server Action 本身就是后端**。它是编译期绑定到本部署的 RPC 端点,函数体在 Node runtime 执行,可以直接 `import` MongoDB driver 写库。没有 REST、没有 controller、没有手写路由。整个"后端"就是 `lib/db.ts` 里几个 async 函数,加 `app/write/page.tsx` 里两个 `"use server"` 闭包。所以本文主张:**对这个规模,独立后端是纯负债。**

## 2、架构:内容双源,DB 覆盖 md、DB 挂了退回 md

核心设计只有一句话:**一篇文章的 slug 是它的主键,md 和 DB 都可能提供同一个 slug,DB 赢。**

合并逻辑在 `lib/posts.ts` 里,干净得几乎不需要解释:

```ts
export const getAllPublishedPosts = cache(async (): Promise<Post[]> => {
  const markdownPosts = getAllPosts();
  let databasePosts: Post[] = [];

  try {
    databasePosts = await getDatabasePosts();
  } catch (error) {
    console.warn("[learning-blog] database read failed, falling back to Markdown only:", error);
  }

  const merged = new Map<string, Post>();
  for (const post of markdownPosts) merged.set(post.slug, post);
  for (const post of databasePosts) merged.set(post.slug, post);

  return [...merged.values()].sort((a, b) => b.date.localeCompare(a.date));
});
```

三个决策藏在这十几行里:

**其一,顺序即优先级。** 先把 md 灌进 `Map`,再灌 DB。同 slug 时后写覆盖前写,于是"DB 覆盖 md"是 `Map` 语义的自然结果,不需要任何 if。这意味着我可以把一篇本地 md 文章"接管"进数据库:只要在写作台发布一个同 slug 的版本,线上就换成可编辑的 DB 版,而仓库里的 md 原文一字不动地留作底稿。

**其二,DB 读失败不是异常,是降级。** `try/catch` 把 `getDatabasePosts()` 的失败吞成一条 `console.warn`,`databasePosts` 保持空数组,结果就退化成纯 md 博客。首页照常渲染,只是看不到 DB 里的新文章。单文章页 `getPublishedPost` 是对称的——先查 DB,查不到或抛错就 `return getPost(slug)` 落回 md。

**其三,`cache()` 去重。** 用的是 React 的 `cache()` 而不是模块级变量。因为一次文章页渲染里,`generateMetadata` 和页面组件会各查一次同样的数据,`cache()` 保证同一次请求/再生周期内只真正打一次 DB。这跟纯 md 那侧的 `mdPostsCache`(进程级缓存,生产环境只读一次目录)是两套不同生命周期的缓存,别混。

### 为什么本地 build 报 querySrv ECONNREFUSED 是正常的

这是第一个会吓到人的点。本地 `next build` 做静态生成时会调 `getAllPublishedPosts()`,进而尝试连 Atlas。如果本机没配 `MONGODB_URI`,或者网络到 Atlas 的 SRV 解析不通,日志里会刷:

```text
[learning-blog] database read failed, falling back to Markdown only: MongoServerSelectionError: querySrv ECONNREFUSED ...
```

第一次看到我也去查了半天。但按上面的设计,**这就是降级路径在正确工作**:DB 读失败 → warn → 用纯 md 继续 build。build 成功、页面齐全,只是不含 DB 文章。真正的故障是 build 直接 fail,而不是这条 warn。所以我没有去"修"它,而是在 `lib/db.ts` 顶部就让整条链路对"没有数据库"这件事免疫——`hasDatabaseConfig()` 为假时,`getDatabasePosts` 直接 `return []`,连 client 都不建:

```ts
export async function getDatabasePosts(limit?: number): Promise<Post[]> {
  if (!hasDatabaseConfig()) return [];
  // ...
}
```

## 3、写入路径:Server Action 直调 driver,没有 REST

发布文章的整条链路,是 `app/write/page.tsx` 里一个 `"use server"` 闭包:

```ts
async function publishPost(formData: FormData) {
  "use server";

  await requireAdminOrRedirect(formData);

  const editingSlug = String(formData.get("slug") ?? "").trim();
  let slug: string;
  try {
    const fields = {
      title: String(formData.get("title") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      tags: parseTags(formData.get("tags")),
      content: String(formData.get("content") ?? ""),
    };
    if (editingSlug) {
      slug = (await updateDatabasePost(editingSlug, fields)).slug;
    } else {
      slug = (await createDatabasePost({ ...fields, date: String(formData.get("date") ?? "") })).slug;
    }
  } catch (error) {
    const message = encodeURIComponent(safeErrorForUrl(error));
    redirect((editingSlug
      ? `/write?slug=${encodeURIComponent(editingSlug)}&error=${message}`
      : `/write?error=${message}`) as Route);
  }

  revalidateBlog(slug);
  redirect(`/posts/${slug}` as Route);
}
```

注意这里没有 `fetch`、没有 API route、没有 JSON 序列化边界。表单 `action={publishAction}` 直接绑这个函数,浏览器提交后,Next 在服务端把 `FormData` 喂进来,函数直接调 `createDatabasePost`——它就在 `lib/db.ts`,直接跑 `collection.insertOne`。写完 `revalidatePath` 一串出口(首页、`/posts`、`/tags`、RSS、sitemap、以及这篇文章页),然后 `redirect` 到文章。ISR 缓存精准失效,新文章即时可见。

前端那侧(`WriteEditorClientImpl.tsx`)用 BlockNote 做块编辑,提交前把块转成 Markdown 塞进一个 hidden input:

```tsx
<input ref={contentInputRef} type="hidden" name="content" defaultValue={markdown} />
```

草稿只落 `localStorage`(`wjh-learning-blog:write-draft:v1`),700ms 防抖自动存,跟发布链路完全解耦。编辑器整个是 `dynamic(..., { ssr: false })` 懒加载的——BlockNote 依赖 `window`,不能进 SSR,而且它体积不小,没必要拖累每个访客。写作台是 `robots: { index: false }` 的私有页,只有我用。

## 4、可靠性坑之一:首连失败的 promise 被缓存到进程死

这是整套架构里我栽得最狠的一个。连接管理最初是最教科书的单例:

```ts
let clientPromise: Promise<MongoClient> | undefined;

function getClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const client = new MongoClient(uri, options);
    clientPromise = client.connect();   // ← 当时是这样
  }
  return clientPromise;
}
```

在自有长驻服务器上跑(不是 serverless),这么写九成时间没问题:第一次 `connect()` 成功,promise 缓存下来,后续所有查询复用同一个连接池。问题出在第一次**失败**:如果进程刚起、Atlas 恰好抖了一下,`client.connect()` 返回的是一个 **rejected promise**,而它被赋给了 `clientPromise` 并缓存下来。

之后 `getClient()` 看到 `clientPromise` 非空,直接把这个**已经 reject 的 promise** 返回。于是每一次评论、每一次写作台提交、每一次 DB 文章读取,`await` 到的都是同一个陈旧的失败——**在这个容器的整个生命周期里永久静默失效**,哪怕 Atlas 一秒后就恢复了。表现是最恶心的那种:没有崩溃、没有报错风暴,就是写什么都不生效,重启才好。

修法是让失败的 promise 别赖在缓存里:

```ts
// 首连失败必须把 promise 丢掉:否则这个 rejected promise 会被缓存到容器生命周期结束,
// Atlas 一次抖动 = 评论/写作台/DB 文章在本次进程里永久静默失效。
clientPromise = client.connect().catch((error) => {
  clientPromise = undefined;
  throw error;
});
```

`.catch` 里把 `clientPromise` 置回 `undefined` 再 `throw`。这样:失败仍然向上抛(调用方能进降级路径),但缓存被清空,**下一次** `getClient()` 会重新 `new MongoClient` 再连一次。一次抖动的代价从"这个进程废了"降到"这一次请求失败,下次自愈"。

顺带一提,连接选项是按"自有长驻服务器"调的,不是 serverless 那套:

```ts
const options: MongoClientOptions = {
  appName: "coffee-station-blog",
  maxPoolSize: 10,
  minPoolSize: 1,        // 留 1 条热连接,免得稀疏查询每次重做 Atlas TLS 握手
  maxIdleTimeMS: 60000,
  serverSelectionTimeoutMS: 5000,
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
};
```

`minPoolSize: 1` 是关键——博客查询很稀疏,如果连接全被回收,下一次读又要重做一整套 Atlas TLS 握手,首字节延迟肉眼可见。留一条热的省掉这份反复握手。

## 5、可靠性坑之二:uniqueSlug 不能用 countDocuments 推后缀

新文章的 slug 是 `${date}-${slugify(title)}`,比如 `2026-07-26-my-note`。同一天同标题会撞,得加后缀 `-2`、`-3`。最直觉的实现是数一下有几个然后 `+1`:

```ts
// 反面教材:别这么写
const n = await collection.countDocuments({ slug: { $regex: `^${base}` } });
const slug = n === 0 ? base : `${base}-${n + 1}`;
```

这个 bug 很阴。假设库里现在有 `base` 和 `base-3`(中间的 `base-2` 被我删过),`count` = 2,于是它推出 `base-3`——**而 `base-3` 已经存在**,`insertOne` 撞唯一索引 `uq_learning_posts_slug` 直接 11000 报错。count 反映的是"有几个",根本不等于"下一个空位在哪"。

正确做法是把同族已占用的 slug 全读回来,在内存里找第一个空位:

```ts
async function uniqueSlug(base: string): Promise<string> {
  const safeBase = base || "daily-note";
  const collection = await postsCollection();
  const escaped = safeBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const docs = await collection
    .find({ slug: { $regex: `^${escaped}(-\\d+)?$` } }, { projection: { slug: 1 } })
    .toArray();
  const taken = new Set(docs.map((doc) => doc.slug));
  if (!taken.has(safeBase)) return safeBase;
  for (let i = 2; i <= taken.size + 2; i += 1) {
    const candidate = `${safeBase}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${safeBase}-${taken.size + 3}`;
}
```

两个细节:`base` 里的正则元字符要 `escape`,否则用户标题里一个 `.` 就能让 `$regex` 匹配到不该匹配的东西;`projection: { slug: 1 }` 只拉 slug 字段,别把整篇正文捞回来找个空位。

但读-改-写之间有个窗口:两个并发提交可能都读到同一批 `taken`、都算出同一个候选、都去 insert,其中一个必然撞唯一索引。所以 slug 去重**不能只靠应用层**——真正的正确性由数据库的唯一索引保证,应用层的循环只负责在撞车时重试:

```ts
let slug = "";
for (let attempt = 0; ; attempt += 1) {
  slug = await uniqueSlug(base);
  try {
    await collection.insertOne({ slug, title, summary, tags, content, publishedAt: date, createdAt: now, updatedAt: now });
    break;
  } catch (error) {
    if (!isDuplicateKeyError(error) || attempt >= 4) throw error;
  }
}
```

`isDuplicateKeyError` 就是判 `error.code === 11000`。撞了就重算一次 slug 再插,最多 5 次。这是"应用层尽量算对、数据库兜底正确、冲突时重试"的标准三段式——**唯一索引是防线,不是装饰**。对一个单人博客,并发撞车概率近乎为零,但这几行的成本也近乎为零,而没有它就是一个隐藏的数据完整性洞。

## 6、鉴权:私有写作台的 token,常数时间比较

写作台是公网可达的,必须挡住陌生人。这里没有引入 session 框架、没有 OAuth,就一个共享密钥 `BLOG_ADMIN_TOKEN`。门卫函数:

```ts
async function requireAdminOrRedirect(formData: FormData): Promise<void> {
  const expectedToken = process.env.BLOG_ADMIN_TOKEN?.trim();
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("blog_admin_token")?.value?.trim();
  const formToken = String(formData.get("token") ?? "").trim();
  const token = formToken || cookieToken || "";

  if (!expectedToken) redirect("/write?error=missing-token-env" as Route);
  if (!safeCompare(token, expectedToken)) redirect("/write?error=bad-token" as Route);

  if (!cookieToken) {
    cookieStore.set("blog_admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
}
```

几个刻意的选择:

- **token 来源是 `formToken || cookieToken`**。第一次提交带表单里的密钥;验过之后种一个 `httpOnly` cookie,之后就免输。cookie 是 `httpOnly`——JS 读不到,防 XSS 顺手偷 token。
- **比较用 `safeCompare` 而不是 `===`**。它内部走 `crypto.timingSafeEqual`,常数时间比对,堵住计时侧信道。虽然对一个博客这近乎偏执,但鉴权代码统一走这一份的成本极低,没理由留一个 `===` 的坏样板。
- **缺环境变量时是拒绝,不是放行**。`expectedToken` 为空直接 redirect 到 `missing-token-env`——绝不能出现"没配密钥于是谁都能写"的 fail-open。
- **编辑态的加载也要过鉴权**。`page.tsx` 里 `const editingPost = slug && isAuthenticated ? await getPublishedPost(slug) : undefined`——没登录连"把已发布文章读进编辑器"这一步都不做,不给未授权者预填任何东西。

错误处理还有个细节:抛给用户的错误信息都过一遍 `safeErrorForUrl`,用正则把 `mongodb+srv://user:pass@` 里的凭证和 `password=` 抹成 `<redacted>`。因为 driver 的连接错误经常把整条 URI 带在 message 里,直接塞进 URL 参数回显给前端就等于泄库口令。

## 7、取舍与边界

诚实说清这套架构的适用边界,免得有人照搬踩坑:

- **它是单体,不是无状态函数。** 连接池单例、`minPoolSize: 1`、`clientPromise` 缓存,全建立在"长驻进程"的假设上。搬到 serverless(每次冷启新容器)这套热连接的收益就没了,反而 `minPoolSize` 可能拖慢冷启。这是给自有服务器写的。
- **没有 REST = 没有公开 API。** 别人拿不到 JSON 接口。对个人博客这是特性(攻击面小),但如果哪天要做移动端原生 App 或第三方集成,Server Action 绑死在这个部署上,那时才该考虑抽 API。**在没有第二个消费者之前,抽 API 就是过度设计。**
- **双源合并是有认知成本的。** "这篇到底是 md 还是 DB 的?"偶尔要想一下。规则简单(DB 覆盖 md),但调试时得记住线上看到的可能不是仓库里的 md。收益是我保留了 Git 里的 md 底稿,又拿到了网页可编辑——值。
- **共享密钥不是多用户方案。** 一个 `BLOG_ADMIN_TOKEN` 只够单人。要多作者、要审计谁改了什么,就得上真正的账号体系。我不需要,所以不上。

## 8、如果重来

一句话:**先问"这个能力有几个消费者",再决定要不要一层抽象。** 我这个博客,写入的消费者只有我自己一个网页表单,读的消费者只有 Next 的渲染管线——两个都在同一个部署里。在这种情况下,REST 层、独立后端、API DTO 全是没有第二方在用的抽象,是纯负债。Server Action 直调 driver 把"后端"压缩成了 `lib/db.ts` 里几个函数,少了一整个进程要维护。

真正花掉我时间的、也真正值得写下来的,不是"没有后端"这个架构决策——那是显然的——而是三个魔鬼细节:**rejected promise 会缓存到进程死、count 不等于下一个空位、唯一索引才是并发正确性的最终防线。** 架构可以很简单,但简单架构下每一个有状态的角落(连接缓存、主键分配)都得亲手把边界情况焊死。可迁移的经验就这一条:**降级要设计成正常路径(本地 build 的 ECONNREFUSED 是 feature 不是 bug),而失败状态绝不能被缓存成永久事实。**
