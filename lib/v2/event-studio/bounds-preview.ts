import { applyEffects, cloneEconomy, validateBounds } from "@/src/bsp/domain/economy/economy-engine";
import { ECONOMY_BOUNDS } from "@/src/bsp/domain/economy/economy-variable-meta";
import type { EconomyPatchEffect } from "@/src/bsp/domain/events/event-types";
import type { EconomyValues } from "@/src/bsp/domain/types";
import { mapStudioEffectToEngine } from "./variable-mapper";
import type { BoundsClampWarning, ScenarioKey, StudioVariableEffect } from "./types";

export function mapScenarioEffects(
  effects: StudioVariableEffect[]
): { engineEffects: EconomyPatchEffect[]; boundsWarnings: BoundsClampWarning[] } {
  const engineEffects = effects.flatMap(mapStudioEffectToEngine);
  return { engineEffects, boundsWarnings: [] };
}

export function previewMappedEffects(
  baseEconomy: EconomyValues,
  engineEffects: EconomyPatchEffect[]
): { valuesAfter: EconomyValues; boundsWarnings: BoundsClampWarning[] } {
  const valuesBefore = cloneEconomy(baseEconomy);
  const warnings: BoundsClampWarning[] = [];

  let valuesAfter: EconomyValues;
  try {
    valuesAfter = applyEffects(valuesBefore, engineEffects);
    validateBounds(valuesAfter);
  } catch {
    valuesAfter = { ...valuesBefore };
    for (const effect of engineEffects) {
      const before = valuesAfter[effect.key];
      try {
        valuesAfter = applyEffects(valuesAfter, [effect]);
        validateBounds(valuesAfter);
      } catch {
        const b = ECONOMY_BOUNDS[effect.key];
        const clamped = Math.min(b.max, Math.max(b.min, before));
        warnings.push({
          engineKey: effect.key,
          proposedValue: before,
          clampedValue: clamped,
          min: b.min,
          max: b.max,
          reason: "Value exceeded economy bounds and was clamped for preview",
        });
        valuesAfter = { ...valuesAfter, [effect.key]: clamped };
      }
    }
  }

  for (const key of Object.keys(valuesAfter) as (keyof EconomyValues)[]) {
    const b = ECONOMY_BOUNDS[key];
    if (valuesAfter[key] < b.min || valuesAfter[key] > b.max) {
      const clamped = Math.min(b.max, Math.max(b.min, valuesAfter[key]));
      warnings.push({
        engineKey: key,
        proposedValue: valuesAfter[key],
        clampedValue: clamped,
        min: b.min,
        max: b.max,
        reason: "Post-apply value clamped to economy bounds",
      });
      valuesAfter[key] = clamped;
    }
  }

  return { valuesAfter, boundsWarnings: warnings };
}

export function buildOutcomesFromOutput(
  economyVariableChanges: Record<ScenarioKey, { effects: StudioVariableEffect[] }>,
  baseEconomy: EconomyValues
) {
  const keys: ScenarioKey[] = ["pessimistic", "neutral", "optimistic"];
  const outcomes: Record<
    ScenarioKey,
    { mappedEngineEffects: EconomyPatchEffect[]; boundsWarnings: BoundsClampWarning[] }
  > = {
    pessimistic: { mappedEngineEffects: [], boundsWarnings: [] },
    neutral: { mappedEngineEffects: [], boundsWarnings: [] },
    optimistic: { mappedEngineEffects: [], boundsWarnings: [] },
  };

  for (const key of keys) {
    const { engineEffects } = mapScenarioEffects(economyVariableChanges[key].effects);
    const preview = previewMappedEffects(baseEconomy, engineEffects);
    outcomes[key] = { mappedEngineEffects: engineEffects, boundsWarnings: preview.boundsWarnings };
  }

  return outcomes;
}
