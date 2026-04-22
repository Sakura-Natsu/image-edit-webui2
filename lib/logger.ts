/**
 * 轻量带标签日志封装。
 *
 * 所有日志统一以 `[image-webui:{scope}]` 前缀输出，方便在浏览器 DevTools
 * 用 "image-webui" 关键字过滤。错误路径额外输出完整对象，便于展开查看。
 */

type Scope = string;

const PREFIX = (scope: Scope) => `%c[image-webui:${scope}]`;
const STYLE_INFO = "color:#888;font-weight:600";
const STYLE_WARN = "color:#b37400;font-weight:600";
const STYLE_ERR = "color:#c94a3b;font-weight:600";

export interface Logger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  /** Run a block; if it throws, log + rethrow. */
  wrap: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
}

export function createLogger(scope: Scope): Logger {
  const p = PREFIX(scope);
  return {
    info: (...args) => console.log(p, STYLE_INFO, ...args),
    warn: (...args) => console.warn(p, STYLE_WARN, ...args),
    error: (...args) => console.error(p, STYLE_ERR, ...args),
    async wrap<T>(label: string, fn: () => Promise<T>): Promise<T> {
      try {
        return await fn();
      } catch (err) {
        console.error(p, STYLE_ERR, label, "→ 失败:", err);
        throw err;
      }
    },
  };
}

/** Convert arbitrary thrown value into a user-readable string. */
export function describeError(err: unknown): string {
  if (err instanceof Error) {
    const name = err.name && err.name !== "Error" ? `${err.name}: ` : "";
    return `${name}${err.message}`;
  }
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
