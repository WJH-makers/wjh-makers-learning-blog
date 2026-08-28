"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { preflightJava17SingleFile, type JavaDiagnostic, type LabManifest } from "@/lib/java-labs";
import type { JavaRunResult } from "@/lib/java-runner";

type Props = { lab: LabManifest };
type RunnerState = "checking" | "available" | "unavailable";
type RunState = "idle" | "validating" | "compiling" | "running" | "success" | "failed" | "cancelled";
// 提到模块级:方向键换 tab 要按顺序算前一个/后一个,渲染与键盘处理必须共用同一份顺序。
const RESULT_TABS = ["console", "problems", "expected"] as const;
type ResultTab = (typeof RESULT_TABS)[number];

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
  const tablistRef = useRef<HTMLDivElement>(null);
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
        // 429 由边界代理(nginx 限流)直接返回,响应体是 HTML 不是 JSON。
        // 被限流恰恰说明沙箱活着,只是这一刻挡了探测 —— 若照旧走 json() 会抛错,
        // 读者一进文章就看到"沙箱不可用",整个编辑器被误禁用。
        if (response.status === 429) {
          setRunner("available");
          return;
        }
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
      // 同上:429 来自边界代理,响应体是 HTML。若直接 json() 会抛解析错,
      // 落进 catch 后显示成"执行服务异常" —— 把"你点太快了"说成"服务坏了"。
      if (response.status === 429) {
        setResult({
          status: "internal_error",
          statusLabel: "运行过于频繁",
          stdout: "",
          stderr: "同一分钟内运行次数过多，请稍等十几秒再试。",
          diagnostics: [],
          truncated: false,
        });
        setRunState("failed");
        setActiveTab("console");
        return;
      }
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

  // 声明了 role="tablist" 就得给方向键:读屏和键盘用户按 WAI-ARIA Tabs 模式必然会按左右键。
  // 更要命的是不接这几个键会往上冒泡到 BookReader 的 window keydown —— 它的 isTypingTarget
  // 只认 INPUT/TEXTAREA/SELECT 与 contentEditable(BUTTON 不算),于是左右键被当成翻页,
  // 直接 router.push 到上/下一话,编辑器里没点过「保存到浏览器」的源码全丢。
  // 所以除了 preventDefault 还要 stopPropagation:window 在冒泡链末端,拦在这里就到不了它。
  function tabsKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const current = RESULT_TABS.indexOf(activeTab);
    let nextIndex = current;
    switch (event.key) {
      case "ArrowRight": nextIndex = (current + 1) % RESULT_TABS.length; break;
      case "ArrowLeft": nextIndex = (current - 1 + RESULT_TABS.length) % RESULT_TABS.length; break;
      case "Home": nextIndex = 0; break;
      case "End": nextIndex = RESULT_TABS.length - 1; break;
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
    const nextTab = RESULT_TABS[nextIndex];
    setActiveTab(nextTab);
    // roving tabIndex 下焦点必须跟着走,否则再按一次方向键还是从原来那个 tab 起算。
    tablistRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${nextTab}"]`)?.focus();
  }

  function editorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void runCode();
      return;
    }
    if (event.key !== "Tab") return;
    // Shift+Tab 必须放行:两个方向都吞掉的话,键盘用户焦点一旦进入编辑器就再也出不去
    // (WCAG 2.1.2 无键盘陷阱)。往前缩进用 Tab,离开用 Shift+Tab —— 这也是
    // CodeMirror / Monaco 之外最常见的轻量编辑器约定。
    if (event.shiftKey) return;
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
            <div className="lab-result-tabs" role="tablist" aria-label="运行结果" ref={tablistRef} onKeyDown={tabsKeyDown}>
              {RESULT_TABS.map((tab) => {
                const labels = { console: "控制台", problems: `问题${diagnostics.length ? ` ${diagnostics.length}` : ""}`, expected: "预期" };
                return <button
                  key={tab}
                  id={`lab-${lab.id}-tab-${tab}`}
                  data-tab={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`lab-${lab.id}-tabpanel`}
                  // tablist 整体在 Tab 序列里只占一站,进来后用方向键切换 —— APG 的 roving tabIndex。
                  tabIndex={activeTab === tab ? 0 : -1}
                  onClick={() => setActiveTab(tab)}
                >{labels[tab]}</button>;
              })}
            </div>
            {/* 三个 tab 复用同一个面板容器(内容按 activeTab 换),所以 id 固定、
                aria-labelledby 跟着当前 tab 走 —— 这样每个 tab 的 aria-controls 都指得到实体。 */}
            <div className="lab-result-body" role="tabpanel" id={`lab-${lab.id}-tabpanel`} aria-labelledby={`lab-${lab.id}-tab-${activeTab}`}>
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
