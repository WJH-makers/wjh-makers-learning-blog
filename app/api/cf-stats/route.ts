import { NextResponse } from "next/server";
import { isMonitorAuthed } from "@/lib/monitor-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 300_000;

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

interface CfDayGroup {
  sum: { requests: number; bytes: number; pageViews: number; threats: number };
  uniq: { uniques: number };
  dimensions: { date: string };
}

export async function GET() {
  if (!(await isMonitorAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.CLOUDFLARE_TOKEN;
  const zone = process.env.CLOUDFLARE_ZONE_ID;

  if (!token || !zone) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const cached = CACHE.get("stats");
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const query = JSON.stringify({
      query: `{viewer{zones(filter:{zoneTag:"${zone}"}){today:httpRequests1dGroups(limit:1,filter:{date_geq:"${today}",date_leq:"${today}"}){sum{requests bytes pageViews threats}uniq{uniques}}week_days:httpRequests1dGroups(limit:8,filter:{date_geq:"${weekAgo}",date_leq:"${today}"}){dimensions{date}sum{requests bytes pageViews threats}uniq{uniques}}month_days:httpRequests1dGroups(limit:31,filter:{date_geq:"${monthAgo}",date_leq:"${today}"}){dimensions{date}sum{requests threats}}}}}`,
    });

    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: query,
    });

    const json = await res.json();
    const zd = json?.data?.viewer?.zones?.[0];
    const todayStats = zd?.today?.[0]?.sum ?? {};
    const todayUniq = zd?.today?.[0]?.uniq?.uniques ?? 0;
    const weekDays = (zd?.week_days ?? []) as CfDayGroup[];
    const monthDays = (zd?.month_days ?? []) as CfDayGroup[];

    const weekRequests = weekDays.reduce((a: number, d) => a + (d.sum?.requests ?? 0), 0);
    const weekBytes = weekDays.reduce((a: number, d) => a + (d.sum?.bytes ?? 0), 0);
    const weekThreats = weekDays.reduce((a: number, d) => a + (d.sum?.threats ?? 0), 0);

    const data = {
      today: {
        requests: fmt(todayStats.requests ?? 0),
        bandwidth: fmt(todayStats.bytes ?? 0),
        views: fmt(todayStats.pageViews ?? 0),
        threats: todayStats.threats ?? 0,
        uniques: todayUniq,
      },
      week: {
        requests: fmt(weekRequests),
        bandwidth: fmt(weekBytes),
        threats: weekThreats,
      },
      week_chart: weekDays.map(d => ({
        t: d.dimensions.date,
        requests: d.sum?.requests ?? 0,
        views: d.sum?.pageViews ?? 0,
        threats: d.sum?.threats ?? 0,
        bytes: d.sum?.bytes ?? 0,
        uniques: d.uniq?.uniques ?? 0,
      })),
      month_chart: monthDays.map(d => ({
        t: d.dimensions.date,
        requests: d.sum?.requests ?? 0,
        threats: d.sum?.threats ?? 0,
      })),
    };

    CACHE.set("stats", { data, ts: Date.now() });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
