import "./learning.css";
import LearningDashboard from "./LearningDashboard";
import { JAVA_LABS } from "@/lib/java-labs";
import { staticPageMetadata } from "@/lib/og-base";

// 原先手写 metadata 只给了 title/description/canonical:没有 openGraph 就整段继承根 layout,
// og:url 指向首页、og:title 是全站默认文案 —— 分享本页会被按 og:url 归一化的平台算到首页头上。
// 走 staticPageMetadata 后 canonical / og:url / og:title / twitter / RSS alternate 一次对齐。
export const metadata = staticPageMetadata({
  title: "学习档案 · 本机复习与成果记录",
  description: "在当前浏览器查看 Java 实验的本机学习记录、复习提示与易错点；不上传源码、输出或身份数据。",
  path: "/learning",
});

export default function LearningPage() {
  const labs = JAVA_LABS.map((lab) => ({
    id: lab.id,
    slug: lab.slug,
    title: lab.title,
    knowledgePoints: lab.knowledgePoints,
    misconceptionTags: lab.misconceptionTags,
    projectIncrement: lab.projectIncrement,
    reviewAfterDays: lab.reviewAfterDays,
  }));

  return <LearningDashboard labs={labs} />;
}
