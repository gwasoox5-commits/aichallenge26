import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { gmGet } from "@/src/bsp/infrastructure/api/gm-route";

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return gmGet(req, ctx, (sessionId) => getGameEngine().getGmAuditLog(sessionId));
}
