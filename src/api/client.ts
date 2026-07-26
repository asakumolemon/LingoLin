import type { ApiResponse } from "../types";

const BASE_URL = ""; // 空字符串 = 同源代理

// ========== Token 管理 ==========

function getToken(): string | null {
  return localStorage.getItem("jwt_token");
}

function setToken(token: string): void {
  localStorage.setItem("jwt_token", token);
}

function removeToken(): void {
  localStorage.removeItem("jwt_token");
}

// ========== API Key 管理 ==========

function getApiKey(): string | null {
  return localStorage.getItem("api_key");
}

function setApiKey(key: string): void {
  localStorage.setItem("api_key", key);
}

function removeApiKey(): void {
  localStorage.removeItem("api_key");
}

function getBaseUrl(): string {
  return localStorage.getItem("api_base_url") || "";
}

function setBaseUrl(url: string): void {
  localStorage.setItem("api_base_url", url);
}

// ========== HTTP 请求 ==========

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  useApiKey?: boolean;
  /** 是否直接返回 Response 而非 JSON （用于下载等场景） */
  raw?: boolean;
  /** 用于上传的 FormData */
  formData?: FormData;
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, useApiKey = false, raw = false, formData } = options;

  const base = useApiKey ? getBaseUrl() : BASE_URL;
  const finalUrl = base + url;

  const reqHeaders: Record<string, string> = { ...headers };

  if (formData) {
    // FormData 不设置 Content-Type，让浏览器自动设置 multipart boundary
  } else if (body) {
    reqHeaders["Content-Type"] = "application/json";
  }

  // 认证头
  if (useApiKey) {
    const key = getApiKey();
    if (key) {
      reqHeaders["Authorization"] = `Bearer ${key}`;
    }
  } else {
    const token = getToken();
    if (token) {
      reqHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(finalUrl, {
    method,
    headers: reqHeaders,
    body: formData ?? (body ? JSON.stringify(body) : undefined),
  });

  if (raw) {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res as unknown as T;
  }

  // 安全解析 JSON，防止空响应报错
  const text = await res.text();
  if (!text) {
    throw new Error(`服务器返回空响应 (${res.status})`);
  }

  let json: ApiResponse<T>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`服务器返回格式错误: ${text.slice(0, 200)}`);
  }

  if (json.code !== 0) {
    throw new Error(json.message || "未知错误");
  }

  return json.data;
}

// ========== 导出 ==========

const apiClient = {
  getToken,
  setToken,
  removeToken,
  getApiKey,
  setApiKey,
  removeApiKey,
  getBaseUrl,
  setBaseUrl,
  request,
};

export default apiClient;
