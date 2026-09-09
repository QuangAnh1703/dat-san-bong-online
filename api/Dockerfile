FROM node:20-alpine

ENV TZ=Asia/Ho_Chi_Minh
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 3000
CMD ["node", "src/server.js"]
