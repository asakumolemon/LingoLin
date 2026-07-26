import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import KeysPage from "./pages/KeysPage";
import ConnectPage from "./pages/ConnectPage";
import FileBrowserPage from "./pages/FileBrowserPage";
import { isTauri } from "./hooks/useEnv";
import apiClient from "./api/client";

function App() {
  // Tauri / 安卓：直接连接模式，不需要登录
  if (isTauri()) {
    const hasConfig = !!apiClient.getBaseUrl() && !!apiClient.getApiKey();
    return (
      <Routes>
        <Route path="/connect" element={<ConnectPage />} />
        <Route path="/files" element={<Layout />}>
          <Route index element={<FileBrowserPage />} />
        </Route>
        <Route path="*" element={<Navigate to={hasConfig ? "/files" : "/connect"} replace />} />
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
