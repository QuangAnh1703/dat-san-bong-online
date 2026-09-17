FROM node:20-alpine

ENV TZ=Asia/Ho_Chi_Minh
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/src ./src

# migrate.js doc file V*.sql tu day (../../../csdl/db/migration tinh tu src/db/)
COPY csdl/db/migration /app/csdl/db/migration

EXPOSE 3000
CMD ["node", "src/server.js"]
