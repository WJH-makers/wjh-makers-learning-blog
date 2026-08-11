import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance as nodePerformance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const configured = process.env.PLAYWRIGHT_MODULE;
    const fallback = path.join(os.homedir(), "bin", "node_modules", "playwright", "index.mjs");
    return import(pathToFileURL(configured ? path.resolve(configured) : fallback).href);
  }
}

const { chromium } = await loadPlaywright();
const baseUrl = process.env.BROWSER_AUDIT_URL ?? "http://localhost:3021";
// 审计产物是一次性排查材料，不属于源码：默认落系统临时目录，别在仓库里长出 .omx/ 这种
// 既不该提交、又会被反复忘记清理的目录（上一版默认 ".omx/artifacts/…" 攒到了 42MB）。
const outputDir = path.resolve(
  process.env.BROWSER_AUDIT_OUTPUT ?? path.join(os.tmpdir(), "wjh-blog-audit", "browser-reader"),
);
const startRoute = "/posts/2026-05-03-java-s01e01-hello";
const nextRoute = "/posts/2026-05-04-java-s01e02-variables";

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];

async function newPage(options) {
  const context = await browser.newContext(options);
  await context.route("**/*", async (route) => {
    const hostname = new URL(route.request().url()).hostname;
    if (hostname.endsWith("clarity.ms") || hostname === "static.cloudflareinsights.com") {
      await route.fulfill({ status: 204, body: "" });
    } else {
      await route.continue();
    }
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // dev 模式下 React 用 eval() 做调试特性,撞上本站 CSP 必然报错,与阅读器无关。
    // audit-browser-layout.mjs 用同一判据过滤,两个审计对噪音的口径必须一致。
    const expectedDevCspWarning = baseUrl.startsWith("http://localhost:")
      && text.startsWith("eval() is not supported in this environment");
    if (!expectedDevCspWarning) errors.push(text);
  });
  return { context, page, errors };
}

const desktop = await newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
await desktop.page.goto(new URL(startRoute, baseUrl).href, { waitUntil: "domcontentloaded" });
await desktop.page.locator(".book-turn-next").waitFor({ state: "visible" });
await desktop.page.evaluate(() => document.fonts.ready);
await desktop.page.evaluate(() => {
  window.__readerAudit = { tracking: false, maxLongTask: 0, animationNames: [] };
  const audit = window.__readerAudit;
  document.querySelector(".book-turn-next")?.addEventListener("click", () => {
    audit.tracking = true;
    const timer = window.setInterval(() => {
      for (const animation of document.getAnimations()) {
        if (animation.animationName && !audit.animationNames.includes(animation.animationName)) {
          audit.animationNames.push(animation.animationName);
        }
      }
      if (!audit.tracking) window.clearInterval(timer);
    }, 8);
    window.setTimeout(() => { audit.tracking = false; }, 900);
  }, { capture: true, once: true });
  new PerformanceObserver((entries) => {
    for (const entry of entries.getEntries()) {
      if (audit.tracking) audit.maxLongTask = Math.max(audit.maxLongTask, entry.duration);
    }
  }).observe({ type: "longtask" });
});
await desktop.page.waitForTimeout(300);
await desktop.page.screenshot({ path: path.join(outputDir, "desktop-before.png") });
const desktopClickAt = nodePerformance.now();
await desktop.page.locator(".book-turn-next").click();
await desktop.page.waitForFunction(() => document.documentElement.dataset.pageTurn === "next", null, { timeout: 1000 });
const [titleReadyMs, cleanupMs] = await Promise.all([
  (async () => {
    await desktop.page.waitForURL(new URL(nextRoute, baseUrl).href, { timeout: 2000 });
    await desktop.page.waitForFunction(() => document.querySelector("h1")?.textContent?.includes("02"), null, { timeout: 2000 });
    return Math.round(nodePerformance.now() - desktopClickAt);
  })(),
  (async () => {
    await desktop.page.waitForFunction(() => !document.documentElement.dataset.pageTurn, null, { timeout: 2000 });
    return Math.round(nodePerformance.now() - desktopClickAt);
  })(),
]);
await desktop.page.waitForTimeout(360);
await desktop.page.screenshot({ path: path.join(outputDir, "desktop-after.png") });
const desktopPageState = await desktop.page.evaluate(() => {
  const audit = window.__readerAudit;
  return {
    maxLongTaskMs: Math.round(audit.maxLongTask),
    animationNames: audit.animationNames,
    pathname: location.pathname,
    scrollY,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    transitionState: document.documentElement.dataset.pageTurn ?? null,
  };
});
const desktopResult = { titleReadyMs, cleanupMs, ...desktopPageState };
await desktop.context.close();

