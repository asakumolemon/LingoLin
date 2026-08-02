# LingoLin API 文档

## 基础信息

- **Base URL**: `http://<server-address>:8080`
- **响应格式**: JSON
- **字符编码**: UTF-8

---

## 认证方式

LingoLin 使用两种认证方式：

### 1. JWT 认证（Web 管理端）

登录后获取 JWT Token，在请求头中携带：

```
Authorization: Bearer <jwt_token>
```

适用于：用户管理、密钥管理操作。

### 2. API Key 认证（客户端）

管理员生成的静态密钥，在请求头中携带：

```
Authorization: Bearer <api_key>
```

适用于：文件上传、下载、预览等客户端操作。

每个 API Key 拥有独立的权限配置（可访问的路径范围 + 读写权限）。

---

## 通用响应结构

### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

### 错误响应

```json
{
  "code": 40001,
  "message": "错误描述信息",
  "data": null
}
```

### 错误码说明

| 错误码 | 含义 |
|--------|------|
| 0 | 成功 |
| 40001 | 请求参数错误 |
| 40002 | 认证失败（JWT/API Key 无效或过期） |
| 40003 | 权限不足 |
| 40004 | 资源不存在 |
| 40005 | 资源已存在 |
| 40006 | 文件操作失败 |
| 50001 | 服务器内部错误 |

---

## API 接口列表

---

### 一、用户认证（公开接口）

#### 1.1 用户注册

```
POST /api/auth/register
```

**请求体**:

```json
{
  "username": "admin",
  "password": "your-password"
}
```

**响应示例**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "created_at": "2026-07-25T12:00:00Z"
  }
}
```

**说明**: 第一个注册的用户自动成为管理员（role=admin），后续注册的用户为普通用户（role=user）。

---

#### 1.2 用户登录

```
POST /api/auth/login
```

**请求体**:

```json
{
  "username": "admin",
  "password": "your-password"
}
```

**响应示例**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 86400,
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  }
}
```

**说明**: 登录返回 JWT Token，有效期 24 小时。管理端后续请求需在 Header 中携带 `Authorization: Bearer <token>`。

---

#### 1.3 获取服务端连接信息

```
GET /api/config
```

**响应示例**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "public_url": "http://files.example.com",
    "lan_ip": "192.168.1.100",
    "port": "8080"
  }
}
```

**说明**: 供 Web 管理面板生成"分享给其他客户端"的连接地址。
- `public_url`: 管理员通过环境变量 `PUBLIC_URL` 显式配置的对外地址（可为空）；
- `lan_ip`: 服务端探测到的局域网 IPv4（裸机部署时的默认值，可为空；Docker 内探测到的是容器 IP，请配置 `PUBLIC_URL`）；
- `port`: 服务监听端口。

---

### 二、密钥管理（需要 JWT 认证）

所有接口需要在请求头携带: `Authorization: Bearer <jwt_token>`

#### 2.1 获取密钥列表

```
GET /api/admin/keys
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认 1 |
| page_size | int | 否 | 每页数量，默认 20 |

**响应示例**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 5,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "id": 1,
        "name": "开发团队密钥",
        "key": "lingolin_xxxxxxxxxxxx",
        "permissions": {
          "allow_paths": ["/projects/*", "/shared/*"],
          "read": true,
          "write": true
        },
        "is_active": true,
        "last_used_at": null,
        "expires_at": null,
        "created_at": "2026-07-25T12:00:00Z"
      }
    ]
  }
}
```

---

#### 2.2 创建密钥

```
POST /api/admin/keys
```

**请求体**:

```json
{
  "name": "开发团队密钥",
  "permissions": {
    "allow_paths": ["/projects/*", "/shared/docs/*"],
    "read": true,
    "write": true
  },
  "expires_at": null
}
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 密钥名称，便于识别用途 |
| permissions.allow_paths | string[] | 是 | 允许访问的路径前缀，支持 `*` 通配符（如 `/projects/*` 匹配所有以 `/projects/` 开头的路径） |
| permissions.read | bool | 是 | 是否允许读取（列表、下载、预览） |
| permissions.write | bool | 是 | 是否允许写入（上传、删除、创建目录） |
| expires_at | string | 否 | 过期时间 ISO8601 格式，不传则永不过期 |

**响应示例**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "name": "开发团队密钥",
    "key": "lingolin_a1b2c3d4e5f6",
    "permissions": {
      "allow_paths": ["/projects/*", "/shared/docs/*"],
      "read": true,
      "write": true
    },
    "created_at": "2026-07-25T12:00:00Z"
  }
}
```

> ⚠️ **注意**: 密钥明文 `key` **只在创建时返回一次**，后续不可再查询完整密钥。请前端在创建成功后立即展示给用户并提示保存。

---

#### 2.3 更新密钥权限

```
PUT /api/admin/keys/:id
```

**请求体**:

```json
{
  "name": "更新后的名称",
  "permissions": {
    "allow_paths": ["/new-path/*"],
    "read": true,
    "write": false
  },
  "is_active": true
}
```

**响应**: 返回更新后的密钥信息（不含 key 明文）。

---

#### 2.4 删除密钥

```
DELETE /api/admin/keys/:id
```

**响应**:

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

### 三、文件操作（需要 API Key 认证）

所有接口需要在请求头携带: `Authorization: Bearer <api_key>`

> 接口会校验 API Key 的权限：检查请求路径是否在 `allow_paths` 范围内，以及操作类型（读/写）是否符合密钥权限。

#### 3.1 获取文件列表

```
GET /api/files/list?path=/some/directory
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | 是 | 目录路径，根目录为 `/` |

