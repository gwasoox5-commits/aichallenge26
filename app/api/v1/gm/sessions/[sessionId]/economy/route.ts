import { gmGet, gmMutation } from "@/src/bsp/infrastructure/api/gm-route";
import { getGameEngine } from "@/src/bsp/application/bsp-service";

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return gmGet(req, ctx, (sessionId) => getGameEngine().getSessionEconomy(sessionId));
}

export async function PATCH(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return gmMutation(req, ctx, (sessionId, actor, body) => {
    const patch = body.patch as Record<string, number> | undefined;
    const effects = body.effects as import("@/src/bsp/domain/events/event-types").EconomyPatchEffect[] | undefined;
    const applyTiming = body.applyTiming as import("@/src/bsp/domain/events/event-types").EventApplyTiming | undefined;
    const reason = typeof body.reason === "string" ? body.reason : undefined;
    return getGameEngine().patchEconomy(sessionId, { patch, effects, applyTiming, reason }, actor);
  });
}
