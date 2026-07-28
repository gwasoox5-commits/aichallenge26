import type { EconomyValues } from "../types";

export const ECONOMY_VARIABLE_LABELS: Record<keyof EconomyValues, string> = {
  exchangeRate: "환율",
  interestRateLoan: "차입금리",
  interestRateDeposit: "예금금리",
  rawMaterialIndex: "원자재",
  marketDemandIndex: "시장 수요",
  marketSupplyIndex: "시장 공급",
  logisticsCostMultiplier: "물류비",
  tariffRate: "관세",
  corporateTaxRate: "법인세",
  carbonTaxRatePerUnit: "탄소세",
  payrollCostMultiplier: "인건비",
  techInnovationIndex: "기술혁신",
  esgPressureIndex: "ESG",
  businessCycleIndex: "경기지수",
};

export const ECONOMY_BOUNDS: Record<keyof EconomyValues, { min: number; max: number }> = {
  exchangeRate: { min: 800, max: 2000 },
  interestRateLoan: { min: 0, max: 30 },
  interestRateDeposit: { min: 0, max: 20 },
  rawMaterialIndex: { min: 50, max: 200 },
  marketDemandIndex: { min: 50, max: 150 },
  marketSupplyIndex: { min: 50, max: 150 },
  logisticsCostMultiplier: { min: 0.5, max: 3.0 },
  tariffRate: { min: 0, max: 100 },
  corporateTaxRate: { min: 0, max: 40 },
  carbonTaxRatePerUnit: { min: 0, max: 50 },
  payrollCostMultiplier: { min: 0.8, max: 1.5 },
  techInnovationIndex: { min: 80, max: 130 },
  esgPressureIndex: { min: 70, max: 110 },
  businessCycleIndex: { min: 70, max: 130 },
};

export function isEconomyKey(key: string): key is keyof EconomyValues {
  return key in ECONOMY_VARIABLE_LABELS;
}
