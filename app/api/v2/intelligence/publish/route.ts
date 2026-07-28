import { v2GmGet, v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getV2IntelligencePublish } from "@/lib/v2/event-studio/v2-service";
import type { ScenarioKey } from "@/lib/v2/event-studio/types";
import type { PublishScheduleInput } from "@/lib/v2/intelligence/publish-types";

/** GET list / POST initiate or full publish */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "sessionId required", code: "ERR_INTEL_INPUT" }, { status: 400 });
  }
  return v2GmGet(req, sessionId, async () => {
    const records = getV2IntelligencePublish().listBySession(sessionId);
    return { records };
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    sessionId?: string;
    previewId?: string;
    selectedScenario?: ScenarioKey;
    applyTiming?: PublishScheduleInput["applyTiming"];
    displayMode?: PublishScheduleInput["displayMode"];
    reason?: string;
    idempotencyKey?: string;
    workflow?: "full" | "initiate";
  };

  if (!body.sessionId || !body.previewId) {
    return Response.json(
      { error: "sessionId and previewId required", code: "ERR_INTEL_INPUT" },
      { status: 400 }
    );
  }

  return v2GmJson(req, body.sessionId, async (actor) => {
    const svc = getV2IntelligencePublish();
    const scenario = body.selectedScenario ?? "neutral";
    const reason = body.reason ?? actor.reason ?? "Intelligence publish";

    if (body.workflow === "initiate") {
      const record = await svc.initiatePublish(body.previewId!, scenario, actor);
      return { record };
    }

    const schedule: PublishScheduleInput = {
      applyTiming: body.applyTiming ?? "IMMEDIATE",
      displayMode: body.displayMode ?? "DIRECTIONAL",
      reason,
    };

    const result = await svc.publishFromPreview(
      body.previewId!,
      scenario,
      schedule,
      reason,
      actor,
      body.idempotencyKey
    );

    const record = svc.getRecord(result.publishId);
    return { result, record };
  });
}
