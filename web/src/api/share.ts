import { useState } from "react";

// —— 服务端连接地址解析 ——

interface ServerConfig {
  public_url?: string;
  lan_ip?: string;
  port?: string;
}

let configPromise: Promise<ServerConfig> | null = null;

/** 拉取服务端 /api/config（相对地址，dev 走 Vite 代理 / 生产走 Nginx 反代） */
function fetchServerConfig(): Promise<ServerConfig> {
  if (configPromise) return configPromise;
  configPromise = fetch("/api/config")
    .then((r) => r.json())
    .then((d) => (d && d.code === 0 ? (d.data as ServerConfig) : {}))
    .catch(() => ({}));
  return configPromise;
}

const isLoopback = (origin: string): boolean =>
  origin.includes("localhost") || origin.includes("127.0.0.1");

/** dev 模式把 Web 面板端口 3000 替换为服务端端口 8080 */
function toServerUrl(origin: string): string {
  if (origin.includes("localhost:3000") || origin.includes("127.0.0.1:3000")) {
    return origin.replace(":3000", ":8080");
  }
  return origin;
}

const trimSlash = (s: string): string => s.replace(/\/+$/, "");

/**
 * 解析客户端应使用的服务端地址（按优先级）：
 *  1. 管理员显式配置的 PUBLIC_URL（最可靠，域名/IP 均可）
 *  2. 当前访问面板的地址（非 localhost 时即生产环境的域名/IP，经 Nginx 反代可直接使用）
 *  3. 服务端探测到的局域网 IP（裸机部署、管理员用 localhost 访问时兜底）
 *  4. 当前地址本身（最后兜底）
 */
export async function resolveConnectionBaseUrl(): Promise<string> {
  const origin = window.location.origin;
  const cfg = await fetchServerConfig();
  if (cfg.public_url) return trimSlash(cfg.public_url);
  if (!isLoopback(origin)) return trimSlash(toServerUrl(origin));
  if (cfg.lan_ip) return `http://${cfg.lan_ip}:${cfg.port || "8080"}`;
  return trimSlash(toServerUrl(origin));
}

/** 旧同步方法：仅基于当前页面地址（保留为同步兜底） */
export function getServerBaseUrl(): string {
  return toServerUrl(window.location.origin);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta); return ok;
  }
}

export function formatConnectionInfo(baseUrl: string, apiKey: string): string {
  return `服务端地址: ${baseUrl}\nAPI Key: ${apiKey}`;
}

/** 分享按钮组件 */
export function useShareButton() {
  const [copied, setCopied] = useState(false);
  const share = async (text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };
  return { copied, share };
}
