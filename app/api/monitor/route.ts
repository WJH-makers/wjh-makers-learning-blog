import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("monitor_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/monitor", process.env.NEXT_PUBLIC_SITE_URL ?? "https://wwjjhh.online"));
  }

  let netdataUrl: string;
  try {
    netdataUrl = new URL("https://monitor.wwjjhh.online").href;
  } catch {
    netdataUrl = "https://monitor.wwjjhh.online";
  }

  const resp = await fetch(netdataUrl, {
    headers: { Authorization: `Basic ${token}` },
    redirect: "manual",
  });

  const body = await resp.text();
  const newHeaders = new Headers();
  newHeaders.set("Content-Type", resp.headers.get("Content-Type") ?? "text/html");
  newHeaders.set("Cache-Control", "no-store");

  return new NextResponse(body, { status: resp.status, headers: newHeaders });
}
