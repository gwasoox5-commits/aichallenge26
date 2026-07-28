export type StrategyId =
  | "aiAutomation"
  | "esg"
  | "supplyChain"
  | "talent"
  | "costReduction"
  | "rnd";

export type Allocation = Record<StrategyId, number>;

export const STRATEGY_IDS: StrategyId[] = [
  "aiAutomation",
  "esg",
  "supplyChain",
  "talent",
  "costReduction",
  "rnd",
];

export type StrategyDefinition = {
  id: StrategyId;
  label: string;
  /** 항목 옆 한 줄 설명 */
  shortDescription: string;
  description: string;
};
