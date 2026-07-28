import type { KpiDelta, KpiId, KpiSnapshot } from "@/types/kpi";
import { KPI_IDS } from "@/types/kpi";
import type { Allocation } from "@/types/strategy";
import { STRATEGY_IDS } from "@/types/strategy";
import { COST_OVERINVEST_THRESHOLD } from "./constants";

export function zeroDelta(): KpiDelta {
  return KPI_IDS.reduce(
    (acc, id) => {
      acc[id] = 0;
      return acc;
    },
    {} as KpiDelta,
  );
}

export function scaleDelta(
  base: Partial<KpiDelta>,
  factor: number,
): KpiDelta {
  const result = zeroDelta();
  for (const id of KPI_IDS) {
    if (base[id] !== undefined) {
      result[id] = base[id]! * factor;
    }
  }
  return result;
}

export function addDelta(
  a: KpiDelta,
  b: Partial<KpiDelta>,
): KpiDelta {
  const result = { ...a };
  for (const id of KPI_IDS) {
    if (b[id] !== undefined) {
      result[id] += b[id]!;
    }
  }
  return result;
}

export function addKpi(kpi: KpiSnapshot, delta: KpiDelta): KpiSnapshot {
  const result = { ...kpi };
  for (const id of KPI_IDS) {
    result[id] += delta[id];
  }
  return result;
}

export function clampKpi(kpi: KpiSnapshot): KpiSnapshot {
  const result = { ...kpi };
  for (const id of KPI_IDS) {
    result[id] = Math.max(0, Math.min(100, result[id]));
  }
  return result;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function sumAllocation(allocation: Allocation): number {
  return STRATEGY_IDS.reduce((sum, id) => sum + allocation[id], 0);
}

export function validateAllocation(allocation: Allocation): boolean {
  if (sumAllocation(allocation) !== 100) return false;
  return STRATEGY_IDS.every(
    (id) => allocation[id] >= 0 && allocation[id] <= 100,
  );
}

export function hasAnyNonZero(delta: Partial<KpiDelta>): boolean {
  return KPI_IDS.some((id) => delta[id] !== undefined && delta[id] !== 0);
}

export function matrixToDelta(
  matrix: Partial<Record<KpiId, number>>,
  points: number,
  multiplier: number,
): KpiDelta {
  const result = zeroDelta();
  for (const id of KPI_IDS) {
    if (matrix[id] !== undefined) {
      result[id] = matrix[id]! * points * multiplier;
    }
  }
  return result;
}
