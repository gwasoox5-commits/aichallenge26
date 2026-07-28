import { v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getIntelligenceService } from "@/lib/v2/intelligence/intelligence-service";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    sessionId?: string;
    keywords?: string[];
    language?: string;
    limit?: number;
  };
  if (!body.sessionId) {
    return Response.json({ error: "sessionId required", code: "ERR_INTEL_INPUT" }, { status: 400 });
  }
  return v2GmJson(req, body.sessionId, async () => {
    const result = await getIntelligenceService().searchNews({
      keywords: body.keywords ?? [],
      language: body.language,
      limit: body.limit,
    });
    return result;
  });
}
