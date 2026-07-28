import { v3GmGet } from "@/lib/v3/api-route";
import { getV3WorldSimulation } from "@/lib/v3/v3-service";

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  return v3GmGet(req, sessionId, async () => {
    const proposals = getV3WorldSimulation().listProposals(
      sessionId,
      status as import("@/lib/v3/world/types").WorldEvolutionProposal["status"] | undefined
    );
    return { proposals };
  });
}
