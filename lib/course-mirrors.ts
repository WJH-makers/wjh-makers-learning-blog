/**
 * Build-time contract for future Chinese/English course mirrors.  Bodies and
 * SEO fields may differ by language; manifests, code and knowledge-node IDs
 * must not.  Publishing code can call this validator before adding a locale.
 */
export type CourseMirror = {
  contentId: string;
  locale: "zh-CN" | "en";
  terminologyVersion: string;
  technicalVersion: string;
  labId: string;
  knowledgePointIds: readonly string[];
  codeFingerprint: string;
};

export function validateCourseMirrors(mirrors: readonly CourseMirror[]): string[] {
  const byContent = new Map<string, CourseMirror[]>();
  for (const mirror of mirrors) {
    byContent.set(mirror.contentId, [...(byContent.get(mirror.contentId) ?? []), mirror]);
  }
  const errors: string[] = [];
  for (const [contentId, versions] of byContent) {
    const locales = new Set(versions.map((version) => version.locale));
    if (locales.size !== versions.length) errors.push(`${contentId} 存在重复语言版本`);
    if (locales.has("en") && !locales.has("zh-CN")) errors.push(`${contentId} 英文镜像缺少中文源版本`);
    const baseline = versions[0];
    for (const version of versions.slice(1)) {
      if (version.labId !== baseline.labId) errors.push(`${contentId} 的实验 ID 未对齐`);
      if (version.codeFingerprint !== baseline.codeFingerprint) errors.push(`${contentId} 的代码块发生变化`);
      if (version.knowledgePointIds.join("|") !== baseline.knowledgePointIds.join("|")) errors.push(`${contentId} 的知识点未对齐`);
    }
  }
  return errors;
}
