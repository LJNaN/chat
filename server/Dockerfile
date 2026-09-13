FROM node:20-alpine
WORKDIR /app

# 安装 better-sqlite3 编译依赖
RUN apk add --no-cache python3 make g++

# 安装应用依赖
COPY package*.json ./
RUN npm install

# 复制源码
COPY . .

EXPOSE 5001
CMD ["npx", "tsx", "server.ts"]
