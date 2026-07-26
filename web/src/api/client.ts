import type { ApiResponse } from "../types";

// ========== Token 管理 ==========
function getToken(): string | null { return localStorage.getItem("jwt_token"); }
function setToken(token: string): void { localStorage.setItem("jwt_token", token); }
function removeToken(): void { localStorage.removeItem("jwt_token"); }

// ========== API Key 管理 ==========
function getApiKey(): string | null { return localStorage.getItem("api_key"); }
function setApiKey(key: string): void { localStorage.setItem("api_key", key); }
function removeApiKey(): void { localStorage.removeItem("api_key"); }
function getBaseUrl(): string { return localStorage.getItem("api_base_url") || ""; }
function setBaseUrl(url: string): void { localStorage.setItem("api_base_url", url); }

interface RequestOptions {
  method?: string; body?: unknown; headers?: Record<string, string>;
  useApiKey?: boolean; raw?: boolean; formData?: FormData;
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, useApiKey = false, raw = false, formData } = options;
  const base = useApiKey ? getBaseUrl() : "";
  const finalUrl = base + url;
  const reqHeaders: Record<string, string> = { ...headers };

  if (formData) { /* browser sets multipart */ }
  else if (body) reqHeaders["Content-Type"] = "application/json";

  if (useApiKey) { const k = getApiKey(); if (k) reqHeaders["Authorization"] = `Bearer ${k}`; }
  else { const t = getToken(); if (t) reqHeaders["Authorization"] = `Bearer ${t}`; }

  const res = await fetch(finalUrl, {
    method, headers: reqHeaders,
    body: formData ?? (body ? JSON.stringify(body) : undefined),
  });

  if (raw) {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res as unknown as T;
  }

  const text = await res.text();
  if (!text) throw new Error(`服务器返回空响应 (${res.status})`);
  let json: ApiResponse<T>;
  try { json = JSON.parse(text); } catch { throw new Error(`响应格式错误: ${text.slice(0, 200)}`); }
  if (json.code !== 0) throw new Error(json.message || "未知错误");
  return json.data;
}

const apiClient = {
  getToken, setToken, removeToken,
  getApiKey, setApiKey, removeApiKey,
  getBaseUrl, setBaseUrl, request,
};
export default apiClient;
