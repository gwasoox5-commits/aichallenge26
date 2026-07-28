import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { requireAuth, authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import { toGmActor } from "@/src/bsp/infrastructure/api/gm-route";

type Params = { params: Promise<{ sessionId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const ctx = requireAuth(req, { roles: ["PLATFORM_ADMIN"] });
    const { sessionId } = await params;
    await getGameEngine().archiveAdminSession(sessionId);
    return NextResponse.json({ sessionId, archived: true, actorId: ctx.userId });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { status?: number; message?: string };
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const ctx = requireAuth(req, { roles: ["PLATFORM_ADMIN"] });
    const { sessionId } = await params;
    const body = (await req.json().catch(() => ({}))) as { reason?: string };
    const result = await getGameEngine().endAdminSession(
      sessionId,
      toGmActor({ userId: ctx.userId, role: ctx.role }, body.reason)
    );
    return NextResponse.json(result);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { status?: number; message?: string };
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
}
