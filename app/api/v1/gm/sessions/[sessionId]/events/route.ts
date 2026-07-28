import { gmGet } from "@/src/bsp/infrastructure/api/gm-route";
import { getGameEngine } from "@/src/bsp/application/bsp-service";

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return gmGet(req, ctx, (sessionId) => getGameEngine().listSessionEvents(sessionId));
}
