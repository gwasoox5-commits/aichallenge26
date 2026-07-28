import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { AuthService } from "@/src/bsp/infrastructure/auth/auth-service";
import { requireAuth, authErrorResponse, withAuthCookie } from "@/src/bsp/infrastructure/auth/api-guard";

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    requireAuth(req, { roles: ["PLATFORM_ADMIN", "GM"] });
    const { sessionId } = await ctx.params;
    const engine = getGameEngine();
    await engine.getGmDesk(sessionId);
    const gm = new AuthService(engine).issueGmToken(sessionId);
    const res = NextResponse.json({
      sessionId,
      gmAccessToken: gm.accessToken,
      role: gm.role,
    });
    return withAuthCookie(res, gm.accessToken);
  } catch (e) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { status?: number; message?: string };
    return NextResponse.json({ error: err.message ?? "GM token issue failed" }, { status: err.status ?? 500 });
  }
}
