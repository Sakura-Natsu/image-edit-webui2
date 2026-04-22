export const runtime = "nodejs";
export const maxDuration = 300;

function resolveConfig(req: Request) {
  const userKey = req.headers.get("x-user-api-key")?.trim();
  const userBase = req.headers.get("x-user-base-url")?.trim();
  const apiKey = userKey || process.env.OPENAI_API_KEY || "";
  const rawBase = userBase || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const baseUrl = rawBase.replace(/\/+$/, "");
  return { apiKey, baseUrl, source: userKey ? "header" : ("env" as const) };
}

export async function POST(req: Request) {
  const { apiKey, baseUrl, source } = resolveConfig(req);
  if (!apiKey) {
    console.warn("[api/edit] 缺少 API Key");
    return Response.json(
      { error: { message: "缺少 API Key，请在「设置」中填写或在 .env.local 中配置 OPENAI_API_KEY。" } },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { message: "请求体不是有效 JSON" } }, { status: 400 });
  }

  const started = Date.now();
  const target = `${baseUrl}/images/edits`;
  const b = body as { model?: string; images?: unknown[] } | null;
  const modelHint = b?.model ?? "?";
  const imagesHint = Array.isArray(b?.images) ? b.images.length : 0;
  console.log(
    `[api/edit] → ${target} model=${modelHint} images=${imagesHint} key-source=${source}`,
  );

  try {
    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const contentType = upstream.headers.get("content-type") ?? "application/json";
    const text = await upstream.text();
    const dur = Date.now() - started;
    if (!upstream.ok) {
      console.error(
        `[api/edit] ← ${upstream.status} in ${dur}ms`,
        text.slice(0, 500),
      );
    } else {
      console.log(`[api/edit] ← ${upstream.status} in ${dur}ms (${text.length}B)`);
    }
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": contentType },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "请求上游失败";
    console.error("[api/edit] 请求上游异常", err);
    return Response.json({ error: { message } }, { status: 502 });
  }
}
