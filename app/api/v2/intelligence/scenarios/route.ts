import { v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getIntelligenceService } from "@/lib/v2/intelligence/intelligence-service";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    sessionId?: string;
    previewId?: string;
    promptVersion?: string;
  };
  if (!body.sessionId || !body.previewId) {
    return Response.json(
      { error: "sessionId and previewId required", code: "ERR_INTEL_INPUT" },
      { status: 400 }
    );
  }
  return v2GmJson(req, body.sessionId, async () => {
    const preview = await getIntelligenceService().generateScenariosForPreview(
      body.previewId!,
      body.promptVersion
    );
    return { previewId: preview.previewId, scenarios: preview.scenarios, status: preview.status };
  });
}
