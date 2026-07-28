import type { EconomyValues } from "../types";
import { DEFAULT_ECONOMY_VALUES } from "../types";
import { ECONOMY_BOUNDS, ECONOMY_VARIABLE_LABELS, isEconomyKey } from "./economy-variable-meta";
import type { EconomyPatchEffect } from "../events/event-types";

export class EconomyEngineError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "EconomyEngineError";
  }
}

export function applyEffect(values: EconomyValues, effect: EconomyPatchEffect): EconomyValues {
  if (!isEconomyKey(effect.key)) {
    throw new EconomyEngineError("ERR_ECONOMY_INVALID_KEY", `Unknown economy key: ${effect.key}`);
  }
  const key = effect.key;
  const current = values[key];
  let next: number;
  switch (effect.mode) {
    case "ABSOLUTE":
      next = effect.value;
      break;
    case "DELTA":
      next = current + effect.value;
      break;
    case "PERCENT":
      next = current * (1 + effect.value / 100);
      break;
    case "MULTIPLY":
      next = current * effect.value;
      break;
    default:
      throw new EconomyEngineError("ERR_ECONOMY_INVALID_MODE", `Unknown effect mode: ${effect.mode}`);
  }
  return { ...values, [key]: roundEconomyValue(key, next) };
}

export function applyEffects(values: EconomyValues, effects: EconomyPatchEffect[]): EconomyValues {
  return effects.reduce((acc, effect) => applyEffect(acc, effect), { ...values });
}

export function validateBounds(values: EconomyValues): void {
  for (const key of Object.keys(values) as (keyof EconomyValues)[]) {
    const bounds = ECONOMY_BOUNDS[key];
    const val = values[key];
    if (val < bounds.min || val > bounds.max) {
      throw new EconomyEngineError("ERR_ECONOMY_OUT_OF_BOUNDS", `${ECONOMY_VARIABLE_LABELS[key]} out of bounds`, {
        key,
        value: val,
        min: bounds.min,
        max: bounds.max,
      });
    }
  }
}

export function computeChanges(
  before: EconomyValues,
  after: EconomyValues
): Array<{ key: keyof EconomyValues; before: number; after: number; label: string }> {
  const changes: Array<{ key: keyof EconomyValues; before: number; after: number; label: string }> = [];
  for (const key of Object.keys(before) as (keyof EconomyValues)[]) {
    if (before[key] !== after[key]) {
      changes.push({
        key,
        before: before[key],
        after: after[key],
        label: ECONOMY_VARIABLE_LABELS[key],
      });
    }
  }
  return changes;
}

export function describeImpact(effects: EconomyPatchEffect[]): string {
  return effects
    .map((e) => {
      const label = isEconomyKey(e.key) ? ECONOMY_VARIABLE_LABELS[e.key] : e.key;
      switch (e.mode) {
        case "ABSOLUTE":
          return `${label} → ${e.value}`;
        case "DELTA":
          return `${label} ${e.value >= 0 ? "+" : ""}${e.value}`;
        case "PERCENT":
          return `${label} ${e.value >= 0 ? "+" : ""}${e.value}%`;
        case "MULTIPLY":
          return `${label} ×${e.value}`;
        default:
          return `${label} 변경`;
      }
    })
    .join(" · ");
}

function roundEconomyValue(key: keyof EconomyValues, value: number): number {
  if (key === "logisticsCostMultiplier" || key === "payrollCostMultiplier") {
    return Math.round(value * 100) / 100;
  }
  if (key === "exchangeRate") return Math.round(value);
  return Math.round(value * 10) / 10;
}

export function cloneEconomy(values?: EconomyValues): EconomyValues {
  return { ...(values ?? DEFAULT_ECONOMY_VALUES) };
}
