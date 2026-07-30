import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { markdownToHtml, renderMarkdown, slugify } from "../lib/markdown.ts";

// ---------- 行内代码隔离(诊断 #1/#4:code 内容曾被 emphasis/link 正则二次解析) ----------

test("行内代码里的 ** 不再被解析成 <strong>", async () => {
  const html = await markdownToHtml("`a**b**c`");
  assert.ok(html.includes("<code>a**b**c</code>"), html);
  assert.ok(!html.includes("<strong>"), html);
});

test("行内代码里的链接语法不再被注入 <a>", async () => {
  const html = await markdownToHtml("`见 [x](/y)`");
  assert.ok(html.includes("<code>见 [x](/y)</code>"), html);
  assert.ok(!html.includes("<a "), html);
});

test("行内代码里的 cron 表达式星号原样保留(现网实锤场景)", async () => {
  const html = await markdownToHtml("每天凌晨跑:`30 3 * * *`");
  assert.ok(html.includes("<code>30 3 * * *</code>"), html);
  assert.ok(!html.includes("<em>"), html);
});

test("正文与行内代码混排,代码外 emphasis 仍生效", async () => {
  const html = await markdownToHtml("用 `**粗体**` 语法写出**真粗体**");
  assert.ok(html.includes("<code>**粗体**</code>"), html);
  assert.ok(html.includes("<strong>真粗体</strong>"), html);
});

// ---------- img alt 保护(诊断 #6) ----------

test("图片 alt 里的 * 不再被注入 <strong>/<em>", async () => {
  const html = await markdownToHtml("![说明**重点**](https://x.com/a.png)");
  assert.ok(html.includes('alt="说明**重点**"'), html);
  assert.ok(!html.includes("<strong>"), html);
});

// ---------- 链接(诊断 #7 括号截断 / #9 白名单绕过) ----------

test("URL 内平衡括号完整保留,无游离 )", async () => {
  const html = await markdownToHtml("[Foo](https://en.wikipedia.org/wiki/Foo_(bar))");
  assert.ok(html.includes('href="https://en.wikipedia.org/wiki/Foo_(bar)"'), html);
  assert.ok(!/<\/a>\)/.test(html), html);
});

test("协议相对 // 与反斜杠 /\\ 链接被降级为纯文本", async () => {
  const a = await markdownToHtml("[点此](//evil.com)");
  assert.ok(!a.includes("<a "), a);
  const b = await markdownToHtml("[点此](/\\evil.com)");
  assert.ok(!b.includes("<a "), b);
});

test("站内 / 锚点 # / mailto: 链接正常放行", async () => {
  const a = await markdownToHtml("[文章](/posts/x)");
  assert.ok(a.includes('href="/posts/x"'), a);
  const b = await markdownToHtml("[跳转](#sec)");
  assert.ok(b.includes('href="#sec"'), b);
  const c = await markdownToHtml("[信](mailto:a@b.c)");
  assert.ok(c.includes('href="mailto:a@b.c"'), c);
});

test("javascript: 等危险协议仍被降级为纯文本", async () => {
  const html = await markdownToHtml("[x](javascript:alert(1))");
  assert.ok(!html.includes("<a "), html);
});

test("链接文本内的加粗仍然解析(保持原行为)", async () => {
  const html = await markdownToHtml("[**重点**文档](https://a.com/doc)");
  assert.ok(html.includes("<strong>重点</strong>"), html);
});

// ---------- emphasis flanking(诊断 #13) ----------

test("两侧带空格的 * 不再误判为斜体", async () => {
  const html = await markdownToHtml("循环 2 * 3 * 4 次");
  assert.ok(!html.includes("<em>"), html);
});

test("通配符 *.txt 不被吞成斜体", async () => {
  const html = await markdownToHtml("通配符 *.txt 和 *.md 都匹配");
  assert.ok(!html.includes("<em>"), html);
});

test("正常加粗/斜体不受影响", async () => {
  const html = await markdownToHtml("**粗**和*斜*");
  assert.ok(html.includes("<strong>粗</strong>"), html);
  assert.ok(html.includes("<em>斜</em>"), html);
});

