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

test("所有连载目录下的漫画都使用 AVIF/WebP 响应式变体", async () => {
  const html = await markdownToHtml(
    "![炉中来客](/comics/jvm/f01e01-furnace-guest.png)",
  );
  assert.ok(html.includes('<picture>'), html);
  assert.ok(html.includes('/comics/jvm/f01e01-furnace-guest-512.avif'), html);
  assert.ok(html.includes('/comics/jvm/f01e01-furnace-guest.webp'), html);
  assert.ok(html.includes('class="post-image comic-image"'), html);
  assert.ok(!html.includes('.png"'), html);
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

test("选择题的空行不会让有序列表从 1 重新编号", async () => {
  const html = await markdownToHtml("1. 题一\n   - A) 甲　B) 乙\n\n2. 题二\n   - A) 丙　B) 丁\n\n3. 题三");
  const flat = html.replace(/\n/g, "");
  assert.equal((flat.match(/<ol>/g) ?? []).length, 1, flat);
  assert.ok(flat.includes("</ul></li><li>题二<ul>"), flat);
  assert.ok(flat.endsWith("</li></ol>"), flat);
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

/**
 * 题号连贯性闸门。原先只扫命令行课程的 25 话,而 Java 主线 56 + 番外 34 一直在闸门外 ——
 * 那 90 话同样是「题干 → 代码块 → 选项」的结构,同样依赖 renderListBlock 从源码编号
 * 推断出 <ol start="N">。这里把两条课程线一起钉住:只要 openList 的推断退化,
 * 被代码块拆开的后半段题目就会重新从 1 编号,而那是读者一眼就会看出来的错。
 */
test("两条课程连载的课后选择题都保持连续题号(含被代码块拆开的话次)", async () => {
  const posts = new URL("../content/posts/", import.meta.url);
  const files = readdirSync(posts).filter((file) => /-(java|cli)-s\d+e\d+-.+\.md$/.test(file));
  assert.equal(files.length, 115, "Java 90 话 + 命令行 25 话");

  let checked = 0;
  for (const file of files) {
    const source = readFileSync(new URL(file, posts), "utf8");
    // 区块边界取「选择题标题 → 下一个同级或更高级标题」，不假定后面一定跟解答题：
    // 各卷的收尾栏目并不统一（解答题道数不同、番外还有实操题）。
    const quizAt = source.indexOf("### 选择题");
    if (quizAt < 0) continue;
    const afterQuiz = source.slice(quizAt);
    const nextHeading = afterQuiz.slice(1).search(/\n#{2,3} /);
    const quiz = nextHeading < 0 ? afterQuiz : afterQuiz.slice(0, nextHeading + 1);
    const sourceNumbers = [...quiz.matchAll(/^(\d+)\.\s+/gm)].map((match) => Number(match[1]));
    // 只对标准 10 题的话次做序号断言，个别话次题量不同
    if (sourceNumbers.length !== 10) continue;
    checked++;
    assert.deepEqual(sourceNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], `${file} 的题目源序号不连续`);

    const { html } = await renderMarkdown(source);
    const start = html.indexOf('<h3 id="选择题');
    assert.ok(start >= 0, `${file} 的选择题 HTML 区块缺失`);
    const nextH3 = html.indexOf("<h3 ", start + 1);
    const nextH2 = html.indexOf("<h2 ", start + 1);
    const end = Math.min(nextH3 < 0 ? html.length : nextH3, nextH2 < 0 ? html.length : nextH2);
    const renderedQuiz = html.slice(start, end);
    const renderedStarts = [...renderedQuiz.matchAll(/<ol(?: start="(\d+)")?>/g)].map((match) => Number(match[1] ?? "1"));
    assert.equal(renderedStarts[0], 1, `${file} 的选择题必须从 1 开始`);
    assert.ok(
      renderedStarts.every((value, index) => index === 0 || value > (renderedStarts[index - 1] ?? 0)),
      `${file} 被代码块拆分后的有序列表不得回退到 1：${renderedStarts.join(", ")}`,
    );
  }
  // 两条课程线绝大多数话次都带标准 10 题；数量骤降说明区块体例被改动过，需要人来看一眼。
  assert.ok(checked >= 110, `进入题号闸门的话次只有 ${checked}，远低于预期(应 ≥110)`);
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

test("表格单元格内的 \\| 转义不劈列,且尾列内容不被丢弃", async () => {
  // 曾经的真实事故:`Get-Content access.log \| more` 被 split("|") 劈成两格,
  // 行内代码变成未闭合、整行多出一列,而 renderTable 按表头列数遍历 ——
  // 最后一列(说明文字)被静默丢弃,全站 71 行受影响。
  const html = await markdownToHtml(
    "| 场景 | Linux | PowerShell | 差异 |\n|---|---|---|---|\n" +
    "| 分页看大文件 | `less access.log` | `Get-Content access.log \\| more` | `less` 能回翻能搜索 |",
  );
  assert.equal((html.match(/<td/g) ?? []).length, 4, html);
  assert.ok(html.includes("<code>Get-Content access.log | more</code>"), html);
  assert.ok(html.includes("能回翻能搜索"), html);
});

test("表格首尾的 \\| 属于内容而非边框", async () => {
  const html = await markdownToHtml("| 甲 | 乙 |\n|---|---|\n| `a \\|` | `\\| b` |");
  assert.equal((html.match(/<td/g) ?? []).length, 2, html);
  assert.ok(html.includes("<code>a |</code>"), html);
  assert.ok(html.includes("<code>| b</code>"), html);
});

test("裸 <br> 放行为换行,行内代码里的 <br> 仍按字面展示", async () => {
  const html = await markdownToHtml("| 键 | 值 |\n|---|---|\n| `[user]`<br>`default=me` | 讲语法时写 `<br>` |");
  assert.ok(html.includes("<br />"), html);
  assert.ok(html.includes("<code>&lt;br&gt;</code>"), html);
});

test("双反引号围栏:代码内容里可以含反引号,且内部 ** 不被当强调", async () => {
  const html = await markdownToHtml("同理 `` `a**b**c` `` 里的 ** 会被误配。");
  assert.ok(html.includes("<code>`a**b**c`</code>"), html);
  assert.ok(!html.includes("<strong>b</strong>"), html);
});

test("多反引号围栏不会把 ``` 拆开当闭合", async () => {
  const html = await markdownToHtml("写 ` ```Java ` 会误走纯文本回退。");
  assert.ok(html.includes("<code>```Java</code>"), html);
});

test("单反引号行内代码与 cron 星号保持原行为", async () => {
  const html = await markdownToHtml("定时 `30 3 * * *` 执行");
  assert.ok(html.includes("<code>30 3 * * *</code>"), html);
  assert.ok(!html.includes("<em>"), html);
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
