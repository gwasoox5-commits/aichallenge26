import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { assertSessionAccess } from "@/src/bsp/infrastructure/auth/access-control";
import { requireAuth, authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import { AuthError, type AuthRole } from "@/src/bsp/domain/auth/types";
import type { GmAuditAction } from "@/src/bsp/domain/gm/audit-types";

export async function GET(req: Request) {
  try {
    const ctx = requireAuth(req, { roles: ["PLATFORM_ADMIN", "GM"] });
    const url = new URL(req.url);
    let sessionId = url.searchParams.get("sessionId") ?? undefined;
    if (ctx.role === "GM") {
      if (sessionId) {
        assertSessionAccess(ctx, sessionId);
      } else {
        sessionId = ctx.sessionId ?? undefined;
      }
      if (!sessionId) {
        throw new AuthError("ERR_FORBIDDEN", "GM session scope missing", 403);
      }
    }
    const action = (url.searchParams.get("action") as GmAuditAction | null) ?? undefined;
    const actorRole = (url.searchParams.get("actorRole") as AuthRole | null) ?? undefined;
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

    const result = await getGameEngine().searchAdminAudit({
      sessionId,
      action,
      actorRole,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { message?: string };
    return NextResponse.json({ error: err.message ?? "Failed" }, { status: 500 });
  }
}
