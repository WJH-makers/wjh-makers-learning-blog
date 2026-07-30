import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();
const read = (...parts: string[]) => readFileSync(path.join(root, ...parts), "utf8");

test("homepage and global navigation expose the new learning entry points", () => {
  const home = read("app", "page.tsx");
  const layout = read("app", "layout.tsx");
  assert.doesNotMatch(home, /个人实验室|home-hero-panel/);
  for (const route of ["/start", "/universe"]) {
    assert.match(home, new RegExp(`href="${route}"`));
  }
  for (const route of ["/series", "/projects"]) {
    assert.match(layout, new RegExp(`href="${route}"`));
  }
});

test("tags remain navigable while the retired about page redirects", () => {
  const layout = read("app", "layout.tsx");
  const sitemap = read("app", "sitemap.ts");
  const redirects = read("next.config.ts");

  assert.doesNotMatch(layout, /href="\/about"/);
  assert.match(layout, /href="\/tags"/);
  assert.match(sitemap, /\$\{base\}\/tags/);
  assert.match(redirects, /source: "\/about"/);
  assert.doesNotMatch(redirects, /source: "\/tags\/:path\*"/);
  assert.equal(existsSync(path.join(root, "app", "about", "page.tsx")), false);
  assert.equal(existsSync(path.join(root, "app", "tags", "page.tsx")), true);
});
