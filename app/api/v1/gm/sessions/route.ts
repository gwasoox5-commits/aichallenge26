import { NextResponse } from "next/server";

import { getGameEngine } from "@/src/bsp/application/bsp-service";

import { AuthService } from "@/src/bsp/infrastructure/auth/auth-service";

import { requireAuth, authErrorResponse, withAuthCookie } from "@/src/bsp/infrastructure/auth/api-guard";

import type { SessionWizardMeta } from "@/src/bsp/application/ports/repositories";

import { normalizeMaxPeriodIndex, normalizeStepDurationSec } from "@/lib/bsp/session-create-options";



type CreateSessionBody = {

  name?: string;

  stepDurationSec?: number;

  maxPeriodIndex?: number;

  periods?: number;

  economyPresetId?: string;

  economyPreset?: string;

  wizardMeta?: SessionWizardMeta;

  teamNames?: string[];

};



export async function POST(req: Request) {

  try {

    requireAuth(req, { roles: ["PLATFORM_ADMIN"] });

    const body = (await req.json()) as CreateSessionBody;

    const engine = getGameEngine();

    const session = await engine.createSession(body.name ?? "BSP Game Session", {

      stepDurationSec: normalizeStepDurationSec(body.stepDurationSec),

      maxPeriodIndex: normalizeMaxPeriodIndex(body.maxPeriodIndex ?? body.periods),

      economyPresetId: body.economyPresetId ?? body.economyPreset,

      wizardMeta: body.wizardMeta,

      teamNames: body.teamNames,

    });

    const gm = new AuthService(engine).issueGmToken(session.id);

    const res = NextResponse.json({

      sessionId: session.id,

      joinCode: session.joinCode,

      name: session.name,

      stepPhase: session.stepPhase,

      stepDurationSec: session.stepDurationSec,
      maxPeriodIndex: session.maxPeriodIndex,
      economyPresetId: session.economyPresetId,
      wizardMeta: session.wizardMeta,
      gmAccessToken: gm.accessToken,

    });

    return withAuthCookie(res, gm.accessToken);

  } catch (e: unknown) {

    const authRes = authErrorResponse(e);

    if (authRes) return authRes;

    const err = e as { status?: number; message?: string; code?: string };

    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status ?? 500 });

  }

}

