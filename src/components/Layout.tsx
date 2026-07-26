import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isTauri } from "../hooks/useEnv";
import apiClient from "../api/client";

const navItems = [
  { to: "/admin/keys", label: "密钥管理" },
  { to: "/files", label: "文件浏览" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const tauri = isTauri();

  return (
    <div className="flex h-screen flex-col">
      {/* 顶栏 */}
      <header className="flex h-14 items-center justify-between border-b border-gray-100 bg-white/80 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z" />
            </svg>
          </div>
          <span className="text-base font-semibold text-gray-800">LingoLin</span>
          {!tauri && <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">文件服务</span>}
          {tauri && apiClient.getBaseUrl() && (
            <span className="ml-2 flex items-center gap-1 text-xs text-green-600">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              已连接
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {tauri && apiClient.getBaseUrl() && (
            <>
              <span className="hidden text-xs text-gray-400 sm:inline-block">{apiClient.getBaseUrl()}</span>
              <button
                onClick={() => {
                  apiClient.removeApiKey();
                  apiClient.setBaseUrl("");
                  localStorage.removeItem("api_key");
                  localStorage.removeItem("api_base_url");
                  window.location.href = "/connect";
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                切换
              </button>
            </>
          )}
          {user && (
            <>
              <span className="text-sm text-gray-400">{user.username}</span>
              <button
                onClick={logout}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                退出
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 — Tauri 模式不显示 */}
        {!tauri && (
          <aside className="w-56 flex-shrink-0 border-r border-gray-100 bg-white p-3">
            <nav className="flex flex-col gap-0.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        )}

        {/* 主内容 */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
