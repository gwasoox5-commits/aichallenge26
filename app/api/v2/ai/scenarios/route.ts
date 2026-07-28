import { generateIntelligenceScenarios } from "@/lib/v2/intelligence/scenario-generator";
import { integrationJson } from "@/lib/integrations/api-guard";
import type { NewsAnalysis } from "@/lib/v2/intelligence/types";

export async function POST(req: Request) {
  return integrationJson(req, async (ctx) => {
    const body = (await req.json()) as {
      analysis: NewsAnalysis;
      promptVersion?: string;
      sessionId?: string;
      idempotencyKey?: string;
    };
    if (!body.analysis) return { error: "analysis required" };
    return generateIntelligenceScenarios(body.analysis, body.promptVersion, {
      sessionId: body.sessionId,
      userRole: ctx.role,
      idempotencyKey: body.idempotencyKey ?? ctx.correlationId,
    });
  });
}
