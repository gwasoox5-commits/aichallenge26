import { gmMutation } from "@/src/bsp/infrastructure/api/gm-route";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import type { EventApplyTiming } from "@/src/bsp/domain/events/event-types";

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return gmMutation(req, ctx, (sessionId, actor, body) => {
    const templateId = body.templateId as string;
    const applyTiming = (body.applyTiming as EventApplyTiming) ?? "IMMEDIATE";
    const allowDuplicate = body.allowDuplicate === true;
    if (!templateId) throw Object.assign(new Error("templateId required"), { status: 400 });
    return getGameEngine().fireEvent(sessionId, templateId, applyTiming, actor, { allowDuplicate });
  });
}
