import { v3GmGet } from "@/lib/v3/api-route";
import { getV3WorldSimulation } from "@/lib/v3/v3-service";

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  return v3GmGet(req, sessionId, async () => ({
    director: getV3WorldSimulation().getDirector(sessionId),
  }));
}
