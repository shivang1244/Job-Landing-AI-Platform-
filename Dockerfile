FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci

# Copy source and build the Next.js app
COPY . .
RUN npm run build --workspace web

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
