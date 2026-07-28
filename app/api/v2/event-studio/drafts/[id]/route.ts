import { v2GmGet } from "@/lib/v2/event-studio/api-route";
import { getV2ScenarioStudio } from "@/lib/v2/event-studio/v2-service";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const draft = getV2ScenarioStudio().getDraft(id);
  return v2GmGet(req, draft.sessionId, async () => ({ draft }));
}
