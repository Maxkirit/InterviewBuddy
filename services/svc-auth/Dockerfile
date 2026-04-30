FROM node:25-bookworm-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --no-audit --no-fund && \
    npm cache clean --force

COPY . .

RUN npx prisma db pull
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]