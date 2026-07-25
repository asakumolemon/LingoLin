// ========== 通用响应 ==========

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

// ========== 错误码 ==========

export const ErrorCode = {
  Success: 0,
  BadRequest: 40001,
  Unauthorized: 40002,
  Forbidden: 40003,
  NotFound: 40004,
  AlreadyExists: 40005,
  FileError: 40006,
  InternalError: 50001,
} as const;

// ========== 用户认证 ==========

export interface User {
  id: number;
  username: string;
  role: "admin" | "user";
  created_at: string;
}

export interface UserBrief {
  id: number;
  username: string;
  role: string;
}

export interface LoginReq {
  username: string;
  password: string;
}

export interface RegisterReq {
  username: string;
  password: string;
}

export interface LoginResp {
  token: string;
  expires_in: number;
  user: UserBrief;
}

// ========== API 密钥 ==========

export interface KeyPermission {
  allow_paths: string[];
  read: boolean;
  write: boolean;
}

export interface ApiKey {
  id: number;
  name: string;
  key?: string;
  permissions: KeyPermission;
  is_active: boolean;
  user_id?: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateKeyReq {
  name: string;
  permissions: KeyPermission;
  expires_at?: string | null;
}

export interface UpdateKeyReq {
  name?: string;
  permissions?: KeyPermission;
  is_active?: boolean;
}

export interface PaginatedData<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

// ========== 文件操作 ==========

export interface FileItem {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  mime_type: string;
  updated_at: string;
}

export interface ListResp {
  path: string;
  items: FileItem[];
}

export interface UploadResp {
  name: string;
  path: string;
  size: number;
  mime_type: string;
}

export interface MkdirReq {
  path: string;
}

export interface MkdirResp {
  name: string;
  path: string;
  type: "dir";
}
