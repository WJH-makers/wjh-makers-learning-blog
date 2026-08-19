import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { STATIC_SITEMAP_ROUTES } from "../lib/sitemap-routes.ts";
import { contentSecurityPolicy } from "../lib/security-headers.ts";

const root = process.cwd();

test("sitemap 固定入口不重复，并覆盖核心公开页面", () => {
  const paths = STATIC_SITEMAP_ROUTES.map((entry) => entry.path);
  assert.equal(new Set(paths).size, paths.length);

  for (const path of ["/", "/start", "/learning", "/universe", "/posts", "/tags", "/projects", "/now"]) {
    assert.ok(paths.includes(path as (typeof paths)[number]), `sitemap 缺少 ${path}`);
  }
});

test("文章 OpenGraph 图片不为旧或未知 slug 伪造 200 图片", () => {
  const imageRoute = fs.readFileSync(path.join(root, "app", "posts", "[slug]", "opengraph-image.tsx"), "utf8");
  assert.match(imageRoute, /LEGACY_POST_SLUG_REDIRECTS/);
  assert.match(imageRoute, /permanentRedirect\(`\/posts\/\$\{legacy\.to\}\/opengraph-image`/);
  assert.match(imageRoute, /notFound\(\)/);
});

test("全站页脚展示 ICP 备案并链接工信部备案系统", () => {
  const layout = fs.readFileSync(path.join(root, "app", "layout.tsx"), "utf8");
  const footer = layout.match(/<footer className="footer">([\s\S]*?)<\/footer>/)?.[1];

  assert.ok(footer, "RootLayout 缺少全站 footer");
  assert.match(footer, /href="https:\/\/beian\.miit\.gov\.cn\/"/);
  assert.match(footer, /鄂ICP备2026036494号-1/);
});

test("第三方分析端点与全站 CSP 保持一致", () => {
  const layout = fs.readFileSync(path.join(root, "app", "layout.tsx"), "utf8");

  // Clarity 已下线:国内读者 100% 加载失败(实测 curl http=000 / 浏览器
  // ERR_CONNECTION_CLOSED),收不到任何数据却每页多两个控制台错误。这里钉死"别再
  // 悄悄加回来" —— 组件、挂载点、CSP 白名单三处必须同时保持干净。
  assert.ok(!fs.existsSync(path.join(root, "app", "ClarityAnalytics.tsx")), "ClarityAnalytics 组件应已删除");
  assert.doesNotMatch(layout, /ClarityAnalytics/);

  // CSP 现在是 lib/security-headers.ts 导出的数据，直接断言生成结果 ——
  // 不再拿正则扒 next.config.ts 的源码文本（那种断言会被解释性注释里的域名绊倒，
  // 本测试上一版就为此专门绕了一圈只匹配指令片段）。
  const csp = contentSecurityPolicy();
  const directive = (name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

  assert.doesNotMatch(directive("script-src"), /clarity/);
  assert.doesNotMatch(directive("connect-src"), /clarity/);

  // CF Web Analytics 的 beacon 由边缘注入、代码里管不着,白名单先留着:
  // 删掉只会把网络失败变成 CSP violation,要真去掉得先在 CF Dashboard 关功能。
  assert.match(directive("script-src"), /https:\/\/static\.cloudflareinsights\.com/);
  assert.match(directive("connect-src"), /https:\/\/cloudflareinsights\.com/);
});
