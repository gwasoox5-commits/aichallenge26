import { describe, expect, it } from "vitest";
import { createInitialOperationalState, validateMaterial, validateSales } from "@/src/bsp/domain/validation/step-validators";
import { DEFAULT_ECONOMY_VALUES } from "@/src/bsp/domain/types";
import { materialBidPayload } from "./bid-payloads";

describe("Region branch rules", () => {
  it("requires a purchase branch before material purchase in a new region", () => {
    const state = { ...createInitialOperationalState(), selectedRegions: ["ASIA"] };
    const payload = materialBidPayload("ASIA", 10, 12, { openBranch: false });
    const { validation } = validateMaterial(payload, state, DEFAULT_ECONOMY_VALUES, 1);
    expect(validation.ok).toBe(false);
    expect(validation.rules.some((r) => r.errorCode === "ERR_MAT_NO_BRANCH")).toBe(true);
  });

  it("does not allow material purchase with sales-only branch", () => {
    const state = {
      ...createInitialOperationalState(),
      openSalesBranches: ["ASIA"],
      selectedRegions: ["ASIA"],
    };
    const payload = materialBidPayload("ASIA", 10, 12, { openBranch: false });
    const { validation } = validateMaterial(payload, state, DEFAULT_ECONOMY_VALUES, 1);
    expect(validation.ok).toBe(false);
    expect(validation.rules.some((r) => r.errorCode === "ERR_MAT_NO_BRANCH")).toBe(true);
  });

  it("charges purchase branch setup fee only once per region", () => {
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

  it("enforces year 1 purchase branch cap independently of sales branches", () => {
    const state = {
      ...createInitialOperationalState(),
      openBranches: ["ASIA", "EUROPE"],
      openSalesBranches: ["MIDDLE_EAST"],
      selectedRegions: ["ASIA", "EUROPE", "MIDDLE_EAST"],
    };
    const payload = {
      branches: [{ regionCode: "MIDDLE_EAST" }, { regionCode: "AFRICA" }],
      lines: [
        { regionCode: "MIDDLE_EAST", qty: 4, unitPriceBidManwon: 12 },
        { regionCode: "AFRICA", qty: 4, unitPriceBidManwon: 18 },
      ],
    };
    const { validation } = validateMaterial(payload, state, DEFAULT_ECONOMY_VALUES, 1);
    expect(validation.ok).toBe(false);
    expect(validation.rules.some((r) => r.errorCode === "ERR_BRANCH_YEAR_CAP")).toBe(true);
  });

  it("allows sales in a region opened via purchase branch without sales branch fee", () => {
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
    const { validation, computed } = validateSales(payload, state, DEFAULT_ECONOMY_VALUES, 1);
    expect(validation.rules.some((r) => r.errorCode === "ERR_SALE_NO_BRANCH")).toBe(false);
    expect(computed.branchFeesManwon).toBe(0);
  });

  it("allows opening sales branches after purchase branches fill purchase cap", () => {
    const state = {
      ...createInitialOperationalState(),
      openBranches: ["ASIA", "EUROPE", "MIDDLE_EAST"],
      openSalesBranches: [],
      selectedRegions: ["ASIA", "EUROPE", "MIDDLE_EAST"],
      finishedGoodsQty: 20,
      salesCapacity: 20,
      unitFinishedGoodsCostManwon: 40,
    };
    const payload = {
      lines: [
        { regionCode: "ASIA", unitPriceManwon: 100, qty: 3 },
        { regionCode: "EUROPE", unitPriceManwon: 100, qty: 3 },
        { regionCode: "MIDDLE_EAST", unitPriceManwon: 100, qty: 3 },
      ],
    };
    const { validation } = validateSales(payload, state, DEFAULT_ECONOMY_VALUES, 1);
    expect(validation.ok).toBe(true);
    expect(validation.rules.some((r) => r.errorCode === "ERR_BRANCH_YEAR_CAP")).toBe(false);
  });

  it("allows sales branches in regions without purchase branches", () => {
    const state = {
      ...createInitialOperationalState(),
      openBranches: ["ASIA"],
      openSalesBranches: [],
      selectedRegions: ["ASIA", "EUROPE", "MIDDLE_EAST"],
      finishedGoodsQty: 20,
      salesCapacity: 20,
      unitFinishedGoodsCostManwon: 40,
    };
    const payload = {
      branchesNew: [{ regionCode: "EUROPE" }, { regionCode: "MIDDLE_EAST" }],
      lines: [
        { regionCode: "ASIA", unitPriceManwon: 100, qty: 3 },
        { regionCode: "EUROPE", unitPriceManwon: 100, qty: 3 },
        { regionCode: "MIDDLE_EAST", unitPriceManwon: 100, qty: 3 },
      ],
    };
    const { validation, computed } = validateSales(payload, state, DEFAULT_ECONOMY_VALUES, 1);
    expect(validation.ok).toBe(true);
    expect(computed.branchFeesManwon).toBeGreaterThan(0);
    expect(computed.newSalesBranches).toEqual(["EUROPE", "MIDDLE_EAST"]);
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

  it("allows sales in a new region via sales branch without purchase branch", () => {
    const state = {
      ...createInitialOperationalState(),
      openBranches: ["ASIA", "NORTH_AMERICA", "SOUTH_AMERICA"],
      openSalesBranches: [],
      selectedRegions: ["ASIA", "NORTH_AMERICA", "SOUTH_AMERICA"],
      finishedGoodsQty: 20,
      salesCapacity: 20,
      unitFinishedGoodsCostManwon: 40,
    };
    const payload = {
      branchesNew: [{ regionCode: "MIDDLE_EAST" }],
      lines: [
        { regionCode: "ASIA", unitPriceManwon: 100, qty: 3 },
        { regionCode: "MIDDLE_EAST", unitPriceManwon: 80, qty: 5 },
      ],
    };
    const { validation, computed } = validateSales(payload, state, DEFAULT_ECONOMY_VALUES, 1);
    expect(validation.ok).toBe(true);
    expect(validation.rules.some((r) => r.errorCode === "ERR_SALE_REGION_NOT_SELECTED")).toBe(false);
    expect(computed.newSalesBranches).toEqual(["MIDDLE_EAST"]);
  });

  it("blocks sales in more than 3 regions in year 1", () => {
    const state = {
      ...createInitialOperationalState(),
      openBranches: ["ASIA", "NORTH_AMERICA", "SOUTH_AMERICA"],
      openSalesBranches: ["MIDDLE_EAST"],
      selectedRegions: ["ASIA", "NORTH_AMERICA", "SOUTH_AMERICA"],
      finishedGoodsQty: 40,
      salesCapacity: 40,
      unitFinishedGoodsCostManwon: 40,
    };
    const payload = {
      lines: [
        { regionCode: "ASIA", unitPriceManwon: 100, qty: 2 },
        { regionCode: "NORTH_AMERICA", unitPriceManwon: 100, qty: 2 },
        { regionCode: "SOUTH_AMERICA", unitPriceManwon: 100, qty: 2 },
        { regionCode: "MIDDLE_EAST", unitPriceManwon: 80, qty: 2 },
      ],
    };
    const { validation } = validateSales(payload, state, DEFAULT_ECONOMY_VALUES, 1);
    expect(validation.ok).toBe(false);
    expect(validation.rules.some((r) => r.errorCode === "ERR_SALE_REGION_CAP")).toBe(true);
  });
});
