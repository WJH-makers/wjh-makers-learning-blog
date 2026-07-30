import { isAlwaysPublicCurriculum, isReleasedDate } from "./publication.ts";

export type PostIndexEntry = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
};

export function mergePublishedPostIndex(
  markdownPosts: readonly PostIndexEntry[],
  databasePosts: readonly PostIndexEntry[],
): PostIndexEntry[] {
  const merged = new Map<string, PostIndexEntry>();
  for (const post of markdownPosts) merged.set(post.slug, post);
  for (const post of databasePosts) merged.set(post.slug, post);
  return [...merged.values()]
    .filter((post) => isAlwaysPublicCurriculum(post.slug) || isReleasedDate(post.date))
    .sort((a, b) => b.date.localeCompare(a.date));
}
