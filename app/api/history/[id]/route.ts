import { deleteEntry } from "../../_lib/history-store-index";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const ok = await deleteEntry(id);
    if (!ok) {
      return Response.json({ error: { message: "not found" } }, { status: 404 });
    }
    console.log(`[api/history DELETE] removed ${id}`);
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/history DELETE id]", err);
    return Response.json({ error: { message } }, { status: 500 });
  }
}
