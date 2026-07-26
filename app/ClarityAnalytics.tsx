"use client";

import { useEffect } from "react";

const CLARITY_PROJECT_ID = "xrsnqrkahj";

/**
 * 行为分析不参与首屏执行：通过浏览器空闲队列加载官方脚本，避免把 SDK 打进每个页面的
 * hydration bundle。脚本加载失败不会影响阅读、导航或评论。
 */
export default function ClarityAnalytics() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    const load = () => {
      if (document.querySelector('script[data-clarity="true"]')) return;
      const script = document.createElement("script");
      script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
      script.async = true;
      script.dataset.clarity = "true";
      document.head.appendChild(script);
    };
    const idle = window.requestIdleCallback?.(load, { timeout: 4000 });
    if (idle === undefined) window.setTimeout(load, 1500);
    return () => { if (idle !== undefined) window.cancelIdleCallback?.(idle); };
  }, []);
  return null;
}
