import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { requireAuth, authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import { assertCompanyAccess } from "@/src/bsp/infrastructure/auth/access-control";

interface RegionSelectBody {
  regionCodes: string[];
  companyStatusVersion: number;
}

export async function POST(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId } = await params;
    const engine = getGameEngine();
    const ctx = requireAuth(req, { roles: ["CEO"] });
    await assertCompanyAccess(ctx, engine, companyId);

    const body = (await req.json()) as RegionSelectBody;
    if (!Array.isArray(body.regionCodes)) {
      return NextResponse.json({ error: "regionCodes array required" }, { status: 400 });
    }

    const result = await engine.selectOperatingRegions(
      companyId,
      body.regionCodes,
      body.companyStatusVersion ?? 0
    );

    return NextResponse.json(result);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { status?: number; message?: string; code?: string; details?: unknown };
    return NextResponse.json(
      { error: err.message, code: err.code, details: err.details },
      { status: err.status ?? 500 }
    );
  }
}
