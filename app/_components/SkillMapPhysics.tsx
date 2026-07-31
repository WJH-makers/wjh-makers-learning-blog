"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * 首页能力地图的手感层。
 *
 * 六格原本只有 hover 时平移 2px 的硬反馈 —— 版面是「工程报纸」,但卡片没有重量。
 * 这里给每格加一套弹簧-阻尼系统:指针进入时卡片朝指针方向倾斜(带惯性滞后,不是
 * 瞬间贴合),移开时**振荡回位**而不是线性归零,按下会真的沉下去。
 *
 * 几条自我约束:
 * - 只接管可进入的格子(`[href]`)。未开更的是 <article>,给它物理反馈等于骗点击。
 * - transform 全部由这里以 inline style 单点写入;CSS 里那两条 hover/active transform
 *   是无 JS 时的降级,inline 优先级更高会自动盖住,不需要两边同步维护。
 * - rAF 只在「有格子未静止」或「刚滚动过」时跑,停下就 cancel —— 首页静置时零开销。
 * - 尊重 prefers-reduced-motion;触屏(无 hover 能力)直接不接管,否则倾斜只会在
 *   点击瞬间闪一下,看起来像渲染 bug。
 */

/** 最大倾角(度)。再大就从「卡片有厚度」变成「页面在晃」。 */
const MAX_TILT = 6;
/** 弹簧刚度与阻尼。阻尼取在临界值(2√k ≈ 27.6)之下,留一点回弹超调 —— 那正是"物理感"的来源。 */
const STIFFNESS = 190;
const DAMPING = 22;
/** 悬停抬起 / 按下沉入的 Z 位移(px)。父级有 perspective,Z 位移会自带近大远小。 */
const LIFT_Z = 16;
const PRESS_Z = -8;
/** 滚动视差:每滚动 100px 的基础位移(px),再乘各格深度。 */
const PARALLAX_PER_100 = 1.2;
/** 静止判定阈值:位移与速度都低于它就认为这格睡了。 */
const REST = 0.02;

type Spring = {
  el: HTMLElement;
  depth: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  tx: number; ty: number; tz: number;
};

export default function SkillMapPhysics({ children }: { children: ReactNode }) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const tiles = [...grid.querySelectorAll<HTMLElement>(".skill-map-tile[href]")];
    if (tiles.length === 0) return;

    const springs: Spring[] = tiles.map((el, i) => ({
      el,
      // 左右两列反向、逐行加深:滚动时才是「前后分层」,而不是整块一起平移。
      depth: (i % 2 === 0 ? 1 : -1) * (1 + Math.floor(i / 2) * 0.5),
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      tx: 0, ty: 0, tz: 0,
    }));
    const byEl = new Map(springs.map((s) => [s.el, s]));

    let raf = 0;
    let last = 0;
    let scrollY = window.scrollY;
    let scrollDirty = true;

    const moving = (): boolean =>
      springs.some((s) =>
        Math.abs(s.x - s.tx) > REST || Math.abs(s.vx) > REST ||
        Math.abs(s.y - s.ty) > REST || Math.abs(s.vy) > REST ||
        Math.abs(s.z - s.tz) > REST || Math.abs(s.vz) > REST);

    const frame = (now: number): void => {
      // 首帧与标签页切回时 dt 会异常大,钳到 1/30 秒,避免弹簧被一步积分炸飞。
      const dt = Math.min((now - (last || now)) / 1000, 1 / 30);
      last = now;

      for (const s of springs) {
        s.vx += (-STIFFNESS * (s.x - s.tx) - DAMPING * s.vx) * dt;
        s.vy += (-STIFFNESS * (s.y - s.ty) - DAMPING * s.vy) * dt;
        s.vz += (-STIFFNESS * (s.z - s.tz) - DAMPING * s.vz) * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.z += s.vz * dt;

        const parallax = (s.depth * scrollY * PARALLAX_PER_100) / 100;
        s.el.style.transform =
          `translate3d(0, ${parallax.toFixed(2)}px, 0)` +
          ` rotateX(${(-s.y * MAX_TILT).toFixed(3)}deg)` +
          ` rotateY(${(s.x * MAX_TILT).toFixed(3)}deg)` +
          ` translateZ(${s.z.toFixed(2)}px)`;
      }

      if (moving() || scrollDirty) {
        scrollDirty = false;
        raf = requestAnimationFrame(frame);
      } else {
        raf = 0;
        last = 0;
      }
    };

    const kick = (): void => {
      if (raf === 0) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const tileOf = (target: EventTarget | null): HTMLElement | null =>
      target instanceof Element ? target.closest<HTMLElement>(".skill-map-tile[href]") : null;

    const onPointerMove = (e: PointerEvent): void => {
      const tile = tileOf(e.target);
      for (const s of springs) {
        if (s.el !== tile) { s.tx = 0; s.ty = 0; s.tz = 0; }
      }
      const s = tile ? byEl.get(tile) : undefined;
      if (s && tile) {
        const r = tile.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        // 归一到 [-1,1]:中心不倾斜,四角最大。这是 target,弹簧去追它 —— 于是快速划过
        // 六格时卡片是"被带起来"的,而不是逐帧硬贴在指针下。
        s.tx = Math.min(1, Math.max(-1, px * 2 - 1));
        s.ty = Math.min(1, Math.max(-1, py * 2 - 1));
        s.tz = LIFT_Z;
        tile.style.setProperty("--glow-x", `${(px * 100).toFixed(1)}%`);
        tile.style.setProperty("--glow-y", `${(py * 100).toFixed(1)}%`);
      }
      kick();
    };

    const onPointerLeave = (): void => {
      for (const s of springs) { s.tx = 0; s.ty = 0; s.tz = 0; }
      kick();
    };

    const onPointerDown = (e: PointerEvent): void => {
      const tile = tileOf(e.target);
      const s = tile ? byEl.get(tile) : undefined;
      if (s) { s.tz = PRESS_Z; kick(); }
    };

    const onPointerUp = (e: PointerEvent): void => {
      const tile = tileOf(e.target);
      const s = tile ? byEl.get(tile) : undefined;
      if (s) { s.tz = LIFT_Z; kick(); }
    };

    const onScroll = (): void => {
      scrollY = window.scrollY;
      scrollDirty = true;
      kick();
    };

    grid.addEventListener("pointermove", onPointerMove);
    grid.addEventListener("pointerleave", onPointerLeave);
    grid.addEventListener("pointerdown", onPointerDown);
    grid.addEventListener("pointerup", onPointerUp);
    window.addEventListener("scroll", onScroll, { passive: true });
    kick();

    return () => {
      grid.removeEventListener("pointermove", onPointerMove);
      grid.removeEventListener("pointerleave", onPointerLeave);
      grid.removeEventListener("pointerdown", onPointerDown);
      grid.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("scroll", onScroll);
      if (raf !== 0) cancelAnimationFrame(raf);
      for (const s of springs) {
        s.el.style.transform = "";
        s.el.style.removeProperty("--glow-x");
        s.el.style.removeProperty("--glow-y");
      }
    };
  }, []);

  return <div className="java-skill-map-grid" ref={gridRef}>{children}</div>;
}
