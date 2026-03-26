FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci

# Copy source and build the Next.js app
COPY . .
RUN npm run build --workspace web

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace", "web", "--", "-H", "0.0.0.0", "-p", "3000"]
