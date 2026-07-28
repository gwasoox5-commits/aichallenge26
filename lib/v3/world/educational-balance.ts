/** V3.0 — Educational balance weighting */

import type { EducationalBalanceConfig, IndustryId, WorldEvolutionProposal } from "./types";
import { computeIndustryEventWeight } from "./regional-industry";

export const DEFAULT_EDUCATIONAL_BALANCE: EducationalBalanceConfig = {
  focusAreas: ["공급망", "재무"],
  supplyChainWeight: 0.35,
  financialWeight: 0.3,
  innovationWeight: 0.2,
  esgWeight: 0.15,
};

export function buildEducationalBalance(focusAreas: string[]): EducationalBalanceConfig {
  const config = { ...DEFAULT_EDUCATIONAL_BALANCE, focusAreas };
  if (focusAreas.includes("공급망")) config.supplyChainWeight += 0.15;
  if (focusAreas.includes("재무")) config.financialWeight += 0.15;
  if (focusAreas.includes("혁신")) config.innovationWeight += 0.15;
  if (focusAreas.includes("ESG")) config.esgWeight += 0.15;
  return normalizeBalance(config);
}

function normalizeBalance(c: EducationalBalanceConfig): EducationalBalanceConfig {
  const total = c.supplyChainWeight + c.financialWeight + c.innovationWeight + c.esgWeight;
  if (total <= 0) return DEFAULT_EDUCATIONAL_BALANCE;
  return {
    ...c,
    supplyChainWeight: c.supplyChainWeight / total,
    financialWeight: c.financialWeight / total,
    innovationWeight: c.innovationWeight / total,
    esgWeight: c.esgWeight / total,
  };
}

export function weightProposalByEducation(
  proposals: WorldEvolutionProposal[],
  balance: EducationalBalanceConfig,
  industryIds: IndustryId[]
): WorldEvolutionProposal[] {
  const focusIndustries = new Set(industryIds);
  return proposals.map((p) => {
    const hasSupply = p.title.includes("공급") || p.title.includes("물류") || p.title.includes("관세");
    const hasFinance = p.title.includes("금리") || p.title.includes("현금") || p.title.includes("수요");
    const hasInnovation = p.title.includes("AI") || p.title.includes("기술") || p.title.includes("혁신");
    const hasEsg = p.title.includes("ESG") || p.title.includes("탄소") || p.title.includes("친환경");

    let boost = 0;
    if (hasSupply) boost += balance.supplyChainWeight;
    if (hasFinance) boost += balance.financialWeight;
    if (hasInnovation) boost += balance.innovationWeight;
    if (hasEsg) boost += balance.esgWeight;

    const industryMatch = p.industryImpacts
      ? Object.keys(p.industryImpacts).some((id) => focusIndustries.has(id as IndustryId))
      : false;
    if (industryMatch) boost += 0.1;

    return { ...p, summary: boost > 0.4 ? `[교육 우선] ${p.summary}` : p.summary };
  });
}

export function educationalFocusLabel(balance: EducationalBalanceConfig): string {
  if (balance.focusAreas.length === 0) return "균형";
  return balance.focusAreas.join(" · ");
}
