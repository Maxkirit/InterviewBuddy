#!/bin/bash
set -e

required_files="
/secrets/db.env
/secrets/jwt_private.pem
/secrets/refresh_secret
/secrets/google_client_secret
"

for file in $required_files; do
  if [ ! -r "$file"]; then
    echo "[svc-auth] ERROR: missing or unreadable secret file: $file"
    exit 1
  fi
  echo "[svc-auth] Found $file"
done

set -a
. /secrets/db.env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[svc-auth] ERROR: DATABASE_URL is missing"
  exit 1
fi

echo "[svc-auth] Found all secrets. Starting init..."


npx prisma db pull --force
npx prisma generate
npm run build
npm run start