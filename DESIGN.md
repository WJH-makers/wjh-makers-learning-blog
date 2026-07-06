# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-07-06
- Primary product surfaces: `/`, `/posts`, `/tags`, `/write`, `/rss.xml`
- Evidence reviewed:
  - `app/globals.css`：Newsprint/Gazette 视觉系统、零圆角、强网格、衬线标题、44px 按钮。
  - `app/layout.tsx`：全站导航与报纸栏。
  - `app/write/page.tsx`：Server Action 发布入口、数据库状态提示。
  - `app/write/WriteEditorClientImpl.tsx`：BlockNote 写作台、本地草稿、Markdown 输出。
  - `README.md`：技术栈、部署、MongoDB 写入链路。

## Brand
- Personality: 工程报纸、克制、高密度但不杂乱，像“个人学习日报编辑台”。
- Trust signals: 明确发布状态、数据库连接状态、可验证草稿时间、发布前确认。
- Avoid: 复杂 CMS 感、花哨渐变、大面积圆角卡片、过多按钮和长说明。

## Product goals
- Goals:
  - 每天能快速写一张可复盘的知识卡片。
  - 发布链路保持 Next.js Server Action → MongoDB Atlas。
  - 让写作先聚焦标题、证据、下一步，再处理发布。
- Non-goals:
  - 不做 AI 润色、多人协作、用户系统、图片库、复杂版本历史。
  - 不改变数据库结构和已发布 Markdown 渲染。
- Success signals:
  - 首屏能立即开始写标题和正文。
  - 草稿保存/恢复/清空路径清晰。
  - 发布前能确认会公开到首页、文章、标签、RSS。

## Personas and jobs
- Primary personas: 博客作者本人。
- User jobs:
  - 记录今天真正掌握的概念。
  - 保留命令、代码、报错、验证证据。
  - 发布到公开博客并沉淀标签。
- Key contexts of use: 桌面浏览器为主，移动端可临时编辑和发布。

## Information architecture
- Primary navigation: 首页、文章、标签、写心得、GitHub。
- Core routes/screens:
  - `/write`：私用写作入口。
  - `/posts`、`/tags`：发布后的公共归档。
- Content hierarchy:
  - `/write` 优先级：标题 → 摘要 → 日期/标签/密钥 → 正文 → 发布/草稿工具。

## Design principles
- Principle 1: 写作中心化。辅助信息默认短、可折叠，不抢编辑器焦点。
- Principle 2: 发布安全明确。任何公开发布前必须有 token 和确认。
- Tradeoffs: 保留 Gazette 强风格，但降低侧栏密度，让编辑器更像主画布。

## Visual language
- Color: 黑白纸张底色为主，红色只做强调/错误。
- Typography: Playfair Display 做标题，Lora 做正文，JetBrains Mono 做标签、状态、按钮。
- Spacing/layout rhythm: 强边框、窄缝隙、编辑器大画布、侧栏轻工具。
- Shape/radius/elevation: 全站零圆角；少量硬阴影用于层级。
- Motion: 仅保留轻量 hover/focus；尊重 reduced motion。
- Imagery/iconography: 当前不引入图标，避免装饰噪音。

## Components
- Existing components to reuse: `.button`、`.page-title`、`.db-status`、`.editor-form`、`.editor-note`、`.form-error`。
- New/changed components:
  - `write-command`：写作台标题和状态胶囊。
  - `title-field`：大标题输入。
  - `publish-bar`：sticky 发布动作栏。
  - `tips-panel`：可折叠技巧/预览抽屉。
- Variants and states: saved/unsaved、loading、bad token、disabled restore、publish confirm。
- Token/component ownership: CSS 变量在 `app/globals.css`，不新增设计系统依赖。

## Accessibility
- Target standard: WCAG 2.2 AA 取向。
- Keyboard/focus behavior: 所有输入、按钮、链接保留强焦点态；按钮不低于 44px，侧栏小按钮不低于 38px。
- Contrast/readability: 黑白主对比，灰色只用于辅助文案。
- Screen-reader semantics: 表单字段保留 label，编辑区和侧栏有 aria-label。
- Reduced motion and sensory considerations: 不依赖动画表达状态。

## Responsive behavior
- Supported breakpoints/devices: 桌面优先，`max-width: 860px` 单列。
- Layout adaptations: 桌面两栏；移动端工具栏下移成单列，编辑器保持完整宽度。
- Touch/hover differences: 触控目标足够大；hover 仅作增强。

## Interaction states
- Loading: 客户端 BlockNote 用 loading boundary，避免 SSR `window` 错误。
- Empty: 默认知识卡片模板防空白。
- Error: `form-error` 显示 token/发布错误。
- Success: 发布后重定向到新文章页。
- Disabled: 无本地草稿时禁用恢复按钮。
- Offline/slow network: 草稿本地保存，不依赖网络；发布仍需要在线。

## Content voice
- Tone: 短句、行动导向、工程复盘口吻。
- Terminology: 使用“知识卡片”“草稿”“发布”“验证”“下一步”。
- Microcopy rules: 先说明影响，再给动作；避免大段解释。

## Implementation constraints
- Framework/styling system: Next.js 16 App Router、React 19、全局 CSS。
- Design-token constraints: 使用现有 CSS 变量；不引入 Tailwind/UI 组件库。
- Performance constraints: BlockNote 只在客户端动态加载；服务端保持发布链路轻量。
- Compatibility constraints: MongoDB collection、slug、RSS、sitemap、首页刷新逻辑不变。
- Test/screenshot expectations: 每次 UI 改动至少跑 typecheck、build、`/write` 客户端加载烟测。

## Open questions
- [ ] 是否需要一个“极简专注模式”隐藏导航和侧栏？影响：进一步提升写作沉浸感。
- [ ] 是否需要为 `/write` 加二级密码入口或路径隐藏？影响：减少访客看到后台入口的机会。
