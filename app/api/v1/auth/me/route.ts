import { NextResponse } from "next/server";
import { extractBearerToken } from "@/src/bsp/infrastructure/auth/api-guard";
import { authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import { verifyToken } from "@/src/bsp/infrastructure/auth/token-service";

export async function GET(req: Request) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Authentication required", code: "ERR_UNAUTHORIZED" }, { status: 401 });
    }
    const ctx = verifyToken(token);
    return NextResponse.json({
      userId: ctx.userId,
      role: ctx.role,
      sessionId: ctx.sessionId,
      companyId: ctx.companyId,
      teamName: ctx.teamName,
    });
  } catch (e) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
}
