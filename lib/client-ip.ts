import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

/**
 * 取用于限流的客户端 IP。
 *
 * 顺序有安全含义,不能调换:
 * - `cf-connecting-ip` 由 Cloudflare 在回源时写入,客户端自带的同名头会被 CF 覆盖,
 *   因此在「公网只能经 CF 进来」的部署下它不可伪造 —— 生产就是这个拓扑(见 nginx 只绑 127.0.0.1)。
 * - `x-forwarded-for` 是**客户端可任意伪造**的:直接拿它当限流 key,攻击者每次请求换一个值
 *   就能拿到全新配额,登录限流等于不存在。只在没有 CF 头时兜底,且只取第一跳。
 *
 * 取不到时统一归到 "unknown" 这一个桶:宁可让少数无头请求共享配额,
 * 也不能给每个匿名请求发一把新钥匙。
 */
export function clientIp(headers: ReadonlyHeaders | Headers): string {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;

  return headers.get("x-real-ip")?.trim() || "unknown";
}
