import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { STATIC_SITEMAP_ROUTES } from "../lib/sitemap-routes.ts";

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const configured = process.env.PLAYWRIGHT_MODULE;
    const fallback = path.join(os.homedir(), "bin", "node_modules", "playwright", "index.mjs");
    const modulePath = configured ? path.resolve(configured) : fallback;

    try {
      return await import(pathToFileURL(modulePath).href);
    } catch {
      throw new Error("Playwright 不可用。安装项目依赖，或用 PLAYWRIGHT_MODULE 指向 playwright/index.mjs。");
    }
  }
}

const { chromium } = await loadPlaywright();
const baseUrl = process.env.BROWSER_AUDIT_URL ?? "http://localhost:3021";
const baseOrigin = new URL(baseUrl).origin;
const outputDir = path.resolve(process.env.BROWSER_AUDIT_OUTPUT ?? ".omx/artifacts/browser-layout");
const articleRoute = "/posts/2026-07-25-java-s01e01-hello";
const articleSamples = [
  articleRoute,
  "/posts/2026-07-04-windows-java-fullstack-env",
  "/posts/2026-07-21-java-jvm-cheatsheet",
  "/posts/2026-07-26-longform-monolith-architecture",
];
const routeOverride = process.env.BROWSER_AUDIT_ROUTES?.split(",").map((route) => route.trim()).filter(Boolean);
const routes = routeOverride?.length
  ? routeOverride
  : [...new Set([
      ...STATIC_SITEMAP_ROUTES.map((entry) => entry.path),
      "/java",
      "/cli",
      "/career",
      "/cafe",
      ...articleSamples,
    ])];
