# node:20-alpine 已 EOL;standalone 产物只需能跑 next build 的 Node。
# 用 node:22-alpine(当前 LTS,维护到 2027)。原 `deps` stage(--omit=dev)从未被引用:
# runner 只 COPY .next/standalone,依赖由 standalone 自带,故删掉那一整段死代码。
FROM docker.m.daocloud.io/library/node:22-alpine AS build-deps
WORKDIR /app
COPY package*.json ./
# 只用 npm ci:它严格按 package-lock.json 装。原来的 `npm ci || npm install` 回退看着稳,
# 实则是供应链缺口 —— lockfile 与 package.json 一旦不同步,构建会静默改按语义化范围解析,
# 装进一批没人审过的版本。宁可让构建失败在这里,也不要上线一个成分不明的镜像。
RUN npm config set fetch-timeout 60000 && npm ci

FROM docker.m.daocloud.io/library/node:22-alpine AS builder
ARG NEXT_PUBLIC_SITE_URL
ARG APP_GIT_SHA=unknown
ARG R2_PUBLIC_URL
# NEXT_PUBLIC_* 由 next build 内联进前端 bundle,只能在构建期传入;
# 放到 runner 的 env_file 里前端读不到(那时 JS 早已生成)。
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY} \
    R2_PUBLIC_URL=${R2_PUBLIC_URL} \
    APP_GIT_SHA=${APP_GIT_SHA}
WORKDIR /app
COPY --from=build-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && rm -rf .next/cache

FROM docker.m.daocloud.io/library/node:22-alpine AS runner
ARG APP_GIT_SHA=unknown
ARG R2_PUBLIC_URL
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    APP_GIT_SHA=${APP_GIT_SHA}
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/content ./content
COPY --from=builder /app/public ./public
# Once the R2 public origin is configured, the immutable comic/map payloads are
# served from the edge and do not need to consume origin image space or bandwidth.
# Empty R2_PUBLIC_URL keeps the local fallback for development and rollback.
RUN if [ -n "$R2_PUBLIC_URL" ]; then rm -rf /app/public/comics /app/public/images; fi \
    && chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "server.js"]
