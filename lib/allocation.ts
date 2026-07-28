import type { Allocation, StrategyId } from "@/types/strategy";
import { STRATEGY_IDS } from "@/types/strategy";

export const BUDGET_TOTAL = 100;

export function sumAllocation(allocation: Allocation): number {
  return STRATEGY_IDS.reduce((sum, id) => sum + allocation[id], 0);
}

/** 다른 항목 합계를 제외한 이 전략에 배정 가능한 최대값 */
export function getMaxForStrategy(
  allocation: Allocation,
  id: StrategyId,
): number {
  const others = STRATEGY_IDS.reduce(
    (sum, key) => (key === id ? sum : sum + allocation[key]),
    0,
  );
  return Math.max(0, BUDGET_TOTAL - others);
}

/** 합계 100을 넘지 않도록 값을 제한 */
export function clampStrategyValue(
  allocation: Allocation,
  id: StrategyId,
  requested: number,
): number {
  const max = getMaxForStrategy(allocation, id);
  return Math.max(0, Math.min(max, Math.round(requested)));
}

export function isAllocationValid(allocation: Allocation): boolean {
  return (
    sumAllocation(allocation) === BUDGET_TOTAL &&
    STRATEGY_IDS.every((id) => allocation[id] >= 0)
  );
}

export function getRemainingBudget(allocation: Allocation): number {
  return BUDGET_TOTAL - sumAllocation(allocation);
}
