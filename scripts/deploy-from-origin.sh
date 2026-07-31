#!/usr/bin/env bash
set -Eeuo pipefail

readonly REPOSITORY=/home/ubuntu/blog
readonly DEPLOY_REF=origin/production
readonly DEPLOY_FETCH_URLS=(
  "https://github.com/WJH-makers/wjh-makers-learning-blog.git"
  "git@github.com:WJH-makers/wjh-makers-learning-blog.git"
)
readonly STATE_DIR=/home/ubuntu/.local/state/wjh-blog-deploy
readonly STATE_FILE="${STATE_DIR}/last-successful-commit"
readonly SITE_ORIGIN=https://wwjjhh.online
readonly PURGE_URL_LIMIT=30
readonly BUILD_CACHE_LIMIT=8gb
readonly PRUNE_OLDER_THAN=168h
readonly FETCH_TIMEOUT=180
readonly FETCH_ATTEMPTS=2

cd "$REPOSITORY"

fetch_production_ref() {
  local url attempt
  for url in "${DEPLOY_FETCH_URLS[@]}"; do
    for attempt in $(seq 1 "$FETCH_ATTEMPTS"); do
      if timeout --signal=TERM --kill-after=10s "$FETCH_TIMEOUT" \
        git -c core.hooksPath=/dev/null fetch --quiet \
          "$url" \
          refs/heads/production:refs/remotes/origin/production; then
        return 0
      fi
      echo "Production ref fetch failed (${attempt}/${FETCH_ATTEMPTS}) via ${url}; retrying." >&2
      sleep $((attempt * 5))
    done
  done
  echo "Unable to fetch the production ref within bounded retries (HTTPS and SSH)." >&2
  return 1
}

build_purge_payload() {
  local -a urls=()
  local file slug
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    if [[ "$file" != content/posts/*.md ]]; then
      printf '{"purge_everything":true}'
      return 0
    fi
    slug="${file#content/posts/}"
    urls+=("${SITE_ORIGIN}/posts/${slug%.md}")
  done < <(git diff --name-only "$CURRENT_COMMIT" "$TARGET_COMMIT" 2>/dev/null || true)

  if [[ ${#urls[@]} -eq 0 ]]; then
    printf '{"purge_everything":true}'
    return 0
  fi

  urls+=(
    "${SITE_ORIGIN}/"
    "${SITE_ORIGIN}/posts"
    "${SITE_ORIGIN}/archive"
    "${SITE_ORIGIN}/cheatsheets"
    "${SITE_ORIGIN}/tags"
    "${SITE_ORIGIN}/series"
    "${SITE_ORIGIN}/stats"
    "${SITE_ORIGIN}/rss.xml"
    "${SITE_ORIGIN}/sitemap.xml"
    "${SITE_ORIGIN}/java"
    "${SITE_ORIGIN}/cli"
    "${SITE_ORIGIN}/cafe"
  )

  if (( ${#urls[@]} > PURGE_URL_LIMIT )); then
    printf '{"purge_everything":true}'
    return 0
  fi

  local i
  printf '{"files":['
  for i in "${!urls[@]}"; do
    (( i > 0 )) && printf ','
    printf '"%s"' "${urls[$i]}"
  done
  printf ']}'
}

purge_cloudflare_cache() {
  local token zone payload
  token="$(grep -m1 '^CLOUDFLARE_TOKEN=' .env 2>/dev/null | cut -d= -f2- || true)"
  zone="$(grep -m1 '^CLOUDFLARE_ZONE_ID=' .env 2>/dev/null | cut -d= -f2- || true)"
  if [[ -z "$token" || -z "$zone" ]]; then
    echo "CLOUDFLARE_TOKEN/CLOUDFLARE_ZONE_ID missing; edge cache was NOT purged." >&2
    return 1
  fi
  payload="$(build_purge_payload)"
  curl --fail --silent --show-error --max-time 20 \
    -X POST "https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache" \
    -H "Authorization: Bearer ${token}" \
    -H 'Content-Type: application/json' \
    --data "$payload" >/dev/null
}

prune_old_build_artifacts() {
  # BuildKit 已占到数十 GB 时会挤压 59 GB 系统盘。只处理 7 天前且未被容器使用的缓存/悬空镜像，
  # 保留近期缓存加速回滚；限时与非致命处理确保清理故障不会把健康发布误判为失败。
  timeout 180 docker buildx prune --force \
    --filter "until=${PRUNE_OLDER_THAN}" \
    --max-used-space "$BUILD_CACHE_LIMIT" >/dev/null \
    || echo "Deployment is healthy, but old BuildKit cache cleanup failed." >&2
  timeout 60 docker image prune --force \
    --filter "until=${PRUNE_OLDER_THAN}" >/dev/null \
    || echo "Deployment is healthy, but dangling image cleanup failed." >&2
}

if [[ -n "$(git status --porcelain --untracked-files=normal)" ]]; then
  echo "Refusing deployment: /home/ubuntu/blog has uncommitted changes." >&2
  exit 1
fi

fetch_production_ref
readonly TARGET_COMMIT="$(git rev-parse "$DEPLOY_REF")"
readonly CURRENT_COMMIT="$(git rev-parse HEAD)"
readonly LAST_SUCCESSFUL_COMMIT="$(cat "$STATE_FILE" 2>/dev/null || true)"

if [[ "$CURRENT_COMMIT" != "$TARGET_COMMIT" ]]; then
  git -c core.hooksPath=/dev/null merge --ff-only "$DEPLOY_REF"
fi

if [[ "$LAST_SUCCESSFUL_COMMIT" == "$TARGET_COMMIT" ]]; then
  echo "Already deployed ${TARGET_COMMIT:0:12}."
  exit 0
fi

APP_GIT_SHA="$TARGET_COMMIT" docker compose up -d --build

for attempt in $(seq 1 24); do
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' blog 2>/dev/null || true)"
  if [[ "$health" == "healthy" ]]; then
    curl --fail --silent --show-error --max-time 15 http://127.0.0.1:3001/ >/dev/null
    deployed_commit="$(curl --fail --silent --show-error --max-time 15 http://127.0.0.1:3001/api/version \
      | sed -n 's/.*"commit":"\([0-9a-f]\{40\}\)".*/\1/p')"
    if [[ "$deployed_commit" != "$TARGET_COMMIT" ]]; then
      echo "Container commit mismatch: expected ${TARGET_COMMIT:0:12}, got ${deployed_commit:-missing}." >&2
      exit 1
    fi
    install -d -m 700 "$STATE_DIR"
    printf '%s\n' "$TARGET_COMMIT" > "$STATE_FILE"
    purge_cloudflare_cache \
      || echo "Deployed ${TARGET_COMMIT:0:12} but the Cloudflare purge failed; purge manually." >&2
    prune_old_build_artifacts
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
