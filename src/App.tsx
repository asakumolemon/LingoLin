import { Routes, Route, Navigate } from "react-router-dom";
import ConnectPage from "./pages/ConnectPage";
import FileBrowserPage from "./pages/FileBrowserPage";
import apiClient from "./api/client";

function App() {
  const hasConfig = !!apiClient.getBaseUrl() && !!apiClient.getApiKey();
  return (
    <Routes>
      <Route path="/connect" element={<ConnectPage />} />
      <Route path="/files" element={<FileBrowserPage />} />
      <Route path="*" element={<Navigate to={hasConfig ? "/files" : "/connect"} replace />} />
    </Routes>
  );
}

export default App;
