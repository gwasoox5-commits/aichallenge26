import type { EconomyValues } from "../types";
import { ECONOMY_VARIABLE_LABELS } from "./economy-variable-meta";

export function describeEconomyDelta(
  key: keyof EconomyValues,
  delta: number,
  current: number
): string {
  if (Math.abs(delta) < 0.01) return `${ECONOMY_VARIABLE_LABELS[key]} 안정`;

  const rising = delta > 0;
  switch (key) {
    case "exchangeRate":
      return rising ? "환율 상승 — 수입 원가 부담 증가" : "환율 하락 — 수입 원가 완화";
    case "interestRateLoan":
      return rising ? "차입금리 상승 — 이자비용 부담" : "차입금리 하락 — 금융비용 절감";
    case "interestRateDeposit":
      return rising ? "예금금리 상승 — 금융수익 개선" : "예금금리 하락";
    case "rawMaterialIndex":
      return rising ? "원자재 가격 상승 — 조달비용 증가" : "원자재 가격 하락 — 원가 절감";
    case "marketDemandIndex":
      return rising ? "시장 수요 확대 — 판매 기회 증가" : "시장 수요 위축 — 판매 압력";
    case "marketSupplyIndex":
      return rising ? "시장 공급 증가 — 조달 여유" : "시장 공급 축소 — 조달 제약";
    case "logisticsCostMultiplier":
      return rising ? "물류비 상승 — 유통비용 증가" : "물류비 하락 — 유통비용 절감";
    case "tariffRate":
      return rising ? "관세 인상 — 수입품 부담 증가" : "관세 인하 — 수입 원가 완화";
    case "corporateTaxRate":
      return rising ? "법인세율 상승 — 세후이익 감소" : "법인세율 인하 — 세후이익 개선";
    case "carbonTaxRatePerUnit":
      return rising ? "탄소세 강화 — 생산비용 증가" : "탄소세 완화";
    case "payrollCostMultiplier":
      return rising ? "인건비 상승 — 고정비 부담" : "인건비 안정/하락";
    case "techInnovationIndex":
      return rising ? "기술혁신 가속 — 생산성 개선" : "기술혁신 둔화";
    case "esgPressureIndex":
      return rising ? "ESG 규제 강화 — 판매·비용 영향" : "ESG 부담 완화";
    case "businessCycleIndex":
      return rising ? "경기 회복 — 전반적 호조" : "경기 둔화 — 보수적 운영 필요";
    default:
      return `${ECONOMY_VARIABLE_LABELS[key]} ${rising ? "상승" : "하락"} (${current})`;
  }
}

export function describeRecentChanges(
  live: EconomyValues,
  baseline: EconomyValues
): string[] {
  return (Object.keys(live) as (keyof EconomyValues)[])
    .map((key) => ({
      key,
      delta: live[key] - baseline[key],
    }))
    .filter((d) => Math.abs(d.delta) > 0.01)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5)
    .map((d) => describeEconomyDelta(d.key, d.delta, live[d.key]));
}

export function describeScheduledChange(
  label: string,
  applyTiming: string
): string {
  const when =
    applyTiming === "NEXT_HALF"
      ? "다음 반기부터"
      : applyTiming === "NEXT_STEP"
        ? "다음 Step부터"
        : "즉시";
  return `${label} 변경 예정 (${when})`;
}
