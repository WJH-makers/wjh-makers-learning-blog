import { cookies } from "next/headers";
import ServerCards from "./ServerCards";
import TraficCharts from "./TraficCharts";
import MonitorLogin from "./MonitorLogin";
import { isMonitorAuthed } from "@/lib/monitor-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Point { t: number; cpu: number; mem: number; load: number }
interface Srv { cpu: number; mem: number; load: number; uptime: string; disk: string; day: Point[]; week: Point[] }

interface CfDay { t: string; requests: number; views: number; threats: number; bytes: number; uniques: number }
interface CfStats {
  today: { requests: string; bandwidth: string; views: string; threats: number; uniques: number };
  week_chart: CfDay[];
  month_chart: { t: string; requests: number; threats: number }[];
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const base = process.env.NODE_ENV === "production" ? "http://127.0.0.1:3001" : "http://localhost:3000";
    // SSR loopback 自调:手动透传 monitor_token,过 API 的鉴权 gate。
    const token = (await cookies()).get("monitor_token")?.value;
    const r = await fetch(`${base}${path}`, {
      cache: "no-store",
      headers: token ? { cookie: `monitor_token=${token}` } : undefined,
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

export default async function MonitorPage() {
  if (!(await isMonitorAuthed())) {
    return <MonitorLogin />;
  }

  const [srv, cf] = await Promise.all([get<Srv>("/api/server-stats"), get<CfStats>("/api/cf-stats")]);

  return (
    <>
      <div className="page-shell narrow" style={{ paddingBottom: 40 }}>
        <div className="dash-section" style={{ marginTop: 0 }}>
          <div>
            <h2>监控室</h2>
            {srv && <span className="muted">运行 {srv.uptime} · CPU {srv.cpu}% · MEM {srv.mem}% · Load {srv.load.toFixed(1)}</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="https://monitor.wwjjhh.online" target="_blank" rel="noreferrer" className="button" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>Netdata</a>
            <a href="https://status.wwjjhh.online" target="_blank" rel="noreferrer" className="button" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>Kuma</a>
          </div>
        </div>

        {srv && <ServerCards srv={srv} />}

        {cf && <TraficCharts week={cf.week_chart} month={cf.month_chart} today={cf.today} />}
      </div>
    </>
  );
}
