import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";

// 口令来自环境变量,不再硬编码。未配置则拒绝登录(fail-closed)。
const MONITOR_USER = process.env.MONITOR_USER ?? "";
const MONITOR_PASS = process.env.MONITOR_PASS ?? "";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";

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
  try {
    const body = await request.json();
    username = String(body.username ?? "").trim();
    password = String(body.password ?? "").trim();
  } catch {
    const form = await request.formData();
    username = String(form.get("username") ?? "").trim();
    password = String(form.get("password") ?? "").trim();
  }

  if (!username || !password) {
    return NextResponse.json({ ok: false, message: "请输入用户名和密码" }, { status: 401 });
  }

  // 恒定时间比较,避免计时侧信道;两项都算完再判,不短路。
  const ok = safeEqual(username, MONITOR_USER) && safeEqual(password, MONITOR_PASS);
  if (!ok) {
    return NextResponse.json({ ok: false, message: "用户名或密码错误" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("monitor_token", Buffer.from(`${MONITOR_USER}:${MONITOR_PASS}`).toString("base64"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return res;
}
