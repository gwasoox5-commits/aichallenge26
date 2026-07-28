import { gmGet } from "@/src/bsp/infrastructure/api/gm-route";
import { getGameEngine } from "@/src/bsp/application/bsp-service";

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "100");
  return gmGet(req, ctx, (sessionId) => getGameEngine().getEventHistory(sessionId, limit));
}
