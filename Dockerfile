FROM node:24.19-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM node:24.19-alpine AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable \
  && corepack prepare pnpm@11.22.0 --activate \
  && pnpm install --prod --frozen-lockfile --ignore-scripts

COPY --from=build /app/.output ./.output
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/drizzle ./drizzle

RUN chmod +x ./scripts/docker-entrypoint.sh \
  && chown -R node:node /app

USER node
EXPOSE 3000
ENTRYPOINT ["sh", "/app/scripts/docker-entrypoint.sh"]
