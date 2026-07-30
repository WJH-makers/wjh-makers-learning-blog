/**
 * Public-release boundary shared by pages, feeds and series maps.
 * A file may be written and scheduled without being public yet.
 * Dates are interpreted as China Standard Time because editorial dates are
 * authored for the site's Chinese audience, not the container's UTC clock.
 */
export function isPublicOn(date: string, now = new Date()): boolean {
  const normalized = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
  const releaseAt = Date.parse(`${normalized}T00:00:00+08:00`);
  return Number.isFinite(releaseAt) && releaseAt <= now.getTime();
}

/** The author has explicitly opened the complete Java and CLI curricula. */
export function isAlwaysPublicCurriculum(slug: string): boolean {
  return /^\d{4}-\d{2}-\d{2}-(?:java|cli)-s\d+e\d+-/.test(slug);
}

/** Scheduled episode slugs begin with their editorial YYYY-MM-DD date. */
export function isPublicEpisode(slug: string | undefined, now = new Date()): boolean {
  return Boolean(slug && (isAlwaysPublicCurriculum(slug) || isPublicOn(slug.slice(0, 10), now)));
}

/** Keep unreleased manuscripts visible as non-linkable previews. */
export function publicFacingEpisodes<T extends { status: string; slug?: string }>(episodes: T[]): T[] {
  return episodes.map((episode) => (
    episode.status === "published" && !isPublicEpisode(episode.slug)
      ? { ...episode, status: "planned" }
      : episode
  ));
}
