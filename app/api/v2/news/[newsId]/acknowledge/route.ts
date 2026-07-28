import { NextResponse } from "next/server";
import { requireAuth } from "@/src/bsp/infrastructure/auth/api-guard";
import { authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import { getV2ScenarioStudio } from "@/lib/v2/event-studio/v2-service";
import { getDraftStore } from "@/lib/v2/event-studio/draft-store";
import { BspError } from "@/src/bsp/application/game-engine";

export async function POST(req: Request, ctx: { params: Promise<{ newsId: string }> }) {
  try {
    const { newsId } = await ctx.params;
    const news = getDraftStore().getNews(newsId);
    if (!news) {
      return NextResponse.json({ error: "News not found", code: "ERR_NOT_FOUND" }, { status: 404 });
    }

    const auth = requireAuth(req, { sessionId: news.sessionId, roles: ["CEO", "PLATFORM_ADMIN"] });
    if (auth.role === "CEO" && !auth.companyId) {
      return NextResponse.json({ error: "Company scope required", code: "ERR_FORBIDDEN" }, { status: 403 });
    }

    const ack = getV2ScenarioStudio().acknowledgeNews(
      newsId,
      news.sessionId,
      auth.companyId ?? "admin",
      auth.userId
    );
    return NextResponse.json({ acknowledgement: ack });
  } catch (e) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    if (e instanceof BspError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    return NextResponse.json({ error: "Acknowledge failed" }, { status: 500 });
  }
}
