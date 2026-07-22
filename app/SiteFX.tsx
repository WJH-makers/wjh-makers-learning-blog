"use client";

import { useEffect, useRef } from "react";

// 报纸 × 科技(升级版):数据粒子场 + 鼠标引力物理 + 发光连线 + 十字准星光标 + 拖尾粒子。
// 访客浏览器 GPU/CPU 渲染;尊重 prefers-reduced-motion;触摸设备只保留静态。
export default function SiteFX() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let cursorEnabled = false;

    // 光标拖尾粒子:鼠标移动时喷发,渐隐消失
    const trail: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
    const spawnTrail = (x: number, y: number) => {
      if (trail.length > 80) return;
      trail.push({ x, y, vx: (Math.random() - 0.5) * 1.3, vy: (Math.random() - 0.5) * 1.3 + 0.25, life: 1 });
    };

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (cursorEnabled && !reduce) spawnTrail(e.clientX, e.clientY);
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    // ---- 十字准星光标 ----
    let cursorRAF = 0;
    if (finePointer && cursorRef.current) {
      cursorEnabled = true;
      document.body.classList.add("fx-cursor-on");
      const cur = cursorRef.current;
      const pos = { x: mouse.x, y: mouse.y };
      const follow = () => {
        pos.x += (mouse.x - pos.x) * 0.3;
        pos.y += (mouse.y - pos.y) * 0.3;
        cur.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        cursorRAF = requestAnimationFrame(follow);
      };
      follow();
      const onOver = (e: MouseEvent) => {
        const el = e.target as HTMLElement | null;
        document.body.classList.toggle("fx-cursor-hot", !!el?.closest("a, button, input, textarea, select, [role=button]"));
      };
      window.addEventListener("mouseover", onOver, { passive: true });
    }

    // ---- 粒子场:引力物理 + 发光连线 + 拖尾 ----
    let particleRAF = 0;
    let resizeHandler: (() => void) | null = null;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx && !reduce) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let w = 0;
      let h = 0;
      const pts: { x: number; y: number; vx: number; vy: number }[] = [];
      const cssVar = (n: string, f: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
      const accent = cssVar("--accent", "#d97757");
      const ink = cssVar("--foreground", "#141413");

      const resize = () => {
        w = canvas.clientWidth;
        h = canvas.clientHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const count = Math.max(40, Math.min(140, Math.floor((w * h) / 12000)));
        pts.length = 0;
        for (let i = 0; i < count; i++) {
          pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 });
        }
      };
      resize();
      resizeHandler = resize;
      window.addEventListener("resize", resize);

      const LINK = 132;
      const GRAV = 250;
      const REPEL = 58;
      const draw = () => {
        ctx.clearRect(0, 0, w, h);

        // 物理:鼠标引力(远吸)+ 近距斥力 + 摩擦
        for (const p of pts) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < GRAV) {
            const f = (1 - d / GRAV) * 0.06;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
          if (d < REPEL) {
            const f = (1 - d / REPEL) * 0.9;
            p.vx -= (dx / d) * f;
            p.vy -= (dy / d) * f;
          }
          p.vx *= 0.955;
          p.vy *= 0.955;
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) { p.x = 0; p.vx *= -1; }
          if (p.x > w) { p.x = w; p.vx *= -1; }
          if (p.y < 0) { p.y = 0; p.vy *= -1; }
          if (p.y > h) { p.y = h; p.vy *= -1; }
        }

        // 发光渲染:点 + 连线 + 到鼠标的引力线
        ctx.shadowBlur = 6;
        ctx.shadowColor = accent;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
          const near = dm < GRAV;
          ctx.globalAlpha = near ? 0.7 : 0.22;
          ctx.fillStyle = near ? accent : ink;
          ctx.fillRect(a.x - 1.2, a.y - 1.2, 2.4, 2.4);
          for (let j = i + 1; j < pts.length; j++) {
            const b = pts[j];
            const dd = Math.hypot(a.x - b.x, a.y - b.y);
            if (dd < LINK) {
              ctx.globalAlpha = (1 - dd / LINK) * 0.16;
              ctx.strokeStyle = near ? accent : ink;
              ctx.lineWidth = 0.6;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
          if (near) {
            ctx.globalAlpha = (1 - dm / GRAV) * 0.5;
            ctx.strokeStyle = accent;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        // 光标拖尾粒子
        for (let i = trail.length - 1; i >= 0; i--) {
          const t = trail[i];
          t.x += t.vx;
          t.y += t.vy;
          t.life -= 0.045;
          if (t.life <= 0) {
            trail.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = t.life * 0.8;
          ctx.fillStyle = accent;
          const s = t.life * 3.6;
          ctx.fillRect(t.x - s / 2, t.y - s / 2, s, s);
        }

        ctx.shadowBlur = 0;
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
