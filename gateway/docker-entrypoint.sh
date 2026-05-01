#!/bin/sh
set -e

# ── Default values for environment variables ────────────────────────
# These are used if not provided
export SERVER_NAME="${SERVER_NAME:-localhost api.invoicehive.io}"
export ALLOWED_ORIGIN_1="${ALLOWED_ORIGIN_1:-http://localhost:3000}"
export ALLOWED_ORIGIN_2="${ALLOWED_ORIGIN_2:-https://invoicehive.io}"
export ALLOWED_ORIGIN_3="${ALLOWED_ORIGIN_3:-https://www.invoicehive.io}"

echo "Nginx Configuration:"
echo "  SERVER_NAME: $SERVER_NAME"
echo "  ALLOWED_ORIGIN_1: $ALLOWED_ORIGIN_1"
echo "  ALLOWED_ORIGIN_2: $ALLOWED_ORIGIN_2"
echo "  ALLOWED_ORIGIN_3: $ALLOWED_ORIGIN_3"
echo ""

# ── Substitute environment variables in the template ─────────────────
envsubst '
  ${SERVER_NAME}
  ${ALLOWED_ORIGIN_1}
  ${ALLOWED_ORIGIN_2}
  ${ALLOWED_ORIGIN_3}
  ' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

echo "✓ Nginx config generated at /etc/nginx/conf.d/default.conf"
echo ""

# ── Test the config before starting ──────────────────────────────────
nginx -t

# ── Start nginx in foreground ────────────────────────────────────────
echo "Starting nginx..."
exec nginx -g "daemon off;"
