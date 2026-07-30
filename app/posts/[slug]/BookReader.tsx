"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
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

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export default function BookReader({ children, previous, next }: Props) {
  const router = useRouter();
  const [turn, setTurn] = useState<"previous" | "next" | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useCallback((direction: "previous" | "next", target?: PageTarget) => {
    if (!target || turn) return;

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
      if (event.defaultPrevented || isTypingTarget(event.target)) return;
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

  return (
    <div className="book-reader" data-turn={turn ?? undefined}>
      {children}
      {previous && (
        <Link
          className="book-turn book-turn-previous"
          href={previous.href}
          aria-label={`翻到上一页：${previous.title}`}
          title={`上一页：${previous.title}`}
          onClick={(event) => onTurnClick(event, "previous", previous)}
        >
          <span>上一页</span>
        </Link>
      )}
      {next && (
        <Link
          className="book-turn book-turn-next"
          href={next.href}
          aria-label={`翻到下一页：${next.title}`}
          title={`下一页：${next.title}`}
          onClick={(event) => onTurnClick(event, "next", next)}
        >
          <span>下一页</span>
        </Link>
      )}
      {(previous || next) && <p className="book-turn-hint">轻点书页边缘，或使用 ← → 翻页</p>}
    </div>
  );
}
