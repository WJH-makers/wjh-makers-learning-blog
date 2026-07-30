"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import type { Route } from "next";

type PageTarget = {
  href: Route;
  title: string;
};

type Props = {
  children: ReactNode;
  previous?: PageTarget;
  next?: PageTarget;
};

const TURN_DURATION_MS = 360;
// 中文长文里纵向滑动占绝大多数,横向阈值太小会把顺手的斜滑判成翻页。
const SWIPE_MIN_DISTANCE_PX = 64;
// 横向必须明显压过纵向,否则边滚边偏一点就翻页了。
const SWIPE_DIRECTION_RATIO = 1.6;

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

// ← → 在可横向滚动的容器里另有含义(宽表格、长代码块、横滚漫画),
// 那里的方向键属于容器,不该被翻页劫持。
function isScrollableSideways(target: EventTarget | null) {
  let node = target instanceof HTMLElement ? target : null;
  while (node && node !== document.body) {
    if (node.scrollWidth > node.clientWidth + 1) return true;
    node = node.parentElement;
  }
  return false;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function BookReader({ children, previous, next }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [turn, setTurn] = useState<"previous" | "next" | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null);

  // App Router 在 /posts/[slug] 之间跳转会复用这个 client component 实例,state 不会自己清空。
  // 不重置的话 data-turn 会留在上一次的方向上,而翻页动画是 forwards —— 下一篇文章
  // 直接挂在「已经翻走」的终态(opacity:0 / rotateY(-91deg)),读者看到一张空书页。
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setTurn(null);
  }, [pathname]);

  // 翻页动画只有 360ms,新页面若这时才开始下载,动画放完就僵在原地。
  // <Link> 自带的视口预取只覆盖鼠标点击那条路径,键盘与滑动翻页都绕过了它,所以显式预取两侧。
  useEffect(() => {
    if (previous) router.prefetch(previous.href);
    if (next) router.prefetch(next.href);
  }, [next, previous, router]);

  const navigate = useCallback((direction: "previous" | "next", target?: PageTarget) => {
    if (!target || turn) return;

    // 用户已经明确表示不要动效,却还要陪着空等 360ms —— 那只是卡顿,不是体验。
    if (prefersReducedMotion()) {
      router.push(target.href, { scroll: true });
      return;
    }

    setTurn(direction);
    timerRef.current = setTimeout(() => router.push(target.href, { scroll: true }), TURN_DURATION_MS);
  }, [router, turn]);

  const onTurnClick = useCallback((event: MouseEvent<HTMLAnchorElement>, direction: "previous" | "next", target?: PageTarget) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(direction, target);
  }, [navigate]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target) || isScrollableSideways(event.target)) return;
      if (event.key === "ArrowLeft" && previous) {
        event.preventDefault();
        navigate("previous", previous);
      }
      if (event.key === "ArrowRight" && next) {
        event.preventDefault();
        navigate("next", next);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, next, previous]);

  // 触屏没有 hover,边缘那两条把手既看不见也不好点;滑动才是翻书的自然动作。
  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    // 代码块、宽表格、横滚漫画自己就要横滑,在它们里面起手的手势不属于翻页。
    if (isScrollableSideways(event.target)) return;
    pointerStart.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }, []);

  const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || start.id !== event.pointerId) return;

    // 长按拖动选词也是一串 pointer 事件,选中了文本就说明用户在划词而不是翻页。
    if (window.getSelection()?.toString()) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE_PX) return;
    if (Math.abs(dx) < Math.abs(dy) * SWIPE_DIRECTION_RATIO) return;

    // 和翻实体书一致:把纸往左带 = 往后翻一页。
    if (dx < 0) navigate("next", next);
    else navigate("previous", previous);
  }, [navigate, next, previous]);

  return (
    <div
      className="book-reader"
      data-turn={turn ?? undefined}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { pointerStart.current = null; }}
    >
      {children}
      {previous && (
        <Link
          className="book-turn book-turn-previous"
          href={previous.href}
          aria-label={`翻到上一页：${previous.title}`}
          onClick={(event) => onTurnClick(event, "previous", previous)}
        >
          <span className="book-turn-grip" aria-hidden="true">上一页</span>
          {/* 悬停时把目标标题探出来:原来只有 title 属性,要干等一秒系统 tooltip 才知道翻去哪 */}
          <span className="book-turn-peek" aria-hidden="true">{previous.title}</span>
        </Link>
      )}
      {next && (
        <Link
          className="book-turn book-turn-next"
          href={next.href}
          aria-label={`翻到下一页：${next.title}`}
          onClick={(event) => onTurnClick(event, "next", next)}
        >
          <span className="book-turn-grip" aria-hidden="true">下一页</span>
          <span className="book-turn-peek" aria-hidden="true">{next.title}</span>
        </Link>
      )}
      {(previous || next) && (
        // 两句提示按输入方式切换,交给 CSS 判断:用 JS 探测指针类型会在 hydration 时对不上。
        <p className="book-turn-hint">
          <span className="book-turn-hint-pointer">轻点书页边缘，或使用 ← → 翻页</span>
          <span className="book-turn-hint-touch">左右滑动翻页</span>
        </p>
      )}
    </div>
  );
}
