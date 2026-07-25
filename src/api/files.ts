import apiClient from "./client";
import type { ListResp, MkdirReq, MkdirResp, UploadResp } from "../types";

/** 获取文件列表 */
export function listFiles(path: string) {
  return apiClient.request<ListResp>(`/api/files/list?path=${encodeURIComponent(path)}`, {
    useApiKey: true,
  });
}

/** 上传文件 */
export function uploadFile(file: File, path: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("path", path);
  return apiClient.request<UploadResp>("/api/files/upload", {
    method: "POST",
    formData,
    useApiKey: true,
  });
}

/** 下载文件 — 返回 Blob */
export async function downloadFile(path: string): Promise<Blob> {
  const base = apiClient.getBaseUrl();
  const key = apiClient.getApiKey();
  const res = await fetch(
    `${base}/api/files/download?path=${encodeURIComponent(path)}`,
    {
      headers: { Authorization: `Bearer ${key}` },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "下载失败");
  }
  return res.blob();
}

/** 获取预览 URL（图片/文本） */
export function getPreviewUrl(path: string): string {
  const base = apiClient.getBaseUrl();
  const key = apiClient.getApiKey();
  return `${base}/api/files/preview?path=${encodeURIComponent(path)}&token=${encodeURIComponent(key || "")}`;
}

/** 创建目录 */
export function mkdir(req: MkdirReq) {
  return apiClient.request<MkdirResp>("/api/files/mkdir", {
    method: "POST",
    body: req,
    useApiKey: true,
  });
}

/** 删除文件或目录 */
export function removeFile(path: string) {
  return apiClient.request<void>(
    `/api/files/remove?path=${encodeURIComponent(path)}`,
    { method: "DELETE", useApiKey: true }
  );
}
