/**
 * Public status is deliberately more conservative than the private monitor.
 * Until independent probes and field-performance samples exist, the site may
 * say only "observing" — never "excellent" by inference from a local check.
 */
export type PublicSignalState = "observing" | "excellent" | "good" | "attention";

export type PublicSiteSignal = {
  state: PublicSignalState;
  label: string;
  summary: string;
  availability: string;
  experience: string;
  audience: string;
  content: string;
};

export function publicSiteSignal(publishedPosts: number, publishedEpisodes: number): PublicSiteSignal {
  return {
    state: "observing",
    label: "观察中",
    summary: "尚未积累足够的独立可用性与真实体验样本，因此不把本地检查包装成“优秀”。",
    availability: "独立探针数据尚在建立；私有监控不对外暴露服务器细节。",
    experience: "尚未收集真实用户体验样本；不会用单次压测替代读者体验。",
    audience: "不追踪“真人”或“是否读完全站”；仅在未来提供经说明的边缘访问估算。",
    content: `公开内容已核对：${publishedPosts} 篇文章、${publishedEpisodes} 话课程。`,
  };
}

export const PUBLIC_SIGNAL_TERMS = {
  visitor: "边缘估算独立来源",
  pageView: "页面浏览",
  notPerson: "不等同于真人",
  notCompletion: "不代表读完全站",
} as const;
