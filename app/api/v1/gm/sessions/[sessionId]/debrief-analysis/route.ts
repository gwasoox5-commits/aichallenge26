import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { requireGmSession } from "@/src/bsp/infrastructure/auth/access-control";
import { authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";

export async function GET(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    requireGmSession(req, sessionId);
    const analysis = await getGameEngine().getSessionDebriefAnalysis(sessionId);
    return NextResponse.json(analysis);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { status?: number; message?: string; code?: string };
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status ?? 500 });
  }
}
