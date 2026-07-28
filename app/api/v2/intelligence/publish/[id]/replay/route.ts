import { v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getV2IntelligencePublish } from "@/lib/v2/event-studio/v2-service";
import type { ScenarioKey } from "@/lib/v2/event-studio/types";
import type { PublishScheduleInput } from "@/lib/v2/intelligence/publish-types";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as PublishScheduleInput & {
    sessionId?: string;
    replayScenario?: ScenarioKey;
  };
  if (!body.sessionId || !body.reason) {
    return Response.json({ error: "sessionId and reason required", code: "ERR_INTEL_INPUT" }, { status: 400 });
  }
  return v2GmJson(req, body.sessionId, async (actor) => {
    const result = await getV2IntelligencePublish().createReplay(
      id,
      body.replayScenario ?? "neutral",
      {
        applyTiming: body.applyTiming ?? "IMMEDIATE",
        displayMode: body.displayMode,
        reason: body.reason,
      },
      body.reason,
      actor
    );
    return result;
  });
}
