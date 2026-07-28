import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { isValidJoinCodeFormat, normalizeJoinCode } from "@/src/bsp/infrastructure/auth/join-code";

/** Pre-auth lookup: join code is the credential. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const normalized = normalizeJoinCode(code);
    if (!isValidJoinCodeFormat(normalized)) {
      return NextResponse.json(
        { error: "Join code must be 5 characters (letters and numbers)", code: "ERR_INVALID_JOIN_CODE" },
        { status: 400 }
      );
    }
    const session = await getGameEngine().findSessionByJoinCode(normalized);
    return NextResponse.json({
      sessionId: session.id,
      joinCode: session.joinCode,
      name: session.name,
      periodLabel: session.periodLabel,
      stepPhase: session.stepPhase,
    });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string; code?: string };
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status ?? 404 });
  }
}
