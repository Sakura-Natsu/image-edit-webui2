import { mkdir, readFile, writeFile, unlink, readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  EditParams,
  GenerateParams,
  HistoryEntry,
  HistoryKind,
} from "@/lib/types";

const DATA_DIR =
  process.env.IMAGE_WEBUI_DATA_DIR || join(process.cwd(), "data");
const IMAGES_DIR = join(DATA_DIR, "images");
const HISTORY_FILE = join(DATA_DIR, "history.json");

const SAFE_FILENAME = /^[A-Za-z0-9._-]+\.(png|jpe?g|webp)$/i;

function ext(format: string): string {
  switch (format.toLowerCase()) {
    case "jpeg":
    case "jpg":
      return "jpg";
    case "webp":
      return "webp";
    default:
      return "png";
  }
}

function mimeOf(filename: string): string {
  const m = filename.toLowerCase().split(".").pop();
  if (m === "jpg" || m === "jpeg") return "image/jpeg";
  if (m === "webp") return "image/webp";
  return "image/png";
}

async function ensureDirs() {
  await mkdir(IMAGES_DIR, { recursive: true });
}

/** Serialize writes to history.json to avoid concurrent read-modify-write races. */
let writeQueue: Promise<void> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(fn, fn);
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function readHistory(): Promise<HistoryEntry[]> {
  await ensureDirs();
  try {
    const text = await readFile(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    console.error("[history-store] 读取 history.json 失败", err);
    throw err;
  }
}

async function persistHistory(list: HistoryEntry[]): Promise<void> {
  await ensureDirs();
  await writeFile(HISTORY_FILE, JSON.stringify(list, null, 2), "utf8");
}

function randomId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export interface CreateHistoryInput {
  kind: HistoryKind;
  prompt: string;
  model: string;
  size?: string;
  quality?: string;
  revisedPrompt?: string;
  params: GenerateParams | EditParams;
  /** Each image encoded as base64 (no data-url prefix) with its format. */
  images: { b64: string; format: string }[];
}

function sanitizeParams(p: GenerateParams | EditParams): GenerateParams | EditParams {
  const copy = { ...(p as unknown as Record<string, unknown>) };
  // data-url 形式的 images/mask 会让 history.json 暴涨，清掉
  if ("images" in copy) delete copy.images;
  if ("mask" in copy) delete copy.mask;
  return copy as unknown as GenerateParams | EditParams;
}

/** Writes binary files then appends a history entry. Returns the created entry. */
export async function createEntry(input: CreateHistoryInput): Promise<HistoryEntry> {
  await ensureDirs();
  if (!input.images.length) {
    throw new Error("createEntry 需要至少一张图片");
  }

  const entryId = randomId(input.kind === "edit" ? "edit_" : "gen_");
  const imageFilenames: string[] = [];

  for (let i = 0; i < input.images.length; i++) {
    const { b64, format } = input.images[i];
    const fname = `${entryId}_${i}.${ext(format)}`;
    const buf = Buffer.from(b64, "base64");
    await writeFile(join(IMAGES_DIR, fname), buf);
    imageFilenames.push(fname);
  }

  const entry: HistoryEntry = {
    id: entryId,
    kind: input.kind,
    createdAt: Date.now(),
    prompt: input.prompt,
    model: input.model,
    size: input.size,
    quality: input.quality,
    imageBlobKeys: imageFilenames,
    revisedPrompt: input.revisedPrompt,
    params: sanitizeParams(input.params),
  };

  await enqueue(async () => {
    const list = await readHistory();
    list.unshift(entry);
    await persistHistory(list);
  });

  return entry;
}

export async function deleteEntry(id: string): Promise<boolean> {
  return enqueue(async () => {
    const list = await readHistory();
    const target = list.find((e) => e.id === id);
    if (!target) return false;
    for (const f of target.imageBlobKeys) {
      if (!SAFE_FILENAME.test(f)) continue;
      try {
        await unlink(join(IMAGES_DIR, f));
      } catch {
        /* ignore missing file */
      }
    }
    await persistHistory(list.filter((e) => e.id !== id));
    return true;
  });
}

export async function clearAll(): Promise<void> {
  return enqueue(async () => {
    try {
      const files = await readdir(IMAGES_DIR);
      for (const f of files) {
        if (!SAFE_FILENAME.test(f)) continue;
        try {
          await unlink(join(IMAGES_DIR, f));
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    await persistHistory([]);
  });
}

export interface ImageFileResult {
  buffer: Buffer;
  mime: string;
}

export async function readImage(filename: string): Promise<ImageFileResult | null> {
  if (!SAFE_FILENAME.test(filename)) return null;
  try {
    const buffer = await readFile(join(IMAGES_DIR, filename));
    return { buffer, mime: mimeOf(filename) };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    console.error("[history-store] 读取图片失败", filename, err);
    return null;
  }
}

export function dataRootInfo() {
  return { DATA_DIR, IMAGES_DIR, HISTORY_FILE };
}
