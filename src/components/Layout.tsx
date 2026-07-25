import { Outlet, NavLink } from "react-router-dom";

const navItems = [
  { to: "/admin/keys", label: "密钥管理" },
  { to: "/files", label: "文件浏览" },
];

export default function Layout() {
  return (
    <div className="flex h-screen flex-col">
      {/* 顶栏 */}
      <header className="flex h-14 items-center justify-between border-b bg-white px-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-800">LingoLin</span>
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">文件服务</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        <aside className="w-56 flex-shrink-0 border-r bg-white p-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* 主内容 */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
