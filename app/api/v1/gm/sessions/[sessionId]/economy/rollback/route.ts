import { gmMutation } from "@/src/bsp/infrastructure/api/gm-route";
import { getGameEngine } from "@/src/bsp/application/bsp-service";

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return gmMutation(req, ctx, (sessionId, actor, body) => {
    const patchSequence =
      typeof body.patchSequence === "number" ? body.patchSequence : undefined;
    return getGameEngine().rollbackEconomyPatch(sessionId, patchSequence, actor);
  });
}
