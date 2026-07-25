"use client";

interface CfDay { t: string; requests: number; views: number; threats: number; bytes: number; uniques: number }
interface CfStats {
  now: string;
  today: { requests: string; requestsRaw: number; bandwidth: string; views: string; viewsRaw: number; threats: number; uniques: number };
  yesterday: { requests: number; views: number; uniques: number; threats: number };
  dayOverDay: string;
  week: { totalRequests: number; totalViews: number; totalUniques: number; threats: number; dailyAvg: number };
  prevWeek: { totalRequests: number; totalViews: number; totalUniques: number };
  wow: { requests: string; views: string; uniques: string };
  peakDay: { date: string; requests: number } | null;
  periodRequests: number;
  week_chart: CfDay[];
  month_chart: { t: string; requests: number; threats: number }[];
  prev_week_chart: { t: string; requests: number; views: number }[];
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function Delta({ value, good }: { value: string; good?: "up" | "down" }) {
  const neg = value.startsWith("-");
  const pos = !neg && value !== "0.0%";
  const clr = neg ? (good === "up" ? "var(--accent-red)" : "var(--accent-green)")
    : pos ? (good === "down" ? "var(--accent-red)" : "var(--accent-green)")
    : "var(--text-dim)";
  const arrow = neg ? "↓" : pos ? "↑" : "→";
  return <span style={{ color: clr, fontWeight: 600 }}>{arrow} {value}</span>;
}

function fmtDate(d: string) {
  try { const dt = new Date(d + "T00:00:00"); return `${dt.getMonth() + 1}/${dt.getDate()}`; } catch { return d; }
}

function BarChart({ data, prevData }: { data: CfDay[]; prevData?: { t: string; requests: number }[] }) {
  if (!data || data.length < 2) return null;
  const w = 360; const h = 60; const pad = 28;
  const barW = Math.max(2, (w - pad * 2) / data.length - 2);
  const allVals = [...data.map(d => d.requests), ...(prevData || []).map(d => d.requests)];
  const mx = Math.max(1, ...allVals);
  const mn = Math.min(...allVals);

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
      {prevData?.map((d, i) => {
        if (i >= data.length) return null;
        const x = (pad + i * ((w - pad * 2) / data.length) + barW * 0.15).toFixed(1);
        const bh = Math.max(1, ((d.requests - mn) / Math.max(1, mx - mn)) * (h - 24));
        const y = (h - 12 - bh).toFixed(1);
        return <rect key={`p-${i}`} x={x} y={y} width={(barW * 0.35).toFixed(1)} height={bh} fill="var(--accent-yellow)" opacity="0.35"/>;
      })}
      {data.map((d, i) => {
        const x = (pad + i * ((w - pad * 2) / data.length)).toFixed(1);
        const bh = Math.max(2, ((d.requests - mn) / Math.max(1, mx - mn)) * (h - 24));
        const y = (h - 12 - bh).toFixed(1);
        return <rect key={i} x={x} y={y} width={barW} height={bh} fill="var(--accent-blue)" opacity="0.7"/>;
      })}
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
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
      {keys.map((k, ki) => {
        const pts = data.map((d, i) => {
          const x = (pad + i * step).toFixed(1);
          const y = (h - 12 - ((Number(d[k.key]) || 0) / allMax) * (h - 16)).toFixed(1);
          return `${x},${y}`;
        }).join(" ");
        return <polyline key={k.key} points={pts} fill="none" stroke={k.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ki > 0 ? "3 2" : "0"}/>;
      })}
      <text x={pad} y={h - 2} fill="var(--text-dim)" fontSize="8">{fmtDate(data[0].t)}</text>
      <text x={w - pad} y={h - 2} fill="var(--text-dim)" fontSize="8" textAnchor="end">{fmtDate(data[data.length - 1].t)}</text>
    </svg>
  );
}

