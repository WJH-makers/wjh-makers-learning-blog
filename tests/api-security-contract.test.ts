// API 路由的安全属性契约。这些防护此前只存在于实现里,没有测试兜底 ——
// 一次「顺手简化」就能静默摘掉同源校验或把原始密钥写进 cookie。
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { blogSessionToken, verifyBlogSessionToken } from "../lib/blog-auth-token.ts";
import { ADMIN_SESSION_MAX_AGE_SECONDS } from "../lib/cache-policy.ts";
import { safeCompare } from "../lib/safe-compare.ts";
import { adminSessionCookieOptions, monitorSessionCookieOptions } from "../lib/session-cookie.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

const read = (relative: string) => fs.readFile(path.join(ROOT, relative), "utf8");

test("写入型与高成本端点都做同源校验", async () => {
  // 缺同源校验 = 任何站点都能用访客 cookie 触发发布或代码执行。
  const guarded = [
    "app/api/auth/route.ts",
    "app/api/java/run/route.ts",
    "app/api/monitor-auth/route.ts",
    "app/posts/[slug]/comment-actions.ts",
  ];
  const missing: string[] = [];
  for (const file of guarded) {
    const source = await read(file);
    if (!source.includes("isSameOriginRequest")) missing.push(file);
  }
  assert.deepEqual(missing, [], `缺少同源校验:\n${missing.join("\n")}`);
});

test("认证与高成本端点都接了限流", async () => {
  // app/write/page.tsx 必须在列:它的 Server Action 校验的是**同一个** BLOG_ADMIN_TOKEN,
  // 少了限流就是一条与 /api/auth 平行的无限速爆破入口。2026-08-29 之前它确实缺,
  // 而本清单当时只列 app/api/* 三个文件,所以 CI 照绿 —— 那正是这条测试要防的失效模式。
  // nginx 也兜不住:/write 落在 location / 且无 limit_req,CF 隧道打到的 80 server 块
  // 连 server 级限流都没有(443 块才有 general 30r/s)。
  const guarded = [
    "app/api/auth/route.ts",
    "app/api/java/run/route.ts",
    "app/api/monitor-auth/route.ts",
    "app/write/page.tsx",
  ];
  const missing: string[] = [];
  for (const file of guarded) {
    const source = await read(file);
    if (!source.includes("checkRateLimit")) missing.push(file);
  }
  assert.deepEqual(missing, [], `缺少限流:\n${missing.join("\n")}`);
});

test("限流分桶只用 nginx 覆写过的头，不用客户端可伪造的头", async () => {
  const source = await read("lib/client-ip.ts");
  // 顺序即安全属性:x-real-ip 由 nginx 的 proxy_set_header 覆写(客户端自带值被丢弃),
  // 而 cf-connecting-ip 在本站配置里**没有** proxy_set_header,带正确 Host 直连源站
  // 即可伪造,每换一个值就是一份新配额。x-forwarded-for 的首跳同样由客户端提供。
  // 2026-08-29 实测确证了 cf-connecting-ip 可伪造,故必须让可信头排在最前。
  const order = ["x-real-ip", "cf-connecting-ip", "x-forwarded-for"].map((h) => ({
    header: h,
    at: source.indexOf(`"${h}"`),
  }));
  for (const { header, at } of order) {
    assert.ok(at >= 0, `lib/client-ip.ts 应显式处理 ${header}`);
  }
  assert.ok(
    order[0].at < order[1].at && order[0].at < order[2].at,
    "x-real-ip 必须最先取:它是唯一被 nginx 覆写、客户端伪造不了的那个",
  );
});

test("凭据比较一律走恒时比较，不用 === 或 ==", async () => {
  const source = await read("app/api/auth/route.ts");
  assert.ok(source.includes("safeCompare"), "必须使用 safeCompare");
  // 直接把提交值与环境变量对比会引入计时侧信道。
  assert.ok(
    !/token\s*===?\s*expected|expected\s*===?\s*token/.test(source),
    "不得用 ==/=== 直接比较凭据",
  );
});

test("会话 cookie 是 HMAC 派生值，不是原始密钥", () => {
  const secret = "test-admin-secret-value";
  const now = 1_700_000_000_000;
  const session = blogSessionToken(secret, now);
  assert.ok(!session.includes(secret), "会话值不得包含原始密钥");
  assert.match(session, /^v3\./, "应带版本前缀，便于整体轮换");
  // v3 起令牌含过期时刻，所以「同密钥稳定」这条不再成立（那正是 v2 无法吊销的根因）。
  // 稳定性改由「同一时刻签出同一值」表达；跨密钥必变仍然要钉。
  assert.equal(session, blogSessionToken(secret, now));
  assert.notEqual(session, blogSessionToken(`${secret}x`, now));
  // 有效期必须真的被服务端校验 —— 详细的过期/篡改用例在 tests/blog-auth.test.ts。
  assert.equal(verifyBlogSessionToken(session, secret, now), true);
  assert.equal(
    verifyBlogSessionToken(session, secret, now + (ADMIN_SESSION_MAX_AGE_SECONDS + 1) * 1000),
    false,
    "过期令牌必须被拒 —— 这是 v2 缺失的能力",
  );
});

