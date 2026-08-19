# Cloudflare 安全配置指南

> 本文档基于 **2026-08-14 对生产环境 `curl -sI https://wwjjhh.online` 的实测结果**编写。
> 代码层修复已全部完成并提交（commit `0c85061`），**剩余问题全部位于 Cloudflare 边缘层，只能在 Dashboard 修改。**

---

## 一、实测：源站声明 vs 边缘实际返回

下表每一行都来自本轮实测，不是推断：

| 响应头 | 代码中的声明（next.config.ts） | 生产实际返回 | 状态 |
|--------|------------------------------|-------------|------|
| `Content-Security-Policy` | 完整白名单策略 | 完全一致 | ✅ 生效 |
| `X-Content-Type-Options` | `nosniff` | `nosniff` | ✅ 生效 |
| `X-Powered-By` | `poweredByHeader: false` | 不存在 | ✅ 生效 |
| `Server` | 无（曾在 proxy.ts `delete`，因无效已移除） | **`cloudflare`** | ❌ 只能在边缘处理 |
| `X-Frame-Options` | `DENY` | **`SAMEORIGIN`** | ❌ 被边缘改写、强度降低 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | **`same-origin`** | ❌ 被边缘改写 |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | **`max-age=31536000; includeSubDomains`** | ❌ 有效期减半、`preload` 被移除 |

### 根因

Cloudflare 的 **Managed Transform「Add security headers」** 在边缘层重写了源站响应头。
`Server` 头是响应离开源站**之后**由 Cloudflare 边缘添加的，因此源站侧
`response.headers.delete("Server")` 对它无效 —— 这不是代码缺陷，是架构层级决定的。
（该无效代码已从 `proxy.ts` 移除，见第四章。）

> ⚠️ 这意味着：**仅靠改代码无法修复上表中的 4 项。** 必须进 Dashboard。

---

## 二、必须在 Dashboard 执行的操作（按优先级）

### P0 —— 关闭 Managed Transform「Add security headers」

这是**根因**，一步解决 `X-Frame-Options`、`Referrer-Policy`、`HSTS` 三项被改写的问题。

**路径**：Dashboard → 选择 `wwjjhh.online` → Rules → Transform Rules → **Managed Transforms**

**操作**：找到 `Add security headers`，将其**关闭（Disable）**

**关闭后预期**：源站声明的头直接透传，即
- `X-Frame-Options: DENY`（强于 SAMEORIGIN，禁止任何域嵌入）
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

**为什么该关**：源站 `next.config.ts` 已完整声明全部安全头，且强度**严格高于**边缘注入的版本。
边缘那套还会注入已废弃的 `Expect-CT`。保留它只会让防护降级。

---

### P1 —— 移除 `Server` 响应头

**路径**：Dashboard → Rules → Transform Rules → **Modify Response Header** → Create rule

**规则配置**：
- Rule name：`Remove Server Header`
- When incoming requests match：`All incoming requests`
- Then：
  - Operation：`Remove`
  - Header name：`Server`

**对应漏洞**：扫描报告「服务器版本信息泄漏」（信息级，插件 ID 455）

> 注：此项**只能**在边缘完成，代码层无解（见上文根因）。

---

### P2 —— robots.txt 访问频率限制

**路径**：Dashboard → Security → WAF → Rate Limiting Rules

**规则配置**：
- Rule name：`Rate Limit Robots.txt`
- When incoming requests match：Field `URI Path` / Operator `equals` / Value `/robots.txt`
- With the same characteristics：`IP Address`
- Then：Action `Block`，Duration `10 minutes`，When rate exceeds `10 requests per 1 minute`

**对应漏洞**：扫描报告「robots.txt 暴露网站结构」（中危，插件 ID 74）

---

## 三、robots.txt 现状（实测，无需改动）

**不要创建 `public/robots.txt`。** 项目已有 `app/robots.ts` 动态路由，
静态文件会**覆盖**它并导致保护规则减少。

实测 `curl -s https://wwjjhh.online/robots.txt` 的结果：Cloudflare 将其托管的
AI 爬虫规则（Amazonbot / GPTBot / ClaudeBot / CCBot 等 `Disallow: /`）**前置**，
站点自身规则完整保留在后：

```
Disallow: /write
Disallow: /monitor
Disallow: /api
Disallow: /agent
Disallow: /random
Disallow: /llms.txt
```

两者叠加生效，动态路由工作正常。

---

## 四、代码层修复的真实状态（含对 `0c85061` 的更正）

`0c85061` 的提交信息声称完成了三项修复。**逐项复核后，其中两项并未生效，另有一项
长期存在的功能性缺陷被这次复核暴露出来。**下表是复核结论，均有本轮命令输出支撑：

