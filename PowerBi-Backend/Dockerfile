# syntax=docker/dockerfile:1

# ---- builder: instala todas as dependências (inclusive dev) e compila ----------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- deps: só dependências de produção, com o client Prisma já gerado ----------------------
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

# ---- runtime: imagem final enxuta — sem devDependencies, sem código-fonte TS ---------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# América/São Paulo — padronizado com os demais clientes da VPS consolidada (ver
# MIGRACAO.md): timestamp de log/auditoria não pode ter fuso ambíguo.
ENV TZ=America/Sao_Paulo

# tzdata -> TZ acima precisa do banco de fusos horários para valer de verdade no musl da
# Alpine (sem isso fica preso em UTC mesmo com a variável setada).
# curl    -> usado só pelo HEALTHCHECK abaixo.
RUN apk add --no-cache tzdata curl

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

USER nestjs

EXPOSE 3000

# GET /api/v1/health, marcado @Public() (src/health/health.controller.ts) — não depende da
# API key, então o HEALTHCHECK funciona mesmo antes de qualquer credencial configurada.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-3000}/api/v1/health" || exit 1

# Migrations aplicadas no start do container (seção 13 do documento de padrões) — garante que a
# imagem nunca sobe servindo tráfego contra um schema desatualizado. `prisma` fica como
# dependência de produção só por causa deste passo — ver "decisões que merecem revisão" no
# README se isso um dia deixar a imagem grande demais e valer a pena mover pra um passo de
# deploy separado.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
