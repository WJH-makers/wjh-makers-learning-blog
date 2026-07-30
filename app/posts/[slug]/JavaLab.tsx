"use client";

import { useEffect, useMemo, useState } from "react";
import { preflightJava17SingleFile, type LabManifest } from "@/lib/java-labs";
import {
  bandAttempt,
  bandDuration,
  clearLocalLearningData,
  exportLearningEvidence,
  recordLearningEvidence,
} from "@/lib/learning-record";

type Props = { lab: LabManifest };

type OpfsFile = {
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
  getFile(): Promise<{ text(): Promise<string> }>;
};

type OpfsRoot = {
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<OpfsRoot>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<OpfsFile>;
  removeEntry?(name: string, options?: { recursive?: boolean }): Promise<void>;
};

function download(name: string, content: string, type = "text/plain;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function opfsLabFile(labId: string): Promise<OpfsFile | undefined> {
  const storage = navigator.storage as StorageManager & { getDirectory?: () => Promise<OpfsRoot> };
  if (!storage.getDirectory) return undefined;
  const root = await storage.getDirectory();
  const labs = await root.getDirectoryHandle("doudou-java-labs", { create: true });
  const lab = await labs.getDirectoryHandle(labId, { create: true });
  return lab.getFileHandle("Main.java", { create: true });
}

function LearningDataControls() {
  return (
    <aside className="lab-privacy" aria-label="学习数据说明">
      <span className="lab-privacy-badge">本机记录</span>
      <span>学习证据只保存在当前浏览器，不上传。</span>
      <details>
        <summary>数据说明与管理</summary>
        <p>只保存实验版本、知识点、结果与时间区间；不保存源码、输入、控制台内容、本地路径或身份信息。</p>
        <div className="lab-actions lab-actions-compact">
          <button type="button" className="button ghost" onClick={() => download("doudou-learning-record.json", exportLearningEvidence(), "application/json")}>导出学习记录</button>
          <button type="button" className="button ghost" onClick={() => clearLocalLearningData()}>清除学习记录</button>
        </div>
      </details>
    </aside>
  );
}

