import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();

function cssFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return cssFiles(target);
    return entry.name.endsWith(".css") ? [target] : [];
  });
}

test("无回退值的 CSS 自定义属性都有静态或运行时来源", () => {
  const files = cssFiles(path.join(root, "app"));
  const sources = files.map((file) => ({ file, content: fs.readFileSync(file, "utf8") }));
  const defined = new Set(
    sources.flatMap(({ content }) => [...content.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)].map((match) => match[1])),
  );
  const layout = fs.readFileSync(path.join(root, "app", "layout.tsx"), "utf8");
  const injected = new Set([...layout.matchAll(/variable:\s*"(--[a-zA-Z0-9_-]+)"/g)].map((match) => match[1]));
  const runtime = new Set(["--shiki-dark", "--shiki-dark-bg", "--shiki-light", "--shiki-light-bg"]);
  const missing: string[] = [];

  for (const { file, content } of sources) {
    for (const match of content.matchAll(/var\((--[a-zA-Z0-9_-]+)([^)]*)\)/g)) {
      const [, variable, tail] = match;
      if (tail.includes(",") || defined.has(variable) || injected.has(variable) || runtime.has(variable)) continue;
      missing.push(`${path.relative(root, file)}: ${variable}`);
    }
  }

  assert.deepEqual(missing, []);
});
