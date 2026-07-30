import { v3GmGet, v3GmJson } from "@/lib/v3/api-route";
import { getV3WorldSimulation } from "@/lib/v3/v3-service";
import type { WorldProfileId } from "@/lib/v3/world/types";

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  return v3GmGet(req, sessionId, async () => {
    const world = getV3WorldSimulation().getWorld(sessionId);
    return { world };
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  return v3GmJson(req, sessionId, async (actor, body) => {
    const profileId = (body.profileId as WorldProfileId) ?? "STABLE_GROWTH";
    const customDimensions = body.customDimensions as Partial<import("@/lib/v3/world/types").WorldDimensionValues> | undefined;
    const force = body.force === true;
    const world = await getV3WorldSimulation().initWorld(sessionId, profileId, actor, customDimensions, {
      force,
    });
    return { world };
  });
}
