import Link from "next/link";
import { PROJECTS, STATUS_LABEL } from "@/lib/projects";
import { siteUrl } from "@/lib/posts";
import { jsonLdSafe } from "@/lib/jsonld";
import { staticPageMetadata } from "@/lib/og-base";

export const revalidate = 86400;
export const runtime = "nodejs";

const TITLE = "项目集";
const DESC = "课程平台与漫画连载的公开内容索引。";

export const metadata = staticPageMetadata({
  title: TITLE,
  description: DESC,
  path: "/projects",
});

export default function ProjectsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    url: `${siteUrl()}/projects`,
    description: DESC,
    inLanguage: "zh-CN",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: PROJECTS.length,
      itemListElement: PROJECTS.map((project, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "CreativeWork",
          name: project.name,
          description: project.lead,
          ...(project.url ? { url: project.url } : {}),
        },
      })),
    },
  };

  return (
    <div className="page-shell narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }} />

      <div className="page-title">
        <p className="eyebrow">Work · 项目集</p>
        <h1>{TITLE}</h1>
        <p>
          按「解决了什么问题」而不是「用了什么技术」来写。想看写作那一面,去{" "}
          <Link href="/series">连载总台</Link> 或 <Link href="/archive">全量归档</Link>。
        </p>
      </div>

      <div className="project-list">
        {PROJECTS.map((project) => (
          <article key={project.name} className="card project-card">
            <header className="project-head">
              <h2>{project.name}</h2>
              <span className={`project-status is-${project.status}`}>{STATUS_LABEL[project.status]}</span>
            </header>
            <p className="project-lead">{project.lead}</p>
            <p className="project-detail">{project.detail}</p>

            {project.highlights && project.highlights.length > 0 && (
              <ul className="project-highlights">
                {project.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}

            <div className="project-stack">
              {project.stack.map((tech) => (
                <span key={tech}>{tech}</span>
              ))}
            </div>

          </article>
        ))}
      </div>
    </div>
  );
}
