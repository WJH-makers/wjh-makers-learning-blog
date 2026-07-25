"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { postComment } from "./comment-actions";
import type { Comment, SubmitResult } from "@/lib/comments";

// 报纸风头像:方形零圆角,底色按昵称哈希在 墨黑/红/深灰 里取,白字首字母。
const AVATAR_BG = ["#111111", "#cc0000", "#444444"];
function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h + ch.charCodeAt(0)) % 997;
  return AVATAR_BG[h % AVATAR_BG.length];
}
function fmt(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function Comments({ slug, initial }: { slug: string; initial: Comment[] }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [state, action, pending] = useActionState<SubmitResult | null, FormData>(postComment, null);
  const [list, setList] = useState<Comment[]>(initial);
  const [len, setLen] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && state.comment.body) {
      setList((prev) => [...prev, state.comment]);
      setLen(0);
      formRef.current?.reset();
      const w = window as unknown as { turnstile?: { reset?: () => void } };
      w.turnstile?.reset?.();
    }
  }, [state]);

  return (
    <section className="comments" aria-label="评论区">
      <h2 className="comments-title">评论 <span>{list.length}</span></h2>

      <ol className="comment-list">
        {list.length === 0 && <li className="comment-empty">还没有评论,来抢沙发 🛋️</li>}
        {list.map((c, i) => (
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
              <p>{c.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <form ref={formRef} action={action} className="comment-form">
        <input type="hidden" name="slug" value={slug} />
        {/* 蜜罐:正常用户看不到、不会填;机器人常会填满 */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="comment-honeypot" aria-hidden="true" />
        <input name="name" placeholder="昵称(免登录,不收集邮箱)" maxLength={24} required className="comment-input" />
        <div className="comment-textarea-wrap">
          <textarea
            name="body"
            placeholder="友善发言 · 支持换行"
            maxLength={1000}
            required
            rows={3}
            className="comment-textarea"
            onInput={(e) => setLen(e.currentTarget.value.length)}
          />
          <span className="comment-counter">{len}/1000</span>
        </div>
        {siteKey && <div className="cf-turnstile" data-sitekey={siteKey} data-theme="auto" />}
        <div className="comment-actions-row">
          <button type="submit" disabled={pending} className="button primary">{pending ? "提交中…" : "发表评论"}</button>
          {state && !state.ok && <span className="comment-error">{state.error}</span>}
          {state?.ok && state.comment.body && <span className="comment-ok">已发布 ✓</span>}
          <span className="comment-privacy">🔒 匿名发言 · 不存邮箱 · IP 仅加密用于反刷</span>
        </div>
      </form>

      {siteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
    </section>
  );
}
