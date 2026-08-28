import Link from "next/link";
import { cacheLife } from "next/cache";
import { siteUrl } from "@/lib/site-config";
import { getAllPublishedPosts, type Post } from "@/lib/posts";
import { extractHeadings } from "@/lib/markdown";
import { jsonLdSafe } from "@/lib/jsonld";
import { staticPageMetadata } from "@/lib/og-base";


const TITLE = "速查手册";
const DESC = "命令与语法速查总台 —— CMD / PowerShell / Git / Docker / Node / Python / Java 构建 / WSL / Neovim / VS Code / Vue / AI CLI,按「全生命周期」编排,查得到、抄得走。";

export const metadata = staticPageMetadata({
  title: TITLE,
  description: DESC,
  path: "/cheatsheets",
});

/** 与 /posts 保持同一判定口径:slug 含 cheatsheet 或带速查标签。 */
function isCheatsheet(post: Post): boolean {
  return post.slug.includes("cheatsheet") || post.tags.some((t) => t === "命令速查" || t === "速查");
}

/**
 * 速查表按「用在哪儿」分组,而不是按发布时间 —— 查手册的人心里想的是场景不是日期。
 * 未列入 ORDER 的自动落到「更多」,新增速查表不改这里也不会消失。
 */
const GROUPS: { key: string; label: string; hint: string; match: (slug: string) => boolean }[] = [
  {
    key: "shell",
    label: "终端与系统",
    hint: "两套 shell、一台机器",
    match: (s) => /cmd|powershell|linux|windows|wsl|shell|command-reference/.test(s),
  },
  {
    key: "vcs",
    label: "版本控制与容器",
    hint: "代码怎么进仓库,服务怎么进容器",
    match: (s) => /git|gh|docker/.test(s),
  },
  {
    key: "lang",
    label: "语言与构建",
    hint: "Java / Node / Python 的工程链路",
    match: (s) => /java|jvm|maven|gradle|node|npm|python|vue/.test(s),
  },
  {
    key: "editor",
    label: "编辑器与工具",
    hint: "手上这几件家伙什",
    match: (s) => /nvim|vim|vscode|ai-cli|markdown|html/.test(s),
  },
  {
    key: "data",
    label: "数据与存储",
    hint: "查询、缓存与排障",
    match: (s) => /mysql|redis|sql|db/.test(s),
  },
];

/* 本页原先内联了一份 scanHeadings(手抄 renderLines 的围栏/引用/表格三条口径)。
   已改用 lib/markdown.ts 的 extractHeadings —— 它复用渲染器同一遍历,
   锚点 id 不可能与正文漂移,这里不再留第二份实现。 */

export default async function CheatsheetsPage() {
  "use cache";
  cacheLife("content");

  const posts = (await getAllPublishedPosts()).filter(isCheatsheet);

  // 每篇取二级标题做锚点直达:速查表的价值在于「一眼看到有没有我要的那一节」。
  // 走 lib/markdown 的 extractHeadings 而不是本页手抄一份扫描器:它复用 renderLines
  // 的同一遍历与同一 slugify,所以锚点 id 与正文里真实渲染出的 id **不可能**漂移。
  // 手抄版只要 renderer 改了围栏/引用/表格任一条口径就会静默错位,而锚点错位是
  // 「点了跳不到」——页面看起来完全正常,没有任何报错。
  const withSections = await Promise.all(
    posts.map(async (post) => ({
      post,
      sections: (await extractHeadings(post.content)).filter((h) => h.level === 2).slice(0, 12),
    })),
  );

  const used = new Set<string>();
  const grouped = GROUPS.map((group) => {
    const items = withSections.filter(({ post }) => {
      if (used.has(post.slug)) return false;
      if (!group.match(post.slug)) return false;
      used.add(post.slug);
      return true;
    });
    return { ...group, items };
  }).filter((g) => g.items.length > 0);
  const rest = withSections.filter(({ post }) => !used.has(post.slug));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    url: `${siteUrl()}/cheatsheets`,
    description: DESC,
    inLanguage: "zh-CN",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: posts.length,
      itemListElement: posts.map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: post.title,
        url: `${siteUrl()}/posts/${post.slug}`,
      })),
    },
  };

  const blocks = [...grouped, ...(rest.length > 0 ? [{ key: "more", label: "更多", hint: "其余速查", items: rest }] : [])];

  return (
    <div className="page-shell narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }} />

      <div className="page-title">
        <p className="eyebrow">Cheatsheet Desk · 速查总台</p>
        <h1>{TITLE}</h1>
        <p>
          共 <strong>{posts.length}</strong> 份。每份都按「从创建到清理」的完整生命周期编排,
          不是命令的字典序堆砌 —— 下面直接列出各份的章节,点进去就是那一节。
        </p>
      </div>

      {blocks.map((group) => (
        <section key={group.key} className="cheat-group">
          <div className="section-head">
            <div>
              <p className="eyebrow">{group.label}</p>
              <h2>{group.hint}</h2>
            </div>
            <span className="muted">{group.items.length} 份</span>
          </div>
          <div className="cheat-cards">
            {group.items.map(({ post, sections }) => (
              <article key={post.slug} className="card cheat-card">
                <h3>
                  <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                </h3>
                <p className="muted">{post.summary}</p>
                {sections.length > 0 && (
                  <ul className="cheat-sections">
                    {sections.map((section) => (
                      <li key={section.id}>
                        <Link href={`/posts/${post.slug}#${section.id}`}>{section.text}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
