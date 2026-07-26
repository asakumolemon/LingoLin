# LingoLin

轻量级文件共享服务，提供基于 API Key 的文件浏览、上传、下载功能，支持桌面客户端和 Web 管理面板。

## 项目结构

```
├── server/     Go 后端服务 (Gin + GORM + SQLite)
├── desktop/    Tauri 桌面客户端 (React + TypeScript + Tailwind)
└── web/        Web 管理面板 (React + TypeScript + Tailwind)
```

## 快速开始

### 1. 启动服务端

```bash
cd server
cp .env.example .env    # 编辑配置（端口、JWT密钥、存储路径等）
go run ./cmd/server
```

服务端默认监听 `:8080`，首次启动自动创建默认管理员账号（`admin` / `admin123`）。

### 2. 启动 Web 管理面板

```bash
cd web
npm install
npm run dev
```

管理面板默认运行在 `:5173`，用于管理 API Key 和用户。

### 3. 启动桌面客户端

```bash
cd desktop
npm install
npm run dev              # 仅前端开发
npm run tauri dev        # 完整 Tauri 应用开发
```

桌面客户端通过 API Key 连接服务端进行文件操作。

## 认证方式

| 方式 | 用途 | 详情 |
|------|------|------|
| JWT | Web 管理端 | 登录后获取，24小时有效期 |
| API Key | 文件客户端 | 管理员生成，可配置路径权限+读写权限 |

## 功能

- **文件管理**：列表浏览、上传下载、预览（图片/文本）、目录创建删除
- **API Key 管理**：创建/编辑/删除密钥，设置允许路径和读写权限，支持过期时间
- **用户管理**：注册登录，第一个用户自动成为管理员
- **路径安全**：路径穿越防护，权限精确到路径前缀

## 技术栈

| 层 | 技术 |
|------|------|
| 后端 | Go 1.26, Gin, GORM, SQLite (纯 Go 驱动) |
| 桌面 | Tauri v2, Rust, React 18, Vite, Tailwind |
| Web | React 18, Vite, Tailwind |

## 环境变量

服务端配置项（`server/.env`）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 8080 | 服务端口 |
| `DB_PATH` | data/lingolin.db | SQLite 数据库路径 |
| `JWT_SECRET` | change-me-in-production | JWT 签名密钥 |
| `STORE_PATH` | store | 文件存储根目录 |
| `DEFAULT_ADMIN_PASSWORD` | admin123 | 默认管理员密码 |

## License

MIT
