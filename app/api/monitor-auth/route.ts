import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { MONITOR_COOKIE, monitorToken } from "@/lib/monitor-auth";
import { isSameOriginRequest } from "@/lib/request-origin";
import { safeCompare } from "@/lib/safe-compare";

// 口令来自环境变量,不再硬编码。未配置则拒绝登录(fail-closed)。
const MONITOR_USER = process.env.MONITOR_USER ?? "";
const MONITOR_PASS = process.env.MONITOR_PASS ?? "";

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = clientIp(headersList);

  if (!isSameOriginRequest(headersList)) {
    return NextResponse.json({ ok: false, message: "请求来源不受信任" }, { status: 403 });
  }

  if (!checkRateLimit(ip, "login").allowed) {
    return NextResponse.json({ ok: false, message: "尝试次数过多，请 1 分钟后重试" }, { status: 429 });
  }

  if (!MONITOR_USER || !MONITOR_PASS) {
    return NextResponse.json(
      { ok: false, message: "监控登录未配置：请在环境变量设置 MONITOR_USER / MONITOR_PASS。" },
      { status: 503 },
    );
  }

  let username: string;
  let password: string;
  // 按 Content-Type 分派。不能「先试 json() 失败再试 formData()」——
  // 第一次读取就消费掉了 body stream,第二次必抛,畸形请求会以 500 收场而不是 400。
  try {
    if ((request.headers.get("content-type") ?? "").includes("application/json")) {
      const body = await request.json();
      username = String(body?.username ?? "").trim();
      password = String(body?.password ?? "").trim();
    } else {
      const form = await request.formData();
      username = String(form.get("username") ?? "").trim();
      password = String(form.get("password") ?? "").trim();
    }
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式不正确" }, { status: 400 });
  }

  if (!username || !password) {
    return NextResponse.json({ ok: false, message: "请输入用户名和密码" }, { status: 401 });
  }

  // 恒定时间比较,避免计时侧信道;两项都算完再判,不短路。
  // 写成两个先行求值的常量,而不是 `a() && b()` —— `&&` 会短路,用户名错时
  // 密码比较根本不执行,响应时间就泄漏了「用户名是否命中」。
  const userOk = safeCompare(username, MONITOR_USER);
  const passOk = safeCompare(password, MONITOR_PASS);
  const ok = userOk && passOk;
  if (!ok) {
    return NextResponse.json({ ok: false, message: "用户名或密码错误" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(MONITOR_COOKIE, monitorToken(MONITOR_USER, MONITOR_PASS), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return res;
}
