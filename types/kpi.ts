export type KpiId =
  | "revenue"
  | "profit"
  | "productivity"
  | "carbonRisk"
  | "supplyStability"
  | "organizationCapability"
  | "futureCompetitiveness";

export type KpiSnapshot = Record<KpiId, number>;

export type KpiDelta = Record<KpiId, number>;

export const KPI_IDS: KpiId[] = [
  "revenue",
  "profit",
  "productivity",
  "carbonRisk",
  "supplyStability",
  "organizationCapability",
  "futureCompetitiveness",
];

export type KpiDefinition = {
  id: KpiId;
  label: string;
  /** true = lower is better (carbonRisk) */
  invertGood: boolean;
  unit: string;
};
