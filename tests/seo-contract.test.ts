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

test("第三方分析端点与全站 CSP 保持一致", () => {
  const config = fs.readFileSync(path.join(root, "next.config.ts"), "utf8");
  const layout = fs.readFileSync(path.join(root, "app", "layout.tsx"), "utf8");

  // Clarity 已下线:国内读者 100% 加载失败(实测 curl http=000 / 浏览器
  // ERR_CONNECTION_CLOSED),收不到任何数据却每页多两个控制台错误。这里钉死"别再
  // 悄悄加回来" —— 组件、挂载点、CSP 白名单三处必须同时保持干净。
  assert.ok(!fs.existsSync(path.join(root, "app", "ClarityAnalytics.tsx")), "ClarityAnalytics 组件应已删除");
  assert.doesNotMatch(layout, /ClarityAnalytics/);
  // 只看 CSP 指令本身，别拿整份配置去匹配 —— 上面那段解释为什么下线的注释里就写着域名，
  // 用全文断言会被自己的注释绊倒。
  const scriptSrc = config.match(/script-src[^`]*/)?.[0] ?? "";
  const connectSrc = config.match(/connect-src[^`]*/)?.[0] ?? "";
  assert.doesNotMatch(scriptSrc, /clarity/);
  assert.doesNotMatch(connectSrc, /clarity/);

  // CF Web Analytics 的 beacon 由边缘注入、代码里管不着,白名单先留着:
  // 删掉只会把网络失败变成 CSP violation,要真去掉得先在 CF Dashboard 关功能。
  assert.match(config, /script-src[^\"]*https:\/\/static\.cloudflareinsights\.com/);
  assert.match(config, /connect-src[^\"]*https:\/\/cloudflareinsights\.com/);
});
