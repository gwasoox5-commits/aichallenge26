import { analyzeNewsArticles } from "@/lib/v2/intelligence/openai-analyzer";
import { generateIntelligenceScenarios } from "@/lib/v2/intelligence/scenario-generator";
import { generateConsultantBriefing } from "@/lib/v2/intelligence/consultant-generator";
import { integrationJson } from "@/lib/integrations/api-guard";
import type { NewsAnalysis, NewsArticle } from "@/lib/v2/intelligence/types";

export async function POST(req: Request) {
  return integrationJson(req, async (ctx) => {
    const body = (await req.json()) as {
      step?: "analyze" | "scenarios" | "consultant" | "full";
      articles?: NewsArticle[];
      analysis?: NewsAnalysis;
      scenarios?: Awaited<ReturnType<typeof generateIntelligenceScenarios>>["scenarios"];
      promptVersion?: string;
      sessionId?: string;
      idempotencyKey?: string;
    };

    const opts = {
      sessionId: body.sessionId,
      userRole: ctx.role,
      idempotencyKey: body.idempotencyKey ?? ctx.correlationId,
    };

    if (body.step === "analyze" || body.step === "full") {
      if (!body.articles?.length) return { error: "articles required" };
      const analyzed = await analyzeNewsArticles(body.articles, body.promptVersion, opts);
      if (body.step === "analyze") return analyzed;
      const scenarios = await generateIntelligenceScenarios(analyzed.analysis, body.promptVersion, opts);
      const consultant = await generateConsultantBriefing(analyzed.analysis, scenarios.scenarios, body.promptVersion, opts);
      return { ...analyzed, scenarios: scenarios.scenarios, scenarioMeta: scenarios.meta, consultant: consultant.consultant, consultantMeta: consultant.meta };
    }

    if (body.step === "scenarios" && body.analysis) {
      return generateIntelligenceScenarios(body.analysis, body.promptVersion, opts);
    }

    if (body.step === "consultant" && body.analysis && body.scenarios) {
      return generateConsultantBriefing(body.analysis, body.scenarios, body.promptVersion, opts);
    }

    return { error: "Invalid step or missing payload" };
  });
}
