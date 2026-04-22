import { loadSettings } from "./settings";
import { createLogger } from "./logger";
import type { EditParams, GenerateParams, ImagesResponse } from "./types";

const log = createLogger("api-client");

function buildHeaders(): HeadersInit {
  const { apiKey, baseUrl } = loadSettings();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers["X-User-Api-Key"] = apiKey;
  if (baseUrl) headers["X-User-Base-Url"] = baseUrl;
  return headers;
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    const msg = j?.error?.message ?? j?.error ?? j?.message ?? text;
    return typeof msg === "string" ? msg : JSON.stringify(msg);
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

async function callJson<T>(
  path: string,
  params: unknown,
  label: string,
): Promise<T> {
  log.info(`→ ${label}`, params);
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(params),
    });
  } catch (err) {
    log.error(`${label} 网络请求失败`, err);
    throw new Error(`网络请求失败：${err instanceof Error ? err.message : String(err)}`);
  }

  if (!res.ok) {
    const msg = await parseError(res);
    log.error(`${label} 上游返回 ${res.status}`, msg);
    throw new Error(`[${res.status}] ${msg}`);
  }

  try {
    const data = (await res.json()) as T;
    log.info(`← ${label} OK`);
    return data;
  } catch (err) {
    log.error(`${label} 响应 JSON 解析失败`, err);
    throw new Error(`响应解析失败：${err instanceof Error ? err.message : String(err)}`);
  }
}

export function callGenerate(params: GenerateParams): Promise<ImagesResponse> {
  return callJson<ImagesResponse>("/api/generate", params, "generate");
}

export function callEdit(params: EditParams): Promise<ImagesResponse> {
  return callJson<ImagesResponse>("/api/edit", params, "edit");
}
