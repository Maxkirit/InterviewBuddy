FROM node:25-bookworm-slim

WORKDIR /app

COPY package*.json ./

RUN apt-get update -y && apt-get install -y openssl
RUN npm install && npm ci --no-audit --no-fund && \
    npm cache clean --force

COPY . .

EXPOSE 3000

RUN npm run build

CMD ["npm", "run", "start"]