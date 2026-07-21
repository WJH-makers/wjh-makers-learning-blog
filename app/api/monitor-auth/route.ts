import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const MONITOR_USER = "wjh";
const MONITOR_PASS = "780519";

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";

  if (!checkRateLimit(ip, "login").allowed) {
    return NextResponse.json({ ok: false, message: "尝试次数过多，请 1 分钟后重试" }, { status: 429 });
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

  if (username !== MONITOR_USER || password !== MONITOR_PASS) {
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
