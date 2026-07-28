import { v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getV2ScenarioStudio } from "@/lib/v2/event-studio/v2-service";
import type { EventStudioInput } from "@/lib/v2/event-studio/types";

export async function POST(req: Request) {
  const body = (await req.json()) as { sessionId?: string; input?: EventStudioInput };
  if (!body.sessionId || !body.input) {
    return Response.json({ error: "sessionId and input required", code: "ERR_STUDIO_INPUT" }, { status: 400 });
  }
  return v2GmJson(req, body.sessionId, async (actor) => {
    const draft = await getV2ScenarioStudio().createDraft(body.sessionId!, body.input!, actor);
    return { draftId: draft.draftId, status: draft.status, draft };
  });
}
