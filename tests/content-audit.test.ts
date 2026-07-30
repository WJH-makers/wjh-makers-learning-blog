import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { markdownToHtml } from "../lib/markdown.ts";

const root = process.cwd();
const postsDir = path.join(root, "content", "posts");
const posts = fs.readdirSync(postsDir)
  .filter((name) => name.endsWith(".md"))
  .map((name) => ({ name, content: fs.readFileSync(path.join(postsDir, name), "utf8") }));

const javaPosts = posts.filter(({ name }) => name.includes("-java-") || name === "2026-07-04-windows-java-fullstack-env.md" || name === "2026-07-26-maven-gradle-cheatsheet.md");
const cliPosts = posts.filter(({ name }) => name.includes("-cli-"));

test("公开 Java/CLI 审计清单覆盖当前全部系列文章", () => {
  assert.ok(javaPosts.length >= 94, `expected at least 94 Java posts, got ${javaPosts.length}`);
  assert.ok(cliPosts.length >= 28, `expected at least 28 CLI posts, got ${cliPosts.length}`);
  for (const post of [...javaPosts, ...cliPosts]) {
    assert.match(post.content, /^---\r?\n[\s\S]*?^---/m, `${post.name} is missing front matter`);
  }
});

test("公开内容不泄露内部创作手册或本地维护路径", () => {
  for (const post of posts) {
    assert.doesNotMatch(post.content, /(?:docs\/[^\s`)]*\/)?handbook\.md\b/i, post.name);
  }
});

test("公开站点不暴露作者账户或仓库标识", () => {
  const publicRoots = ["app", "lib", "content", "public"];
  const forbidden = /WJH-makers|wjh-makers-learning-blog|github\.com\/WJH-makers|@WJH-makers/i;
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (/\.(?:ts|tsx|md|txt|xml|json|svg|html)$/i.test(entry.name)) {
        assert.doesNotMatch(fs.readFileSync(target, "utf8"), forbidden, target);
      }
    }
  };
  for (const directory of publicRoots) visit(path.join(root, directory));
});

test("公开内容不提供全文批量导出，评论写入默认必须通过人机验证", () => {
  assert.equal(fs.existsSync(path.join(root, "app", "agent", "markdown", "route.ts")), false);
  assert.equal(fs.existsSync(path.join(root, "app", "llms.txt", "route.ts")), false);
  assert.equal(fs.existsSync(path.join(root, "app", "posts", "[slug]", "markdown", "route.ts")), false);
  const rss = fs.readFileSync(path.join(root, "app", "rss.xml", "route.ts"), "utf8");
  const comments = fs.readFileSync(path.join(root, "lib", "comments.ts"), "utf8");
  const proxy = fs.readFileSync(path.join(root, "proxy.ts"), "utf8");
  assert.doesNotMatch(rss, /content:encoded/);
  assert.doesNotMatch(proxy, /text\/markdown|llms\.txt|\/markdown/);
  assert.match(comments, /COMMENTS_ENABLED === "true"/);
  assert.match(comments, /if \(!isCommentingEnabled\(\)\) return/);
});

test("每篇 Java 文章均说明运行环境、验证方式与官方依据", () => {
  for (const post of javaPosts) {
    assert.match(post.content, /## 运行环境、验证与依据/, post.name);
    assert.match(post.content, /Java SE 25 JLS/, post.name);
  }
});

test("每篇命令行文章均给出边界、回滚和验证入口", () => {
  for (const post of cliPosts) {
    assert.match(post.content, /## 运行前边界、回滚与验证/, post.name);
    assert.match(post.content, /完成后验证/, post.name);
  }
});

test("高风险命令均有与操作类型对应的安全提示", () => {
  const required: Array<[RegExp, RegExp]> = [
    [/\brm -rf\b|Remove-Item.*-Recurse/i, /删除边界/],
    [/git reset --hard|git push --force/i, /Git 回滚边界/],
    [/kill -9|SIGKILL/i, /进程边界/],
    [/\bchmod\b|\bsudo\b/i, /权限边界/],
    [/\bssh\b|\bscp\b|\brsync\b/i, /远端边界|ssh -G 主机别名/],
    [/\bdocker\s+(?:rm|system\s+prune|container\s+rm|volume\s+rm)\b/i, /容器边界/],
    [/\bufw\s+(?:allow|deny|enable|disable)|nginx\s+-t|systemctl\s+reload\s+nginx/i, /网络边界/],
    [/\bcron\b|crontab/i, /定时任务边界/],
  ];
  for (const post of cliPosts) {
    for (const [command, guard] of required) {
      if (command.test(post.content)) assert.match(post.content, guard, `${post.name}: ${command}`);
    }
  }
});

test("已知 Java 版本与实现边界保留明确说明", () => {
  const byName = new Map(posts.map((post) => [post.name, post.content]));
  assert.match(byName.get("2026-07-29-java-s01e05-switch.md") ?? "", /箭头规则.*switch.*语句.*表达式/s);
  assert.match(byName.get("2026-11-04-java-s09e09-virtual-threads.md") ?? "", /不能据此承诺.*绝不会 pin/s);
  assert.match(byName.get("2026-10-29-java-s09e03-sync-lock-upgrade.md") ?? "", /HotSpot.*不是 JLS 契约/s);
});

test("Java/CLI 全文可由站点 Markdown 渲染器渲染", async () => {
  for (const post of [...javaPosts, ...cliPosts]) {
    const html = await markdownToHtml(post.content);
    assert.ok(html.length > 100, `${post.name} rendered unexpectedly short output`);
    assert.doesNotMatch(html, /handbook\.md/i, post.name);
  }
});
