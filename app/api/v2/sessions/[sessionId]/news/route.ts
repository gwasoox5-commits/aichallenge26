import { NextResponse } from "next/server";
import { requireAuth } from "@/src/bsp/infrastructure/auth/api-guard";
import { authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import { getV2ScenarioStudio } from "@/lib/v2/event-studio/v2-service";

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const auth = requireAuth(req, { sessionId, roles: ["GM", "CEO", "PLATFORM_ADMIN"] });
    const companyId = auth.role === "CEO" ? auth.companyId : undefined;
    const news = getV2ScenarioStudio().listSessionNews(sessionId, companyId);
    return NextResponse.json({ news, unreadCount: news.filter((n) => n.unread).length });
  } catch (e) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    return NextResponse.json({ error: "Failed to list news" }, { status: 500 });
  }
}
