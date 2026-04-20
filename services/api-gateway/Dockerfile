FROM node:25-bookworm-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --no-audit --no-fund && \
    npm cache clean --force

COPY . .

EXPOSE 3000

CMD ["node", "api-gateway.ts"]