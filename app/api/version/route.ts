import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const commit = process.env.APP_GIT_SHA?.trim() || "unknown";
  return NextResponse.json({ commit, healthy: true }, {
    headers: { "Cache-Control": "no-store" },
  });
}
