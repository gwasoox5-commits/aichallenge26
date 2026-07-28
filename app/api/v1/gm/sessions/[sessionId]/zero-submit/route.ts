import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { gmMutation } from "@/src/bsp/infrastructure/api/gm-route";

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return gmMutation(req, ctx, (sessionId, actor, body) => {
    const companyId = typeof body.companyId === "string" ? body.companyId : undefined;
    return getGameEngine().gmZeroSubmit(sessionId, actor, companyId);
  });
}
