import { NextResponse } from "next/server";
import { isBlogAuthed } from "@/lib/blog-auth";

export async function GET() {
  return NextResponse.json(
    { authed: await isBlogAuthed() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
