/**
 * 安全头的正向契约。
 *
 * 此前唯一碰这些头的断言是 tests/config-convergence.test.ts 的「安全头与缓存串不在
 * next.config.ts 里第二次定义」——那是防重复定义的**负向**断言：它遍历
 * STATIC_SECURITY_HEADERS 逐项去 next.config.ts 里找，删掉数组里任意一项只会让那个
 * 循环少跑一轮，测试照样全绿。于是「源站到底还发不发 X-Frame-Options」这件事，
 * 连同 CSP 里四条限制性指令，从来没有任何测试兜过。
 *
 * 期望清单刻意写死在本文件里、不从被测模块 import：import 过来就是拿实现证明实现，
 * 删一项或改一个值都仍然自洽。代价是改头必须改两处 —— 这正是想要的摩擦。
 *
 * 边界：本文件只管「源站声明了什么」。Cloudflare 的 Managed Transform 会在边缘覆写
 * HSTS / X-Frame-Options / Referrer-Policy 三项（见 lib/security-headers.ts 顶部的三层
 * 实测记录），那是 Dashboard 配置，代码层既测不到也改不动。
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { contentSecurityPolicy, securityHeaders } from "../lib/security-headers.ts";

/** 与 CSP 无关的那部分头。逐字写死，顺序无关（下面按 key 排序后比对）。 */
const EXPECTED_STATIC: ReadonlyArray<readonly [string, string]> = [
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "DENY"],
  ["X-Robots-Tag", "noarchive"],
  ["X-XSS-Protection", "1; mode=block"],
];

/**
 * CSP 里「关掉一整类能力」的四条。它们与白名单类指令（script-src 等）性质不同：
 * 白名单少放一个域名是功能故障，一眼看得见；这四条被删掉或被放宽，页面表现完全正常，
 * 只是防线没了。form-action 尤其是 CSP 里少数能挡「数据外带」而非「脚本执行」的指令。
 */
const RESTRICTIVE_DIRECTIVES = [
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
];

/** 按 CSP 的 `; ` 分隔切开。精确到整条指令，避免子串匹配把放宽后的指令也算通过。 */
function directives(policy: string): string[] {
  return policy.split(";").map((part) => part.trim()).filter(Boolean);
}

test("securityHeaders() 发出 CSP + 7 个静态头，键与值逐项精确", () => {
  const actual = securityHeaders();
  const csp = actual.filter((h) => h.key === "Content-Security-Policy");
  assert.equal(csp.length, 1, "必须且只能有一条 Content-Security-Policy");
  assert.ok(csp[0].value.length > 0, "CSP 值不得为空串（空串等于没有策略）");

  // 全量比对而非逐项 includes：只有全量才同时抓住「删了一项」「改了一个值」
  // 「悄悄多挂了一个头」三种漂移。新增头是刻意要在这里登记一次的。
  const staticPairs = actual
    .filter((h) => h.key !== "Content-Security-Policy")
    .map((h) => [h.key, h.value] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));
  assert.deepEqual(
    staticPairs,
    [...EXPECTED_STATIC].sort((a, b) => a[0].localeCompare(b[0])),
    "静态安全头与本文件写死的期望清单不一致（改头请同步改这里）",
  );
});

test("CSP 带齐四条限制性指令，且是精确指令而非被放宽的同名指令", () => {
  const list = directives(contentSecurityPolicy());
  for (const directive of RESTRICTIVE_DIRECTIVES) {
    assert.ok(
      list.includes(directive),
      `CSP 缺少 ${directive}；实际指令：\n${list.join("\n")}`,
    );
  }
  // 同名指令出现两次时浏览器只认第一条，后一条静默失效 —— 这类改动最难看出来。
  const names = list.map((d) => d.split(/\s+/)[0]);
  const duplicated = names.filter((name, i) => names.indexOf(name) !== i);
  assert.deepEqual(duplicated, [], `CSP 指令重复（浏览器只认第一条）：${duplicated.join(", ")}`);
});

test("传入资源前缀只放宽白名单类指令，不渗进四条限制性指令与静态头", () => {
  // 真实的退化路径：给 CSP 加参数化白名单时把 `${asset}` 拼到了不该拼的指令上，
  // frame-ancestors 'none' 变成 frame-ancestors 'none' https://cdn.… ——
  // 站点照常工作，点击劫持防线却没了。
  const prefix = "https://cdn.example.com";
  const list = directives(contentSecurityPolicy(prefix));
  for (const directive of RESTRICTIVE_DIRECTIVES) {
    assert.ok(list.includes(directive), `带资源前缀后 ${directive} 被改写了`);
  }

  const staticWithPrefix = securityHeaders(prefix)
    .filter((h) => h.key !== "Content-Security-Policy")
    .map((h) => [h.key, h.value] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));
  assert.deepEqual(
    staticWithPrefix,
    [...EXPECTED_STATIC].sort((a, b) => a[0].localeCompare(b[0])),
    "静态头与资源前缀无关，不应随参数变化",
  );
});
