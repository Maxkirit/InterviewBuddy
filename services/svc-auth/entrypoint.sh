#!/bin/bash

set -e

npx prisma db pull --force
npx prisma generate
npm run build
npm run start