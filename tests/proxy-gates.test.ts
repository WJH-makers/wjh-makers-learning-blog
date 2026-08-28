/**
 * proxy.ts 两道闸的行为覆盖：Host 白名单 与 POST /write 会话校验。
 *
 * 此前这两道闸只有源码文本层面的间接断言（config-convergence 查「白名单不读 env」、
 * api-security-contract 查某些文件里出现过某个标识符）——没有任何测试真的调过
 * proxy()，因此「哪个 Host 放行、哪个请求被拦」全靠读代码确认。
 *
 * ## 为什么本文件要装 resolve hook
 *
 * node --test 不解析 tsconfig 的 paths：proxy.ts 里的 `@/lib/...` 直接
 * `Cannot find package '@/lib'`。另外 next/server 在 Node 里必须写成 next/server.js
 * （package exports 没有无扩展名的那个子路径）。两件事都在下面的 registerHooks 里补，
 * 于是被测的是**真正的 proxy.ts**，不是复制一份逻辑到测试里重写一遍 ——
 * 后者只能证明测试自己自洽。
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier.startsWith("@/")) {
      const base = path.join(ROOT, specifier.slice(2));
      for (const candidate of [`${base}.ts`, `${base}.tsx`]) {
        if (fs.existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});

const SECRET = "proxy-gate-test-secret-0824";
process.env.BLOG_ADMIN_TOKEN = SECRET;

const { proxy } = await import("../proxy.ts");
const { blogSessionTokenEdge } = await import("../lib/blog-auth-token-edge.ts");

/**
 * 最小 NextRequest 替身：只带 proxy() 真正读到的四样东西
 * （host 头、method、nextUrl.pathname、blog_admin_token cookie）。
 */
function request(options: { host?: string; method?: string; pathname?: string; cookie?: string }) {
  return {
    headers: new Headers(options.host === undefined ? {} : { host: options.host }),
    method: options.method ?? "GET",
    nextUrl: { pathname: options.pathname ?? "/" },
    cookies: {
      get: (name: string) =>
        options.cookie !== undefined && name === "blog_admin_token" ? { value: options.cookie } : undefined,
    },
  } as unknown as Parameters<typeof proxy>[0];
}

// ── Host 白名单 ────────────────────────────────────────────────────────────

test("Host 白名单：正式域名与本地/内网放行，其余一律 403", async () => {
  // 放行集合刻意逐个列出而不是从 ALLOWED_HOSTS 派生：从被测来源派生就成了自证，
  // 白名单被改宽时测试会跟着一起变宽。
  for (const host of ["wwjjhh.online", "www.wwjjhh.online", "WWJJHH.ONLINE", " wwjjhh.online ", "wwjjhh.online:3001"]) {
    const response = await proxy(request({ host }));
    assert.equal(response.status, 200, `正式域名应放行：${JSON.stringify(host)}`);
  }
  for (const host of ["localhost", "localhost:3000", "127.0.0.1", "127.0.0.1:3001", "app.internal", "foo.localhost"]) {
    const response = await proxy(request({ host }));
    assert.equal(response.status, 200, `本地/内网应放行：${host}`);
  }
});

test("Host 白名单：后缀匹配不被「域名里含白名单字样」骗过", async () => {
  // 这组是本闸的真正价值所在。endsWith 一旦被写成 includes，下面前两个立刻放行 ——
  // 而站点功能完全正常，没有任何迹象。
  const rejected = [
    "evil-internal.com",
    "x.internal.evil.com",
    "wwjjhh.online.evil.com",
    "notwwjjhh.online",
    "evil.com",
    "wjh-makers-learning-blog.vercel.app",
    "", // 缺 host 头：fail-closed，不能因为读不到就放行
  ];
  for (const host of rejected) {
    const response = await proxy(request({ host }));
    assert.equal(response.status, 403, `必须拒绝：${JSON.stringify(host)}`);
  }
  // 完全不带 host 头与空串同路。
  assert.equal((await proxy(request({}))).status, 403);
});

// 注：`::1` 走不到 isLocalHost 里那条 `host === "::1"`。proxy.ts 先做
// `.replace(/:\d+$/, "")` 剥端口，裸 IPv6 字面量会被剥成 `::`，于是那条分支恒不命中
// （结果是 403 —— fail-closed，不是安全问题）。真实 Host 头里 IPv6 本来也写作 `[::1]`。
// 这里刻意不写断言：断言 403 等于把这处失效钉成「预期行为」，断言 200 又与现状不符。
// 该分支要么改成剥 `[]` 后再比，要么删掉；见返回给主循环的说明。

// ── POST /write 会话校验 ───────────────────────────────────────────────────

test("POST /write：合法会话 cookie 放行，伪造或过期的一律 404", async () => {
  const valid = await blogSessionTokenEdge(SECRET);
  const passed = await proxy(request({ host: "wwjjhh.online", method: "POST", pathname: "/write", cookie: valid }));
  assert.equal(passed.status, 200, "合法会话必须放行");

  for (const cookie of ["v2.garbage", `${valid}x`, valid.slice(0, -1), await blogSessionTokenEdge(`${SECRET}-rotated`)]) {
    const response = await proxy(
      request({ host: "wwjjhh.online", method: "POST", pathname: "/write", cookie }),
    );
    // 404 而非 401：写作台整体对外不存在，不泄露「这里有个后台」。
    assert.equal(response.status, 404, `非法会话必须 404：${JSON.stringify(cookie)}`);
  }
});

