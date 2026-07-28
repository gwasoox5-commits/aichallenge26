import { NextResponse } from "next/server";
import { requireGmSession } from "@/src/bsp/infrastructure/auth/access-control";
import { authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import type { GmActor } from "@/src/bsp/domain/gm/audit-types";
import { BspError } from "@/src/bsp/application/game-engine";

export function toGmActor(ctx: { userId: string; role: GmActor["role"] }, reason?: string): GmActor {
  return { userId: ctx.userId, role: ctx.role, reason };
}

export async function v2GmJson(
  req: Request,
  sessionId: string,
  handler: (actor: GmActor, body: Record<string, unknown>) => Promise<unknown>,
  parsedBody?: Record<string, unknown>
) {
  try {
    const ctx = requireGmSession(req, sessionId);
    const body = parsedBody ?? ((await req.json().catch(() => ({}))) as Record<string, unknown>);
    const reason = typeof body.reason === "string" ? body.reason : undefined;
    const result = await handler(toGmActor(ctx, reason), body);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    if (e instanceof BspError) {
      return NextResponse.json({ error: e.message, code: e.code, details: e.details }, { status: e.status });
    }
    const err = e as { status?: number; message?: string; code?: string };
    return NextResponse.json({ error: err.message ?? "Internal error", code: err.code }, { status: err.status ?? 500 });
  }
}

export async function v2GmGet(req: Request, sessionId: string, handler: () => Promise<unknown>) {
  try {
    requireGmSession(req, sessionId);
    const result = await handler();
    return NextResponse.json(result);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    if (e instanceof BspError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    const err = e as { status?: number; message?: string; code?: string };
    return NextResponse.json({ error: err.message ?? "Internal error", code: err.code }, { status: err.status ?? 500 });
  }
}

export function v2Error(e: unknown) {
  if (e instanceof BspError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  }
  const authRes = authErrorResponse(e);
  if (authRes) return authRes;
  const err = e as { message?: string; code?: string; status?: number };
  return NextResponse.json({ error: err.message ?? "Internal error", code: err.code }, { status: err.status ?? 500 });
}
