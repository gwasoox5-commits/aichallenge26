import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAuth, authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import { integrationErrorResponse } from "./errors";

export async function integrationJson(
  req: Request,
  handler: (ctx: { userId: string; role: string; correlationId: string }) => Promise<unknown>,
  opts?: { roles?: Array<"GM" | "PLATFORM_ADMIN" | "CEO"> }
) {
  const correlationId = req.headers.get("x-correlation-id") ?? randomUUID();
  try {
    const ctx = requireAuth(req, { roles: opts?.roles ?? ["GM", "PLATFORM_ADMIN"] });
    const result = await handler({ userId: ctx.userId, role: ctx.role, correlationId });
    return NextResponse.json(result, { headers: { "x-correlation-id": correlationId } });
  } catch (e) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    return integrationErrorResponse(e);
  }
}
