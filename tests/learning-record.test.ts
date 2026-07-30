import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeLearning, type LearningEvidence, type ReviewableLab } from "../lib/learning-record.ts";

const labs: ReviewableLab[] = [{
  id: "java-s01e01",
  slug: "2026-07-25-java-s01e01-hello",
  title: "第一次让程序开口",
  knowledgePoints: ["java.main"],
  misconceptionTags: ["main-signature"],
  projectIncrement: "咖啡机可以打招呼。",
  reviewAfterDays: [1, 7, 21],
}];

const passed: LearningEvidence = {
  schemaVersion: 1, anonymousId: "local-test", labId: "java-s01e01", labVersion: 1,
  knowledgePointIds: ["java.main"], attemptBand: "1", durationBand: "2-10m", result: "passed",
  misconceptionTags: ["main-signature"], usedHint: false, recordedAt: "2026-07-01T10:00:00.000Z",
};

test("learning summary schedules due and future local review prompts", () => {
  const summary = summarizeLearning(labs, [passed], new Date("2026-07-03T10:00:00.000Z"));
  assert.equal(summary.recordedLabCount, 1);
  assert.equal(summary.passedLabCount, 1);
  assert.deepEqual(summary.dueReviews.map((item) => item.afterDays), [1]);
  assert.deepEqual(summary.upcomingReviews.map((item) => item.afterDays), [7, 21]);
  assert.deepEqual(summary.misconceptionTags, [{ tag: "main-signature", count: 1 }]);
});

test("latest local pass resets review timing and unknown labs stay out of the dashboard", () => {
  const later = { ...passed, recordedAt: "2026-07-04T10:00:00.000Z" };
  const unknown = { ...passed, labId: "other-lab" };
  const summary = summarizeLearning(labs, [passed, unknown, later], new Date("2026-07-05T09:59:00.000Z"));
  assert.equal(summary.recordedLabCount, 1);
  assert.equal(summary.dueReviews.length, 0);
  assert.equal(summary.upcomingReviews[0]?.afterDays, 1);
});
