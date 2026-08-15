/**
 * 额外的 CSRF 防线：浏览器带 Origin 时，写入类请求必须来自本站。
 *
 * 没有 Origin 的请求保留兼容性（例如内部脚本、健康检查和部分旧客户端）；
 * 这些请求仍必须通过现有 token/鉴权，不会因此变成匿名写入。
 */
type HeaderReader = { get(name: string): string | null };

export function isSameOriginRequest(
  headers: HeaderReader,
  configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim(),
): boolean {
  const origin = headers.get("origin")?.trim();
  if (!origin) return true;
  if (origin === "null") return false;

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }

  if (originUrl.protocol !== "http:" && originUrl.protocol !== "https:") return false;

  const requestHost = headers.get("host")?.trim();
  const configuredHost = (() => {
    const configured = configuredSiteUrl;
    if (!configured) return undefined;
    try {
      return new URL(configured).host;
    } catch {
      return undefined;
    }
  })();

  // 不把客户端可伪造的 x-forwarded-host 单独列为允许来源。
  // 反向代理若把 Host 改成内部地址,由 NEXT_PUBLIC_SITE_URL 提供固定的公网主机名；
  // 否则攻击者可同时伪造 x-forwarded-host 与 Origin,绕过这层额外 CSRF 检查。
  const allowedHosts = new Set([requestHost, configuredHost].filter(Boolean));
  return allowedHosts.has(originUrl.host);
}
