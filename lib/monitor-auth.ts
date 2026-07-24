import { cookies } from "next/headers";
import { MONITOR_AUTH_COOKIE, verifySession } from "@/lib/auth-session";

/**
 * monitor 子系统(/monitor 页 + server-stats/cf-stats API)是否已鉴权。
 * 口令未配置 => 恒为 false(fail-closed),与登录接口一致。
 */
export async function isMonitorAuthed(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(MONITOR_AUTH_COOKIE)?.value, "monitor");
}
