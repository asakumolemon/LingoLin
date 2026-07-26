/** 检测当前是否在 Tauri 环境中 */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return (
    (window as unknown as Record<string, unknown>).__TAURI__ !== undefined ||
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ !== undefined
  );
}
