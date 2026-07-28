import { gmGet } from "@/src/bsp/infrastructure/api/gm-route";
import { getGameEngine } from "@/src/bsp/application/bsp-service";

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const url = new URL(req.url);
  const templateId = url.searchParams.get("templateId");
  if (!templateId) {
    return new Response(JSON.stringify({ error: "templateId required" }), { status: 400 });
  }
  return gmGet(req, ctx, (sessionId) => getGameEngine().previewEvent(sessionId, templateId));
}
