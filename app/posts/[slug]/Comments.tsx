"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { postComment } from "./comment-actions";
import type { Comment, SubmitResult } from "@/lib/comments";

function fmt(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function Comments({ slug, initial }: { slug: string; initial: Comment[] }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [state, action, pending] = useActionState<SubmitResult | null, FormData>(postComment, null);
  const [list, setList] = useState<Comment[]>(initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && state.comment.body) {
      setList((prev) => [...prev, state.comment]);
      formRef.current?.reset();
      const w = window as unknown as { turnstile?: { reset?: () => void } };
      w.turnstile?.reset?.();
    }
  }, [state]);

  return (
    <section className="comments" aria-label="评论区">
      <h2 className="comments-title">评论 <span>{list.length}</span></h2>

      <ul className="comment-list">
        {list.length === 0 && <li className="comment-empty">还没有评论,来说两句?</li>}
        {list.map((c) => (
          <li key={c.id}>
            <div className="comment-meta">
              <strong>{c.name}</strong>
              <time>{fmt(c.createdAt)}</time>
            </div>
            <p>{c.body}</p>
          </li>
        ))}
      </ul>

      <form ref={formRef} action={action} className="comment-form">
        <input type="hidden" name="slug" value={slug} />
        {/* 蜜罐:正常用户看不到、不会填;机器人常会填满 */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="comment-honeypot" aria-hidden="true" />
        <input name="name" placeholder="昵称(免登录)" maxLength={24} required className="comment-input" />
        <textarea name="body" placeholder="友善发言 · 1–1000 字 · 支持换行" maxLength={1000} required rows={3} className="comment-textarea" />
        {siteKey && <div className="cf-turnstile" data-sitekey={siteKey} data-theme="auto" />}
        <div className="comment-actions-row">
          <button type="submit" disabled={pending} className="button primary">{pending ? "提交中…" : "发表评论"}</button>
          {state && !state.ok && <span className="comment-error">{state.error}</span>}
          {state?.ok && state.comment.body && <span className="comment-ok">已发布 ✓</span>}
        </div>
      </form>

      {siteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
    </section>
  );
}
