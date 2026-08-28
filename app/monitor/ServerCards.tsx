"use client";

import { useEffect, useId, useState } from "react";

export interface Point { t: number; cpu: number; mem: number; load: number }
export interface Srv { cpu: number; mem: number; load: number; uptime: string; disk: string; day: Point[]; week: Point[] }

function AreaChart({ data, maxH, color, yKey, label }: { data: Point[]; maxH?: number; color: string; yKey: "cpu" | "mem" | "load"; label: string }) {
  const gradId = useId();
  if (!data || data.length < 2) return null;
  const w = 360; const h = 72; const pad = 36;
  const vals = data.map(d => d[yKey]);
  const mn = Math.min(...vals);
  const mxVal = maxH ? Math.max(5, maxH) : Math.max(5, ...vals);
  const range = Math.max(mxVal - mn, 1);
  const step = (w - pad * 2) / (data.length - 1);

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
        return <line key={i} x1={pad} y1={y} x2={w - pad} y2={y} style={{ stroke: "var(--monitor-grid)" }} strokeWidth="0.5" />;
      })}
      <polygon points={`${pad},${h - 16} ${area} ${w - pad},${h - 16}`} fill={`url(#${gradId})`} />
      <polyline points={area} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <text x={pad - 6} y={h - 4} style={{ fill: "var(--monitor-axis)" }} fontSize="9" textAnchor="end">
        {fmtTime(data[0].t, data.length > 200 ? "week" : "day")}
      </text>
      <text x={w - pad + 4} y={h - 4} style={{ fill: "var(--monitor-axis)" }} fontSize="9">
        {fmtTime(data[data.length - 1].t, data.length > 200 ? "week" : "day")}
      </text>
      <text x={pad + 2} y={12} style={{ fill: "var(--monitor-axis)" }} fontSize="9">{label} · max {Math.round(mxVal)}</text>
    </svg>
  );
}

