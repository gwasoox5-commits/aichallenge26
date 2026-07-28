import { v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getV2ScenarioStudio } from "@/lib/v2/event-studio/v2-service";
import type { ScenarioKey } from "@/lib/v2/event-studio/types";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const draft = getV2ScenarioStudio().getDraft(id);
  return v2GmJson(req, draft.sessionId, async (_actor, body) => {
    const scenario = body.selectedScenario as ScenarioKey | undefined;
    return getV2ScenarioStudio().previewDraft(id, scenario);
  });
}
