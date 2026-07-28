import { v2GmGet, v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getIntelligenceService } from "@/lib/v2/intelligence/intelligence-service";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "sessionId required", code: "ERR_INTEL_INPUT" }, { status: 400 });
  }
  return v2GmGet(req, sessionId, async () => ({
    entries: getIntelligenceService().listLibrary(),
  }));
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    sessionId?: string;
    previewId?: string;
    title?: string;
    tags?: string[];
  };
  if (!body.sessionId || !body.previewId) {
    return Response.json(
      { error: "sessionId and previewId required", code: "ERR_INTEL_INPUT" },
      { status: 400 }
    );
  }
  return v2GmJson(req, body.sessionId, async () => {
    const entry = getIntelligenceService().saveToLibrary(body.previewId!, body.title, body.tags);
    return { entry };
  });
}
