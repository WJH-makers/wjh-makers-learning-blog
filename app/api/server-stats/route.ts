import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseMeminfo(): { total: number; used: number; free: number; pct: number } {
  try {
    const raw = execSync("cat /proc/meminfo", { encoding: "utf8", timeout: 3000 });
    const get = (key: string) => {
      const m = raw.match(new RegExp(`^${key}:\\s+(\\d+)`, "m"));
      return m ? parseInt(m[1], 10) : 0;
    };
    const total = get("MemTotal");
    const available = get("MemAvailable");
    const used = total - available;
    return {
      total: Math.round(total / 1024),
      used: Math.round(used / 1024),
      free: Math.round(available / 1024),
      pct: total ? Math.round((used / total) * 100) : 0,
    };
  } catch {
    return { total: 0, used: 0, free: 0, pct: 0 };
  }
}

function parseLoadavg(): { load1: number; load5: number; load15: number } {
  try {
    const raw = execSync("cat /proc/loadavg", { encoding: "utf8", timeout: 3000 }).trim();
    const [l1, l5, l15] = raw.split(/\s+/).map(Number);
    return { load1: l1, load5: l5, load15: l15 };
  } catch {
    return { load1: 0, load5: 0, load15: 0 };
  }
}

function parseUptime(): string {
  try {
    const raw = execSync("cat /proc/uptime", { encoding: "utf8", timeout: 3000 });
    const secs = parseInt(raw.split(" ")[0], 10);
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  } catch {
    return "?";
  }
}

export async function GET() {
  const mem = parseMeminfo();
  const load = parseLoadavg();
  const uptime = parseUptime();

  const cpu = execSync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'", { encoding: "utf8", timeout: 5000 }).trim();
  const cpuPct = parseFloat(cpu) || 0;

  const disk = execSync("df -h / | tail -1 | awk '{print $3\"/\"$2\" (\"$5\")\"}'", { encoding: "utf8", timeout: 5000 }).trim();

  return NextResponse.json({
    cpu: Math.round(cpuPct),
    mem,
    load,
    uptime,
    disk,
  });
}
