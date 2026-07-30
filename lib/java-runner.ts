import type { JavaDiagnostic } from "./java-labs.ts";

export const JAVA_SOURCE_LIMIT = 20_000;
export const JAVA_STDIN_LIMIT = 4_000;
export const JUDGE0_RESPONSE_LIMIT = 64 * 1_024;

export type JavaRunStatus =
  | "success"
  | "compile_error"
  | "runtime_error"
  | "timeout"
  | "internal_error";

export type JavaRunResult = {
  status: JavaRunStatus;
  statusLabel: string;
  stdout: string;
  stderr: string;
  diagnostics: JavaDiagnostic[];
  timeMs?: number;
  memoryKb?: number;
  truncated: boolean;
};

export type JavaRunRequest = { source: string; stdin: string; labId: string };

type Judge0Response = {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  memory?: number | null;
  status?: { id?: number; description?: string } | null;
};

function optionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function parseJudge0Response(value: unknown): Judge0Response | undefined {
  if (!value || typeof value !== "object") return undefined;
  const payload = value as Record<string, unknown>;
  if (!payload.status || typeof payload.status !== "object") return undefined;
  const status = payload.status as Record<string, unknown>;
  if (typeof status.id !== "number" || !Number.isInteger(status.id)) return undefined;
  if (!optionalString(status.description)) return undefined;
  if (!optionalString(payload.stdout) || !optionalString(payload.stderr)) return undefined;
  if (!optionalString(payload.compile_output) || !optionalString(payload.message) || !optionalString(payload.time)) return undefined;
  if (payload.memory !== undefined && payload.memory !== null && typeof payload.memory !== "number") return undefined;
  return value as Judge0Response;
}

export function parseJavaRunRequest(value: unknown): JavaRunRequest | undefined {
  if (!value || typeof value !== "object") return undefined;
  const body = value as Record<string, unknown>;
  if (typeof body.source !== "string" || typeof body.stdin !== "string" || typeof body.labId !== "string") {
    return undefined;
  }
  if (!body.labId.trim() || body.labId.length > 80) return undefined;
  if (body.source.length > JAVA_SOURCE_LIMIT || body.stdin.length > JAVA_STDIN_LIMIT) return undefined;
  return { source: body.source, stdin: body.stdin, labId: body.labId };
}

export function parseCompilerDiagnostics(output: string): JavaDiagnostic[] {
  const diagnostics: JavaDiagnostic[] = [];
  const lines = output.replaceAll("\r\n", "\n").split("\n");
  const pattern = /(?:^|[/\\])Main\.java:(\d+)(?::(\d+))?:\s*(error|warning):\s*(.+)$/i;

  for (let index = 0; index < lines.length; index++) {
    const match = pattern.exec(lines[index] ?? "");
    if (!match) continue;
    let column = match[2] ? Number(match[2]) : undefined;
    if (!column && lines[index + 2]?.includes("^")) column = (lines[index + 2]?.indexOf("^") ?? 0) + 1;
    diagnostics.push({
      severity: match[3]?.toLowerCase() === "warning" ? "warning" : "error",
      message: match[4]?.trim() || "Java 编译失败",
      line: Number(match[1]),
      column,
    });
  }
  return diagnostics;
}

function truncate(value: string, max: number): { value: string; truncated: boolean } {
  if (value.length <= max) return { value, truncated: false };
  return { value: `${value.slice(0, max)}\n… 输出已截断`, truncated: true };
}

export function mapJudge0Result(value: unknown, maxOutputChars = 4_000): JavaRunResult {
  const payload = parseJudge0Response(value);
  if (!payload) throw new Error("Java 沙箱响应结构无效。");
  const statusId = payload.status?.id ?? 0;
  const compileOutput = payload.compile_output ?? "";
  const stdout = truncate(payload.stdout ?? "", maxOutputChars);
  const rawError = compileOutput || payload.stderr || payload.message || "";
  const stderr = truncate(rawError, maxOutputChars);

  let status: JavaRunStatus;
  let statusLabel: string;
  if (statusId === 3) {
    status = "success";
    statusLabel = "运行完成";
  } else if (statusId === 6) {
    status = "compile_error";
    statusLabel = "编译失败";
  } else if (statusId === 5) {
    status = "timeout";
    statusLabel = "运行超时";
  } else if (statusId >= 7 && statusId <= 12) {
    status = "runtime_error";
    statusLabel = payload.status?.description || "运行失败";
  } else {
    status = "internal_error";
    statusLabel = payload.status?.description || "执行服务异常";
  }

  return {
    status,
    statusLabel,
    stdout: stdout.value,
    stderr: stderr.value,
    diagnostics: status === "compile_error" ? parseCompilerDiagnostics(rawError) : [],
    timeMs: payload.time ? Math.round(Number(payload.time) * 1_000) : undefined,
    memoryKb: payload.memory ?? undefined,
    truncated: stdout.truncated || stderr.truncated,
  };
}

export async function readJudge0Result(
  response: Response,
  maxOutputChars = 4_000,
  maxResponseBytes = JUDGE0_RESPONSE_LIMIT,
): Promise<JavaRunResult> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
    throw new Error(`Java 沙箱响应超过 ${maxResponseBytes} 字节上限。`);
  }
  if (!response.body) throw new Error("Java 沙箱返回了空响应。");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxResponseBytes) {
      await reader.cancel();
      throw new Error(`Java 沙箱响应超过 ${maxResponseBytes} 字节上限。`);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new Error("Java 沙箱响应不是有效 JSON。");
  }
  return mapJudge0Result(payload, maxOutputChars);
}

export function judge0SubmissionUrl(baseUrl: string): URL | undefined {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    url.pathname = `${url.pathname.replace(/\/$/, "")}/submissions`;
    url.search = "?base64_encoded=false&wait=true";
    return url;
  } catch {
    return undefined;
  }
}
