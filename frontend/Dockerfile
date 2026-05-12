FROM node:25-bookworm-slim AS builder

WORKDIR /app

COPY ./app/package*.json ./

RUN npm ci --no-audit --no-fund && \
    npm cache clean --force

COPY ./app/ .

RUN npm run build

FROM debian:trixie-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    libnginx-mod-http-modsecurity \
    libmodsecurity3 \
    modsecurity-crs \
    curl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/modsecurity /etc/nginx/modsecurity
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
