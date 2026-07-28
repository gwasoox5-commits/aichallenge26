import { v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getV2ScenarioStudio } from "@/lib/v2/event-studio/v2-service";
import type { NewsDisplayMode } from "@/lib/v2/event-studio/types";
import type { EventApplyTiming } from "@/src/bsp/domain/events/event-types";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const draft = getV2ScenarioStudio().getDraft(id);
  return v2GmJson(req, draft.sessionId, async (actor, body) => {
    return getV2ScenarioStudio().scheduleDraft(
      id,
      {
        applyTiming: (body.applyTiming as EventApplyTiming) ?? "IMMEDIATE",
        displayMode: body.displayMode as NewsDisplayMode | undefined,
        reason: (body.reason as string) ?? actor.reason ?? "Schedule",
        scheduledFor: body.scheduledFor as import("@/src/bsp/domain/events/event-types").EventScheduleTarget | undefined,
      },
      actor
    );
  });
}
