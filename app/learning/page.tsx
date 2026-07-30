import type { Metadata } from "next";
import LearningDashboard from "./LearningDashboard";
import { JAVA_LABS } from "@/lib/java-labs";
import { siteUrl } from "@/lib/posts";

export const metadata: Metadata = {
  title: "学习档案 · 本机复习与成果记录",
  description: "在当前浏览器查看 Java 实验的本机学习记录、复习提示与易错点；不上传源码、输出或身份数据。",
  alternates: { canonical: `${siteUrl()}/learning` },
};

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
