import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

type CoverageSummary = {
  totalPosts: number;
  standalonePosts: number;
  seriesFiles: number;
  registeredEpisodes: number;
  currentPublicEpisodes: number;
  scheduledEpisodes: number;
  plannedEpisodes: number;
  comicSources: number;
  currentPublicWithoutVisual: number;
  comicChaptersWithoutVisual: number;
  registeredWithoutPost: number;
  orphanComics: number;
};

type SeriesCoverage = {
  total: number;
  currentPublic: number;
  scheduled: number;
  planned: number;
  currentWithoutVisual: number;
  comicChaptersWithoutVisual: number;
};

test("内容覆盖审计按公开、排期与蓝图完整分区", () => {
  const result = spawnSync(process.execPath, ["scripts/audit-coverage.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, CONTENT_AUDIT_DATE: "2026-08-11" },
  });
  assert.equal(result.status, 0, result.stderr);

  const report = JSON.parse(result.stdout) as {
    summary: CoverageSummary;
    perSeries: SeriesCoverage[];
  };
  const { summary, perSeries } = report;

  assert.equal(summary.seriesFiles, perSeries.length);
  assert.ok(perSeries.every((row) => row.total > 0));
  assert.equal(summary.registeredEpisodes, perSeries.reduce((sum, row) => sum + row.total, 0));
  assert.equal(
    summary.registeredEpisodes,
    summary.currentPublicEpisodes + summary.scheduledEpisodes + summary.plannedEpisodes,
  );
  assert.equal(
    summary.currentPublicEpisodes,
    perSeries.reduce((sum, row) => sum + row.currentPublic, 0),
  );
  assert.equal(summary.scheduledEpisodes, perSeries.reduce((sum, row) => sum + row.scheduled, 0));
  assert.equal(summary.plannedEpisodes, perSeries.reduce((sum, row) => sum + row.planned, 0));
  assert.equal(
    summary.currentPublicWithoutVisual,
    perSeries.reduce((sum, row) => sum + row.currentWithoutVisual, 0),
  );
  assert.equal(
    summary.comicChaptersWithoutVisual,
    perSeries.reduce((sum, row) => sum + row.comicChaptersWithoutVisual, 0),
  );
  assert.equal(
    summary.totalPosts,
    summary.currentPublicEpisodes + summary.scheduledEpisodes + summary.standalonePosts,
  );
  assert.ok(summary.comicSources > 0);
  assert.ok(summary.currentPublicWithoutVisual <= summary.currentPublicEpisodes);
  assert.ok(summary.comicChaptersWithoutVisual <= summary.currentPublicWithoutVisual);
  assert.equal(summary.registeredWithoutPost, 0);
  assert.equal(summary.orphanComics, 0);
});
