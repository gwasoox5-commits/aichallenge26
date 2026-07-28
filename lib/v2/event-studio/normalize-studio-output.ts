import fixtureOutput from "@/tests/fixtures/v2/scenario-output.fixture.json";
import type { EventScenarioStudioOutput, ScenarioKey, StudioVariableEffect } from "./types";

const SCENARIO_KEYS: ScenarioKey[] = ["pessimistic", "neutral", "optimistic"];

const FIXTURE = fixtureOutput as EventScenarioStudioOutput;

function mergeScenarioEffects(
  key: ScenarioKey,
  fromOutput?: Partial<EventScenarioStudioOutput>
): StudioVariableEffect[] {
  const fromChanges = fromOutput?.economyVariableChanges?.[key]?.effects;
  if (Array.isArray(fromChanges) && fromChanges.length > 0) return fromChanges;

  // Some models nest effects under scenarios instead of economyVariableChanges
  const scenario = fromOutput?.scenarios?.[key] as { effects?: StudioVariableEffect[] } | undefined;
  if (Array.isArray(scenario?.effects) && scenario.effects.length > 0) return scenario.effects;

  return FIXTURE.economyVariableChanges[key].effects;
}

/**
 * OpenAI structured output can omit or partially fill economyVariableChanges (strict: false).
 * Merge with fixture defaults so generate/approve never crash on undefined.pessimistic.
 */
export function normalizeStudioOutput(
  output: Partial<EventScenarioStudioOutput>
): EventScenarioStudioOutput {
  const scenarios = { ...FIXTURE.scenarios };
  for (const key of SCENARIO_KEYS) {
    scenarios[key] = { ...FIXTURE.scenarios[key], ...output.scenarios?.[key] };
  }

  const economyVariableChanges = { ...FIXTURE.economyVariableChanges };
  for (const key of SCENARIO_KEYS) {
    economyVariableChanges[key] = { effects: mergeScenarioEffects(key, output) };
  }

  return {
    meta: { ...FIXTURE.meta, ...output.meta },
    assumptions: output.assumptions?.length ? output.assumptions : FIXTURE.assumptions,
    impactPathways: output.impactPathways?.length ? output.impactPathways : FIXTURE.impactPathways,
    scenarios,
    uncertainty: { ...FIXTURE.uncertainty, ...output.uncertainty },
    economyVariableChanges,
  };
}
