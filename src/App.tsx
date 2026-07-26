import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import KeysPage from "./pages/KeysPage";
import FileBrowserPage from "./pages/FileBrowserPage";
import { isTauri } from "./hooks/useEnv";

function App() {
  // Tauri 模式：只显示文件浏览，跳过登录和密钥管理
  if (isTauri()) {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/files" element={<FileBrowserPage />} />
          <Route path="/" element={<Navigate to="/files" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/files" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/keys" element={<KeysPage />} />
        <Route path="/files" element={<FileBrowserPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
