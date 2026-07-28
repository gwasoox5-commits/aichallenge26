import { v2GmGet } from "@/lib/v2/event-studio/api-route";
import { getV2IntelligencePublish } from "@/lib/v2/event-studio/v2-service";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  const newsId = url.searchParams.get("newsId");
  if (!sessionId) {
    return Response.json({ error: "sessionId required", code: "ERR_INTEL_INPUT" }, { status: 400 });
  }
  return v2GmGet(req, sessionId, async () => {
    const record = getV2IntelligencePublish().getRecord(id);
    const targetNewsId = newsId ?? record?.newsId;
    if (!targetNewsId) {
      return { summary: null };
    }
    const summary = await getV2IntelligencePublish().getAcknowledgementSummary(sessionId, targetNewsId);
    return { summary };
  });
}
