import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import { publicAssetUrl } from "./assets.ts";
import comicManifest from "./comic-manifest.json" with { type: "json" };

/**
 * Markdown 渲染引擎(纯函数,零 fs/db 依赖,可被 node --test 直测)。
 * 从 lib/posts.ts 拆出;posts.ts re-export 保持原有 import 路径兼容。
 * comic-manifest.json 是构建期静态数据(scripts/build-comic-variants.mjs 产出),不破坏纯函数性。
 *
 * 方言说明:单个换行 = 新段落(非 CommonMark 软换行合并)——全站存量文章依赖此行为,勿改。
 */

const COMIC_SIZES: Record<string, { w: number; h: number }> = comicManifest;

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** 标题锚点 slug。TOC(page.tsx)与渲染器必须共用同一实现,否则锚点静默失效。 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * 加粗/斜体。开标记后与闭标记前必须是非空白(近似 CommonMark flanking),
 * 否则 `2 * 3 * 4`、`*.txt 和 *.md` 里的星号会被误配成 <em>。
 */
function emphasize(value: string): string {
  return value
    .replace(/\*\*(?=\S)([^*]+?)(?<=\S)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(?=\S)([^*]+?)(?<=\S)\*/g, "<em>$1</em>");
}

/**
 * 行内渲染:占位符方案。
 * 行内代码/图片/链接命中后整体存入 slots、原位留 \u0000{i}\u0000 占位,
 * emphasis 只作用于剩余纯文本,最后回填——代码内容与已生成标签的属性区
 * 从此对后续规则不可见(否则 `a**b**c`、img alt 里的 * 会被二次解析)。
 */