**响应示例**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "path": "/some/directory",
    "items": [
      {
        "name": "document.pdf",
        "path": "/some/directory/document.pdf",
        "type": "file",
        "size": 1024000,
        "mime_type": "application/pdf",
        "updated_at": "2026-07-25T12:00:00Z"
      },
      {
        "name": "images",
        "path": "/some/directory/images",
        "type": "dir",
        "size": 0,
        "mime_type": "",
        "updated_at": "2026-07-25T12:00:00Z"
      }
    ]
  }
}
```

**字段说明**:

| 字段 | 说明 |
|------|------|
| name | 文件/目录名称 |
| path | 完整路径 |
| type | `file` 或 `dir` |
| size | 文件大小（字节），目录为 0 |
| mime_type | MIME 类型（仅文件有值） |
| updated_at | 最后修改时间 |

---

#### 3.2 上传文件

```
POST /api/files/upload
```

**请求体**: `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | 是 | 要上传的文件 |
| path | string | 是 | 目标路径，例如 `/docs/report.pdf` |
| overwrite | string | 否 | 是否允许覆盖已存在文件；传 `true` 时覆盖，传 `false` 时遇到同名文件返回 `40005`；未传时保持兼容行为，允许覆盖 |

**响应示例**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "name": "report.pdf",
    "path": "/docs/report.pdf",
    "size": 2048000,
    "mime_type": "application/pdf"
  }
}
```

> 如果目标路径的父目录不存在，会自动创建。已存在的文件只有在 `overwrite=true` 时才会覆盖。

---

#### 3.3 保存文本内容

```
PUT /api/files/content?path=/docs/readme.md
```

**请求体**：`text/plain; charset=utf-8`，仅支持 UTF-8 文本，最大 2MB。

该接口要求 API Key 具有写入权限，目标文件必须已存在且属于可编辑文本类型。服务端使用临时文件原子替换原文件。

**响应**：返回更新后的文件信息。

---

#### 3.4 下载文件

```
GET /api/files/download?path=/docs/report.pdf
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | 是 | 文件完整路径 |

**响应**: 直接返回文件二进制流，Content-Type 为对应 MIME 类型，包含 `Content-Disposition: attachment` 头。

---

#### 3.4 预览文件

```
GET /api/files/preview?path=/docs/readme.txt
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | 是 | 文件完整路径 |

**响应**:

- **图片文件**（jpg/png/gif/webp 等）: 直接返回图片二进制流，浏览器可渲染
- **文本文件**（txt/md/json/js 等）: 返回 `Content-Type: text/plain; charset=utf-8` 的文本内容
- **其他类型**: 返回 400 错误，提示不支持预览

```
HTTP 200 (Content-Type: image/jpeg)
<二进制图片数据>
```

或

```
HTTP 200 (Content-Type: text/plain; charset=utf-8)
Hello, this is a text file.
```

---

#### 3.5 创建目录

```
POST /api/files/mkdir
```

**请求体**:

```json
{
  "path": "/new-folder"
}
```

**响应**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "name": "new-folder",
    "path": "/new-folder",
    "type": "dir"
  }
}
```

---

#### 3.6 删除文件或目录

```
DELETE /api/files/remove?path=/docs/old-report.pdf
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | 是 | 要删除的文件或目录路径 |

**响应**:

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

> 删除目录时会递归删除目录下所有内容。

---

## 权限校验说明

API Key 的权限校验逻辑：

1. **路径匹配**：请求的路径必须匹配密钥 `allow_paths` 中的至少一个规则
   - 支持 `*` 通配符：`/projects/*` 匹配 `/projects/xxx`、`/projects/xxx/yyy`
   - 精确路径直接匹配：`/projects/docs` 只匹配该文件
2. **读取权限**：`read: true` 才允许执行列表、下载、预览操作
3. **写入权限**：`write: true` 才允许执行上传、删除、创建目录操作

### 请求类型与所需权限对照表

| API 接口 | 所需权限 |
|----------|----------|
| GET /api/files/list | read |
| GET /api/files/download | read |
| GET /api/files/preview | read |
| POST /api/files/upload | write |
| POST /api/files/mkdir | write |
| DELETE /api/files/remove | write |

---

## 前端开发注意事项

1. **端检测**：通过 `window.__TAURI__` 判断当前是否在 Tauri 环境中
   - Tauri 环境：只展示文件客户端功能（配置页 + 文件浏览），不做登录
   - 浏览器环境：展示登录页面和管理后台
2. **密钥存储**：
   - Web 端登录 JWT Token → `localStorage`
   - Tauri 端 API Key 和 BaseURL → `localStorage`（或 Tauri store 插件）
3. **文件上传**：Web 端使用 `<input type="file">`，Tauri 端使用原生文件选择对话框
4. **文件下载**：Web 端使用 `a` 标签下载或 `blob`，Tauri 端使用原生保存对话框
5. **所有文件 API 路径**：以 `/` 为根，路径拼接使用服务器端路径规则（Unix 风格 `/` 分隔符）
