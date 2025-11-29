# ---- Base build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy only package manifests first for dependency caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy rest of the source code
COPY . .

# Build the project (compiles server.ts → dist/server.js)
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only what’s needed for runtime
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/pages ./src/pages

# Expose the app port
EXPOSE 3000

# Healthcheck (optional, but recommended)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start command (Next.js custom server)
CMD ["node", "dist/server.js"]
