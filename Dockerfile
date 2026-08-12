# SISREG Consulta — imagem de produção.
#
# Build em dois estágios: o primeiro compila com as dependências de
# desenvolvimento, o segundo carrega só o que roda. A imagem final não leva
# TypeScript, Vite nem o código-fonte do cliente.

# ---------- estágio 1: build ----------
FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

# Copiar só os manifestos primeiro faz o Docker reaproveitar a camada de
# dependências enquanto o package.json não mudar — o build seguinte não
# reinstala tudo de novo.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ---------- estágio 2: execução ----------
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# `dist` traz o servidor empacotado; `drizzle` traz as migrações, necessárias
# para o schema do banco acompanhar a versão que subiu.
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY drizzle.config.ts ./

# Não roda como root. Se um dia houver falha de execução remota, o processo
# comprometido não é dono do sistema de arquivos da imagem.
USER node

EXPOSE 3000

# O servidor se recusa a subir com configuração insegura — ver
# server/_core/guarda-producao.ts. Falhar aqui é o comportamento desejado.
CMD ["node", "dist/index.js"]
