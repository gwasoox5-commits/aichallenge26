import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { requireGmSession } from "@/src/bsp/infrastructure/auth/access-control";
import { authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import { toGmActor } from "@/src/bsp/infrastructure/api/gm-route";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ sessionId: string; companyId: string }> }
) {
  try {
    const { sessionId, companyId } = await params;
    const ctx = requireGmSession(req, sessionId);
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const reason = url.searchParams.get("reason") ?? "Team removed by operator";
    const result = await getGameEngine().deleteSessionTeam(
      sessionId,
      companyId,
      toGmActor({ userId: ctx.userId, role: ctx.role }, reason),
      { force }
    );
    return NextResponse.json(result);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { status?: number; message?: string; code?: string; details?: unknown };
    return NextResponse.json(
      { error: err.message, code: err.code, details: err.details },
      { status: err.status ?? 500 }
    );
  }
}