export default function TraficCharts({ now, today, yesterday, dayOverDay, week: weekMeta, prevWeek, wow, peakDay, periodRequests, week_chart, month_chart, prev_week_chart }: CfStats) {
  return (
    <>
      {/* 核心曝光 KPI */}
      <div className="dash-section"><h2>Exposure · 曝光总览</h2></div>
      <div className="dash-grid">
        <div className="dash-card">
          <div className="label">今日访客</div>
          <div className="value">{today.uniques}</div>
          <div className="sub">
            独立 IP · <Delta value={dayOverDay} good="up" /> 较昨日
          </div>
        </div>
        <div className="dash-card">
          <div className="label">今日浏览量</div>
          <div className="value">{today.views}</div>
          <div className="sub">页面展示次数</div>
        </div>
        <div className="dash-card">
          <div className="label">本周访问量</div>
          <div className="value">{fmtNum(weekMeta.totalRequests)}</div>
          <div className="sub">
            <Delta value={wow.requests} good="up" /> 较上周
          </div>
        </div>
        <div className="dash-card">
          <div className="label">本周访客</div>
          <div className="value">{fmtNum(weekMeta.totalUniques)}</div>
          <div className="sub">
            <Delta value={wow.uniques} good="up" /> 较上周
          </div>
        </div>
        <div className="dash-card">
          <div className="label">日均请求（本周）</div>
          <div className="value">{fmtNum(weekMeta.dailyAvg)}</div>
          <div className="sub">{periodRequests > 0 ? `近 60 日共 ${fmtNum(periodRequests)}` : ""}</div>
        </div>
        {peakDay && (
          <div className="dash-card">
            <div className="label">本月峰值日</div>
            <div className="value">{fmtNum(peakDay.requests)}</div>
            <div className="sub">{peakDay.date}</div>
          </div>
        )}
      </div>

      {/* 今日流量卡片 */}
      <div className="dash-section"><h2>Today · 今日</h2><span className="muted">{now}</span></div>
      <div className="dash-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <div className="dash-card">
          <div className="label">Requests</div>
          <div className="value">{today.requests}</div>
          <div className="sub"><Delta value={dayOverDay} good="up" /> vs {fmtNum(yesterday.requests)} 昨日</div>
        </div>
        <div className="dash-card">
          <div className="label">Bandwidth</div>
          <div className="value">{today.bandwidth}B</div>
        </div>
        <div className="dash-card">
          <div className="label">Views</div>
          <div className="value">{today.views}</div>
        </div>
        <div className="dash-card">
          <div className="label">Uniques</div>
          <div className="value">{today.uniques}</div>
          <div className="sub">{today.uniques > 0 ? `${(today.viewsRaw / today.uniques).toFixed(1)} views/visitor` : ""}</div>
        </div>
        <div className="dash-card">
          <div className="label">Threats</div>
          <div className="value" style={{ color: today.threats > 0 ? "var(--accent-red)" : "var(--accent-green)" }}>{today.threats}</div>
        </div>
      </div>

      {/* 周同比对比 */}
      {week_chart && week_chart.length > 1 && (
        <>
          <div className="dash-section"><h2>Traffic · 7 Days</h2>
            <span className="muted">
              本周 {fmtNum(weekMeta.totalRequests)} · 上周 {fmtNum(prevWeek.totalRequests)}
              <span style={{ marginLeft: 8 }}><Delta value={wow.views} good="up" /> 浏览量</span>
            </span>
          </div>
          <div className="chart-row">
            <div className="chart-card">
              <div className="chart-label" style={{ color: "var(--accent-blue)" }}>Requests / Day <span style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>（淡色=上周同期）</span></div>
              <BarChart data={week_chart} prevData={prev_week_chart} />
            </div>
            <div className="chart-card">
              <div className="chart-label" style={{ color: "var(--accent-green)" }}>Views & Uniques</div>
              {LineChart({ data: week_chart, keys: [{ key: "views", color: "var(--accent-green)" }, { key: "uniques", color: "var(--accent-yellow)" }] })}
            </div>
            <div className="chart-card">
              <div className="chart-label" style={{ color: "var(--accent-red)" }}>Threats</div>
              {LineChart({ data: week_chart, keys: [{ key: "threats", color: "var(--accent-red)" }] })}
            </div>
          </div>
        </>
      )}

      {/* 30 天趋势 */}
      {month_chart && month_chart.length > 2 && (
        <>
          <div className="dash-section"><h2>Traffic · 30 Days</h2></div>
          <div className="chart-card" style={{ maxWidth: 700 }}>
            <div className="chart-label" style={{ color: "var(--text-dim)" }}>Requests & Threats</div>
            {LineChart({ data: month_chart, keys: [{ key: "requests", color: "var(--accent-blue)" }, { key: "threats", color: "var(--accent-red)" }] })}
          </div>
        </>
      )}
    </>
  );
}
