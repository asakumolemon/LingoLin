import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import Loading from "../components/Loading";
import apiClient from "../api/client";
import * as filesApi from "../api/files";
import * as keysApi from "../api/keys";
import { useAuth } from "../hooks/useAuth";
import { isTauri } from "../hooks/useEnv";
import { getServerBaseUrl, copyToClipboard, formatConnectionInfo } from "../api/share";
import type { FileItem } from "../types";

// ========== 分享连接按钮 ==========

function ShareFileButton() {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const autoKey = localStorage.getItem("api_key_auto");
    if (!autoKey) return;
    const text = formatConnectionInfo(getServerBaseUrl(), autoKey);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const autoKey = localStorage.getItem("api_key_auto");
  if (!autoKey) return null;

  return (
    <button
      onClick={handleClick}
      className={`ml-2 rounded px-2 py-1 text-xs transition-colors ${
        copied
          ? "bg-green-100 text-green-700"
          : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
      }`}
    >
      {copied ? "已复制 ✓" : "复制连接"}
    </button>
  );
}

// ========== API Key 配置页 ==========

function ApiKeyConfig({ onConfigured }: { onConfigured: () => void }) {
  const [baseUrl, setBaseUrl] = useState(apiClient.getBaseUrl());
  const [apiKey, setApiKey] = useState(apiClient.getApiKey() || "");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!baseUrl || !apiKey) {
      setError("请填写服务端地址和 API Key");
      return;
    }
    setTesting(true);
    try {
      // 测试连接：请求根目录文件列表
      apiClient.setBaseUrl(baseUrl.replace(/\/+$/, ""));
      apiClient.setApiKey(apiKey);
      await filesApi.listFiles("/");
      onConfigured();
    } catch (err) {
      setError(err instanceof Error ? err.message : "连接失败，请检查地址和密钥");
      apiClient.setBaseUrl("");
      apiClient.setApiKey("");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mx-auto mt-12 max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">连接服务端</h1>
        <p className="mt-1 text-sm text-gray-500">输入 LingoLin 服务端地址和 API Key 开始使用</p>
      </div>
      <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-6 shadow-sm">
        {error && (
          <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">服务端地址</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="http://192.168.1.100:8080"
            required
          />
        </div>
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">API Key</label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="lingolin_xxxxxxxxxxxx"
            required
          />
        </div>
        <button
          type="submit"
          disabled={testing}
          className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {testing ? "连接中..." : "连接"}
        </button>
      </form>
    </div>
  );
}

// ========== 预览弹窗 ==========

interface PreviewDialogProps {
  item: FileItem;
  onClose: () => void;
}

function PreviewDialog({ item, onClose }: PreviewDialogProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (item.type !== "file") return;
    const mime = item.mime_type.toLowerCase();
    const isText = mime.startsWith("text/") || [
      "application/json",
      "application/javascript",
      "application/xml",
      "application/yaml",
    ].includes(mime);

    if (isText) {
      // 文本类：fetch 内容
      const fetchText = async () => {
        try {
          const blob = await filesApi.downloadFile(item.path);
          setTextContent(await blob.text());
        } catch {
          setTextContent("无法读取文件内容");
        } finally {
          setLoading(false);
        }
      };
      fetchText();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  const isImage = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"].includes(
    item.mime_type.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-3xl rounded-lg bg-white shadow-xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="truncate text-sm font-medium text-gray-900">{item.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* 内容 */}
        <div className="max-h-[75vh] overflow-auto p-4">
          {loading ? (
            <Loading text="加载中..." />
          ) : isImage ? (
            <img
              src={filesApi.getPreviewUrl(item.path)}
              alt={item.name}
              className="mx-auto max-h-[65vh] rounded"
            />
          ) : textContent !== null ? (
            <pre className="whitespace-pre-wrap break-all text-sm">{textContent}</pre>
          ) : (
            <div className="py-12 text-center text-gray-400">不支持预览此文件类型</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== 文件浏览器主页面 ==========

export default function FileBrowserPage() {
  const { user } = useAuth();
  const isWebUser = !!user;

  const [configured, setConfigured] = useState(false);
  const [initError, setInitError] = useState("");
  const configuringRef = useRef(false);
  const [currentPath, setCurrentPath] = useState("/");
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "size" | "updated_at">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 自动为 Web 登录用户配置代理 + API Key
  const autoConfigure = useCallback(async (retried?: boolean) => {
    // 防止 StrictMode / 竞态下重复创建
    if (configuringRef.current) return;
    configuringRef.current = true;

    apiClient.setBaseUrl("");
    const savedKey = localStorage.getItem("api_key_auto");
    if (savedKey) {
      apiClient.setApiKey(savedKey);
      try {
        await filesApi.listFiles("/");
        setConfigured(true);
        configuringRef.current = false;
        return;
      } catch {
        localStorage.removeItem("api_key_auto");
        if (!retried) {
          configuringRef.current = false;
          autoConfigure(true);
        }
        return;
      }
    }
    try {
      const newKey = await keysApi.createKey({
        name: "Web 管理端自动生成",
        permissions: { allow_paths: ["/*"], read: true, write: true },
      });
      if (newKey.key) {
        localStorage.setItem("api_key_auto", newKey.key);
        apiClient.setApiKey(newKey.key);
        setConfigured(true);
      } else {
        setInitError("自动创建 API Key 失败");
      }
    } catch (err) {
      setInitError(err instanceof Error ? err.message : "自动配置失败");
    } finally {
      configuringRef.current = false;
    }
  }, []);

  // 初始化：isWebUser 变化时（包括 auth 恢复后）触发配置
  useEffect(() => {
    if (isWebUser) {
      autoConfigure();
    } else {
      setConfigured(!!apiClient.getBaseUrl() && !!apiClient.getApiKey());
    }
  }, [isWebUser, autoConfigure]);

  const fetchFiles = async (path: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await filesApi.listFiles(path);
      setItems(data.items);
      setCurrentPath(data.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取文件列表失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (configured) {
      fetchFiles(currentPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    fetchFiles(path);
  };

  // 面包屑
  const pathParts = currentPath.split("/").filter(Boolean);
  const breadcrumbs = [
    { label: "根目录", path: "/" },
    ...pathParts.map((part, i) => ({
      label: part,
      path: "/" + pathParts.slice(0, i + 1).join("/"),
    })),
  ];

  // 排序：目录在前，文件在后，按字段排序
  const toggleSort = (field: "name" | "size" | "updated_at") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  const sortedItems = [...items]
    .filter((item) =>
      searchQuery ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
    )
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "size") cmp = a.size - b.size;
      else cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-blue-500">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  // 上传文件（支持多文件，Tauri 使用原生对话框）
  const handleUpload = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    let files: File[] = [];

    if (isTauri()) {
      // Tauri 原生文件选择对话框
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readFile } = await import("@tauri-apps/plugin-fs");
      const selected = await open({ multiple: true });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      for (const filePath of paths) {
        const data = await readFile(filePath);
        const fileName = filePath.split(/[\\/]/).pop() || "file";
        files.push(new File([data], fileName));
      }
    } else {
      if (!e?.target?.files || e.target.files.length === 0) return;
      files = Array.from(e.target.files);
    }

    setUploading(true);
    setUploadCount(0);
    let success = 0;
    for (const file of files) {
      try {
        const targetPath = currentPath === "/" ? "/" + file.name : currentPath + "/" + file.name;
        await filesApi.uploadFile(file, targetPath);
        success++;
      } catch {
        // 单个文件失败继续上传其他
      }
      setUploadCount(success);
    }
    fetchFiles(currentPath);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 下载文件（Tauri 使用原生保存对话框）
  const handleDownload = async (item: FileItem) => {
    if (item.type === "dir") return;
    try {
      const blob = await filesApi.downloadFile(item.path);

      if (isTauri()) {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeFile } = await import("@tauri-apps/plugin-fs");
        const savePath = await save({ defaultPath: item.name });
        if (!savePath) return;
        const buffer = await blob.arrayBuffer();
        await writeFile(savePath, new Uint8Array(buffer));
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = item.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "下载失败");
    }
  };

  // 创建目录
  const handleCreateFolder = async (e: FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    setCreatingFolder(true);
    try {
      const targetPath = currentPath === "/" ? "/" + folderName.trim() : currentPath + "/" + folderName.trim();
      await filesApi.mkdir({ path: targetPath });
      setShowNewFolder(false);
      setFolderName("");
      fetchFiles(currentPath);
    } catch (err) {
      alert(err instanceof Error ? err.message : "创建目录失败");
    } finally {
      setCreatingFolder(false);
    }
  };

  // 删除
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await filesApi.removeFile(deleteTarget.path);
      setDeleteTarget(null);
      fetchFiles(currentPath);
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  // 未配置（仅非登录用户看到配置页；Web 登录用户自动配置）
  if (!configured) {
    if (isWebUser) {
      return (
        <div className="p-4">
          {initError ? (
            <div className="mx-auto mt-12 max-w-md text-center">
              <div className="mb-4 rounded bg-red-50 px-4 py-3 text-sm text-red-600">{initError}</div>
              <p className="text-sm text-gray-500">请先在密钥管理页创建 API Key，再返回此页</p>
            </div>
          ) : (
            <Loading text="正在连接服务端..." />
          )}
        </div>
      );
    }
    // 非 Web 用户：手动配置
    return (
      <div className="p-4">
        <ApiKeyConfig onConfigured={() => setConfigured(true)} />
      </div>
    );
  }

  return (
    <div>
      {/* 工具栏 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-900">文件浏览</h1>
          <ShareFileButton />
          {!isWebUser && (
            <button
              onClick={() => {
                apiClient.removeApiKey();
                localStorage.removeItem("api_base_url");
                localStorage.removeItem("api_key");
                setConfigured(false);
              }}
              className="rounded px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
            >
              断开
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewFolder(true)}
            className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            新建文件夹
          </button>
          <button
                        onClick={() => { if (isTauri()) { handleUpload(); } else { fileInputRef.current?.click(); } }}
            disabled={uploading}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? `上传中 (${uploadCount})...` : "上传文件"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fetchFiles(currentPath)}
            className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            刷新
          </button>
        </div>
      </div>

      {/* 面包屑导航 + 搜索 */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-300">/</span>}
              {i === breadcrumbs.length - 1 ? (
                <span className="font-medium text-gray-900">{crumb.label}</span>
              ) : (
                <button
                  onClick={() => navigateTo(crumb.path)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {crumb.label}
                </button>
              )}
            </span>
          ))}
        </nav>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索文件..."
          className="w-56 rounded-lg border border-gray-200 px-3 py-1.5 text-sm placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 rounded bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* 文件列表 */}
      {loading ? (
        <Loading />
      ) : sortedItems.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-gray-500">此目录为空</p>
          <p className="mt-1 text-xs text-gray-400">上传文件或创建目录开始使用</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-gray-700">
                    名称<SortIcon field="name" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("size")} className="flex items-center gap-1 hover:text-gray-700">
                    大小<SortIcon field="size" />
                  </button>
                </th>
                <th className="px-4 py-3">类型</th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("updated_at")} className="flex items-center gap-1 hover:text-gray-700">
                    修改时间<SortIcon field="updated_at" />
                  </button>
                </th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedItems.map((item) => (
                <tr key={item.path} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => item.type === "dir" ? navigateTo(item.path) : setPreviewItem(item)}
                      className="flex items-center gap-2.5 text-left"
                    >
                      {item.type === "dir" ? (
                        <svg className="h-5 w-5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      )}
                      <span className="font-medium text-gray-900 hover:text-blue-600">
                        {item.name}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {item.type === "file" ? formatSize(item.size) : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {item.type === "file" ? (item.mime_type || "未知") : "目录"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(item.updated_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {item.type === "file" && (
                        <>
                          <button
                            onClick={() => setPreviewItem(item)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            预览
                          </button>
                          <button
                            onClick={() => handleDownload(item)}
                            className="text-green-600 hover:text-green-800"
                          >
                            下载
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="text-red-600 hover:text-red-800"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新建文件夹弹窗 */}
      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-medium text-gray-900">新建文件夹</h3>
            <form onSubmit={handleCreateFolder}>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">文件夹名称</label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="new-folder"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowNewFolder(false); setFolderName(""); }}
                  className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingFolder ? "创建中..." : "创建"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 预览弹窗 */}
      {previewItem && (
        <PreviewDialog item={previewItem} onClose={() => setPreviewItem(null)} />
      )}

      {/* 删除确认 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-medium text-gray-900">确认删除</h3>
            <p className="mb-6 text-sm text-gray-600">
              确定要删除 <strong>{deleteTarget.name}</strong> 吗？
              {deleteTarget.type === "dir" && " 目录下的所有内容将被一并删除。"}
              此操作不可撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== 工具函数 ==========

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
