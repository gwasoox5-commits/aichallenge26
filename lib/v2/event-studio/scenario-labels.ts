import type { EconomyPatchEffect } from "@/src/bsp/domain/events/event-types";
import type { NewsDisplayMode, ScenarioKey, SelectionMode } from "./types";
import { ECONOMY_VARIABLE_LABELS, isEconomyKey } from "@/src/bsp/domain/economy/economy-variable-meta";

export const SCENARIO_LABEL_KO: Record<ScenarioKey, string> = {
  pessimistic: "비관적",
  neutral: "중립적",
  optimistic: "낙관적",
};

export const SELECTION_MODE_LABEL_KO: Record<SelectionMode, string> = {
  MANUAL: "직접 선택",
  EQUAL_RANDOM: "균등 랜덤",
  WEIGHTED_RANDOM: "가중치 랜덤",
};

export const EFFECT_MODE_LABEL_KO: Record<EconomyPatchEffect["mode"], string> = {
  ABSOLUTE: "절대값",
  DELTA: "증감",
  PERCENT: "비율(%)",
  MULTIPLY: "배수",
};

export const DISPLAY_MODE_LABEL_KO: Record<NewsDisplayMode, string> = {
  HEADLINE_ONLY: "헤드라인만",
  DIRECTIONAL: "방향성 요약",
  DETAILED: "상세 기사",
};

export function economyVariableLabelKo(key: string): string {
  return isEconomyKey(key) ? ECONOMY_VARIABLE_LABELS[key] : key;
}

export function formatEffectValueKo(mode: EconomyPatchEffect["mode"], value: number): string {
  switch (mode) {
    case "ABSOLUTE":
      return String(value);
    case "DELTA":
      return value >= 0 ? `+${value}` : String(value);
    case "PERCENT":
      return `${value >= 0 ? "+" : ""}${value}%`;
    case "MULTIPLY":
      return `×${value}`;
    default:
      return String(value);
  }
}

/** Force Korean scenario card titles regardless of model output language. */
export function applyKoreanScenarioLabels<T extends { scenarios: Record<ScenarioKey, { label: string }> }>(
  output: T,
): T {
  const scenarios = { ...output.scenarios };
  for (const key of Object.keys(SCENARIO_LABEL_KO) as ScenarioKey[]) {
    scenarios[key] = { ...scenarios[key], label: SCENARIO_LABEL_KO[key] };
  }
  return { ...output, scenarios };
}
