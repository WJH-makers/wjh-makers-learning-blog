import { cookies } from "next/headers";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";

const encoder = new TextEncoder();

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(encoder.encode(a), encoder.encode(b));
}

export async function GET() {
  const expected = process.env.BLOG_ADMIN_TOKEN?.trim();
  const cookieStore = await cookies();
  const token = cookieStore.get("blog_admin_token")?.value?.trim();
  const authed = Boolean(expected) && safeCompare(token ?? "", expected ?? "");

  return NextResponse.json({ authed });
}

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";

  if (!checkRateLimit(ip, "login").allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const { token } = await request.json();
  const expected = process.env.BLOG_ADMIN_TOKEN?.trim();

  if (!expected || !safeCompare(token ?? "", expected)) {
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
