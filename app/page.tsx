import Link from "next/link";
import { getAllPublishedPosts } from "@/lib/posts";

interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  bio: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  location: string;
  company: string;
  blog: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  description: string;
  html_url: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  updated_at: string;
}

export const revalidate = 3600;
export const runtime = "nodejs";

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a3 3 0 0 0-1 5.83V8H7.5A3.5 3.5 0 0 0 4 11.5v.67a3 3 0 1 0 2 0v-.67A1.5 1.5 0 0 1 7.5 10H11v2.17a3 3 0 1 0 2 0V10h3.5a1.5 1.5 0 0 1 1.5 1.5v.67a3 3 0 1 0 2 0v-.67A3.5 3.5 0 0 0 16.5 8H13V6.83A3 3 0 0 0 12 1zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
    </svg>
  );
}

async function fetchGitHubUser(): Promise<GitHubUser | null> {
  try {
    const res = await fetch("https://api.github.com/users/WJH-makers", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchGitHubRepos(): Promise<GitHubRepo[]> {
  try {
    const res = await fetch(
      "https://api.github.com/users/WJH-makers/repos?sort=updated&per_page=6&type=public",
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function getTotalStars(repos: GitHubRepo[]): number {
  return repos.reduce((acc, r) => acc + r.stargazers_count, 0);
}

function getTopLanguages(repos: GitHubRepo[]): string[] {
  const langMap = new Map<string, number>();
  for (const repo of repos) {
    if (repo.language) {
      langMap.set(repo.language, (langMap.get(repo.language) || 0) + 1);
    }
  }
  return [...langMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([lang]) => lang);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function HomePage() {
  const [user, repos, posts] = await Promise.all([
    fetchGitHubUser(),
    fetchGitHubRepos(),
    getAllPublishedPosts(),
  ]);

  const totalStars = getTotalStars(repos);
  const topLangs = getTopLanguages(repos);
  const latestPosts = posts.slice(0, 3);

  return (
    <div className="page-shell">
      <section className="hero profile-hero">
        <div>
          <p className="eyebrow">GitHub Profile</p>
          <h1 className="profile-name">{user?.name || user?.login || "WJH-makers"}</h1>
          {user?.bio && <p className="hero-text">{user.bio}</p>}
          {user?.login && (
            <div className="hero-actions">
              <a className="button primary" href={user.html_url} target="_blank" rel="noreferrer">
                GitHub → {user.login}
              </a>
              <Link className="button" href="/posts">阅读博客</Link>
            </div>
          )}
        </div>
        <div className="hero-panel profile-panel">
          {user?.avatar_url && (
            <img
              src={user.avatar_url}
              alt={user.login}
              className="profile-avatar"
            />
          )}
          <div className="profile-meta">
            {user?.location && <span>📍 {user.location}</span>}
            {user?.company && <span>🏢 {user.company}</span>}
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <div>
          <strong>{user?.public_repos ?? "—"}</strong>
          <span>公开仓库</span>
        </div>
        <div>
          <strong>{totalStars}</strong>
          <span>累计 Star</span>
        </div>
        <div>
          <strong>{user?.followers ?? "—"}</strong>
          <span>Followers</span>
        </div>
      </section>

      <section className="section-head">
        <div>
          <p className="eyebrow">Repositories</p>
          <h2>公开仓库</h2>
        </div>
        {topLangs.length > 0 && (
          <span className="muted">{topLangs.join(" · ")}</span>
        )}
      </section>

      <div className="repo-grid">
        {repos.length > 0 ? repos.map((repo) => (
          <article className="card repo-card" key={repo.id}>
            <div className="repo-head">
              <h3>
                <a href={repo.html_url} target="_blank" rel="noreferrer">
                  {repo.name}
                </a>
              </h3>
            </div>
            {repo.description && <p>{repo.description}</p>}
            <div className="repo-meta">
              {repo.language && (
                <span className="repo-lang">
                  <span className="lang-dot" /> {repo.language}
                </span>
              )}
              {repo.stargazers_count > 0 && (
                <span><StarIcon /> {repo.stargazers_count}</span>
              )}
              {repo.forks_count > 0 && (
                <span><ForkIcon /> {repo.forks_count}</span>
              )}
              <span className="repo-updated">{formatDate(repo.updated_at)}</span>
            </div>
          </article>
        )) : (
          <div className="empty-state">
            <p className="eyebrow">No Repos</p>
            <h3>暂时没有公开仓库</h3>
          </div>
        )}
      </div>

      {latestPosts.length > 0 && (
        <>
          <section className="section-head">
            <div>
              <p className="eyebrow">Latest Dispatches</p>
              <h2>最新博客</h2>
            </div>
            <Link href="/posts">查看全部 →</Link>
          </section>
          <div className="post-grid">
            {latestPosts.map((post) => (
              <article className="card" key={post.slug}>
                <p className="date">{post.date} · {post.readingMinutes} min</p>
                <h3><Link href={`/posts/${post.slug}`}>{post.title}</Link></h3>
                <p>{post.summary}</p>
                <div className="tags">
                  {post.tags.map((tag) => (
                    <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
