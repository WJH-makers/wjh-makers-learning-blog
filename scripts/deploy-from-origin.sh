#!/usr/bin/env bash
# txcloud pull deployment: runs only from the systemd timer, never from a
# GitHub-hosted runner. The production ref is created only after CI succeeds.
set -Eeuo pipefail

readonly REPOSITORY=/home/ubuntu/blog
readonly DEPLOY_REF=origin/production
readonly STATE_DIR=/home/ubuntu/.local/state/wjh-blog-deploy
readonly STATE_FILE="${STATE_DIR}/last-successful-commit"

cd "$REPOSITORY"

# An operator's local change must never be hidden or overwritten by automation.
if [[ -n "$(git status --porcelain --untracked-files=normal)" ]]; then
  echo "Refusing deployment: /home/ubuntu/blog has uncommitted changes." >&2
  exit 1
fi

git -c core.hooksPath=/dev/null fetch --quiet origin production
readonly TARGET_COMMIT="$(git rev-parse "$DEPLOY_REF")"
readonly CURRENT_COMMIT="$(git rev-parse HEAD)"
readonly LAST_SUCCESSFUL_COMMIT="$(cat "$STATE_FILE" 2>/dev/null || true)"

if [[ "$CURRENT_COMMIT" != "$TARGET_COMMIT" ]]; then
  git -c core.hooksPath=/dev/null merge --ff-only "$DEPLOY_REF"
fi

# A failed Docker build intentionally retries on the next timer tick even
# though Git has already advanced to the same commit.
if [[ "$LAST_SUCCESSFUL_COMMIT" == "$TARGET_COMMIT" ]]; then
  echo "Already deployed ${TARGET_COMMIT:0:12}."
  exit 0
fi

sudo docker compose up -d --build

for attempt in $(seq 1 24); do
  health="$(sudo docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' blog 2>/dev/null || true)"
  if [[ "$health" == "healthy" ]]; then
    curl --fail --silent --show-error --max-time 15 http://127.0.0.1:3001/ >/dev/null
    install -d -m 700 "$STATE_DIR"
    printf '%s\n' "$TARGET_COMMIT" > "$STATE_FILE"
    echo "Deployment healthy: ${TARGET_COMMIT:0:12}."
    exit 0
  fi
  if [[ "$health" == "unhealthy" || "$health" == "missing" ]]; then
    echo "Container health is ${health}; deployment is not accepted." >&2
    exit 1
  fi
  sleep 5
done

echo "Timed out waiting for the blog container health check." >&2
exit 1
