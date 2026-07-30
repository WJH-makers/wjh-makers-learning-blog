#!/usr/bin/env bash
# txcloud pull deployment: runs only from the systemd timer, never from a
# GitHub-hosted runner. The production ref is created only after CI succeeds.
set -Eeuo pipefail

readonly REPOSITORY=/home/ubuntu/blog
readonly DEPLOY_REF=origin/production
readonly STATE_DIR=/home/ubuntu/.local/state/wjh-blog-deploy
readonly STATE_FILE="${STATE_DIR}/last-successful-commit"

cd "$REPOSITORY"

# 边缘缓存现在是主缓存层(nginx 只留 30s 回源缓冲,文章页 s-maxage=7d、首页 1d),
# 所以部署后必须主动让 CF 失效,否则新内容最长一周不可见。
# .env 不能 source:MONGODB_URI 里的 & 会让 shell 解析失败,只能逐键取值。
purge_cloudflare_cache() {
  local token zone
  token="$(grep -m1 '^CLOUDFLARE_TOKEN=' .env | cut -d= -f2-)"
  zone="$(grep -m1 '^CLOUDFLARE_ZONE_ID=' .env | cut -d= -f2-)"
  if [[ -z "$token" || -z "$zone" ]]; then
    echo "CLOUDFLARE_TOKEN/CLOUDFLARE_ZONE_ID missing; edge cache was NOT purged." >&2
    return 1
  fi
  curl --fail --silent --show-error --max-time 20 \
    -X POST "https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache" \
    -H "Authorization: Bearer ${token}" \
    -H 'Content-Type: application/json' \
    --data '{"purge_everything":true}' >/dev/null
}

# An operator's local change must never be hidden or overwritten by automation.
if [[ -n "$(git status --porcelain --untracked-files=normal)" ]]; then
  echo "Refusing deployment: /home/ubuntu/blog has uncommitted changes." >&2
  exit 1
fi

# This server was cloned as a single-branch checkout. An explicit refspec is
# required so production persists as origin/production instead of only FETCH_HEAD.
git -c core.hooksPath=/dev/null fetch --quiet origin refs/heads/production:refs/remotes/origin/production
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

docker compose up -d --build

for attempt in $(seq 1 24); do
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' blog 2>/dev/null || true)"
  if [[ "$health" == "healthy" ]]; then
    curl --fail --silent --show-error --max-time 15 http://127.0.0.1:3001/ >/dev/null
    install -d -m 700 "$STATE_DIR"
    printf '%s\n' "$TARGET_COMMIT" > "$STATE_FILE"
    # 部署已成功落地,边缘失效只是收尾:purge 失败不回滚,但必须留下明确告警,
    # 否则访客会长时间看到旧页面而运维侧毫无迹象。
    purge_cloudflare_cache \
      || echo "Deployed ${TARGET_COMMIT:0:12} but the Cloudflare purge failed; purge manually." >&2
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
