import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();
const postsSource = readFileSync(path.join(root, "lib", "posts.ts"), "utf8");
const writeSource = readFileSync(path.join(root, "app", "write", "page.tsx"), "utf8");

test("public database content has a bounded shared cache", () => {
  assert.match(postsSource, /PUBLIC_POSTS_CACHE_TAG\s*=\s*"public-posts-v1"/);
  assert.match(postsSource, /unstable_cache\(/);
  assert.match(postsSource, /revalidate:\s*300/);
  assert.match(postsSource, /tags:\s*\[PUBLIC_POSTS_CACHE_TAG\]/);
});

test("publishing invalidates the public-content cache before rerendering routes", () => {
  assert.match(writeSource, /updateTag\(PUBLIC_POSTS_CACHE_TAG\);/);
  assert.match(writeSource, /revalidatePath\("\/"\);/);
  assert.match(writeSource, /revalidatePath\("\/rss\.xml"\);/);
});
