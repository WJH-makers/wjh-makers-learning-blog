/** Client-local learning evidence. No function in this module performs I/O over
 * the network; the event shape is intentionally too small to carry source,
 * terminal output, file paths, identity data or device fingerprints. */

export const LEARNING_RECORD_KEY = "doudou-learning:evidence-v1";
export const LEARNING_SETTINGS_KEY = "doudou-learning:settings-v1";
export const LEARNING_EVIDENCE_FIELDS = [
  "schemaVersion", "anonymousId", "labId", "labVersion", "knowledgePointIds",
  "attemptBand", "durationBand", "result", "misconceptionTags", "usedHint", "recordedAt",
] as const;

export type AttemptBand = "1" | "2-3" | "4+";
export type DurationBand = "under-2m" | "2-10m" | "10m+";
export type LabResult = "passed" | "failed" | "cancelled" | "not-run";

export type LearningEvidence = {
  schemaVersion: 1;
  anonymousId: string;
  labId: string;
  labVersion: number;
  knowledgePointIds: string[];
  attemptBand: AttemptBand;
  durationBand: DurationBand;
  result: LabResult;
  misconceptionTags: string[];
  usedHint: boolean;
  recordedAt: string;
};

export type LearningSettings = { anonymousSyncEnabled: boolean };

/** The small public shape needed to turn a local lab record into a review cue. */
export type ReviewableLab = {
  id: string;
  slug: string;
  title: string;
  knowledgePoints: readonly string[];
  misconceptionTags: readonly string[];
  projectIncrement: string;
  reviewAfterDays: readonly number[];
};

export type LearningReview = {
  lab: ReviewableLab;
  dueAt: string;
  afterDays: number;
  status: "due" | "upcoming";
};

export type LearningDashboardSummary = {
  recordedLabCount: number;
  passedLabCount: number;
  dueReviews: LearningReview[];
  upcomingReviews: LearningReview[];
  misconceptionTags: Array<{ tag: string; count: number }>;
};

function storage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = storage()?.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Privacy mode and quota failures retain a fully usable no-storage fallback.
  }
}

export function getLearningSettings(): LearningSettings {
  const raw = readJson<Partial<LearningSettings>>(LEARNING_SETTINGS_KEY, {});
  return { anonymousSyncEnabled: raw.anonymousSyncEnabled === true };
}

export function setAnonymousSyncEnabled(enabled: boolean): void {
  writeJson(LEARNING_SETTINGS_KEY, { anonymousSyncEnabled: enabled });
}

export function anonymousId(): string {
  const existing = storage()?.getItem("doudou-learning:anonymous-id");
  if (existing) return existing;
  const generated = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try { storage()?.setItem("doudou-learning:anonymous-id", generated); } catch { /* no-op */ }
  return generated;
}

export function bandAttempt(attempts: number): AttemptBand {
  return attempts <= 1 ? "1" : attempts <= 3 ? "2-3" : "4+";
}

export function bandDuration(milliseconds: number): DurationBand {
  return milliseconds < 120_000 ? "under-2m" : milliseconds < 600_000 ? "2-10m" : "10m+";
}

/** Keeps the persisted event allow-listed even when a UI caller passes extra fields. */
export function recordLearningEvidence(event: Omit<LearningEvidence, "schemaVersion" | "anonymousId" | "recordedAt">): LearningEvidence {
  const safe: LearningEvidence = {
    schemaVersion: 1,
    anonymousId: anonymousId(),
    labId: event.labId,
    labVersion: event.labVersion,
    knowledgePointIds: [...event.knowledgePointIds],
    attemptBand: event.attemptBand,
    durationBand: event.durationBand,
    result: event.result,
    misconceptionTags: [...event.misconceptionTags],
    usedHint: event.usedHint,
    recordedAt: new Date().toISOString(),
  };
  const history = readJson<LearningEvidence[]>(LEARNING_RECORD_KEY, []);
  writeJson(LEARNING_RECORD_KEY, [...history.slice(-199), safe]);
  return safe;
}

export function readLearningEvidence(): LearningEvidence[] {
  return readJson<LearningEvidence[]>(LEARNING_RECORD_KEY, []);
}

export function exportLearningEvidence(): string {
  return JSON.stringify({ schemaVersion: 1, events: readLearningEvidence() }, null, 2);
}

export function clearLocalLearningData(): void {
  try {
    storage()?.removeItem(LEARNING_RECORD_KEY);
    storage()?.removeItem(LEARNING_SETTINGS_KEY);
    storage()?.removeItem("doudou-learning:anonymous-id");
  } catch { /* no-op */ }
}

function validRecordedAt(value: string): number | undefined {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

/**
 * Derives a private study dashboard from data already held in this browser.
 * A later self-declared local run resets the review cycle for that lab; there
 * is no server score, learner profile, source code, or telemetry involved.
 *
 * `now` 是**必填**的,不给默认值。原来写 `now = new Date()`,读起来像个便利默认值,
 * 实际是把「读当前时间」藏进了函数签名 —— 开启 cacheComponents 后 /learning 的
 * 预渲染直接报硬错误(Route "/learning" used `new Date()` inside a Client Component
 * without a Suspense boundary)。时间从哪来必须由调用方显式表达:
 * 浏览器里传 new Date(),预渲染阶段传固定时刻,测试传断言用的时刻。
 */
export function summarizeLearning(
  labs: readonly ReviewableLab[],
  events: readonly LearningEvidence[],
  now: Date,
): LearningDashboardSummary {
  const labsById = new Map(labs.map((lab) => [lab.id, lab]));
  const latestPassed = new Map<string, LearningEvidence>();
  const recordedLabs = new Set<string>();
  const misconceptionCounts = new Map<string, number>();

  for (const event of events) {
    if (!labsById.has(event.labId)) continue;
    recordedLabs.add(event.labId);
    for (const tag of event.misconceptionTags) {
      misconceptionCounts.set(tag, (misconceptionCounts.get(tag) ?? 0) + 1);
    }
    if (event.result !== "passed") continue;
    const previous = latestPassed.get(event.labId);
    const eventTime = validRecordedAt(event.recordedAt);
    const previousTime = previous ? validRecordedAt(previous.recordedAt) : undefined;
    if (eventTime !== undefined && (previousTime === undefined || eventTime > previousTime)) {
      latestPassed.set(event.labId, event);
    }
  }

  const dueReviews: LearningReview[] = [];
  const upcomingReviews: LearningReview[] = [];
  for (const [labId, event] of latestPassed) {
    const lab = labsById.get(labId);
    const recordedAt = validRecordedAt(event.recordedAt);
    if (!lab || recordedAt === undefined) continue;
    for (const afterDays of lab.reviewAfterDays) {
      const dueAt = new Date(recordedAt + afterDays * 86_400_000);
      const review: LearningReview = {
        lab,
        dueAt: dueAt.toISOString(),
        afterDays,
        status: dueAt.getTime() <= now.getTime() ? "due" : "upcoming",
      };
      (review.status === "due" ? dueReviews : upcomingReviews).push(review);
    }
  }

  const byDueAt = (left: LearningReview, right: LearningReview) => left.dueAt.localeCompare(right.dueAt);
  return {
    recordedLabCount: recordedLabs.size,
    passedLabCount: latestPassed.size,
    dueReviews: dueReviews.sort(byDueAt),
    upcomingReviews: upcomingReviews.sort(byDueAt),
    misconceptionTags: [...misconceptionCounts]
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag)),
  };
}
