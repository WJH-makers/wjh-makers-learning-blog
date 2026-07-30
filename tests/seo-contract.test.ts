import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { STATIC_SITEMAP_ROUTES } from "../lib/sitemap-routes.ts";

const root = process.cwd();

test("sitemap 固定入口不重复，并覆盖核心公开页面", () => {
  const paths = STATIC_SITEMAP_ROUTES.map((entry) => entry.path);
  assert.equal(new Set(paths).size, paths.length);

  for (const path of ["/", "/start", "/universe", "/posts", "/tags", "/projects", "/now"]) {
    assert.ok(paths.includes(path as (typeof paths)[number]), `sitemap 缺少 ${path}`);
  }
});

test("全站页脚展示 ICP 备案并链接工信部备案系统", () => {
  const layout = fs.readFileSync(path.join(root, "app", "layout.tsx"), "utf8");
  const footer = layout.match(/<footer className="footer">([\s\S]*?)<\/footer>/)?.[1];

  assert.ok(footer, "RootLayout 缺少全站 footer");
  assert.match(footer, /href="https:\/\/beian\.miit\.gov\.cn\/"/);
  assert.match(footer, /鄂ICP备2026036494号-1/);
});
