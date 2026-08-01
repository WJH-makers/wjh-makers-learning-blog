import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
const startRoute = "/posts/2026-07-25-java-s01e01-hello";
const nextRoute = "/posts/2026-07-26-java-s01e02-variables";

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
    if (message.type() === "error") errors.push(message.text());
  });
  return { context, page, errors };
}

const desktop = await newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
await desktop.page.goto(new URL(startRoute, baseUrl).href, { waitUntil: "domcontentloaded" });
await desktop.page.locator(".book-turn-next").waitFor({ state: "visible" });
await desktop.page.evaluate(() => document.fonts.ready);
await desktop.page.evaluate(() => {
  window.__readerAudit = { clickAt: 0, titleAt: 0, clearAt: 0, maxLongTask: 0, animationNames: [] };
  const audit = window.__readerAudit;
  document.querySelector(".book-turn-next")?.addEventListener("click", () => {
    audit.clickAt = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (!audit.titleAt && location.pathname.includes("s01e02") && document.querySelector("h1")?.textContent?.includes("02")) {
        audit.titleAt = now;
      }
      if (audit.titleAt && !document.documentElement.dataset.pageTurn && !audit.clearAt) audit.clearAt = now;
      for (const animation of document.getAnimations()) {
        if (animation.animationName && !audit.animationNames.includes(animation.animationName)) {
          audit.animationNames.push(animation.animationName);
        }
      }
      if (now - audit.clickAt > 900) window.clearInterval(timer);
    }, 8);
  }, { capture: true, once: true });
  new PerformanceObserver((entries) => {
    for (const entry of entries.getEntries()) {
      if (audit.clickAt && entry.startTime >= audit.clickAt) audit.maxLongTask = Math.max(audit.maxLongTask, entry.duration);
    }
  }).observe({ type: "longtask" });
});
await desktop.page.waitForTimeout(300);
await desktop.page.screenshot({ path: path.join(outputDir, "desktop-before.png") });
await desktop.page.locator(".book-turn-next").click();
await desktop.page.waitForURL(new URL(nextRoute, baseUrl).href, { timeout: 2000 });
await desktop.page.waitForFunction(() => document.querySelector("h1")?.textContent?.includes("02"), null, { timeout: 2000 });
await desktop.page.waitForTimeout(360);
await desktop.page.screenshot({ path: path.join(outputDir, "desktop-after.png") });
const desktopResult = await desktop.page.evaluate(() => {
  const audit = window.__readerAudit;
  return {
    titleReadyMs: Math.round(audit.titleAt - audit.clickAt),
    cleanupMs: Math.round(audit.clearAt - audit.clickAt),
    maxLongTaskMs: Math.round(audit.maxLongTask),
    animationNames: audit.animationNames,
    pathname: location.pathname,
    scrollY,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    transitionState: document.documentElement.dataset.pageTurn ?? null,
  };
});
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