export default function JavaLab({ lab }: Props) {
  const [source, setSource] = useState(lab.files[0].content);
  const [status, setStatus] = useState("运行时按需加载：尚未下载任何 Java 运行时。");
  const [hintOpen, setHintOpen] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [opfsSupported, setOpfsSupported] = useState(false);
  const readme = useMemo(() => `# ${lab.title}\n\nJava 17+ 本地运行：\n\n\`javac Main.java\`\n\`java Main\`\n`, [lab.title]);
  const pom = useMemo(() => `<project xmlns="http://maven.apache.org/POM/4.0.0">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>dev.doudou</groupId>\n  <artifactId>${lab.id}</artifactId>\n  <version>0.1.0</version>\n  <properties><maven.compiler.release>17</maven.compiler.release></properties>\n</project>\n`, [lab.id]);
  const preflight = useMemo(() => preflightJava17SingleFile(source), [source]);

  useEffect(() => {
    const supported = Boolean((navigator.storage as StorageManager & { getDirectory?: unknown }).getDirectory);
    setOpfsSupported(supported);
    if (!supported) return;
    void opfsLabFile(lab.id).then(async (handle) => {
      if (!handle) return;
      const file = await handle.getFile();
      const saved = await file.text();
      if (saved) setSource(saved);
    }).catch(() => setStatus("浏览器无法读取本地实验文件；仍可下载代码。"));
  }, [lab.id]);

  async function saveLocal() {
    try {
      const handle = await opfsLabFile(lab.id);
      if (!handle) {
        setStatus("此浏览器不支持 OPFS；请下载 Main.java 或复制到 IDE。");
        return;
      }
      const writable = await handle.createWritable();
      await writable.write(source);
      await writable.close();
      setStatus("已只在本机 OPFS 保存 Main.java。");
    } catch {
      setStatus("本地保存失败（可能是配额或隐私模式限制）；可下载代码作为备份。");
    }
  }

  function recordLocalVerification() {
    recordLearningEvidence({
      labId: lab.id,
      labVersion: lab.version,
      knowledgePointIds: [...lab.knowledgePoints],
      attemptBand: bandAttempt(1),
      durationBand: bandDuration(Date.now() - startedAt),
      result: "passed",
      misconceptionTags: [...lab.misconceptionTags],
      usedHint: hintOpen,
    });
    setStatus("已记录“我已在本地运行”的自我声明；只保存知识点、结果与时间区间，不保存代码或输出。");
  }

  function checkBrowserBoundary() {
    if (preflight.passed) {
      setStatus("Java 17 单文件边界检查通过。浏览器 Java 运行时尚未通过独立验证，因此不会上传或执行你的代码；可下载到本机 JDK 17 运行。");
      return;
    }
    const firstFailure = preflight.checks.find((check) => !check.passed);
    setStatus(`尚不能进入浏览器实验候选范围：${firstFailure?.detail ?? "请检查源码。"} 代码始终只留在当前浏览器。`);
  }

  return (
    <section className="java-lab" aria-labelledby={`lab-${lab.id}`}>
      <p className="eyebrow">Browser Lab · 浏览器实验模式</p>
      <h2 id={`lab-${lab.id}`}>最小实验：{lab.title}</h2>
      <p>{lab.environment.promise} 本实验不承诺 Java 25、Maven、JUnit 或多文件项目的浏览器运行。</p>
      <p className="muted">{lab.environment.privacy}</p>
      <div className="lab-contract">
        <span>Lab {lab.id} v{lab.version}</span><span>Java {lab.environment.javaVersion}</span><span>运行上限 {lab.limits.runMs / 1000}s</span><span>{opfsSupported ? "OPFS 本地保存可用" : "OPFS 不可用：可下载"}</span>
      </div>
      <textarea
        className="lab-editor"
        aria-label="Java 源码编辑器"
        value={source}
        onChange={(event) => setSource(event.target.value)}
        spellCheck={false}
      />
      <section className={`lab-preflight ${preflight.passed ? "is-ready" : "is-blocked"}`} aria-label="Java 17 浏览器实验预检">
        <div>
          <p className="eyebrow">运行前检查</p>
          <strong>{preflight.passed ? "源码符合 Java 17 单文件实验边界" : "先修复边界问题，再等待运行时验证"}</strong>
          <p>这不是编译结果。只有 Java 17 兼容运行时通过独立验证后，才会显示“在浏览器运行”。</p>
        </div>
        <button type="button" className="button primary" onClick={checkBrowserBoundary}>检查可运行性</button>
      </section>
      <ul className="lab-checks" aria-label="Java 17 兼容性检查结果">
        {preflight.checks.map((check) => <li key={check.id} className={check.passed ? "is-passed" : "is-failed"}><span aria-hidden="true">{check.passed ? "✓" : "!"}</span><span><strong>{check.label}</strong>{check.detail}</span></li>)}
      </ul>
      <div className="lab-actions">
        <button type="button" className="button" onClick={() => void saveLocal()}>仅本机保存</button>
        <button type="button" className="button ghost" onClick={() => download("Main.java", source, "text/x-java-source")}>下载 .java</button>
        <button type="button" className="button ghost" onClick={() => { download("Main.java", source, "text/x-java-source"); download("pom.xml", pom, "application/xml"); download("README.md", readme); }}>下载本地 IDE / Maven 骨架</button>
        <button type="button" className="button ghost" onClick={recordLocalVerification}>我已在本地运行</button>
      </div>
      <p className="lab-status" role="status">{status}</p>
      <details open={hintOpen} onToggle={(event) => setHintOpen((event.target as HTMLDetailsElement).open)}>
        <summary>错因提示（不分析或上传你的代码）</summary>
        <p>先检查：{lab.misconceptionTags.join(" · ")}。修复后用本实验的预期输出重新验证。</p>
        <ul>{lab.assertions.map((assertion) => <li key={assertion.id}>{assertion.description}：<code>{assertion.expectedOutput ?? "见题目"}</code></li>)}</ul>
      </details>
      <p className="muted">知识点：{lab.knowledgePoints.join(" · ")}。项目增量：{lab.projectIncrement}。建议复习：第 {lab.reviewAfterDays.join(" / ")} 天。</p>
      <LearningDataControls />
    </section>
  );
}
