import assert from "node:assert/strict";
import { test } from "node:test";
import { ADMIN_SESSION_MAX_AGE_SECONDS } from "../lib/cache-policy.ts";
import {
  BLOG_SESSION_VERSION,
  blogSessionToken,
  verifyBlogSessionToken,
} from "../lib/blog-auth-token.ts";
import {
  blogSessionTokenEdge,
  EDGE_ADMIN_SESSION_MAX_AGE_SECONDS,
  safeCompareEdge,
  verifyBlogSessionTokenEdge,
} from "../lib/blog-auth-token-edge.ts";

const SECRET = "a-long-admin-secret-that-is-not-a-cookie";

test("会话令牌形态：v3.<过期秒数>.<43 字节 base64url MAC>", () => {
  const token = blogSessionToken(SECRET);
  assert.match(token, /^v3\.\d{10}\.[A-Za-z0-9_-]{43}$/, token);
  assert.ok(!token.includes(SECRET), "令牌不得包含原始密钥");
});

test("令牌含签发时刻，因此同密钥每次签出的值不同", () => {
  // 这条钉住的是「不能拿重新签一个再比字符串」——v2 时代那种写法在 v3 下必然永假。
  const early = blogSessionToken(SECRET, 1_700_000_000_000);
  const later = blogSessionToken(SECRET, 1_700_000_060_000);
  assert.notEqual(early, later, "过期时间不同，令牌必须不同");
  // 但两者都应能被验证通过（各自在有效期内）。
  assert.equal(verifyBlogSessionToken(early, SECRET, 1_700_000_000_000), true);
  assert.equal(verifyBlogSessionToken(later, SECRET, 1_700_000_060_000), true);
});

test("过期即拒：这才是 v3 相对 v2 真正买到的东西", () => {
  const issuedAt = 1_700_000_000_000;
  const token = blogSessionToken(SECRET, issuedAt);
  const justBefore = issuedAt + (ADMIN_SESSION_MAX_AGE_SECONDS - 1) * 1000;
  const justAfter = issuedAt + (ADMIN_SESSION_MAX_AGE_SECONDS + 1) * 1000;

  assert.equal(verifyBlogSessionToken(token, SECRET, justBefore), true, "有效期内应放行");
  assert.equal(verifyBlogSessionToken(token, SECRET, justAfter), false, "过期后必须拒绝");
});

test("过期时间不可篡改：改了它 MAC 就不匹配", () => {
  const token = blogSessionToken(SECRET, 1_700_000_000_000);
  const [, expiresAt, macPart] = token.split(".");
  // 把过期时间往后推十年，MAC 原样保留。
  const forged = `${BLOG_SESSION_VERSION}.${Number(expiresAt) + 315_360_000}.${macPart}`;
  assert.equal(verifyBlogSessionToken(forged, SECRET, 1_700_000_000_000), false);
});

test("轮换密钥即失效全部旧会话", () => {
  const token = blogSessionToken(SECRET, 1_700_000_000_000);
  assert.equal(verifyBlogSessionToken(token, `${SECRET}-rotated`, 1_700_000_000_000), false);
});

test("畸形令牌一律拒绝，不抛异常", () => {
  const now = 1_700_000_000_000;
  const valid = blogSessionToken(SECRET, now);
  const mac = valid.split(".")[2];
  const cases = [
    "",
    "v3",
    "v3.",
    `v3.${mac}`, // 缺过期时间段
    `v2.${mac}`, // 旧版前缀必须被拒（v2 令牌无过期时间，认它等于没改）
    `v3.abc.${mac}`, // 过期时间非数字
    `v3. 1700000000.${mac}`, // 带空格：Number(" 1700..") 会宽松解析成功，必须挡住
    `v3.1700000000e9.${mac}`, // 科学计数法同理
    `v3.-1.${mac}`,
    `v3.99999999999999999999.${mac}`, // 超出安全整数
    valid.slice(0, -1), // MAC 被截断
    `${valid}.extra`, // 多一段
  ];
  for (const token of cases) {
    assert.equal(
      verifyBlogSessionToken(token, SECRET, now),
      false,
      `应拒绝畸形令牌：${JSON.stringify(token)}`,
    );
  }
});

test("密钥为空时恒假（fail-closed）", () => {
  const token = blogSessionToken(SECRET, 1_700_000_000_000);
  assert.equal(verifyBlogSessionToken(token, "", 1_700_000_000_000), false);
});

// ── Edge / Node 交叉等价 ────────────────────────────────────────────────────

