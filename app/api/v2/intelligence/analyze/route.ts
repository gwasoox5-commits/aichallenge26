import { v2GmJson } from "@/lib/v2/event-studio/api-route";
import { getIntelligenceService } from "@/lib/v2/intelligence/intelligence-service";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    sessionId?: string;
    articleIds?: string[];
    promptVersion?: string;
  };
  if (!body.sessionId || !body.articleIds?.length) {
    return Response.json(
      { error: "sessionId and articleIds required", code: "ERR_INTEL_INPUT" },
      { status: 400 }
    );
  }
  return v2GmJson(req, body.sessionId, async (actor) => {
    const svc = getIntelligenceService();
    const articles = svc.resolveArticles({
      sessionId: body.sessionId!,
      articleIds: body.articleIds!,
    });
    const preview = await svc.createPreviewFromArticles(body.sessionId!, articles, actor);
    const analyzed = await svc.analyzePreview(preview.previewId, body.promptVersion);
    return { previewId: analyzed.previewId, analysis: analyzed.analysis, status: analyzed.status };
  });
}
