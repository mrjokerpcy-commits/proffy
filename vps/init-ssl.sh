#!/bin/bash
# Run once on VPS to get the first SSL certificate.
# After this, certbot container handles renewals automatically.
set -e

EMAIL="admin@proffy.study"  # change if needed

# 1. Start nginx in HTTP-only mode so ACME challenge can be served
#    (nginx.conf already has the /.well-known/acme-challenge/ location)
docker compose up -d nginx certbot

# Give nginx a moment to start
sleep 3

# 2. Issue cert for all three domains
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive \
  -d proffy.study \
  -d www.proffy.study \
  -d app.proffy.study

echo ""
echo "Cert issued. Reloading nginx with HTTPS config..."
docker compose exec nginx nginx -s reload

echo "Done. Visit https://proffy.study"
