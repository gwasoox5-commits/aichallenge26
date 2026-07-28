import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { AuthService } from "@/src/bsp/infrastructure/auth/auth-service";
import { withAuthCookie, authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";

function getAuthService() {
  return new AuthService(getGameEngine());
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { joinCode?: string; teamName?: string };
    if (!body.joinCode?.trim() || !body.teamName?.trim()) {
      return NextResponse.json({ error: "joinCode and teamName required" }, { status: 400 });
    }
    const result = await getAuthService().joinAsCeo(body.joinCode, body.teamName);
    const res = NextResponse.json(result);
    return withAuthCookie(res, result.accessToken);
  } catch (e) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { status?: number; message?: string; code?: string };
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status ?? 500 });
  }
}
