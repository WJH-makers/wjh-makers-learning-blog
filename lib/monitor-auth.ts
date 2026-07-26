import { cookies } from "next/headers";
import { safeCompare } from "@/lib/safe-compare";

// monitor 登录成功后 cookie 存 base64(user:pass)(见 app/api/monitor-auth/route.ts)。
// 此处按同法重算期望值并恒定时间比对,避免计时侧信道。

/**
 * monitor 子系统(/monitor 页 + server-stats/cf-stats API)是否已鉴权。
 * 口令未配置 => 恒为 false(fail-closed),与登录接口一致。
 */
export async function isMonitorAuthed(): Promise<boolean> {
  const user = process.env.MONITOR_USER ?? "";
  const pass = process.env.MONITOR_PASS ?? "";
  if (!user || !pass) return false;

  const expected = Buffer.from(`${user}:${pass}`).toString("base64url");
  const cookieStore = await cookies();
  const token = cookieStore.get("monitor_token")?.value ?? "";
  return safeCompare(token, expected);
}
