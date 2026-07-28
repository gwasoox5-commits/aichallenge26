import type { ScenarioKey, SelectionMode } from "./types";

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
