import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();
const read = (...parts: string[]) => readFileSync(path.join(root, ...parts), "utf8");

test("homepage is a concise course entry point rather than a detail dashboard", () => {
  const home = read("app", "page.tsx");
  assert.doesNotMatch(home, /遥感 VQA|个人实验室|home-hero-panel|series-hero-card/);
  for (const route of ["/java", "/cli", "/cafe", "/series", "/archive"]) {
    assert.match(home, new RegExp(`href="${route}"`));
  }
});

test("retired about and tag pages have no navigation or sitemap entries", () => {
  const layout = read("app", "layout.tsx");
  const sitemap = read("app", "sitemap.ts");
  const redirects = read("next.config.ts");

  assert.doesNotMatch(layout, /href="\/about"|href="\/tags"/);
  assert.doesNotMatch(sitemap, /\$\{base\}\/(about|tags)/);
  assert.match(redirects, /source: "\/about"/);
  assert.match(redirects, /source: "\/tags\/:path\*"/);
  assert.equal(existsSync(path.join(root, "app", "about", "page.tsx")), false);
  assert.equal(existsSync(path.join(root, "app", "tags", "page.tsx")), false);
});
