import { v3GmJson } from "@/lib/v3/api-route";
import { getV3WorldSimulation } from "@/lib/v3/v3-service";

export async function PATCH(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  return v3GmJson(req, sessionId, async (_actor, body) => {
    const chainId = body.chainId as string;
    const nodeId = body.nodeId as string;
    const probability = body.probability as number;
    if (!chainId || !nodeId || probability == null) {
      throw Object.assign(new Error("chainId, nodeId, probability required"), { status: 400 });
    }
    const world = getV3WorldSimulation().updateChainProbability(sessionId, chainId, nodeId, probability);
    return { world };
  });
}
