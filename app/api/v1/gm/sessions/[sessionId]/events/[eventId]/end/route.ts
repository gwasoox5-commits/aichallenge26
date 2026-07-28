import { gmMutation } from "@/src/bsp/infrastructure/api/gm-route";
import { getGameEngine } from "@/src/bsp/application/bsp-service";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ sessionId: string; eventId: string }> }
) {
  const params = await ctx.params;
  return gmMutation(req, { params: Promise.resolve({ sessionId: params.sessionId }) }, (sessionId, actor) =>
    getGameEngine().endEvent(sessionId, params.eventId, actor)
  );
}
