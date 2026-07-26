import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import * as filesApi from "../api/files";

export default function ConnectPage() {
  const navigate = useNavigate();
  const [baseUrl, setBaseUrl] = useState(apiClient.getBaseUrl() || "");
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
      const cleanUrl = baseUrl.replace(/\/+$/, "");
      apiClient.setBaseUrl(cleanUrl);
      apiClient.setApiKey(apiKey);
      // 测试连接：调用 permissions 接口，无需特定路径权限
      await filesApi.getPermissions();
      // 保存到 localStorage
      localStorage.setItem("api_base_url", cleanUrl);
      localStorage.setItem("api_key", apiKey);
      navigate("/files", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "连接失败，请检查地址和密钥");
      apiClient.setBaseUrl("");
      apiClient.setApiKey("");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">LingoLin</h1>
          <p className="mt-1 text-sm text-gray-500">连接服务端以浏览和管理文件</p>
        </div>

        {/* 表单 */}
        <div className="rounded-xl border border-gray-100 bg-white/80 p-7 shadow-sm backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">服务端地址</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="block w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="http://192.168.1.100:8080"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="block w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="lingolin_xxxxxxxxxxxx"
                required
              />
              <p className="mt-1.5 text-xs text-gray-400">
                在 Web 管理端的密钥管理页创建并复制 API Key
              </p>
            </div>

            <button
              type="submit"
              disabled={testing}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {testing ? "连接中..." : "连接服务端"}
            </button>
          </form>
        </div>

        {apiClient.getBaseUrl() && apiClient.getApiKey() && (
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate("/files")}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              已有配置，直接进入文件浏览 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
