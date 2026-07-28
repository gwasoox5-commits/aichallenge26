import { gmMutation } from "@/src/bsp/infrastructure/api/gm-route";
import { getGameEngine } from "@/src/bsp/application/bsp-service";

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return gmMutation(req, ctx, (sessionId, _actor, body) => {
    const patch = body.patch as Record<string, number> | undefined;
    const effects = body.effects as import("@/src/bsp/domain/events/event-types").EconomyPatchEffect[] | undefined;
    return getGameEngine().previewEconomy(sessionId, { patch, effects });
  });
}
