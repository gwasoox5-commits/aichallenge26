import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { requireAuth, authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import { toGmActor } from "@/src/bsp/infrastructure/api/gm-route";

type Params = { params: Promise<{ sessionId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const ctx = requireAuth(req, { roles: ["PLATFORM_ADMIN"] });
    const { sessionId } = await params;
    const body = (await req.json().catch(() => ({}))) as { reason?: string; confirmSessionId?: string };
    if (body.confirmSessionId && body.confirmSessionId !== sessionId) {
      return NextResponse.json(
        { error: "confirmSessionId must match sessionId", code: "ERR_SESSION_DELETE_CONFIRM" },
        { status: 400 }
      );
    }
    const result = await getGameEngine().deleteAdminSession(
      sessionId,
      toGmActor({ userId: ctx.userId, role: ctx.role }, body.reason ?? "Admin deleted session")
    );
    return NextResponse.json({ ...result, actorId: ctx.userId });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { status?: number; message?: string; code?: string };
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status ?? 500 });
  }
}
