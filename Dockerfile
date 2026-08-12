# SISREG Consulta — imagem de produção.
#
# Build em dois estágios: o primeiro compila com as dependências de
# desenvolvimento, o segundo carrega só o que roda. A imagem final não leva
# TypeScript, Vite nem o código-fonte do cliente.

# ---------- estágio 1: build ----------
FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

# Copiar manifestos e patches de dependências
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ---------- estágio 2: execução ----------
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile --prod

# `dist` traz o servidor empacotado; `drizzle` traz as migrações
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY drizzle.config.ts ./

USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
