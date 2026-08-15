// API 路由的安全属性契约。这些防护此前只存在于实现里,没有测试兜底 ——
// 一次「顺手简化」就能静默摘掉同源校验或把原始密钥写进 cookie。
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { blogSessionToken } from "../lib/blog-auth-token.ts";
import { safeCompare } from "../lib/safe-compare.ts";

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
  const guarded = ["app/api/auth/route.ts", "app/api/java/run/route.ts", "app/api/monitor-auth/route.ts"];
  const missing: string[] = [];
  for (const file of guarded) {
    const source = await read(file);
    if (!source.includes("checkRateLimit")) missing.push(file);
  }
  assert.deepEqual(missing, [], `缺少限流:\n${missing.join("\n")}`);
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
  const session = blogSessionToken(secret);
  assert.ok(!session.includes(secret), "会话值不得包含原始密钥");
  assert.match(session, /^v2\./, "应带版本前缀，便于整体轮换");
  // 同一密钥稳定、不同密钥必变 —— 轮换密钥即失效全部旧会话。
  assert.equal(session, blogSessionToken(secret));
  assert.notEqual(session, blogSessionToken(`${secret}x`));
});

test("会话 cookie 带齐 HttpOnly / SameSite，且生产环境要求 Secure", async () => {
  const source = await read("app/api/auth/route.ts");
  assert.ok(source.includes("httpOnly: true"), "缺 httpOnly 会让 XSS 能读走会话");
  assert.ok(/sameSite:\s*"(lax|strict)"/.test(source), "缺 SameSite 会放大 CSRF 面");
  assert.ok(source.includes('process.env.NODE_ENV === "production"'), "生产环境必须要求 Secure");
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
