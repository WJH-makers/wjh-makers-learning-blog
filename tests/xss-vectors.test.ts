// 更全面的 XSS 向量测试（补充现有 markdown.test.ts 只有一个基础用例的空白）
import assert from "node:assert/strict";
import { test } from "node:test";
import { markdownToHtml } from "../lib/markdown.ts";

const XSS_VECTORS = [
  // 常规标签注入
  { input: '<script>alert(1)</script>', shouldNotContain: '<script>' },
  { input: '<iframe src="javascript:alert(1)"></iframe>', shouldNotContain: '<iframe' },
  { input: '<img src=x onerror=alert(1)>', shouldNotContain: '<img' },  // 整个标签应被转义，不能出现裸 <img
  { input: '<svg onload=alert(1)>', shouldNotContain: '<svg' },

  // 危险 URI —— javascript:/data:/vbscript: 在这个引擎里会被丢弃，链接变成纯文本
  { input: '[link](javascript:alert(1))', shouldNotContain: '<a href=' },  // 整个链接被废弃
  { input: '[link](data:text/html,<script>alert(1)</script>)', shouldNotContain: '<a href=' },
  { input: '[link](vbscript:msgbox)', shouldNotContain: '<a href=' },

  // 事件处理器在各种上下文 —— 应被转义或丢弃，不能出现可执行的形式
  { input: '![img](x" onerror="alert(1))', shouldNotContain: 'onerror="' },  // 引号应被转义
  { input: '<a href="#" onclick="alert(1)">link</a>', shouldNotContain: '<a' },  // 整个标签应被转义

  // HTML 实体绕过尝试 —— 用户输入的实体会被再次转义（双重转义），证明不会当 HTML 解析
  { input: '&lt;script&gt;alert(1)&lt;/script&gt;', mustContain: '&amp;lt;' },  // &lt; 被转义成 &amp;lt;
  { input: '&#60;script&#62;', mustContain: '&amp;#60;' },  // 数字实体同样被转义

  // Markdown 自身特性可能引入的
  { input: '[![](x)](javascript:alert(1))', shouldNotContain: '<a href=' },  // 图片链接也会被废弃
  { input: '```html\n<script>alert(1)</script>\n```', mustContain: '&#x3C;' },  // Shiki 用 &#x3C; 转义
];

test("XSS 向量集（补充覆盖）", async () => {
  for (const { input, shouldNotContain, mustContain } of XSS_VECTORS) {
    const html = await markdownToHtml(input);
    if (shouldNotContain && html.includes(shouldNotContain)) {
      assert.fail(`输入 ${JSON.stringify(input)} 渲染出了 ${shouldNotContain}: ${html}`);
    }
    if (mustContain && !html.includes(mustContain)) {
      assert.fail(`输入 ${JSON.stringify(input)} 应转义出 ${mustContain}: ${html}`);
    }
  }
});

// 表格劈列 XSS（利用未转义的裸竖线触发列错位，可能绕过转义）
test("表格劈列不会引入 XSS", async () => {
  const table = `| A | B |
|---|---|
| <script>alert(1)</script> | safe |`;
  const html = await markdownToHtml(table);
  assert.ok(!html.includes('<script>'), "表格内 <script> 应被转义");
  assert.ok(html.includes('&lt;script&gt;'), html);
});

// [!答案] 折叠里的内容是否也转义（必须在 > 引用块里）
test("[!答案] 折叠内的 HTML 仍然转义", async () => {
  const md = `> [!答案]
> <script>alert(1)</script>
> 继续`;
  const html = await markdownToHtml(md);
  assert.ok(!html.includes('<script>'), html);
  assert.ok(html.includes('&lt;script&gt;'), html);
  assert.ok(html.includes('<details'), "[!答案] 应生成 <details>");
});

// 代码高亮是否会透传未转义 HTML（Shiki 输出 &#x3C; 等实体）
test("Shiki 代码高亮不透传裸 HTML", async () => {
  const md = '```js\n<script>alert(1)</script>\n```';
  const html = await markdownToHtml(md);
  // Shiki 输出实体或 <span> 包装，不会有裸 <script>alert
  assert.ok(!html.includes('<script>alert'), "代码块内 <script> 不应裸露");
  // Shiki 用 &#x3C; 或 &lt; 转义
  assert.ok(html.includes('&#x3C;') || html.includes('&lt;'), `应有转义实体: ${html.slice(0, 400)}`);
});
