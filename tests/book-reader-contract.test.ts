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
  assert.doesNotMatch(page, /series-pager|chrono-pager/);
  assert.match(reader, /ArrowLeft/);
  assert.match(reader, /ArrowRight/);
  assert.match(reader, /router\.push\(target\.href/);
});

test("book reader preserves a motion-safe paper reading surface", () => {
  const css = read("app", "globals.css");

  assert.match(css, /\.book-reader/);
  assert.match(css, /--book-paper/);
  assert.match(css, /book-turn-next/);
  assert.match(css, /@keyframes book-turn-next/);
  assert.match(css, /\.book-reader\[data-turn\] \.article-shell \{ animation: none; \}/);
});
