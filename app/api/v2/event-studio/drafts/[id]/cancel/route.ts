import { v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getV2ScenarioStudio } from "@/lib/v2/event-studio/v2-service";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const draft = getV2ScenarioStudio().getDraft(id);
  return v2GmJson(req, draft.sessionId, async (actor, body) => {
    const reason = (body.reason as string) ?? "Cancelled by GM";
    return getV2ScenarioStudio().cancelDraft(id, reason, actor);
  });
}
