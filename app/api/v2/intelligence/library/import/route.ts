import { v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getIntelligenceLibraryStore } from "@/lib/v2/intelligence/library-store";

export async function POST(req: Request) {
  const body = (await req.json()) as { sessionId?: string; json?: string };
  if (!body.sessionId || !body.json) {
    return Response.json({ error: "sessionId and json required", code: "ERR_INTEL_INPUT" }, { status: 400 });
  }
  return v2GmJson(req, body.sessionId, async () => {
    const entry = getIntelligenceLibraryStore().importJson(body.json!);
    return { entry };
  });
}
