import { createHash } from "crypto";
import type { EventScenarioStudioOutput, EventStudioInput } from "./types";
import fixtureOutput from "@/tests/fixtures/v2/scenario-output.fixture.json";
import studioSchemaDocument from "@/docs/v2/schemas/event-scenario-studio-output.schema.json";
import { getOpenAiConfig } from "@/lib/integrations/config";
import { IntegrationError } from "@/lib/integrations/errors";
import { isFixtureFallbackAllowed } from "@/lib/bsp/runtime-config";

export interface GenerateMeta {
  model: string;
  responseId: string;
  tokensUsed: number;
  latencyMs: number;
  usedFixture: boolean;
}

export interface GenerateResult {
  studioOutput: EventScenarioStudioOutput;
  meta: GenerateMeta;
}

function hashPrompt(input: EventStudioInput): string {
  const payload = JSON.stringify(input);
  return `sha256:${createHash("sha256").update(payload).digest("hex").slice(0, 16)}`;
}

function enrichOutput(output: EventScenarioStudioOutput, input: EventStudioInput): EventScenarioStudioOutput {
  return {
    ...output,
    meta: {
      ...output.meta,
      sourcePromptHash: output.meta.sourcePromptHash ?? hashPrompt(input),
      targetIndustry: input.targetIndustry,
      targetMarketOrRegion: input.targetMarketOrRegion,
      expectedDuration: input.expectedDuration,
      targetPeriodLabel: input.targetHalfLabel,
      analysisIntensity: input.analysisIntensity,
    },
  };
}

/** Strip JSON Schema meta keys OpenAI rejects in json_schema strict mode */
function getStudioOutputSchemaForOpenAi(): Record<string, unknown> {
  const doc = studioSchemaDocument as Record<string, unknown>;
  const { $schema, $id, title, description, ...schema } = doc;
  return schema;
}

function buildInputAwareFixture(input: EventStudioInput): EventScenarioStudioOutput {
  const base = fixtureOutput as EventScenarioStudioOutput;
  const prompt = input.naturalLanguagePrompt.trim();
  const title = prompt.length > 72 ? `${prompt.slice(0, 69)}…` : prompt;
  const ctx = `${input.targetIndustry} · ${input.targetMarketOrRegion}`;

  return {
    ...base,
    meta: {
      ...base.meta,
      title,
      summary: `「${prompt}」 — ${ctx} 맥락의 교육용 what-if 시나리오 (${input.expectedDuration}).`,
      targetIndustry: input.targetIndustry,
      targetMarketOrRegion: input.targetMarketOrRegion,
      expectedDuration: input.expectedDuration,
      targetPeriodLabel: input.targetHalfLabel,
      analysisIntensity: input.analysisIntensity,
      isEstimate: true,
    },
    assumptions: [
      `입력 이벤트: ${prompt}`,
      `${input.expectedDuration} 동안 ${input.targetMarketOrRegion} 시장에 영향이 전개된다고 가정`,
      `${input.targetIndustry} 산업의 구조·규제 환경은 현 수준을 유지한다고 가정`,
    ],
    scenarios: {
      pessimistic: {
        ...base.scenarios.pessimistic,
        narrative: `${prompt} 상황이 악화되면 ${input.targetIndustry}는 수요 급감·원가 상승·규제 리스크를 동시에 직면할 수 있습니다.`,
        newsHeadline: `[속보] ${title} — ${input.targetIndustry} 업계 전망 악화`,
        newsArticleBody: `${input.targetMarketOrRegion}에서 ${prompt}와 관련해 업계는 수출·구매·생산 전반에 걸친 압력을 우려하고 있습니다.`,
      },
      neutral: {
        ...base.scenarios.neutral,
        narrative: `${prompt}의 영향은 점진적으로 나타나며, ${input.targetIndustry}는 가격·mix·비용 구조를 조정하는 baseline 시나리오입니다.`,
        newsHeadline: `${title}, ${input.targetIndustry} 시장 영향은 점진적 전망`,
        newsArticleBody: `${input.targetMarketOrRegion}에서 ${prompt}에 대한 대응이 단계적으로 논의되며, 업계 영향은 제한적일 수 있습니다.`,
      },
      optimistic: {
        ...base.scenarios.optimistic,
        narrative: `${prompt} 리스크가 관리되면 ${input.targetIndustry}는 고부가·친환경 라인 중심으로 수요를 방어할 수 있습니다.`,
        newsHeadline: `${title} 관련 불확실성 완화, ${input.targetIndustry} 점진 회복`,
        newsArticleBody: `${input.targetMarketOrRegion}에서 ${prompt}와 관련한 정책·시장 조율이 진전되면 업계는 구조조정 기회를 모색할 수 있습니다.`,
      },
    },
    uncertainty: {
      ...base.uncertainty,
      caveats: [
        "OpenAI Live 미사용 — 입력 프롬프트 기반 교육용 샘플 (실시간 AI 분석 아님)",
        ...base.uncertainty.caveats.slice(1),
      ],
    },
  };
}

