import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { safeCompare } from "@/lib/safe-compare";

export const dynamic = "force-dynamic";

const COMMIT_PATTERN = /^[0-9a-f]{40}$/;

/**
 * 发布校验需要知道容器跑的是哪个 commit，但公网不应看到它 ——
 * 公开 SHA 会暴露部署时间线，并让攻击者精确检索到对应源码版本。
 *
 * 不能根据 Host 或 X-Forwarded-For 判定「本机」：Next 会给直连请求自动补
 * X-Forwarded-For，结果真正的部署探针也会被误认为经代理的公网请求。
 *
 * 部署脚本为每一次 compose 启动生成仅存在于容器运行环境中的随机 token，并且只通过
 * 绑定到宿主回环的 3001 端口提交它。持有该 token 才能读取 commit；没有 token 的
 * 公网请求始终只得到存活状态。
 */
async function isAuthorizedDeployProbe(): Promise<boolean> {
  const h = await headers();
  const expected = process.env.DEPLOY_VERIFICATION_TOKEN?.trim();
  const provided = h.get("x-deploy-verification-token")?.trim();

  return Boolean(expected && provided && safeCompare(provided, expected));
}

export async function GET() {
  const body: { healthy: true; commit?: string } = { healthy: true };

  if (await isAuthorizedDeployProbe()) {
    const commit = process.env.APP_GIT_SHA?.trim();
    // 只回传形状正确的 SHA；构建未注入时(`unknown`)不伪造字段，让校验方明确失败而不是误判通过。
    if (commit && COMMIT_PATTERN.test(commit)) {
      body.commit = commit;
    }
  }

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
      // 同一 URL 对已授权部署探针与普通请求返回不同内容，禁止共享缓存复用响应。
      Vary: "X-Deploy-Verification-Token",
    },
  });
}
