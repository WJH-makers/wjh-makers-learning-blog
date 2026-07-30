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

test("Clarity 分析端点与全站 CSP 保持一致", () => {
  const clarity = fs.readFileSync(path.join(root, "app", "ClarityAnalytics.tsx"), "utf8");
  const config = fs.readFileSync(path.join(root, "next.config.ts"), "utf8");
  assert.match(clarity, /https:\/\/www\.clarity\.ms\/tag/);
  assert.match(config, /script-src[^\"]*https:\/\/www\.clarity\.ms/);
  assert.match(config, /connect-src[^\"]*https:\/\/\*\.clarity\.ms/);
});
