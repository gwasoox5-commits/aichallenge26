import { ECONOMY_BOUNDS } from "@/src/bsp/domain/economy/economy-variable-meta";
import { DEFAULT_ECONOMY_VALUES } from "@/src/bsp/domain/types";
import type { EconomyPatchEffect } from "@/src/bsp/domain/events/event-types";
import {
  mapStudioEffectToEngine,
  STUDIO_TO_ENGINE_MAP,
} from "@/lib/v2/event-studio/variable-mapper";
import { previewMappedEffects } from "@/lib/v2/event-studio/bounds-preview";
import type { EffectMode, ScenarioKey, StudioVariableEffect, StudioVariableKey } from "@/lib/v2/event-studio/types";
import type { ConfidenceLevel, VariableImpactExplainability } from "./types";

/** Allowed AI proposal ranges per studio variable (mode-dependent value bands) */
export const STUDIO_VARIABLE_BOUNDS: Record<
  StudioVariableKey,
  { min: number; max: number; defaultMode: EffectMode }
> = {
  interestRate: { min: -3, max: 5, defaultMode: "DELTA" },
  exchangeRate: { min: -25, max: 25, defaultMode: "PERCENT" },
  rawMaterialCost: { min: -30, max: 40, defaultMode: "PERCENT" },
  logisticsCost: { min: 0.7, max: 1.5, defaultMode: "MULTIPLY" },
  tariff: { min: -10, max: 40, defaultMode: "DELTA" },
  demand: { min: -35, max: 25, defaultMode: "PERCENT" },
  marketGrowth: { min: -25, max: 25, defaultMode: "PERCENT" },
  inflation: { min: -5, max: 25, defaultMode: "PERCENT" },
  competitionIntensity: { min: -30, max: 30, defaultMode: "PERCENT" },
  energyCost: { min: -15, max: 40, defaultMode: "PERCENT" },
  esgCost: { min: -15, max: 35, defaultMode: "PERCENT" },
  carbonTax: { min: -5, max: 40, defaultMode: "DELTA" },
  governmentSupport: { min: -25, max: 25, defaultMode: "PERCENT" },
  businessCycleIndex: { min: -25, max: 25, defaultMode: "PERCENT" },
};

export function clampStudioValue(key: StudioVariableKey, value: number): number {
  const b = STUDIO_VARIABLE_BOUNDS[key];
  return Math.min(b.max, Math.max(b.min, value));
}

export function lowAccuracyLabel(confidence: ConfidenceLevel): string | undefined {
  return confidence === "LOW" ? "추정 정확도가 낮음" : undefined;
}

export function toExplainability(
  effect: StudioVariableEffect & {
    confidence?: ConfidenceLevel;
    assumption?: string;
  }
): VariableImpactExplainability {
  const bounds = STUDIO_VARIABLE_BOUNDS[effect.key];
  const confidence = effect.confidence ?? (effect.isEstimate ? "LOW" : "MEDIUM");
  const clampedValue = clampStudioValue(effect.key, effect.value);
  return {
    key: effect.key,
    mode: effect.mode,
    proposedValue: effect.value,
    clampedValue,
    allowedMin: bounds.min,
    allowedMax: bounds.max,
    reason: effect.rationale,
    confidence,
    assumption: effect.assumption ?? effect.rationale,
    isEstimate: effect.isEstimate ?? confidence !== "HIGH",
    lowAccuracyWarning: lowAccuracyLabel(confidence),
  };
}

export function mapScenarioToEnginePreview(
  effects: StudioVariableEffect[],
  baseEconomy = DEFAULT_ECONOMY_VALUES
): {
  explainability: VariableImpactExplainability[];
  engineEffects: EconomyPatchEffect[];
  boundsWarnings: ReturnType<typeof previewMappedEffects>["boundsWarnings"];
} {
  const explainability = effects.map((e) => toExplainability(e));
  const clampedEffects: StudioVariableEffect[] = explainability.map((x) => ({
    key: x.key,
    mode: x.mode,
    value: x.clampedValue,
    unit: effects.find((e) => e.key === x.key)?.unit,
    rationale: x.reason,
    isEstimate: x.isEstimate,
  }));
  const engineEffects = clampedEffects.flatMap(mapStudioEffectToEngine);
  const preview = previewMappedEffects(baseEconomy, engineEffects);
  return { explainability, engineEffects, boundsWarnings: preview.boundsWarnings };
}

export function studioKeysForEngine(engineKey: keyof typeof ECONOMY_BOUNDS): StudioVariableKey[] {
  return (Object.keys(STUDIO_TO_ENGINE_MAP) as StudioVariableKey[]).filter((k) =>
    STUDIO_TO_ENGINE_MAP[k].some((t) => t.engineKey === engineKey)
  );
}

export function buildEconomyPreviewTable(scenarioKey: ScenarioKey, effects: StudioVariableEffect[]) {
  const mapped = mapScenarioToEnginePreview(effects);
  return { scenarioKey, ...mapped };
}
