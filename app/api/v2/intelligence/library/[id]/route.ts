import { v2GmJson, v2GmGet } from "@/lib/v2/event-studio/api-route";
import { getIntelligenceLibraryStore } from "@/lib/v2/intelligence/library-store";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "sessionId required", code: "ERR_INTEL_INPUT" }, { status: 400 });
  }
  return v2GmGet(req, sessionId, async () => {
    const entry = getIntelligenceLibraryStore().getEntry(id);
    if (!entry) {
      throw Object.assign(new Error("Not found"), { code: "ERR_INTEL_LIBRARY", status: 404 });
    }
    return { entry };
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { sessionId?: string };
  if (!body.sessionId) {
    return Response.json({ error: "sessionId required", code: "ERR_INTEL_INPUT" }, { status: 400 });
  }
  return v2GmJson(req, body.sessionId, async () => {
    const ok = getIntelligenceLibraryStore().deleteEntry(id);
    return { deleted: ok };
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { sessionId?: string; favorite?: boolean; action?: string };
  if (!body.sessionId) {
    return Response.json({ error: "sessionId required", code: "ERR_INTEL_INPUT" }, { status: 400 });
  }
  return v2GmJson(req, body.sessionId, async () => {
    const store = getIntelligenceLibraryStore();
    if (body.action === "duplicate") {
      const copy = store.duplicate(id);
      if (!copy) throw Object.assign(new Error("Not found"), { code: "ERR_INTEL_LIBRARY", status: 404 });
      return { entry: copy };
    }
    if (typeof body.favorite === "boolean") {
      const entry = store.setFavorite(id, body.favorite);
      if (!entry) throw Object.assign(new Error("Not found"), { code: "ERR_INTEL_LIBRARY", status: 404 });
      return { entry };
    }
    throw Object.assign(new Error("Invalid patch"), { code: "ERR_INTEL_INPUT", status: 400 });
  });
}
