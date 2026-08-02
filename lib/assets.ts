const PUBLIC_ASSET_PATH = /^\/(?:comics|images)(?:\/|$)/;

function configuredAssetOrigin(): string | undefined {
  const raw = process.env.R2_PUBLIC_URL?.trim();
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    if (url.username || url.password || url.search || url.hash) return undefined;
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

/**
 * Return the public delivery URL for assets owned by this site.
 *
 * R2_PUBLIC_URL is deliberately server-side: it is a public origin, but the
 * S3 credentials never belong in a browser bundle. Keeping the local path as
 * the fallback preserves local development and makes rollback one env change.
 */
export function publicAssetUrl(path: string): string {
  if (!PUBLIC_ASSET_PATH.test(path)) return path;
  const origin = configuredAssetOrigin();
  return origin ? `${origin}${path}` : path;
}
