#!/bin/bash
set -e

if [ ! -r /secrets/db.env ]; then
  echo "[svc-auth] ERROR: missing or unreadable /secrets/db.env"
  exit 1
fi

set -a
. /secrets/db.env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[svc-grading] ERROR: DATABASE_URL is missing"
  exit 1
fi

npx prisma db pull --force
npx prisma generate
npm run build
npm run start