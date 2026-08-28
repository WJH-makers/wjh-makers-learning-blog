import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// lib/og-base.ts 里 ROUTES_WITH_OWN_OG_IMAGE 是一份**手写清单**:socialMetadata 命中它时
// 整个省略 openGraph.images,把补图交回 Next 的文件式路由。漏登记的症状很隐蔽 ——
// 那张 ImageResponse 照样进构建、照样能直接访问,但没有任何 <meta> 指向它,
// 分享出去仍是站点默认图。页面看起来完全正常,只有在社交平台抓取时才现形。
// 所以必须有测试把清单与磁盘上真实存在的文件对锁。

const repoRoot = path.join(import.meta.dirname, "..");

function readOgBaseSource(): string {
  return fs.readFileSync(path.join(repoRoot, "lib", "og-base.ts"), "utf8");
}

/** 剥掉注释再匹配:本仓库注释大量引用配置值本身,直接全文匹配会假阳性。 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("ROUTES_WITH_OWN_OG_IMAGE 与磁盘上真实的 opengraph-image 路由一致", () => {
  const appDir = path.join(repoRoot, "app");
  const onDisk = fs
    .readdirSync(appDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    // 动态段(如 [slug])不走 staticPageMetadata,它们在 generateMetadata 里自己声明 OG;
    // 以 _ 开头的是组件目录,不是路由段。
    .filter((entry) => !entry.name.startsWith("[") && !entry.name.startsWith("_"))
    .filter((entry) =>
      fs.existsSync(path.join(appDir, entry.name, "opengraph-image.tsx"))
      || fs.existsSync(path.join(appDir, entry.name, "opengraph-image.ts")),
    )
    .map((entry) => `/${entry.name}`)
    .sort();

  const declared = [...stripComments(readOgBaseSource())
    .match(/ROUTES_WITH_OWN_OG_IMAGE[^=]*=\s*new Set\(\[([^\]]*)\]\)/)![1]
    .matchAll(/"([^"]+)"/g)]
    .map((m) => m[1])
    .sort();

  // 下限兜底:正则失配会得到空数组,让下面的 deepEqual 变成 [] vs [] 恒真。
  assert.ok(declared.length > 0, "没能从 og-base.ts 解析出清单,正则可能已失配");

  assert.deepEqual(
    declared,
    onDisk,
    `清单与磁盘不一致。\n清单:${declared.join(", ")}\n磁盘:${onDisk.join(", ")}\n`
    + "新增 <segment>/opengraph-image.tsx 后要把该路由加进 ROUTES_WITH_OWN_OG_IMAGE,"
    + "否则那张图不会被任何 meta 引用。",
  );
});

test("走 staticPageMetadata 的页面都带 RSS autodiscovery", () => {
  // alternates 是整体替换而非深合并:页面只写 canonical 就会顶掉 root layout 的 types,
  // 该页的 RSS <link> 随之消失。staticPageMetadata 内部已展开 RSS_ALTERNATE_TYPES,
  // 这里钉住它不被将来的重构摘掉。
  const source = stripComments(readOgBaseSource());
  assert.match(source, /RSS_ALTERNATE_TYPES/, "og-base 必须导出并使用 RSS_ALTERNATE_TYPES");
  assert.match(
    source,
    /alternates:\s*\{\s*canonical:\s*url,\s*\.\.\.RSS_ALTERNATE_TYPES\s*\}/,
    "staticPageMetadata 的 alternates 必须同时含 canonical 与 RSS types",
  );

  // 手写 alternates 的三个页面同样要展开常量,否则首页与 184 个文章页仍然缺 RSS link。
  for (const file of ["app/page.tsx", "app/posts/[slug]/page.tsx"]) {
    const pageSource = stripComments(fs.readFileSync(path.join(repoRoot, file), "utf8"));
    const alternates = pageSource.match(/alternates:\s*\{[^}]*\}/g) ?? [];
    assert.ok(alternates.length > 0, `${file} 没有 alternates 声明?`);
    for (const block of alternates) {
      assert.match(block, /RSS_ALTERNATE_TYPES/, `${file} 的 alternates 缺 RSS types:${block}`);
    }
  }
});
