#!/bin/sh
set -e

# If REACT_APP_API_URL is supplied at runtime, inject it into the compiled JS bundles.
# This allows the same pre-built Docker image to work across development, staging, production,
# LAN IPs, and custom domains without requiring a rebuild.
if [ -n "$REACT_APP_API_URL" ] && [ -d "/usr/share/nginx/html/static/js" ]; then
  # Strip trailing slash if present
  CLEAN_API_URL="$(echo "$REACT_APP_API_URL" | sed 's|/*$||')"
  echo "Injecting runtime API URL into static assets: $CLEAN_API_URL"
  find /usr/share/nginx/html/static/js -type f -name '*.js' -exec sed -i "s|__REACT_APP_API_URL__|$CLEAN_API_URL|g; s|http://localhost:4000|$CLEAN_API_URL|g" {} +
fi

exec "$@"
