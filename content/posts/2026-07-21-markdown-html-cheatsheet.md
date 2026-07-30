---
title: "Markdown + HTML 完整参考手册"
date: 2026-07-21
summary: "Markdown 语法全解 + HTML5 标签速查含表单多媒体 Canvas SVG"
tags: [HTML, Markdown, 前端, 命令速查]
---


# Markdown + HTML 完整参考手册

> 从[全栈指令速查大全](/posts/2026-07-15-command-reference-cheatsheet)拆分。

## Markdown 全指令清单（按难度 × 频次）

> **没有「全世界唯一官方全集」。**  
> 本文按四层模型穷尽 **CommonMark + GFM + Typora 常用扩展 + HTML 兜底**，并以 **Typora** 为第一目标环境。  
> 排序：**先频次（S→D），同频次内按难度（★→★★★★★）**。
>
> **四层模型**：① **CommonMark**（唯一有形式化规范的核心，[spec.commonmark.org](https://spec.commonmark.org)）→ ② **GFM**（GitHub Flavored Markdown，在 CommonMark 上加表格/任务列表/删除线/自动链接/脚注）→ ③ **Typora / 常见渲染器扩展**（数学、高亮、上下标、`[TOC]`、Mermaid、front matter）→ ④ **HTML 兜底**（Markdown 未覆盖的都能塞原生 HTML）。
> 下面先给**真正的 Markdown 全指令表**，再进入 HTML 手册。

---

## Markdown · S 极高频（CommonMark 核心，天天用）

| 难度 | 语法 | 作用 | 备注 / 坑 |
|------|------|------|-----------|
| ★ | `# 标题` … `###### 标题` | 一到六级 ATX 标题 | `#` 与文字间**必须有空格**——`#标题` 在严格 CommonMark 里不解析成标题（GitHub 就当普通段落）。行尾多余 `#` 会被吃掉。 |
| ★ | `标题\n===` / `标题\n---` | Setext 一/二级标题 | 只能做 h1/h2；`---` 单独一行且上方**非空**才是二级标题，上方是空行时它变成分割线——最常见的"标题变横线"bug。 |
| ★ | 空行分隔 | 段落 | 单个换行**不换段**（会被合并成一行显示）。段落之间必须留一个空行。 |
| ★ | `*斜体*` / `_斜体_` | em 强调 | 词中间用 `_` 不生效（`foo_bar_baz` 不斜体，防误伤蛇形命名）；词中间用 `*` 才行。 |
| ★ | `**粗体**` / `__粗体__` | strong | 同上：`__` 只在词边界生效。中文与 `*` 之间某些渲染器需要空格才触发。 |
| ★ | `***粗斜体***` | strong+em | 三星嵌套，等价 `**_x_**`；混用 `*`/`_` 更稳（`**_x_**`）。 |
| ★ | 行尾两空格 / 行尾 `\` | 硬换行 `<br>` | 行尾两个空格**不可见**，编辑器/格式化器常自动 trim 掉导致换行丢失；`\`（GFM/多数渲染器支持）更可靠。 |
| ★ | `- ` / `* ` / `+ ` + 文字 | 无序列表 | 三种符号**混用**会被部分解析器拆成多个相邻列表（中间断开）。整篇统一用 `-` 最稳。列表与上方段落间需空行。 |
| ★ | `1. 文字` | 有序列表 | 数字**不必连续**：`1. 1. 1.` 照样渲染成 1/2/3。但**起始数字有效**（`3.` 开头则从 3 计数，CommonMark/GFM 支持）。 |
| ★ | `` `代码` `` | 行内代码 | 内容含反引号时用**更多反引号**包裹：`` `` `a` `` ``。首尾各留一空格可显示以反引号开头的内容。 |
| ★ | ` ```lang ` … ` ``` ` | 围栏代码块 | 不写 `lang` 不高亮；`lang` 名错了静默不高亮。围栏也可用 `~~~`（内容含 ``` 时改用波浪线）。 |
| ★ | `[文字](url)` | 行内链接 | url 含空格要用 `<url>` 或 `%20`；相对路径相对于**渲染后**页面位置（博客里易错）。 |
| ★ | `![alt](url)` | 图片 | 只是 `[]` 前加 `!`。`alt` 别省——无障碍与加载失败回退都靠它。尺寸/懒加载得退回 `<img>`。 |
| ★ | `> 引用` | 块引用 | 可嵌套 `> >`；引用内可放列表/代码块。每行都要 `>`（惰性续行虽被容忍但易踩空行断裂）。 |
| ★ | `---` / `***` / `___`（单独一行） | 分割线 `<hr>` | 需 3 个及以上；与 Setext h2、front matter 边界、列表项 `- - -` 视觉冲突，前面留空行避免被当标题。 |

## Markdown · A 高频（CommonMark 进阶 + GFM）

| 难度 | 语法 | 作用 | 备注 / 坑 |
|------|------|------|-----------|
| ★★ | 缩进 2–4 空格再写子项 | 嵌套列表 | 缩进量要对齐父项**标记后的第一个字符**；有序列表子项常需 3 空格。Tab 与空格混用是嵌套错乱头号原因，统一用空格。 |
| ★★ | `[文字](url "标题")` | 带 title 的链接 | `title` 悬停显示；引号用直引号，中文全角引号无效。 |
| ★★ | `[文字][ref]` + `[ref]: url "标题"` | 引用式链接 | 定义可放文末，`ref` 不区分大小写；`[文字][]` 可省略 ref 名复用文字本身。重复内链时保持正文干净。 |
| ★★ | `<https://...>` / `<a@b.com>` | 自动链接 | 尖括号内必须是完整 URL/邮箱；GFM 额外支持**裸 URL** 自动成链（CommonMark 不会）。 |
| ★★ | `\*` `\_` `\#` `` \` `` `\\` … | 反斜杠转义 | 只对 **ASCII 标点**有效；`\ `（转义空格）、`\a` 无效会原样保留反斜杠。想显示 `\` 本身用 `\\`。 |
| ★★ | 4 空格 / 1 Tab 缩进 | 缩进代码块 | 老式写法，**与列表子内容缩进冲突**（列表里 4 空格是续行不是代码块）。优先用围栏代码块，别再用它。 |
| ★★ | 直接写 `<br>` `<sub>` `<kbd>` 等 | 内嵌 HTML | Markdown 覆盖不到就塞 HTML。⚠ GitHub/多数渲染器会 **sanitize**：`<script>` `<style>` `on*` 事件、`<iframe>` 常被整段剥除。块级 HTML 内部默认**不再解析 Markdown**（除非空行隔开）。 |
| ★★ | `\| 表头 \|` + `\| :--- \|` 分隔行 + 数据行 | **GFM 表格** | 必须有表头行与 `---` 分隔行；对齐 `:--`(左) `:-:`(中) `--:`(右)。单元格内的 `\|` 要转义，否则被当列分隔。首尾 `|` 可省但对齐更差。表格**不能跨行**、单元格内换行只能用 `<br>`。 |
| ★★ | `~~删除线~~` | 删除线（GFM） | **非 CommonMark**：纯规范渲染器（部分 SSG 默认）不认，显示成字面 `~~`。 |
| ★★ | `- [ ] 待办` / `- [x] 完成` | 任务列表（GFM） | 必须是**列表项**且 `[ ]`/`[x]` 紧跟标记；`[ ]` 中间**恰好一个空格**。GitHub 可点击勾选，普通渲染器只显示静态框。 |
| ★★★ | `文字[^1]` + `[^1]: 注释` | 脚注 | **非 CommonMark**：GitHub（2021 起）、Typora、Pandoc 支持；许多轻量渲染器不支持。`^` 后标签任意，渲染时按出现顺序重新编号。 |

## Markdown · B 中频（Typora / Pandoc / 渲染器扩展，兼容性看环境）

| 难度 | 语法 | 作用 | 备注 / 坑 |
|------|------|------|-----------|
| ★★ | `$E=mc^2$` / `$$\n…\n$$` | LaTeX 数学（行内/块级） | 依赖 MathJax/KaTeX。**GitHub 2022 起原生支持** `$`/`$$`；Typora 需在偏好里开启。裸 `$` 金额易被误当公式起点——转义为 `\$`。 |
| ★★ | `==高亮==` | 高亮 mark | Typora/部分渲染器支持，**GitHub 不支持**（原样显示 `==`）。 |
| ★★ | `^上标^` / `~下标~` | 上/下标 | Typora/Pandoc(需 `+superscript`) 支持；`~下标~` 与 `~~删除线~~` 语法相近，单波浪线才是下标。 |
| ★★ | `[TOC]` | 自动目录 | Typora/VuePress/部分渲染器支持，**GitHub 完全不认**（当普通文字）。 |
| ★★ | `:smile:` `:rocket:` | Emoji 短代码 | GitHub/Slack/Typora 支持一套 shortcode，CommonMark 无。不识别时原样显示 `:smile:`。可直接贴 Unicode 😄 更通用。 |
| ★★★ | 术语行 + 下一行 `: 定义` | 定义列表 | Pandoc/Typora 的 `deflist` 扩展，GFM 无——GitHub 上得退回 `<dl><dt><dd>`。 |
| ★★★ | ` ```mermaid ` 代码块 | 图表（流程图/时序图/甘特） | GitHub、Typora、GitLab 原生渲染 Mermaid；普通渲染器只当代码块显示源码。 |
| ★★★ | `> [!NOTE]` / `[!WARNING]` / `[!TIP]` | 提示框 Alerts | **GitHub 专属**扩展（2023 起），块引用首行写指令；其他渲染器只显示成普通引用带字面 `[!NOTE]`。 |
| ★★★ | 文首 `---` … `---` 包裹 YAML | Front matter | 本博客/Hugo/Jekyll/Astro 用来存 title/date/tags。⚠ 必须在**文件第一行**且用 `---`；缩进/引号写错整篇构建失败。value 含 `:`、`#` 的要加引号。 |

## Markdown · C/D 低频与易错点（收口）

| 难度 | 语法 / 议题 | 作用 | 备注 / 坑 |
|------|------|------|-----------|
| ★★ | HTML 实体 `&lt;` `&amp;` `&nbsp;` | 转义/特殊字符 | Markdown 里同样可用；显示连续空格/受控换行时 `&nbsp;` 比多敲空格可靠（Markdown 会折叠多余空格）。 |
| ★★★ | 松散 vs 紧凑列表 | 列表项间距 | 列表项之间**有空行** → 每项被 `<p>` 包裹（松散，行距变大）；无空行 → 紧凑。莫名多出的行距十有八九是不小心留了空行。 |
| ★★★ | 反斜杠 `\` 硬换行 vs 两空格 | 换行策略 | 团队协作统一用 `\`：两空格换行在 code review / 格式化器里几乎必然被 trim，且 diff 看不出。 |
| ★★★ | 标准 Markdown **无** 居中/字号/颜色/缩进 | 排版局限 | 这些一律退回 HTML+CSS（`<div align="center">` 在 GitHub 仍可用，`style=` 多被 sanitize）。别指望纯 Markdown 做版式。 |
| ★★★ | CommonMark ≠ 各家实现 | 可移植性 | 同一份 `.md` 在 GitHub / Typora / VuePress / 博客 SSG 下渲染**可能不同**。对外发布前在**目标渲染器**里预览，别只信编辑器所见。 |
| ★★★★ | 用 `markdownlint` 校验 | 规范/一致性 | `npx markdownlint-cli2 "**/*.md"` 可查标题跳级、列表符号不一致、行尾空格等；博客批量维护必备。 |

> **一句话选型**：只在 GitHub 上跑 → 放心用 GFM（表格/任务列表/脚注/Alerts/数学）；要跨渲染器可移植 → 死守 CommonMark，花哨排版一律 HTML 兜底；本地写作追体验 → Typora 全家桶，但发布前回到目标环境复验。

---

## HTML · S 极高频（骨架 + 正文）

| 难度 | 标签 | 用途 |
|------|------|------|
| ★ | `<!DOCTYPE html>` | 文档类型 |
| ★ | `<html>` | 根 |
| ★ | `<head>` / `<body>` | 头/身 |
| ★ | `<meta charset>` / viewport | 编码/移动端 |
| ★ | `<title>` | 标题 |
| ★ | `<link rel=stylesheet>` | 引 CSS |
| ★ | `<script>` | 脚本 |
| ★ | `<div>` / `<span>` | 通用块/行内 |
| ★ | `<p>` | 段落 |
| ★ | `<h1>`–`<h6>` | 标题 |
| ★ | `<a href>` | 链接 |
| ★ | `<img src alt>` | 图片 |
| ★ | `<ul>` `<ol>` `<li>` | 列表 |
| ★ | `<br>` / `<hr>` | 换行/线 |
| ★★ | `<strong>` `<em>` `<b>` `<i>` | 强调 |
| ★★ | `<code>` `<pre>` | 代码 |
| ★★ | `<table>` `<tr>` `<th>` `<td>` | 表格 |
| ★★ | `<form>` `<input>` `<button>` | 表单基础 |
| ★★ | `<header>` `<nav>` `<main>` `<footer>` `<section>` `<article>` | 语义分区 |

## HTML · A 高频

| 难度 | 标签 | 用途 |
|------|------|------|
| ★★ | `<label>` `<select>` `<option>` `<textarea>` | 表单控件 |
| ★★ | `<thead>` `<tbody>` `<tfoot>` `<caption>` | 表结构 |
| ★★ | `<figure>` `<figcaption>` | 图注 |
| ★★ | `<blockquote>` `<cite>` `<q>` | 引用 |
| ★★ | `<video>` `<audio>` `<source>` | 媒体 |
| ★★ | `<iframe>` | 内嵌页 |
| ★★★ | `<input type>` 全系：text/password/email/number/checkbox/radio/file/date/submit… | 输入类型 |
| ★★★ | `<datalist>` `<output>` `<progress>` `<meter>` | 增强表单 |
| ★★★ | `<details>` `<summary>` `<dialog>` | 交互 |
| ★★★ | 全局属性：`id` `class` `style` `data-*` `hidden` `title` `tabindex` `aria-*` | |

## HTML · B 中频

| 难度 | 标签 | 用途 |
|------|------|------|
| ★★ | `<small>` `<mark>` `<del>` `<ins>` `<sub>` `<sup>` `<abbr>` `<time>` `<kbd>` `<var>` `<samp>` | 行内语义 |
| ★★★ | `<picture>` `<source>` 响应式图 | |
| ★★★ | `<template>` `<slot>` | Web Components |
| ★★★ | `<canvas>` | 2D/WebGL |
| ★★★ | `<svg>` | 矢量 |
| ★★★ | `<aside>` `<address>` `<hgroup>` | 语义补充 |
| ★★★★ | `<object>` `<embed>` `<map>` `<area>` | 嵌入/热区 |
| ★★★★ | `<base>` | 基础 URL |

## HTML · C/D

| 难度 | 标签 | 说明 |
|------|------|------|
| ★★★ | MathML / 复杂 SVG | 专业内容 |
| ★★★★ | `<fencedframe>` 等实验 | 看兼容性 |
| ★ | 字符实体 `&lt;` `&gt;` `&amp;` `&nbsp;` | 必会转义 |

### HTML 文档骨架模板（S 级默写）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>页面标题</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header></header>
  <main>
    <h1>标题</h1>
    <p>段落 <a href="/">链接</a></p>
  </main>
  <footer></footer>
  <script src="app.js"></script>
</body>
</html>
```

### HTML 完整标签手册

## 1. HTML 完整参考手册（摘录）

> 本章涵盖 HTML5 全部 140+ 元素，按功能分组，附代码示例和最佳实践。

---

## 1.1 文档结构 (Main Root)

| 元素 | 描述 | 示例 |
|------|------|------|
| `<html>` | HTML 文档根元素，所有元素必须是其后代 | `<html lang="zh-CN">` |
| `<!DOCTYPE html>` | 声明文档类型为 HTML5 | 必须放在文件第一行 |

---

## 1.2 文档元数据 (Document Metadata)

| 元素 | 描述 | 关键属性 |
|------|------|----------|
| `<head>` | 包含文档元数据（标题、样式、脚本等） | — |
| `<title>` | 定义浏览器标签页标题 | 纯文本，不支持 HTML 标签 |
| `<meta>` | 元数据（字符集、视口、SEO等） | `charset`, `name`, `content`, `http-equiv` |
| `<link>` | 链接外部资源（CSS、图标等） | `rel`, `href`, `type`, `media`, `sizes` |
| `<style>` | 内嵌 CSS 样式 | `media`, `type` |
| `<base>` | 指定所有相对 URL 的基础 URL | `href`, `target` |

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="页面描述，SEO 关键">
  <meta name="keywords" content="HTML, CSS, 教程">
  <meta name="author" content="作者名">
  <meta name="theme-color" content="#4f46e5">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>我的网页</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="icon" href="favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href="apple-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preload" href="font.woff2" as="font" crossorigin>
  <base href="https://example.com/">
</head>
```

### `<meta>` 常用配置

```html
<!-- 字符集（必须放在前 1024 字节内） -->
<meta charset="UTF-8">

<!-- 视口（响应式必备） -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- SEO -->
<meta name="description" content="150字以内的页面描述">
<meta name="robots" content="index, follow">
<meta name="googlebot" content="noarchive">

<!-- Open Graph (社交分享) -->
<meta property="og:title" content="页面标题">
<meta property="og:description" content="分享描述">
<meta property="og:image" content="https://example.com/og-image.jpg">
<meta property="og:url" content="https://example.com/page">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="标题">

<!-- 暗色模式 -->
<meta name="color-scheme" content="light dark">
```

### `<link>` rel 值速查

| rel 值 | 用途 |
|--------|------|
| `stylesheet` | 链接 CSS 文件 |
| `icon` | 网站图标 (favicon) |
| `preload` | 提前加载关键资源 |
| `preconnect` | 提前建立连接 |
| `dns-prefetch` | 提前 DNS 解析 |
| `prefetch` | 预取未来可能需要的资源 |
| `canonical` | 指定页面的规范 URL |
| `alternate` | 替代版本（RSS、多语言等） |
| `modulepreload` | 预加载 ES 模块 |
| `manifest` | PWA manifest 文件 |

---

## 1.3 内容分区 (Content Sectioning)

| 元素 | 描述 | 使用场景 |
|------|------|----------|
| `<body>` | 文档的可见内容，每页仅一个 | 所有可见内容的容器 |
| `<header>` | 页面或区块的介绍性内容 | Logo、导航、搜索框、作者名 |
| `<footer>` | 页脚信息 | 版权、联系方式、相关链接 |
| `<main>` | 页面主导内容，每页仅一个 | 核心内容区域 |
| `<nav>` | 导航链接区域 | 菜单、目录、面包屑 |
| `<article>` | 独立可分发的内容单元 | 博客、新闻、产品卡片、评论 |
| `<section>` | 通用独立区块（必须有标题） | 章节、标签页内容 |
| `<aside>` | 与主内容间接相关的辅助内容 | 侧边栏、引用框、广告 |
| `<address>` | 个人/组织的联系方式 | 地址、电话、邮箱 |
| `<h1>-<h6>` | 六个层级的标题 | 文档大纲 |
| `<hgroup>` | 标题组（主标题+副标题） | 标题+tagline |
| `<search>` | 搜索/过滤表单区域 | 搜索框容器 |

```html
<body>
  <header>
    <h1>公司名称</h1>
    <nav aria-label="主导航">
      <ul>
        <li><a href="/">首页</a></li>
        <li><a href="/products">产品</a></li>
        <li><a href="/start">开始阅读</a></li>
      </ul>
    </nav>
    <search>
      <form role="search">
        <input type="search" name="q" placeholder="搜索...">
        <button type="submit">搜索</button>
      </form>
    </search>
  </header>

  <main>
    <article>
      <h2>文章标题</h2>
      <p>文章正文...</p>
      <section>
        <h3>第一节</h3>
        <p>内容...</p>
      </section>
    </article>
    <aside>
      <h3>相关文章</h3>
      <nav aria-label="相关链接">
        <ul><li><a href="#">链接</a></li></ul>
      </nav>
    </aside>
  </main>

  <footer>
    <address>联系：<a href="mailto:hi@example.com">hi@example.com</a></address>
    <p>&copy; 2026 公司名称</p>
  </footer>
</body>
```

### h1-h6 标题层级规则

- 每页只用一个 `<h1>`
- 不要跳过层级（h1→h3 是不对的）
- 不要用标题元素来做字号调整（用 CSS `font-size`）
- 标题形成文档大纲，对 SEO 和无障碍都很重要

---

## 1.4 文本内容 (Text Content)

| 元素 | 描述 | 默认呈现 |
|------|------|----------|
| `<p>` | 段落 | 块级，上下有边距 |
| `<div>` | 通用块级容器，无语义 | 块级，无样式 |
| `<blockquote>` | 块级引用 | 缩进显示，可用 `cite` 属性 |
| `<ol>` | 有序列表 | 数字编号 |
| `<ul>` | 无序列表 | 圆点符号 |
| `<li>` | 列表项（ol/ul/menu 的子元素） | — |
| `<dl>` / `<dt>` / `<dd>` | 描述列表（术语+定义） | `<dt>` 术语，`<dd>` 缩进 |
| `<hr>` | 主题分隔线 | 水平线 |
| `<pre>` | 预格式化文本（保留空格和换行） | 等宽字体 |
| `<figure>` / `<figcaption>` | 附带标题的独立内容（图、代码等） | — |
| `<menu>` | 语义化的无序列表 | 与 `<ul>` 渲染相同 |

### 列表示例

```html
<!-- 有序列表 -->
<ol>
  <li>第一步</li>
  <li>第二步</li>
  <li value="10">跳转到第10步</li>
</ol>

<!-- 无序列表 -->
<ul>
  <li>项目 A</li>
  <li>项目 B</li>
</ul>

<!-- 描述列表 -->
<dl>
  <dt>HTML</dt>
  <dd>超文本标记语言，定义网页结构</dd>
  <dt>CSS</dt>
  <dd>层叠样式表，控制网页外观</dd>
</dl>

<!-- 图文组合 -->
<figure>
  <img src="chart.png" alt="销售图表">
  <figcaption>图1：2024年季度销售数据</figcaption>
</figure>

<!-- 预格式化 -->
<pre><code>
function hello() {
  console.log("Hello World");
}
</code></pre>
```

### `<blockquote>` 示例

```html
<blockquote cite="https://example.com/source">
  <p>这是一段引用的文字。引用的来源可以通过 cite 属性指定。</p>
</blockquote>
<cite>— 来源作者</cite>
```

---

## 1.5 内联文本语义 (Inline Text Semantics)

| 元素 | 描述 | 默认呈现 |
|------|------|----------|
| `<a>` | 超链接 | 蓝色下划线 |
| `<strong>` | 重要/紧急内容 | 加粗 |
| `<em>` | 强调文本 | 斜体 |
| `<b>` | 引起注意的文本（无语义重要性） | 加粗 |
| `<i>` | 另类语气（术语、外语、思想等） | 斜体 |
| `<u>` | 非文本注释（拼写错误、中文专名等） | 下划线 |
| `<s>` | 不再正确/相关的内容 | 删除线 |
| `<small>` | 附属注释（版权、法律文本） | 小号字体 |
| `<mark>` | 高亮/标记文本 | 黄色背景 |
| `<code>` | 行内代码片段 | 等宽字体 |
| `<kbd>` | 键盘输入 | 等宽字体 |
| `<samp>` | 程序输出示例 | 等宽字体 |
| `<var>` | 数学/编程变量 | 斜体 |
| `<abbr>` | 缩写/首字母缩略词 | 可配合 `title` 显示全称 |
| `<cite>` | 创意作品标题（书、电影等） | 斜体 |
| `<dfn>` | 定义中的术语 | 斜体 |
| `<time>` | 日期/时间 | 可配合 `datetime` 属性 |
| `<span>` | 通用行内容器（无语义） | 无样式 |
| `<br>` | 换行 | — |
| `<wbr>` | 可选的换行位置 | — |
| `<bdi>` | 双向文本隔离 | 无样式 |
| `<bdo>` | 覆盖文本方向 | 无样式 |
| `<sub>` | 下标 | 缩小+下移 |
| `<sup>` | 上标 | 缩小+上移 |
| `<data>` | 机器可读的数据 | 配合 `value` 属性 |
| `<q>` | 短的行内引用 | 自动加引号 |
| `<ruby>` / `<rt>` / `<rp>` | 东亚字符注音 | 上方注音 |

```html
<!-- 超链接的各种用法 -->
<a href="https://example.com">普通链接</a>
<a href="mailto:hi@example.com">发送邮件</a>
<a href="tel:+8613800138000">拨打电话</a>
<a href="#section-2">跳转到页面内锚点</a>
<a href="file.pdf" download>下载 PDF</a>
<a href="https://example.com" target="_blank" rel="noopener noreferrer">新标签页打开</a>

<!-- 文本语义 -->
<p><strong>重要警告：</strong>此操作不可撤销。</p>
<p><em>真的</em>很好吃。</p>
<p>缩写：<abbr title="HyperText Markup Language">HTML</abbr></p>
<p>发布日期：<time datetime="2026-07-09">2026年7月9日</time></p>
<p>化学反应：H<sub>2</sub>O, E = mc<sup>2</sup></p>
<p>键盘快捷键：<kbd>Ctrl</kbd> + <kbd>C</kbd></p>
<p>代码：使用 <code>console.log()</code> 调试</p>
<p>这是一行很长的URL可能需要换行：https://example.com/<wbr>very/long/path/to/resource</p>
<p>价格：<s>¥199</s> <strong>¥99</strong></p>
<p>这是 <mark>高亮</mark> 的文本</p>

<!-- 双向文本 -->
<p><bdi>إيان</bdi>: 阿拉伯名字</p>
<p><bdo dir="rtl">这段文字从右向左显示</bdo></p>

<!-- 注音（Ruby） -->
<ruby>
  漢 <rt>かん</rt>
  字 <rt>じ</rt>
</ruby>
```

### `<a>` 元素关键属性

| 属性 | 说明 |
|------|------|
| `href` | 链接目标 URL |
| `target` | `_self`(默认) / `_blank` / `_parent` / `_top` |
| `download` | 下载链接（可指定文件名） |
| `rel` | `noopener` / `noreferrer` / `nofollow` / `noopener noreferrer` |
| `hreflang` | 目标语言提示 |
| `type` | 目标 MIME 类型提示 |
| `ping` | 点击时追踪的 URL 列表 |

---

## 1.6 图片与多媒体 (Image & Multimedia)

| 元素 | 描述 |
|------|------|
| `<img>` | 嵌入图片 |
| `<audio>` | 嵌入音频 |
| `<video>` | 嵌入视频 |
| `<track>` | 媒体元素的字幕/章节/元数据 |
| `<area>` | 图片映射的可点击区域 |
| `<map>` | 图片映射（与 `<area>` 配合） |

### `<img>` 关键属性

```html
<img
  src="photo.jpg"
  alt="一只猫在沙发上睡觉"
  width="800"
  height="600"
  loading="lazy"
  decoding="async"
  srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1200.jpg 1200w"
  sizes="(max-width: 600px) 100vw, 50vw"
  crossorigin="anonymous"
  fetchpriority="high"
>
```

| 属性 | 说明 |
|------|------|
| `src` | 图片 URL（必需） |
| `alt` | 替代文本（必需，装饰性图片用 `alt=""`） |
| `width` / `height` | 宽高（减少 Layout Shift） |
| `loading` | `lazy`(懒加载) / `eager`(立即加载) |
| `decoding` | `async` / `sync` / `auto` |
| `srcset` | 响应式图片候选 |
| `sizes` | 响应式尺寸条件 |
| `crossorigin` | 跨域 CORS 设置 |
| `fetchpriority` | `high` / `low` / `auto` 加载优先级 |
| `ismap` | 服务器端图片映射 |

### `<audio>` / `<video>` 示例

```html
<!-- 音频 -->
<audio controls autoplay muted loop preload="metadata">
  <source src="audio.mp3" type="audio/mpeg">
  <source src="audio.ogg" type="audio/ogg">
  <track kind="captions" src="captions.vtt" srclang="zh" label="中文">
  您的浏览器不支持 audio 元素。
</audio>

<!-- 视频 -->
<video controls width="720" poster="thumbnail.jpg" playsinline>
  <source src="video.mp4" type="video/mp4">
  <source src="video.webm" type="video/webm">
  <track kind="subtitles" src="subs.vtt" srclang="zh" label="中文字幕" default>
  您的浏览器不支持 video 元素。
</video>
```

### `<track>` kind 值

| kind | 说明 |
|------|------|
| `subtitles` | 对话字幕/翻译 |
| `captions` | 隐藏式字幕（含音效描述） |
| `descriptions` | 视频内容的文字描述 |
| `chapters` | 章节导航 |
| `metadata` | 供脚本使用的元数据 |

### 图片映射

```html
<img src="floorplan.jpg" alt="楼层平面图" usemap="#floorplan">
<map name="floorplan">
  <area shape="rect" coords="0,0,100,100" href="room1.html" alt="房间1">
  <area shape="circle" coords="200,150,50" href="room2.html" alt="房间2">
  <area shape="poly" coords="300,0,400,50,350,150" href="room3.html" alt="房间3">
</map>
```

---

## 1.7 嵌入内容 (Embedded Content)

| 元素 | 描述 |
|------|------|
| `<iframe>` | 内嵌另一个 HTML 页面 |
| `<embed>` | 嵌入外部内容（插件） |
| `<object>` | 嵌入外部资源（图片、PDF、插件等） |
| `<picture>` | 响应式图片容器 |
| `<source>` | 为 `<picture>/<audio>/<video>` 指定多个媒体源 |
| `<portal>` | 嵌入式预览（实验性） |

### `<iframe>` 关键属性

```html
<iframe
  src="https://example.com"
  width="600"
  height="400"
  allow="camera; microphone; fullscreen"
  sandbox="allow-scripts allow-same-origin"
  loading="lazy"
  referrerpolicy="no-referrer"
  title="描述"
></iframe>
```

| 属性 | 说明 |
|------|------|
| `src` | 嵌入页面的 URL |
| `srcdoc` | 内联 HTML（替代 src） |
| `sandbox` | 安全沙箱限制 |
| `allow` | 权限策略（camera, microphone 等） |
| `loading` | `lazy` / `eager` |
| `referrerpolicy` | 控制 Referer 头 |
| `title` | 无障碍描述（必需） |

### `<picture>` 响应式图片

```html
<picture>
  <!-- 基于格式 -->
  <source type="image/avif" srcset="photo.avif">
  <source type="image/webp" srcset="photo.webp">
  <!-- 基于屏幕宽度 -->
  <source media="(min-width: 1024px)" srcset="photo-large.jpg">
  <source media="(min-width: 640px)" srcset="photo-medium.jpg">
  <!-- 回退 -->
  <img src="photo-small.jpg" alt="描述">
</picture>
```

### `<object>` 嵌入

```html
<object data="document.pdf" type="application/pdf" width="100%" height="600px">
  <p>无法显示 PDF。<a href="document.pdf">下载</a></p>
</object>
```

### `<fencedframe>` — 隐私保护内嵌框架

与 `<iframe>` 类似但具有内置隐私保护：通信受限、无法通过脚本操纵、无法访问嵌入页面的 DOM。用于 Privacy Sandbox（Protected Audience API / Shared Storage API）。

```html
<fencedframe
  title="Advertisement for new product"
  width="640"
  height="320">
</fencedframe>

<script>
  // 通过 Protected Audience API 设置内容
  const frameConfig = await navigator.runAdAuction({
    resolveToConfig: true,
  });
  document.querySelector('fencedframe').config = frameConfig;
</script>
```

| 属性 | 说明 |
|------|------|
| `width` | 宽度（CSS 像素，默认 300） |
| `height` | 高度（CSS 像素，默认 150） |
| `allow` | Permissions Policy（仅隐私沙箱相关功能） |
| `title` | 无障碍标签（必需） |

---

## 1.8 表格 (Table Content)

| 元素 | 描述 |
|------|------|
| `<table>` | 表格容器 |
| `<caption>` | 表格标题 |
| `<colgroup>` / `<col>` | 列组/列定义 |
| `<thead>` | 表头 |
| `<tbody>` | 表体 |
| `<tfoot>` | 表脚 |
| `<tr>` | 表格行 |
| `<th>` | 表头单元格 |
| `<td>` | 数据单元格 |

```html
<table>
  <caption>2024年季度销售数据</caption>
  <colgroup>
    <col style="background:#f0f0f0">
    <col span="2" style="background:#e8f0fe">
    <col style="background:#e8f5e9">
  </colgroup>
  <thead>
    <tr>
      <th scope="col">产品</th>
      <th scope="col">Q1</th>
      <th scope="col">Q2</th>
      <th scope="col">Q3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">产品 A</th>
      <td>$12,000</td>
      <td>$15,000</td>
      <td>$18,000</td>
    </tr>
    <tr>
      <th scope="row">产品 B</th>
      <td>$8,000</td>
      <td>$9,500</td>
      <td>$11,000</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <th scope="row">合计</th>
      <td>$20,000</td>
      <td>$24,500</td>
      <td>$29,000</td>
    </tr>
  </tfoot>
</table>
```

### `<th>` scope 属性

| 值 | 说明 |
|----|------|
| `col` | 表头适用于列 |
| `row` | 表头适用于行 |
| `colgroup` | 表头适用于列组 |
| `rowgroup` | 表头适用于行组 |

### `<td>` / `<th>` 合并单元格

```html
<td colspan="2">跨两列</td>
<td rowspan="3">跨三行</td>
```

---

## 1.9 表单 (Forms) — 完整参考

### 表单元素总览

| 元素 | 描述 |
|------|------|
| `<form>` | 表单容器 |
| `<input>` | 输入控件（22种类型） |
| `<textarea>` | 多行文本输入 |
| `<select>` / `<option>` / `<optgroup>` | 下拉选择 |
| `<button>` | 按钮 |
| `<label>` | 控件标签 |
| `<fieldset>` / `<legend>` | 控件分组 |
| `<datalist>` | 输入建议列表 |
| `<output>` | 计算结果输出 |
| `<progress>` | 进度条 |
| `<meter>` | 度量/仪表 |
| `<selectedcontent>` | 显示 select 当前选中内容（实验性） |

### `<form>` 属性

```html
<form
  action="/submit"
  method="post"
  enctype="multipart/form-data"
  autocomplete="on"
  novalidate
  target="_self"
  accept-charset="UTF-8"
>
```

| 属性 | 说明 |
|------|------|
| `action` | 提交 URL |
| `method` | `get` / `post` / `dialog` |
| `enctype` | `application/x-www-form-urlencoded`(默认) / `multipart/form-data`(文件上传) / `text/plain` |
| `autocomplete` | `on`(默认) / `off` |
| `novalidate` | 禁用原生表单验证 |
| `target` | `_self` / `_blank` / `_parent` / `_top` |

### `<input>` type 全部 22 种

| type | 描述 | 示例 |
|------|------|------|
| `text` | 单行文本（默认） | `<input type="text">` |
| `password` | 密码框（遮蔽字符） | `<input type="password">` |
| `email` | 邮箱地址 | `<input type="email">` |
| `url` | URL 地址 | `<input type="url">` |
| `tel` | 电话号码 | `<input type="tel">` |
| `number` | 数字（带步进器） | `<input type="number">` |
| `range` | 滑块 | `<input type="range" min="0" max="100">` |
| `search` | 搜索框 | `<input type="search">` |
| `date` | 日期选择器 | `<input type="date">` |
| `time` | 时间选择器 | `<input type="time">` |
| `datetime-local` | 本地日期时间 | `<input type="datetime-local">` |
| `month` | 月份选择器 | `<input type="month">` |
| `week` | 周选择器 | `<input type="week">` |
| `color` | 颜色选择器 | `<input type="color">` |
| `checkbox` | 复选框 | `<input type="checkbox">` |
| `radio` | 单选框 | `<input type="radio" name="group1">` |
| `file` | 文件上传 | `<input type="file" accept="image/*">` |
| `hidden` | 隐藏字段 | `<input type="hidden" name="token">` |
| `image` | 图片提交按钮 | `<input type="image" src="submit.png" alt="提交">` |
| `submit` | 提交按钮 | `<input type="submit" value="提交">` |
| `reset` | 重置按钮（不推荐） | `<input type="reset" value="重置">` |
| `button` | 普通按钮 | `<input type="button" value="点击">` |

### `<input>` 关键属性

```html
<input
  type="text"
  name="username"
  id="username"
  value="初始值"
  placeholder="请输入用户名"
  required
  readonly
  disabled
  minlength="3"
  maxlength="20"
  pattern="[a-zA-Z0-9]+"
  autocomplete="username"
  autofocus
  size="30"
  list="suggestions"
  aria-label="用户名"
>
<datalist id="suggestions">
  <option value="admin">
  <option value="user1">
</datalist>
```

| 属性 | 适用的 type | 说明 |
|------|-----------|------|
| `name` | 全部 | 提交时的字段名（必需） |
| `value` | 全部 | 初始值 |
| `placeholder` | text/search/url/tel/email/password/number | 占位提示文字 |
| `required` | 除 hidden/range/color/button 外 | 必填 |
| `readonly` | 大多数 | 只读（会提交） |
| `disabled` | 全部 | 禁用（不提交） |
| `min` / `max` | number/range/date/time 等 | 最小/最大值 |
| `minlength` / `maxlength` | text 相关 | 最小/最大字符数 |
| `pattern` | text 相关 | 正则验证 |
| `step` | number/range/date 等 | 步进值 |
| `multiple` | email/file | 多值/多文件 |
| `accept` | file | 接受的文件类型 |
| `autocomplete` | 大多数 | 自动填充提示 |
| `autofocus` | 除 hidden | 页面加载时自动聚焦 |
| `list` | text/date/number/range 等 | 关联 `<datalist>` |
| `checked` | checkbox/radio | 默认选中 |
| `capture` | file | 直接调用摄像头/麦克风 |
| `size` | text/search/url/tel/email/password | 可见字符数 |
| `dirname` | text/search 等 | 提交时附带文本方向 |

### `<select>` / `<option>` / `<optgroup>`

```html
<select name="country" id="country" required multiple size="4">
  <optgroup label="亚洲">
    <option value="cn" selected>中国</option>
    <option value="jp">日本</option>
    <option value="kr">韩国</option>
  </optgroup>
  <optgroup label="欧洲">
    <option value="uk">英国</option>
    <option value="fr">法国</option>
  </optgroup>
</select>
```

### `<textarea>`

```html
<textarea
  name="comment"
  rows="5"
  cols="40"
  maxlength="500"
  placeholder="写下你的评论..."
  wrap="soft"
></textarea>
```

| 属性 | 说明 |
|------|------|
| `rows` | 可见行数 |
| `cols` | 可见列数（字符宽度） |
| `maxlength` / `minlength` | 最大/最小字符数 |
| `wrap` | `soft`(提交时不换行) / `hard`(提交时换行) |
| `placeholder` | 占位文字 |
| `readonly` | 只读 |
| `required` | 必填 |
| `spellcheck` | 拼写检查 |

### `<button>` 类型

```html
<button type="submit">提交表单</button>
<button type="reset">重置</button>
<button type="button">普通按钮</button>
```

### `<progress>` / `<meter>`

```html
<!-- 进度条 -->
<progress value="70" max="100">70%</progress>

<!-- 度量/仪表 -->
<meter value="0.6" min="0" max="1" low="0.3" high="0.8" optimum="0.5">60%</meter>
```

### `<output>`

```html
<form oninput="result.value=parseInt(a.value)+parseInt(b.value)">
  <input type="number" id="a" value="10"> +
  <input type="number" id="b" value="20"> =
  <output name="result" for="a b">30</output>
</form>
```

### `<selectedcontent>` — 自定义 Select 选中内容显示

用于在 `<select>` 内自定义显示当前选中 `<option>` 的内容。放置在 `<button>` 内作为 `<select>` 的第一个子元素。

```html
<select>
  <button>
    <selectedcontent></selectedcontent>
  </button>
  <option value="apple">
    <img src="apple.png" alt="">
    Apple
  </option>
  <option value="banana">
    <img src="banana.png" alt="">
    Banana
  </option>
</select>
```

```css
/* 隐藏选中状态下按钮内的图片（下拉菜单里仍可见） */
selectedcontent img {
  display: none;
}
```

| 关键特性 | 说明 |
|----------|------|
| 父元素 | 只能是 `<button>` 且该 `<button>` 必须是 `<select>` 的第一个子元素 |
| 内容 | 自动克隆当前选中 `<option>` 的内容（使用 `cloneNode()`） |
| Inert 特性 | 默认不可交互、不可聚焦 |
| 动态更新 | 只在 selected option 改变时更新；JavaScript 框架中动态修改 `<option>` 内容后需手动更新 |
| 浏览器兼容 | 实验性，Chrome 123+，Firefox 待定，Safari 待定 |

---

## 1.10 交互元素 (Interactive Elements)

| 元素 | 描述 |
|------|------|
| `<details>` / `<summary>` | 可折叠的详情组件（手风琴） |
| `<dialog>` | 对话框/模态框 |
| `<geolocation>` | 地理位置共享控件（实验性） |

### `<details>` / `<summary>`

```html
<details open>
  <summary>点击展开/收起</summary>
  <p>这是隐藏的内容，summary 被点击后会显示。</p>
  <p>可以通过 open 属性默认展开。</p>
</details>

<!-- 手风琴效果（同一 name 组中只能打开一个） -->
<details name="faq">
  <summary>什么是 HTML？</summary>
  <p>HTML 是超文本标记语言...</p>
</details>
<details name="faq">
  <summary>什么是 CSS？</summary>
  <p>CSS 是层叠样式表...</p>
</details>
```

### `<dialog>` 模态框

```html
<dialog id="myDialog">
  <h2>标题</h2>
  <p>对话框内容...</p>
  <button onclick="this.closest('dialog').close()">关闭</button>
</dialog>

<script>
  // 打开对话框
  document.getElementById('myDialog').showModal();

  // 以非模态方式打开
  // document.getElementById('myDialog').show();

  // 关闭
  // document.getElementById('myDialog').close();
</script>
```

---

## 1.11 脚本与图形 (Scripting & Graphics)

| 元素 | 描述 |
|------|------|
| `<script>` | 嵌入或引用 JavaScript 代码 |
| `<noscript>` | 脚本不可用时的回退内容 |
| `<canvas>` | 绘图画布（Canvas API / WebGL） |
| `<template>` | 可复用的 HTML 模板（不立即渲染） |
| `<slot>` | Web Component 的插槽（占位符） |

### `<script>` 属性

```html
<!-- 外部脚本 -->
<script src="app.js" defer></script>

<!-- 内联脚本 -->
<script type="module">
  import { myFunc } from './module.js';
  myFunc();
</script>

<!-- JSON 数据块 -->
<script type="application/json" id="data">
  {"name": "John", "age": 30}
</script>
```

| 属性 | 说明 |
|------|------|
| `src` | 外部脚本 URL |
| `type` | `module` / `importmap` / `application/json` 等 |
| `async` | 异步下载，下载完立即执行（不保证顺序） |
| `defer` | 异步下载，HTML 解析完后按顺序执行 |
| `nomodule` | 不支持 ES 模块的浏览器才执行 |
| `crossorigin` | 跨域 CORS 设置 |
| `integrity` | SRI 完整性校验 |
| `referrerpolicy` | 控制 Referer 头 |

**async vs defer 对比**：

| | async | defer |
|---|---|---|
| 下载时机 | 异步，不阻塞 HTML 解析 | 异步，不阻塞 HTML 解析 |
| 执行时机 | **下载完立即执行** | **HTML 解析完成后执行** |
| 执行顺序 | 不保证（谁先下完谁先执行） | 保证按文档顺序执行 |
| 适用场景 | 独立脚本（统计、广告） | 依赖 DOM 的脚本 |

### `<canvas>` 基础

```html
<canvas id="myCanvas" width="400" height="300">
  您的浏览器不支持 Canvas。
</canvas>

<script>
  const canvas = document.getElementById('myCanvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4f46e5';
  ctx.fillRect(50, 50, 100, 80);
  ctx.font = '24px sans-serif';
  ctx.fillText('Hello Canvas!', 200, 120);
</script>
```

### `<template>` + `<slot>`

```html
<!-- 定义模板 -->
<template id="card-template">
  <style>
    .card { border: 1px solid #ccc; padding: 1rem; border-radius: 8px; }
  </style>
  <div class="card">
    <h3><slot name="title">默认标题</slot></h3>
    <p><slot>默认内容</slot></p>
  </div>
</template>

<script>
  class MyCard extends HTMLElement {
    constructor() {
      super();
      const template = document.getElementById('card-template');
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(template.content.cloneNode(true));
    }
  }
  customElements.define('my-card', MyCard);
</script>

<!-- 使用 -->
<my-card>
  <span slot="title">我的卡片</span>
  <span>卡片内容</span>
</my-card>
```

---

## 1.12 SVG 与 Math

```html
<!-- SVG 内联 -->
<svg width="100" height="100" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="#4f46e5" />
  <text x="50" y="55" text-anchor="middle" fill="white" font-size="20">SVG</text>
</svg>

<!-- MathML 内联 -->
<math>
  <mrow>
    <msup><mi>a</mi><mn>2</mn></msup>
    <mo>+</mo>
    <msup><mi>b</mi><mn>2</mn></msup>
    <mo>=</mo>
    <msup><mi>c</mi><mn>2</mn></msup>
  </mrow>
</math>
```

---

## 1.13 编辑标记 (Demarcating Edits)

| 元素 | 描述 |
|------|------|
| `<del>` | 已删除的文本（通常显示删除线） |
| `<ins>` | 已插入的文本（通常显示下划线） |

```html
<p>这次发布包含了 <del>三个</del> <ins>四个</ins> 新功能。</p>
<del cite="https://example.com/why" datetime="2026-07-01">
  <p>这段内容已被删除</p>
</del>
```

---

## 1.14 全局属性 (Global Attributes)

以下属性可用于**所有 HTML 元素**：

| 属性 | 说明 | 示例 |
|------|------|------|
| `id` | 唯一标识符（文档内唯一） | `id="header"` |
| `class` | 空格分隔的 CSS 类名 | `class="btn primary"` |
| `style` | 内联 CSS 样式 | `style="color: red"` |
| `title` | 工具提示文本 | `title="点击查看更多"` |
| `lang` | 元素语言（BCP 47 标签） | `lang="zh-CN"` |
| `dir` | 文本方向 | `ltr` / `rtl` / `auto` |
| `hidden` | 隐藏元素 | `hidden` (布尔属性) |
| `tabindex` | Tab 键导航顺序 | `0` / `-1` / 正整数 |
| `accesskey` | 键盘快捷键 | `accesskey="s"` |
| `autocapitalize` | 自动大写 | `none` / `sentences` / `words` / `characters` |
| `autofocus` | 页面加载时自动聚焦 | `autofocus` |
| `contenteditable` | 内容可编辑 | `true` / `false` / `plaintext-only` |
| `data-*` | 自定义数据属性 | `data-user-id="123"` |
| `draggable` | 可拖拽 | `true` / `false` |
| `enterkeyhint` | 虚拟键盘 Enter 键样式 | `done` / `go` / `next` / `search` / `send` |
| `inputmode` | 虚拟键盘类型提示 | `text` / `numeric` / `decimal` / `tel` / `url` / `email` |
| `spellcheck` | 拼写检查 | `true` / `false` |
| `translate` | 是否翻译 | `yes` / `no` |
| `role` | ARIA 角色 | `role="navigation"` |
| `aria-*` | ARIA 无障碍属性 | `aria-label="关闭"` |
| `slot` | Shadow DOM 插槽名 | `slot="title"` |
| `part` | Shadow DOM 部件名 | `part="button"` |
| `inert` | 忽略用户输入事件 | `inert` |
| `popover` | 声明为 Popover 元素 | `popover` / `popover="auto"` / `popover="manual"` |
| `nonce` | CSP 随机数 | `nonce="random123"` |
| `itemscope` / `itemtype` / `itemprop` | 微数据 (Microdata) | `itemscope itemtype="https://schema.org/Person"` |

### 常用 data-* 示例

```html
<!-- 设置 -->
<div data-user-id="123" data-role="admin" data-created="2026-07-09">
  用户信息
</div>

<script>
  // JavaScript 读取
  const el = document.querySelector('div');
  console.log(el.dataset.userId);      // "123"
  console.log(el.dataset.role);        // "admin"
  el.dataset.lastLogin = Date.now();   // 设置新值
</script>
```

---

## 1.15 字符实体 (Character Entities)

| 字符 | 实体 | 说明 |
|------|------|------|
| `<` | `&lt;` | 小于号 |
| `>` | `&gt;` | 大于号 |
| `&` | `&amp;` | 与号 |
| `"` | `&quot;` | 双引号 |
| `'` | `&apos;` | 单引号 |
| ` ` | `&nbsp;` | 不换行空格 |
| `©` | `&copy;` | 版权符号 |
| `®` | `&reg;` | 注册商标 |
| `™` | `&trade;` | 商标 |
| `—` | `&mdash;` | 长破折号 |
| `–` | `&ndash;` | 短破折号 |
| `…` | `&hellip;` | 省略号 |

---

## 1.17 实验性元素 (Experimental — 浏览器支持有限)

这些元素尚未被所有浏览器广泛支持，但在未来可能成为标准。

| 元素 | 状态 | 描述 |
|------|------|------|
| `<fencedframe>` | 实验性 | 隐私保护内嵌框架（Chrome + Edge 支持） |
| `<selectedcontent>` | 实验性 | 自定义 Select 选中内容显示（Chrome 123+） |
| `<geolocation>` | 实验性 | 地理位置共享交互控件 |
| `<model>` | 提案中 | 3D 模型嵌入元素（非常早期，浏览器均不支持） |
| `<portal>` | 已移除 | 页面预览/预加载（曾被 Chrome 支持，已从规范中移除） |
| `<command>` | 已废弃 | 曾用于定义命令（从未广泛实现） |

### `<geolocation>`

创建让用户共享地理位置的交互控件：

```html
<geolocation>
  <button type="button">Share My Location</button>
</geolocation>
```

### `<model>` — 3D 模型

旨在让浏览器原生嵌入和渲染 3D 模型，类似 `<img>` 嵌入图片：

```html
<!-- 提案中的语法（尚未在任何浏览器中实现） -->
<model src="car.glb" width="400" height="300" auto-rotate></model>
```

替代方案：在 `<model>` 广泛支持前，使用 `<model-viewer>` Web Component：

```html
<script type="module" src="https://unpkg.com/@google/model-viewer"></script>
<model-viewer src="car.glb" auto-rotate camera-controls></model-viewer>
```

### `<portal>` — 页面预览（已弃用）

曾是 Chrome 的实验性功能，用于无缝页面预加载和过渡：

```html
<!-- 已从 HTML 规范中移除，不再推荐使用 -->
<portal src="https://example.com/page2"></portal>
```

---

## 1.18 已废弃元素 (Obsolete — 不要使用)

| 废弃元素 | 替代方案 |
|----------|----------|
| `<acronym>` | `<abbr>` |
| `<applet>` | `<object>` |
| `<basefont>` | CSS `font` 属性 |
| `<big>` | CSS `font-size` |
| `<center>` | CSS `text-align: center` |
| `<dir>` | `<ul>` |
| `<font>` | CSS `font-family`, `color` 等 |
| `<frame>` / `<frameset>` | `<iframe>` |
| `<marquee>` | CSS 动画 |
| `<nobr>` | CSS `white-space: nowrap` |
| `<strike>` | `<s>` 或 `<del>` |
| `<tt>` | `<code>` 或 CSS `font-family: monospace` |
| `<xmp>` | `<pre>` + `<code>` |

---

## 1.19 无障碍核心原则

1. **使用正确的语义元素** — `<button>` 替代 `<div onclick="...">`
2. **所有 `<img>` 必须有 `alt`** — 装饰性图片用 `alt=""`
3. **表单必须 `<label for="...">`** — 或用 `<label>` 包裹控件
4. **表格用 `<th>` + `scope`** — 标明表头与数据的关系
5. **有意义的链接文本** — 避免 "点击这里"、"了解更多"
6. **保留 `:focus-visible` 样式** — 键盘用户依赖焦点指示
7. **颜色对比度 ≥ 4.5:1** — WCAG AA 标准
8. **支持键盘导航** — 使用原生交互元素即可获得

### Skip Link

```html
<body>
  <a href="#main-content" class="skip-link">跳转到主内容</a>
  <nav>...</nav>
  <main id="main-content">...</main>
</body>
```

```css
.skip-link {
  position: absolute;
  top: -100%;
}
.skip-link:focus {
  top: 0;
}
```

### tabindex 使用

| 值 | 含义 |
|----|------|
| `0` | 加入 Tab 导航顺序 |
| `-1` | 可被 JS 程序化聚焦，但 Tab 跳过 |
| `1+` | **不推荐**（自定义顺序破坏体验） |

