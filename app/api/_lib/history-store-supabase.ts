import type {
  EditParams,
  GenerateParams,
  HistoryEntry,
  HistoryKind,
} from "@/lib/types";
import {
  getSupabaseAdmin,
  SUPABASE_BUCKET,
  SUPABASE_TABLE,
} from "@/lib/supabase-server";
import type { CreateHistoryInput, ImageFileResult } from "./history-store";

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

function randomId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeParams(
  p: GenerateParams | EditParams,
): GenerateParams | EditParams {
  const copy = { ...(p as unknown as Record<string, unknown>) };
  if ("images" in copy) delete copy.images;
  if ("mask" in copy) delete copy.mask;
  return copy as unknown as GenerateParams | EditParams;
}

/** DB row → HistoryEntry (snake_case to camelCase) */
function rowToEntry(row: Record<string, unknown>): HistoryEntry {
  return {
    id: row.id as string,
    kind: row.kind as HistoryKind,
    createdAt: row.created_at as number,
    prompt: row.prompt as string,
    model: row.model as string,
    size: (row.size as string | undefined) ?? undefined,
    quality: (row.quality as string | undefined) ?? undefined,
    imageBlobKeys: (row.image_blob_keys as string[]) ?? [],
    revisedPrompt: (row.revised_prompt as string | undefined) ?? undefined,
    params: row.params as GenerateParams | EditParams,
  };
}

/** HistoryEntry → DB row (camelCase to snake_case) */
function entryToRow(entry: HistoryEntry) {
  return {
    id: entry.id,
    kind: entry.kind,
    created_at: entry.createdAt,
    prompt: entry.prompt,
    model: entry.model,
    size: entry.size ?? null,
    quality: entry.quality ?? null,
    image_blob_keys: entry.imageBlobKeys,
    revised_prompt: entry.revisedPrompt ?? null,
    params: entry.params,
  };
}

/** Extract storage object path from a Supabase public URL. */
function extractStoragePath(publicUrl: string): string {
  const marker = `/object/public/${SUPABASE_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return publicUrl;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

export async function readHistory(): Promise<HistoryEntry[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from(SUPABASE_TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[history-store-supabase] readHistory 失败", error);
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => rowToEntry(row as Record<string, unknown>));
}

export async function createEntry(
  input: CreateHistoryInput,
): Promise<HistoryEntry> {
  if (!input.images.length) {
    throw new Error("createEntry 需要至少一张图片");
  }

  const sb = getSupabaseAdmin();
  const entryId = randomId(input.kind === "edit" ? "edit_" : "gen_");
  const publicUrls: string[] = [];

  for (let i = 0; i < input.images.length; i++) {
    const { b64, format } = input.images[i];
    const filename = `${entryId}_${i}.${ext(format)}`;
    const buf = Buffer.from(b64, "base64");
    const mime =
      format === "jpg" || format === "jpeg"
        ? "image/jpeg"
        : format === "webp"
          ? "image/webp"
          : "image/png";

    const { error: uploadError } = await sb.storage
      .from(SUPABASE_BUCKET)
      .upload(filename, buf, { contentType: mime, upsert: false });

    if (uploadError) {
      console.error(
        `[history-store-supabase] 上传图片 ${filename} 失败`,
        uploadError,
      );
      throw new Error(uploadError.message);
    }

    const { data: urlData } = sb.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(filename);
    publicUrls.push(urlData.publicUrl);
  }

  const entry: HistoryEntry = {
    id: entryId,
    kind: input.kind,
    createdAt: Date.now(),
    prompt: input.prompt,
    model: input.model,
    size: input.size,
    quality: input.quality,
    imageBlobKeys: publicUrls,
    revisedPrompt: input.revisedPrompt,
    params: sanitizeParams(input.params),
  };

  const { error: insertError } = await sb
    .from(SUPABASE_TABLE)
    .insert(entryToRow(entry));

  if (insertError) {
    console.error("[history-store-supabase] insert 失败", insertError);
    throw new Error(insertError.message);
  }

  return entry;
}

export async function deleteEntry(id: string): Promise<boolean> {
  const sb = getSupabaseAdmin();

  const { data: rows, error: selectError } = await sb
    .from(SUPABASE_TABLE)
    .select("image_blob_keys")
    .eq("id", id)
    .limit(1);

  if (selectError) throw new Error(selectError.message);
  if (!rows || rows.length === 0) return false;

  const keys: string[] = (rows[0] as { image_blob_keys: string[] }).image_blob_keys ?? [];
  if (keys.length) {
    const paths = keys.map(extractStoragePath);
    const { error: removeError } = await sb.storage
      .from(SUPABASE_BUCKET)
      .remove(paths);
    if (removeError) {
      console.error(
        "[history-store-supabase] 删除图片文件失败",
        removeError,
      );
    }
  }

  const { error: deleteError } = await sb
    .from(SUPABASE_TABLE)
    .delete()
    .eq("id", id);

  if (deleteError) throw new Error(deleteError.message);
  return true;
}

export async function clearAll(): Promise<void> {
  const sb = getSupabaseAdmin();

  // 列出 bucket 下所有文件并批量删除
  const { data: files, error: listError } = await sb.storage
    .from(SUPABASE_BUCKET)
    .list("", { limit: 1000 });

  if (listError) {
    console.error("[history-store-supabase] list 失败", listError);
  } else if (files && files.length > 0) {
    const paths = files.map((f) => f.name);
    const { error: removeError } = await sb.storage
      .from(SUPABASE_BUCKET)
      .remove(paths);
    if (removeError) {
      console.error("[history-store-supabase] 批量删除图片失败", removeError);
    }
  }

  const { error: deleteError } = await sb
    .from(SUPABASE_TABLE)
    .delete()
    .neq("id", ""); // delete all rows

  if (deleteError) throw new Error(deleteError.message);
}

/** Not used in Supabase mode (images served via public CDN URL). */
export async function readImage(_filename: string): Promise<ImageFileResult | null> {
  return null;
}
