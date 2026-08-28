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

// 取数结果显式区分「拿到了」「HTTP 说不行」「根本没连上」三种。
// 原来三种一起塌成 null,页面靠 {srv && ...} 短路,板块直接从页面上消失 ——
// 管理员看不出是「没配 CLOUDFLARE_TOKEN」「CF 挂了」还是「token 过期」,服务端也没有一行日志可查。
type Fetched<T> = { ok: true; data: T } | { ok: false; reason: "http" | "network"; status?: number };

async function get<T>(path: string): Promise<Fetched<T>> {
  try {
    const token = (await cookies()).get("monitor_token")?.value;
    const r = await fetch(`${INTERNAL_ORIGIN}${path}`, {
      cache: "no-store",
      headers: token ? { cookie: `monitor_token=${token}` } : undefined,
      // 打的是同进程 127.0.0.1,正常不会挂;这道超时只为兜住「连上了但对端不回」。
      // 15s 而非 10s:server-stats 一次冷取样最坏 top 6s + free 3s + df 5s = 14s。
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) {
      console.error(`[monitor] ${path} 返回 ${r.status},该板块按降级渲染`);
      return { ok: false, reason: "http", status: r.status };
    }
    return { ok: true, data: (await r.json()) as T };
  } catch (error) {
    console.error(`[monitor] ${path} 请求失败,该板块按降级渲染:`, error);
    return { ok: false, reason: "network" };
  }
}

// 503 是 cf-stats 在 CLOUDFLARE_TOKEN/ZONE 未配置时的专用码(app/api/cf-stats/route.ts:52),
// 和「配了但挂了」的 502 是两件事,提示必须分开说,否则最常态的那次故障最难判。
function degradedText(r: { reason: "http" | "network"; status?: number }): string {
  if (r.reason === "network") return "请求未能送达接口（进程内 fetch 失败或超时）。";
  if (r.status === 503) return "接口报「未配置」，通常是缺 CLOUDFLARE_TOKEN 或 CLOUDFLARE_ZONE_ID。";
  if (r.status === 401) return "监控会话已过期，请重新登录。";
  return `接口返回 ${r.status}，上游取数失败（详见服务端日志）。`;
}

function Degraded({ label, result }: { label: string; result: { reason: "http" | "network"; status?: number } }) {
  return (
    <div className="dash-degraded">
      <div className="label">{label}</div>
      <p>{degradedText(result)}</p>
    </div>
  );
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
        .dash-freshness { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 14px 0 0; font-size: .72rem; font-family: var(--font-mono); color: var(--text-dim); }
        /* 过期徽章走 --accent-ink 而不是 --accent-red(= --accent):这是 12px 粗体小字,
           按 4.5:1 判,浅色下 --accent 只有 2.96:1。同 .form-error 的取舍。 */
        .dash-freshness .dash-stale { padding: 2px 8px; border: 1px solid var(--accent); color: var(--accent-ink); font-weight: 700; }
        .dash-freshness .dash-stale a { text-decoration: underline; }
        /* 接口挂了 ≠ 没有数据:整块消失时管理员看不出是「没配」还是「挂了」,这块专门说清哪种。 */
        .dash-degraded { margin: 14px 0; padding: 14px 16px; border: 1px solid var(--border); border-left: 4px solid var(--accent); background: var(--card-bg); }
        .dash-degraded .label { font-size: .68rem; color: var(--text-dim); font-weight: 600; letter-spacing: .06em; margin-bottom: 6px; font-family: var(--font-mono); text-transform: uppercase; }
        .dash-degraded p { margin: 0; font-size: .85rem; color: var(--foreground); font-family: var(--font-sans); }
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
          {srv.ok && (
            <p style={{ margin: "8px 0 0", color: "var(--neutral-600)", fontSize: ".85rem", fontFamily: "var(--font-sans)" }}>
              运行 {srv.data.uptime} · CPU {srv.data.cpu}% · MEM {srv.data.mem}% · Load {srv.data.load.toFixed(1)}
            </p>
          )}
        </div>

        {srv.ok ? <ServerCards srv={srv.data} /> : <Degraded label="Server Stats" result={srv} />}

        {cf.ok ? <TraficCharts {...cf.data} /> : <Degraded label="Cloudflare Traffic" result={cf} />}
      </div>
    </>
  );
}
