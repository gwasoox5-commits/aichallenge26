import { v2GmGet } from "@/lib/v2/event-studio/api-route";
import { getIntelligenceLibraryStore } from "@/lib/v2/intelligence/library-store";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "sessionId required", code: "ERR_INTEL_INPUT" }, { status: 400 });
  }
  return v2GmGet(req, sessionId, async () => {
    const json = getIntelligenceLibraryStore().exportJson(id);
    if (!json) throw Object.assign(new Error("Not found"), { code: "ERR_INTEL_LIBRARY", status: 404 });
    return { json: JSON.parse(json) };
  });
}
