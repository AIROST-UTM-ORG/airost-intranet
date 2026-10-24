# -------------------------------------------------------------
# Stage 1: Dependencies builder
# -------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts

# -------------------------------------------------------------
# Stage 2: Production runner
# -------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Run with non-root node user provided by the Alpine base image
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node

# Expose standard Cloud Run / Container port
EXPOSE 8080

# Start production server
CMD ["node", "server.js"]