function fixtureResult(input: EventStudioInput, started: number): GenerateResult {
  return {
    studioOutput: enrichOutput(buildInputAwareFixture(input), input),
    meta: {
      model: "fixture",
      responseId: "fixture-v2-scenario",
      tokensUsed: 0,
      latencyMs: Date.now() - started,
      usedFixture: true,
    },
  };
}

function parseOpenAiErrorMessage(status: number, bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as { error?: { message?: string } };
    if (parsed.error?.message) return `OpenAI 오류 (${status}): ${parsed.error.message}`;
  } catch {
    /* ignore */
  }
  return `OpenAI 오류 (${status}). API Key·모델(${getOpenAiConfig().model})·스키마 설정을 확인하세요.`;
}

/** OpenAI Structured Outputs — falls back to fixture when API key is unset or live call fails in dev */
export async function generateScenarioOutput(input: EventStudioInput): Promise<GenerateResult> {
  const started = Date.now();
  const cfg = getOpenAiConfig();

  if (!cfg.configured || !cfg.enabled) {
    if (!isFixtureFallbackAllowed()) {
      throw new IntegrationError("API_KEY_MISSING", {
        message: "OpenAI API Key가 설정되지 않았습니다. Event Studio는 수동 입력으로 계속할 수 있습니다.",
      });
    }
    return fixtureResult(input, started);
  }

  const schema = getStudioOutputSchemaForOpenAi();

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        input: buildPrompt(input),
        text: {
          format: {
            type: "json_schema",
            name: "EventScenarioStudioOutput",
            schema,
            strict: false,
          },
        },
        max_output_tokens: cfg.studioMaxTokens,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (isFixtureFallbackAllowed()) {
        return fixtureResult(input, started);
      }
      throw new IntegrationError("INVALID_RESPONSE", {
        message: parseOpenAiErrorMessage(res.status, errText),
        status: res.status >= 400 && res.status < 500 ? 422 : 502,
      });
    }

    const body = (await res.json()) as {
      id: string;
      output?: Array<{ content?: Array<{ text?: string }> }>;
      usage?: { total_tokens?: number };
    };
    const text = body.output?.[0]?.content?.[0]?.text;
    if (!text) {
      if (isFixtureFallbackAllowed()) return fixtureResult(input, started);
      throw new IntegrationError("INVALID_RESPONSE", {
        message: "OpenAI가 빈 응답을 반환했습니다. 다시 시도하세요.",
      });
    }

    const parsed = JSON.parse(text) as EventScenarioStudioOutput;
    return {
      studioOutput: enrichOutput(parsed, input),
      meta: {
        model: cfg.model,
        responseId: body.id,
        tokensUsed: body.usage?.total_tokens ?? 0,
        latencyMs: Date.now() - started,
        usedFixture: false,
      },
    };
  } catch (e) {
    if (e instanceof IntegrationError) throw e;
    if (isFixtureFallbackAllowed()) return fixtureResult(input, started);
    throw new IntegrationError("NETWORK_ERROR", {
      message: e instanceof Error ? e.message : "OpenAI request failed",
    });
  }
}

function buildPrompt(input: EventStudioInput): string {
  return [
    "You are an educational business simulation scenario analyst.",
    "Generate pessimistic, neutral, and optimistic outlooks with economy variable effects.",
    "Do NOT include probability percentages. Effects must use allowed studio variable keys only.",
    "Each scenario must include newsHeadline, newsArticleBody, and severity (LOW|MEDIUM|HIGH|CRITICAL).",
    "",
    `Event description: ${input.naturalLanguagePrompt}`,
    `Industry: ${input.targetIndustry}`,
    `Market/Region: ${input.targetMarketOrRegion}`,
    `Duration: ${input.expectedDuration}`,
    `Target period: ${input.targetHalfLabel}`,
    `Analysis intensity: ${input.analysisIntensity}`,
  ].join("\n");
}
