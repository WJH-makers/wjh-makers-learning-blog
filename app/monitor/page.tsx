import "./monitor.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import ServerCards, { type Srv } from "./ServerCards";
import TraficCharts, { type CfStats } from "./TraficCharts";
import MonitorLogin from "./MonitorLogin";
import { isMonitorAuthed } from "@/lib/monitor-auth";
import { INTERNAL_ORIGIN, OPS_SUBDOMAINS } from "@/lib/site-config";


export const metadata = {
  title: "站点监控",
  description: "站点运行状态与流量监控。",
  robots: { index: false, follow: false },
} satisfies Metadata;

async function get<T>(path: string): Promise<T | null> {
  try {
    const token = (await cookies()).get("monitor_token")?.value;
    const r = await fetch(`${INTERNAL_ORIGIN}${path}`, {
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
      <style>{`
        :root {
          --card-bg: rgba(var(--paper-rgb),0.9);
          --text-dim: var(--neutral-500);
          --text-bright: var(--foreground);
          --accent-green: #6f8a5e;
          --accent-red: var(--accent);
          --accent-blue: #5a7d9a;
          --accent-yellow: #b8923c;
          --accent-purple: #7a6b8c;
          --monitor-grid: var(--neutral-200);
          --monitor-axis: var(--neutral-400);
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --accent-blue: #7a9dba;
            --accent-green: #8aaa7e;
            --accent-yellow: #c8a24c;
            --accent-purple: #9a8bac;
          }
        }
        .dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 12px 0; }
        .dash-card { background: var(--card-bg); border: 1px solid var(--border); padding: 16px 18px; transition: box-shadow .2s,transform .2s; }
        .dash-card:hover { box-shadow: 4px 4px 0 0 var(--foreground); transform: translate(-2px,-2px); }
        .dash-card .label { font-size: .68rem; color: var(--text-dim); font-weight: 600; letter-spacing: .06em; margin-bottom: 6px; font-family: var(--font-mono); text-transform: uppercase; }
        .dash-card .value { font-size: 1.65rem; font-weight: 700; color: var(--foreground); font-variant-numeric: tabular-nums; line-height: 1.15; }
        .dash-card .sub { font-size: .72rem; color: var(--text-dim); margin-top: 8px; padding-top: 6px; border-top: 1px dashed var(--border); font-family: var(--font-sans); }
        .dash-section { display: flex; align-items: center; justify-content: space-between; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 2px solid var(--foreground); }
        .dash-section h2 { font-size: 1rem; font-weight: 700; color: var(--foreground); letter-spacing: .02em; font-family: var(--font-serif); }
        .dash-section .muted { font-size: .72rem; color: var(--text-dim); font-family: var(--font-mono); }
        .chart-row { display: grid; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap: 12px; margin-bottom: 8px; }
        .chart-card { background: var(--card-bg); border: 1px solid var(--border); padding: 14px 16px 10px; transition: box-shadow .2s,transform .2s; }
        .chart-card:hover { box-shadow: 4px 4px 0 0 var(--foreground); transform: translate(-2px,-2px); }
        .chart-card .chart-label { font-size: .68rem; color: var(--text-dim); font-weight: 600; letter-spacing: .06em; margin-bottom: 6px; font-family: var(--font-mono); text-transform: uppercase; }
        .chart-card svg { width: 100%; display: block; overflow: visible; }
        @media (max-width:600px) { .dash-grid { grid-template-columns: repeat(2,1fr); } .dash-card .value { font-size: 1.3rem; } }
      `}</style>
      <div className="page-shell" style={{ maxWidth: 1080, margin: "0 auto", padding: "0 16px 40px" }}>
        <div style={{ marginTop: 0, marginBottom: 20, paddingBottom: 14, borderBottom: "2px solid var(--foreground)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--neutral-500)" }}>
                站点曝光 · Watchtower
              </span>
              <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.7rem", fontWeight: 700, margin: "2px 0 0", lineHeight: 1.15, letterSpacing: "-.02em" }}>
                瞭望塔
              </h1>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <a href={OPS_SUBDOMAINS.netdata} target="_blank" rel="noreferrer" className="button" style={{ fontSize: ".7rem", padding: "3px 10px", minHeight: 32 }}>Netdata</a>
              <a href={OPS_SUBDOMAINS.uptimeKuma} target="_blank" rel="noreferrer" className="button" style={{ fontSize: ".7rem", padding: "3px 10px", minHeight: 32 }}>Kuma</a>
            </div>
          </div>
          {srv && (
            <p style={{ margin: "8px 0 0", color: "var(--neutral-600)", fontSize: ".85rem", fontFamily: "var(--font-sans)" }}>
              运行 {srv.uptime} · CPU {srv.cpu}% · MEM {srv.mem}% · Load {srv.load.toFixed(1)}
            </p>
          )}
        </div>

        {srv && <ServerCards srv={srv} />}

        {cf && <TraficCharts {...cf} />}
      </div>
    </>
  );
}