test("POST /write：空白 cookie 等同于无 cookie，走首次登录那条路", async () => {
  // `.trim()` 后为空串即落回下面那条「无 cookie 放行」的语义。这是对的：
  // 浏览器发来 `blog_admin_token=`（清 cookie 的常见残留形态）不该被当成攻击，
  // 它只是「未登录」，凭据校验交给 app/write/page.tsx。
  // 单独列一条是因为它容易被误当成上一条的漏网：空串既不是合法会话也不该 404。
  for (const cookie of ["", " ", "\t"]) {
    const response = await proxy(
      request({ host: "wwjjhh.online", method: "POST", pathname: "/write", cookie }),
    );
    assert.equal(response.status, 200, `空白 cookie 应视为未登录而放行：${JSON.stringify(cookie)}`);
  }
});

test("POST /write：拿 BLOG_ADMIN_TOKEN 原文当 cookie 必须被拒", async () => {
  // 线上真出过的形态是反向的（用原文当预期值去比 cookie，见 tests/blog-auth.test.ts）。
  // 这条守另一半：cookie 必须是 HMAC 派生值，原文不构成有效会话。
  const response = await proxy(
    request({ host: "wwjjhh.online", method: "POST", pathname: "/write", cookie: SECRET }),
  );
  assert.equal(response.status, 404);
});

test("POST /write：无 cookie 必须放行 —— 首次登录走表单 token，这是刻意留的缺口", async () => {
  // proxy.ts:56 是 `if (cookieToken && !safeCompareEdge(...))`：cookie 缺失时整个条件
  // 短路为 false，请求放行。它读起来像「忘了判空」，但改成
  // `if (!cookieToken || !safeCompareEdge(...)) return 404` 会把合法管理员的**首次登录**
  // 静默拦成 404 —— 首次登录本来就不带 cookie，是 app/write/page.tsx 的 formAuthed 分支
  // 用表单 token 提交、验证通过后才补种 cookie。
  //
  // 页面侧对这种 404 没有任何提示，症状与 tests/blog-auth.test.ts 记录的那次线上故障同款。
  // 所以这条用例的作用是把**意图**写进测试名：它红了不代表 proxy 漏了判空，
  // 代表有人正在把首次登录堵死。真正的凭据校验在 app/write/page.tsx 里做。
  const response = await proxy(request({ host: "wwjjhh.online", method: "POST", pathname: "/write" }));
  assert.equal(response.status, 200, "无 cookie 的 POST /write 必须放行，否则首次登录被堵死");
});

test("POST /write：未配置 BLOG_ADMIN_TOKEN 时整个写作台 404", async () => {
  // fail-closed：缺配置不是「谁都能发文」，而是「这个功能不存在」。
  delete process.env.BLOG_ADMIN_TOKEN;
  try {
    const response = await proxy(request({ host: "wwjjhh.online", method: "POST", pathname: "/write" }));
    assert.equal(response.status, 404);
  } finally {
    process.env.BLOG_ADMIN_TOKEN = SECRET;
  }
});

test("会话闸只管 POST /write：GET /write 与其它路径的 POST 不受影响", async () => {
  // 闸装错范围的两种表现都不会报错：范围太宽会把评论提交等 POST 一起拦掉，
  // 范围太窄则等于没装。
  const getWrite = await proxy(request({ host: "wwjjhh.online", pathname: "/write", cookie: "v2.garbage" }));
  assert.equal(getWrite.status, 200, "GET /write 由页面自己鉴权，proxy 不拦");
  const otherPost = await proxy(
    request({ host: "wwjjhh.online", method: "POST", pathname: "/posts/some-slug", cookie: "v2.garbage" }),
  );
  assert.equal(otherPost.status, 200, "其它路径的 POST 不走这道闸");
});

// ── 内容页 Link 头 ─────────────────────────────────────────────────────────

test("只有内容页带 sitemap/RSS 的 Link 头", async () => {
  for (const pathname of ["/", "/posts", "/posts/2026-05-03-java-s01e01-hello"]) {
    const link = (await proxy(request({ host: "wwjjhh.online", pathname }))).headers.get("link") ?? "";
    assert.match(link, /rel="sitemap"/, `${pathname} 应带 sitemap Link`);
    assert.match(link, /rel="alternate"/, `${pathname} 应带 RSS Link`);
    // 必须是正式域名的绝对地址：相对地址在 RSS 阅读器里解析不到。
    assert.match(link, /https:\/\/wwjjhh\.online\/sitemap\.xml/);
  }
  for (const pathname of ["/java", "/tags/java", "/posts/a/b", "/write"]) {
    const link = (await proxy(request({ host: "wwjjhh.online", pathname }))).headers.get("link");
    assert.equal(link, null, `${pathname} 不应带 Link 头`);
  }
});

// ── Vercel 环境封杀 ────────────────────────────────────────────────────────

test("VERCEL=1 时一切请求 403：副站域名绕过 CF WAF，从环境层封死", async () => {
  // ON_VERCEL 在模块顶层求值，所以要用带 query 的 specifier 绕过模块缓存拿一份新实例。
  // 这条测试必须排在最后：它改的是 env，而上面的用例依赖 VERCEL 未设置。
  process.env.VERCEL = "1";
  try {
    // specifier 走变量而不是字面量:tsc 解析不了 `?instance=` 这种 query
    // (报 TS2307),而运行时需要它来绕开模块缓存。非字面量 specifier 下
    // tsc 不做静态解析,类型退化成 any,运行时行为一字不变。
    const freshSpecifier = "../proxy.ts?instance=vercel";
    const fresh = await import(freshSpecifier);
    const response = await fresh.proxy(request({ host: "wwjjhh.online" }));
    assert.equal(response.status, 403);
    assert.match(await response.text(), /vercel runtime disabled/);
  } finally {
    delete process.env.VERCEL;
  }
});
