#!/usr/bin/env bash
set -Eeuo pipefail

readonly REPOSITORY=/home/ubuntu/blog
readonly DEPLOY_REF=origin/production
readonly DEPLOY_FETCH_URLS=(
  "git@github.com:WJH-makers/wjh-makers-learning-blog.git"
  "https://github.com/WJH-makers/wjh-makers-learning-blog.git"
)
readonly STATE_DIR=/home/ubuntu/.local/state/wjh-blog-deploy
readonly STATE_FILE="${STATE_DIR}/last-successful-commit"
readonly SITE_ORIGIN=https://wwjjhh.online
readonly PURGE_URL_LIMIT=30
# IndexNow:把变更 URL 主动推给 Bing / Yandex,不必等它们下次爬到。
# key 是设计上公开的 —— 校验方式就是取 https://<host>/<key>.txt 比对内容,
# 因此它随仓库一起发布,不是泄漏。
readonly INDEXNOW_KEY=8776802adf13c37829f7a2470db76e73
readonly INDEXNOW_ENDPOINT=https://api.indexnow.org/indexnow
readonly INDEXNOW_URL_LIMIT=1000
readonly BUILD_CACHE_LIMIT=8gb
readonly PRUNE_OLDER_THAN=168h
readonly FETCH_TIMEOUT=180
readonly FETCH_ATTEMPTS=2
readonly DEPLOY_TOKEN_FILE="${STATE_DIR}/current-deploy-verification-token"

# token 不进入 .env 或日志。把它放在 0700 state 目录里只保留到下次发布：
# compose 已启动而脚本/服务被中断时，后续重试仍能验证当前健康容器，而不是因新 token
# 与容器启动时的 token 不同而形成永久失败循环。
DEPLOY_VERIFICATION_TOKEN="$(cat "$DEPLOY_TOKEN_FILE" 2>/dev/null || true)"
if [[ ! "$DEPLOY_VERIFICATION_TOKEN" =~ ^[0-9a-f]{64}$ ]]; then
  DEPLOY_VERIFICATION_TOKEN="$(od -vAn -N32 -tx1 /dev/urandom | tr -d ' \n')"
fi
readonly DEPLOY_VERIFICATION_TOKEN

cd "$REPOSITORY"

