/**
 * sitemap/RSS 的 `Link` 响应头：值、挂载路径、以及「必须由 next.config.ts 的 headers() 出」。
 *
 * 这条头在 2026-08-29 把首页打成了 502 —— 原先设在 proxy.ts，开启 cacheComponents 后
 * 被写进 ISR 缓存条目并每轮 revalidate append 一份，累积到 14598 字节撑爆 nginx 的
 * proxy_buffer_size。根因与判据见 lib/discovery-links.ts 的模块注释。
 *
 * 因此本文件的断言分两类：
 *   - 正向：头的值对、只挂内容页（原先 proxy 的行为契约，逐条平移过来）
 *   - 负向：值不在 next.config.ts 里二次定义、不回到 middleware 层
 * 负向那组才是防复发的部分。
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { DISCOVERY_LINK_HEADERS, DISCOVERY_LINK_PATHS, DISCOVERY_LINK_VALUE } from "../lib/discovery-links.ts";
import { SITE_URL } from "../lib/site-config.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** 与 config-convergence.test.ts 同一套：next.config.ts 用无扩展名相对路径 import。 */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      const resolved = new URL(specifier, context.parentURL);
      if (!/\.[a-z]+$/.test(resolved.pathname)) {
        for (const extension of [".ts", ".tsx"]) {
          const candidate = new URL(resolved.href + extension);
          if (fs.existsSync(candidate)) return { url: candidate.href, shortCircuit: true };
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

const nextConfig = (await import(pathToFileURL(path.join(ROOT, "next.config.ts")).href)).default;
const headerRules: Array<{ source: string; headers: Array<{ key: string; value: string }> }> =
  await nextConfig.headers();

/** 剥注释后再断言：本仓库注释里大量引用配置值本身，全文匹配必假阳性。 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

// ── 正向：值与挂载路径 ─────────────────────────────────────────────────────

test("Link 头的值：绝对地址、sitemap 与 RSS 各一条", () => {
  assert.match(DISCOVERY_LINK_VALUE, /rel="sitemap"/);
  assert.match(DISCOVERY_LINK_VALUE, /rel="alternate"/);
  // 绝对地址而非相对：RSS 阅读器与抓取器拿相对地址解析不到。
  assert.ok(
    DISCOVERY_LINK_VALUE.includes(`<${SITE_URL}/sitemap.xml>`),
    `sitemap 必须是 ${SITE_URL} 下的绝对地址：${DISCOVERY_LINK_VALUE}`,
  );
  assert.ok(DISCOVERY_LINK_VALUE.includes(`<${SITE_URL}/rss.xml>`), "RSS 必须是绝对地址");
  assert.deepEqual(
    DISCOVERY_LINK_HEADERS.map((h) => h.key),
    ["Link"],
    "只应有 Link 一个头",
  );
});

test("Link 头挂在内容页，且不挂导航页", () => {
  const sources = headerRules.filter((r) => r.headers.some((h) => h.key === "Link")).map((r) => r.source);
  assert.deepEqual(
    [...sources].sort(),
    [...DISCOVERY_LINK_PATHS].sort(),
    "next.config.ts 实际挂载的路径必须与 DISCOVERY_LINK_PATHS 一致",
  );
  // 逐条平移原先 proxy.ts 的契约：首页、列表页、单段 slug 的文章页。
  for (const expected of ["/", "/posts", "/posts/:slug"]) {
    assert.ok(sources.includes(expected), `内容页 ${expected} 缺 Link 头`);
  }
  // /posts/:slug 在 path-to-regexp 下不匹配多段路径，与原先正则 /^\/posts\/[^/]+$/ 等价。
  for (const unexpected of ["/tags", "/series", "/java", "/(.*)"]) {
    assert.ok(!sources.includes(unexpected), `${unexpected} 不该带 Link 头`);
  }
});

// ── 负向：防复发 ───────────────────────────────────────────────────────────

test("Link 头的值不在 next.config.ts 里二次定义", () => {
  const config = stripComments(read("next.config.ts"));
  assert.ok(
    !config.includes("rel=\\\"sitemap\\\"") && !config.includes('rel="sitemap"'),
    "Link 的值应由 lib/discovery-links.ts 提供，next.config.ts 只负责挂路径",
  );
});

/**
 * 这条是本文件的核心防线。
 *
 * proxy.ts 里任何 `headers.set/append` 都会让头进 ISR 缓存条目并每轮累积 ——
 * 无论头名叫什么。tests/proxy-gates.test.ts 有一条运行时断言（调 proxy() 查实际头），
 * 这里再加一条源码层的，因为运行时那条只覆盖了被测到的那几个路径。
 */
test("proxy.ts 不再设置任何响应头", () => {
  const source = stripComments(read("proxy.ts"));
  const violations = [...source.matchAll(/\.headers\s*\.\s*(set|append)\s*\(/g)].map((m) => m[0]);
  assert.deepEqual(
    violations,
    [],
    `proxy.ts 出现了 ${violations.join(", ")}：设在 middleware 层的头会被 ISR 缓存累积成 502`,
  );
});