/**
 * proxy.ts 跑在 Edge Runtime,只能用 Web Crypto 重算同一个派生值。两份实现一旦分叉,
 * 合法管理员的 POST /write 会被 proxy 静默拦成 404 而页面侧毫无报错 —— 线上真发生过。
 * 这两条断言就是为了让那种分叉在 CI 就红掉,而不是等到发不出文章才发现。
 */
test("edge 与 node 两份签发实现逐字节等价", async () => {
  const now = 1_700_000_000_000;
  const secrets = [SECRET, "x", "中文密钥-带符号!@#$%^&*()", "y".repeat(512)];

  for (const secret of secrets) {
    assert.equal(
      await blogSessionTokenEdge(secret, now),
      blogSessionToken(secret, now),
      `edge/node 派生结果不一致: secret 长度 ${secret.length}`,
    );
  }
});

test("edge 与 node 两份校验实现判定一致（含过期与篡改）", async () => {
  const issuedAt = 1_700_000_000_000;
  const token = blogSessionToken(SECRET, issuedAt);
  const cases: Array<[string, string, number]> = [
    [token, SECRET, issuedAt],
    [token, SECRET, issuedAt + (ADMIN_SESSION_MAX_AGE_SECONDS + 1) * 1000],
    [token, `${SECRET}-rotated`, issuedAt],
    ["v3.abc.zzz", SECRET, issuedAt],
    ["", SECRET, issuedAt],
  ];

  for (const [tok, secret, now] of cases) {
    assert.equal(
      await verifyBlogSessionTokenEdge(tok, secret, now),
      verifyBlogSessionToken(tok, secret, now),
      `edge/node 校验判定不一致: ${JSON.stringify(tok)}`,
    );
  }
});

test("Edge 侧的过期时长字面量必须等于 cache-policy 的值", () => {
  // Edge 侧刻意不 import cache-policy(只依赖 Web API),所以两处数值只能靠这条断言对齐。
  assert.equal(EDGE_ADMIN_SESSION_MAX_AGE_SECONDS, ADMIN_SESSION_MAX_AGE_SECONDS);
});

// ── 会话签名密钥与登录凭据解耦 ──────────────────────────────────────────────

test("SESSION_SIGNING_KEY 未配置时回落到登录凭据（行为与引入前一致）", async () => {
  const { sessionSigningKey } = await import("../lib/auth-secrets.ts");
  const original = process.env.SESSION_SIGNING_KEY;
  try {
    delete process.env.SESSION_SIGNING_KEY;
    assert.equal(sessionSigningKey(SECRET), SECRET, "回落必须等于传入的登录凭据");
    // 空串与纯空白都算未配置：`SESSION_SIGNING_KEY=` 是 .env.example 里的默认形态，
    // 若把空串当有效密钥，全站会用同一个空密钥签名。
    process.env.SESSION_SIGNING_KEY = "";
    assert.equal(sessionSigningKey(SECRET), SECRET, "空串应视为未配置");
    process.env.SESSION_SIGNING_KEY = "   ";
    assert.equal(sessionSigningKey(SECRET), SECRET, "纯空白应视为未配置");
  } finally {
    if (original === undefined) delete process.env.SESSION_SIGNING_KEY;
    else process.env.SESSION_SIGNING_KEY = original;
  }
});

test("配置后签名不再由登录凭据决定：换登录口令不影响已签发会话", async () => {
  const { sessionSigningKey } = await import("../lib/auth-secrets.ts");
  const original = process.env.SESSION_SIGNING_KEY;
  try {
    process.env.SESSION_SIGNING_KEY = "an-independent-32-byte-random-value";
    // 这正是解耦买到的东西：cookie 里的 MAC 与 BLOG_ADMIN_TOKEN 无关，
    // 于是 cookie 外泄不再是「已知明文 + 登录口令做密钥」的离线爆破入口。
    assert.notEqual(sessionSigningKey(SECRET), SECRET);
    assert.equal(
      sessionSigningKey(SECRET),
      sessionSigningKey("a-completely-different-login-secret"),
      "签名密钥应只由 SESSION_SIGNING_KEY 决定，与登录凭据无关",
    );
  } finally {
    if (original === undefined) delete process.env.SESSION_SIGNING_KEY;
    else process.env.SESSION_SIGNING_KEY = original;
  }
});

test("safeCompareEdge 长度不同直接 false，等长内容不同也 false", () => {
  assert.equal(safeCompareEdge("abc", "abcd"), false);
  assert.equal(safeCompareEdge("abcd", "abce"), false);
  assert.equal(safeCompareEdge("abcd", "abcd"), true);
});
