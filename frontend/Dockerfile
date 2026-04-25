FROM node:25-bookworm-slim AS builder

WORKDIR /app

COPY ./app/package*.json ./

RUN npm ci --no-audit --no-fund && \
    npm cache clean --force

COPY ./app/ .

RUN npm run build


FROM nginx:1.30-trixie AS runner

COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 443

ENTRYPOINT ["nginx", "-c", "/etc/nginx/nginx.conf"]
CMD ["-g", "daemon off;"]
