import type { ApiResponse } from "../types";

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
  /** 是否直接返回 Response 而非 JSON（用于下载等场景） */
  raw?: boolean;
  /** 用于上传的 FormData */
  formData?: FormData;
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, raw = false, formData } = options;

  const finalUrl = getBaseUrl() + url;
  const reqHeaders: Record<string, string> = { ...headers };

  if (formData) {
    // FormData 让浏览器自动设置 Content-Type
  } else if (body) {
    reqHeaders["Content-Type"] = "application/json";
  }

  // API Key 认证
  const key = getApiKey();
  if (key) {
    reqHeaders["Authorization"] = `Bearer ${key}`;
  }

  const res = await fetch(finalUrl, {
    method,
    headers: reqHeaders,
    body: formData ?? (body ? JSON.stringify(body) : undefined),
  });

  if (raw) {
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res as unknown as T;
  }

  const text = await res.text();
  if (!text) throw new Error(`服务器返回空响应 (${res.status})`);

  let json: ApiResponse<T>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`服务器返回格式错误: ${text.slice(0, 200)}`);
  }

  if (json.code !== 0) throw new Error(json.message || "未知错误");
  return json.data;
}

const apiClient = {
  getApiKey,
  setApiKey,
  removeApiKey,
  getBaseUrl,
  setBaseUrl,
  request,
};

export default apiClient;
