// ========== 通用响应 ==========

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
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

// ========== 权限 ==========

export interface KeyPermission {
  allow_paths: string[];
  read: boolean;
  write: boolean;
}
