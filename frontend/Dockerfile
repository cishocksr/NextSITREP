FROM oven/bun:1 AS build

WORKDIR /app

# Next rewrites capture this server-only origin during the build.
ARG API_PROXY_TARGET=http://backend:8080
ENV API_PROXY_TARGET=$API_PROXY_TARGET

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app ./

EXPOSE 3000

CMD ["bun", "run", "start"]