| `0c85061` 的声称 | 复核结论 |
|---|---|
| 在 proxy.ts 中配置 Cookie SameSite | ❌ **死代码，一个 Cookie 都没改到** |
| 在 proxy.ts 中移除 `Server` / `X-Powered-By` | ⚠️ `X-Powered-By` 本就由 `poweredByHeader:false` 关闭；`Server` 由边缘添加，删不掉（见 P1） |
| `/write` POST 鉴权 | ❌ **该逻辑早于本次提交，且一直把合法管理员拦成 404** |

### 4.1 SameSite「修复」为何无效

原代码遍历 `NextResponse.next()` 自身的 Cookie 集合：

```typescript
const cookies = response.cookies.getAll();   // 该集合恒为空
cookies.forEach((cookie) => { /* 永不执行 */ });
```

`NextResponse.next()` 刚创建时不携带任何 Cookie，服务端写入的 Cookie 也不流经这里，
因此 `forEach` 一次都不执行。这段代码已删除。

**本站 Cookie 的 SameSite 本来就是配好的**，位置在写入处而非中间件：

- `app/api/auth/route.ts:39-45`
- `app/write/page.tsx:77-83`

两处均为 `httpOnly: true` + `sameSite: "lax"` + 生产环境 `secure: true`。
本轮实测下发的响应头可直接佐证：

```
set-cookie: blog_admin_token=v2.r2qk8o8r...; Path=/; Max-Age=2592000; HttpOnly; SameSite=lax
```

> 因此扫描报告的「Cookie 未配置 SameSite」中危项，对本站自有 Cookie **不成立**。
> 该项命中的是 `/cdn-cgi/challenge-platform/` 下由 Cloudflare 管理的 challenge cookie，
> 不由本站代码控制。整改回函中不应表述为「本站后台登录 Cookie 存在 SameSite 漏洞」。

### 4.2 已修复：`POST /write` 被全量拦成 404（功能性缺陷）

这是本轮复核发现的**唯一真实缺陷**，扫描报告未覆盖。

`proxy.ts` 拿 Cookie 值与 `BLOG_ADMIN_TOKEN` **原文**比较：

```typescript
const cookieToken = request.cookies.get("blog_admin_token")?.value?.trim();
if (!cookieToken || !safeCompare(cookieToken, expected)) {   // ← 比较对象错误
  return new NextResponse("Not Found", { status: 404 });
}
```

但实际写入 Cookie 的是 `blogSessionToken()` 的 HMAC 派生值（`lib/blog-auth-token.ts:11`），
形如 `v2.<base64url>`，**永远不等于**原文。本轮实测取证：

```
cookie   = v2.r2qk8o8rN4KeQcQk_27u1sjpfbPLlc4npp5rvwMMNWs   ← /api/auth 真实下发
expected = test-token-verify-0814                            ← BLOG_ADMIN_TOKEN 原文
safeCompare 结果 = false  →  合法管理员被判定为 404 Not Found
```

后果：登录成功后**发布与删除文章全部失效**；禁用 JS 的表单降级路径（无 Cookie）
同样被 `!cookieToken` 拦死。两条路径均不可用。

**修复方式**：Edge Runtime 用 Web Crypto 重算同一个 HMAC，与 `node:crypto` 版本逐字节等价；
且区分「带了无效 Cookie」（拦截）与「没带 Cookie」（放行给 Server Action 权威鉴权，
保留无 JS 降级路径）。

修复后本地实测四种路径：

| 场景 | 结果 |
|---|---|
| `POST /api/auth` 正确 token | `200` + 下发派生 Cookie |
| 合法 Cookie `POST /write` | **`200`（放行）** |
| 伪造 Cookie `POST /write` | **`404`（拦截）** |
| 无 Cookie `POST /write` | `200`（放行，由 Server Action 鉴权） |

### 4.3 鉴权分层现状

`/write` 的写操作有两道独立关卡，`proxy.ts` 只是粗筛，**权威判定在 Server Action 内部**：

- `app/write/page.tsx:87` `publishPost` → 第 90 行 `requireAdminOrRedirect`
- `app/write/page.tsx:124` `deletePost` → 第 127 行 `requireAdminOrRedirect`

`requireAdminOrRedirect`（第 56 行）依次校验：同源 → 环境变量存在 → 会话 Cookie 或表单 token
（`safeCompare` 常时比较）。**没有任何一个副作用 Action 依赖「页面藏起来了」作为边界。**

### 4.4 Edge Runtime 的实现约束

`proxy.ts` 跑在 Edge Runtime，拿不到 `node:crypto` 与 `Buffer`，因此会话派生与常时比较
另有一份 Web 标准实现：`lib/blog-auth-token-edge.ts`。

