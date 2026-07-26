import type { Post } from "@/lib/posts";

const CONTENT_SIGNAL = "search=yes, ai-train=no, use=reference";

function yamlValue(value: string): string {
  // JSON 字符串是 YAML 的合法双引号标量，也能可靠处理标题中的冒号和引号。
  return JSON.stringify(value);
}

function withoutRepeatedTitle(post: Post): string {
  const lines = post.content.trim().split(/\r?\n/);
  const firstHeading = lines[0]?.match(/^#\s+(.+)$/)?.[1]?.trim();
  if (firstHeading === post.title.trim()) lines.shift();
  return lines.join("\n").trim();
}

/** 为 Agent 输出的文章建立稳定、无重复 H1 的 Markdown 表示。 */
export function articleMarkdown(post: Post, baseUrl: string): string {
  const canonicalUrl = `${baseUrl}/posts/${post.slug}`;
  const body = withoutRepeatedTitle(post);
  const tags = post.tags.map((tag) => `  - ${yamlValue(tag)}`).join("\n");

  return `---
title: ${yamlValue(post.title)}
description: ${yamlValue(post.summary)}
date: ${post.date}
canonical: ${canonicalUrl}
tags:
${tags || "  - 未分类"}
---

# ${post.title}

> ${post.summary}

- 发布日期：${post.date}
- 阅读时长：约 ${post.readingMinutes} 分钟
- 原文链接：${canonicalUrl}

---

${body}
`;
}

export const agentContentSignal = CONTENT_SIGNAL;
