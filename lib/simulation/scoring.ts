import { KPI_DEFINITIONS } from "@/data/kpis";
import type { KpiId, KpiSnapshot } from "@/types/kpi";

export type KpiInsight = {
  id: KpiId;
  label: string;
  score: number;
  insight: string;
};

const KPI_INSIGHTS: Record<
  KpiId,
  { strength: string; weakness: string }
> = {
  revenue: {
    strength: "시장·수출 대응력이 양호하여 매출 기반이 견고합니다.",
    weakness: "매출 성장 동력이 부족해 시장 점유 확대에 과제가 있습니다.",
  },
  profit: {
    strength: "원가·운영 효율화로 단기 수익성을 확보했습니다.",
    weakness: "영업이익이 압박받아 재투자 여력이 제한적입니다.",
  },
  productivity: {
    strength: "생산·공정 효율이 높아 실행력이 강점입니다.",
    weakness: "생산성 개선 속도가 느려 비용 경쟁에서 불리할 수 있습니다.",
  },
  carbonRisk: {
    strength: "탄소·규제 리스크 관리가 잘 되어 수출 안정성이 높습니다.",
    weakness: "탄소·ESG 리스크가 높아 규제·고객 대응에 취약합니다.",
  },
  supplyStability: {
    strength: "공급망 다변화·운영 안정성이 확보되어 납기 리스크가 낮습니다.",
    weakness: "공급망 취약성이 남아 외부 충격에 노출되어 있습니다.",
  },
  organizationCapability: {
    strength: "인재·조직 역량이 탄탄해 변화 실행력이 있습니다.",
    weakness: "조직 역량·현장 적응력이 부족해 전략 실행에 병목이 있습니다.",
  },
  futureCompetitiveness: {
    strength: "미래 기술·제품 경쟁력 축적이 진행되어 성장 잠재력이 큽니다.",
    weakness: "장기 경쟁력 투자가 부족해 산업 재편에서 뒤처질 수 있습니다.",
  },
};

function toNormalizedScore(id: KpiId, kpi: KpiSnapshot): number {
  return id === "carbonRisk" ? 100 - kpi.carbonRisk : kpi[id];
}

export function analyzeKpiProfile(kpi: KpiSnapshot): {
  strengths: KpiInsight[];
  weaknesses: KpiInsight[];
} {
  const ranked = KPI_DEFINITIONS.map((def) => ({
    id: def.id,
    label: def.label,
    score: toNormalizedScore(def.id, kpi),
  })).sort((a, b) => b.score - a.score);

  const strengths: KpiInsight[] = ranked.slice(0, 3).map((item) => ({
    ...item,
    insight: KPI_INSIGHTS[item.id].strength,
  }));

  const weaknesses: KpiInsight[] = ranked
    .slice(-3)
    .reverse()
    .map((item) => ({
      ...item,
      insight: KPI_INSIGHTS[item.id].weakness,
    }));

  return { strengths, weaknesses };
}

export function computeTotalScore(kpi: KpiSnapshot): number {
  const weights: Record<KpiId, number> = {
    revenue: 0.15,
    profit: 0.15,
    productivity: 0.12,
    carbonRisk: 0.12,
    supplyStability: 0.12,
    organizationCapability: 0.14,
    futureCompetitiveness: 0.2,
  };

  let score = 0;
  for (const def of KPI_DEFINITIONS) {
    score += toNormalizedScore(def.id, kpi) * weights[def.id];
  }
  return Math.round(score);
}
