import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp } from "../lib/client-ip.ts";
import { checkRateLimit } from "../lib/rate-limit.ts";

// 这两个模块合起来是登录爆破与 Java 沙箱滥用的唯一应用层刹车,原先零行为测试:
// 把 client-ip.ts 的头部优先级调换、或把 rate-limit.ts 的某档上限调大,
// 169 个测试仍会全绿。下面的断言就是为了让那两种改动必须先弄坏一条测试。

test("限流 key 优先取 CF 头，客户端伪造的 x-forwarded-for 不能顶掉它", () => {
  // 生产拓扑是「公网只能经 Cloudflare 进来」,cf-connecting-ip 由 CF 回源时写入、
  // 客户端同名头会被覆盖,所以它是唯一不可伪造的来源。这条顺序一旦调换,
  // 攻击者每请求换一个 x-forwarded-for 就能领到全新配额,限流等于不存在。
  const forged = new Headers({
    "cf-connecting-ip": "203.0.113.7",
    "x-forwarded-for": "198.51.100.9",
    "x-real-ip": "198.51.100.10",
  });
  assert.equal(clientIp(forged), "203.0.113.7");
});

test("没有 CF 头时才兜底到 x-forwarded-for，且只取第一跳", () => {
  const chained = new Headers({ "x-forwarded-for": "198.51.100.9, 10.0.0.1, 172.16.0.1" });
  assert.equal(clientIp(chained), "198.51.100.9");

  // 前后空白必须剥掉,否则 " 198.51.100.9" 与 "198.51.100.9" 会被算成两个桶。
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "  198.51.100.9  , 10.0.0.1" })), "198.51.100.9");
});

test("三个头都缺时归到同一个 unknown 桶，而不是给每个匿名请求发新配额", () => {
  assert.equal(clientIp(new Headers()), "unknown");
  // 空值与纯空白不能被当成有效 IP 用作 key。
  assert.equal(clientIp(new Headers({ "cf-connecting-ip": "   ", "x-forwarded-for": "" })), "unknown");
  assert.equal(clientIp(new Headers({ "x-real-ip": "198.51.100.20" })), "198.51.100.20");
});

test("各 scope 的配额上限与代码声明一致，用尽后拒绝", () => {
  // 每个断言用独立 IP:hits 是模块级 Map,共用 IP 会让测试互相污染。
  const cases: Array<{ ip: string; scope: string | undefined; limit: number }> = [
    { ip: "203.0.113.11", scope: "login", limit: 10 },
    { ip: "203.0.113.12", scope: "java-run", limit: 12 },
    { ip: "203.0.113.13", scope: undefined, limit: 5 },
    { ip: "203.0.113.14", scope: "comment", limit: 5 },
  ];

  for (const { ip, scope, limit } of cases) {
    for (let i = 1; i <= limit; i += 1) {
      assert.equal(
        checkRateLimit(ip, scope).allowed,
        true,
        `scope=${scope ?? "(默认)"} 的第 ${i} 次(上限 ${limit})应放行`,
      );
    }
    assert.equal(
      checkRateLimit(ip, scope).allowed,
      false,
      `scope=${scope ?? "(默认)"} 超过 ${limit} 次后必须拒绝`,
    );
  }
});

test("同一 IP 的不同 scope 互不影响，登录用尽不该锁掉沙箱", () => {
  const ip = "203.0.113.21";
  for (let i = 0; i < 10; i += 1) assert.equal(checkRateLimit(ip, "login").allowed, true);
  assert.equal(checkRateLimit(ip, "login").allowed, false);

  // 同一个 IP 在别的 scope 下必须仍有完整配额 —— key 是 `${scope}:${ip}`。
  assert.equal(checkRateLimit(ip, "java-run").allowed, true);
  assert.equal(checkRateLimit(ip).allowed, true);
});

test("不同 IP 各自独立计数", () => {
  assert.equal(checkRateLimit("203.0.113.31", "login").allowed, true);
  for (let i = 0; i < 9; i += 1) checkRateLimit("203.0.113.31", "login");
  assert.equal(checkRateLimit("203.0.113.31", "login").allowed, false);
  // 邻居 IP 不该被连坐。
  assert.equal(checkRateLimit("203.0.113.32", "login").allowed, true);
});
