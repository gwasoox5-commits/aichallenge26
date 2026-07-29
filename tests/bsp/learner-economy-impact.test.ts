import { describe, expect, it } from "vitest";
import {
  buildLearnerPeriodImpact,
  buildLearnerGameplayMetrics,
  buildLearnerGameplayMetricsAllRegions,
  buildLearnerIndexChanges,
} from "@/src/bsp/domain/economy/learner-economy-impact";
import { applyEffects } from "@/src/bsp/domain/economy/economy-engine";
import { DEFAULT_ECONOMY_VALUES } from "@/src/bsp/domain/types";

describe("learner-economy-impact", () => {
  it("computes tariff + demand event impact on ASIA material price and sale limit", () => {
    const before = { ...DEFAULT_ECONOMY_VALUES };
    const after = applyEffects(before, [
      { key: "marketDemandIndex", mode: "PERCENT", value: -6 },
      { key: "tariffRate", mode: "DELTA", value: 5 },
      { key: "businessCycleIndex", mode: "PERCENT", value: -3 },
    ]);

    const indexChanges = buildLearnerIndexChanges(before, after);
    expect(indexChanges.find((c) => c.key === "marketDemandIndex")).toMatchObject({
      before: 100,
      after: 94,
    });
    expect(indexChanges.find((c) => c.key === "tariffRate")).toMatchObject({
      before: 0,
      after: 5,
    });

    const gameplay = buildLearnerGameplayMetrics(before, after);
    expect(gameplay.materialUnitPriceManwon).toEqual({ before: 12, after: 13 });
    expect(gameplay.saleLimit).toEqual({ before: 100, after: 94 });
  });

  it("buildLearnerPeriodImpact wraps period-open vs live comparison", () => {
    const periodOpen = { ...DEFAULT_ECONOMY_VALUES };
    const live = applyEffects(periodOpen, [
      { key: "rawMaterialIndex", mode: "PERCENT", value: 25 },
    ]);
    const impact = buildLearnerPeriodImpact(periodOpen, live);
    expect(impact.indexChanges[0]?.key).toBe("rawMaterialIndex");
    expect(impact.regions.find((r) => r.regionCode === "ASIA")?.materialUnitPriceManwon.after).toBeGreaterThan(
      impact.regions.find((r) => r.regionCode === "ASIA")?.materialUnitPriceManwon.before ?? 0
    );
  });

  it("buildLearnerGameplayMetricsAllRegions returns all seven regions", () => {
    const before = { ...DEFAULT_ECONOMY_VALUES };
    const after = applyEffects(before, [{ key: "tariffRate", mode: "DELTA", value: 5 }]);
    const regions = buildLearnerGameplayMetricsAllRegions(before, after);
    expect(regions).toHaveLength(7);
    expect(regions.every((r) => r.materialUnitPriceManwon.after >= r.materialUnitPriceManwon.before)).toBe(true);
  });
});
