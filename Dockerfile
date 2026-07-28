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
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
WORKDIR /app
COPY --from=build-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && rm -rf .next/cache

FROM docker.m.daocloud.io/library/node:22-alpine AS runner
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/content ./content
COPY --from=builder /app/public ./public
RUN chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "server.js"]
