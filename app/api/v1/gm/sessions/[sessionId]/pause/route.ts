import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { gmMutationSimple } from "@/src/bsp/infrastructure/api/gm-route";

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return gmMutationSimple(req, ctx, (sessionId, actor) =>
    getGameEngine().gmPauseSession(sessionId, actor)
  );
}