test("注销入口存在：会话必须可被主动吊销", async () => {
  // v3 之前没有任何注销路径，唯一吊销手段是轮换 BLOG_ADMIN_TOKEN（会把管理员自己踢下线）。
  const source = await read("app/api/auth/route.ts");
  assert.match(source, /export async function DELETE/, "缺注销入口");
  assert.match(source, /maxAge:\s*0/, "注销必须把 cookie 的 maxAge 置 0");
  // 删除时必须复用同一份 cookie 属性：path 不一致时浏览器会保留原 cookie，注销静默失效。
  assert.match(source, /\.\.\.adminSessionCookieOptions\(\)/, "删除应复用同一份 cookie 属性");
});

test("会话 cookie 带齐 HttpOnly / SameSite，且生产环境要求 Secure", () => {
  // 断言共享模块的返回值本身，而不是扒某个路由文件的源码文本 ——
  // 后者只能证明「那一处写了」，证明不了另外两处也写了。
  for (const [label, options] of [
    ["admin", adminSessionCookieOptions()],
    ["monitor", monitorSessionCookieOptions()],
  ] as const) {
    assert.equal(options.httpOnly, true, `${label}: 缺 httpOnly 会让 XSS 能读走会话`);
    assert.equal(options.sameSite, "lax", `${label}: 缺 SameSite 会放大 CSRF 面`);
    assert.equal(options.path, "/", `${label}: path 必须覆盖全站，否则跳转后会话丢失`);
    assert.ok(options.maxAge > 0, `${label}: maxAge 必须为正`);
  }
});

test("secure 属性由 NODE_ENV 决定：生产必开，本地 http 必关", () => {
  const original = process.env.NODE_ENV;
  try {
    // @ts-expect-error NODE_ENV 在类型上是只读联合，测试里需要临时改写。
    process.env.NODE_ENV = "production";
    assert.equal(adminSessionCookieOptions().secure, true, "生产环境必须要求 Secure");
    assert.equal(monitorSessionCookieOptions().secure, true, "生产环境必须要求 Secure");
    // @ts-expect-error 同上。
    process.env.NODE_ENV = "development";
    // 本地 http://localhost 若强制 secure，浏览器直接不存 cookie => 登不上。
    assert.equal(adminSessionCookieOptions().secure, false);
  } finally {
    // @ts-expect-error 同上。
    process.env.NODE_ENV = original;
  }
});

test("三处设置会话 cookie 的地方都走共享模块，不再各写一份属性", async () => {
  // 任一处漏掉 httpOnly 都是可利用的 XSS 会话窃取，而其余两处仍正确 —— 评审极难发现。
  for (const file of ["app/api/auth/route.ts", "app/write/page.tsx", "app/api/monitor-auth/route.ts"]) {
    const source = await read(file);
    assert.match(source, /SessionCookieOptions\(\)/, `${file} 必须调用共享的 cookie 选项工厂`);
    assert.doesNotMatch(source, /httpOnly:\s*true/, `${file} 不应再内联 cookie 安全属性`);
  }
});

test("safeCompare 长度不同直接 false，等长内容不同也 false", () => {
  assert.equal(safeCompare("abc", "abcd"), false);
  assert.equal(safeCompare("abcd", "abce"), false);
  assert.equal(safeCompare("abcd", "abcd"), true);
  assert.equal(safeCompare("", ""), true);
});

test("Java 沙箱提交禁网并带齐资源上限", async () => {
  const source = await read("app/api/java/run/route.ts");
  assert.ok(source.includes("enable_network: false"), "沙箱必须禁网");
  for (const key of ["cpu_time_limit", "wall_time_limit", "memory_limit", "max_processes_and_or_threads"]) {
    assert.ok(source.includes(key), `缺少资源上限 ${key}`);
  }
  // 上游异常不能把内部细节透给浏览器。
  assert.ok(!/error:\s*(?:String\(error\)|error\.message)/.test(source), "不得回显上游错误原文");
});

test("未配置沙箱时诚实返回不可用，而不是假装可运行", async () => {
  const source = await read("app/api/java/run/route.ts");
  assert.ok(source.includes("runner_unavailable"), "缺 runner_unavailable 分支");
  assert.ok(source.includes("503"), "未配置应答 503");
});
