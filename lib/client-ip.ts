import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

/**
 * 取用于限流的客户端 IP。
 *
 * 顺序有安全含义,不能调换 —— 判据是「这个头是否被 nginx 用 proxy_set_header 覆写过」:
 *
 * - `x-real-ip` **可信**:站点 nginx 在每个 location 都写了
 *   `proxy_set_header X-Real-IP $remote_addr`,客户端自带的同名头一律被丢弃。
 *   经 Cloudflare 进来时 `set_real_ip_from`(CF 网段 + 回环)配 `real_ip_header X-Forwarded-For`
 *   已把 `$remote_addr` 改写成真实访客 IP,所以两条路径下它都等于真实来源。
 * - `cf-connecting-ip` **不可信**:站点配置里**没有**为它写 proxy_set_header,
 *   客户端自带的值原样直达应用。带正确 Host 直连源站即可伪造,每次换值就是一份新配额。
 *   2026-08-29 实测:固定伪造值第 4 次被拦,换一个立刻回到 401。
 * - `x-forwarded-for` **不可信**:nginx 用 `$proxy_add_x_forwarded_for` 追加,
 *   客户端提供的部分仍留在首跳,而首跳恰好就是这里会取的那一段。
 *
 * 两个不可信的头保留作兜底,但排在可信头之后:只有 `x-real-ip` 缺失(即请求没经过
 * 本站 nginx,例如未来直接暴露 3001 或换用别的反代)时才会用到它们。那种拓扑下
 * 限流本就不可靠,兜底只为不把所有人挤进同一个桶。
 *
 * 取不到时统一归到 "unknown" 这一个桶:宁可让少数无头请求共享配额,
 * 也不能给每个匿名请求发一把新钥匙。
 */
export function clientIp(headers: ReadonlyHeaders | Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;

  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
