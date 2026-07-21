"use client";

import { useEffect, useState } from "react";

interface Point { t: number; cpu: number; mem: number; load: number }
interface Srv { cpu: number; mem: number; load: number; uptime: string; disk: string; day: Point[]; week: Point[] }

function AreaChart({ data, maxH, color, yKey, label }: { data: Point[]; maxH?: number; color: string; yKey: "cpu" | "mem" | "load"; label: string }) {
  if (!data || data.length < 2) return null;
  const w = 360; const h = 72; const pad = 36;
  const vals = data.map(d => d[yKey]);
  const mn = Math.min(...vals);
  const mxVal = maxH ? Math.max(5, maxH) : Math.max(5, ...vals);
  const range = Math.max(mxVal - mn, 1);
  const step = (w - pad * 2) / (data.length - 1);
  const gradId = `g-${Math.random().toString(36).slice(2, 8)}`;

  const area = data.map((d, i) => {
    const v = d[yKey];
    const y = (h - 16 - ((v - mn) / range) * (h - 26)).toFixed(1);
    return `${(pad + i * step).toFixed(1)},${y}`;
  }).join(" ");

  const peak = mxVal;
  const mid = Math.round((mn + mxVal) / 2);

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[mn, mid, peak].map((v, i) => {
        const y = (h - 16 - ((v - mn) / range) * (h - 26)).toFixed(1);
        return <line key={i} x1={pad} y1={y} x2={w - pad} y2={y} stroke="#f3f4f6" strokeWidth="0.5" />;
      })}
      <polygon points={`${pad},${h - 16} ${area} ${w - pad},${h - 16}`} fill={`url(#${gradId})`} />
      <polyline points={area} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <text x={pad - 6} y={h - 4} fill="#9ca3af" fontSize="9" textAnchor="end">
        {fmtTime(data[0].t, data.length > 200 ? "week" : "day")}
      </text>
      <text x={w - pad + 4} y={h - 4} fill="#9ca3af" fontSize="9">
        {fmtTime(data[data.length - 1].t, data.length > 200 ? "week" : "day")}
      </text>
      <text x={pad + 2} y={12} fill="#9ca3af" fontSize="9">{label} · max {Math.round(mxVal)}</text>
    </svg>
  );
}

function fmtTime(ts: number, mode: string): string {
  const d = new Date(ts);
  return mode === "week" ? `${d.getMonth() + 1}/${d.getDate()}` : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function metric(cpu: number) { return cpu.toString(); }
function loadMetric(l: number) { return l.toString(); }
function memMetric(m: number) { return m.toString(); }

export default function ServerCards({ srv: initial }: { srv: Srv }) {
  const [d, setD] = useState(initial);

  useEffect(() => {
    let ok = true;
    async function poll() {
      while (ok) {
        try { const r = await fetch("/api/server-stats"); if (r.ok && ok) setD(await r.json()); } catch {}
        await new Promise(r => setTimeout(r, 30000));
      }
    }
    poll();
    return () => { ok = false; };
  }, []);

  if (!d) return null;

  return (
    <>
      <div className="dash-grid">
        <div className="dash-card">
          <div className="label">CPU</div>
          <div className="value" style={{ color: d.cpu > 80 ? "var(--accent-red)" : d.cpu > 50 ? "var(--accent-yellow)" : "var(--accent-blue)" }}>{d.cpu}%</div>
          <div className="sub">Load {d.load.toFixed(1)}</div>
        </div>
        <div className="dash-card">
          <div className="label">Memory</div>
          <div className="value" style={{ color: d.mem > 80 ? "var(--accent-red)" : d.mem > 60 ? "var(--accent-yellow)" : "var(--accent-green)" }}>{d.mem}%</div>
          <div className="sub">{d.disk.split(" ")[0]} disk used</div>
        </div>
        <div className="dash-card">
          <div className="label">Uptime</div>
          <div className="value">{d.uptime}</div>
          <div className="sub">disk {d.disk}</div>
        </div>
        <div className="dash-card">
          <div className="label">Data Points</div>
          <div className="value">{d.day.length}+{d.week.length}</div>
          <div className="sub">24h + 7d samples</div>
        </div>
      </div>

      <div className="dash-section"><h2>24 Hours</h2></div>
      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-label" style={{ color: "#2563eb" }}>CPU</div>
          {d.day && <AreaChart data={d.day} color="#2563eb" yKey="cpu" label="CPU %" />}
        </div>
        <div className="chart-card">
          <div className="chart-label" style={{ color: "var(--accent-blue)" }}>Memory</div>
          {d.day && <AreaChart data={d.day} color="#059669" yKey="mem" label="MEM %" />}
        </div>
        <div className="chart-card">
          <div className="chart-label" style={{ color: "var(--accent-yellow)" }}>Load</div>
          {d.day && <AreaChart data={d.day} maxH={Math.max(2, ...d.day.map(p => p.load))} color="#7c3aed" yKey="load" label="Load" />}
        </div>
      </div>

      <div className="dash-section"><h2>7 Days</h2></div>
      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-label" style={{ color: "#2563eb" }}>CPU</div>
          {d.week && <AreaChart data={d.week} color="#2563eb" yKey="cpu" label="CPU %" />}
        </div>
        <div className="chart-card">
          <div className="chart-label" style={{ color: "var(--accent-blue)" }}>Memory</div>
          {d.week && <AreaChart data={d.week} color="#059669" yKey="mem" label="MEM %" />}
        </div>
        <div className="chart-card">
          <div className="chart-label" style={{ color: "var(--accent-yellow)" }}>Load</div>
          {d.week && <AreaChart data={d.week} maxH={Math.max(2, ...d.week.map(p => p.load))} color="#7c3aed" yKey="load" label="Load" />}
        </div>
      </div>
    </>
  );
}
