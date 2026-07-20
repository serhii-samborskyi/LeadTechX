FROM node:22-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ringport" \
  SHADOW_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ringport_shadow" \
  npx prisma generate

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV RUN_DB_DEPLOY_ON_START=0

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node server.js ./
COPY --chown=node:node calendar ./calendar
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node public ./public
COPY --chown=node:node scripts ./scripts

RUN mkdir -p logs/audio-dumps pids \
  && chmod +x scripts/docker-entrypoint.sh \
  && chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["node", "server.js"]
