import { NextResponse } from "next/server";
import { isMonitorAuthed } from "@/lib/monitor-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 300_000;

interface CfDayGroup {
  sum: { requests: number; bytes: number; pageViews: number; threats: number };
  uniq: { uniques: number };
  dimensions: { date: string };
}

interface CfGraphQLResponse {
  data?: {
    viewer?: {
      zones?: {
        today?: CfDayGroup[];
        yesterday?: CfDayGroup[];
        week_days?: CfDayGroup[];
        prev_week?: CfDayGroup[];
        month_days?: CfDayGroup[];
        all_time?: CfDayGroup[];
      }[];
    };
  } | null;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function sumDay(day: CfDayGroup | undefined, field: keyof CfDayGroup["sum"]): number {
  return day?.sum?.[field] ?? 0;
}
function uniqDay(day: CfDayGroup | undefined): number {
  return day?.uniq?.uniques ?? 0;
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
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const prevWeekEnd = new Date(now.getTime() - 8 * 86400000).toISOString().slice(0, 10);
    const prevWeekStart = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10);
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 86400000).toISOString().slice(0, 10);

    const query = JSON.stringify({
      query: `{viewer{zones(filter:{zoneTag:"${zone}"}){today:httpRequests1dGroups(limit:1,filter:{date_geq:"${today}",date_leq:"${today}"}){sum{requests bytes pageViews threats}uniq{uniques}}yesterday:httpRequests1dGroups(limit:1,filter:{date_geq:"${yesterday}",date_leq:"${yesterday}"}){sum{requests bytes pageViews threats}uniq{uniques}}week_days:httpRequests1dGroups(limit:8,filter:{date_geq:"${weekAgo}",date_leq:"${today}"}){dimensions{date}sum{requests bytes pageViews threats}uniq{uniques}}prev_week:httpRequests1dGroups(limit:8,filter:{date_geq:"${prevWeekStart}",date_leq:"${prevWeekEnd}"}){dimensions{date}sum{requests bytes pageViews threats}uniq{uniques}}month_days:httpRequests1dGroups(limit:31,filter:{date_geq:"${monthAgo}",date_leq:"${today}"}){dimensions{date}sum{requests threats}}all_time:httpRequests1dGroups(limit:1000,filter:{date_geq:"${twoMonthsAgo}",date_leq:"${today}"}){sum{requests pageViews}uniq{uniques}}}}}`,
    });

    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: query,
    });

    const json: CfGraphQLResponse = await res.json();
    const zd = json?.data?.viewer?.zones?.[0];

    const todayGroup = (zd?.today ?? [])[0];
    const yesterdayGroup = (zd?.yesterday ?? [])[0];
    const weekDays = zd?.week_days ?? [];
    const prevWeekDays = zd?.prev_week ?? [];
    const monthDays = zd?.month_days ?? [];
    const allTime = (zd?.all_time ?? [])[0];

    // 本周总和
    const weekRequests = weekDays.reduce((a, d) => a + sumDay(d, "requests"), 0);
    const weekViews = weekDays.reduce((a, d) => a + sumDay(d, "pageViews"), 0);
    const weekUniques = weekDays.reduce((a, d) => a + uniqDay(d), 0);
    const weekThreats = weekDays.reduce((a, d) => a + sumDay(d, "threats"), 0);

    // 上周总和
    const prevWeekRequests = prevWeekDays.reduce((a, d) => a + sumDay(d, "requests"), 0);
    const prevWeekViews = prevWeekDays.reduce((a, d) => a + sumDay(d, "pageViews"), 0);
    const prevWeekUniques = prevWeekDays.reduce((a, d) => a + uniqDay(d), 0);

    // WoW 增长率
    const wowRequests = prevWeekRequests > 0 ? ((weekRequests - prevWeekRequests) / prevWeekRequests * 100).toFixed(1) : "+0.0";
    const wowViews = prevWeekViews > 0 ? ((weekViews - prevWeekViews) / prevWeekViews * 100).toFixed(1) : "+0.0";
    const wowUniques = prevWeekUniques > 0 ? ((weekUniques - prevWeekUniques) / prevWeekUniques * 100).toFixed(1) : "+0.0";

    // 今日 vs 昨日
    const todayReqs = sumDay(todayGroup, "requests");
    const yesterdayReqs = sumDay(yesterdayGroup, "requests");
    const dayOverDay = yesterdayReqs > 0 ? ((todayReqs - yesterdayReqs) / yesterdayReqs * 100).toFixed(1) : "+0.0";

    // 本月峰值日
    const peakDay = monthDays.length > 0
      ? monthDays.reduce((a, b) => (sumDay(a, "requests") > sumDay(b, "requests") ? a : b))
      : null;

    // 总览（60 天）
    const periodRequests = sumDay(allTime, "requests");

    const data = {
      now: today,
      today: {
        requests: fmt(todayReqs),
        requestsRaw: todayReqs,
        bandwidth: fmt(sumDay(todayGroup, "bytes")),
        views: fmt(sumDay(todayGroup, "pageViews")),
        viewsRaw: sumDay(todayGroup, "pageViews"),
        threats: sumDay(todayGroup, "threats"),
        uniques: uniqDay(todayGroup),
      },
      yesterday: {
        requests: yesterdayReqs,
        views: sumDay(yesterdayGroup, "pageViews"),
        uniques: uniqDay(yesterdayGroup),
        threats: sumDay(yesterdayGroup, "threats"),
      },
      dayOverDay: `${dayOverDay.startsWith("-") ? "" : "+"}${dayOverDay}%`,
      week: {
        totalRequests: weekRequests,
        totalViews: weekViews,
        totalUniques: weekUniques,
        threats: weekThreats,
        dailyAvg: Math.round(weekRequests / Math.max(1, weekDays.length)),
      },
      prevWeek: {
        totalRequests: prevWeekRequests,
        totalViews: prevWeekViews,
        totalUniques: prevWeekUniques,
      },
      wow: {
        requests: `${wowRequests.startsWith("-") ? "" : "+"}${wowRequests}%`,
        views: `${wowViews.startsWith("-") ? "" : "+"}${wowViews}%`,
        uniques: `${wowUniques.startsWith("-") ? "" : "+"}${wowUniques}%`,
      },
      peakDay: peakDay ? { date: peakDay.dimensions.date, requests: sumDay(peakDay, "requests") } : null,
      periodRequests,
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
      prev_week_chart: prevWeekDays.map(d => ({
        t: d.dimensions.date,
        requests: d.sum?.requests ?? 0,
        views: d.sum?.pageViews ?? 0,
      })),
    };

    CACHE.set("stats", { data, ts: Date.now() });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
