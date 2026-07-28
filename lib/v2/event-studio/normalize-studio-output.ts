import fixtureOutput from "@/tests/fixtures/v2/scenario-output.fixture.json";
import type {
  EventScenarioStudioOutput,
  ScenarioKey,
  ScenarioOutlook,
  StudioVariableEffect,
} from "./types";
import { isStudioVariableKey, STUDIO_TO_ENGINE_MAP } from "./variable-mapper";

const SCENARIO_KEYS: ScenarioKey[] = ["pessimistic", "neutral", "optimistic"];

const FIXTURE = fixtureOutput as EventScenarioStudioOutput;

const KEY_ALIASES: Record<string, keyof typeof STUDIO_TO_ENGINE_MAP> = {
  rawMaterial: "rawMaterialCost",
  rawMaterialPrice: "rawMaterialCost",
  raw_material_cost: "rawMaterialCost",
  materialCost: "rawMaterialCost",
  logistics: "logisticsCost",
  exchange: "exchangeRate",
  interest: "interestRate",
  marketDemand: "demand",
  supply: "competitionIntensity",
  esg: "esgCost",
};

const VALID_MODES = new Set<StudioVariableEffect["mode"]>(["ABSOLUTE", "DELTA", "PERCENT", "MULTIPLY"]);

function coerceStudioKey(raw: unknown): StudioVariableEffect["key"] | null {
  if (typeof raw !== "string") return null;
  if (isStudioVariableKey(raw)) return raw;
  const alias = KEY_ALIASES[raw] ?? KEY_ALIASES[raw.toLowerCase()];
  return alias && isStudioVariableKey(alias) ? alias : null;
}

/** Drop or remap AI effects with unknown keys so mapStudioEffectToEngine never crashes. */
export function sanitizeStudioEffects(raw: unknown): StudioVariableEffect[] {
  if (!Array.isArray(raw)) return [];
  const out: StudioVariableEffect[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const key = coerceStudioKey(record.key);
    const mode = record.mode;
    const value = record.value;
    if (!key || typeof mode !== "string" || !VALID_MODES.has(mode as StudioVariableEffect["mode"])) continue;
    if (typeof value !== "number" || Number.isNaN(value)) continue;
    out.push({
      key,
      mode: mode as StudioVariableEffect["mode"],
      value,
      unit: typeof record.unit === "string" ? record.unit : undefined,
      rationale: typeof record.rationale === "string" ? record.rationale : "AI 추정 효과",
      isEstimate: record.isEstimate === true,
    });
  }
  return out;
}

function mergeScenarioEffects(
  key: ScenarioKey,
  fromOutput?: Partial<EventScenarioStudioOutput>
): StudioVariableEffect[] {
  const fromChanges = sanitizeStudioEffects(fromOutput?.economyVariableChanges?.[key]?.effects);
  if (fromChanges.length > 0) return fromChanges;

  const scenario = fromOutput?.scenarios?.[key] as { effects?: unknown } | undefined;
  const fromScenario = sanitizeStudioEffects(scenario?.effects);
  if (fromScenario.length > 0) return fromScenario;

  return FIXTURE.economyVariableChanges[key].effects;
}

function mergeScenarioOutlook(key: ScenarioKey, fromOutput?: Partial<EventScenarioStudioOutput>): ScenarioOutlook {
  const base = FIXTURE.scenarios[key];
  const from = fromOutput?.scenarios?.[key];
  const questions = Array.isArray(from?.discussionQuestions)
    ? from.discussionQuestions.filter((q): q is string => typeof q === "string" && q.length > 0)
    : [];
  return {
    ...base,
    ...from,
    label: from?.label ?? base.label,
    narrative: from?.narrative ?? base.narrative,
    rationale: from?.rationale ?? base.rationale,
    discussionQuestions: questions.length > 0 ? questions : base.discussionQuestions,
    newsHeadline: from?.newsHeadline ?? base.newsHeadline,
    newsArticleBody: from?.newsArticleBody ?? base.newsArticleBody,
    severity: from?.severity ?? base.severity,
  };
}

/**
 * OpenAI structured output can omit or partially fill economyVariableChanges (strict: false).
 * Merge with fixture defaults so generate/approve never crash on undefined.pessimistic.
 */
export function normalizeStudioOutput(
  output: Partial<EventScenarioStudioOutput>
): EventScenarioStudioOutput {
  const scenarios = {} as Record<ScenarioKey, ScenarioOutlook>;
  for (const key of SCENARIO_KEYS) {
    scenarios[key] = mergeScenarioOutlook(key, output);
  }

  const economyVariableChanges = { ...FIXTURE.economyVariableChanges };
  for (const key of SCENARIO_KEYS) {
    economyVariableChanges[key] = { effects: mergeScenarioEffects(key, output) };
  }

  const impactPathways = Array.isArray(output.impactPathways)
    ? output.impactPathways
        .filter((p) => p && typeof p.path === "string")
        .map((p) => ({
          path: p.path,
          affectedSteps: Array.isArray(p.affectedSteps)
            ? p.affectedSteps.filter((s): s is string => typeof s === "string")
            : [],
        }))
    : FIXTURE.impactPathways;

  return {
    meta: { ...FIXTURE.meta, ...output.meta },
    assumptions: output.assumptions?.length ? output.assumptions : FIXTURE.assumptions,
    impactPathways: impactPathways.length > 0 ? impactPathways : FIXTURE.impactPathways,
    scenarios,
    uncertainty: {
      ...FIXTURE.uncertainty,
      ...output.uncertainty,
      caveats: output.uncertainty?.caveats?.length
        ? output.uncertainty.caveats
        : FIXTURE.uncertainty.caveats,
    },
    economyVariableChanges,
  };
}
