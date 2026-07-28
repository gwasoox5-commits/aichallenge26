import { v2GmGet } from "@/lib/v2/event-studio/api-route";
import { getV2IntelligencePublish } from "@/lib/v2/event-studio/v2-service";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "sessionId required", code: "ERR_INTEL_INPUT" }, { status: 400 });
  }
  return v2GmGet(req, sessionId, async () => {
    const record = getV2IntelligencePublish().getRecord(id);
    if (!record || record.sessionId !== sessionId) {
      throw Object.assign(new Error("Publish record not found"), { code: "ERR_INTEL_PUBLISH", status: 404 });
    }
    return { record };
  });
}
