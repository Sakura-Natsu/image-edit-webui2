import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_BUCKET = "images";
export const SUPABASE_TABLE = "image_history";

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : undefined;
}

function getUrl(): string | undefined {
  return readEnv("NEXT_PUBLIC_SUPABASE_URL") ?? readEnv("SUPABASE_URL");
}

function getServiceKey(): string | undefined {
  return readEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function isSupabaseEnabled(): boolean {
  return Boolean(getUrl() && getServiceKey());
}

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = getUrl();
  const key = getServiceKey();
  if (!url || !key) {
    throw new Error(
      "Supabase 未启用：缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
