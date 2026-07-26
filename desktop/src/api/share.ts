/** 获取服务端外部访问地址（供客户端连接使用） */
export function getServerBaseUrl(): string {
  const origin = window.location.origin;
  // 开发模式 Vite 代理在 :3000，后端在 :8080
  if (origin.includes("localhost:3000") || origin.includes("127.0.0.1:3000")) {
    return origin.replace(":3000", ":8080");
  }
  // 生产环境通过 Nginx 反代或同端口部署
  return origin;
}

/** 复制文本到剪贴板 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

/** 生成连接信息文本 */
export function formatConnectionInfo(baseUrl: string, apiKey: string): string {
  return `服务端地址: ${baseUrl}\nAPI Key: ${apiKey}`;
}
