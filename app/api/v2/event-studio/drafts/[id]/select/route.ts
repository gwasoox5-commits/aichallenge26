import { v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getV2ScenarioStudio } from "@/lib/v2/event-studio/v2-service";
import type { ScenarioKey, ScenarioWeights, SelectionMode } from "@/lib/v2/event-studio/types";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const draft = getV2ScenarioStudio().getDraft(id);
  return v2GmJson(req, draft.sessionId, async (actor, body) => {
    const mode = body.mode as SelectionMode;
    return getV2ScenarioStudio().selectOutcome(
      id,
      {
        mode,
        selectedOutcome: body.selectedOutcome as ScenarioKey | undefined,
        weights: body.weights as ScenarioWeights | undefined,
        randomSeed: body.randomSeed as string | undefined,
      },
      actor
    );
  });
}
