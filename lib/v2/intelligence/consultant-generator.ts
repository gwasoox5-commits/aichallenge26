import type { ConsultantOutput, IntelligenceScenario, NewsAnalysis, PromptVersion } from "./types";
import { resolvePromptVersion } from "./prompt-registry";
import consultantFixture from "@/tests/fixtures/v2/consultant-output.fixture.json";
import consultantSchema from "@/docs/integrations/schemas/consultant-output.schema.json";
import { getOpenAiConfig } from "@/lib/integrations/config";
import { callOpenAiStructured } from "@/lib/integrations/openai-client";
import { IntegrationError } from "@/lib/integrations/errors";
import { KOREAN_OUTPUT_INSTRUCTIONS } from "./korean-output";

export interface ConsultantMeta {
  model: string;
  responseId: string;
  requestId?: string;
  correlationId?: string;
  usedFixture: boolean;
  promptVersion: PromptVersion;
  latencyMs?: number;
  tokensUsed?: number;
  retryCount?: number;
  resultStatus: "success" | "fixture" | "fallback" | "failed";
}

export interface ConsultantResult {
  consultant: ConsultantOutput;
  meta: ConsultantMeta;
}

type LiveConsultantPayload = Omit<ConsultantOutput, "promptVersion" | "gmOnly"> & {
  consultantCommentary: string;
};

function fromFixture(promptVersion: PromptVersion): ConsultantResult {
  return {
    consultant: { ...(consultantFixture as ConsultantOutput), promptVersion, gmOnly: true },
    meta: {
      model: "fixture",
      responseId: "fixture-v2.3-consultant",
      usedFixture: true,
      promptVersion,
      resultStatus: "fixture",
    },
  };
}

function buildConsultantPrompt(
  analysis: NewsAnalysis,
  scenarios: IntelligenceScenario[],
  promptVersion: PromptVersion
): string {
  return [
    "Generate GM-only AI Management Consultant briefing for Korean instructors.",
    KOREAN_OUTPUT_INSTRUCTIONS,
    `Prompt version: ${promptVersion}`,
    `Summary: ${analysis.eventSummary}`,
    `Scenarios: ${scenarios.map((s) => s.label).join(", ")}`,
    "NOT for student view. Provide consultantCommentary and educationalCommentary separately.",
  ].join("\n");
}

export async function generateConsultantBriefing(
  analysis: NewsAnalysis,
  scenarios: IntelligenceScenario[],
  promptVersionInput?: string,
  opts?: { sessionId?: string; userRole?: string; idempotencyKey?: string }
): Promise<ConsultantResult> {
  const promptVersion = resolvePromptVersion(promptVersionInput ?? analysis.promptVersion);
  const cfg = getOpenAiConfig();

  if (!cfg.configured) {
    return fromFixture(promptVersion);
  }
  if (!cfg.enabled) throw new IntegrationError("PROVIDER_DISABLED");

  const { data, meta } = await callOpenAiStructured<LiveConsultantPayload>({
    feature: "intelligence_consultant",
    input: buildConsultantPrompt(analysis, scenarios, promptVersion),
    schema: consultantSchema as Record<string, unknown>,
    schemaName: "ConsultantOutput",
    promptVersion,
    sessionId: opts?.sessionId,
    userRole: opts?.userRole,
    idempotencyKey: opts?.idempotencyKey,
  });

  const { consultantCommentary, ...rest } = data;
  return {
    consultant: {
      ...rest,
      instructorComments: rest.instructorComments || consultantCommentary,
      promptVersion,
      gmOnly: true,
    },
    meta: {
      model: meta.model,
      responseId: meta.responseId,
      requestId: meta.requestId,
      correlationId: meta.correlationId,
      usedFixture: false,
      promptVersion,
      latencyMs: meta.latencyMs,
      tokensUsed: meta.totalTokens,
      retryCount: meta.retryCount,
      resultStatus: "success",
    },
  };
}