function inlineMarkdown(value: string): string {
  const slots: string[] = [];
  const stash = (html: string) => `\u0000${slots.push(html) - 1}\u0000`;

  let out = escapeHtml(value.replace(/\u0000/g, ""))
    // 行内代码:GFM 多反引号围栏。开启的 N 个反引号必须由**恰好** N 个闭合
    // ((?<!`) 与 (?!`) 保证不会把 ``` 拆开来当闭合用),内容首尾同为空格时剥一层 ——
    // 这是唯一能写出「代码内容里含反引号」的方式,例如 `` `a**b**c` ``。
    // 原实现 /`([^`]+)`/ 会把它错配成 <code> </code> + 裸 a**b**c,于是 ** 反被加粗。
    .replace(/(`+)(.+?)(?<!`)\1(?!`)/g, (_m, _ticks: string, code: string) => {
      const inner = /^ .* $/.test(code) && code.trim() ? code.slice(1, -1) : code;
      return stash(`<code>${inner}</code>`);
    })
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, (_m, alt: string, src: string) =>
      stash(`<img class="post-image" src="${publicAssetUrl(src)}" alt="${alt}" loading="lazy" decoding="async" />`))
    .replace(/!\[([^\]]*)\]\((\/comics\/java\/([A-Za-z0-9._~!$&'()*+,;=:@%/-]+)\.png)\)/g, (_m, alt: string, _src: string, stem: string) => {
      // AVIF 优先、512w 移动变体、webp 兜底(png 原档不再进 serve 路径,现代覆盖率已 ~100%);
      // 尺寸取 manifest 真实值(源图有 1055x1491/887x1774/1024x1536 三种,写死会让占位比例失真)。
      // 变体与 manifest 由 scripts/build-comic-variants.mjs 生成,新增漫画后需重跑一次。
      const base = publicAssetUrl(`/comics/java/${stem}`);
      const { w, h } = COMIC_SIZES[stem] ?? { w: 1024, h: 1536 };
      const sizes = "(max-width: 960px) 94vw, 900px";
      return stash(
        `<picture>` +
        `<source type="image/avif" srcset="${base}-512.avif 512w, ${base}.avif ${w}w" sizes="${sizes}" />` +
        `<source type="image/webp" srcset="${base}-512.webp 512w, ${base}.webp ${w}w" sizes="${sizes}" />` +
        `<img class="post-image comic-image" src="${base}.webp" alt="${alt}" width="${w}" height="${h}" loading="lazy" decoding="async" />` +
        `</picture>`);
    })
    .replace(/!\[([^\]]*)\]\((\/(?!\/)[A-Za-z0-9._~!$&'()*+,;=:@%/-]+)\)/g, (_m, alt: string, src: string) =>
      stash(`<img class="post-image" src="${publicAssetUrl(src)}" alt="${alt}" loading="lazy" decoding="async" />`))
    // URL 支持一层平衡括号(维基/MDN 的 /Foo_(bar) 不再截断)
    .replace(/\[([^\]]+)\]\((https?:\/\/(?:\([^\s()]*\)|[^\s()])+)\)/g, (_m, text: string, url: string) =>
      stash(`<a href="${url}" target="_blank" rel="noreferrer">${emphasize(text)}</a>`))
    .replace(/\[([^\]]+)\]\((?!https?:)([^\s)]+)\)/g, (_m, text: string, url: string) => {
      // 站内白名单:# / mailto: / 单斜杠绝对路径;排除 // 与 /\(协议相对 URL 会跳站外)
      const safe = /^(#|mailto:)/i.test(url) || (url.startsWith("/") && !/^\/[\\/]/.test(url));
      return safe ? stash(`<a href="${url}" rel="noreferrer">${emphasize(text)}</a>`) : text;
    });

  out = emphasize(out);

  // 表格单元格内换行在 GFM 里唯一的写法就是 <br>,放行这一个无属性单标签(零 XSS 面)。
  // 行内代码中的 `<br>` 已被占位符保护、仍按字面展示 —— 讲 HTML 语法的文章不受影响。
  out = out.replace(/&lt;br\s*\/?&gt;/gi, "<br />");

  // 回填可能嵌套(如 *`code`* 的斜体包着代码占位符),循环展开到不动点
  for (let guard = 0; guard <= slots.length && /\u0000\d+\u0000/.test(out); guard++) {
    out = out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => slots[Number(i)] ?? "");
  }
  return out;
}

// ---------- 代码高亮(Shiki)与图示 DSL ----------

const highlightCache = new Map<string, string>();
const MAX_CACHE = 800;

function cacheGet(key: string): string | undefined {
  const hit = highlightCache.get(key);
  if (hit !== undefined) {
    // LRU:命中重插到队尾,常用块不再被 FIFO 挤出
    highlightCache.delete(key);
    highlightCache.set(key, hit);
  }
  return hit;
}

function cachePut(key: string, value: string): void {
  if (highlightCache.size >= MAX_CACHE) {
    const oldest = highlightCache.keys().next().value;
    if (oldest !== undefined) highlightCache.delete(oldest);
  }
  highlightCache.set(key, value);
}

/**
 * 文本围栏里的框线图必须保持等宽与空格；交给 Shiki + 移动端自动换行会破坏布局。
 * 仅识别明确的 Unicode 框线字符，普通说明文字仍按原来的高亮逻辑渲染。
 */
function isBoxDiagram(code: string, lang: string): boolean {
  const plainText = !lang.trim() || /^(?:text|plain|plaintext)$/i.test(lang.trim());
  return plainText && /[┌┐└┘├┤┬┴┼│─]/.test(code);
}

type TcpFlowStep = {
  direction: "forward" | "reverse" | "both";
  message: string;
  note?: string;
};

/**
 * 将 TCP 小节使用的轻量 DSL 渲染为结构化流程图。
 * 文本框线图包含中文时会因字形回退而失去等宽对齐；此处用 CSS 网格保持语义和布局。
 */
function renderTcpFlowDiagram(code: string): string | null {
  const [flowPart, layerPart] = code.split(/^---\s*$/m);
  if (!flowPart || !layerPart) return null;

  const names = { client: "客户端", server: "服务器" };
  const steps: TcpFlowStep[] = [];
  for (const rawLine of flowPart.trim().split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = /^(client|server)\s*(<->|->)\s*(client|server)\s*:\s*(.+?)(?:\s*\|\s*(.+))?$/i.exec(line);
    if (!match) return null;

    const [, from, arrow, to, message, note] = match;
    const direction = arrow === "<->"
      ? "both"
      : from === "client" && to === "server"
        ? "forward"
        : from === "server" && to === "client"
          ? "reverse"
          : null;
    if (!direction) return null;
    steps.push({ direction, message, note });
  }

  const layers = layerPart
    .trim()
    .split("\n")
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.length >= 2 && parts[0] && parts[1]);
  if (steps.length === 0 || layers.length === 0) return null;

  const stepHtml = steps.map((step) => {
    const directionLabel = step.direction === "forward" ? "客户端发送到服务器" : step.direction === "reverse" ? "服务器发送到客户端" : "客户端与服务器双向通信";
    const noteHtml = step.note ? `<span class="tcp-flow__note">${inlineMarkdown(step.note)}</span>` : "";
    return `<li class="tcp-flow__step tcp-flow__step--${step.direction}"><span class="tcp-flow__route" aria-label="${directionLabel}"><strong>${inlineMarkdown(step.message)}</strong></span>${noteHtml}</li>`;
  }).join("");
  const layerHtml = layers.map(([level, detail, tag]) =>
    `<li><span class="tcp-flow__layer-level">${inlineMarkdown(level)}</span><span>${inlineMarkdown(detail)}</span>${tag ? `<em>${inlineMarkdown(tag)}</em>` : ""}</li>`
  ).join("");

  return `<figure class="protocol-diagram tcp-flow"><figcaption><span>${names.client}</span><b>TCP 连接与字节流</b><span>${names.server}</span></figcaption><ol class="tcp-flow__steps">${stepHtml}</ol><ol class="tcp-flow__layers" aria-label="网络分层">${layerHtml}</ol></figure>`;
}

/**
 * Shiki 细粒度按需加载:全量入口会把 ~200 种语法 + ~60 主题打进 standalone 产物。
 * 全站实测仅用到下面这些语言;未注册语言由 catch 回退纯文本(与旧行为一致)。
 * 新文章引入新语言时在此补一行 import 即可。
 */
let highlighterPromise: Promise<HighlighterCore> | null = null;
function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [import("shiki/themes/github-light.mjs"), import("shiki/themes/github-dark.mjs")],
    langs: [
      import("shiki/langs/java.mjs"),
      import("shiki/langs/javascript.mjs"),
      import("shiki/langs/typescript.mjs"),
      import("shiki/langs/shellscript.mjs"), // bash / sh / shell / zsh
      import("shiki/langs/powershell.mjs"),
      import("shiki/langs/html.mjs"),
      import("shiki/langs/css.mjs"),
      import("shiki/langs/json.mjs"),
      import("shiki/langs/yaml.mjs"),
      import("shiki/langs/xml.mjs"),
      import("shiki/langs/sql.mjs"),
      import("shiki/langs/docker.mjs"), // dockerfile
      import("shiki/langs/diff.mjs"),
      import("shiki/langs/nginx.mjs"),
      import("shiki/langs/ini.mjs"), // properties(注:conf 不是 ini 别名,未注册语言走回退)
    ],
    engine: createOnigurumaEngine(import("shiki/wasm")),
  });
  return highlighterPromise;
}

async function highlightCode(code: string, lang: string): Promise<string> {
  const cacheKey = `${lang}:${code}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  if (/^tcp-flow$/i.test(lang.trim())) {
    const diagram = renderTcpFlowDiagram(code);
    if (diagram) {
      cachePut(cacheKey, diagram);
      return diagram;
    }
  }

  if (isBoxDiagram(code, lang)) {
    const diagram = `<pre class="ascii-diagram"><code>${escapeHtml(code)}</code></pre>`;
    cachePut(cacheKey, diagram);
    return diagram;
  }

  // lowercase 硬化:shiki 的 lang 名大小写敏感,```Java 会误走纯文本回退
  const language = lang.trim().toLowerCase() || "text";
  const opts = { themes: { light: "github-light", dark: "github-dark" }, defaultColor: false } as const;
  const highlighter = await getHighlighter();
  try {
    const result = highlighter.codeToHtml(code, { lang: language, ...opts });
    cachePut(cacheKey, result);
    return result;
  } catch {
    // 未注册/未知语言回退纯文本("text" 为 shiki 内置,无需注册)
    const fallbackResult = highlighter.codeToHtml(code, { lang: "text", ...opts });
    cachePut(cacheKey, fallbackResult);
    return fallbackResult;
  }
}

// ---------- GFM 表格 ----------

/**
 * GFM 表格行切分。管道符是列边界，所以 `\|` 是唯一能在单元格里写出竖线的方式
 * ——规范中管道转义**优先于**行内代码，因此连 `` `a \| b` `` 也必须写转义。这里
 * 把 `\|` 还原成裸竖线再交给 inlineMarkdown(escapeHtml 不动 `|`，安全)。
 *
 * 原实现直接 split("|")：`` `Get-Content access.log \| more` `` 会被劈成两格，
 * 反引号被截断成未闭合、整行多出一列，而 renderTable 按表头列数遍历，多出来的
 * 那一列(往往正是说明文字)被静默丢弃 —— 全站曾有 71 行栽在这上面。
 */
function parseTableRow(line: string): string[] {
  const s = line.trim();
  const cells: string[] = [];
  let cur = "";
  // 首尾的**裸**竖线是表格边框，不产生空单元格；但结尾的 `\|` 属于内容。
  const start = s.startsWith("|") ? 1 : 0;
  const end = s.endsWith("|") && !s.endsWith("\\|") ? s.length - 1 : s.length;
  for (let i = start; i < end; i++) {
    const ch = s[i];
    if (ch === "\\" && s[i + 1] === "|") {
      cur += "|";
      i++;
      continue;
    }
    if (ch === "|") {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function tableAligns(sep: string): string[] {
  return parseTableRow(sep).map((c) => {
    const l = c.startsWith(":");
    const r = c.endsWith(":");
    return l && r ? "center" : r ? "right" : l ? "left" : "";
  });
}

/**
 * 单一字符类 + 线性匹配。原版 /^\s*\|?[\s:|-]+\|?\s*$/ 与本式接受的语言完全相同,
 * 但相邻可重叠量词在失配长行上有 O(N^3) 回溯,一行数千空格即可挂死事件循环。
 */
function isTableSeparator(line: string): boolean {
  return line.includes("-") && line.includes("|") && /^[\s:|-]+$/.test(line);
}

function renderTable(header: string[], aligns: string[], rows: string[][]): string {
  const cell = (tag: string, text: string, i: number) => {
    const a = aligns[i] ? ` style="text-align:${aligns[i]}"` : "";
    return `<${tag}${a}>${inlineMarkdown(text)}</${tag}>`;
  };
  const thead = `<thead><tr>${header.map((h, i) => cell("th", h, i)).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map((r) => `<tr>${header.map((_, i) => cell("td", r[i] ?? "", i)).join("")}</tr>`)
    .join("")}</tbody>`;
  return `<div class="table-scroll"><table>${thead}${tbody}</table></div>`;
}

// ---------- 列表(支持缩进嵌套) ----------

type ListItem = { indent: number; ordered: boolean; number?: number; task?: { checked: boolean }; text: string };

function parseListItem(line: string): ListItem | null {
  const m = line.match(/^(\s*)(?:(\d+)\.|([-*]))\s+(.*)$/);
  if (!m) return null;
  const indent = m[1].replace(/\t/g, "    ").length;
  const ordered = m[2] !== undefined;
  let text = m[4];
  let task: { checked: boolean } | undefined;
  if (!ordered) {
    const t = text.match(/^\[([ xX])\]\s+(.*)$/);
    if (t) {
      task = { checked: t[1].toLowerCase() === "x" };
      text = t[2];
    }
  }
  return { indent, ordered, number: ordered ? Number(m[2]) : undefined, task, text };
}

/**
 * 按缩进栈生成嵌套 <ul>/<ol>。缩进比栈顶多 ≥2 空格开子层(挂在未闭合的 <li> 内),
 * 回退时逐层关闭。原版只认行首零缩进,`  - 子项` 会被渲成裸 <p> 并把父列表切成两段。
 */
function renderListBlock(items: ListItem[]): string {
  const out: string[] = [];
  const stack: { type: "ul" | "ol"; indent: number }[] = [];
  const top = () => stack[stack.length - 1];
  // </li> 就地拼接(不独立成行):平铺列表输出与旧实现逐字节一致,黄金对比零噪声
  const closeLi = () => { out[out.length - 1] += "</li>"; };
  // Markdown 中两段有序列表可能被空行或答案选项隔开；浏览器会把每个 <ol> 从 1
  // 重新开始。保留源码的起始编号，才能让 2.–10. 在文章中仍按原题号展示。
  const openList = (type: "ul" | "ol", item: ListItem) => (
    type === "ol" && item.number !== undefined && item.number !== 1
      ? `<ol start="${item.number}">`
      : `<${type}>`
  );

  for (const it of items) {
    const type = it.ordered ? "ol" : "ul";
    if (stack.length === 0) {
      stack.push({ type, indent: it.indent });
      out.push(openList(type, it));
    } else if (it.indent >= top().indent + 2) {
      stack.push({ type, indent: it.indent });
      out.push(openList(type, it));
    } else {
      closeLi();
      while (stack.length > 1 && it.indent < top().indent) {
        out.push(`</${stack.pop()!.type}>`);
        closeLi();
      }
      if (top().type !== type) {
        out.push(`</${stack.pop()!.type}>`);
        stack.push({ type, indent: it.indent });
        out.push(openList(type, it));
      }
    }
    out.push(it.task
      ? `<li class="task-item"><input type="checkbox" disabled${it.task.checked ? " checked" : ""}> ${inlineMarkdown(it.text)}`
      : `<li>${inlineMarkdown(it.text)}`);
  }

  closeLi();
  while (stack.length) {
    out.push(`</${stack.pop()!.type}>`);
    if (stack.length) closeLi();
  }
  return out.join("\n");
}

// ---------- 块级渲染 ----------

// 便利贴:markdown 里用 > [!类型] 内容 触发,渲染成手写贴纸风的强调/吐槽/打趣卡片。
// 同时兼容 GitHub alert 英文类型(NOTE/TIP/IMPORTANT/WARNING),旧文章无需改写。
const STICKY_CLASS: Record<string, string> = {
  强调: "sticky-emphasis", 重点: "sticky-emphasis", TIP: "sticky-emphasis", IMPORTANT: "sticky-emphasis",
  吐槽: "sticky-grumble", 诉苦: "sticky-grumble",
  打趣: "sticky-fun", 彩蛋: "sticky-fun",
  警告: "sticky-warn", 坑: "sticky-warn", WARNING: "sticky-warn", CAUTION: "sticky-warn",
  NOTE: "sticky-note",
};

export type Heading = { level: number; text: string; id: string };

type RenderCtx = { headings: Heading[]; usedIds: Map<string, number> };

/** 引用块按前导 > 递归一层;恶意/异常内容(一行两万个 >)不能炸栈,超限降级为转义文本。 */
const MAX_QUOTE_DEPTH = 32;

async function renderLines(lines: string[], ctx: RenderCtx, depth: number): Promise<string> {
  const html: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let codeLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCode) {
        html.push(await highlightCode(codeLines.join("\n"), codeLang));
        codeLines = [];
        codeLang = "";
        inCode = false;
      } else {
        codeLang = line.slice(3);
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) continue;

    // 引用块:聚合连续的 `>` 行(含空 `>`),整体去前缀后递归渲染,支持块内围栏/列表/段落
    if (line.startsWith(">")) {
      const inner: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        inner.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      i--;
      if (depth >= MAX_QUOTE_DEPTH) {
        html.push(`<blockquote><p>${escapeHtml(inner.join(" "))}</p></blockquote>`);
        continue;
      }
      const alert = inner[0]?.match(/^\[!(.+?)\]\s*(.*)$/);
      if (alert) {
        const type = alert[1].trim();
        const body = await renderLines([alert[2] ?? "", ...inner.slice(1)], ctx, depth + 1);
        if (type === "答案" || type === "解析" || type === "参考答案") {
          html.push(`<details class="quiz-answer"><summary>▸ 查看答案与解析</summary><div class="quiz-answer-body">${body}</div></details>`);
        } else if (type === "文字版" || type === "文字漫画") {
          // 漫画图的文字原稿:默认折叠,读屏/慢网/搜索引擎仍可及(图片 alt 只有一句摘要)。
          html.push(`<details class="quiz-answer comic-transcript"><summary>▸ 文字版漫画(无图环境与读屏可读)</summary><div class="quiz-answer-body">${body}</div></details>`);
        } else {
          const cls = STICKY_CLASS[type] ?? "sticky-note";
          html.push(`<aside class="sticky ${cls}"><span class="sticky-tag">${escapeHtml(type)}</span><div class="sticky-body">${body}</div></aside>`);
        }
      } else {
        html.push(`<blockquote>${await renderLines(inner, ctx, depth + 1)}</blockquote>`);
      }
      continue;
    }

    // GFM 表格:当前行含 | 且下一行是分隔行(|---|---|)
    if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = parseTableRow(line);
      const aligns = tableAligns(lines[i + 1]);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() && !lines[i].startsWith("```")) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      i--;
      html.push(renderTable(header, aligns, rows));
      continue;
    }

    if (/^(---|\*\*\*|___)\s*$/.test(line)) {
      html.push("<hr />");
      continue;
    }

    // 标题 h1–h6,渲染器直出锚点 id(TOC 用同一 slugify,不再正则反解析 HTML 回填)
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const rawText = heading[2].trim();
      const base = slugify(rawText) || "section";
      const seen = ctx.usedIds.get(base) ?? 0;
      ctx.usedIds.set(base, seen + 1);
      const id = seen === 0 ? base : `${base}-${seen + 1}`;
      if (depth === 0 && level <= 3) ctx.headings.push({ level, text: rawText, id });
      html.push(`<h${level} id="${id}">${inlineMarkdown(rawText)}</h${level}>`);
      continue;
    }

    // 列表:聚合连续列表行(含缩进)。题目与选项之间常有空行；若空行后仍是同层
    // 列表项，不能提前关掉 <ol>，否则浏览器会把后续题目重新从 1 编号。
    if (parseListItem(line)) {
      const items: ListItem[] = [];
      while (i < lines.length) {
        const it = parseListItem(lines[i]);
        if (it) {
          items.push(it);
          i++;
          continue;
        }

        if (lines[i].trim() === "") {
          let next = i + 1;
          while (next < lines.length && lines[next].trim() === "") next++;
          if (next < lines.length && parseListItem(lines[next])) {
            i = next;
            continue;
          }
        }
        break;
      }
      i--;
      html.push(renderListBlock(items));
      continue;
    }

    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  if (inCode) html.push(await highlightCode(codeLines.join("\n"), codeLang));
  return html.join("\n");
}

// ---------- 入口 ----------

/** 渲染并返回结构化标题列表(level 1–3,含去重后的锚点 id),供页面 TOC 直接消费。 */
export async function renderMarkdown(markdown: string): Promise<{ html: string; headings: Heading[] }> {
  const ctx: RenderCtx = { headings: [], usedIds: new Map() };
  const html = await renderLines(markdown.split(/\r?\n/), ctx, 0);
  // LCP 后处理:首图(漫画话即第一格)不该 lazy——String.replace 天然只替换第一处,
  // 首图提为 eager + 高优先级,其余图片保持懒加载。
  return {
    html: html.replace('loading="lazy"', 'loading="eager" fetchpriority="high"'),
    headings: ctx.headings,
  };
}

export async function markdownToHtml(markdown: string): Promise<string> {
  return (await renderMarkdown(markdown)).html;
}