function fmtTime(ts: number, mode: string): string {
  const d = new Date(ts);
  return mode === "week" ? `${d.getMonth() + 1}/${d.getDate()}` : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const POLL_MS = 30_000;
// 15s 而不是 10s:server-stats 一次冷取样最坏是 top 6s + free 3s + df 5s 顺序串起来 = 14s
// (见 app/api/server-stats/route.ts 的三个 timeout)。10s 会在慢机器上把「本来会成功的请求」
// 判成过期,比不设超时更糟 —— 那是自造的假警报。路由自身有 5s 结果缓存,常态远快于此。
const FETCH_TIMEOUT_MS = 15_000;
// 连续两个周期(约 60s)没取到才置过期:单次抖动就变脸会让面板一直闪。
const STALE_AFTER_FAILURES = 2;

export default function ServerCards({ srv: initial }: { srv: Srv }) {
  const [d, setD] = useState(initial);
  // null = 还没有任何一次客户端成功取数,此时展示的是 SSR 那一份。
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [failures, setFailures] = useState(0);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let ok = true;
    async function poll() {
      while (ok) {
        // 原来一行写完:catch {} 全空 + 非 2xx 被 if (r.ok) 静静丢掉 + 没有超时。
        // 后果是 cookie 过 8h 期后 /api/server-stats 返回 401,setD 不执行、catch 不触发、
        // 控制台干净、UI 一个像素不变,面板继续把几小时前的 MEM/Load 当实时值涂色。
        // 现在三种结局分开处理,并且每种都留日志 —— 这台面板只有站长一人看,
        // 出问题时唯一的线索就是控制台。
        try {
          const r = await fetch("/api/server-stats", { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
          if (r.ok) {
            const next = (await r.json()) as Srv;
            if (!ok) return;
            setD(next);
            setUpdatedAt(Date.now());
            setFailures(0);
          } else if (r.status === 401) {
            // 会话过期是唯一「重试也不会好」的分支:直接停掉轮询,省下每 30s 一次的无效请求。
            console.error("[monitor] 轮询遇 401,监控会话已过期,停止轮询");
            setExpired(true);
            return;
          } else {
            console.error(`[monitor] 轮询失败 status=${r.status},面板数据可能已过期`);
            setFailures(n => n + 1);
          }
        } catch (error) {
          // AbortSignal.timeout 到点抛的是 TimeoutError,和网络中断走同一条路:都算这一轮没取到。
          console.error("[monitor] 轮询请求异常,面板数据可能已过期:", error);
          if (!ok) return;
          setFailures(n => n + 1);
        }
        await new Promise(r => setTimeout(r, POLL_MS));
      }
    }
    poll();
    return () => { ok = false; };
  }, []);

  if (!d) return null;

  const stale = expired || failures >= STALE_AFTER_FAILURES;
  // 过期时把阈值涂色一并中和:红/黄本身就在说「这是现在的实况」,
  // 留着颜色等于用旧数据发实时警报。置灰不用 opacity —— 那会把对比度一起压掉。
  const valueColor = (live: string) => (stale ? "var(--text-bright)" : live);

  return (
    <>
      {/* 数据时间常驻:面板上原来没有任何一个字说明这些数字是什么时候的,
          于是「停在旧数据上」和「一切正常」长得完全一样。 */}
      <div className="dash-freshness">
        {/* updatedAt 初值必须是 null 而不是 Date.now():后者在 SSR 与 hydration 两侧算出不同的
            时钟(还会撞上时区差),React 会报 hydration 不一致。挂载后第一轮轮询立刻把它填上。 */}
        <span>数据时间 {updatedAt ? fmtTime(updatedAt, "day") : "本页载入时"}</span>
        {/* live region 挂在常驻的外壳上、只换内部内容:带 role 的元素必须先在 DOM 里,
            内容后变才会被播报(和 MonitorLogin 的 role="alert" 同一条道理)。
            不给上面那行时间挂 role:它每 30s 变一次,挂上就是每 30s 打断一次读屏。
            徽章文案是静态的、不含失败次数,所以不会反复重播。 */}
        <span role="status">
          {stale ? (
            <strong className="dash-stale">
              {expired ? (
                <>会话已过期 · <a href="/monitor">重新登录</a></>
              ) : (
                "数据已过期 · 取数失败"
              )}
            </strong>
          ) : null}
        </span>
      </div>

      <div className="dash-grid">
        <div className="dash-card">
          <div className="label">CPU</div>
          <div className="value" style={{ color: valueColor(d.cpu > 80 ? "var(--accent-red)" : d.cpu > 50 ? "var(--accent-yellow)" : "var(--accent-blue)") }}>{d.cpu}%</div>
          <div className="sub">Load {d.load.toFixed(1)}</div>
        </div>
        <div className="dash-card">
          <div className="label">Memory</div>
          <div className="value" style={{ color: valueColor(d.mem > 80 ? "var(--accent-red)" : d.mem > 60 ? "var(--accent-yellow)" : "var(--accent-green)") }}>{d.mem}%</div>
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
          <div className="chart-label" style={{ color: "var(--accent-blue)" }}>CPU</div>
          {d.day && <AreaChart data={d.day} color="var(--accent-blue)" yKey="cpu" label="CPU %" />}
        </div>
        <div className="chart-card">
          <div className="chart-label" style={{ color: "var(--accent-green)" }}>Memory</div>
          {d.day && <AreaChart data={d.day} color="var(--accent-green)" yKey="mem" label="MEM %" />}
        </div>
        <div className="chart-card">
          <div className="chart-label" style={{ color: "var(--accent-yellow)" }}>Load</div>
          {d.day && <AreaChart data={d.day} maxH={Math.max(2, ...d.day.map(p => p.load))} color="var(--accent-purple)" yKey="load" label="Load" />}
        </div>
      </div>

      <div className="dash-section"><h2>7 Days</h2></div>
      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-label" style={{ color: "var(--accent-blue)" }}>CPU</div>
          {d.week && <AreaChart data={d.week} color="var(--accent-blue)" yKey="cpu" label="CPU %" />}
        </div>
        <div className="chart-card">
          <div className="chart-label" style={{ color: "var(--accent-green)" }}>Memory</div>
          {d.week && <AreaChart data={d.week} color="var(--accent-green)" yKey="mem" label="MEM %" />}
        </div>
        <div className="chart-card">
          <div className="chart-label" style={{ color: "var(--accent-yellow)" }}>Load</div>
          {d.week && <AreaChart data={d.week} maxH={Math.max(2, ...d.week.map(p => p.load))} color="var(--accent-purple)" yKey="load" label="Load" />}
        </div>
      </div>
    </>
  );
}