// ---------- 标题(诊断 #14 H4-H6 / #10 TOC 锚点) ----------

test("H1-H6 全级别渲染", async () => {
  for (let n = 1; n <= 6; n++) {
    const html = await markdownToHtml(`${"#".repeat(n)} 标题${n}`);
    assert.ok(html.includes(`<h${n} id=`), `h${n}: ${html}`);
    assert.ok(!html.includes("####"), html);
  }
});

test("标题直出锚点 id,与 slugify 一致;headings 返回结构化列表", async () => {
  const { html, headings } = await renderMarkdown("## 四、原理图:一次 `stock--` 其实是三步");
  const id = slugify("四、原理图:一次 `stock--` 其实是三步");
  assert.ok(html.includes(`<h2 id="${id}">`), html);
  assert.equal(headings.length, 1);
  assert.equal(headings[0].id, id);
  assert.equal(headings[0].level, 2);
});

test("重名标题 id 去重", async () => {
  const { html, headings } = await renderMarkdown("## 小结\n\n正文\n\n## 小结");
  assert.ok(html.includes('id="小结"'), html);
  assert.ok(html.includes('id="小结-2"'), html);
  assert.deepEqual(headings.map((h) => h.id), ["小结", "小结-2"]);
});

// ---------- 嵌套列表(诊断 #8/#12:缩进子项曾退化为 <p> 并切断父列表) ----------

test("缩进无序子列表渲染为嵌套 <ul>,父列表不断裂", async () => {
  const html = await markdownToHtml("- a\n  - b\n- c");
  assert.equal(html.replace(/\n/g, ""), "<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>");
});

test("有序列表含缩进选项(s01e01 选择题场景),编号连续", async () => {
  const html = await markdownToHtml("1. 题一\n   - A) 甲　B) 乙\n2. 题二");
  const flat = html.replace(/\n/g, "");
  assert.ok(flat.startsWith("<ol><li>题一<ul>"), flat);
  assert.ok(flat.includes("</ul></li><li>题二</li></ol>"), flat);
  assert.ok(!flat.includes("<p>"), flat);
});

test("同层 ul/ol 切换保持原行为", async () => {
  const html = await markdownToHtml("- a\n1. b");
  const flat = html.replace(/\n/g, "");
  assert.equal(flat, "<ul><li>a</li></ul><ol><li>b</li></ol>");
});

test("被空行和选项拆开的选择题仍保留原始序号", async () => {
  const html = await markdownToHtml("1. 题一\n- A) 甲\n\n2. 题二\n- A) 乙\n\n10. 题十\n- A) 丙");
  const flat = html.replace(/\n/g, "");
  assert.ok(flat.includes("<ol><li>题一</li></ol>"), html);
  assert.ok(flat.includes('<ol start="2"><li>题二</li></ol>'), html);
  assert.ok(flat.includes('<ol start="10"><li>题十</li></ol>'), html);
});

test("25 话命令行课程的课后选择题始终显示 1–10", async () => {
  const posts = new URL("../content/posts/", import.meta.url);
  const files = readdirSync(posts).filter((file) => /-cli-s\d+e\d+-.+\.md$/.test(file));
  assert.equal(files.length, 25, "命令行课程应包含 25 话");
  for (const file of files) {
    const source = readFileSync(new URL(file, posts), "utf8");
    const quiz = /### 选择题\(10 道\)\r?\n([\s\S]*?)\r?\n### 解答题\(5 道\)/.exec(source)?.[1];
    assert.ok(quiz, `${file} 缺少标准选择题区块`);
    const sourceNumbers = [...quiz.matchAll(/^(\d+)\.\s+/gm)].map((match) => Number(match[1]));
    assert.deepEqual(sourceNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], `${file} 的题目源序号不连续`);

    const { html } = await renderMarkdown(source);
    const start = html.indexOf('<h3 id="选择题-10-道">');
    const end = html.indexOf('<h3 id="解答题-5-道">', start);
    assert.ok(start >= 0 && end > start, `${file} 的选择题 HTML 区块不完整`);
    const renderedQuiz = html.slice(start, end);
    const renderedStarts = [...renderedQuiz.matchAll(/<ol(?: start="(\d+)")?>/g)].map((match) => Number(match[1] ?? "1"));
    assert.deepEqual(renderedStarts, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], `${file} 的显示题号回退为 1`);
  }
});

