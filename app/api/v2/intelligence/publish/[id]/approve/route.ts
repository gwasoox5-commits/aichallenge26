import { v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getV2IntelligencePublish } from "@/lib/v2/event-studio/v2-service";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { sessionId?: string; reason?: string };
  if (!body.sessionId) {
    return Response.json({ error: "sessionId required", code: "ERR_INTEL_INPUT" }, { status: 400 });
  }
  return v2GmJson(req, body.sessionId, async (actor) => {
    const reason = body.reason ?? actor.reason ?? "GM approved";
    const record = getV2IntelligencePublish().approve(id, reason, actor);
    return { record };
  });
}
