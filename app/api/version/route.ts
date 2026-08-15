import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const COMMIT_PATTERN = /^[0-9a-f]{40}$/;

/**
 * 发布校验需要知道容器跑的是哪个 commit，但公网不应看到它 ——
 * 公开 SHA 会暴露部署时间线，并让攻击者精确检索到对应源码版本。
 *
 * 因此只对**同机回环**调用方返回 commit：
 * `scripts/deploy-from-origin.sh` 在服务器上问 `http://127.0.0.1:3001/api/version`，
 * 权威校验因此仍然成立；经 Cloudflare 到达的公网请求只会拿到存活状态。
 */
async function isLoopbackCaller(): Promise<boolean> {
  const h = await headers();
  // 有任何转发链痕迹就说明请求经过了代理/边缘，不能视为本机直连。
  if (h.get("x-forwarded-for") || h.get("cf-connecting-ip") || h.get("x-real-ip")) {
    return false;
  }
  const host = h.get("host")?.trim().toLowerCase();
  if (!host) return false;
  const hostname = host.startsWith("[")
    ? host.slice(1, host.indexOf("]"))
    : host.split(":")[0];
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

export async function GET() {
  const body: { healthy: true; commit?: string } = { healthy: true };

  if (await isLoopbackCaller()) {
    const commit = process.env.APP_GIT_SHA?.trim();
    // 只回传形状正确的 SHA；构建未注入时(`unknown`)不伪造字段，让校验方明确失败而不是误判通过。
    if (commit && COMMIT_PATTERN.test(commit)) {
      body.commit = commit;
    }
  }

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
      // 同一 URL 对回环与公网返回不同内容，必须让任何中间缓存按 Host 区分。
      Vary: "Host",
    },
  });
}