> ⚠️ 两份实现**必须逐字节等价**，任何一边改动都会让合法请求被静默拦成 404。
> `tests/blog-auth.test.ts` 已加入交叉断言把这个不变式钉死（改任一边则测试失败）。

### 4.5 matcher 收回

`0c85061` 把 matcher 从三条精确路径放宽为「除静态资源外全部路径」，本意是给所有 Cookie
补 SameSite —— 既然那段是死代码，放宽只是让每个请求白跑一遍 Edge 函数。
源站是 1 vCPU / 512 MB，已收回为 `["/", "/posts/:path*", "/write"]`。

---

## 五、Next.js 16 约束：proxy.ts 与 middleware.ts 互斥

本轮踩到的实际构建错误：

```
Error: Both middleware file "./middleware.ts" and proxy file "./proxy.ts"
are detected. Please use "./proxy.ts" only.
```

本项目在 commit `cb7173f` 已完成 `middleware → proxy` 迁移。
**不要新建 `middleware.ts`** —— 会直接导致构建失败。所有中间件逻辑写进 `proxy.ts`。

---

## 六、验证方法

### 配置 Dashboard 前后对比

```bash
curl -sI https://wwjjhh.online | grep -iE "^(server|x-frame-options|referrer-policy|strict-transport)"
```

**当前（配置前）实测输出**：
```
Server: cloudflare
referrer-policy: same-origin
strict-transport-security: max-age=31536000; includeSubDomains
x-frame-options: SAMEORIGIN
```

**完成 P0 + P1 后的预期输出**：
```
referrer-policy: strict-origin-when-cross-origin
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-frame-options: DENY
（无 Server 行）
```

### 逐层定位：头到底在哪一层被改（2026-08-19 复测）

三层各自实测，同一个请求路径分三处取样。**必须带正确的 Host 取样** ——
用错 Host 会打到 `server_name _` 兜底块，那个块不 proxy 到应用，量出来的
「nginx 丢了 6 个头」是取样错误，不是真实行为（本轮就先踩了这个坑）。

| 层 | 取样命令 | 结果 |
|----|---------|------|
| Next.js 源站 | `curl -sI http://127.0.0.1:3001/` | 8 个头全发，值与 `lib/security-headers.ts` 一致 |
| nginx :80 | `curl -sI -H 'Host: wwjjhh.online' http://127.0.0.1/` | **8 个头全部透传，不增不改** |
| nginx :443 | `curl -sIk --resolve wwjjhh.online:443:127.0.0.1 https://wwjjhh.online/` | 同上，8 个头全部透传 |
| Cloudflare 边缘 | `curl -sI https://wwjjhh.online/` | HSTS / X-Frame-Options / Referrer-Policy 三项被覆写 |

**结论**：nginx 不参与安全头，`/etc/nginx/sites-enabled/wwjjhh.online` 里没有任何
涉及安全头的 `add_header`（它的 `add_header` 只管 `Cache-Control`、`X-Cache-Status`、
`Link`）。因此源站与边缘是**两个**声明点，不是三个 —— 要消除分歧只需关掉 CF 的
Managed Transform，无需改 nginx。

### 单一事实源位置（2026-08-19 收敛后）

源站侧的头不再写在 `next.config.ts` 里：

| 内容 | 定义处 |
|------|--------|
| 8 个安全头 + CSP | `lib/security-headers.ts` |
| Cache-Control 各档 | `lib/cache-policy.ts` |
| 域名 / Host 白名单 / 出版实体名 | `lib/site-config.ts` |
| 会话 cookie 安全属性 | `lib/session-cookie.ts` |

`next.config.ts` 只负责把这些值挂到路径上。契约测试 `tests/config-convergence.test.ts`
断言「没有第二处定义」，包括 `ops/sync-r2-assets.py` 的 `CACHE_CONTROL` 与 TS 常量
逐字节一致（Python 不能 import TS，跨语言一致性只能靠测试比对）。

### 第三方评估

- https://securityheaders.com/?q=https://wwjjhh.online
- https://www.ssllabs.com/ssltest/analyze.html?d=wwjjhh.online

> 说明：具体评分取决于评分算法与检测时点，本文档不预设分数。
> 判定标准以上面 `curl` 的四行实际输出为准。

---

## 七、低危漏洞（40处）说明

这部分**无需代码改动**，属扫描器误报，在整改回函中说明即可：

