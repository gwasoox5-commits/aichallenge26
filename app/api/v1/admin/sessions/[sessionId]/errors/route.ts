import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { requireAuth, authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { sessionId } = await params;
    requireAuth(req, { roles: ["PLATFORM_ADMIN", "GM"], sessionId });
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const errors = await getGameEngine().getErrorLog(sessionId, limit);
    return NextResponse.json(errors);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { status?: number; message?: string };
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
}
