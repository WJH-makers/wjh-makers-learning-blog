import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { safeCompare } from "@/lib/safe-compare";

export const MONITOR_COOKIE = "monitor_token";

/**
 * monitor 会话令牌 = HMAC-SHA256(key=MONITOR_PASS, msg="monitor:v2:<user>")。
 *
 * 早前的实现是 base64url(`user:pass`) —— base64 是编码不是加密,cookie 一旦经由代理日志、
 * 浏览器扩展、调试工具或备份外泄,管理口令即明文失守。HMAC 单向,拿到 cookie 也推不回口令。
 *
 * 派生里带上 pass 作为 key 还有个好处:改口令后所有旧 cookie 自动失效,无需维护吊销名单。
 * 令牌里嵌 v2 版本号,将来算法再变时可凭前缀区分。
 *
 * 登录接口与校验必须共用这一个函数 —— 两处各写一遍正是上一版 padding bug 的根源。
 */
export function monitorToken(user: string, pass: string): string {
  return createHmac("sha256", pass).update(`monitor:v2:${user}`).digest("base64url");
}

/**
 * monitor 子系统(/monitor 页 + server-stats/cf-stats API)是否已鉴权。
 * 口令未配置 => 恒为 false(fail-closed),与登录接口一致。
 */
export async function isMonitorAuthed(): Promise<boolean> {
  const user = process.env.MONITOR_USER ?? "";
  const pass = process.env.MONITOR_PASS ?? "";
  if (!user || !pass) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(MONITOR_COOKIE)?.value ?? "";
  return safeCompare(token, monitorToken(user, pass));
}
