/**
 * 会话 cookie 属性的单一事实源。
 *
 * 收敛前：httpOnly / secure / sameSite / path 四个安全属性在 app/api/auth/route.ts、
 * app/write/page.tsx、app/api/monitor-auth/route.ts 各写一遍（前两处逐字节相同）。
 * 这类重复的失效模式不是「值不一致」而是「某一处漏了一项」——漏 httpOnly 就等于把
 * 会话交给任意 XSS，而其余两处仍然正确，评审时极难看出来。
 *
 * lib/monitor-auth.ts 的注释早已写下同一条原则：「登录接口与校验必须共用这一个函数 ——
 * 两处各写一遍正是上一版 padding bug 的根源。」本模块把该原则套到 cookie 属性上。
 *
 * 零依赖：不 import next/*，因此 cookies() 存储与 NextResponse.cookies 两种写入路径都能用。
 */

// 相对路径而非 @/ 别名：本模块要能被 tests 用 `node --test` 直接 import，
// 而 Node 的类型剥离不解析 tsconfig 的 paths 别名（实测 ERR_MODULE_NOT_FOUND）。
// lib/site-config.ts、lib/security-headers.ts、lib/cache-policy.ts 同理保持零别名。
import { ADMIN_SESSION_MAX_AGE_SECONDS, MONITOR_SESSION_MAX_AGE_SECONDS } from "./cache-policy.ts";

export type SessionCookieOptions = {
  readonly httpOnly: true;
  readonly secure: boolean;
  readonly sameSite: "lax";
  readonly maxAge: number;
  readonly path: "/";
};

/**
 * 会话 cookie 的公共安全属性。
 *
 * - httpOnly：脚本读不到，XSS 拿不走会话。写死为 true，不开放参数。
 * - secure：仅生产要求 HTTPS —— 本地 http://localhost 开发若强制 secure 会直接登不上。
 * - sameSite lax：顶层导航带 cookie（登录后跳转要能保持登录），跨站 POST 不带。
 *   strict 会让「外链点进文章 → 已登录管理员看不到编辑入口」，lax 是此处的正确档位。
 */
function baseOptions(maxAge: number): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  };
}

/** 写作台会话（30 天）。app/api/auth 与 app/write 两条登录路径必须用同一份。 */
export function adminSessionCookieOptions(): SessionCookieOptions {
  return baseOptions(ADMIN_SESSION_MAX_AGE_SECONDS);
}

/** 监控台会话（8 小时）。面板暴露服务器指标，有效期比写作台短。 */
export function monitorSessionCookieOptions(): SessionCookieOptions {
  return baseOptions(MONITOR_SESSION_MAX_AGE_SECONDS);
}
