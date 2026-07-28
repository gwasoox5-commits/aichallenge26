import { NextResponse } from "next/server";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { requireAuth, authErrorResponse } from "@/src/bsp/infrastructure/auth/api-guard";
import { listEventCategories } from "@/src/bsp/domain/events/event-catalog";

export async function GET(req: Request) {
  try {
    requireAuth(req, { roles: ["GM", "PLATFORM_ADMIN"] });
    const url = new URL(req.url);
    const search = url.searchParams.get("search") ?? undefined;
    const category = url.searchParams.get("category") ?? undefined;
    const catalog = getGameEngine().listEventCatalog({ search, category });
    return NextResponse.json({ catalog, categories: listEventCategories() });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    const err = e as { message?: string };
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
