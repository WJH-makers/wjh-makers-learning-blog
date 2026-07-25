import Link from "next/link";
import { getAllPublishedTags } from "@/lib/posts";

export const metadata = {
  title: "标签",
  description: "按主题浏览学习记录。",
};

export const runtime = "nodejs";
export const revalidate = 3600;

// 语义聚类:标签是专有名词,手动按技术领域分组比自动算法准且可控。
// 组内保留定义顺序(主标签在前);未列入的新标签自动归「其他」。
const TAG_CLUSTERS: { title: string; emoji: string; tags: string[] }[] = [
  { title: "前端 & 标记", emoji: "🎨", tags: ["前端", "HTML", "Markdown"] },
  { title: "Java & JVM", emoji: "☕", tags: ["Java", "Spring", "JVM", "JDK", "OOM", "Maven", "Gradle"] },
  { title: "数据库", emoji: "🗄️", tags: ["数据库", "MySQL", "Redis"] },
  { title: "系统 & 运维", emoji: "🖥️", tags: ["Linux", "Windows", "Docker", "SSH", "systemctl", "CPU", "环境配置"] },
  { title: "工具 & 效率", emoji: "🛠️", tags: ["Git", "Vim", "命令速查"] },
  { title: "方法 & 随笔", emoji: "📝", tags: ["学习方法", "复盘", "博客"] },
];

function tagFontSize(count: number, maxCount: number): string {
  const ratio = count / maxCount;
  return `${0.72 + ratio * 0.45}rem`;
}

export default async function TagsPage() {
  const tags = await getAllPublishedTags();
  const countByTag = new Map(tags.map((t) => [t.tag, t.count]));
  const maxCount = Math.max(...tags.map((t) => t.count), 1);

  // 每组只取确有文章的标签,保留聚类定义顺序。
  const groups = TAG_CLUSTERS.map((c) => ({
    title: c.title,
    emoji: c.emoji,
    items: c.tags
      .filter((tag) => countByTag.has(tag))
      .map((tag) => ({ tag, count: countByTag.get(tag)! })),
  })).filter((c) => c.items.length > 0);

  // 未归入任何聚类的标签 → 其他(应对未来新标签)。
  const assigned = new Set(TAG_CLUSTERS.flatMap((c) => c.tags));
  const others = tags.filter((t) => !assigned.has(t.tag));
  if (others.length > 0) {
    groups.push({ title: "其他", emoji: "📌", items: others });
  }

  let globalIdx = 0;

  return (
    <div className="page-shell narrow">
      <div className="page-title">
        <p className="eyebrow">Index Desk</p>
        <h1>标签</h1>
        <p>用主题把每天的学习记录串起来。忘记某个知识点时，先按标签回到对应的学习轨道。</p>
      </div>

      {tags.length > 0 ? (
        <div className="tag-clusters">
          {groups.map((group) => (
            <section key={group.title} className="tag-group">
              <h2 className="tag-group-title">
                {`${group.emoji} ${group.title}`}
                <span>{group.items.reduce((s, i) => s + i.count, 0)}</span>
              </h2>
              <div className="tag-cloud">
                {group.items.map(({ tag, count }) => {
                  const idx = globalIdx++;
                  return (
                    <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`} style={{ fontSize: tagFontSize(count, maxCount), animationDelay: `${0.03 * idx}s` }}>
                      {tag}
                      <span>{count}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="eyebrow">No Index</p>
          <h3>还没有可索引的标签。</h3>
          <Link className="button primary" href="/write">写一篇并添加标签</Link>
        </div>
      )}
    </div>
  );
}
