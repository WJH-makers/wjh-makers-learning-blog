import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const expected = process.env.BLOG_ADMIN_TOKEN?.trim();
  const cookieStore = await cookies();
  const token = cookieStore.get("blog_admin_token")?.value?.trim();
  const authed = Boolean(expected) && token === expected;

  return NextResponse.json({ authed });
}

export async function POST(request: Request) {
  const { token } = await request.json();
  const expected = process.env.BLOG_ADMIN_TOKEN?.trim();

  if (!expected || token !== expected) {
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
