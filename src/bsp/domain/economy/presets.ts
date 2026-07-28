import type { EconomyPreset, EconomyValues } from "../../domain/types";
import { DEFAULT_ECONOMY_VALUES } from "../../domain/types";

function patch(base: EconomyValues, effects: Partial<EconomyValues>): EconomyValues {
  return { ...base, ...effects };
}

export const ECONOMY_PRESETS: EconomyPreset[] = [
  {
    id: "PRESET_HIGH_INTEREST",
    label: "고금리 시대",
    description: "중앙은행 긴축으로 차입금리가 급등한 환경입니다. 레버리지 전략의 리스크를 체험합니다.",
    learningObjective: "고금리 환경에서 차입·예금·현금흐름 트레이드오프를 이해한다.",
    recommendedYear: 2,
    effects: { interestRateLoan: 18, interestRateDeposit: 8, businessCycleIndex: 95 },
    linkableEventIds: ["EVT-011", "EVT-012"],
  },
  {
    id: "PRESET_LOW_INTEREST",
    label: "저금리 시대",
    description: "유동성 풍부로 금리가 낮은 환경입니다. 투자 확대 vs 과잉 레버리지를 비교합니다.",
    learningObjective: "저금리에서 설비투자·차입 의사결정의 기회비용을 분석한다.",
    recommendedYear: 1,
    effects: { interestRateLoan: 4, interestRateDeposit: 2, marketDemandIndex: 105 },
    linkableEventIds: ["EVT-013"],
  },
  {
    id: "PRESET_RAW_MATERIAL_SPIKE",
    label: "원자재 가격 폭등",
    description: "글로벌 공급 충격으로 원자재 지수가 급등합니다.",
    learningObjective: "원가 상승이 마진·재고·조달 전략에 미치는 영향을 학습한다.",
    recommendedYear: 2,
    effects: { rawMaterialIndex: 150, exchangeRate: 1450, tariffRate: 5 },
    linkableEventIds: ["EVT-021", "EVT-022"],
  },
  {
    id: "PRESET_SUPPLY_CHAIN_COLLAPSE",
    label: "공급망 붕괴",
    description: "물류·공급 차질로 조달 한도와 비용이 동시에 악화됩니다.",
    learningObjective: "공급 제약 하에서 생산·판매 계획 조정 능력을 기른다.",
    recommendedYear: 2,
    effects: { marketSupplyIndex: 70, logisticsCostMultiplier: 2.0, rawMaterialIndex: 120 },
    linkableEventIds: ["EVT-031", "EVT-032"],
  },
  {
    id: "PRESET_AI_INNOVATION",
    label: "AI 혁신",
    description: "기술 혁신으로 생산성과 시장 기대가 동시에 상승합니다.",
    learningObjective: "기술 변화가 CapEx·인력·생산성 가정에 미치는 영향을 탐구한다.",
    recommendedYear: 3,
    effects: { techInnovationIndex: 125, marketDemandIndex: 110, payrollCostMultiplier: 1.1 },
    linkableEventIds: ["EVT-041", "EVT-042"],
  },
  {
    id: "PRESET_CARBON_TAX",
    label: "탄소세 강화",
    description: "탄소 규제 강화로 생산 단위당 추가 비용이 발생합니다.",
    learningObjective: "ESG·탄소 비용이 손익·전략 선택에 주는 제약을 이해한다.",
    recommendedYear: 2,
    effects: { carbonTaxRatePerUnit: 15, esgPressureIndex: 115, corporateTaxRate: 24 },
    linkableEventIds: ["EVT-051"],
  },
  {
    id: "PRESET_GLOBAL_RECESSION",
    label: "글로벌 경기침체",
    description: "세계 경기 둔화로 수요·경기지수가 하락합니다.",
    learningObjective: "침체기 보수적 재무·운영 전략의 필요성을 체험한다.",
    recommendedYear: 2,
    effects: { businessCycleIndex: 75, marketDemandIndex: 85, marketSupplyIndex: 95, interestRateLoan: 12 },
    linkableEventIds: ["EVT-061", "EVT-062"],
  },
  {
    id: "PRESET_SUPER_BOOM",
    label: "초호황",
    description: "수요·경기·혁신 지수가 동반 상승하는 이상적 호황기입니다.",
    learningObjective: "호황기 과잉 투자·재고 리스크와 기회 포착의 균형을 학습한다.",
    recommendedYear: 3,
    effects: { marketDemandIndex: 130, businessCycleIndex: 125, marketSupplyIndex: 110, techInnovationIndex: 115 },
    linkableEventIds: ["EVT-071"],
  },
];

export function getPresetById(presetId: string): EconomyPreset | undefined {
  return ECONOMY_PRESETS.find((p) => p.id === presetId);
}

export function applyPresetValues(
  presetId: string,
  current: EconomyValues = DEFAULT_ECONOMY_VALUES
): EconomyValues {
  const preset = getPresetById(presetId);
  if (!preset) throw new Error(`Unknown preset: ${presetId}`);
  return patch(current, preset.effects);
}

export function listPresets() {
  return ECONOMY_PRESETS.map(({ id, label, description, learningObjective, recommendedYear, effects, linkableEventIds }) => ({
    id,
    label,
    description,
    learningObjective,
    recommendedYear,
    effects,
    linkableEventIds,
  }));
}
