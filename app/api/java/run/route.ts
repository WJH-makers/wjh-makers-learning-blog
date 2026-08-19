import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { findJavaLab, JAVA_LAB_LIMITS } from "@/lib/java-labs";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/request-origin";
import {
  judge0SubmissionUrl,
  parseJavaRunRequest,
  readJudge0Result,
  type JavaRunResult,
} from "@/lib/java-runner";


function runnerConfig(): { url: URL; languageId: number; token?: string } | undefined {
  const url = judge0SubmissionUrl(process.env.JAVA_JUDGE0_URL?.trim() ?? "");
  const languageId = Number(process.env.JAVA_JUDGE0_LANGUAGE_ID);
  if (!url || !Number.isInteger(languageId) || languageId <= 0) return undefined;
  const token = process.env.JAVA_JUDGE0_TOKEN?.trim();
  return { url, languageId, token: token || undefined };
}

export async function GET() {
  return NextResponse.json({
    available: Boolean(runnerConfig()),
    javaVersion: 17,
    limits: JAVA_LAB_LIMITS,
  });
}

export async function POST(request: Request) {
  const config = runnerConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Java 沙箱尚未配置。", code: "runner_unavailable" },
      { status: 503 },
    );
  }

  const headersList = await headers();
  if (!isSameOriginRequest(headersList)) {
    return NextResponse.json({ error: "请求来源不受信任。", code: "bad_origin" }, { status: 403 });
  }

  const ip = clientIp(headersList);
  if (!checkRateLimit(ip, "java-run" ).allowed) {
    return NextResponse.json({ error: "运行过于频繁，请稍后重试。", code: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确。", code: "invalid_request" }, { status: 400 });
  }

  const input = parseJavaRunRequest(body);
  const lab = input ? findJavaLab(input.labId) : undefined;
  if (!input || !lab) {
    return NextResponse.json({ error: "实验或代码参数无效。", code: "invalid_request" }, { status: 400 });
  }

  const timeout = AbortSignal.timeout(lab.limits.compileMs + lab.limits.runMs + 2_000);
  const signal = AbortSignal.any([request.signal, timeout]);

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.token ? { "X-Auth-Token": config.token } : {}),
      },
      body: JSON.stringify({
        language_id: config.languageId,
        source_code: input.source,
        stdin: input.stdin,
        cpu_time_limit: lab.limits.runMs / 1_000,
        wall_time_limit: lab.limits.runMs / 1_000 + 1,
        compiler_options: "--release 17",
        memory_limit: 128_000,
        max_file_size: 1_024,
        max_processes_and_or_threads: 32,
        enable_network: false,
      }),
      cache: "no-store",
      signal,
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Java 沙箱暂时不可用。", code: "runner_error" }, { status: 502 });
    }
    const result = await readJudge0Result(response, lab.limits.maxOutputChars);
    return NextResponse.json<JavaRunResult>(result);
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return NextResponse.json(
      { error: timedOut ? "Java 沙箱响应超时。" : "Java 沙箱连接失败。", code: timedOut ? "runner_timeout" : "runner_error" },
      { status: timedOut ? 504 : 502 },
    );
  }
}
