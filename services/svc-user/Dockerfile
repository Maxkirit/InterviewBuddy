FROM node:25-bookworm-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --no-audit --no-fund && \
    npm cache clean --force

COPY . .

EXPOSE 3000

RUN npx prisma db pull
RUN npx prisma generate

CMD ["node", "svc-user.ts"]