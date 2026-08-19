import { NextResponse } from "next/server";
import { isMonitorAuthed } from "@/lib/monitor-auth";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const execFileAsync = promisify(execFile);


const DATA_FILE = "/tmp/monitor-history.json";

type Point = { t: number; cpu: number; mem: number; load: number };

const MAX_POINTS = 10080;
const MAX_FILE_SIZE = 512_000;

function readProcFile(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

// 结果缓存:避免每次请求(SSR + 客户端 60s 轮询)都 fork 子进程,兼作 DoS 缓冲。
let cache: { at: number; body: unknown } | null = null;
const CACHE_MS = 5000;

// 只执行固定的可执行文件和参数,不经过 shell 解析;失败返回空串由调用方兜底。
async function commandOutput(file: string, args: string[], timeout: number): Promise<string> {
  try {
    const { stdout } = await execFileAsync(file, args, { timeout, encoding: "utf8" });
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
    try { writeFileSync(DATA_FILE, "[]"); } catch {}
    return [];
  }
}

function saveHistory(data: Point[]) {
  const trimmed = data.length > MAX_POINTS ? data.slice(-MAX_POINTS) : data;
  const json = JSON.stringify(trimmed);
  if (json.length > MAX_FILE_SIZE) {
    try { writeFileSync(DATA_FILE, JSON.stringify(trimmed.slice(-5000))); } catch {}
    return;
  }
  try { writeFileSync(DATA_FILE, json); } catch {}
}

async function collect(): Promise<Point> {
  let cpu = 0;
  let memPct = 0;
  let load = 0;

  const topRaw = await commandOutput("top", ["-bn1", "-d0.3"], 6000);
  const m = topRaw.match(/(\d+\.?\d*)\s*id/);
  cpu = m ? Math.round(100 - parseFloat(m[1])) : 0;

  const mraw = (await commandOutput("free", ["-m"], 3000))
    .split(/\r?\n/)
    .find((line) => /^\s*Mem:\s/.test(line)) ?? "";
  if (mraw) {
    const parts = mraw.trim().split(/\s+/);
    const total = parseInt(parts[1], 10);
    const used = parseInt(parts[2], 10);
    memPct = total ? Math.round((used / total) * 100) : 0;
  }

  const la = readProcFile("/proc/loadavg");
  if (la) load = parseFloat(la.split(/\s+/)[0]) || 0;

  return { t: Date.now(), cpu, mem: memPct, load };
}

async function parseUptime(): Promise<string> {
  const s = parseInt(readProcFile("/proc/uptime").split(" ")[0], 10);
  return Number.isNaN(s) ? "?" : `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

async function parseDisk(): Promise<string> {
  const output = await commandOutput("df", ["-h", "/"], 5000);
  const row = output.split(/\r?\n/).find((line) => line.trim().endsWith("/"));
  if (!row) return "?";
  const parts = row.trim().split(/\s+/);
  return parts.length >= 6 ? `${parts[2]}/${parts[1]} (${parts[4]})` : "?";
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
  const lastTs = history.at(-1)?.t ?? 0;

  const point = await collect();

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
    uptime: await parseUptime(),
    disk: await parseDisk(),
    day: downsample(history.filter((p) => p.t >= dayAgo), 48),
    week: downsample(history.filter((p) => p.t >= weekAgo), 56),
  };

  cache = { at: Date.now(), body };
  return NextResponse.json(body);
}
