import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import type { BspGameStep, FacilityPayload, LoanPayload } from "@/src/bsp/domain/types";
import { requireAuth, authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import { assertCompanyAccess } from "@/src/bsp/infrastructure/auth/access-control";

interface DecisionBody {
  step: BspGameStep;
  payload: LoanPayload | FacilityPayload;
  companyStatusVersion: number;
  validateOnly?: boolean;
}

export async function POST(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId } = await params;
    const engine = getGameEngine();
    const ctx = requireAuth(req, { roles: ["CEO"] });
    await assertCompanyAccess(ctx, engine, companyId);

    const body = (await req.json()) as DecisionBody;
    if (!body.step || !body.payload) {
      return NextResponse.json({ error: "step and payload required" }, { status: 400 });
    }

    if (body.validateOnly) {
      const outcome = await engine.validateDecision(companyId, body.step, body.payload);
      return NextResponse.json(outcome);
    }

    const result = await engine.submitDecision(
      companyId,
      body.step,
      body.payload,
      body.companyStatusVersion ?? 0
    );

    return NextResponse.json({
      decisionId: result.decision.id,
      status: result.decision.status,
      validation: result.decision.validation,
      computed: result.decision.computed,
      journalEntryIds: result.decision.journalEntryIds,
      statusVersion: result.statusVersion,
      dashboard: result.dashboard,
    });
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
