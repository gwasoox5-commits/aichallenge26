import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { gmMutation } from "@/src/bsp/infrastructure/api/gm-route";

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return gmMutation(req, ctx, (sessionId, actor, body) => {
    const { reason: _r, ...rest } = body;
    const miscIncome: Record<string, number> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (typeof v === "number") miscIncome[k] = v;
    }
    return getGameEngine().closePeriod(sessionId, miscIncome, actor);
  });
}
