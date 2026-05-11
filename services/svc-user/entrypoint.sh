#!/bin/bash

set -e

mv base_avatar.jpg /var/www/avatars/base_avatar.jpg

npx prisma db pull --force
npx prisma generate
npm run build
npm run start