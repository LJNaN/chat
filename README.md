# 对话

接入 DeepSeek 的 AI 对话框，支持多会话、流式输出、自定义系统提示词，历史记录存在后端。

技术栈与 [xianji](../dnd/origin) 保持一致：React 18 + Vite 5 + TypeScript + Ant Design 5，后端 Express 5 + tsx + SQLite，Docker Compose + Nginx 部署。

## 功能

- **多会话** — 左侧会话列表，新建 / 重命名 / 删除 / 切换，每个会话独立历史
- **流式输出** — 后端代理 DeepSeek 的 SSE，回复逐字显示，可随时点「停止」（已生成的部分会保存）
- **系统提示词** — 可预设可修改，存后端并对所有会话生效，支持一键恢复默认
- **历史持久化** — 消息存 SQLite，刷新或换设备都能接着聊
- **密码保护** — 访问 `/chat` 需密码，密码存服务端 `.env`，登录后发放 token
- **Markdown 渲染** — 代码块带语言高亮容器与复制按钮

## 快速开始

### Docker（推荐）

```bash
git clone <本仓库地址> chat
cd chat
printf 'DEEPSEEK_KEY=sk-your-key-here\nCHAT_PASSWORD=换成一个强密码\n' > .env
docker compose up -d
```

前置条件：宿主机已创建共享网络 `docker network create web`（首次上线见下方「部署」）。

访问 `http://你的IP/chat/`

### 本地开发

需要 Node.js 20+，且 `.env` 里配好 `DEEPSEEK_KEY`。

```bash
# 终端 1：后端
cd server
npm install
npx tsx server.ts        # 监听 5001

# 终端 2：前端
npm install
npm run dev              # 监听 5175
```

打开 `http://localhost:5175/chat/`，输入你在 `.env` 里设置的 `CHAT_PASSWORD`。

## 配置

`.env`：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DEEPSEEK_KEY` | — | DeepSeek API Key，必填 |
| `CHAT_PASSWORD` | `change-me` | `/chat` 的访问密码，**部署到公网前必须改掉** |

改密码只需改 `.env` 并重启后端，无需重新打包前端。

## 项目结构

```
chat/
├── src/                    # 前端（React + Vite + TS）
│   ├── App.tsx             # 登录门 + 主布局 + 会话状态
│   ├── api.ts              # 带 token 的请求封装 + SSE 流式读取
│   ├── types.ts
│   └── components/
│       ├── LoginGate.tsx   # 密码页
│       ├── Sidebar.tsx     # 会话列表
│       ├── ChatView.tsx    # 消息区 + 输入框
│       ├── MessageList.tsx # Markdown 渲染 + 代码复制
│       └── SettingsModal.tsx
├── server/                 # 后端（Express + TS）
│   ├── server.ts           # API + SSE 流式代理
│   ├── db.ts               # SQLite 建表与读写
│   └── data/               # SQLite 文件（不入库）
├── nginx.conf              # chat 前端自己的 nginx
├── docker-compose.yml      # chat-frontend + chat-backend
└── Dockerfile              # 前端多阶段构建
```

## 部署

本项目**不发布任何宿主机端口**。所有项目共用 80 端口、靠路径区分，由独立的
`gateway` 仓库（服务器上 `/app/gateway`）统一转发：

```
:80 gateway
 ├─ /            → 302 /guitar/
 ├─ /guitar/     → xianji-web:80
 ├─ /guitar-api/ → xianji-api:5000
 ├─ /chat/       → chat-web:80
 └─ /chat-api/   → chat-api:5001
```

各容器通过 Docker 外部网络 `web` 互联；本项目用 `chat-web` / `chat-api` 两个别名
把自己暴露给网关（见 `docker-compose.yml`）。

网关为什么独立成仓库、以及怎么新增项目，见 `gateway` 仓库的 README。

### 首次上线

```bash
# 1. 创建共享网络
docker network create web

# 2. 部署 gateway（独占 80）
cd /app/gateway
docker compose up -d

# 3. 部署 chat
cd /app/chat
printf 'DEEPSEEK_KEY=sk-xxx\nCHAT_PASSWORD=换成你的强密码\n' > .env
docker compose up -d --build
```

验证：`http://IP/chat/` 和 `http://IP/guitar/` 都能打开。

### 自动部署

push 到 `main` 后 GitHub Actions 自动同步到 `/app/chat` 并重建容器。
需要在仓库里配置与 xianji、gateway 相同的 secrets：`SERVER_SSH_KEY`、`SERVER_HOST`、`SERVER_USER`。

> 部署脚本会 `rsync --delete`，但已排除 `.env` 与 `server/data`，服务器上的密钥和数据库不会被清掉。

改本项目的路由（路径前缀或端口）时，除了这里，还要同步改 `gateway` 仓库的 `nginx.conf`。

## 备份

聊天记录都在 `server/data/database.sqlite`，直接复制该文件即可备份：

```bash
docker compose cp chat-backend:/app/data/database.sqlite ./backup-$(date +%F).sqlite
```
