import { v3GmJson } from "@/lib/v3/api-route";
import { getV3WorldSimulation } from "@/lib/v3/v3-service";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { sessionId?: string; reason?: string };
  if (!body.sessionId) {
    return Response.json({ error: "sessionId required", code: "ERR_WORLD_INPUT" }, { status: 400 });
  }
  return v3GmJson(req, body.sessionId, async (actor, b) => {
    const reason = (b.reason as string) ?? body.reason ?? actor.reason ?? "GM approved";
    const proposal = getV3WorldSimulation().approveProposal(id, actor, reason);
    return { proposal };
  });
}
