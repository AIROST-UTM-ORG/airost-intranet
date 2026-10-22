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

# Optional build arguments for environment variables embedded at build time (defaults to relative routing)
ARG REACT_APP_API_URL=""
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

# Copy custom Nginx SPA configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
