import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { requireAuth, authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";

export async function GET(req: Request) {
  try {
    requireAuth(req, { roles: ["PLATFORM_ADMIN"] });
    const url = new URL(req.url);
    const includeArchived = url.searchParams.get("includeArchived") === "1";
    const sessions = await getGameEngine().listAdminSessions(includeArchived);
    return NextResponse.json(
      sessions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        startedAt: s.startedAt?.toISOString(),
        archivedAt: s.archivedAt?.toISOString(),
      }))
    );
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { message?: string };
    return NextResponse.json({ error: err.message ?? "Failed" }, { status: 500 });
  }
}
