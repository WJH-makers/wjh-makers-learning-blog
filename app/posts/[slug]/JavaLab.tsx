"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { preflightJava17SingleFile, type JavaDiagnostic, type LabManifest } from "@/lib/java-labs";
import type { JavaRunResult } from "@/lib/java-runner";

type Props = { lab: LabManifest };
type RunnerState = "checking" | "available" | "unavailable";
type RunState = "idle" | "validating" | "compiling" | "running" | "success" | "failed" | "cancelled";
type ResultTab = "console" | "problems" | "expected";

function downloadSource(source: string): void {
  const url = URL.createObjectURL(new Blob([source], { type: "text/x-java-source;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "Main.java";
  anchor.click();
  URL.revokeObjectURL(url);
}

function normalizedOutput(value: string): string {
  return value.replaceAll("\r\n", "\n").trimEnd();
}

function statusCopy(state: RunState, runner: RunnerState): string {
  if (runner === "checking") return "正在连接 Java 17 沙箱";
  if (runner === "unavailable") return "执行服务待配置";
  switch (state) {
    case "validating": return "正在检查单文件边界";
    case "compiling": return "javac 正在编译 Main.java";
    case "running": return "JVM 正在运行";
    case "success": return "运行完成";
    case "failed": return "需要修复";
    case "cancelled": return "已停止";
    default: return "Java 17 沙箱就绪";
  }
}

export default function JavaLab({ lab }: Props) {
  const draftKey = `java-lab:${lab.id}:source`;
  const [source, setSource] = useState(lab.starter);
  const [stdin, setStdin] = useState(lab.stdin);
  const [runner, setRunner] = useState<RunnerState>("checking");
  const [runState, setRunState] = useState<RunState>("idle");
  const [result, setResult] = useState<JavaRunResult>();
  const [localDiagnostics, setLocalDiagnostics] = useState<JavaDiagnostic[]>([]);
  const [activeTab, setActiveTab] = useState<ResultTab>("console");
  const [saved, setSaved] = useState(true);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => source.split("\n"), [source]);
  const diagnostics = result?.diagnostics.length ? result.diagnostics : localDiagnostics;
  const expected = lab.assertions[0]?.expectedOutput ?? "";
  const passed = result?.status === "success" && normalizedOutput(result.stdout) === normalizedOutput(expected);
  const busy = runState === "validating" || runState === "compiling" || runState === "running";

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(draftKey);
    if (savedDraft) setSource(savedDraft);

    const controller = new AbortController();
    void fetch("/api/java/run", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { available?: boolean };
        setRunner(data.available ? "available" : "unavailable");
      })
      .catch(() => setRunner("unavailable"));
    return () => controller.abort();
  }, [draftKey]);

  function saveDraft(): void {
    try {
      window.localStorage.setItem(draftKey, source);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  function resetDraft(): void {
    setSource(lab.starter);
    setStdin(lab.stdin);
    setResult(undefined);
    setLocalDiagnostics([]);
    setRunState("idle");
    setActiveTab("console");
    setSaved(false);
  }

  function stopRun(): void {
    abortRef.current?.abort();
    setRunState("cancelled");
  }

  async function runCode(): Promise<void> {
    if (busy || runner !== "available") return;
    setRunState("validating");
    setResult(undefined);
    const preflight = preflightJava17SingleFile(source);
    setLocalDiagnostics([...preflight.diagnostics]);
    if (!preflight.passed) {
      setRunState("failed");
      setActiveTab("problems");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setRunState("compiling");
    setActiveTab("console");
    const runningTimer = window.setTimeout(() => setRunState("running"), 450);
    try {
      const response = await fetch("/api/java/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source, stdin, labId: lab.id }),
        signal: controller.signal,
      });
      const data = await response.json() as JavaRunResult | { error?: string };
      if (!response.ok || !("status" in data)) {
        throw new Error("error" in data ? data.error : "Java 沙箱暂时不可用。");
      }
      setResult(data);
      setLocalDiagnostics([]);
      setRunState(data.status === "success" ? "success" : "failed");
      setActiveTab(data.status === "compile_error" ? "problems" : "console");
    } catch (error) {
      if (controller.signal.aborted) return;
      setResult({
        status: "internal_error",
        statusLabel: "执行服务异常",
        stdout: "",
        stderr: error instanceof Error ? error.message : "Java 沙箱暂时不可用。",
        diagnostics: [],
        truncated: false,
      });
      setRunState("failed");
      setActiveTab("console");
    } finally {
      window.clearTimeout(runningTimer);
      abortRef.current = undefined;
    }
  }

  function editorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void runCode();
      return;
    }
    if (event.key !== "Tab") return;
    event.preventDefault();
    const target = event.currentTarget;
    const next = `${source.slice(0, target.selectionStart)}  ${source.slice(target.selectionEnd)}`;
    const cursor = target.selectionStart + 2;
    setSource(next);
    setSaved(false);
    requestAnimationFrame(() => target.setSelectionRange(cursor, cursor));
  }

  const consoleText = result
    ? [result.stdout, result.stderr].filter(Boolean).join(result.stdout && result.stderr ? "\n" : "")
    : "运行后，标准输出和异常信息会显示在这里。";

  return (
    <section className="java-lab" aria-labelledby={`lab-${lab.id}`}>
      <header className="lab-header">
        <div className="lab-title">
          <p className="eyebrow">Java Playground</p>
          <h2 id={`lab-${lab.id}`}>{lab.title}</h2>
        </div>
        <div className="lab-toolbar">
          <span className={`lab-runtime is-${runner}`}><i aria-hidden="true" />Java 17</span>
          {busy ? (
            <button type="button" className="lab-run is-stop" onClick={stopRun}>停止</button>
          ) : (
            <button type="button" className="lab-run" disabled={runner !== "available"} onClick={() => void runCode()}>
              运行代码
            </button>
          )}
          <details className="lab-more">
            <summary aria-label="更多操作" title="更多操作">•••</summary>
            <div>
              <button type="button" onClick={saveDraft}>保存到浏览器</button>
              <button type="button" onClick={() => downloadSource(source)}>下载 Main.java</button>
              <button type="button" onClick={resetDraft}>恢复初始代码</button>
            </div>
          </details>
        </div>
      </header>

      <div className="lab-workspace">
        <section className="lab-source" aria-label="源码编辑器">
          <div className="lab-pane-bar">
            <span className="is-active"><i aria-hidden="true" />Main.java{saved ? "" : " *"}</span>
            <small>{lines.length} 行</small>
          </div>
          <div className="lab-code-editor">
            <div className="lab-gutter" aria-hidden="true" ref={gutterRef}>
              {lines.map((_, index) => (
                <span key={index} className={diagnostics.some((item) => item.line === index + 1) ? "has-error" : ""}>
                  {index + 1}
                </span>
              ))}
            </div>
            <textarea
              aria-label="Main.java 源码"
              value={source}
              onChange={(event) => { setSource(event.target.value); setSaved(false); }}
              onKeyDown={editorKeyDown}
              onScroll={(event) => { if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop; }}
              spellCheck={false}
            />
          </div>
        </section>

        <aside className="lab-io" aria-label="输入与运行结果">
          <section className="lab-stdin">
            <div className="lab-pane-bar"><span>标准输入</span><small>stdin</small></div>
            <textarea
              aria-label="标准输入"
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              placeholder="程序不需要输入"
              spellCheck={false}
            />
          </section>
          <section className="lab-result">
            <div className="lab-result-tabs" role="tablist" aria-label="运行结果">
              {(["console", "problems", "expected"] as const).map((tab) => {
                const labels = { console: "控制台", problems: `问题${diagnostics.length ? ` ${diagnostics.length}` : ""}`, expected: "预期" };
                return <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}>{labels[tab]}</button>;
              })}
            </div>
            <div className="lab-result-body" role="tabpanel">
              {activeTab === "console" && <pre className={result?.stderr && !result.stdout ? "is-error" : ""}>{consoleText}</pre>}
              {activeTab === "problems" && (
                diagnostics.length ? <ol className="lab-problems">
                  {diagnostics.map((item, index) => <li key={`${item.line}-${index}`}>
                    <strong>{item.line ? `第 ${item.line} 行${item.column ? `:${item.column}` : ""}` : "编译问题"}</strong>
                    <span>{item.message}</span>
                  </li>)}
                </ol> : <p className="lab-empty">当前没有编译问题。</p>
              )}
              {activeTab === "expected" && (
                <div className="lab-expected">
                  <p>{lab.assertions[0]?.description}</p>
                  <pre>{expected}</pre>
                  {result?.status === "success" && <strong className={passed ? "is-passed" : "is-mismatch"}>{passed ? "输出一致" : "输出与预期不一致"}</strong>}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <footer className="lab-statusbar" aria-live="polite">
        <span className={`is-${runState}`}><i aria-hidden="true" />{statusCopy(runState, runner)}</span>
        <span>单文件 · {lab.limits.runMs / 1_000}s · 128 MB</span>
        {result?.timeMs !== undefined && <span>{result.timeMs} ms</span>}
      </footer>
      {runner === "unavailable" && (
        <p className="lab-unavailable">当前页面已具备完整编译器交互，但安全执行服务尚未接通；配置独立 Java 沙箱后才会开放运行按钮。</p>
      )}
    </section>
  );
}
