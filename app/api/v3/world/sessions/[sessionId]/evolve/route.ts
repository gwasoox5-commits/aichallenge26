import { v3GmJson } from "@/lib/v3/api-route";
import { getV3WorldSimulation } from "@/lib/v3/v3-service";

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  return v3GmJson(req, sessionId, async (actor) => {
    const world = await getV3WorldSimulation().evolveManually(sessionId, actor);
    return { world, pendingProposals: world.proposals.filter((p) => p.status === "PENDING_GM") };
  });
}
