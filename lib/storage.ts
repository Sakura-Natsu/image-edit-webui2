import type {
  EditParams,
  GenerateParams,
  HistoryEntry,
  HistoryKind,
} from "./types";
import { createLogger, describeError } from "./logger";

const log = createLogger("storage-client");

export interface CreateHistoryInput {
  kind: HistoryKind;
  prompt: string;
  model: string;
  size?: string;
  quality?: string;
  revisedPrompt?: string;
  params: GenerateParams | EditParams;
  /** base64 (no data-url prefix) + format (png/jpeg/webp) */
  images: { b64: string; format: string }[];
}

async function parseApiError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    return j?.error?.message ?? text ?? `HTTP ${res.status}`;
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

/** Fetch all saved history entries from the backend, newest first. */
export async function listHistory(): Promise<HistoryEntry[]> {
  try {
    const r = await fetch("/api/history", { cache: "no-store" });
    if (!r.ok) throw new Error(await parseApiError(r));
    const { entries } = (await r.json()) as { entries: HistoryEntry[] };
    log.info(`listHistory → ${entries.length} 条`);
    return entries;
  } catch (err) {
    log.error("listHistory 失败", err);
    throw new Error(`加载历史失败：${describeError(err)}`);
  }
}

export async function saveEntry(payload: CreateHistoryInput): Promise<HistoryEntry> {
  log.info(`saveEntry(${payload.kind}, ${payload.images.length} 张)`);
  const r = await fetch("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const msg = await parseApiError(r);
    log.error(`saveEntry 失败 HTTP ${r.status}`, msg);
    throw new Error(`保存失败：[${r.status}] ${msg}`);
  }
  const { entry } = (await r.json()) as { entry: HistoryEntry };
  log.info(`saveEntry OK id=${entry.id}`);
  return entry;
}

export async function deleteEntry(id: string): Promise<void> {
  const r = await fetch(`/api/history/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!r.ok && r.status !== 404) {
    const msg = await parseApiError(r);
    log.error("deleteEntry 失败", r.status, msg);
    throw new Error(`删除失败：[${r.status}] ${msg}`);
  }
}

export async function clearAllHistory(): Promise<void> {
  const r = await fetch("/api/history", { method: "DELETE" });
  if (!r.ok) {
    const msg = await parseApiError(r);
    log.error("clearAllHistory 失败", msg);
    throw new Error(`清空失败：${msg}`);
  }
}

/** Build the URL to access an image.
 * - Supabase mode: imageBlobKeys already contains full public URLs → return as-is.
 * - Local mode: imageBlobKeys contains filenames → proxy through /api/images/.
 */
export function imageUrl(filename: string): string {
  if (/^https?:\/\//i.test(filename)) return filename;
  return `/api/images/${encodeURIComponent(filename)}`;
}

/** Fetch an image and return a base64 data-url (e.g. for reusing as edit input). */
export async function fetchAsDataUrl(filename: string): Promise<string> {
  const r = await fetch(imageUrl(filename));
  if (!r.ok) throw new Error(`拉取图片失败: HTTP ${r.status}`);
  const blob = await r.blob();
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

/** Trigger browser download for a backend-stored image. */
export function downloadImage(filename: string, suggestedName: string) {
  const a = document.createElement("a");
  a.href = imageUrl(filename);
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
