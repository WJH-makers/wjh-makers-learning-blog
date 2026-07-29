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

/**
 * The author has explicitly opened the complete Java, CLI and Cafe curricula.
 *
 * Cafe is included because its seven seasons are finished and its editorial
 * dates were moved back to already-elapsed days. The file names keep the
 * original 2026-11/12 schedule on purpose: those slugs are the public URLs,
 * they are already indexed and have been opened by real readers, so renaming
 * them would break live links. Series data only carries slugs, not front
 * matter dates, hence the explicit allow-list here.
 */
export function isAlwaysPublicCurriculum(slug: string): boolean {
  return /^\d{4}-\d{2}-\d{2}-(?:java|cli|cafe)-s\d+e\d+-/.test(slug);
}

/** Scheduled episode slugs begin with their editorial YYYY-MM-DD date. */
export function isPublicEpisode(slug: string | undefined, now = new Date()): boolean {
  return Boolean(slug && (isAlwaysPublicCurriculum(slug) || isPublicOn(slug.slice(0, 10), now)));
}
