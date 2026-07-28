import { v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getIntelligenceService } from "@/lib/v2/intelligence/intelligence-service";
import type { ScenarioKey } from "@/lib/v2/event-studio/types";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    sessionId?: string;
    previewId?: string;
    selectedScenario?: ScenarioKey;
  };
  if (!body.sessionId || !body.previewId) {
    return Response.json(
      { error: "sessionId and previewId required", code: "ERR_INTEL_INPUT" },
      { status: 400 }
    );
  }
  return v2GmJson(req, body.sessionId, async () => {
    const svc = getIntelligenceService();
    const preview = await svc.buildFullPreview(body.previewId!);
    const scenarioKey = body.selectedScenario ?? "neutral";
    const economy = svc.getEconomyPreview(body.previewId!, scenarioKey);
    const publishIntent = svc.buildPublishIntent(body.previewId!, scenarioKey);
    return {
      preview,
      economy,
      publishIntent,
      gmPreviewOnly: false,
      v24Enabled: true,
    };
  });
}
