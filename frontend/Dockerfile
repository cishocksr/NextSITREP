# Multi-platform index digests; Linux ARM64 is the T08 verification candidate.
FROM oven/bun:1.4.4-slim@sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4 AS bun
FROM node:24.22.2-bookworm-slim@sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9 AS base

FROM base AS dependencies
WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN test "$(node --version)" = "v24.22.2" \
    && test "$(bun --version)" = "1.4.4" \
    && bun install --frozen-lockfile

FROM dependencies AS build
# Routing only, never a secret. Next captures rewrites at build time.
ARG API_PROXY_TARGET=http://backend:8080
ENV API_PROXY_TARGET=$API_PROXY_TARGET \
    NEXT_TELEMETRY_DISABLED=1
COPY . .
# public can be absent in a clean clone when it has no tracked files.
RUN mkdir -p public && node node_modules/next/dist/bin/next build --webpack

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
# Root owns application code; the server cannot rewrite its own application.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
RUN mkdir -p .next/cache && chown node:node .next/cache
USER 1000:1000
EXPOSE 3000
STOPSIGNAL SIGTERM
CMD ["node", "server.js"]
