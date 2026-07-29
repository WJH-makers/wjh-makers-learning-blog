"use client";

import Editor from "@monaco-editor/react";
import { useEffect, useMemo, useState } from "react";
import type { LabManifest } from "@/lib/java-labs";
import {
  bandAttempt,
  bandDuration,
  clearLocalLearningData,
  exportLearningEvidence,
  getLearningSettings,
  recordLearningEvidence,
  setAnonymousSyncEnabled,
} from "@/lib/learning-record";

type Props = { lab: LabManifest };

type OpfsFile = {
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
  getFile(): Promise<{ text(): Promise<string> }>;
};

type OpfsRoot = {
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<OpfsRoot>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<OpfsFile>;
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
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("记录默认只保存在这台设备。");

  useEffect(() => setEnabled(getLearningSettings().anonymousSyncEnabled), []);

  function changeSync(next: boolean) {
    setEnabled(next);
    setAnonymousSyncEnabled(next);
    setMessage(next
      ? "已记录同步意愿；当前版本没有配置同步端点，因此不会发出网络请求。"
      : "匿名同步已关闭；学习记录仍只保存在这台设备。");
  }

  return (
    <details className="lab-data-controls">
      <summary>学习数据与隐私</summary>
      <p>{message}</p>
      <label className="lab-checkbox">
        <input type="checkbox" checked={enabled} onChange={(event) => changeSync(event.target.checked)} />
        允许未来的匿名同步（当前不会上传）
      </label>
      <p className="muted">绝不记录或传输源码、标准输入、控制台全文、本地路径、邮箱、姓名、IP 明文或设备指纹。</p>
      <div className="lab-actions">
        <button type="button" className="button ghost" onClick={() => download("doudou-learning-record.json", exportLearningEvidence(), "application/json")}>导出我的学习记录</button>
        <button type="button" className="button ghost" onClick={() => { clearLocalLearningData(); setEnabled(false); setMessage("本地学习记录、匿名标识和同步意愿已清除。当前没有云端档案。"); }}>清除本地数据</button>
      </div>
    </details>
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

  function runInBrowser() {
    setStatus("本构建尚未接入已验证的 Java 17 Web Worker 运行时：不会伪造执行结果。请下载到 IDE 运行；运行时验证通过后，该按钮才会按需加载。");
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
    setStatus("已记录本地验证证据；仅保存知识点、结果与时间区间，不保存代码或输出。");
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
      <Editor
        height="360px"
        language="java"
        theme="vs-dark"
        value={source}
        onChange={(value) => setSource(value ?? "")}
        options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true, tabSize: 2 }}
      />
      <div className="lab-actions">
        <button type="button" className="button primary" onClick={runInBrowser}>在浏览器运行（Java 17）</button>
        <button type="button" className="button" onClick={() => void saveLocal()}>仅本机保存</button>
        <button type="button" className="button ghost" onClick={() => download("Main.java", source, "text/x-java-source")}>下载 .java</button>
        <button type="button" className="button ghost" onClick={() => { download("Main.java", source, "text/x-java-source"); download("pom.xml", pom, "application/xml"); download("README.md", readme); }}>下载 IntelliJ/Maven 骨架</button>
        <button type="button" className="button ghost" onClick={recordLocalVerification}>已在本地验证</button>
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
