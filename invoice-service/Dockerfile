# ── Stage 1: Install deps ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Runner with Chromium ─────────────────────────────────────────────
FROM node:20-alpine AS runner

# Install Chromium + required fonts for Puppeteer
# This is the critical step — without this Puppeteer has no browser to launch
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

# Tell Puppeteer to use the installed Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Non-root user for security
#RUN addgroup -S appgroup && adduser -S appuser -G appgroup
#USER appuser

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s \
  CMD wget -qO- http://localhost:3003/health || exit 1

CMD ["node", "src/index.js"]