#!/bin/bash
set -e

# echo "[svc-user] waiting for /secrets/db.env..."
# while [ ! -f /secrets/db.env ]; do
#   sleep 1
# done

# set -a
# . /secrets/db.env
# set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[svc-user] ERROR: DATABASE_URL is missing"
  exit 1
fi

npx prisma db pull --force
npx prisma generate
npm run build
npm run start