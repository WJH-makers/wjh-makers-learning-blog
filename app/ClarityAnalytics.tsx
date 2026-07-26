"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

const CLARITY_PROJECT_ID = "xrsnqrkahj";

/** Microsoft Clarity 行为分析:仅生产环境、且等浏览器空闲后再初始化,不与首屏渲染/交互抢主线程。 */
export default function ClarityAnalytics() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    const start = () => Clarity.init(CLARITY_PROJECT_ID);
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(start, { timeout: 4000 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(start, 2000);
    return () => clearTimeout(t);
  }, []);
  return null;
}
