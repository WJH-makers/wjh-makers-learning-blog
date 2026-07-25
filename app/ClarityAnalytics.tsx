"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

const CLARITY_PROJECT_ID = "xrsnqrkahj";

/** Microsoft Clarity 行为分析:仅在生产环境客户端初始化一次。 */
export default function ClarityAnalytics() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    Clarity.init(CLARITY_PROJECT_ID);
  }, []);
  return null;
}
