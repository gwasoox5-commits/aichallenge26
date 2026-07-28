import { v3GmJson } from "@/lib/v3/api-route";
import { getV3WorldSimulation } from "@/lib/v3/v3-service";

export async function POST(req: Request) {
  const body = (await req.json()) as { sessionId?: string; sourceSessionId?: string };
  if (!body.sessionId || !body.sourceSessionId) {
    return Response.json({ error: "sessionId and sourceSessionId required" }, { status: 400 });
  }
  return v3GmJson(req, body.sessionId, async (actor) => {
    const replay = getV3WorldSimulation().replayWorld(body.sourceSessionId!, body.sessionId!, actor);
    return { replay };
  });
}
