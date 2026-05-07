#!/bin/bash
set -e

echo "[svc-auth] waiting for /secrets/db.env..."
while [ ! -f /secrets/db.env ]; do
  sleep 1
done

set -a
. /secrets/db.env
set +a

if [ -f /secrets/jwt_private.pem ]; then
  export SECRETKEY="$(cat /secrets/jwt_private.pem)"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[svc-auth] ERROR: DATABASE_URL is missing"
  exit 1
fi

if [ -z "${SECRETKEY:-}" ]; then
  echo "[svc-auth] ERROR: SECRETKEY is missing"
  exit 1
fi

npx prisma db pull --force
npx prisma generate
npm run build
npm run start