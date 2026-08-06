# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY infra/package.json infra/package.json
COPY packages/parental-consent-schema/package.json packages/parental-consent-schema/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY apps/api apps/api
COPY packages/parental-consent-schema packages/parental-consent-schema

RUN pnpm --filter @scouts-cluj/parental-consent-schema build \
    && pnpm --filter api build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV="production"

WORKDIR /app

COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/package.json ./apps/api/package.json
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/parental-consent-schema/package.json ./packages/parental-consent-schema/package.json
COPY --from=build /app/packages/parental-consent-schema/dist ./packages/parental-consent-schema/dist

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
