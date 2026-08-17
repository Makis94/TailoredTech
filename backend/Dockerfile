# Multi-stage build: compile TypeScript + Prisma client in a full node image,
# then ship only the production dependencies and compiled output.

FROM node:22-alpine AS build
WORKDIR /app
# Prisma's query engine needs OpenSSL — Alpine doesn't ship it by default.
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate
COPY --from=build /app/dist ./dist

# Most PaaS providers (Render, Fly, Railway) inject their own PORT at runtime —
# main.ts already reads process.env.PORT, so this is just documentation.
EXPOSE 4000
# Apply pending migrations, then start the API. Safe to run on every deploy —
# `migrate deploy` only ever applies migrations that haven't run yet.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
