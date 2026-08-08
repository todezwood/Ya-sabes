FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server.js index.html ./

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]
