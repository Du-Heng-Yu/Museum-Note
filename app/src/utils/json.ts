/**
 * JSON 安全解析与序列化工具
 */

/**
 * 安全解析 JSON 字符串为 string[]
 * null 或解析失败返回 []
 */
export function parseJsonArray(jsonStr: string | null): string[] {
  if (jsonStr == null) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

/**
 * 将 string[] 序列化为 JSON 字符串
 * 空数组返回 null
 */
export function toJsonString(arr: string[]): string | null {
  if (arr.length === 0) return null;
  return JSON.stringify(arr);
}
