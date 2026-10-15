# syntax=docker/dockerfile:1
# 멀티 스테이지 · standalone 산출물만 담는다(deploy-plan §3).
FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 공개 값만 빌드 인자로 받는다(이미지가 공개된다). 서버 값(API_INTERNAL_URL)은 런타임에 읽는다.
ARG NEXT_PUBLIC_KAKAO_JS_KEY
ARG GIT_SHA
ENV NEXT_PUBLIC_KAKAO_JS_KEY=$NEXT_PUBLIC_KAKAO_JS_KEY \
    GIT_SHA=$GIT_SHA \
    NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,target=/app/.next/cache pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
# 3000을 루프백에만 연다. nginx가 127.0.0.1:3000으로 넘긴다(deploy-plan §6).
ENV NODE_ENV=production HOSTNAME=127.0.0.1 PORT=3000 NEXT_TELEMETRY_DISABLED=1
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "server.js"]
