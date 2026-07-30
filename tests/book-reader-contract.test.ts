import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();
const read = (...parts: string[]) => readFileSync(path.join(root, ...parts), "utf8");

test("article pagination uses book-edge turns instead of visible previous-next button bars", () => {
  const page = read("app", "posts", "[slug]", "page.tsx");
  const reader = read("app", "posts", "[slug]", "BookReader.tsx");

  assert.match(page, /<BookReader previous=\{previous\} next=\{next\}>/);
  assert.doesNotMatch(page, /className="(?:series|chrono)-pager/);
  assert.match(reader, /ArrowLeft/);
  assert.match(reader, /ArrowRight/);
  assert.match(reader, /router\.push\(target\.href/);
});

test("book reader preserves a motion-safe paper reading surface", () => {
  const css = read("app", "globals.css");

  assert.match(css, /\.book-reader/);
  assert.match(css, /--book-paper/);
  assert.match(css, /html\[data-page-turn="next"\]/);
  assert.match(css, /@keyframes chapter-sheet-next/);
  assert.match(css, /html\[data-page-turn\]::before/);
  assert.match(css, /position:\s*fixed/);
  assert.doesNotMatch(css, /\.article-shell\s*\{[^}]*animation:\s*(?!none)/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*html\[data-page-turn\]::before,[\s\S]*display:\s*none/);
});
