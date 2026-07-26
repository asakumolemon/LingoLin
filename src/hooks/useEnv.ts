/** 检测当前是否在 Tauri 环境中 */
export function isTauri(): boolean {
  try {
    return typeof window !== "undefined" && (window as unknown as Record<string, unknown>).__TAURI__ !== undefined;
  } catch {
    return false;
  }
}

/** 获取环境类型 */
export type EnvType = "tauri" | "web";

export function getEnv(): EnvType {
  return isTauri() ? "tauri" : "web";
}
