import type { RegionCode } from "@/src/bsp/domain/regions/region-catalog";

export function materialBidPayload(
  regionCode: RegionCode,
  perType: number,
  unitPriceBidManwon?: number
) {
  const line: {
    regionCode: RegionCode;
    materials: { A: number; B: number; C: number; D: number };
    unitPriceBidManwon?: number;
  } = {
    regionCode,
    materials: { A: perType, B: perType, C: perType, D: perType },
  };
  if (unitPriceBidManwon !== undefined) {
    line.unitPriceBidManwon = unitPriceBidManwon;
  }
  return { lines: [line] };
}

/** Explicit floor bid for ASIA default economy (12만). */
export function asiaMaterialBidPayload(perType: number, unitPriceBidManwon = 12) {
  return materialBidPayload("ASIA", perType, unitPriceBidManwon);
}
