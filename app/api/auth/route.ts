import { cookies } from "next/headers";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { safeCompare } from "@/lib/safe-compare";

export async function GET() {
  const expected = process.env.BLOG_ADMIN_TOKEN?.trim();
  const cookieStore = await cookies();
  const token = cookieStore.get("blog_admin_token")?.value?.trim();
  const authed = Boolean(expected) && safeCompare(token ?? "", expected ?? "");

  return NextResponse.json({ authed });
}

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = clientIp(headersList);

  if (!checkRateLimit(ip, "login").allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  // 畸形 body 属于客户端错误,应答 400;裸 await request.json() 会让它变成未捕获异常 → 500。
  let token: unknown;
  try {
    ({ token } = await request.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const expected = process.env.BLOG_ADMIN_TOKEN?.trim();

  if (!expected || typeof token !== "string" || !safeCompare(token, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("blog_admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
