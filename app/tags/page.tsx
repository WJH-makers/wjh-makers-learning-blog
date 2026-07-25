import Link from "next/link";
import { getAllPublishedTags } from "@/lib/posts";

export const metadata = {
  title: "标签",
  description: "按主题浏览学习记录。",
};

export const runtime = "nodejs";
export const revalidate = 3600;

// 语义聚类:标签是专有名词,手动按「知识领域」分组比自动算法准且可控。
// 主轴 = 学习轨道,顺序对齐连载季线(基础→OOP→集合→异常IO→函数式→工程→JVM→Spring→
// 数据库→运维→前端),内容形式/IP 单列一组;长尾语法点归入对应领域,用于精确回到某一话。
// 组内保留定义顺序(主标签在前);Spring 组预列 S4+ 标签,发布后自动归位;未列入的自动归「其他」。
const TAG_CLUSTERS: { title: string; emoji: string; tags: string[] }[] = [
  { title: "Java 语言基础", emoji: "☕", tags: ["Java", "编程入门", "HelloWorld", "变量", "基本类型", "运算符", "整数除法", "if", "条件判断", "switch", "分支穿透", "循环", "死循环", "数组", "数组越界", "方法", "函数", "Scanner", "输入", "String"] },
  { title: "面向对象", emoji: "🧱", tags: ["封装", "private", "继承", "extends", "多态", "动态派发", "接口", "interface", "抽象类", "Object", "equals", "record"] },
  { title: "集合 & 泛型", emoji: "📦", tags: ["List", "ArrayList", "Set", "HashSet", "Map", "HashMap", "泛型", "generics"] },
  { title: "异常 & IO", emoji: "⚠️", tags: ["异常处理", "自定义异常", "Exception", "调试", "空指针", "NIO", "文件IO"] },
  { title: "函数式", emoji: "🌊", tags: ["函数式", "Lambda", "Stream"] },
  { title: "工程 & 构建", emoji: "🔧", tags: ["Maven", "Gradle", "构建工具", "依赖管理", "JUnit", "单元测试", "测试", "Git", "版本控制", "多模块"] },
  { title: "JVM & 性能", emoji: "🏛️", tags: ["JVM", "JDK", "OOM", "CPU"] },
  { title: "Spring & 后端", emoji: "🌱", tags: ["Spring", "Spring Boot", "SpringBoot", "HTTP", "REST", "MyBatis", "JPA", "Spring Security", "鉴权"] },
  { title: "数据库", emoji: "🗄️", tags: ["数据库", "MySQL", "Redis"] },
  { title: "系统 & 运维", emoji: "🖥️", tags: ["Linux", "Windows", "Docker", "SSH", "systemctl", "Vim", "环境配置"] },
  { title: "前端 & 标记", emoji: "🎨", tags: ["前端", "HTML", "Markdown"] },
  { title: "连载 & 项目", emoji: "📖", tags: ["Java漫画", "阿零与豆豆", "项目实战", "控制台程序", "重构"] },
  { title: "方法 & 随笔", emoji: "📝", tags: ["学习方法", "复盘", "博客", "命令速查"] },
];

function tagFontSize(count: number, maxCount: number): string {
  // 对数缩放:漫画的 IP 标签 count 高达 30+,线性会把大量 count=1 的长尾全压到最小号。
  const ratio = Math.log(count + 1) / Math.log(maxCount + 1);
  return `${0.74 + ratio * 0.5}rem`;
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
