/** V3.0 — Predefined world profiles */

import type { WorldDimensionValues, WorldProfile, WorldProfileId } from "./types";

export const WORLD_DIMENSION_LABELS: Record<keyof WorldDimensionValues, string> = {
  globalGrowth: "Global Growth",
  inflation: "Inflation",
  interestRateTrend: "Interest Rate Trend",
  supplyStability: "Supply Stability",
  energyPrice: "Energy Price",
  technologyInnovation: "Technology Innovation",
  consumerConfidence: "Consumer Confidence",
  geopoliticalTension: "Geopolitical Tension",
  climateRisk: "Climate Risk",
  tradeEnvironment: "Trade Environment",
};

const BASE: WorldDimensionValues = {
  globalGrowth: 50,
  inflation: 50,
  interestRateTrend: 50,
  supplyStability: 50,
  energyPrice: 50,
  technologyInnovation: 50,
  consumerConfidence: 50,
  geopoliticalTension: 50,
  climateRisk: 50,
  tradeEnvironment: 50,
};

export const WORLD_PROFILES: Record<WorldProfileId, WorldProfile> = {
  STABLE_GROWTH: {
    id: "STABLE_GROWTH",
    label: "Stable Growth",
    description: "완만한 성장과 안정적 금융 환경. 초보 교육에 적합합니다.",
    initialDimensions: {
      ...BASE,
      globalGrowth: 65,
      inflation: 40,
      consumerConfidence: 70,
      supplyStability: 75,
      geopoliticalTension: 35,
    },
    educationalFocus: ["재무", "운영"],
    chainTemplateIds: ["stable-recovery"],
  },
  HIGH_INFLATION: {
    id: "HIGH_INFLATION",
    label: "High Inflation",
    description: "물가 상승과 금리 압박. 원가·가격 전략 교육에 적합합니다.",
    initialDimensions: {
      ...BASE,
      inflation: 80,
      interestRateTrend: 75,
      consumerConfidence: 40,
      energyPrice: 70,
    },
    educationalFocus: ["재무", "가격"],
    chainTemplateIds: ["tariff-supply-cost"],
  },
  AI_BOOM: {
    id: "AI_BOOM",
    label: "AI Boom",
    description: "기술 혁신과 GPU/반도체 수요 급증. 혁신·공급망 교육에 적합합니다.",
    initialDimensions: {
      ...BASE,
      technologyInnovation: 85,
      globalGrowth: 70,
      supplyStability: 45,
      energyPrice: 65,
    },
    educationalFocus: ["혁신", "공급망"],
    chainTemplateIds: ["ai-boom-chain"],
  },
  RECESSION: {
    id: "RECESSION",
    label: "Recession",
    description: "경기 침체와 수요 위축. 생존·현금흐름 교육에 적합합니다.",
    initialDimensions: {
      ...BASE,
      globalGrowth: 25,
      consumerConfidence: 30,
      interestRateTrend: 60,
      tradeEnvironment: 40,
    },
    educationalFocus: ["재무", "현금흐름"],
    chainTemplateIds: ["recession-recovery"],
  },
  TRADE_WAR: {
    id: "TRADE_WAR",
    label: "Trade War",
    description: "관세·지정학적 긴장. 글로벌 공급망·리스크 교육에 적합합니다.",
    initialDimensions: {
      ...BASE,
      geopoliticalTension: 85,
      tradeEnvironment: 25,
      supplyStability: 40,
      inflation: 65,
    },
    educationalFocus: ["공급망", "리스크"],
    chainTemplateIds: ["tariff-supply-cost"],
  },
  ENERGY_CRISIS: {
    id: "ENERGY_CRISIS",
    label: "Energy Crisis",
    description: "에너지 가격 급등. 원가·ESG·운영 효율 교육에 적합합니다.",
    initialDimensions: {
      ...BASE,
      energyPrice: 90,
      inflation: 75,
      supplyStability: 50,
      climateRisk: 60,
    },
    educationalFocus: ["원가", "ESG"],
    chainTemplateIds: ["energy-crisis-chain"],
  },
  CLIMATE_TRANSITION: {
    id: "CLIMATE_TRANSITION",
    label: "Climate Transition",
    description: "탄소 규제·친환경 전환. ESG·장기 투자 교육에 적합합니다.",
    initialDimensions: {
      ...BASE,
      climateRisk: 80,
      energyPrice: 60,
      technologyInnovation: 65,
      tradeEnvironment: 55,
    },
    educationalFocus: ["ESG", "혁신"],
    chainTemplateIds: ["climate-transition-chain"],
  },
  CUSTOM: {
    id: "CUSTOM",
    label: "Custom",
    description: "GM이 직접 초기 World State를 설정합니다.",
    initialDimensions: { ...BASE },
    educationalFocus: [],
    chainTemplateIds: [],
  },
};

export function getWorldProfile(id: WorldProfileId): WorldProfile {
  return WORLD_PROFILES[id] ?? WORLD_PROFILES.STABLE_GROWTH;
}

export function mergeCustomDimensions(
  profile: WorldProfile,
  custom?: Partial<WorldDimensionValues>
): WorldDimensionValues {
  if (!custom) return { ...profile.initialDimensions };
  return { ...profile.initialDimensions, ...custom };
}

export function clampDimension(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function applyDimensionDelta(
  current: WorldDimensionValues,
  delta: Partial<WorldDimensionValues>
): WorldDimensionValues {
  const next = { ...current };
  for (const [key, val] of Object.entries(delta)) {
    const k = key as keyof WorldDimensionValues;
    if (typeof val === "number") {
      next[k] = clampDimension(next[k] + val);
    }
  }
  return next;
}
