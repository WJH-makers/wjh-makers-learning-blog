"use client";

interface CfDay { t: string; requests: number; views: number; threats: number; bytes: number; uniques: number }
interface Today { requests: string; bandwidth: string; views: string; threats: number; uniques: number }

function BarChart({ data }: { data: CfDay[] }) {
  if (!data || data.length < 2) return null;
  const w = 360; const h = 60; const pad = 28; const barW = Math.max(2, (w - pad * 2) / data.length - 2);
  const mx = Math.max(1, ...data.map(d => d.requests));
  const mn = Math.min(...data.map(d => d.requests));

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      {data.map((d, i) => {
        const x = (pad + i * ((w - pad * 2) / data.length)).toFixed(1);
        const bh = Math.max(2, ((d.requests - mn) / Math.max(1, mx - mn)) * (h - 24));
        const y = (h - 12 - bh).toFixed(1);
        return `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" fill="var(--accent-blue)" rx="1" opacity="0.7"/>`;
      }).join("")}
      <text x={pad} y={h - 2} fill="var(--text-dim)" fontSize="8">{fmtDate(data[0].t)}</text>
      <text x={w - pad} y={h - 2} fill="var(--text-dim)" fontSize="8" textAnchor="end">{fmtDate(data[data.length - 1].t)}</text>
    </svg>
  );
}

function LineChart({ data, keys }: { data: any[]; keys: { key: string; color: string }[] }) {
  if (!data || data.length < 2) return null;
  const w = 360; const h = 60; const pad = 28;
  const allMax = Math.max(1, ...data.flatMap(d => keys.map(k => Number(d[k.key]) || 0)));
  const step = (w - pad * 2) / (data.length - 1);

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      {keys.map((k, ki) => {
        const pts = data.map((d, i) => {
          const x = (pad + i * step).toFixed(1);
          const y = (h - 12 - ((Number(d[k.key]) || 0) / allMax) * (h - 16)).toFixed(1);
          return `${x},${y}`;
        }).join(" ");
        return `<polyline points="${pts}" fill="none" stroke="${k.color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${ki > 0 ? "3 2" : "0"}"/>`;
      }).join("")}
      <text x={pad} y={h - 2} fill="var(--text-dim)" fontSize="8">{fmtDate(data[0].t)}</text>
      <text x={w - pad} y={h - 2} fill="var(--text-dim)" fontSize="8" textAnchor="end">{fmtDate(data[data.length - 1].t)}</text>
    </svg>
  );
}

function fmtDate(d: string) {
  try { const dt = new Date(d + "T00:00:00"); return `${dt.getMonth() + 1}/${dt.getDate()}`; } catch { return d; }
}

export default function TraficCharts({ week, month, today }: { week: CfDay[]; month: { t: string; requests: number; threats: number }[]; today: Today }) {
  return (
    <>
      <div className="dash-section"><h2>Traffic · 7 Days</h2></div>
      <div className="dash-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <div className="dash-card"><div className="label">Requests</div><div className="value">{today.requests}</div></div>
        <div className="dash-card"><div className="label">Bandwidth</div><div className="value">{today.bandwidth}B</div></div>
        <div className="dash-card"><div className="label">Views</div><div className="value">{today.views}</div></div>
        <div className="dash-card"><div className="label">Uniques</div><div className="value">{today.uniques}</div></div>
        <div className="dash-card"><div className="label">Threats</div><div className="value" style={{ color: today.threats > 0 ? "var(--accent-red)" : "var(--accent-green)" }}>{today.threats}</div></div>
      </div>

      {week && week.length > 1 && (
        <div className="chart-row">
          <div className="chart-card">
            <div className="chart-label" style={{ color: "var(--accent-blue)" }}>Requests / Day</div>
            <BarChart data={week} />
          </div>
        <div className="chart-card">
          <div className="chart-label" style={{ color: "var(--accent-green)" }}>Views & Uniques</div>
            {LineChart({ data: week, keys: [{ key: "views", color: "var(--accent-green)" }, { key: "uniques", color: "var(--accent-yellow)" }] })}
          </div>
          <div className="chart-card">
            <div className="chart-label" style={{ color: "var(--accent-red)" }}>Threats</div>
            {LineChart({ data: week, keys: [{ key: "threats", color: "#e74c3c" }] })}
          </div>
        </div>
      )}

      {month && month.length > 2 && (
        <>
          <div className="dash-section"><h2>Traffic · 30 Days</h2></div>
          <div className="chart-card" style={{ maxWidth: 700 }}>
            <div className="chart-label" style={{ color: "var(--text-dim)" }}>Requests & Threats</div>
            {LineChart({ data: month, keys: [{ key: "requests", color: "var(--accent-blue)" }, { key: "threats", color: "#e74c3c" }] })}
          </div>
        </>
      )}
    </>
  );
}
