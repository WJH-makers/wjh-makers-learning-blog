import assert from "node:assert/strict";
import { test } from "node:test";
import { blogSessionToken } from "../lib/blog-auth-token.ts";
import { blogSessionTokenEdge, safeCompareEdge } from "../lib/blog-auth-token-edge.ts";

test("blog session is deterministic but does not contain the raw secret", () => {
  const secret = "a-long-admin-secret-that-is-not-a-cookie";
  const token = blogSessionToken(secret);

  assert.match(token, /^v2\.[A-Za-z0-9_-]{43}$/);
  assert.equal(token, blogSessionToken(secret));
  assert.ok(!token.includes(secret));
  assert.notEqual(token, blogSessionToken(`${secret}-rotated`));
});

// proxy.ts 跑在 Edge Runtime,只能用 Web Crypto 重算同一个派生值。两份实现一旦分叉,
// 合法管理员的 POST /write 会被 proxy 静默拦成 404 而页面侧毫无报错 —— 线上真发生过。
// 这条断言就是为了让那种分叉在 CI 就红掉,而不是等到发不出文章才发现。
test("edge 与 node 两份会话派生实现逐字节等价", async () => {
  const secrets = [
    "a-long-admin-secret-that-is-not-a-cookie",
    "x",
    "中文密钥-带符号!@#$%^&*()",
    "y".repeat(512),
  ];

  for (const secret of secrets) {
    assert.equal(
      await blogSessionTokenEdge(secret),
      blogSessionToken(secret),
      `edge/node 派生结果不一致: secret 长度 ${secret.length}`,
    );
  }
});

test("会话 Cookie 永远不等于 BLOG_ADMIN_TOKEN 原文", async () => {
  const secret = "publish-secret-0814";
  const cookie = await blogSessionTokenEdge(secret);

  // 这正是修复前的写法:拿原文当预期值去比 Cookie。它必然为 false,
  // 所以任何依赖它放行的分支都会把合法请求判成非法。
  assert.equal(safeCompareEdge(cookie, secret), false);
  assert.equal(safeCompareEdge(cookie, await blogSessionTokenEdge(secret)), true);
  assert.equal(safeCompareEdge(cookie, await blogSessionTokenEdge(`${secret}-rotated`)), false);
});
