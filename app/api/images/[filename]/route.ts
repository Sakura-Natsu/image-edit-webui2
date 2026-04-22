import { isSupabaseEnabled } from "@/lib/supabase-server";
import { readImage } from "../../_lib/history-store-index";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ filename: string }> },
) {
  if (isSupabaseEnabled()) {
    // In Supabase mode images are served via public CDN URLs stored in imageBlobKeys.
    return new Response("Not Found", { status: 404 });
  }
  const { filename } = await ctx.params;
  const result = await readImage(filename);
  if (!result) {
    return new Response("Not Found", { status: 404 });
  }
  const body = new Uint8Array(result.buffer);
  return new Response(body, {
    headers: {
      "Content-Type": result.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
