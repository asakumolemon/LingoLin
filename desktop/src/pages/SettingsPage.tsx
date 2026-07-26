import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import * as filesApi from "../api/files";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [baseUrl, setBaseUrl] = useState(apiClient.getBaseUrl());
  const [apiKey, setApiKey] = useState(apiClient.getApiKey() || "");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!baseUrl || !apiKey) { setError("请填写服务端地址和 API Key"); return; }
    setTesting(true);
    try {
      const cleanUrl = baseUrl.replace(/\/+$/, "");
      apiClient.setBaseUrl(cleanUrl);
      apiClient.setApiKey(apiKey);
      await filesApi.listFiles("/");
      localStorage.setItem("api_base_url", cleanUrl);
      localStorage.setItem("api_key", apiKey);
      navigate("/files", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "连接失败");
      apiClient.setBaseUrl("");
      apiClient.setApiKey("");
    } finally { setTesting(false); }
  };

  const handleDisconnect = () => {
    apiClient.removeApiKey();
    apiClient.setBaseUrl("");
    localStorage.removeItem("api_key");
    localStorage.removeItem("api_base_url");
    navigate("/connect", { replace: true });
  };

  const currentUrl = apiClient.getBaseUrl();
  const currentKey = apiClient.getApiKey();

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">设置</h1>

      {/* 当前连接信息 */}
      {currentUrl && currentKey && (
        <div className="mb-6 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm">
          <p className="mb-1 font-medium text-green-800">当前已连接</p>
          <p className="text-green-700">地址：{currentUrl}</p>
          <p className="text-green-700">密钥：{currentKey.slice(0, 20)}...</p>
        </div>
      )}

      {/* 修改连接 */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">修改连接</h2>
        {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">服务端地址</label>
            <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="http://192.168.1.100:8080" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">API Key</label>
            <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="lingolin_xxxxxxxxxxxx" required />
          </div>
          <button type="submit" disabled={testing}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50">
            {testing ? "连接中..." : "保存并连接"}
          </button>
        </form>
      </div>

      {/* 断开连接 */}
      <div className="mt-6 text-center">
        <button onClick={handleDisconnect} className="rounded-lg px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50">
          断开连接
        </button>
      </div>
    </div>
  );
}