test("任务列表回归", async () => {
  const html = await markdownToHtml("- [x] 完成\n- [ ] 待办");
  assert.ok(html.includes('class="task-item"'), html);
  assert.ok(html.includes("checked"), html);
});

test("深层递降回到顶层", async () => {
  const html = await markdownToHtml("- a\n    - b\n- c");
  const flat = html.replace(/\n/g, "");
  assert.equal(flat, "<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>");
});

// ---------- DoS 防护(诊断 #2 ReDoS / #3 递归栈溢出) ----------

test("表格分隔行探测对超长失配行保持线性(原版 O(N^3) 回溯)", async () => {
  const evil = "|\n" + " ".repeat(8000) + "x";
  const t0 = performance.now();
  await markdownToHtml(evil);
  const ms = performance.now() - t0;
  assert.ok(ms < 500, `耗时 ${ms}ms,应为毫秒级`);
});

test("单行两万个 > 不再炸栈", async () => {
  const html = await markdownToHtml(">".repeat(20000) + " hi");
  assert.ok(html.includes("<blockquote>"), "应正常输出而非抛 RangeError");
});

test("正常引用嵌套仍逐层渲染", async () => {
  const html = await markdownToHtml(">>> hi");
  assert.equal((html.match(/<blockquote>/g) ?? []).length, 3, html);
});

// ---------- 既有功能回归(便利贴/答案/表格/围栏/图示/方言) ----------

test("便利贴 [!吐槽] 渲染回归", async () => {
  const html = await markdownToHtml("> [!吐槽] 豆豆:测试!");
  assert.ok(html.includes('class="sticky sticky-grumble"'), html);
  assert.ok(html.includes("吐槽"), html);
});

test("[!答案] 折叠渲染回归", async () => {
  const html = await markdownToHtml("> [!答案]\n> **1-B** 解析文字");
  assert.ok(html.includes('<details class="quiz-answer">'), html);
  assert.ok(html.includes("<strong>1-B</strong>"), html);
});

test("GFM 表格渲染回归(含对齐)", async () => {
  const html = await markdownToHtml("| 甲 | 乙 |\n|---|:-:|\n| 1 | 2 |");
  assert.ok(html.includes("<table>"), html);
  assert.ok(html.includes('style="text-align:center"'), html);
});

test("代码围栏走 Shiki 高亮(双主题)", async () => {
  const html = await markdownToHtml("```java\nint x = 1;\n```");
  assert.ok(html.includes("shiki"), html);
});

test("box 框线图保持等宽渲染", async () => {
  const html = await markdownToHtml("```\n┌──┐\n│ x │\n└──┘\n```");
  assert.ok(html.includes('class="ascii-diagram"'), html);
});

test("tcp-flow DSL 渲染回归", async () => {
  const md = "```tcp-flow\nclient -> server: SYN | 建立连接\nserver -> client: SYN+ACK\n---\n应用层 | HTTP\n传输层 | TCP\n```";
  const html = await markdownToHtml(md);
  assert.ok(html.includes("tcp-flow__steps"), html);
});

test("方言锁定:单换行 = 两个独立段落(存量文章依赖,勿改成 CommonMark 合并)", async () => {
  const html = await markdownToHtml("第一行\n第二行");
  assert.equal((html.match(/<p>/g) ?? []).length, 2, html);
});

test("XSS 基线:裸 HTML 与引号被转义", async () => {
  const html = await markdownToHtml('<script>alert(1)</script> "x" \'y\'');
  assert.ok(!html.includes("<script>"), html);
  assert.ok(html.includes("&lt;script&gt;"), html);
});
