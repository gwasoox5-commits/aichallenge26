import { gmMutation } from "@/src/bsp/infrastructure/api/gm-route";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import type { BspHalf } from "@/src/bsp/domain/types";

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return gmMutation(req, ctx, (sessionId, actor, body) => {
    const templateId = body.templateId as string;
    const year = Number(body.year);
    const half = body.half as BspHalf;
    if (!templateId || !year || !half) {
      throw Object.assign(new Error("templateId, year, half required"), { status: 400 });
    }
    return getGameEngine().scheduleEvent(sessionId, templateId, { year, half }, actor);
  });
}
