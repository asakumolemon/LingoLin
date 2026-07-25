import apiClient from "./client";
import type { ApiKey, CreateKeyReq, UpdateKeyReq, PaginatedData } from "../types";

/** 获取密钥列表 */
export function listKeys(page = 1, pageSize = 20) {
  return apiClient.request<PaginatedData<ApiKey>>(`/api/admin/keys?page=${page}&page_size=${pageSize}`);
}

/** 创建密钥 */
export function createKey(req: CreateKeyReq) {
  return apiClient.request<ApiKey>("/api/admin/keys", {
    method: "POST",
    body: req,
  });
}

/** 更新密钥 */
export function updateKey(id: number, req: UpdateKeyReq) {
  return apiClient.request<void>(`/api/admin/keys/${id}`, {
    method: "PUT",
    body: req,
  });
}

/** 删除密钥 */
export function deleteKey(id: number) {
  return apiClient.request<void>(`/api/admin/keys/${id}`, {
    method: "DELETE",
  });
}
