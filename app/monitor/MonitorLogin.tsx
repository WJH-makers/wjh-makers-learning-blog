"use client";

import { useState, type FormEvent } from "react";

// 监控室登录墙:提交到已有的 /api/monitor-auth(fail-closed + 限流 + 恒定时间比较),
// 成功后 reload,由服务端 isMonitorAuthed() 放行渲染。
export default function MonitorLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setMsg("请输入用户名和密码。");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/monitor-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.ok) {
        window.location.reload();
      } else {
        setMsg(data.message ?? "登录失败。");
      }
    } catch {
      setMsg("登录请求失败，请检查网络。");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: "8px 10px",
    border: "1px solid var(--border, #ddd)",
    borderRadius: 0,
    background: "var(--background, #fff)",
    color: "var(--foreground, #111)",
    fontSize: "0.95rem",
  };

  return (
    <div className="page-shell narrow" style={{ paddingBottom: 40 }}>
      <div className="page-title">
        <p className="eyebrow">Monitor</p>
        <h1>监控室 · 登录</h1>
        <p>本页展示服务器与流量指标，仅限管理员查看。</p>
      </div>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="用户名"
          autoComplete="username"
          style={inputStyle}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          autoComplete="current-password"
          style={inputStyle}
        />
        {msg && <p className="form-error">{msg}</p>}
        <button type="submit" className="button" disabled={busy}>
          {busy ? "登录中…" : "登录"}
        </button>
      </form>
    </div>
  );
}
