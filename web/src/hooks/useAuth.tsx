import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import apiClient from "../api/client";
import type { UserBrief, LoginReq, RegisterReq, LoginResp } from "../types";

interface AuthContextType {
  user: UserBrief | null;
  loading: boolean;
  login: (req: LoginReq) => Promise<UserBrief>;
  register: (req: RegisterReq) => Promise<UserBrief>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (apiClient.getToken()) {
      const stored = localStorage.getItem("user_info");
      if (stored) {
        try { setUser(JSON.parse(stored)); }
        catch { apiClient.removeToken(); localStorage.removeItem("user_info"); }
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (req: LoginReq) => {
    const data = await apiClient.request<LoginResp>("/api/auth/login", { method: "POST", body: req });
    apiClient.setToken(data.token);
    localStorage.setItem("user_info", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (req: RegisterReq) => {
    return apiClient.request<UserBrief>("/api/auth/register", { method: "POST", body: req });
  }, []);

  const logout = useCallback(() => {
    apiClient.removeToken();
    localStorage.removeItem("user_info");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必须在 AuthProvider 内使用");
  return ctx;
}