fetch_production_ref() {
  local url attempt
  for url in "${DEPLOY_FETCH_URLS[@]}"; do
    for attempt in $(seq 1 "$FETCH_ATTEMPTS"); do
      # CI 用 `git push --force` 重写 refs/heads/production(每次发布都指向新测过的 SHA),
      # 所以本地 origin/production 常常不是新引用的祖先。不带 `+` 的 refspec 会被
      # Git 以 non-fast-forward 拒绝(exit 1),而外层只会打印"fetch failed",
      # 看起来像网络问题 —— 实际每轮重试都注定失败,发布永远卡在旧提交。
      if timeout --signal=TERM --kill-after=10s "$FETCH_TIMEOUT" \
        git -c core.hooksPath=/dev/null fetch --quiet \
          "$url" \
          "+refs/heads/production:refs/remotes/origin/production"; then
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

submit_indexnow() {
  local -a urls=()
  local file slug payload i

  # 只推文章:栏目页由 sitemap 覆盖,没必要每次部署都刷一遍。
  # 注意重命名会被 git 记成一删一增,两个 URL 都进列表 —— 这是想要的:
  # 旧地址需要被重新抓取才能拿到 308,新地址需要被首次发现。
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    [[ "$file" != content/posts/*.md ]] && continue
    slug="${file#content/posts/}"
    urls+=("${SITE_ORIGIN}/posts/${slug%.md}")
  done < <(git diff --name-only "$CURRENT_COMMIT" "$TARGET_COMMIT" 2>/dev/null || true)

  # 没有文章变更时推首页即可,让索引端知道站点动过。
  if [[ ${#urls[@]} -eq 0 ]]; then
    urls=("${SITE_ORIGIN}/")
  fi
  if (( ${#urls[@]} > INDEXNOW_URL_LIMIT )); then
    echo "IndexNow: ${#urls[@]} 个 URL 超过单次上限,只提交前 ${INDEXNOW_URL_LIMIT} 个。" >&2
    urls=("${urls[@]:0:INDEXNOW_URL_LIMIT}")
  fi

  payload="$(
    printf '{"host":"wwjjhh.online","key":"%s","keyLocation":"%s/%s.txt","urlList":[' \
      "$INDEXNOW_KEY" "$SITE_ORIGIN" "$INDEXNOW_KEY"
    for i in "${!urls[@]}"; do
      (( i > 0 )) && printf ','
      printf '"%s"' "${urls[$i]}"
    done
    printf ']}'
  )"

  curl --fail --silent --show-error --max-time 20 \
    -X POST "$INDEXNOW_ENDPOINT" \
    -H 'Content-Type: application/json; charset=utf-8' \
    --data "$payload" >/dev/null
}

sync_r2_assets() {
  # 图片资产必须在容器起来之前就位:Dockerfile 在 R2_PUBLIC_URL 非空时会
  # `rm -rf /app/public/{comics,images}`,生产镜像里没有本地副本 —— R2 少一个对象
  # 就是永久破图,没有任何回退路径。
  #
  # 2026-08-20 实测过这个缺口的代价:cafe/career/cli 三个系列封面的 12 个变体
  # 从未上传过,3 个系列首页 + 约 85 篇文章的正文顶部一直是破图;另有 13 个重新
  # 生成过的漫画在边缘停留旧字节。原因就是同步是纯手工步骤,没有任何自动环节
  # 会发现它没跑 —— CI 只对这个脚本做 py_compile 语法检查。
  #
  # 幂等:未变更的对象按 HEAD 的 Content-Length 跳过,只上传缺失与字节数不符的。
  if ! grep -q '^R2_PUBLIC_URL=.' .env 2>/dev/null; then
    echo "R2_PUBLIC_URL not configured; images are served from the origin image and need no sync."
    return 0
  fi
  python3 ops/sync-r2-assets.py --workers 6
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

# production 是 CI 强推的「已测试发布指针」,不是一条只增不减的开发分支。
# 在工作树已确认干净后,必须精确对齐它而非 merge --ff-only：
# 强推会让旧服务器 HEAD 与新引用分叉,ff-only 会永久拒绝发布；
# reset 只丢弃服务器上未进入发布引用的旧**提交**,绝不覆盖未提交人工改动(159 行已拒绝)。
if [[ "$CURRENT_COMMIT" != "$TARGET_COMMIT" ]]; then
  git reset --hard "$DEPLOY_REF"
fi

if [[ "$LAST_SUCCESSFUL_COMMIT" == "$TARGET_COMMIT" ]]; then
  echo "Already deployed ${TARGET_COMMIT:0:12}."
  exit 0
fi

# 资产先于容器就位。这一步阻断发布而不是仅告警:镜像里没有图片副本,同步没跑完就
# 起容器,读者看到的是破图 —— 那和「构建失败」一样是不该被接受的发布状态。
# 脚本内部已有 4 次退避重试,所以走到这里的失败是持续性故障,不是抖动。
sync_r2_assets

# 先持久化再启动容器，避免 systemd 超时/连接中断恰好发生在 compose 成功之后时
# 令牌丢失；权限由 STATE_DIR 的 0700 继承，并在接受发布后立即删除。
printf '%s\n' "$DEPLOY_VERIFICATION_TOKEN" > "$DEPLOY_TOKEN_FILE"
chmod 600 "$DEPLOY_TOKEN_FILE"

APP_GIT_SHA="$TARGET_COMMIT" env DEPLOY_VERIFICATION_TOKEN="$DEPLOY_VERIFICATION_TOKEN" docker compose up -d --build

for attempt in $(seq 1 24); do
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' blog 2>/dev/null || true)"
  if [[ "$health" == "healthy" ]]; then
    curl --fail --silent --show-error --max-time 15 http://127.0.0.1:3001/ >/dev/null
    deployed_commit="$(curl --fail --silent --show-error --max-time 15 \
      -H "X-Deploy-Verification-Token: $DEPLOY_VERIFICATION_TOKEN" \
      http://127.0.0.1:3001/api/version \
      | sed -n 's/.*"commit":"\([0-9a-f]\{40\}\)".*/\1/p')"
    if [[ "$deployed_commit" != "$TARGET_COMMIT" ]]; then
      echo "Container commit mismatch: expected ${TARGET_COMMIT:0:12}, got ${deployed_commit:-missing}." >&2
      exit 1
    fi
    install -d -m 700 "$STATE_DIR"
    printf '%s\n' "$TARGET_COMMIT" > "$STATE_FILE"
    rm -f "$DEPLOY_TOKEN_FILE"
    purge_cloudflare_cache \
      || echo "Deployed ${TARGET_COMMIT:0:12} but the Cloudflare purge failed; purge manually." >&2
    submit_indexnow \
      || echo "Deployed ${TARGET_COMMIT:0:12} but the IndexNow submission failed; search engines will pick it up on their own schedule." >&2
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
