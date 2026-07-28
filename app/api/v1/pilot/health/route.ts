import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { assertDemoBootstrapAllowed, isPilotBootstrapEnabled } from "@/lib/bsp/runtime-config";

export async function GET() {
  try {
    const demo = assertDemoBootstrapAllowed();
    if (demo.ok && isPilotBootstrapEnabled()) {
      const engine = getGameEngine();
      await engine.ensureDemoSession();
    }
    return NextResponse.json({
      ok: true,
      storage: process.env.BSP_DATABASE_URL ? "postgresql" : "memory",
      pilotMode: process.env.BSP_PILOT_MODE === "1" || process.env.PILOT_MODE === "true",
      demoBootstrap: demo.ok,
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
