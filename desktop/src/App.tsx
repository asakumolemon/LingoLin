import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ConnectPage from "./pages/ConnectPage";
import FileBrowserPage from "./pages/FileBrowserPage";
import SettingsPage from "./pages/SettingsPage";
import apiClient from "./api/client";

function App() {
  const hasConfig = !!apiClient.getBaseUrl() && !!apiClient.getApiKey();
  return (
    <Routes>
      <Route path="/connect" element={<ConnectPage />} />
      <Route element={<Layout />}>
        <Route path="/files" element={<FileBrowserPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={hasConfig ? "/files" : "/connect"} replace />} />
    </Routes>
  );
}

export default App;
