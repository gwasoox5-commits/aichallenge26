import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { requireGmSession } from "@/src/bsp/infrastructure/auth/access-control";
import { authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import type { GmActor } from "@/src/bsp/domain/gm/audit-types";

export type GmRouteParams = { params: Promise<{ sessionId: string }> };

export function toGmActor(
  ctx: { userId: string; role: GmActor["role"] },
  reason?: string
): GmActor {
  return { userId: ctx.userId, role: ctx.role, reason };
}

export async function gmMutation(
  req: Request,
  { params }: GmRouteParams,
  handler: (sessionId: string, actor: GmActor, body: Record<string, unknown>) => Promise<unknown>
) {
  try {
    const { sessionId } = await params;
    const ctx = requireGmSession(req, sessionId);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const reason = typeof body.reason === "string" ? body.reason : undefined;
    const result = await handler(sessionId, toGmActor(ctx, reason), body);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { status?: number; message?: string; code?: string };
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status ?? 500 });
  }
}

export async function gmMutationSimple(
  req: Request,
  { params }: GmRouteParams,
  handler: (sessionId: string, actor: GmActor) => Promise<unknown>
) {
  return gmMutation(req, { params }, (sessionId, actor) => handler(sessionId, actor));
}

export async function gmGet(
  req: Request,
  { params }: GmRouteParams,
  handler: (sessionId: string) => Promise<unknown>
) {
  try {
    const { sessionId } = await params;
    requireGmSession(req, sessionId);
    const result = await handler(sessionId);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { status?: number; message?: string; code?: string };
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status ?? 500 });
  }
}
