# LingoLin-go 后端开发计划

## 项目概览

LingoLin-go 是 LingoLin 文件服务的后端项目，使用 Go 语言开发，提供文件管理 API、用户认证和 API 密钥管理功能。

- **语言**: Go 1.26.5
- **HTTP 框架**: Gin v1.12.0
- **ORM**: GORM v1.31.2
- **数据库**: SQLite（纯 Go 驱动，免 CGO）
- **认证**: JWT + API Key

---

## 目录结构

```
LingoLin-go/
├── cmd/
│   └── server/
│       └── main.go          # 程序入口
├── internal/
│   ├── config/
│   │   └── config.go         # 配置加载（端口、存储路径、JWT密钥等）
│   ├── handler/
│   │   ├── auth.go           # 用户认证处理器
│   │   ├── api_key.go        # 密钥管理处理器
│   │   └── file.go           # 文件操作处理器
│   ├── middleware/
│   │   └── auth.go           # JWT + API Key 认证中间件
│   ├── model/
│   │   ├── user.go           # 用户模型
│   │   └── api_key.go        # API 密钥模型 + 权限结构
│   ├── repository/
│   │   └── db.go             # 数据库初始化
│   └── service/
│       └── service.go        # 业务逻辑层
├── docs/
│   ├── api.md                # API 接口文档（供前端使用）
│   └── plan.md               # 本文件
├── go.mod
├── go.sum
└── .env.example              # 环境变量示例
```

---

## 开发阶段

### 阶段一：项目骨架 ✅ 已完成

| 任务 | 状态 |
|------|------|
| 初始化 go mod 和依赖 | ✅ |
| 搭建目录结构 | ✅ |
| 配置加载模块 | ✅ |
| 数据模型定义（User、ApiKey） | ✅ |
| 数据库初始化 | ✅ |
| 中间件骨架（JWT、ApiKey） | ✅ |
| 处理器骨架 | ✅ |
| 服务层骨架 | ✅ |
| 主入口与路由注册 | ✅ |
| 编译通过 | ✅ |
| API 文档 | ✅ |

### 阶段二：用户认证 ✅ 已完成

| 任务 | 状态 |
|------|------|
| 用户注册接口（第一个用户自动为管理员） | ✅ |
| 用户登录接口（JWT，24小时有效期） | ✅ |
| JWT 中间件实现 | ✅ |
| 密码加密（bcrypt） | ✅ |

### 阶段三：密钥管理 ✅ 已完成

| 任务 | 状态 |
|------|------|
| 生成随机 API Key（sha256 哈希存储） | ✅ |
| 密钥 CRUD 接口（创建/列表/更新/删除） | ✅ |
| 密钥权限模型（路径前缀 + 读写权限） | ✅ |
| API Key 认证中间件 | ✅ |
| 密钥过期与激活/禁用 | ✅ |

### 阶段四：文件服务 ✅ 已完成

| 任务 | 状态 |
|------|------|
| 文件列表/目录浏览 | ✅ |
| 文件上传（multipart） | ✅ |
| 文件下载（流式传输） | ✅ |
| 文件预览（图片+文本） | ✅ |
| 目录创建/删除 | ✅ |
| 路径安全检查（防穿越） | ✅ |
| MIME 类型检测 | ✅ |

### 阶段五：完善与部署 ⏳ 待开始

| 任务 | 状态 |
|------|------|
| 配置文件（.env） | ✅ |
| Dockerfile | ⏳ 待实现 |
| 错误处理优化 | ⏳ 待完善 |
| 日志分级 | ⏳ 待实现 |
| 单元测试 | ⏳ 待实现 |

---

## 开发规范

### 代码风格

- 使用 `gofmt` 格式化代码
- 遵循 Go 标准项目布局（Standard Go Project Layout）
- 错误处理：不在 Handler 之外打印日志，统一由中间件或 Handler 处理

### Git 提交规范

```
<type>: <简短描述>

<详细描述>
```

类型：`feat` / `fix` / `docs` / `refactor` / `test` / `chore`

### API 设计规范

- 所有接口返回统一格式：`{ code, message, data }`
- 路径使用小写 + 连字符（kebab-case）
- 查询参数使用 camelCase
- 请求体使用 camelCase

---

## 运行方式

```bash
# 开发环境
cd LingoLin-go
go run ./cmd/server

# 构建
go build -o bin/lingolin-server ./cmd/server

# 运行
./bin/lingolin-server
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 8080 | 服务端口 |
| DB_PATH | data/lingolin.db | SQLite 数据库路径 |
| JWT_SECRET | change-me-in-production | JWT 签名密钥 |
| STORE_PATH | store | 文件存储根目录 |
