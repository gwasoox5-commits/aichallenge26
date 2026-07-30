import { describe, expect, it } from "vitest";
import { createInitialOperationalState, validateMaterial, validateSales } from "@/src/bsp/domain/validation/step-validators";
import { DEFAULT_ECONOMY_VALUES } from "@/src/bsp/domain/types";
import { materialBidPayload } from "./bid-payloads";

describe("Region branch rules", () => {
  it("requires a branch before material purchase in a new region", () => {
    const state = { ...createInitialOperationalState(), selectedRegions: ["ASIA"] };
    const payload = materialBidPayload("ASIA", 10, 12, { openBranch: false });
    const { validation } = validateMaterial(payload, state, DEFAULT_ECONOMY_VALUES, 1);
    expect(validation.ok).toBe(false);
    expect(validation.rules.some((r) => r.errorCode === "ERR_MAT_NO_BRANCH")).toBe(true);
  });

  it("charges branch setup fee only once per region", () => {
    const state = {
      ...createInitialOperationalState(),
      openBranches: ["ASIA"],
      selectedRegions: ["ASIA"],
    };
    const payload = {
      branches: [{ regionCode: "ASIA" }],
      lines: [{ regionCode: "ASIA", qty: 20, unitPriceBidManwon: 12 }],
    };
    const { computed } = validateMaterial(payload, state, DEFAULT_ECONOMY_VALUES, 1);
    expect(computed.branchFeesManwon).toBe(0);
  });

  it("enforces year 1 regional expansion cap of 3", () => {
    const state = {
      ...createInitialOperationalState(),
      openBranches: ["ASIA", "EUROPE"],
      openSalesBranches: ["MIDDLE_EAST"],
      selectedRegions: ["ASIA", "EUROPE", "MIDDLE_EAST", "AFRICA", "OCEANIA"],
    };
    const payload = {
      branches: [{ regionCode: "AFRICA" }, { regionCode: "OCEANIA" }],
      lines: [
        { regionCode: "AFRICA", qty: 4, unitPriceBidManwon: 12 },
        { regionCode: "OCEANIA", qty: 4, unitPriceBidManwon: 18 },
      ],
    };
    const { validation } = validateMaterial(payload, state, DEFAULT_ECONOMY_VALUES, 1);
    expect(validation.ok).toBe(false);
    expect(validation.rules.some((r) => r.errorCode === "ERR_BRANCH_YEAR_CAP")).toBe(true);
  });

  it("allows sales in a region opened via material branch", () => {
    const state = {
      ...createInitialOperationalState(),
      openBranches: ["ASIA"],
      openSalesBranches: [],
      selectedRegions: ["ASIA"],
      finishedGoodsQty: 10,
      salesCapacity: 10,
      unitFinishedGoodsCostManwon: 40,
    };
    const payload = {
      lines: [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 3 }],
    };
    const { validation } = validateSales(payload, state, DEFAULT_ECONOMY_VALUES, 1);
    expect(validation.rules.some((r) => r.errorCode === "ERR_SALE_NO_BRANCH")).toBe(false);
  });

  it("requires branch for sales in a new region", () => {
    const state = {
      ...createInitialOperationalState(),
      selectedRegions: ["ASIA"],
      finishedGoodsQty: 10,
      salesCapacity: 10,
      unitFinishedGoodsCostManwon: 40,
    };
    const payload = {
      lines: [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 3 }],
    };
    const { validation } = validateSales(payload, state, DEFAULT_ECONOMY_VALUES, 1);
    expect(validation.ok).toBe(false);
    expect(validation.rules.some((r) => r.errorCode === "ERR_SALE_NO_BRANCH")).toBe(true);
  });
});
