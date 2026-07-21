import ServerCards from "./ServerCards";
import TraficCharts from "./TraficCharts";

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
    const r = await fetch(`${base}${path}`, { cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

export default async function MonitorPage() {
  const [srv, cf] = await Promise.all([get<Srv>("/api/server-stats"), get<CfStats>("/api/cf-stats")]);

  return (
    <>
      <style>{`
        :root { --card-bg: #ffffff; --card-border: #e5e7eb; --card-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04); --text-dim: #6b7280; --text-bright: #111827; --accent-green: #059669; --accent-red: #dc2626; --accent-blue: #2563eb; --accent-yellow: #d97706; --accent-purple: #7c3aed; }
        .dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 12px 0; }
        .dash-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 10px; padding: 18px 20px; box-shadow: var(--card-shadow); }
        .dash-card .label { font-size: 0.72rem; color: var(--text-dim); font-weight: 500; letter-spacing: 0.04em; margin-bottom: 8px; }
        .dash-card .value { font-size: 1.75rem; font-weight: 700; color: var(--text-bright); font-variant-numeric: tabular-nums; line-height: 1.1; }
        .dash-card .sub { font-size: 0.72rem; color: var(--text-dim); margin-top: 6px; }
        .dash-section { display: flex; align-items: center; justify-content: space-between; margin: 24px 0 10px; }
        .dash-section h2 { font-size: 1.05rem; font-weight: 600; color: var(--text-bright); }
        .dash-section .muted { font-size: 0.75rem; color: var(--text-dim); }
        .chart-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-bottom: 8px; }
        .chart-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 10px; padding: 14px 16px 10px; box-shadow: var(--card-shadow); }
        .chart-card .chart-label { font-size: 0.68rem; color: var(--text-dim); font-weight: 500; letter-spacing: 0.04em; margin-bottom: 6px; }
        .chart-card svg { width: 100%; }
        @media (max-width: 600px) { .dash-grid { grid-template-columns: repeat(2, 1fr); } .dash-card .value { font-size: 1.4rem; } }
      `}</style>
      <div className="page-shell" style={{ maxWidth: 1080, margin: "0 auto", padding: "0 16px 40px" }}>
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
