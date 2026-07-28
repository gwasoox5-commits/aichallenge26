import type { EconomyValues } from "../types";
import type { EconomyPatchEffect } from "../events/event-types";
import { effectiveMaterialUnitPriceManwon, logisticsCostManwon } from "./material-pricing";
import { effectiveSaleLimit, salesLogisticsCostManwon } from "./sales-pricing";
import { getRegion } from "../regions/region-catalog";
import { computeChanges } from "./economy-engine";
import { ECONOMY_DASHBOARD_CARDS } from "./economy-dashboard-meta";

const SAMPLE_QTY = 100;
const SAMPLE_SALES_QTY = 50;
const SAMPLE_UNIT_PRICE = 100;

export interface EconomyPreviewImpact {
  valuesBefore: Partial<EconomyValues>;
  valuesAfter: Partial<EconomyValues>;
  changes: ReturnType<typeof computeChanges>;
  productionCostDeltaManwon: number;
  salesPriceImpactPct: number;
  expectedPnlDeltaManwon: number;
  affectedSteps: string[];
  affectedEvents: string[];
  message: string;
}

export function computePreviewImpact(
  valuesBefore: EconomyValues,
  valuesAfter: EconomyValues,
  effects: EconomyPatchEffect[],
  activeEventTitles: string[] = []
): EconomyPreviewImpact {
  const region = getRegion("ASIA")!;
  const matBefore = effectiveMaterialUnitPriceManwon(region, valuesBefore);
  const matAfter = effectiveMaterialUnitPriceManwon(region, valuesAfter);
  const logBefore = logisticsCostManwon(SAMPLE_QTY, valuesBefore);
  const logAfter = logisticsCostManwon(SAMPLE_QTY, valuesAfter);
  const productionCostDeltaManwon = (matAfter - matBefore) * SAMPLE_QTY + (logAfter - logBefore);

  const saleLimitBefore = effectiveSaleLimit(region, valuesBefore);
  const saleLimitAfter = effectiveSaleLimit(region, valuesAfter);
  const salesPriceImpactPct =
    saleLimitBefore > 0
      ? Math.round(((saleLimitAfter - saleLimitBefore) / saleLimitBefore) * 1000) / 10
      : 0;

  const salesLogBefore = salesLogisticsCostManwon(SAMPLE_SALES_QTY, valuesBefore);
  const salesLogAfter = salesLogisticsCostManwon(SAMPLE_SALES_QTY, valuesAfter);
  const revenueDelta = (saleLimitAfter - saleLimitBefore) * SAMPLE_UNIT_PRICE * 0.1;
  const expectedPnlDeltaManwon = Math.round(
    revenueDelta - productionCostDeltaManwon - (salesLogAfter - salesLogBefore)
  );

  const affectedSteps = new Set<string>();
  for (const effect of effects) {
    const card = ECONOMY_DASHBOARD_CARDS.find((c) => c.engineKey === effect.key);
    if (card) card.relatedSteps.forEach((s) => affectedSteps.add(s));
  }

  const changes = computeChanges(valuesBefore, valuesAfter);
  const parts = changes.map((c) => `${c.label} ${c.before}→${c.after}`);
  const message =
    parts.length > 0
      ? `ASIA ${SAMPLE_QTY}단위 기준 · ${parts.join(" · ")} · 예상 P&L ${expectedPnlDeltaManwon >= 0 ? "+" : ""}${expectedPnlDeltaManwon}만`
      : "변경 없음";

  return {
    valuesBefore: pickChanged(valuesBefore, changes),
    valuesAfter: pickChanged(valuesAfter, changes),
    changes,
    productionCostDeltaManwon,
    salesPriceImpactPct,
    expectedPnlDeltaManwon,
    affectedSteps: [...affectedSteps],
    affectedEvents: activeEventTitles,
    message,
  };
}

function pickChanged(
  values: EconomyValues,
  changes: ReturnType<typeof computeChanges>
): Partial<EconomyValues> {
  const out: Partial<EconomyValues> = {};
  for (const c of changes) out[c.key] = values[c.key];
  return out;
}
