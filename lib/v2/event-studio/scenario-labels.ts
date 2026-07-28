import type { ScenarioKey } from "./types";

export const SCENARIO_LABEL_KO: Record<ScenarioKey, string> = {
  pessimistic: "비관적",
  neutral: "중립적",
  optimistic: "낙관적",
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
