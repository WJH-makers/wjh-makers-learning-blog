"use client";

import { useState } from "react";

export default function MonitorLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("请输入用户名和密码");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/monitor-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? "认证失败");
        setLoading(false);
        return;
      }
      window.location.href = "/api/monitor";
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <section className="hero monitor-hero">
        <div>
          <p className="eyebrow">Monitor Access</p>
          <h1 className="profile-name">监控面板</h1>
          <p className="hero-text" style={{ fontSize: "0.95rem", opacity: 0.7 }}>
            服务器实时状态 · Netdata
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} style={{ maxWidth: 380, margin: "0 auto", paddingTop: 8 }}>
        <label className="form-label" htmlFor="monitor-user">用户名</label>
        <input
          id="monitor-user"
          className="form-input"
          type="text"
          autoComplete="username"
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label className="form-label" htmlFor="monitor-pass" style={{ marginTop: 16 }}>密码</label>
        <input
          id="monitor-pass"
          className="form-input"
          type="password"
          autoComplete="current-password"
          placeholder="······"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="form-error">{error}</p>}

        <button className="button primary" type="submit" disabled={loading} style={{ width: "100%", marginTop: 20 }}>
          {loading ? "验证中..." : "进入监控面板"}
        </button>
      </form>
    </div>
  );
}
