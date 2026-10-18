# -------------------------------------------------------------
# Stage 1: Build static React SPA assets
# -------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests and .npmrc (handles React 19 legacy peer deps)
COPY package*.json .npmrc* ./
RUN npm install --legacy-peer-deps

# Copy application source
COPY . .

# Build arguments for environment variables embedded at build time
ARG REACT_APP_API_URL=http://localhost:4000
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV GENERATE_SOURCEMAP=false

# Build production assets
RUN npm run build

# -------------------------------------------------------------
# Stage 2: Serve static files with lightweight Nginx
# -------------------------------------------------------------
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx SPA configuration and runtime entrypoint
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy compiled static files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
