import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { AuthService } from "@/src/bsp/infrastructure/auth/auth-service";
import { requireAuth, authErrorResponse, withAuthCookie } from "@/src/bsp/infrastructure/auth/api-guard";
import { DEMO_JOIN_CODE } from "@/src/bsp/domain/auth/demo-constants";
import { assertDemoBootstrapAllowed } from "@/lib/bsp/runtime-config";

export async function POST(req: Request) {
  try {
    const demo = assertDemoBootstrapAllowed();
    if (!demo.ok) {
      return NextResponse.json({ error: demo.message, code: "DEMO_DISABLED" }, { status: 403 });
    }
    requireAuth(req, { roles: ["PLATFORM_ADMIN"] });
    const engine = getGameEngine();
    const session = await engine.ensureDemoSession();
    const teamName = `Team-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const auth = new AuthService(engine);
    const ceo = await auth.joinAsCeo(DEMO_JOIN_CODE, teamName);
    const res = NextResponse.json({
      companyId: ceo.companyId,
      teamName: ceo.teamName,
      sessionId: session.id,
      statusVersion: ceo.statusVersion,
      accessToken: ceo.accessToken,
      storage: process.env.BSP_DATABASE_URL ? "postgresql" : "memory",
    });
    return withAuthCookie(res, ceo.accessToken);
  } catch (e) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error(e);
    return NextResponse.json({ error: "Failed to create demo company" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const demo = assertDemoBootstrapAllowed();
    if (!demo.ok) {
      return NextResponse.json({ error: demo.message, code: "DEMO_DISABLED" }, { status: 403 });
    }
    requireAuth(req, { roles: ["PLATFORM_ADMIN", "GM"] });
    const engine = getGameEngine();
    const session = await engine.ensureDemoSession();
    const gm = new AuthService(engine).issueGmToken(session.id);
    return NextResponse.json({
      sessionId: session.id,
      joinCode: session.joinCode,
      name: session.name,
      gmAccessToken: gm.accessToken,
      storage: process.env.BSP_DATABASE_URL ? "postgresql" : "memory",
    });
  } catch (e) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    return NextResponse.json({ error: "Demo session unavailable" }, { status: 500 });
  }
}