| 扫描项 | 数量 | 实际性质 |
|--------|------|---------|
| 文件路径泄漏 | 20 | 博客文章的公开 URL（如 `/posts/2026-07-31-cli-s05e04-deploy-day`），是内容路径而非系统敏感路径 |
| 发现电子邮箱 | 10 | 技术教程中的示例邮箱，用于代码演示 |
| 发现内网 IP | 10 | 网络教程中的示例 IP（`192.168.x.x`、`127.0.0.1`），教学用途 |

技术博客必然包含命令行、路径与网络配置示例，这是内容本身，不构成可利用的攻击面。

---

## 八、第三方安全回函 13 项复核结论

收到一份第三方（AI 生成）的安全回函，提出 13 项风险并给出优先级排序。
逐项用本机实测复核后，**12 项前提不成立，1 项成立且已修复**。
该回函的排序建议**不可直接用于整改材料**，逐项结论如下：

| 回函判定 | 复核结果 | 依据 |
|---|---|---|
| **P0** Next.js 可能 `<16.2.11`，存在 Server Action DoS（CVSS 8.2） | ❌ 不成立 | 实测 **16.2.12**，已过修复线；`npm audit` 0 漏洞 |
| **P0** React 可能 `<19.2.6`，存在 RSC DoS | ❌ 不成立 | 实测 **19.2.8**，已过修复线 |
| **P1** Server Action 可能不自身鉴权 | ❌ 不成立 | `publishPost`/`deletePost` 各自调用 `requireAdminOrRedirect`，含同源校验 |
| **P1** `/write` 依赖长期共享 Token 当 Session | ❌ 已是派生会话 | Cookie 存 HMAC 派生值 `v2.*`，非 Token 原文；轮换密钥即全会话失效 |
| **P1** 源站可绕过 Cloudflare 直连 | ❌ 无此攻击面 | Nginx 仅绑 `127.0.0.1`，经 Cloudflare Tunnel 出网，源站无公网 Web 监听 |
| **P1** 可能无条件信任 `X-Forwarded-For` | ❌ 不成立 | `lib/client-ip.ts` 以 `cf-connecting-ip` 优先，XFF 仅兜底且只取第一跳 |
| **P2** 自研 Markdown 渲染器未测 XSS | ❌ 已有覆盖 | 测试套件含「XSS 向量集」「表格劈列 XSS」「Shiki 不透传裸 HTML」等 |
| **P2** Turnstile 缺密钥时 fail-open | ❌ **结论相反** | 实为 fail-closed：未配置密钥一律拒绝 |
| **P2** CSP / HSTS 等响应头未确认 | ❌ 已全部配齐 | 实测含 `object-src 'none'`、`base-uri 'none'`、`frame-ancestors 'none'`、`form-action 'self'`、HSTS 一年 + `includeSubDomains` |
| **P3** robots.txt 中危 | ❌ 夸大 | 内容为 Cloudflare Managed 信号 + 站点规则，无敏感路径外泄 |
| **P3** SameSite 中危 | ❌ 误报 | 命中 Cloudflare challenge cookie，非本站 Cookie（见 4.1） |
| **P3** 内网 IP / 文件路径泄露 | ❌ 内容误报 | 技术教程中的示例地址与路径 |
| — 回函**未发现**的问题 | ✅ **真实缺陷** | `POST /write` 被全量拦成 404，发布/删除功能失效（见 4.2） |

> **方法论提示**：该回函的全部 P0/P1 判定均建立在「版本未知 / 实现未知」的假设推演上，
> 而非实际读取 lockfile 或源码。一条 `npm list next react react-dom` 即可证伪前两项。
> 真正的缺陷恰恰在它未覆盖的地方 —— 扫描器与假设推演都无法替代对实际代码路径的验证。

---

## 九、待办清单

- [x] 代码层复核与修复（详见第四章，含对 `0c85061` 的更正）
- [x] 本地构建验证通过
- [x] 生产环境响应头实测取证
- [x] 复核 `0c85061` 三项声称：两项无效已更正，SameSite 死代码已删除
- [x] **修复 `POST /write` 被全量拦成 404（发布/删除功能性缺陷）**
- [x] 补交叉断言测试钉死 edge/node 两份 HMAC 实现等价（`npm test` 140 passed）
- [x] 收回过宽的 proxy matcher
- [ ] **P0：Dashboard 关闭 Managed Transform「Add security headers」**
- [ ] **P1：Dashboard 添加 Transform Rule 移除 `Server` 头**
- [ ] P2：Dashboard 添加 robots.txt Rate Limiting
- [ ] 配置后重新 `curl` 验证四行输出
- [ ] 提交整改回函

---

**文档更新日期**：2026-08-14
**依据**：生产环境实测（`curl -sI https://wwjjhh.online`）+ 构建验证（`npm run build` 退出码 0）
