/** 检测当前是否在 Tauri 环境中 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/** 获取环境类型 */
export type EnvType = "tauri" | "web";

export function getEnv(): EnvType {
  return isTauri() ? "tauri" : "web";
}
