import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { requireAuth, authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import { assertCompanyAccess } from "@/src/bsp/infrastructure/auth/access-control";

export async function GET(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId } = await params;
    const engine = getGameEngine();
    const ctx = requireAuth(req, { roles: ["CEO", "GM", "PLATFORM_ADMIN"] });
    await assertCompanyAccess(ctx, engine, companyId);
    const financials = await engine.getFinancialStatements(companyId);
    return NextResponse.json(financials);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { status?: number; message?: string; code?: string };
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status ?? 500 });
  }
}
