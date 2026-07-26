import { useState } from "react";

export function getServerBaseUrl(): string {
  const origin = window.location.origin;
  if (origin.includes("localhost:3000") || origin.includes("127.0.0.1:3000")) return origin.replace(":3000", ":8080");
  return origin;
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
