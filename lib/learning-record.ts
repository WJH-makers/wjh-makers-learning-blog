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
