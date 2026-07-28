import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { AuthService } from "@/src/bsp/infrastructure/auth/auth-service";
import { withAuthCookie } from "@/src/bsp/infrastructure/auth/api-guard";
import { authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import { GM_AUDIT_ACTIONS } from "@/src/bsp/domain/gm/audit-types";

function getAuthService() {
  return new AuthService(getGameEngine());
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { password?: string };
    if (!body.password) {
      return NextResponse.json({ error: "password required" }, { status: 400 });
    }
    const result = getAuthService().loginPlatformAdmin(body.password);
    await getGameEngine().logPlatformAudit(
      { userId: result.userId, role: "PLATFORM_ADMIN" },
      GM_AUDIT_ACTIONS.LOGIN,
      { role: result.role }
    );
    const res = NextResponse.json({
      role: result.role,
      accessToken: result.accessToken,
    });
    return withAuthCookie(res, result.accessToken);
  } catch (e) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { message?: string };
    return NextResponse.json({ error: err.message ?? "Login failed" }, { status: 500 });
  }
}
