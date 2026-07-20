FROM docker.m.daocloud.io/library/node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM docker.m.daocloud.io/library/node:20-alpine AS build-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM docker.m.daocloud.io/library/node:20-alpine AS builder
WORKDIR /app
COPY --from=build-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && rm -rf .next/cache

FROM docker.m.daocloud.io/library/node:20-alpine AS runner
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
