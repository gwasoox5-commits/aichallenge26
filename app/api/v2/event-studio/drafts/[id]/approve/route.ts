import { v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getV2ScenarioStudio } from "@/lib/v2/event-studio/v2-service";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const draft = getV2ScenarioStudio().getDraft(id);
  const idempotencyKey = req.headers.get("Idempotency-Key") ?? undefined;
  return v2GmJson(req, draft.sessionId, async (actor, body) => {
    const reason = (body.reason as string) ?? actor.reason;
    if (!reason) {
      throw Object.assign(new Error("reason is required for approve"), { code: "ERR_STUDIO_INPUT", status: 400 });
    }
    return getV2ScenarioStudio().approveDraft(id, { reason, idempotencyKey }, actor);
  });
}
