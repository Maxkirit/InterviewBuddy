FROM node:25-bookworm-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --no-audit --no-fund && \
    npm cache clean --force

COPY . .

RUN npm run build
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]