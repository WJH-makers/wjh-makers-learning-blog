import Link from "next/link";
import { getAllPublishedTags } from "@/lib/posts";

export const metadata = {
  title: "标签",
  description: "按主题浏览学习记录。",
};

export const runtime = "nodejs";
export const revalidate = 3600;

export default async function TagsPage() {
  const tags = await getAllPublishedTags();

  return (
    <div className="page-shell narrow">
      <div className="page-title">
        <p className="eyebrow">Index Desk</p>
        <h1>标签</h1>
        <p>用主题把每天的学习记录串起来。忘记某个知识点时，先按标签回到对应的学习轨道。</p>
      </div>
      <div className="tag-cloud">
        {tags.length > 0 ? tags.map(({ tag, count }) => (
          <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>{tag}<span>{count}</span></Link>
        )) : (
          <div className="empty-state">
            <p className="eyebrow">No Index</p>
            <h3>还没有可索引的标签。</h3>
            <Link className="button primary" href="/write">写一篇并添加标签</Link>
          </div>
        )}
      </div>
    </div>
  );
}
