import type { EconomyPatchEffect } from "@/src/bsp/domain/events/event-types";
import type { EconomyValues } from "@/src/bsp/domain/types";
import { ECONOMY_BOUNDS } from "@/src/bsp/domain/economy/economy-variable-meta";
import type { StudioVariableEffect, StudioVariableKey } from "./types";

/**
 * Maps Studio-facing variable keys → P4 EconomyValues keys.
 * AI outputs studio keys only; validator maps before Event Engine.
 */
export const STUDIO_TO_ENGINE_MAP: Record<
  StudioVariableKey,
  Array<{ engineKey: keyof EconomyValues; modeHint?: "same" | "split_loan_deposit" }>
> = {
  interestRate: [{ engineKey: "interestRateLoan", modeHint: "same" }, { engineKey: "interestRateDeposit" }],
  exchangeRate: [{ engineKey: "exchangeRate" }],
  rawMaterialCost: [{ engineKey: "rawMaterialIndex" }],
  logisticsCost: [{ engineKey: "logisticsCostMultiplier" }],
  tariff: [{ engineKey: "tariffRate" }],
  demand: [{ engineKey: "marketDemandIndex" }],
  marketGrowth: [{ engineKey: "marketDemandIndex" }, { engineKey: "businessCycleIndex" }],
  inflation: [{ engineKey: "rawMaterialIndex" }, { engineKey: "payrollCostMultiplier" }],
  competitionIntensity: [{ engineKey: "marketSupplyIndex" }],
  energyCost: [{ engineKey: "logisticsCostMultiplier" }, { engineKey: "rawMaterialIndex" }],
  esgCost: [{ engineKey: "esgPressureIndex" }],
  carbonTax: [{ engineKey: "carbonTaxRatePerUnit" }],
  governmentSupport: [{ engineKey: "businessCycleIndex" }],
  businessCycleIndex: [{ engineKey: "businessCycleIndex" }],
};

export function mapStudioEffectToEngine(
  effect: StudioVariableEffect,
  splitFactor = 0.5
): EconomyPatchEffect[] {
  const targets = STUDIO_TO_ENGINE_MAP[effect.key];
  return targets.map((t, i) => {
    let value = effect.value;
    if (effect.key === "interestRate" && t.engineKey === "interestRateDeposit") {
      value = effect.mode === "DELTA" ? effect.value * splitFactor : effect.value * 0.5;
    }
    if (effect.key === "marketGrowth" && i === 1) {
      value = effect.value * 0.5;
    }
    if (effect.key === "inflation" && t.engineKey === "payrollCostMultiplier") {
      value = effect.mode === "PERCENT" ? effect.value * 0.3 : effect.value;
    }
    return { key: t.engineKey, mode: effect.mode, value, unit: effect.unit };
  });
}

export function clampToBounds(values: EconomyValues): EconomyValues {
  const next = { ...values };
  for (const key of Object.keys(next) as (keyof EconomyValues)[]) {
    const b = ECONOMY_BOUNDS[key];
    next[key] = Math.min(b.max, Math.max(b.min, next[key]));
  }
  return next;
}
