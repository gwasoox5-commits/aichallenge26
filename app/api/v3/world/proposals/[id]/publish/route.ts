import { v3GmJson } from "@/lib/v3/api-route";
import { getV3WorldSimulation } from "@/lib/v3/v3-service";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    sessionId?: string;
    reason?: string;
    applyTiming?: "IMMEDIATE" | "NEXT_STEP" | "NEXT_HALF";
  };
  if (!body.sessionId) {
    return Response.json({ error: "sessionId required", code: "ERR_WORLD_INPUT" }, { status: 400 });
  }
  const sessionId = body.sessionId;
  return v3GmJson(req, sessionId, async (actor, b) => {
    const result = await getV3WorldSimulation().publishProposal(id, sessionId, actor, {
      applyTiming: (b.applyTiming as "IMMEDIATE" | "NEXT_STEP" | "NEXT_HALF") ?? body.applyTiming ?? "NEXT_HALF",
      reason: (b.reason as string) ?? body.reason,
    });
    return result;
  });
}
