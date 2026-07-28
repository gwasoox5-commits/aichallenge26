import { v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getV2IntelligencePublish } from "@/lib/v2/event-studio/v2-service";
import type { PublishScheduleInput } from "@/lib/v2/intelligence/publish-types";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as PublishScheduleInput & { sessionId?: string };
  if (!body.sessionId || !body.reason) {
    return Response.json({ error: "sessionId and reason required", code: "ERR_INTEL_INPUT" }, { status: 400 });
  }
  return v2GmJson(req, body.sessionId, async (actor) => {
    const record = getV2IntelligencePublish().schedule(
      id,
      {
        applyTiming: body.applyTiming,
        scheduledFor: body.scheduledFor,
        displayMode: body.displayMode,
        reason: body.reason,
      },
      actor
    );
    return { record };
  });
}
