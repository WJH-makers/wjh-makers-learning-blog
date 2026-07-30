import Link from "next/link";
import { CHARACTERS } from "@/lib/universe";
import { staticPageMetadata } from "@/lib/og-base";

export const revalidate = 3600;
export const runtime = "nodejs";

export const metadata = staticPageMetadata({
  title: "咖啡站角色档案",
  description: "阿零、豆豆、特米与领姐：每位角色都负责一类工程问题与成长视角。",
  path: "/characters",
});

export default function CharactersPage() {
  return (
    <div className="page-shell narrow universe-page">
      <div className="page-title">
        <p className="eyebrow">Character Index · 角色档案</p>
        <h1>每个角色都守着一条原则</h1>
        <p>角色不是技术术语的拟人化贴纸。他们负责让抽象概念在具体选择、错误和关系里留下记忆。</p>
      </div>

      <div className="character-list">
        {CHARACTERS.map((character, index) => (
          <article className="card character-card" key={character.name}>
            <p className="character-mark">{String(index + 1).padStart(2, "0")}</p>
            <div>
              <h2>{character.name}</h2>
              <p className="character-role">{character.role}</p>
              <p>{character.description}</p>
              <Link href={character.route}>进入关联主线 →</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
