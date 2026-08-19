"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import Script from "next/script";
import { postComment } from "./comment-actions";
import type { Comment, SubmitResult } from "@/lib/comments";
import { turnstileSiteKey } from "@/lib/turnstile-config";

const AVATAR_BG = ["#111111", "#cc0000", "#444444"];
function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h + ch.charCodeAt(0)) % 997;
  return AVATAR_BG[h % AVATAR_BG.length];
}
function fmt(iso: string): string {
  // 固定 UTC+8 格式化:服务端(UTC 容器)与任意时区客户端逐字节一致,消除 hydration 时间差。
  const d = new Date(Date.parse(iso) + 8 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

// 安全 Markdown 子集 → React 节点(不用 dangerouslySetInnerHTML,内容全走 JSX 自动转义,零 XSS)。
// 支持:```代码块```、`行内代码`、**粗**、*斜*、换行。URL 保持纯文本(不做链接,防外链 spam)。
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("`")) nodes.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("**")) nodes.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else nodes.push(<em key={k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
function renderBody(body: string): ReactNode[] {
  const out: ReactNode[] = [];
  const segs = body.split("```");
  segs.forEach((seg, i) => {
    if (i % 2 === 1) {
      out.push(<pre key={`c${i}`} className="comment-code"><code>{seg.replace(/^\n/, "").replace(/\n$/, "")}</code></pre>);
    } else if (seg) {
      const lines = seg.split("\n");
      lines.forEach((line, j) => {
        out.push(<span key={`t${i}-${j}`}>{renderInline(line)}{j < lines.length - 1 ? <br /> : null}</span>);
      });
    }
  });
  return out;
}

const PREVIEW = 5;

export default function Comments({ slug, initial, enabled }: { slug: string; initial: Comment[]; enabled: boolean }) {
  // 与服务端 isCommentingEnabled() 共用同一个读取入口。收敛前这里不带 .trim()，
  // 而服务端带 —— env 末尾多一个空格就会「服务端认为已启用、这里的 widget 静默不渲染」。
  const siteKey = turnstileSiteKey();
  const commentingEnabled = enabled && Boolean(siteKey);
  const [state, action, pending] = useActionState<SubmitResult | null, FormData>(postComment, null);
  const [list, setList] = useState<Comment[]>(initial);
  const [len, setLen] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  // Turnstile 脚本 + widget iframe 不进文章首屏:评论区接近视口(或聚焦输入)才挂载。
  // 多数读者不滚到页尾,每篇文章省一个第三方脚本与 iframe。
  const [tsReady, setTsReady] = useState(false);
  useEffect(() => {
    if (!commentingEnabled || tsReady) return;
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setTsReady(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setTsReady(true);
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [commentingEnabled, tsReady]);

  useEffect(() => {
    if (state?.ok && state.comment.body) {
      setList((prev) => [...prev, state.comment]);
      setExpanded(true); // 自己刚发的确保可见
      setLen(0);
      formRef.current?.reset();
      const w = window as unknown as { turnstile?: { reset?: () => void } };
      w.turnstile?.reset?.();
    }
  }, [state]);

  const visible = expanded ? list : list.slice(0, PREVIEW);
  const hidden = list.length - visible.length;

  return (
    <section className="comments" aria-label="评论区" ref={sectionRef}>
      <h2 className="comments-title">评论 <span>{list.length}</span></h2>

      <ol className="comment-list" id="comment-list">
        {list.length === 0 && <li className="comment-empty">还没有评论,来抢沙发 🛋️</li>}
        {visible.map((c, i) => (
          <li key={c.id} className="comment-item">
            <div className="comment-avatar" style={{ background: avatarColor(c.name) }} aria-hidden="true">
              {c.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="comment-body">
              <div className="comment-meta">
                <strong>{c.name}</strong>
                <span className="comment-floor">#{i + 1}</span>
                <time>{fmt(c.createdAt)}</time>
              </div>
              <p>{renderBody(c.body)}</p>
            </div>
          </li>
        ))}
      </ol>

      {hidden > 0 && (
        <button type="button" className="comment-toggle" aria-expanded={expanded} aria-controls="comment-list" onClick={() => setExpanded(true)}>
          展开剩余 {hidden} 条评论 ▾
        </button>
      )}
      {expanded && list.length > PREVIEW && (
        <button type="button" className="comment-toggle" aria-expanded={expanded} aria-controls="comment-list" onClick={() => setExpanded(false)}>
          收起 ▴
        </button>
      )}

      {commentingEnabled ? <form ref={formRef} action={action} className="comment-form">
        <input type="hidden" name="slug" value={slug} />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="comment-honeypot" aria-hidden="true" />
        <input name="name" aria-label="昵称" placeholder="昵称(免登录,不收集邮箱)" maxLength={24} required className="comment-input" />
        <div className="comment-textarea-wrap">
          <textarea
            name="body"
            aria-label="评论内容"
            placeholder="友善发言 · 支持 `代码` **粗体** ```代码块``` 与换行"
            maxLength={1000}
            required
            rows={3}
            className="comment-textarea"
            onInput={(e) => setLen(e.currentTarget.value.length)}
            onFocus={() => setTsReady(true)}
          />
          <span className="comment-counter">{len}/1000</span>
        </div>
        {siteKey && tsReady && <div className="cf-turnstile" data-sitekey={siteKey} data-theme="auto" />}
        <div className="comment-actions-row">
          <button type="submit" disabled={pending} className="button primary">{pending ? "提交中…" : "发表评论"}</button>
          {/* 常驻 live region:提交结果(成功/失败)自动向读屏播报,容器始终在 DOM 中 */}
          <span role="status">
            {state && !state.ok ? (
              <span className="comment-error">{state.error}</span>
            ) : state?.ok && state.comment.body ? (
              <span className="comment-ok">已发布 ✓</span>
            ) : null}
          </span>
          <span className="comment-privacy">🔒 匿名发言 · 不存邮箱 · IP 仅加密用于反刷</span>
        </div>
      </form> : <p className="comment-empty">评论默认关闭。开放时将要求通过人机验证，且所有提交均受频率与内容限制。</p>}

      {commentingEnabled && siteKey && tsReady && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
    </section>
  );
}