const mobile = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "no-preference" });
await mobile.page.goto(new URL(startRoute, baseUrl).href, { waitUntil: "networkidle" });
await mobile.page.locator(".book-reader").evaluate((element) => {
  window.__readerPointerCaptures = 0;
  element.setPointerCapture = () => { window.__readerPointerCaptures += 1; };
  element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch", clientX: 340, clientY: 420 }));
  element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch", clientX: 60, clientY: 424 }));
});
await mobile.page.waitForURL(new URL(nextRoute, baseUrl).href, { timeout: 2000 });
await mobile.page.waitForTimeout(320);
const mobileResult = await mobile.page.evaluate(() => ({
  pathname: location.pathname,
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  transitionState: document.documentElement.dataset.pageTurn ?? null,
  pointerCaptures: window.__readerPointerCaptures,
}));
await mobile.context.close();

const reduced = await newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
await reduced.page.goto(new URL(startRoute, baseUrl).href, { waitUntil: "networkidle" });
await reduced.page.locator(".book-turn-next").click();
await reduced.page.waitForURL(new URL(nextRoute, baseUrl).href, { timeout: 2000 });
const reducedResult = await reduced.page.evaluate(() => ({
  pathname: location.pathname,
  transitionState: document.documentElement.dataset.pageTurn ?? null,
  pageTurnAnimations: document.getAnimations().map((animation) => animation.animationName).filter((name) => name.startsWith("chapter-sheet")),
}));
await reduced.context.close();

if (desktopResult.pathname !== nextRoute) failures.push("desktop next-page navigation failed");
if (desktopResult.titleReadyMs <= 0 || desktopResult.titleReadyMs > 1000) failures.push(`desktop title took ${desktopResult.titleReadyMs} ms`);
if (desktopResult.cleanupMs <= 0 || desktopResult.cleanupMs > 1000) failures.push(`desktop cleanup took ${desktopResult.cleanupMs} ms`);
if (desktopResult.maxLongTaskMs > 250) failures.push(`desktop long task reached ${desktopResult.maxLongTaskMs} ms`);
if (!desktopResult.animationNames.includes("chapter-sheet-next")) failures.push("desktop page-turn animation did not run");
if (desktopResult.overflow !== 0 || mobileResult.overflow !== 0) failures.push("page turn introduced horizontal overflow");
if (desktopResult.transitionState || mobileResult.transitionState) failures.push("page-turn state was not cleaned up");
if (mobileResult.pathname !== nextRoute) failures.push("mobile swipe navigation failed");
if (mobileResult.pointerCaptures !== 1) failures.push("mobile swipe did not capture its active pointer");
if (reducedResult.pathname !== nextRoute || reducedResult.pageTurnAnimations.length > 0 || reducedResult.transitionState) {
  failures.push("reduced-motion fallback failed");
}
for (const error of [...desktop.errors, ...mobile.errors, ...reduced.errors]) failures.push(`browser error: ${error}`);

const report = { baseUrl, generatedAt: new Date().toISOString(), desktop: desktopResult, mobile: mobileResult, reducedMotion: reducedResult, failures };
await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
