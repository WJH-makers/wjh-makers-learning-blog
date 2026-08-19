/**
 * Turnstile 站点密钥的读取入口（同构：服务端与客户端组件都用这一个）。
 *
 * 收敛前三处读取且**不对称**：lib/comments.ts 两处带 `.trim()`，
 * app/posts/[slug]/Comments.tsx（客户端组件）不带。
 * 失效模式：env 值末尾多一个空格时，服务端 isCommentingEnabled() 判为已启用、
 * 客户端把带空格的 key 交给 Turnstile → widget 静默不渲染，评论区看着开着却发不出。
 *
 * 只放 site key（Cloudflare 明确设计为公开值，内联进前端 bundle 是预期行为）。
 * TURNSTILE_SECRET_KEY 绝不进本模块 —— 它会被客户端组件 import，密钥会直接进 bundle。
 *
 * 零依赖，且 `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY` 以字面形态出现：
 * Next 对 NEXT_PUBLIC_* 是**文本替换**，字面量必须在源码里，不能拼接变量名。
 */

/** Turnstile site key。空串 = 未配置。 */
export function turnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
}
