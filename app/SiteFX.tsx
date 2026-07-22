"use client";

import { useEffect, useRef } from "react";

// 报纸 × 科技:克制的数据粒子背景 + 工程图纸式十字准星光标。
// 全程访客浏览器 GPU/CPU 渲染;尊重 prefers-reduced-motion;触摸设备只保留静态。
export default function SiteFX() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const mouse = { x: -999, y: -999 };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    // ---- 自定义十字准星光标(仅精确指针设备)----
    let cursorRAF = 0;
    if (finePointer && cursorRef.current) {
      document.body.classList.add("fx-cursor-on");
      const cur = cursorRef.current;
      const pos = { x: mouse.x, y: mouse.y };
      const follow = () => {
        pos.x += (mouse.x - pos.x) * 0.28;
        pos.y += (mouse.y - pos.y) * 0.28;
        cur.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        cursorRAF = requestAnimationFrame(follow);
      };
      follow();
      const onOver = (e: MouseEvent) => {
        const el = e.target as HTMLElement | null;
        const hot = !!el?.closest("a, button, input, textarea, select, [role=button]");
        document.body.classList.toggle("fx-cursor-hot", hot);
      };
      window.addEventListener("mouseover", onOver, { passive: true });
    }

    // ---- 数据粒子场 ----
    let particleRAF = 0;
    let resizeHandler: (() => void) | null = null;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx && !reduce) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let w = 0;
      let h = 0;
      const pts: { x: number; y: number; vx: number; vy: number }[] = [];

      const cssVar = (name: string, fallback: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
      const accent = cssVar("--accent", "#d97757");
      const ink = cssVar("--foreground", "#141413");

      const resize = () => {
        w = canvas.clientWidth;
        h = canvas.clientHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const count = Math.max(24, Math.min(80, Math.floor((w * h) / 20000)));
        pts.length = 0;
        for (let i = 0; i < count; i++) {
          pts.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.22,
            vy: (Math.random() - 0.5) * 0.22,
          });
        }
      };
      resize();
      resizeHandler = resize;
      window.addEventListener("resize", resize);

      const LINK = 118;
      const MOUSE = 150;
      const draw = () => {
        ctx.clearRect(0, 0, w, h);
        for (const p of pts) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
          const near = dm < MOUSE;
          ctx.globalAlpha = near ? 0.55 : 0.18;
          ctx.fillStyle = near ? accent : ink;
          ctx.fillRect(a.x - 1, a.y - 1, 2, 2);
          if (near) {
            ctx.globalAlpha = (1 - dm / MOUSE) * 0.42;
            ctx.strokeStyle = accent;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
          for (let j = i + 1; j < pts.length; j++) {
            const b = pts[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < LINK) {
              ctx.globalAlpha = (1 - d / LINK) * 0.13;
              ctx.strokeStyle = ink;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
        particleRAF = requestAnimationFrame(draw);
      };
      draw();
    }

    return () => {
      window.removeEventListener("mousemove", onMove);
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      cancelAnimationFrame(cursorRAF);
      cancelAnimationFrame(particleRAF);
      document.body.classList.remove("fx-cursor-on", "fx-cursor-hot");
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="fx-particles" aria-hidden="true" />
      <div ref={cursorRef} className="fx-cursor" aria-hidden="true">
        <span className="fx-cursor-ring" />
      </div>
    </>
  );
}
