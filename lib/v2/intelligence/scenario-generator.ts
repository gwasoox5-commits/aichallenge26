import type { ScenarioKey, StudioVariableEffect } from "@/lib/v2/event-studio/types";
import type { IntelligenceScenario, NewsAnalysis, PromptVersion } from "./types";
import { toExplainability } from "./economy-mapper";
import { resolvePromptVersion } from "./prompt-registry";
import scenariosFixture from "@/tests/fixtures/v2/intelligence-scenarios.fixture.json";
import scenariosSchema from "@/docs/integrations/schemas/intelligence-scenarios.schema.json";
import { getOpenAiConfig } from "@/lib/integrations/config";
import { callOpenAiStructured } from "@/lib/integrations/openai-client";
import { IntegrationError } from "@/lib/integrations/errors";

export interface ScenarioGenMeta {
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
  qualityScore?: number;
  confidence?: string;
}

export interface ScenarioGenResult {
  scenarios: IntelligenceScenario[];
  meta: ScenarioGenMeta;
}

type FixtureScenario = {
  label: string;
  description: string;
  assumptions: string[];
  expectedOutcomes: string[];
  effects: Array<
    StudioVariableEffect & {
      confidence?: "LOW" | "MEDIUM" | "HIGH";
      assumption?: string;
      evidenceType?: string;
      sourceIds?: string[];
    }
  >;
};

type LiveScenarioPayload = {
  scenarios: Record<ScenarioKey, FixtureScenario>;
  qualityScore: number;
  confidence: string;
  assumptions?: string[];
};

function fromFixture(promptVersion: PromptVersion): IntelligenceScenario[] {
  const data = scenariosFixture as { scenarios: Record<ScenarioKey, FixtureScenario> };
  const keys: ScenarioKey[] = ["pessimistic", "neutral", "optimistic"];
  return keys.map((key) => mapScenario(key, data.scenarios[key]));
}

function mapScenario(key: ScenarioKey, s: FixtureScenario): IntelligenceScenario {
  return {
    scenarioKey: key,
    label: s.label,
    description: s.description,
    assumptions: s.assumptions,
    variableImpacts: s.effects.map((e) =>
      toExplainability({
        ...e,
        rationale: (e as StudioVariableEffect & { rationale?: string }).rationale ?? e.key,
      })
    ),
    expectedOutcomes: s.expectedOutcomes,
  };
}

function mapLiveScenarios(data: LiveScenarioPayload, promptVersion: PromptVersion): IntelligenceScenario[] {
  const keys: ScenarioKey[] = ["pessimistic", "neutral", "optimistic"];
  return keys.map((key) => {
    const s = data.scenarios[key];
    return {
      scenarioKey: key,
      label: s.label,
      description: s.description,
      assumptions: s.assumptions,
      expectedOutcomes: s.expectedOutcomes,
      variableImpacts: s.effects.map((e) => {
        const exp = toExplainability({
          key: e.key,
          mode: e.mode,
          value: e.value,
          rationale: (e as { reason?: string; rationale?: string }).reason ?? (e as { rationale?: string }).rationale ?? String(e.key),
          isEstimate: e.isEstimate ?? true,
          confidence: e.confidence,
          assumption: e.assumption,
        });
        return {
          ...exp,
          evidenceType: e.evidenceType as IntelligenceScenario["variableImpacts"][0]["evidenceType"],
          sourceIds: e.sourceIds,
        };
      }),
    };
  });
}

function buildScenarioPrompt(analysis: NewsAnalysis, promptVersion: PromptVersion): string {
  return [
    "Generate pessimistic, neutral, optimistic scenarios for educational simulation.",
    `Prompt version: ${promptVersion}`,
    `Event summary: ${analysis.eventSummary}`,
    `Risks: ${analysis.riskFactors.join("; ")}`,
    `Content source for analysis: ${analysis.contentSource ?? "SEARCH_SNIPPET"}`,
    "Map impacts to studio economy variables. Include evidenceType, confidence, assumption per effect.",
    "Include qualityScore (0-100) and overall confidence.",
  ].join("\n");
}

export async function generateIntelligenceScenarios(
  analysis: NewsAnalysis,
  promptVersionInput?: string,
  opts?: { sessionId?: string; userRole?: string; idempotencyKey?: string }
): Promise<ScenarioGenResult> {
  const promptVersion = resolvePromptVersion(promptVersionInput ?? analysis.promptVersion);
  const cfg = getOpenAiConfig();

  if (!cfg.configured) {
    return {
      scenarios: fromFixture(promptVersion),
      meta: {
        model: "fixture",
        responseId: "fixture-v2.3-scenarios",
        usedFixture: true,
        promptVersion,
        resultStatus: "fixture",
      },
    };
  }
  if (!cfg.enabled) throw new IntegrationError("PROVIDER_DISABLED");

  const { data, meta } = await callOpenAiStructured<LiveScenarioPayload>({
    feature: "intelligence_scenarios",
    input: buildScenarioPrompt(analysis, promptVersion),
    schema: scenariosSchema as Record<string, unknown>,
    schemaName: "IntelligenceScenarios",
    promptVersion,
    sessionId: opts?.sessionId,
    userRole: opts?.userRole,
    idempotencyKey: opts?.idempotencyKey,
  });

  return {
    scenarios: mapLiveScenarios(data, promptVersion),
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
      qualityScore: data.qualityScore,
      confidence: data.confidence,
    },
  };
}
