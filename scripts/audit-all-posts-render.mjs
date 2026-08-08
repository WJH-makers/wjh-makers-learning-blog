// 全量渲染每篇文章，验证自定义方言在 212 篇上都成立（现有 audit 只抽样 4 篇）。
// 只读检查，不改任何内容。
import fs from "node:fs/promises";
import path from "node:path";
import { markdownToHtml } from "../lib/markdown.ts";

const POSTS = path.resolve(import.meta.dirname, "..", "content", "posts");
const files = (await fs.readdir(POSTS)).filter((name) => name.endsWith(".md")).sort();

const findings = [];
let rendered = 0;

function stripFrontmatter(raw) {
  if (!raw.startsWith("---")) return raw;
  const end = raw.indexOf("\n---", 3);
  return end === -1 ? raw : raw.slice(end + 4);
}

// 表格分隔行:|---|:--:|---|
const isDelimiterRow = (line) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes("-");

for (const file of files) {
  const raw = await fs.readFile(path.join(POSTS, file), "utf8");
  const body = stripFrontmatter(raw);

  let html;
  try {
    html = await markdownToHtml(body);
    rendered += 1;
  } catch (error) {
    findings.push({ file, kind: "render-throw", detail: String(error?.message ?? error).slice(0, 200) });
    continue;
  }

  // 1. 未闭合代码围栏 —— 会吞掉后续全部正文
  const fences = body.match(/^ {0,3}```/gm) ?? [];
  if (fences.length % 2 !== 0) {
    findings.push({ file, kind: "unclosed-fence", detail: `${fences.length} 个围栏标记(奇数)` });
  }

  // 2. 渲染后残留未处理的方言标记
  const leftover = html.match(/\[!(?:答案|提示|注意|警告|折叠)\]/g);
  if (leftover) {
    findings.push({ file, kind: "leftover-marker", detail: [...new Set(leftover)].join(", ") });
  }

  // 3. [!答案] 应折叠成 <details>
  const answers = (body.match(/\[!答案\]/g) ?? []).length;
  if (answers > 0 && !html.includes("<details")) {
    findings.push({ file, kind: "answer-not-folded", detail: `${answers} 个 [!答案] 未生成 <details>` });
  }

  // 4. 危险标签透传(XSS 面)
  const tags = html.match(/<(script|iframe|object|embed|form)\b/gi);
  if (tags) findings.push({ file, kind: "raw-html-tag", detail: [...new Set(tags)].join(", ") });

  // 5. 危险 URI
  const uri = html.match(/(?:href|src)\s*=\s*["']\s*(?:javascript|vbscript):/gi);
  if (uri) findings.push({ file, kind: "dangerous-uri", detail: [...new Set(uri)].join(", ") });

  // 6. 表格列数不齐 —— 裸竖线劈列的直接症状
  const lines = body.split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^ {0,3}```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (!isDelimiterRow(line)) continue;

    // 找到表格:向上取表头,向下取数据行,比较列数
    const header = lines[i - 1];
    if (!header || !header.includes("|")) continue;
    const countCols = (row) => {
      // 先屏蔽行内代码再数未转义竖线。必须优先匹配多反引号围栏，
      // 只认单反引号会把 `` 当空代码段，后面的竖线被误判成列分隔。
      const masked = row.replace(/(`+)(?:(?!\1)[\s\S])*\1/g, (m) => " ".repeat(m.length));
      const inner = masked.trim().replace(/^\|/, "").replace(/\|$/, "");
      return inner.split(/(?<!\\)\|/).length;
    };
    const headerCols = countCols(header);
    for (let j = i + 1; j < lines.length; j += 1) {
      const row = lines[j];
      if (!row.trim() || !row.includes("|")) break;
      if (/^ {0,3}```/.test(row)) break;
      const cols = countCols(row);
      if (cols !== headerCols) {
        findings.push({
          file,
          kind: "table-column-mismatch",
          detail: `第 ${j + 1} 行 ${cols} 列 vs 表头 ${headerCols} 列: ${row.trim().slice(0, 80)}`,
        });
      }
    }
  }
}

const byKind = findings.reduce((acc, f) => {
  acc[f.kind] = (acc[f.kind] ?? 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({ total: files.length, rendered, findingCount: findings.length, byKind, findings }, null, 2));
if (findings.length > 0) process.exitCode = 1;
