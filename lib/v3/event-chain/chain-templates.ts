/** V3.0 — Event chain templates */

import type { EventChainNodeV3, WorldEventChain } from "../world/types";

export interface ChainTemplateNode {
  label: string;
  description: string;
  triggerCondition: string;
  probability: number;
  economyEffects?: Array<{ key: string; mode: "DELTA" | "PERCENT"; value: number }>;
}

export interface ChainTemplate {
  id: string;
  label: string;
  description: string;
  nodes: ChainTemplateNode[];
}

export const CHAIN_TEMPLATES: ChainTemplate[] = [
  {
    id: "tariff-supply-cost",
    label: "관세 → 공급망 → 원가 → 가격 → 수요 → 현금 → 금리",
    description: "무역 분쟁에서 시작하는 연쇄 경제 충격",
    nodes: [
      { label: "관세 인상", description: "수입 관세 상승", triggerCondition: "half_end", probability: 1.0,
        economyEffects: [{ key: "tariffRate", mode: "PERCENT", value: 10 }] },
      { label: "공급망 차질", description: "부품 조달 지연", triggerCondition: "after_tariff", probability: 0.7,
        economyEffects: [{ key: "logisticsCostMultiplier", mode: "PERCENT", value: 15 }] },
      { label: "원가 상승", description: "생산 원가 증가", triggerCondition: "after_supply", probability: 0.6,
        economyEffects: [{ key: "rawMaterialIndex", mode: "PERCENT", value: 12 }] },
      { label: "가격 인상 압력", description: "판매가 조정 필요", triggerCondition: "after_cost", probability: 0.5,
        economyEffects: [{ key: "marketDemandIndex", mode: "PERCENT", value: -8 }] },
      { label: "수요 감소", description: "시장 수요 위축", triggerCondition: "after_price", probability: 0.4,
        economyEffects: [{ key: "marketDemandIndex", mode: "PERCENT", value: -10 }] },
      { label: "금리 상승", description: "금융 환경 악화", triggerCondition: "after_demand", probability: 0.3,
        economyEffects: [{ key: "interestRateLoan", mode: "PERCENT", value: 5 }] },
    ],
  },
  {
    id: "ai-boom-chain",
    label: "AI Boom → GPU 수요 → 반도체 부족 → 원가 상승 → 경쟁사 등장",
    description: "AI 붐에서 시작하는 기술·공급망 연쇄",
    nodes: [
      { label: "AI 수요 급증", description: "GPU/AI 칩 수요 폭증", triggerCondition: "half_end", probability: 1.0,
        economyEffects: [{ key: "techInnovationIndex", mode: "PERCENT", value: 15 }] },
      { label: "반도체 공급 부족", description: "파운드리 가동률 포화", triggerCondition: "after_ai_demand", probability: 0.75,
        economyEffects: [{ key: "rawMaterialIndex", mode: "PERCENT", value: 10 }] },
      { label: "원가 상승", description: "부품 가격 급등", triggerCondition: "after_semiconductor", probability: 0.65,
        economyEffects: [{ key: "rawMaterialIndex", mode: "PERCENT", value: 8 }] },
      { label: "신규 경쟁사 등장", description: "AI 스타트업 시장 진입", triggerCondition: "after_cost", probability: 0.45,
        economyEffects: [{ key: "marketSupplyIndex", mode: "PERCENT", value: 12 }] },
    ],
  },
  {
    id: "energy-crisis-chain",
    label: "에너지 가격 → 물류비 → 원가 → ESG 압력",
    description: "에너지 위기 연쇄",
    nodes: [
      { label: "에너지 가격 급등", description: "유가·전력비 상승", triggerCondition: "half_end", probability: 1.0,
        economyEffects: [{ key: "rawMaterialIndex", mode: "PERCENT", value: 15 }] },
      { label: "물류비 상승", description: "운송·창고 비용 증가", triggerCondition: "after_energy", probability: 0.6,
        economyEffects: [{ key: "logisticsCostMultiplier", mode: "PERCENT", value: 12 }] },
      { label: "ESG 규제 강화", description: "탄소 배출 규제", triggerCondition: "after_logistics", probability: 0.35,
        economyEffects: [{ key: "esgPressureIndex", mode: "PERCENT", value: 10 }] },
    ],
  },
  {
    id: "supply-crisis-chain",
    label: "Supply Crisis → 항만 파업 → 물류비 → 정부 지원",
    description: "공급 위기 확률 분기",
    nodes: [
      { label: "공급 위기", description: "글로벌 공급망 불안", triggerCondition: "half_end", probability: 1.0,
        economyEffects: [{ key: "logisticsCostMultiplier", mode: "PERCENT", value: 10 }] },
      { label: "항만 파업", description: "항만 노동 쟁의", triggerCondition: "after_supply_crisis", probability: 0.3,
        economyEffects: [{ key: "logisticsCostMultiplier", mode: "PERCENT", value: 20 }] },
      { label: "물류비 상승", description: "대체 경로 비용", triggerCondition: "after_port", probability: 0.4,
        economyEffects: [{ key: "logisticsCostMultiplier", mode: "PERCENT", value: 15 }] },
      { label: "정부 지원", description: "물류·제조 지원책", triggerCondition: "after_logistics_rise", probability: 0.2,
        economyEffects: [{ key: "marketDemandIndex", mode: "PERCENT", value: 5 }] },
      { label: "빠른 복구", description: "공급망 정상화", triggerCondition: "after_support", probability: 0.1,
        economyEffects: [{ key: "logisticsCostMultiplier", mode: "PERCENT", value: -8 }] },
    ],
  },
  {
    id: "recession-recovery",
    label: "경기 침체 → 회복 신호 → 소비 회복",
    description: "침체-회복 사이클",
    nodes: [
      { label: "경기 침체 심화", description: "수요 위축 지속", triggerCondition: "half_end", probability: 0.5,
        economyEffects: [{ key: "marketDemandIndex", mode: "PERCENT", value: -12 }] },
      { label: "회복 신호", description: "소비 지표 개선", triggerCondition: "after_recession", probability: 0.4,
        economyEffects: [{ key: "marketDemandIndex", mode: "PERCENT", value: 8 }] },
    ],
  },
  {
    id: "climate-transition-chain",
    label: "탄소 규제 → ESG 비용 → 혁신 투자",
    description: "기후 전환 연쇄",
    nodes: [
      { label: "탄소 규제 강화", description: "배출권·탄소세", triggerCondition: "half_end", probability: 1.0,
        economyEffects: [{ key: "carbonTaxRatePerUnit", mode: "PERCENT", value: 15 }] },
      { label: "ESG 비용 증가", description: "친환경 전환 투자", triggerCondition: "after_carbon", probability: 0.55,
        economyEffects: [{ key: "esgPressureIndex", mode: "PERCENT", value: 12 }] },
      { label: "녹색 혁신 기회", description: "친환경 기술 수요", triggerCondition: "after_esg", probability: 0.35,
        economyEffects: [{ key: "techInnovationIndex", mode: "PERCENT", value: 10 }] },
    ],
  },
  {
    id: "stable-recovery",
    label: "안정 성장 → 소폭 조정 → 회복",
    description: "완만한 변동",
    nodes: [
      { label: "금리 소폭 인상", description: "중앙은행 긴축", triggerCondition: "half_end", probability: 0.4,
        economyEffects: [{ key: "interestRateLoan", mode: "PERCENT", value: 3 }] },
      { label: "시장 회복", description: "소비·투자 회복", triggerCondition: "after_rate", probability: 0.6,
        economyEffects: [{ key: "marketDemandIndex", mode: "PERCENT", value: 5 }] },
    ],
  },
];

