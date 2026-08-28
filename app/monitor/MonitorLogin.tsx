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

  const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
  const labelTextStyle: React.CSSProperties = { fontSize: "0.82rem", fontWeight: 600, color: "var(--neutral-600, #555)" };

  return (
    <div className="page-shell narrow" style={{ paddingBottom: 40 }}>
      <div className="page-title">
        <p className="eyebrow">Monitor</p>
        <h1>监控室 · 登录</h1>
        <p>本页展示服务器与流量指标，仅限管理员查看。</p>
      </div>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
        {/* 真 label 而不是只靠 placeholder:placeholder 一开始输入就消失,放大镜用户回看
            半填的表单认不出哪格是什么。隐式关联(label 包住 input)照 WriteEditorClientImpl.tsx:431 的写法。
            label 有了可访问名之后 placeholder 就是重复播报,去掉。 */}
        <label style={labelStyle}>
          <span style={labelTextStyle}>用户名</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          <span style={labelTextStyle}>密码</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={inputStyle}
          />
        </label>
        {/* 常驻 live region:原来 {msg && <p>} 让提示元素在失败那一刻才挂载,
            读屏拿不到任何变更通知 —— 用户只知道页面没跳转,不知道是密码错还是网络断。
            容器始终在 DOM 里、只换内部内容,才会被播报(WCAG 4.1.3)。
            这里用 role="alert" 而非 Comments.tsx:158 的 role="status":登录失败是拦路错误,
            该打断当前朗读,而评论提交结果不该抢话。焦点不动 —— 失败后按钮仍在原位,
            抢焦点会让连续重试的键盘用户每次都得重新 Tab 回输入框。 */}
        <div role="alert">{msg ? <p className="form-error">{msg}</p> : null}</div>
        <button type="submit" className="button" disabled={busy}>
          {busy ? "登录中…" : "登录"}
        </button>
      </form>
    </div>
  );
}
