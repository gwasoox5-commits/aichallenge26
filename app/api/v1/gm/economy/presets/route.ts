import { NextResponse } from "next/server";
import { listPresets } from "@/src/bsp/application/bsp-service";
import { requireAuth, authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";

export async function GET(req: Request) {
  try {
    requireAuth(req, { roles: ["GM", "PLATFORM_ADMIN"] });
    return NextResponse.json({ presets: listPresets() });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    return NextResponse.json({ error: "Failed to list presets" }, { status: 500 });
  }
}
