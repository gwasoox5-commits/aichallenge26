import { searchNewsWithCache } from "@/lib/integrations/news/provider";
import { requireAuth, authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import { integrationErrorResponse } from "@/lib/integrations/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    requireAuth(req, { roles: ["GM", "PLATFORM_ADMIN"] });
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? url.searchParams.get("keywords") ?? "";
    const keywords = q.split(/[\s,]+/).filter(Boolean);
    const language = url.searchParams.get("language") ?? "ko";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10", 10), 25);
    const result = await searchNewsWithCache({ keywords: keywords.length ? keywords : ["economy"], language, limit });
    return NextResponse.json(result);
  } catch (e) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    return integrationErrorResponse(e);
  }
}
