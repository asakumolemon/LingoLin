import apiClient from "./client";
import type { ApiKey, CreateKeyReq, UpdateKeyReq, PaginatedData } from "../types";

export function listKeys(page = 1, pageSize = 20) {
  return apiClient.request<PaginatedData<ApiKey>>(`/api/admin/keys?page=${page}&page_size=${pageSize}`);
}
export function createKey(req: CreateKeyReq) {
  return apiClient.request<ApiKey>("/api/admin/keys", { method: "POST", body: req });
}
export function updateKey(id: number, req: UpdateKeyReq) {
  return apiClient.request<void>(`/api/admin/keys/${id}`, { method: "PUT", body: req });
}
export function deleteKey(id: number) {
  return apiClient.request<void>(`/api/admin/keys/${id}`, { method: "DELETE" });
}
