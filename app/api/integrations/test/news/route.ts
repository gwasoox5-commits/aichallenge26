import { searchNewsWithCache } from "@/lib/integrations/news/provider";
import { getNewsConfig } from "@/lib/integrations/config";
import { integrationJson } from "@/lib/integrations/api-guard";

export async function POST(req: Request) {
  return integrationJson(req, async () => {
    const body = (await req.json().catch(() => ({}))) as { keywords?: string[]; language?: string };
    const cfg = getNewsConfig();
    const result = await searchNewsWithCache({
      keywords: body.keywords ?? ["economy"],
      language: body.language ?? "ko",
      limit: 3,
    });
    return {
      provider: result.provider,
      configured: cfg.configured,
      liveEnabled: cfg.liveEnabled,
      usedFixture: result.usedFixture,
      degraded: result.degraded,
      cacheHit: result.cacheHit,
      articleCount: result.articles.length,
      articles: result.articles.map((a) => ({
        title: a.title,
        source: a.source,
        bodyStatus: a.bodyStatus,
        contentSource: a.contentSource,
      })),
    };
  });
}
