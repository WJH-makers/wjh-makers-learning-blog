/**
 * 限流分桶语义。
 *
 * 2026-08-29 补：`/write` 的 Server Action 原先没有任何限流，而它校验的是与
 * `/api/auth` **同一个** BLOG_ADMIN_TOKEN —— 等于一条平行的无限速爆破入口。
 * 修复的做法是让它共用 "login" 桶，所以「同 scope 同 IP 必须共享配额」这条性质
 * 就是那个修复的正确性前提，必须有测试钉住。
 *
 * 端到端验证（真的用 HTTP 打 Server Action）需要构建期生成的 Next-Action ID，
 * 拿不到；所以这里在单元层验证桶语义，契约测试那侧验证调用点存在。
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkRateLimit } from "../lib/rate-limit.ts";

/** 每个用例用独立 IP，避免相互污染（模块内是进程级共享的 Map）。 */
let seq = 0;
const freshIp = () => `198.51.100.${(seq += 1)}`;

test("同 scope 同 IP 共享配额：两条入口合计受同一上限约束", () => {
  const ip = freshIp();
  // login 档上限 10。前 10 次放行，第 11 次起拒绝 —— 无论调用方是哪条入口。
  const verdicts = Array.from({ length: 12 }, () => checkRateLimit(ip, "login").allowed);
  assert.deepEqual(
    verdicts,
    [...Array(10).fill(true), false, false],
    `login 档应在第 11 次开始拒绝，实际：${verdicts.join(",")}`,
  );
});

test("不同 scope 互不影响：登录用尽不该锁掉 Java 沙箱", () => {
  const ip = freshIp();
  for (let i = 0; i < 12; i += 1) checkRateLimit(ip, "login");
  assert.equal(checkRateLimit(ip, "login").allowed, false, "login 桶应已耗尽");
  assert.equal(checkRateLimit(ip, "java-run").allowed, true, "java-run 是独立桶");
});

test("不同 IP 各自独立计数", () => {
  const a = freshIp();
  const b = freshIp();
  for (let i = 0; i < 12; i += 1) checkRateLimit(a, "login");
  assert.equal(checkRateLimit(a, "login").allowed, false);
  assert.equal(checkRateLimit(b, "login").allowed, true);
});

test("各档上限：login 10、java-run 12、默认 5", () => {
  for (const [scope, limit] of [["login", 10], ["java-run", 12], [undefined, 5]] as const) {
    const ip = freshIp();
    let allowed = 0;
    // 多打两次确认确实卡在上限而不是还能继续。
    for (let i = 0; i < limit + 2; i += 1) {
      if (checkRateLimit(ip, scope).allowed) allowed += 1;
    }
    assert.equal(allowed, limit, `scope=${scope ?? "(默认)"} 应恰好放行 ${limit} 次，实际 ${allowed}`);
  }
});