const viewports = [
  { name: "mobile", width: 375, height: 812, isMobile: true, hasTouch: true },
  { name: "tablet", width: 768, height: 1024, isMobile: true, hasTouch: true },
  { name: "desktop", width: 1440, height: 1000, isMobile: false, hasTouch: false },
];
const fullPageRoutes = new Set(["/", "/cheatsheets", "/posts", articleRoute]);

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const internalLinks = new Set();

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
      reducedMotion: "reduce",
    });
    await context.addInitScript(() => {
      window.__browserAuditCls = 0;
      new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          if (!entry.hadRecentInput) window.__browserAuditCls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await context.route("**/*", async (route) => {
      const hostname = new URL(route.request().url()).hostname;
      if (hostname.endsWith("clarity.ms") || hostname === "static.cloudflareinsights.com") {
        await route.fulfill({ status: 204, body: "" });
      } else {
        await route.continue();
      }
    });

    for (const route of routes) {
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on("console", (message) => {
        const text = message.text();
        const expectedDevCspWarning = baseUrl.startsWith("http://localhost:")
          && text.startsWith("eval() is not supported in this environment");
        if (message.type() === "error" && !expectedDevCspWarning) consoleErrors.push(text);
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const startedAt = performance.now();
      const response = await page.goto(new URL(route, baseUrl).href, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await page.waitForTimeout(150);
      const auditDurationMs = Math.round(performance.now() - startedAt);
      const audit = await page.evaluate(({ origin, article, mobile }) => {
        const root = document.documentElement;
        const shell = document.querySelector(".article-shell")?.getBoundingClientRect();
        const prose = document.querySelector(".article-content")?.getBoundingClientRect();
        const visible = (element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        };
        const accessibleName = (element) => {
          const labelledBy = element.getAttribute("aria-labelledby");
          const labelledText = labelledBy
            ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ")
            : "";
          return [
            element.getAttribute("aria-label"),
            labelledText,
            element.getAttribute("title"),
            element.textContent,
            element.querySelector("img[alt]")?.getAttribute("alt"),
          ].find((value) => value?.trim())?.trim() ?? "";
        };
        const selector = (element) => {
          const id = element.id ? `#${element.id}` : "";
          const classes = [...element.classList].slice(0, 3).map((name) => `.${name}`).join("");
          return `${element.tagName.toLowerCase()}${id}${classes}`;
        };
        const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((heading) => ({
          level: Number(heading.tagName.slice(1)),
          text: heading.textContent?.trim().replace(/\s+/g, " ").slice(0, 100) ?? "",
        }));
        const headingJumps = headings.flatMap((heading, index) => {
          const previous = headings[index - 1];
          return previous && heading.level > previous.level + 1 ? [`${previous.level}:${previous.text} -> ${heading.level}:${heading.text}`] : [];
        });
        const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
        const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
        const unnamedControls = [...document.querySelectorAll("a[href], button, summary")]
          .filter((element) => visible(element) && !accessibleName(element))
          .map(selector);
        const unlabeledInputs = [...document.querySelectorAll("input:not([type=hidden]), textarea, select")]
          .filter((element) => {
            if (!visible(element) || element.getAttribute("aria-hidden") === "true") return false;
            const labelledBy = element.getAttribute("aria-labelledby");
            return !element.getAttribute("aria-label")
              && !labelledBy
              && !element.closest("label")
              && !(element.id && document.querySelector(`label[for="${CSS.escape(element.id)}"]`));
          })
          .map(selector);
        const missingImageAlt = [...document.querySelectorAll("img:not([alt])")].filter(visible).map(selector);
        const samePagePath = location.pathname;
        const brokenFragments = [...document.querySelectorAll("a[href]")].flatMap((anchor) => {
          const href = anchor.getAttribute("href");
          if (!href || !href.includes("#")) return [];
          const target = new URL(href, location.href);
          if (target.pathname !== samePagePath || !target.hash) return [];
          return document.getElementById(decodeURIComponent(target.hash.slice(1))) ? [] : [href];
        });
        const links = [...document.querySelectorAll("a[href]")].flatMap((anchor) => {
          const href = anchor.getAttribute("href");
          if (!href || href.startsWith("mailto:") || href.startsWith("javascript:")) return [];
          const target = new URL(href, location.href);
          return target.origin === origin ? [`${target.pathname}${target.search}`] : [];
        });
        const touchTargets = mobile && location.pathname.startsWith("/posts/")
          ? [...document.querySelectorAll(".crumbs a, .section-toc a")].map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                group: element.closest(".crumbs") ? "crumbs" : "toc",
                text: element.textContent?.trim() ?? "",
                width: rect.width,
                height: rect.height,
              };
            })
          : [];
        const resources = performance.getEntriesByType("resource");
        const topResources = resources
          .filter((entry) => entry.transferSize > 0)
          .sort((a, b) => b.transferSize - a.transferSize)
          .slice(0, 12)
          .map((entry) => {
            const url = new URL(entry.name);
            return {
              resource: url.origin === location.origin ? `${url.pathname}${url.search}` : `${url.hostname}${url.pathname}`,
              type: entry.initiatorType,
              transferBytes: entry.transferSize,
            };
          });

        return {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
          lang: root.lang,
          mainCount: document.querySelectorAll("main").length,
          h1Count: headings.filter((heading) => heading.level === 1).length,
          headingJumps,
          duplicateIds,
          unnamedControls,
          unlabeledInputs,
          missingImageAlt,
          brokenFragments,
          links,
          viewportWidth: root.clientWidth,
          scrollWidth: root.scrollWidth,
          articleShellWidth: shell?.width,
          proseWidth: prose?.width,
          touchTargets,
          cls: window.__browserAuditCls ?? 0,
          domNodes: document.getElementsByTagName("*").length,
          transferBytes: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
          topResources,
          isArticleSample: location.pathname === article,
        };
      }, { origin: baseOrigin, article: articleRoute, mobile: viewport.isMobile });

      for (const link of audit.links) internalLinks.add(link);
      delete audit.links;
      const slug = route === "/" ? "home" : route.replace(/^\//, "").replaceAll("/", "-");
      await page.screenshot({ path: path.join(outputDir, `${slug}-${viewport.name}-viewport.png`), caret: "initial" });
      if (fullPageRoutes.has(route) && viewport.name !== "tablet") {
        await page.screenshot({ path: path.join(outputDir, `${slug}-${viewport.name}.png`), fullPage: true, caret: "initial" });
      }
      results.push({ route, viewport: viewport.name, status: response?.status(), auditDurationMs, consoleErrors, pageErrors, ...audit });
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const linkResults = [];
const links = [...internalLinks].sort();
let linkIndex = 0;
async function checkLinks() {
  while (linkIndex < links.length) {
    const link = links[linkIndex++];
    try {
      const response = await fetch(new URL(link, baseUrl), { redirect: "manual" });
      linkResults.push({ link, status: response.status });
      await response.body?.cancel();
    } catch (error) {
      linkResults.push({ link, status: 0, error: error instanceof Error ? error.message : String(error) });
    }
  }
}
await Promise.all(Array.from({ length: Math.min(12, links.length) }, () => checkLinks()));
linkResults.sort((a, b) => a.link.localeCompare(b.link));

const failures = [];
for (const result of results) {
  const location = `${result.route} (${result.viewport})`;
  if (result.status !== 200) failures.push(`${location} HTTP ${result.status}`);
  if (result.consoleErrors.length > 0) failures.push(`${location} console errors: ${result.consoleErrors.join(" | ")}`);
  if (result.pageErrors.length > 0) failures.push(`${location} page errors: ${result.pageErrors.join(" | ")}`);
  if (result.scrollWidth > result.viewportWidth) failures.push(`${location} 横向溢出 ${result.scrollWidth - result.viewportWidth}px`);
  if (!result.title) failures.push(`${location} 缺少 title`);
  if (!result.description) failures.push(`${location} 缺少 description`);
  if (result.lang !== "zh-CN") failures.push(`${location} lang=${result.lang || "missing"}`);
  if (result.mainCount !== 1) failures.push(`${location} main 数量 ${result.mainCount}`);
  if (result.h1Count !== 1) failures.push(`${location} H1 数量 ${result.h1Count}`);
  if (result.headingJumps.length > 0) failures.push(`${location} 标题层级跳跃: ${result.headingJumps.join(" | ")}`);
  if (result.duplicateIds.length > 0) failures.push(`${location} 重复 ID: ${result.duplicateIds.join(", ")}`);
  if (result.unnamedControls.length > 0) failures.push(`${location} 无名称控件: ${result.unnamedControls.join(", ")}`);
  if (result.unlabeledInputs.length > 0) failures.push(`${location} 无标签表单控件: ${result.unlabeledInputs.join(", ")}`);
  if (result.missingImageAlt.length > 0) failures.push(`${location} 图片缺少 alt: ${result.missingImageAlt.join(", ")}`);
  if (result.brokenFragments.length > 0) failures.push(`${location} 无效页内锚点: ${result.brokenFragments.join(", ")}`);
  if (result.cls > 0.1) failures.push(`${location} CLS ${result.cls.toFixed(3)}`);
  if (result.isArticleSample && result.viewport === "desktop" && (result.articleShellWidth ?? 0) < 1000) {
    failures.push(`${location} 桌面章节画布仅 ${result.articleShellWidth}px`);
  }
  for (const target of result.touchTargets) {
    if (target.width < 44 || target.height < 44) {
      failures.push(`${location} ${target.group} 触控目标“${target.text}”尺寸 ${target.width.toFixed(1)}x${target.height.toFixed(1)}px`);
    }
  }
}
for (const result of linkResults) {
  if (result.status < 200 || result.status >= 400) failures.push(`站内链接 ${result.link} HTTP ${result.status}${result.error ? `: ${result.error}` : ""}`);
}

const generatedAt = new Date().toISOString();
const report = { baseUrl, generatedAt, failures, routes, viewports, results, linkResults };
await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  baseUrl,
  generatedAt,
  routeCount: routes.length,
  viewportCount: viewports.length,
  pageChecks: results.length,
  internalLinks: linkResults.length,
  failures,
  report: path.join(outputDir, "report.json"),
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
