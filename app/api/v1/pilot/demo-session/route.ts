import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { AuthService } from "@/src/bsp/infrastructure/auth/auth-service";
import { requireAuth, authErrorResponse, withAuthCookie } from "@/src/bsp/infrastructure/auth/api-guard";
import { PILOT_DEFAULTS } from "@/lib/bsp/pilot-config";
import { assertDemoBootstrapAllowed } from "@/lib/bsp/runtime-config";

export async function POST(req: Request) {
  try {
    const demo = assertDemoBootstrapAllowed();
    if (!demo.ok) {
      return NextResponse.json({ error: demo.message, code: "DEMO_DISABLED" }, { status: 403 });
    }
    requireAuth(req, { roles: ["PLATFORM_ADMIN", "GM"] });
    const engine = getGameEngine();
    const session = await engine.createSession("파일럿 데모 세션");
    const auth = new AuthService(engine);
    const gm = auth.issueGmToken(session.id);

    const teams: Array<{ teamName: string; joined: boolean }> = [];
    for (const teamName of PILOT_DEFAULTS.sampleTeams) {
      try {
        await auth.joinAsCeo(session.joinCode, teamName);
        teams.push({ teamName, joined: true });
      } catch {
        teams.push({ teamName, joined: false });
      }
    }

    const res = NextResponse.json({
      sessionId: session.id,
      joinCode: session.joinCode,
      name: session.name,
      joinUrl: `/join?code=${encodeURIComponent(session.joinCode)}`,
      teams,
      gmAccessToken: gm.accessToken,
      pilotDefaults: PILOT_DEFAULTS,
    });
    return withAuthCookie(res, gm.accessToken);
  } catch (e) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    return NextResponse.json({ error: "데모 세션 생성 실패" }, { status: 500 });
  }
}
