# LingoLin — file sharing service (Go backend + desktop/web clients)

## Project

A file sharing system with **three packages** in a monorepo:
- **`server/`** — Go 1.26.5 backend (Gin + GORM + SQLite, JWT + API Key auth)
- **`desktop/`** — Tauri v2 desktop app (Rust shell + React 18 / TypeScript / Vite / Tailwind)
- **`web/`** — Web admin panel (React 18 / TypeScript / Vite / Tailwind)

Entry points: `server/cmd/server/main.go` | `desktop/src/main.tsx` | `web/src/main.tsx`

## Commands

| Area | Action | Command |
|------|--------|---------|
| server | dev (hot reload) | `cd server && go run ./cmd/server` |
| server | build | `cd server && go build -o bin/lingolin-server ./cmd/server` |
| desktop | dev (Vite frontend) | `cd desktop && npm run dev` |
| desktop | Tauri dev (full app) | `cd desktop && npm run tauri dev` |
| desktop | build frontend | `cd desktop && npm run build` |
| web | dev | `cd web && npm run dev` |
| web | build | `cd web && npm run build` |
| (any) | npm install | `cd <dir> && npm install` |

No test suite exists yet across the whole project.

## Architecture

### Server (`server/`)
```
cmd/server/main.go          — wiring, route registration, startup
internal/config/config.go   — env-based config (PORT, DB_PATH, JWT_SECRET, STORE_PATH)
internal/model/             — GORM models: User, ApiKey (+KeyPermission), FileRecord
internal/repository/        — InitDB (SQLite via pure-Go driver), repo CRUD wrappers
internal/service/           — business logic: auth (JWT/bcrypt), api key, file ops
internal/handler/           — HTTP handlers (auth, api_key, file) + uniform response helpers
internal/middleware/auth.go — JWT (admin) + API Key (client) auth middleware
docs/                       — api.md (API reference), plan.md (dev plan)
```
- Two auth modes: JWT (web admin panel) and API Key (file clients).
- API Key permissions: allow_paths[] + read/write booleans.
- File ops: list, upload, download, preview, mkdir, remove — with path-traversal protection.
- Token passed via `Authorization: Bearer <token>` header or `?token=` query param.

### Desktop (`desktop/`)
```
src/api/client.ts      — fetch wrapper (API Key auth, localStorage config)
src/api/files.ts       — file operation helpers
src/api/share.ts       — share/connection-info utilities
src/types/index.ts     — shared TS interfaces (FileItem, ListResp, KeyPermission, …)
src/components/        — Layout, Loading
src/pages/             — ConnectPage, FileBrowserPage, SettingsPage
src-tauri/             — Tauri v2 Rust shell (plugins: dialog, fs)
```

### Web (`web/`)
```
src/api/client.ts      — fetch wrapper (JWT auth for admin, API Key for file ops)
src/api/files.ts       — file operation helpers
src/api/keys.ts        — API key CRUD helpers
src/api/share.ts       — share utilities
src/hooks/useAuth.tsx  — auth context (JWT login/logout state)
src/types/index.ts     — types including User, LoginReq/Resp, ApiKey, PaginatedData
src/components/        — Layout, Loading, PathSelector, ProtectedRoute
src/pages/             — LoginPage, KeysPage, FileBrowserPage
```
- Web is the admin panel; desktop is the file client.

## Conventions

- **Go**: Standard Go Project Layout. `gofmt`. Error codes as constants in `handler/response.go`. GORM `BeforeSave` hook for bcrypt password hashing. `sha256` for API key storage. Uniform API response: `{code: 0, message: "success", data: …}`.
- **TS/React**: Functional components, Tailwind CSS utility classes, `react-router-dom` v6 for routing. Auth state in `localStorage`. API callers wrap responses in `ApiResponse<T>` and throw on non-zero code.
- **API style**: Endpoint paths kebab-case (`/api/files/list`). Query params camelCase. Request/response bodies camelCase.
- **No tests exist yet** (no `*_test.go` or `*.test.ts` files).

## Notes

- Health check: `GET /api/health` returns `{"status":"ok"}`.
- Upload limited to 100 MB by default (`MAX_UPLOAD_SIZE` env var, in MB).
- JWT_SECRET logs a warning if using the default value in production.