export function getChainTemplate(id: string): ChainTemplate | undefined {
  return CHAIN_TEMPLATES.find((t) => t.id === id);
}

export function instantiateChainFromTemplate(
  sessionId: string,
  templateId: string,
  randomSeed: string
): WorldEventChain | null {
  const template = getChainTemplate(templateId);
  if (!template) return null;

  const chainId = `chain-${sessionId}-${templateId}-${Date.now()}`;
  const nodes: EventChainNodeV3[] = [];
  let prevNodeId: string | undefined;

  for (let i = 0; i < template.nodes.length; i++) {
    const t = template.nodes[i];
    const nodeId = `node-${chainId}-${i}`;
    nodes.push({
      nodeId,
      label: t.label,
      description: t.description,
      triggerCondition: t.triggerCondition,
      probability: t.probability,
      parentNodeId: prevNodeId,
      childNodeIds: [],
      status: i === 0 ? "PLANNED" : "PLANNED",
      economyEffects: t.economyEffects,
    });
    if (prevNodeId) {
      const parent = nodes.find((n) => n.nodeId === prevNodeId)!;
      parent.childNodeIds.push(nodeId);
    }
    prevNodeId = nodeId;
  }

  return {
    chainId,
    sessionId,
    templateId,
    label: template.label,
    rootNodeId: nodes[0].nodeId,
    nodes,
    probabilities: nodes.filter((n) => n.parentNodeId).map((n) => ({
      nodeId: n.nodeId,
      label: n.label,
      probability: n.probability,
      parentNodeId: n.parentNodeId,
    })),
    createdAt: new Date().toISOString(),
    randomSeed,
  };
}
