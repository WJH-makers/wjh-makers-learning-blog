import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PUBLIC_POSTS_REVALIDATE_SECONDS } from "../lib/cache-policy.ts";

const root = process.cwd();
const postsSource = readFileSync(path.join(root, "lib", "posts.ts"), "utf8");
const writeSource = readFileSync(path.join(root, "app", "write", "page.tsx"), "utf8");
const proxySource = readFileSync(path.join(root, "proxy.ts"), "utf8");

test("public database content has a bounded shared cache", () => {
  assert.match(postsSource, /PUBLIC_POSTS_CACHE_TAG\s*=\s*"public-posts-v1"/);
  assert.match(postsSource, /unstable_cache\(/);
  assert.match(postsSource, /tags:\s*\[PUBLIC_POSTS_CACHE_TAG\]/);

  // 窗口值本身由 lib/cache-policy.ts 定义，这里断言「三处缓存都引用同一个常量」
  // 而不是断言字面量 300 —— 前者才能挡住「只改其中一处」这个真实失效模式。
  const references = postsSource.match(/revalidate:\s*PUBLIC_POSTS_REVALIDATE_SECONDS/g) ?? [];
  assert.equal(references.length, 3, "三个 unstable_cache 都必须引用同一个窗口常量");
  assert.doesNotMatch(postsSource, /revalidate:\s*\d/, "不得在此内联数字窗口");
  assert.equal(PUBLIC_POSTS_REVALIDATE_SECONDS, 300, "窗口默认 300 秒；改动需同步 README 的缓存说明");
});

test("publishing invalidates the public-content cache before rerendering routes", () => {
  assert.match(writeSource, /updateTag\(PUBLIC_POSTS_CACHE_TAG\);/);
  assert.match(writeSource, /revalidatePath\("\/"\);/);
  assert.match(writeSource, /revalidatePath\("\/rss\.xml"\);/);
});

test("public pages do not expose Markdown content negotiation or export routes", () => {
  assert.doesNotMatch(proxySource, /NextResponse\.rewrite/);
  assert.doesNotMatch(proxySource, /request\.headers\.get\("accept"\)|Vary", "Accept|text\/markdown|\/markdown/i);
});
