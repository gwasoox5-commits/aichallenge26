import type { KpiSnapshot } from "@/types/kpi";
import type {
  CompanyArchetype,
  CumulativeState,
} from "@/types/simulation";
import { COMPANY_TYPES } from "@/data/company-types";

export function classifyCompany(
  kpi: KpiSnapshot,
  cumulative: CumulativeState,
): CompanyArchetype {
  const { totalPoints } = cumulative;
  const techTotal = totalPoints.aiAutomation + totalPoints.rnd;

  if (
    techTotal >= 110 &&
    totalPoints.talent < 55 &&
    (kpi.profit < 68 || kpi.organizationCapability < 62)
  ) {
    return "techOverinvestment";
  }

  if (
    cumulative.aiMaturity >= 0.28 &&
    cumulative.esgReadiness >= 0.22 &&
    totalPoints.talent >= 55
  ) {
    return "futureTransitionLeader";
  }

  if (totalPoints.supplyChain >= 65 && totalPoints.talent >= 55) {
    return "riskDefense";
  }

  if (totalPoints.costReduction >= 95 && kpi.profit >= 70) {
    return "shortTermFocus";
  }

  return "balancedGrowth";
}

export function getCompanyTypeDefinition(archetype: CompanyArchetype) {
  return COMPANY_TYPES.find((t) => t.id === archetype)!;
}
