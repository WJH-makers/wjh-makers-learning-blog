"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

type PageTarget = {
  href: Route;
  title: string;
};

type Props = {
  children: ReactNode;
  previous?: PageTarget;
  next?: PageTarget;
};

const TURN_COMMIT_DELAY_MS = 90;
const TURN_DURATION_MS = 280;
const SWIPE_MIN_DISTANCE_PX = 64;
const SWIPE_DIRECTION_RATIO = 1.6;

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

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
  const navigatingRef = useRef(false);
  const commitTimerRef = useRef<number | null>(null);
  const cleanupTimerRef = useRef<number | null>(null);
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null);

  useEffect(() => {
    setTurn(null);
    if (!document.documentElement.dataset.pageTurn) navigatingRef.current = false;
  }, [pathname]);

  useEffect(() => () => {
    if (commitTimerRef.current) window.clearTimeout(commitTimerRef.current);
  }, []);

  useEffect(() => {
    if (previous) router.prefetch(previous.href);
    if (next) router.prefetch(next.href);
  }, [next, previous, router]);

  const navigate = useCallback((direction: "previous" | "next", target?: PageTarget) => {
    if (!target || navigatingRef.current) return;
    navigatingRef.current = true;
    setTurn(direction);

    if (prefersReducedMotion()) {
      router.push(target.href, { scroll: true });
      return;
    }

    const root = document.documentElement;
    const headerBottom = document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0;
    root.style.setProperty("--page-turn-top", `${Math.max(0, headerBottom)}px`);
    root.dataset.pageTurn = direction;

    commitTimerRef.current = window.setTimeout(() => {
      commitTimerRef.current = null;
      router.push(target.href, { scroll: true });
    }, TURN_COMMIT_DELAY_MS);

    const clearTransitionState = () => {
      delete root.dataset.pageTurn;
      root.style.removeProperty("--page-turn-top");
      navigatingRef.current = false;
      cleanupTimerRef.current = null;
    };
    cleanupTimerRef.current = window.setTimeout(clearTransitionState, TURN_DURATION_MS);
  }, [router]);

  const onTurnClick = useCallback((
    event: MouseEvent<HTMLAnchorElement>,
    direction: "previous" | "next",
    target?: PageTarget,
  ) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(direction, target);
  }, [navigate]);

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

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" || isScrollableSideways(event.target)) return;
    pointerStart.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointer events used by audits do not have an active browser pointer to capture.
    }
  }, []);

  const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!start || start.id !== event.pointerId || window.getSelection()?.toString()) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE_PX || Math.abs(dx) < Math.abs(dy) * SWIPE_DIRECTION_RATIO) return;

    if (dx < 0) navigate("next", next);
    else navigate("previous", previous);
  }, [navigate, next, previous]);

  return (
    <div
      className="book-reader"
      data-turn={turn ?? undefined}
      aria-busy={turn ? true : undefined}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={(event) => {
        pointerStart.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
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
    </div>
  );
}
