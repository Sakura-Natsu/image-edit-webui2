import {
  clearAll,
  createEntry,
  readHistory,
  type CreateHistoryInput,
} from "../_lib/history-store-index";

export const runtime = "nodejs";

export async function GET() {
  try {
    const list = await readHistory();
    const entries = [...list].sort((a, b) => b.createdAt - a.createdAt);
    return Response.json({ entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/history GET]", err);
    return Response.json({ error: { message } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: CreateHistoryInput;
  try {
    body = (await req.json()) as CreateHistoryInput;
  } catch {
    return Response.json({ error: { message: "请求体不是有效 JSON" } }, { status: 400 });
  }

  if (!body?.prompt || !body?.model || !body?.kind || !Array.isArray(body.images)) {
    return Response.json(
      { error: { message: "缺少必需字段：kind / prompt / model / images" } },
      { status: 400 },
    );
  }

  try {
    const entry = await createEntry(body);
    console.log(
      `[api/history POST] saved ${entry.id} images=${entry.imageBlobKeys.length}`,
    );
    return Response.json({ entry });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/history POST]", err);
    return Response.json({ error: { message } }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearAll();
    console.log("[api/history DELETE] cleared");
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/history DELETE]", err);
    return Response.json({ error: { message } }, { status: 500 });
  }
}
