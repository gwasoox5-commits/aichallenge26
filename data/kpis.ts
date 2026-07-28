import type { KpiDefinition } from "@/types/kpi";

export const KPI_DEFINITIONS: KpiDefinition[] = [
  { id: "revenue", label: "매출", invertGood: false, unit: "index" },
  { id: "profit", label: "영업이익", invertGood: false, unit: "index" },
  { id: "productivity", label: "생산성", invertGood: false, unit: "index" },
  {
    id: "carbonRisk",
    label: "탄소 리스크",
    invertGood: true,
    unit: "index",
  },
  {
    id: "supplyStability",
    label: "공급망 안정성",
    invertGood: false,
    unit: "index",
  },
  {
    id: "organizationCapability",
    label: "조직역량",
    invertGood: false,
    unit: "index",
  },
  {
    id: "futureCompetitiveness",
    label: "미래경쟁력",
    invertGood: false,
    unit: "index",
  },
];

export function getKpiLabel(id: string): string {
  return KPI_DEFINITIONS.find((k) => k.id === id)?.label ?? id;
}
