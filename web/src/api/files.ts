import apiClient from "./client";
import type { ListResp, MkdirReq, MkdirResp, UploadResp } from "../types";

export function listFiles(path: string) {
  return apiClient.request<ListResp>(`/api/files/list?path=${encodeURIComponent(path)}`, { useApiKey: true });
}
export function uploadFile(file: File, path: string) {
  const fd = new FormData();
  fd.append("file", file); fd.append("path", path);
  return apiClient.request<UploadResp>("/api/files/upload", { method: "POST", formData: fd, useApiKey: true });
}
export async function downloadFile(path: string): Promise<Blob> {
  const key = apiClient.getApiKey();
  const res = await fetch(`/api/files/download?path=${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(await res.text() || "下载失败");
  return res.blob();
}
export function getPreviewUrl(path: string): string {
  const key = apiClient.getApiKey();
  return `/api/files/preview?path=${encodeURIComponent(path)}&token=${encodeURIComponent(key || "")}`;
}
export function mkdir(req: MkdirReq) {
  return apiClient.request<MkdirResp>("/api/files/mkdir", { method: "POST", body: req, useApiKey: true });
}
export function removeFile(path: string) {
  return apiClient.request<void>(`/api/files/remove?path=${encodeURIComponent(path)}`, { method: "DELETE", useApiKey: true });
}
