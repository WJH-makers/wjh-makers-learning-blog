import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function safeCompare(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ua = enc.encode(a);
  const ub = enc.encode(b);
  if (ua.length !== ub.length) return false;
  let r = 0;
  for (let i = 0; i < ua.length; i++) r |= ua[i] ^ ub[i];
  return r === 0;
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/write" && request.method === "POST") {
    const expected = process.env.BLOG_ADMIN_TOKEN?.trim();
    if (!expected) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const cookieToken = request.cookies.get("blog_admin_token")?.value?.trim();
    if (!cookieToken || !safeCompare(cookieToken, expected)) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/write",
};
