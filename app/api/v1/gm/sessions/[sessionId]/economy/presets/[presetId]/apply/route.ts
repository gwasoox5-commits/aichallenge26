import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { requireGmSession } from "@/src/bsp/infrastructure/auth/access-control";
import { authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import { toGmActor } from "@/src/bsp/infrastructure/api/gm-route";

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string; presetId: string }> }) {
  try {
    const { sessionId, presetId } = await params;
    const ctx = requireGmSession(req, sessionId);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const reason = typeof body.reason === "string" ? body.reason : undefined;
    const result = await getGameEngine().applyEconomyPreset(sessionId, presetId, toGmActor(ctx, reason));
    return NextResponse.json(result);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { status?: number; message?: string; code?: string };
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status ?? 500 });
  }
}
