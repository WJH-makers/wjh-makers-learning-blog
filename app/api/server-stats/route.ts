import { NextResponse } from "next/server";
import { isMonitorAuthed } from "@/lib/monitor-auth";
import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync, writeFileSync, existsSync, renameSync } from "fs";
import * as os from "node:os";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DATA_FILE = "/tmp/monitor-history.json";

type Point = { t: number; cpu: number; mem: number; load: number };

const MAX_POINTS = 10080;
const MAX_FILE_SIZE = 512_000;

// 结果缓存:避免每次请求(SSR + 客户端 60s 轮询)都 fork 子进程,兼作 DoS 缓冲。
let cache: { at: number; body: unknown } | null = null;
const CACHE_MS = 5000;

type CpuTicks = { idle: number; total: number };
let previousCpu: CpuTicks | undefined;

// 异步执行,永不阻塞事件循环;失败返回空串由调用方兜底。
async function sh(cmd: string, timeout: number): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { timeout, encoding: "utf8" });
    return stdout;
  } catch {
    return "";
  }
}

function loadHistory(): Point[] {
  try {
    if (!existsSync(DATA_FILE)) return [];
    const stat = readFileSync(DATA_FILE, "utf8");
    if (stat.length > MAX_FILE_SIZE) return [];
    const data: Point[] = JSON.parse(stat);
    const cutoff = Date.now() - 8 * 86400000;
    return data.filter((p) => p.t > cutoff);
  } catch {
    return [];
  }
}

function writeHistory(json: string) {
  const tempFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(tempFile, json, { encoding: "utf8", mode: 0o600 });
    renameSync(tempFile, DATA_FILE);
  } catch {
    try { writeFileSync(tempFile, "", { flag: "w" }); } catch {}
  }
}

function saveHistory(data: Point[]) {
  const trimmed = data.length > MAX_POINTS ? data.slice(-MAX_POINTS) : data;
  const json = JSON.stringify(trimmed);
  if (json.length > MAX_FILE_SIZE) {
    writeHistory(JSON.stringify(trimmed.slice(-5000)));
    return;
  }
  writeHistory(json);
}

function cpuTicks(): CpuTicks {
  return os.cpus().reduce<CpuTicks>((sum, cpu) => {
    const times = cpu.times;
    sum.idle += times.idle;
    sum.total += times.user + times.nice + times.sys + times.idle + times.irq;
    return sum;
  }, { idle: 0, total: 0 });
}

function collect(): Point {
  const currentCpu = cpuTicks();
  const totalDelta = currentCpu.total - (previousCpu?.total ?? currentCpu.total);
  const idleDelta = currentCpu.idle - (previousCpu?.idle ?? currentCpu.idle);
  previousCpu = currentCpu;
  const cpu = totalDelta > 0 ? Math.round(100 - (idleDelta / totalDelta) * 100) : 0;
  const totalMemory = os.totalmem();
  const mem = totalMemory ? Math.round(((totalMemory - os.freemem()) / totalMemory) * 100) : 0;
  return { t: Date.now(), cpu, mem, load: Math.round(os.loadavg()[0] * 10) / 10 };
}

function parseUptime(): string {
  const seconds = Math.floor(os.uptime());
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

async function parseDisk(): Promise<string> {
  const d = (await sh("df -h / | tail -1 | awk '{print $3\"/\"$2\" (\"$5\")\"}'", 5000)).trim();
  return d || "?";
}

function downsample(data: Point[], buckets: number): Point[] {
  if (data.length <= buckets * 2) return data;
  const step = Math.floor(data.length / buckets);
  const result: Point[] = [];
  for (let i = 0; i < data.length - 1; i += step) {
    const chunk = data.slice(i, Math.min(i + step, data.length));
    result.push({
      t: chunk[Math.floor(chunk.length / 2)].t,
      cpu: Math.round(chunk.reduce((s, p) => s + p.cpu, 0) / chunk.length),
      mem: Math.round(chunk.reduce((s, p) => s + p.mem, 0) / chunk.length),
      load: Math.round((chunk.reduce((s, p) => s + p.load, 0) / chunk.length) * 10) / 10,
    });
  }
  return result;
}

export async function GET() {
  if (!(await isMonitorAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json(cache.body);
  }

  const now = Date.now();
  let history = loadHistory();
  const lastTs = history.length > 0 ? history[history.length - 1].t : 0;

  const point = collect();

  const gaps = Math.min(Math.floor((now - lastTs) / 60000), 60);
  if (gaps > 0 && lastTs > 0) {
    for (let i = 1; i <= gaps; i++) {
      history.push({ t: lastTs + i * 60000, cpu: point.cpu, mem: point.mem, load: point.load });
    }
  }

  history.push(point);
  if (history.length > MAX_POINTS) history = history.slice(-MAX_POINTS);
  saveHistory(history);

  const dayAgo = now - 86400000;
  const weekAgo = now - 7 * 86400000;

  const body = {
    cpu: point.cpu,
    mem: point.mem,
    load: point.load,
    uptime: parseUptime(),
    disk: await parseDisk(),
    day: downsample(history.filter((p) => p.t >= dayAgo), 48),
    week: downsample(history.filter((p) => p.t >= weekAgo), 56),
  };

  cache = { at: Date.now(), body };
  return NextResponse.json(body);
}
